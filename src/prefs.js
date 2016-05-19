/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain('bitcoin-markets');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Local.imports.convenience;
const ApiProvider = Local.imports.ApiProvider;
const ExchangeData = Local.imports.ExchangeData.ExchangeData;

const IndicatorCollectionModel =
  Local.imports.IndicatorCollectionModel.IndicatorCollectionModel;


const makeConfigRow = function (description, widget) {
  let box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_bottom: 8,
    hexpand: true,
    vexpand: false
  });

  let label = new Gtk.Label({
    label: description,
    xalign: 0,
    expand: true
  });

  box.add(label);
  box.add(widget);

  return box;
};


const ComboBoxView = new Lang.Class({
  Name: "ComboBoxView",

  Columns: { LABEL: 0, VALUE: 1 },

  _init: function (options) {
    let model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    let comboBox = new Gtk.ComboBox({model: model});
    let renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    this.widget = comboBox;
    this.model = model;
    this.setOptions(options);

    comboBox.connect('changed', function (entry) {
      let i = comboBox.get_active();
      if (i in this._options) {
        this.emit('changed', this._options[i].value);
      }
    }.bind(this));
  },

  setOptions: function (options) {
    this.model.clear();
    this._options = options || [];

    for each (let o in options) {
      let iter;

      this.model.set(
        iter = this.model.append(), [this.Columns.LABEL], [o.label]
      );

      if (o.active) {
        this.widget.set_active_iter(iter);
      }
    }
  }
});


Signals.addSignalMethods(ComboBoxView.prototype);



const makeComboBoxCurrency = function (currencies, selected) {
  let options = currencies.map(
    function (c) ({label: c, value: c, active: (c === selected)})
  );

  return new ComboBoxView(options);
};

const ProviderConfigView = new Lang.Class({
  Name: "ProviderConfigView",

  _init: function (configWidget, indicatorConfig) {
    this._configWidget = configWidget;
    this._indicatorConfig = indicatorConfig;
    this._widgets = [];
    this._setDefaults(indicatorConfig);
    this._setApiDefaults(indicatorConfig);
  },

  _addRow: function (label, widget) {
    let rowWidget = makeConfigRow(label, widget);
    this._configWidget.add(rowWidget);
    this._widgets.push(rowWidget);

    return rowWidget;
  },


  _addSelectCurrency: function (currencies) {
    let comboBoxCurrency = makeComboBoxCurrency(
      currencies, this._indicatorConfig.get('currency')
    );

    comboBoxCurrency.connect('changed', function(view, value) {
      this._indicatorConfig.set('currency', value);
    }.bind(this));

    let rowWidget = this._addRow(_("Currency"), comboBoxCurrency.widget);

    return {
      rowWidget: rowWidget,
      comboBoxView: comboBoxCurrency
    };
  },

  _setDefaults: function (config) {
    config.set('show_change', config.get('show_change') !== false);
  },

  destroy: function () {
    for each (let widget in this._widgets) {
      this._configWidget.remove(widget);
    }

    this._configWidget.show_all();
  }
});



