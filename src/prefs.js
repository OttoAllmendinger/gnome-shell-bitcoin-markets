/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain("bitcoin-markets");
const _ = Gettext.gettext;
const N_ = (e) => e;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Local.imports.convenience;

const {
  Format,
  ApiService,
  BaseProviderConfigView,
  ProviderBitcoinAveragePrefs,
} = Local.imports;

const {
  ComboBoxView,
  makeConfigRow
} = Local.imports.BaseProviderConfigView;

const IndicatorCollectionModel =
  Local.imports.IndicatorCollectionModel.IndicatorCollectionModel;


const IndicatorConfigView = new Lang.Class({
  Name: "BitcoinMarkets.IndicatorConfigView",

  _init(indicatorConfig) {
    const padding = 8;

    this._indicatorConfig = indicatorConfig;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
    });


    let frame;

    frame = new Gtk.Frame({ label: _("Indicator Settings") });
    this._layoutIndicatorSettings = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      border_width: padding
    });
    frame.add(this._layoutIndicatorSettings);
    this.widget.add(frame);


    frame = new Gtk.Frame({ label: _("Provider Settings") });
    this._layoutProviderSettings = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      border_width: padding
    });
    frame.add(this._layoutProviderSettings);
    this.widget.add(frame);

    this._addIndicatorSettings();

    this._selectApi(indicatorConfig.get("api"));

    this.widget.show_all();
  },


  _addIndicatorSettings() {
    var layout = this._layoutIndicatorSettings;
    layout.add(this._confDecimals());
    layout.add(this._confShowChange());
    layout.add(this._confShowBaseCurrency());
    layout.add(this._confProvider());
  },

  _selectApi(api) {
    const widget = this._layoutProviderSettings;
    const config = this._indicatorConfig;

    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = null;
    }

    try {
      if (api === "bitcoinaverage") {
        this._apiConfigView =
          new ProviderBitcoinAveragePrefs.ConfigView(widget, config);
      } else {
        this._apiConfigView =
          new BaseProviderConfigView.BaseProviderConfigView(api, widget, config);
      }
    } catch (e) {
      e.message = `Error creating configView for api ${api}: ${e.message}`;
      logError(e);
    }

    widget.show_all();
  },

  _confProvider() {
    const preset = this._indicatorConfig.get("api");

    const options = Object.keys(ApiService.Providers).map((name) => ({
      value: name,
      label: ApiService.getProvider(name).apiName
    }));

    options.forEach((o) => {
      if (o.value === preset) {
        o.active = true;
      }
    });

    const view = new ComboBoxView(options);

    view.connect("changed", (view, api) => this._selectApi(api));

    return makeConfigRow(_("Provider"), view.widget);
  },


  _confShowChange() {
    const preset = this._indicatorConfig.get("show_change") !== false;

    const switchView = new Gtk.Switch({active: preset});

    switchView.connect("notify::active", (obj) => {
      this._indicatorConfig.set("show_change", obj.active);
    });

    return makeConfigRow(_("Show Change"), switchView);
  },


  _confShowBaseCurrency() {
    const preset = this._indicatorConfig.get("show_base_currency") === true;

    const switchView = new Gtk.Switch({active: preset});

    switchView.connect("notify::active", (obj) => {
      this._indicatorConfig.set("show_base_currency", obj.active);
    });

    return makeConfigRow(_("Show Base Currency"), switchView);
  },


  _confDecimals() {
    const preset = this._indicatorConfig.get("decimals");

    const getLabel = (v) => {
      if (v === undefined) {
        return _("Default");
      } else {
        return String(v);
      }
    };

    const options = [undefined, 0, 1, 2, 3, 4, 5].map(
      (v) => ({label: getLabel(v), value: v, active: (v === preset)})
    );

    const decimalsView = new ComboBoxView(options);

    decimalsView.connect("changed", (view, value) => {
      this._indicatorConfig.set("decimals", value);
    });

    return makeConfigRow(_("Decimals"), decimalsView.widget);
  },

  destroy() {
    this.disconnectAll();
    this.widget.destroy();
  }
});

Signals.addSignalMethods(IndicatorConfigView.prototype);






const BitcoinMarketsSettingsWidget = new GObject.Class({
  Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
  GTypeName: "BitcoinMarketsSettingsWidget",
  Extends: Gtk.Box,

  _init() {
    this.parent({
      orientation: Gtk.Orientation.HORIZONTAL
    });

    this._store = new IndicatorCollectionModel();

    /* sidebar (left) */

    const sidebar = new Gtk.Box({
      margin: 10,
      orientation: Gtk.Orientation.VERTICAL,
      width_request: 240
    });

    sidebar.add(this._getTreeView());
    sidebar.add(this._getToolbar());

    this.add(sidebar);

    /* config (right) */

    this._configLayout = new Gtk.Box({
      margin: 10,
      orientation: Gtk.Orientation.HORIZONTAL,
      expand: true,
    });

    this.add(this._configLayout);

    /* behavior */

    this._selection = this._treeView.get_selection();
    this._selection.connect("changed", this._onSelectionChanged.bind(this));
  },

  _getTreeView() {
    this._treeView = new Gtk.TreeView({
      model: this._store,
      headers_visible: false,
      reorderable: true,
      hexpand: false,
      vexpand: true
    });

    const label = new Gtk.TreeViewColumn({title: "Label"});
    const renderer = new Gtk.CellRendererText();
    label.pack_start(renderer, true);
    label.add_attribute(renderer, "text", 0);
    this._treeView.insert_column(label, 0);

    return this._treeView;
  },

  _getToolbar() {
    const toolbar = this._toolbar = new Gtk.Toolbar({
      icon_size: 1
    });

    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

    /* new widget button with menu */
    const newButton = new Gtk.ToolButton({icon_name: "list-add-symbolic"});
    newButton.connect("clicked", this._addClicked.bind(this));
    toolbar.add(newButton);

    /* delete button */
    const delButton = this._delButton =
      new Gtk.ToolButton({icon_name: "list-remove-symbolic"});
    delButton.connect("clicked", this._delClicked.bind(this));

    toolbar.add(delButton);

    this._updateToolbar();

    return toolbar;
  },

  _onSelectionChanged() {
    const [isSelected, , iter] = this._selection.get_selected();

    if (isSelected) {
      this._showIndicatorConfig(this._store.getConfig(iter));
    } else {
      this._showIndicatorConfig(null);
    }

    this._updateToolbar();
  },

  _showIndicatorConfig(indicatorConfig) {
    if (this._indicatorConfigView) {
      this._configLayout.remove(this._indicatorConfigView.widget);
      this._indicatorConfigView.destroy();
      this._indicatorConfigView = null;
    }

    if (indicatorConfig === null) {
      return;
    }

    this._indicatorConfigView = new IndicatorConfigView(indicatorConfig);
    this._configLayout.add(this._indicatorConfigView.widget);
  },

  _updateToolbar() {
    let sensitive = false;

    if (this._selection) {
      const [isSelected] = this._selection.get_selected();
      sensitive = isSelected;
    }

    this._delButton.set_sensitive(sensitive);
  },

  _addClicked() {
    this._store.append();
    this._updateToolbar();
  },

  _delClicked() {
    const [isSelected, , iter] = this._selection.get_selected();

    if (isSelected) {
      this._store.remove(iter);
    }

    this._updateToolbar();
  }
});

function init() {
  Convenience.initTranslations();
}


function buildPrefsWidget() {
  const widget = new BitcoinMarketsSettingsWidget();

  widget.show_all();

  return widget;
}
