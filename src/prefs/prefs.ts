import Adw from '@girs/adw-1';
import Gtk from '@girs/gtk-4.0';
import { ExtensionBase } from '@gnome-shell/extensions/extension';
import { ExtensionPreferences } from '@gnome-shell/extensions/prefs';

import { registerGObjectClass } from '../gjs';
import * as Format from '../format/Format';
import { getProvider, Providers } from '../providers';

import * as BaseProviderConfigView from './BaseProviderConfigView';

const { ComboBoxView, makeConfigRow } = BaseProviderConfigView;
import { IndicatorCollectionModel } from './IndicatorCollectionModel';
import { GettextFunc } from './gettext';

export interface ComboBoxOptions {
  value: string;
  label: string;
  active: boolean;
}

function getMarginAll(v: number) {
  return {
    margin_start: v,
    margin_top: v,
    margin_end: v,
    margin_bottom: v,
  };
}

class IndicatorConfigView {
  private _indicatorConfig: any;
  private _layoutIndicatorSettings: Gtk.Box;
  private widget: Gtk.Box;
  private _layoutProviderSettings: Gtk.Box;
  private _apiConfigView?: BaseProviderConfigView.BaseProviderConfigView;

  constructor(private gettext: GettextFunc, indicatorConfig) {
    const margin = 8;

    this._indicatorConfig = indicatorConfig;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
    });

    {
      const frame = new Gtk.Frame({
        label: this.gettext('Indicator Settings'),
        ...getMarginAll(margin),
      });
      this._layoutIndicatorSettings = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        ...getMarginAll(margin),
      });
      frame.set_child(this._layoutIndicatorSettings);
      this.widget.append(frame);
    }
    {
      const frame = new Gtk.Frame({
        label: this.gettext('Provider Settings'),
        ...getMarginAll(margin),
      });
      this._layoutProviderSettings = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        ...getMarginAll(margin),
      });
      frame.set_child(this._layoutProviderSettings);
      this.widget.append(frame);
    }

    this._addIndicatorSettings();

    this._selectApi(indicatorConfig.get('api'));
  }

  _addIndicatorSettings() {
    const layout = this._layoutIndicatorSettings;
    layout.append(this._confFormat());
    layout.append(this._confShowChange());
    layout.append(this._confProvider());
  }

  _selectApi(api) {
    const widget = this._layoutProviderSettings;
    const config = this._indicatorConfig;

    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = undefined;
    }

    try {
      this._apiConfigView = new BaseProviderConfigView.BaseProviderConfigView(this.gettext, api, widget, config);
    } catch (e: any) {
      e.message = `Error creating configView for api ${api}: ${e.message}`;
      console.error(e);
    }
  }

  _confFormat(): Gtk.Widget {
    const format = this._indicatorConfig.get('format');

    const entry = new Gtk.Entry({
      text: format,
      tooltip_markup: Format.tooltipText(this.gettext),
    });

    entry.connect('changed', () => {
      this._indicatorConfig.set('format', entry.text);
    });

    return makeConfigRow(this.gettext('Format'), entry);
  }

  _confProvider(): Gtk.Widget {
    const preset = this._indicatorConfig.get('api');

    const options: ComboBoxOptions[] = Object.keys(Providers).map((name) => ({
      value: name,
      label: getProvider(name).apiName,
      active: false,
    }));

    options.forEach((o) => {
      if (o.value === preset) {
        o.active = true;
      }
    });

    const view = new ComboBoxView(options);

    view.connect('changed', (view, api) => this._selectApi(api));

    return makeConfigRow(this.gettext('Provider'), view.widget);
  }

  _confShowChange(): Gtk.Widget {
    const preset = this._indicatorConfig.get('show_change') !== false;

    const switchView = new Gtk.Switch({ active: preset });

    switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('show_change', obj.active);
    });

    return makeConfigRow(this.gettext('Show Change'), switchView);
  }

  _confShowBaseCurrency(): Gtk.Widget {
    const preset = this._indicatorConfig.get('show_base_currency') === true;

    const switchView = new Gtk.Switch({ active: preset });

    switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('show_base_currency', obj.active);
    });

    return makeConfigRow(this.gettext('Show Base Currency'), switchView);
  }
}

