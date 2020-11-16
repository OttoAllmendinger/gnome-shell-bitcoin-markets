const Signals = imports.signals;
const Mainloop = imports.mainloop;

import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';

import { SignalEmitter } from '../gselib/SignalEmitter';
import { _ } from '../gselib/gettext';

import * as BaseProvider from '../BaseProvider';
import * as ApiService from '../ApiService';
import { Options } from './prefs';

export function makeConfigRow(description: string, widget: Gtk.Widget) {
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_bottom: 8,
    hexpand: true,
    vexpand: false,
  });

  const label = new Gtk.Label({
    label: description,
    xalign: 0,
    expand: true,
  });

  box.add(label);
  box.add(widget);

  return box;
}

function debounce(milliseconds, func) {
  let tag = null;
  return () => {
    if (tag !== null) {
      Mainloop.source_remove(tag);
    }
    tag = Mainloop.timeout_add(milliseconds, () => {
      func();
      tag = null;
    });
  };
}

export declare interface ComboBoxView extends SignalEmitter {}

export class ComboBoxView {
  Columns = { LABEL: 0, VALUE: 1 };

  public widget: Gtk.ComboBox;
  public model: Gtk.ListStore;
  private _options?: Options[];

  constructor(options) {
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

  setOptions(options: Options[]) {
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

Signals.addSignalMethods(ComboBoxView.prototype);

export class BaseProviderConfigView {
  private _api: string;
  private _provider: BaseProvider.Api;
  private _configWidget: any;
  private _indicatorConfig;
  private _widgets: Gtk.Widget[];

  constructor(api: string, configWidget: Gtk.Box, indicatorConfig: Options) {
    this._api = api;
    this._provider = ApiService.getProvider(api);
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
    this._configWidget.add(w);
    this._widgets.push(w);
  }

  _addRow(label, widget) {
    const rowWidget = makeConfigRow(label, widget);
    this._addConfigWidget(rowWidget);
    return rowWidget;
  }

  _addBaseEntry() {
    return this._addSymbolEntry(_('Base'), 'base', 'BTC');
  }

  _addQuoteEntry() {
    return this._addSymbolEntry(_('Quote'), 'quote', 'USD');
  }

  _addSymbolEntry(label, key, defaultValue) {
    const entry = new Gtk.Entry({
      text: this._indicatorConfig.get(key) || defaultValue,
    });
    entry.connect(
      'changed',
      debounce(500, () => {
        if (entry.text.length < 2) {
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
      return logError(new Error(`no apiDocs for ${this._api}`));
    }

    const helpText = apiDocs.map(([label, url]) => `<a href="${url}">${label}</a>`).join(', ');

    this._addRow(
      _('Help'),
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
    this._configWidget.show_all();
  }
}