const BitStampConfigView = new Lang.Class({
  Name: "BitStampConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.BitstampApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bitstamp') {
      config.attributes = {
        api: 'bitstamp',
        currency: 'USD',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});



const BitPayConfigView = new Lang.Class({
  Name: "BitPayConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.BitPayApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bitpay') {
      config.attributes = {
        api: 'bitpay',
        currency: 'USD',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});

Signals.addSignalMethods(BitPayConfigView.prototype);




const CoinbaseConfigView = new Lang.Class({
  Name: "CoinbaseConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.CoinbaseApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'coinbase') {
      config.attributes = {
        api: 'coinbase',
        currency: 'USD',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});

Signals.addSignalMethods(CoinbaseConfigView.prototype);

const PaymiumConfigView = new Lang.Class({
  Name: "PaymiumConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.PaymiumApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'paymium') {
      config.attributes = {
        api: 'paymium',
        currency: 'EUR',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});

Signals.addSignalMethods(PaymiumConfigView.prototype);



const BitcoinAverageConfigView = new Lang.Class({
  Name: "BitcoinAverageConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);

    // set defaults
    indicatorConfig.set(
      'use_average',
      indicatorConfig.get('use_average') !== false
    );

    let api = new ApiProvider.BitcoinAverageApi();

    /* currency selection */

    let updateExchangeSelect = function () {
      let useAverage = this._indicatorConfig.get('use_average');
      let currency = this._indicatorConfig.get('currency');
      exchangeSelect.rowWidget.sensitive = useAverage === false;
      exchangeSelect.comboBoxView.setOptions(
        this._makeExchangeOptions(currency)
      );
    }.bind(this);

    let currencySelect = this._addSelectCurrency(api.currencies);
    currencySelect.comboBoxView.connect('changed', updateExchangeSelect);

    /* use average switch */
    // TODO use proper view method: connect("changed")
    let averageSwitch = this._addAverageSwitch();
    averageSwitch.switchView.connect('notify::active', function (obj) {
      this._indicatorConfig.set('use_average', obj.active);
      updateExchangeSelect();
    }.bind(this));

    /* exchange selection */

    let exchangeSelect = this._addSelectExchange();
    updateExchangeSelect();
  },

  _addAverageSwitch: function () {
    let switchView = new Gtk.Switch({
      active: this._indicatorConfig.get('use_average') !== false
    });

    let rowWidget = this._addRow(_("Average"), switchView);

    return {
      rowWidget: rowWidget,
      switchView: switchView
    };
  },

  _addSelectExchange: function () {
    let comboBoxExchange = new ComboBoxView();

    comboBoxExchange.connect("changed", function (view, value) {
      this._indicatorConfig.set('exchange', value);
    }.bind(this));

    let rowWidget = this._addRow(_("Exchange"), comboBoxExchange.widget);

    return {
      rowWidget: rowWidget,
      comboBoxView: comboBoxExchange
    };
  },

  _makeExchangeOptions: function (currency) {
    let currentExchange = this._indicatorConfig.get('exchange');
    let exchanges = ApiProvider.getCurrencyToExchange()[currency];

    let options = exchanges.map(function (e)
      ({label: e, value: e, active: e === currentExchange})
    );

    if (currentExchange === undefined) {
      options[0].active = true;
    }

    return options;
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bitcoinaverage') {
      config.attributes = {
        api: 'bitcoinaverage',
        exchange: 'average',
        currency: 'USD',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});



const BXinTHConfigView = new Lang.Class({
  Name: "BXinTHConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.BXinTHApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bxinth') {
      config.attributes = {
        api: 'bxinth',
        currency: 'THB',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});

Signals.addSignalMethods(BXinTHConfigView.prototype);



const BtcChinaConfigView = new Lang.Class({
  Name: "BtcChinaConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.BtcChinaApi()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'btcchina') {
      config.attributes = {
        api: 'btcchina',
        currency: 'CNY',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});

Signals.addSignalMethods(BtcChinaConfigView.prototype);



const IndicatorConfigView = new Lang.Class({
  Name: "BitcoinMarkets.IndicatorConfigView",

  _init: function (indicatorConfig) {
    let padding = 8;

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

    this._selectApi(indicatorConfig.get('api'));

    this.widget.show_all();
  },


  _addIndicatorSettings: function () {
    var layout = this._layoutIndicatorSettings;

    layout.add(this._confSelectUnit());
    layout.add(this._confDecimals());
    layout.add(this._confShowChange());
    layout.add(this._confProvider());
  },

  _selectApi: function (api) {
    let widget = this._layoutProviderSettings;
    let config = this._indicatorConfig;

    let apiConfigViews = {
      bitstamp:       function () new BitStampConfigView(widget, config),
      bitcoinaverage: function () new BitcoinAverageConfigView(widget, config),
      bitpay:         function () new BitPayConfigView(widget, config),
      coinbase:       function () new CoinbaseConfigView(widget, config),
      bxinth:         function () new BXinTHConfigView(widget, config),
      paymium:        function () new PaymiumConfigView(widget, config),
      btcchina:       function () new BtcChinaConfigView(widget, config)
    };

    if (this._apiConfigView) {
      this._apiConfigView.destroy();
      this._apiConfigView = null;
    }

    if (api in apiConfigViews) {
      this._apiConfigView = apiConfigViews[api]();
    } else {
      throw new Error("no config view for " + api);
    }

    widget.show_all();
  },

  _confProvider: function () {
    let preset = this._indicatorConfig.get('api');

    let options = [
        {label: 'BitcoinAverage', value: 'bitcoinaverage'},
        {label: 'BitStamp', value: 'bitstamp'},
        {label: 'BitPay',   value: 'bitpay'},
        {label: 'CoinBase', value: 'coinbase'},
        {label: 'BXinTH',   value: 'bxinth'},
        {label: 'Paymium',  value: 'paymium'},
        {label: 'BtcChina', value: 'btcchina'}
    ];

    for each (let o in options) {
      if (o.value === preset) {
        o.active = true;
      }
    }

    let view = new ComboBoxView(options);

    view.connect("changed", function (view, api) {
      this._selectApi(api);
    }.bind(this));

    return makeConfigRow(_("Provider"), view.widget);
  },

  _confSelectUnit: function () {
    let preset = this._indicatorConfig.get('unit') || 'mBTC';

    let unitView = new ComboBoxView([
      {label: 'mBTC', value: 'mBTC', active: (preset === 'mBTC')},
      {label: 'BTC',  value: 'BTC',  active: (preset === 'BTC')}
    ]);

    if (this._indicatorConfig.get('unit') === undefined) {
      this._indicatorConfig.set('unit', 'mBTC');
    }

    unitView.connect('changed', function (view, value) {
      this._indicatorConfig.set('unit', value);
    }.bind(this));

    let rowWidget = makeConfigRow(_("Unit"), unitView.widget);

    return rowWidget;
  },

  _confShowChange: function () {
    let preset = this._indicatorConfig.get('show_change') !== false;

    let switchView = new Gtk.Switch({active: preset});

    switchView.connect('notify::active', function (obj) {
      this._indicatorConfig.set('show_change', obj.active);
    }.bind(this));

    return makeConfigRow(_("Show Change"), switchView);
  },

  _confDecimals: function () {
    let preset = this._indicatorConfig.get('decimals');

    let getLabel = function (v) {
      if (v === undefined) {
        return _("Default");
      } else {
        return String(v);
      }
    };

    let options = [undefined, 0, 1, 2, 3, 4, 5].map(
      function (v)
        ({label: getLabel(v), value: v, active: (v === preset)})
    );

    let decimalsView = new ComboBoxView(options);

    decimalsView.connect('changed', function (view, value) {
      this._indicatorConfig.set('decimals', value);
    }.bind(this));

    return makeConfigRow(_("Decimals"), decimalsView.widget);
  },

  destroy: function () {
    this.disconnectAll();
    this.widget.destroy();
  }
});

Signals.addSignalMethods(IndicatorConfigView.prototype);






const BitcoinMarketsSettingsWidget = new GObject.Class({
  Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
  GTypeName: "BitcoinMarketsSettingsWidget",
  Extends: Gtk.Box,

  _init: function () {
    this.parent({
      orientation: Gtk.Orientation.HORIZONTAL
    });

    this._apiProvider = new ApiProvider.ApiProvider();
    this._store = new IndicatorCollectionModel(undefined, this._apiProvider);

    /* sidebar (left) */

    let sidebar = new Gtk.Box({
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
    this._selection.connect(
      'changed',
      Lang.bind(this, this._onSelectionChanged)
    );
  },

  _getTreeView: function () {
    this._treeView = new Gtk.TreeView({
      model: this._store,
      headers_visible: false,
      reorderable: true,
      hexpand: false,
      vexpand: true
    });

    let label = new Gtk.TreeViewColumn({title: "Label"});
    let renderer = new Gtk.CellRendererText();
    label.pack_start(renderer, true);
    label.add_attribute(renderer, "text", 0);
    this._treeView.insert_column(label, 0);

    return this._treeView;
  },

  _getToolbar: function () {
    let toolbar = this._toolbar = new Gtk.Toolbar({
      icon_size: 1
    });

    toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

    let getAddIndicatorAction = function ({label, value}) {
      let action = new Gtk.Action({
        name: label,
        label: label
      });
    };

    /* new widget button with menu */
    let newButton = new Gtk.ToolButton({icon_name: "list-add-symbolic"});
    newButton.connect('clicked', Lang.bind(this, this._addClicked));
    toolbar.add(newButton);

    /* delete button */
    let delButton = this._delButton =
      new Gtk.ToolButton({icon_name: "list-remove-symbolic"});
    delButton.connect('clicked', Lang.bind(this, this._delClicked));

    toolbar.add(delButton);

    this._updateToolbar();

    return toolbar;
  },

  _onSelectionChanged: function () {
    let [isSelected, model, iter] = this._selection.get_selected();

    if (isSelected) {
      this._showIndicatorConfig(this._store.getConfig(iter));
    } else {
      this._showIndicatorConfig(null);
    }

    this._updateToolbar();
  },

  _showIndicatorConfig: function (indicatorConfig) {
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

  _updateToolbar: function () {
    let sensitive = false;

    if (this._selection) {
      let [isSelected, _1, _2] = this._selection.get_selected();
      sensitive = isSelected;
    }

    this._delButton.set_sensitive(sensitive);
  },

  _addClicked: function () {
    this._store.append();
    this._updateToolbar();
  },

  _delClicked: function () {
    let [isSelected, model, iter] = this._selection.get_selected();

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
  let widget = new BitcoinMarketsSettingsWidget();

  widget.show_all();

  return widget;
}
