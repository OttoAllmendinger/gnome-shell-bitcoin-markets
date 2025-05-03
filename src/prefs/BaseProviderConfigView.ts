import Gtk from '@girs/gtk-4.0';
import GObject from '@girs/gobject-2.0';
import GLib from '@girs/glib-2.0';

import * as BaseProvider from '../providers/BaseProvider';
import { getProvider } from '../providers';
import { registerGObjectClass } from '../gjs';

import { ComboBoxOptions } from './prefs';
import { ConfigModel } from './IndicatorCollectionModel'

export function makeConfigRow(description: string, widget: Gtk.Widget): Gtk.Widget {
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_bottom: 8,
    hexpand: true,
    vexpand: false,
  });

  const label = new Gtk.Label({
    label: description,
    xalign: 0,
    hexpand: true,
    vexpand: true,
  });

  box.append(label);
  box.append(widget);

  return box;
}

function debounce(milliseconds, func) {
  let tag: number | null = null;
  return () => {
    if (tag !== null) {
      GLib.source_remove(tag);
    }
    tag = GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
      func();
      tag = null;
      return GLib.SOURCE_REMOVE;
    });
  };
}

@registerGObjectClass
export class ComboBoxView extends GObject.Object {
  static metaInfo: GObject.MetaInfo<Record<string, never>, Record<string, never>, any> = {
    GTypeName: 'ComboBoxView',
    Signals: {
      changed: {
        param_types: [GObject.TYPE_STRING],
        accumulator: 0,
      },
    },
  };

  Columns = { LABEL: 0, VALUE: 1 };

  public widget: Gtk.ComboBox;
  public model: Gtk.ListStore;
  private _options?: ComboBoxOptions[];

  constructor(options) {
    super();
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    const comboBox = new Gtk.ComboBox({ model });
    const renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    this.widget = comboBox;
    this.model = model;
    this.setOptions(options);

    comboBox.connect('changed', (_entry) => {
      const i = comboBox.get_active();
      if (!this._options) {
        throw new Error();
      }
      if (i in this._options) {
        this.emit('changed', this._options[i].value);
      }
    });
  }

  setOptions(options: ComboBoxOptions[]) {
    this.model.clear();
    this._options = options || [];

    this._options.forEach((o) => {
      let iter;

      this.model.set((iter = this.model.append()), [this.Columns.LABEL], [o.label]);

      if (o.active) {
        this.widget.set_active_iter(iter);
      }
    });
  }
}

type GettextFunc = (s: string) => string;

export class BaseProviderConfigView {
  private gettext: GettextFunc;
  private _api: string;
  private _provider: BaseProvider.Api;
  private _configWidget: Gtk.Box;
  private _indicatorConfig: ConfigModel;
  private _widgets: Gtk.Widget[];

  constructor(gettext: GettextFunc, api: string, configWidget: Gtk.Box, indicatorConfig: ConfigModel) {
    this.gettext = gettext;
    this._api = api;
    this._provider = getProvider(api);
    this._configWidget = configWidget;
    this._indicatorConfig = indicatorConfig;
    this._widgets = [];
    this._setDefaults(indicatorConfig);
    this._setApiDefaults(indicatorConfig);
    this._initWidgets();
  }

  _initWidgets() {
    this._addBaseEntry();
    this._addQuoteEntry();
    this._addHelp();
  }

  _setDefaults(config) {
    config.set('show_change', config.get('show_change') !== false);
  }

  _setApiDefaults(config) {
    if (config.get('api') !== this._api) {
      config.set('api', this._api);
    }
  }

  _addConfigWidget(w) {
    this._configWidget.append(w);
    this._widgets.push(w);
  }

  _addRow(label, widget) {
    const rowWidget = makeConfigRow(label, widget);
    this._addConfigWidget(rowWidget);
    return rowWidget;
  }

  _addBaseEntry() {
    return this._addSymbolEntry(this.gettext('Base'), 'base', 'BTC');
  }

  _addQuoteEntry() {
    return this._addSymbolEntry(this.gettext('Quote'), 'quote', 'USD');
  }

  _addSymbolEntry(label, key, defaultValue) {
    const entry = new Gtk.Entry({
      text: this._indicatorConfig.get(key) || defaultValue,
    });
    entry.connect(
      'changed',
      debounce(500, () => {
        if (!entry.text) {
          throw new Error();
        }
        if (entry.text.length < 1) {
          return;
        }
        this._indicatorConfig.set(key, entry.text.toUpperCase());
      }),
    );

    const rowWidget = this._addRow(label, entry);

    return { rowWidget, entry };
  }

  _addHelp() {
    const { apiDocs } = this._provider;
    if (!apiDocs) {
      return console.log(new Error(`no apiDocs for ${this._api}`));
    }

    const helpText = apiDocs.map(([label, url]) => `<a href="${url}">${label}</a>`).join(', ');

    this._addRow(
      this.gettext('Help'),
      new Gtk.Label({
        label: helpText,
        use_markup: true,
      }),
    );
    /*
    apiDocs.forEach(([label, url]) => {
      this._addConfigWidget(
        new Gtk.Label({
          label: `<a href="${url}">${label}</a>`,
          use_markup: true,
          margin_bottom: 8
        })
      );
    });
    */
  }

  destroy() {
    this._widgets.forEach((widget) => this._configWidget.remove(widget));
    this._widgets.slice(0);
  }
}