@registerGObjectClass
class BitcoinMarketsSettingsWidget extends Gtk.Box {
  private gettext: GettextFunc;
  private _store?: InstanceType<typeof IndicatorCollectionModel>;
  private _configLayout?: Gtk.Box;
  private _treeView?: Gtk.TreeView;
  private _selection?: Gtk.TreeSelection;
  private _toolbar?: Gtk.Box;
  private _delButton?: Gtk.Button;
  private _indicatorConfigView: any;

  constructor(ext: ExtensionBase) {
    super({
      orientation: Gtk.Orientation.HORIZONTAL,
    });

    this.gettext = ext.gettext.bind(ext);
    this._store = new IndicatorCollectionModel(ext.getSettings());

    /* sidebar (left) */

    const sidebar = new Gtk.Box({
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
      orientation: Gtk.Orientation.VERTICAL,
      width_request: 240,
    });

    sidebar.append((this._getTreeView() as unknown) as Gtk.Widget);
    sidebar.append((this._getToolbar() as unknown) as Gtk.Widget);

    this.append(sidebar);

    /* config (right) */

    this._configLayout = new Gtk.Box({
      // margin: 10,
      orientation: Gtk.Orientation.HORIZONTAL,
      hexpand: true,
      vexpand: true,
    });

    this.append(this._configLayout);

    /* behavior */

    this._selection = this._treeView!.get_selection();
    this._selection.connect('changed', this._onSelectionChanged.bind(this));
  }

  _getTreeView() {
    this._treeView = new Gtk.TreeView({
      model: this._store,
      headers_visible: false,
      reorderable: true,
      hexpand: false,
      vexpand: true,
    });

    const label = new Gtk.TreeViewColumn({ title: 'Label' });
    const renderer = new Gtk.CellRendererText();
    label.pack_start(renderer, true);
    label.add_attribute(renderer, 'text', 0);
    this._treeView.insert_column(label, 0);

    return this._treeView;
  }

  _getToolbar() {
    const toolbar = (this._toolbar = new Gtk.Box({}));

    /* new widget button with menu */
    const newButton = new Gtk.Button({ icon_name: 'list-add-symbolic' });
    newButton.connect('clicked', this._addClicked.bind(this));
    toolbar.append(newButton);

    /* delete button */
    const delButton = (this._delButton = new Gtk.Button({ icon_name: 'list-remove-symbolic' }));
    delButton.connect('clicked', this._delClicked.bind(this));

    toolbar.append(delButton);

    this._updateToolbar();

    return toolbar;
  }

  _onSelectionChanged() {
    const [isSelected, , iter] = this._selection!.get_selected();

    if (isSelected) {
      this._showIndicatorConfig(this._store!.getConfig(iter));
    } else {
      this._showIndicatorConfig(null);
    }

    this._updateToolbar();
  }

  _showIndicatorConfig(indicatorConfig) {
    if (this._indicatorConfigView) {
      this._configLayout!.remove(this._indicatorConfigView.widget);
      this._indicatorConfigView.destroy();
      this._indicatorConfigView = null;
    }

    if (indicatorConfig === null) {
      return;
    }

    this._indicatorConfigView = new IndicatorConfigView(this.gettext, indicatorConfig);
    this._configLayout!.append(this._indicatorConfigView.widget);
  }

  _updateToolbar() {
    let sensitive = false;

    if (this._selection) {
      const [isSelected] = this._selection.get_selected();
      sensitive = isSelected;
    }

    this._delButton!.set_sensitive(sensitive);
  }

  _addClicked() {
    this._store!.append();
    this._updateToolbar();
  }

  _delClicked() {
    const [isSelected, , iter] = this._selection!.get_selected();

    if (!iter) {
      throw new Error();
    }

    if (isSelected) {
      this._store!.remove(iter);
    }

    this._updateToolbar();
  }
}

export default class BitcoinMarketsSettings extends ExtensionPreferences {
  fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    const gtkWidget = new BitcoinMarketsSettingsWidget(this);
    group.add(gtkWidget);
    page.add(group);
    window.add(page);
  }
}
