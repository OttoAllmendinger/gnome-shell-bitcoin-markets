const Signals = imports.signals;

import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';

import { extendGObject } from '../gselib/gobjectUtil';
import { _ } from 'gselib/gettext';
import ExtensionUtils from 'gselib/extensionUtils';

import * as Format from '../format/Format';
import * as ApiService from '../ApiService';
import * as BaseProviderConfigView from './BaseProviderConfigView';

const { ComboBoxView, makeConfigRow } = BaseProviderConfigView;

// const { dump } = Local.imports.dump;

import { IndicatorCollectionModel } from '../IndicatorCollectionModel';
import { SignalEmitter } from 'gselib/SignalEmitter';

declare module '@imports/GObject-2.0' {
  const TYPE_STRING: GObject.Type;
  const TYPE_INT: GObject.Type;
}

declare interface IndicatorConfigView extends SignalEmitter {}

export interface Options {
  value: string;
  label: string;
  active: boolean;
}

class IndicatorConfigView {
  private _indicatorConfig: any;
  private _layoutIndicatorSettings: Gtk.Box;
  private widget: Gtk.Box;
  private _layoutProviderSettings: Gtk.Box;
  private _apiConfigView?: BaseProviderConfigView.BaseProviderConfigView;

  constructor(indicatorConfig) {
    const padding = 8;

    this._indicatorConfig = indicatorConfig;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
    });

    {
      const frame = new Gtk.Frame({
        label: _('Indicator Settings'),
        margin_bottom: 8,
      });
      this._layoutIndicatorSettings = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        border_width: padding,
      });
      frame.add(this._layoutIndicatorSettings);
      this.widget.add(frame);
    }
    {
      const frame = new Gtk.Frame({ label: _('Provider Settings') });
      this._layoutProviderSettings = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        border_width: padding,
      });
      frame.add(this._layoutProviderSettings);
      this.widget.add(frame);
    }

    this._addIndicatorSettings();

    this._selectApi(indicatorConfig.get('api'));

    this.widget.show_all();
  }

  _addIndicatorSettings() {
    const layout = this._layoutIndicatorSettings;
    layout.add(this._confFormat());
    layout.add(this._confShowChange());
    layout.add(this._confProvider());
  }

  _selectApi(api) {
    const widget = this._layoutProviderSettings;
    const config = this._indicatorConfig;

    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = undefined;
    }

    try {
      this._apiConfigView = new BaseProviderConfigView.BaseProviderConfigView(api, widget, config);
    } catch (e) {
      e.message = `Error creating configView for api ${api}: ${e.message}`;
      logError(e);
    }

    widget.show_all();
  }

  _confFormat() {
    const format = this._indicatorConfig.get('format');

    const entry = new Gtk.Entry({
      text: format,
      tooltip_markup: Format.tooltipText(),
    });

    entry.connect('changed', () => {
      this._indicatorConfig.set('format', entry.text);
    });

    return makeConfigRow(_('Format'), entry);
  }

  _confProvider() {
    const preset = this._indicatorConfig.get('api');

    const options: Options[] = Object.keys(ApiService.Providers).map((name) => ({
      value: name,
      label: ApiService.getProvider(name).apiName,
      active: false,
    }));

    options.forEach((o) => {
      if (o.value === preset) {
        o.active = true;
      }
    });

    const view = new ComboBoxView(options);

    view.connect('changed', (view, api) => this._selectApi(api));

    return makeConfigRow(_('Provider'), view.widget);
  }

  _confShowChange() {
    const preset = this._indicatorConfig.get('show_change') !== false;

    const switchView = new Gtk.Switch({ active: preset });

    switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('show_change', obj.active);
    });

    return makeConfigRow(_('Show Change'), (switchView as unknown) as Gtk.Widget);
  }

  _confShowBaseCurrency() {
    const preset = this._indicatorConfig.get('show_base_currency') === true;

    const switchView = new Gtk.Switch({ active: preset });

    switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('show_base_currency', obj.active);
    });

    return makeConfigRow(_('Show Base Currency'), (switchView as unknown) as Gtk.Widget);
  }

  destroy() {
    this.disconnectAll();
    this.widget.destroy();
  }
}

Signals.addSignalMethods(IndicatorConfigView.prototype);

const BitcoinMarketsSettingsWidget = extendGObject(
  class BitcoinMarketsSettingsWidget extends Gtk.Box {
    private _store?: InstanceType<typeof IndicatorCollectionModel>;
    private _configLayout?: Gtk.Box;
    private _treeView?: Gtk.TreeView;
    private _selection?: Gtk.TreeSelection;
    private _toolbar?: Gtk.Toolbar;
    private _delButton?: Gtk.ToolButton;
    private _indicatorConfigView: any;

    _init() {
      super._init({
        orientation: Gtk.Orientation.HORIZONTAL,
      });

      this._store = new IndicatorCollectionModel();

      /* sidebar (left) */

      const sidebar = new Gtk.Box({
        margin: 10,
        orientation: Gtk.Orientation.VERTICAL,
        width_request: 240,
      });

      sidebar.add(this._getTreeView());
      sidebar.add((this._getToolbar() as unknown) as Gtk.Widget);

      this.add(sidebar);

      /* config (right) */

      this._configLayout = new Gtk.Box({
        margin: 10,
        orientation: Gtk.Orientation.HORIZONTAL,
        expand: true,
      });

      this.add(this._configLayout);

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
      const toolbar = (this._toolbar = new Gtk.Toolbar({
        icon_size: 1,
      }));

      toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

      /* new widget button with menu */
      const newButton = new Gtk.ToolButton({ icon_name: 'list-add-symbolic' });
      newButton.connect('clicked', this._addClicked.bind(this));
      toolbar.add(newButton);

      /* delete button */
      const delButton = (this._delButton = new Gtk.ToolButton({ icon_name: 'list-remove-symbolic' }));
      delButton.connect('clicked', this._delClicked.bind(this));

      toolbar.add(delButton);

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

      this._indicatorConfigView = new IndicatorConfigView(indicatorConfig);
      this._configLayout!.add(this._indicatorConfigView.widget);
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
  },
  Gtk.Box,
);

export default {
  init() {
    ExtensionUtils.initTranslations();
  },

  buildPrefsWidget() {
    const widget = new BitcoinMarketsSettingsWidget();

    widget.show_all();

    return widget;
  },
};
