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
    margin_bottom: 5,
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
    model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    let comboBox = new Gtk.ComboBox({model: model});
    let renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    comboBox.connect('changed', function (entry) {
      let [success, iter] = comboBox.get_active_iter();

      if (success) {
        this.emit('changed', model.get_value(iter, this.Columns.VALUE));
      }
    }.bind(this));

    this.widget = comboBox;
    this.model = model;

    this.setOptions(options);
  },

  setOptions: function (options) {
    this.model.clear();

    for each (let o in options) {
      let iter;

      this.model.set(
        iter = this.model.append(),
        [this.Columns.LABEL, this.Columns.VALUE],
        [o.label, o.value]
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

  _setDefaults: function (config) {},

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

  _setDefaults: function (config) {
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


const MtGoxConfigView = new Lang.Class({
  Name: "MtGoxConfigView",
  Extends: ProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ApiProvider.MtGoxApi()).currencies);
  },

  _setDefaults: function (config) {
    if (config.get('api') !== 'mtgox') {
      config.attributes = {
        api: 'mtgox',
        currency: 'USD',
        attribute: 'last_local'
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

  _setDefaults: function (config) {
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

  _setDefaults: function (config) {
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

    let currencySelect = this._addSelectCurrency(api.currencies);
    let averageSwitch = this._addAverageSwitch();
    let exchangeSelect = this._addSelectExchange();

    let updateExchangeSelect = function () {
      let useAverage = this._indicatorConfig.get('use_average');
      let currency = this._indicatorConfig.get('currency');
      exchangeSelect.rowWidget.sensitive = useAverage === false;
      exchangeSelect.comboBoxView.setOptions(
        this._makeExchangeOptions(currency)
      );
    }.bind(this);

    currencySelect.comboBoxView.connect('changed', updateExchangeSelect);

    // TODO use proper view method: connect("changed")
    averageSwitch.switchView.connect('notify::active', function (obj) {
      this._indicatorConfig.set('use_average', obj.active);
      updateExchangeSelect();
    }.bind(this));

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

  _setDefaults: function (config) {
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





const IndicatorConfigView = new Lang.Class({
  Name: "BitcoinMarkets.IndicatorConfigView",

  _init: function (indicatorConfig) {
    this._indicatorConfig = indicatorConfig;

    this.widget = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
    });

    let options = [
        {label: 'BitcoinAverage', value: 'bitcoinaverage'},
        {label: 'MtGox',    value: 'mtgox'},
        {label: 'BitStamp', value: 'bitstamp'},
        {label: 'BitPay',   value: 'bitpay'},
        {label: 'CoinBase', value: 'coinbase'}
    ];

    for each (let o in options) {
      if (o.value === indicatorConfig.get('api')) {
        o.active = true;
      }
    }

    this._selectApiView = new ComboBoxView(options);

    this._selectApiView.connect("changed", function (view, api) {
      this._selectApi(api);
    }.bind(this));

    this.widget.add(
      makeConfigRow(_("Provider"), this._selectApiView.widget)
    );

    this.widget.add(this._addSelectUnit());

    this._selectApi(indicatorConfig.get('api'));

    this.widget.show_all();
  },

  _selectApi: function (api) {
    let apiConfigViews = {
      mtgox: function () {
        return new MtGoxConfigView(this.widget, this._indicatorConfig);
      }.bind(this),

      bitstamp: function () {
        return new BitStampConfigView(this.widget, this._indicatorConfig);
      }.bind(this),

      bitcoinaverage: function () {
        return new BitcoinAverageConfigView(
          this.widget, this._indicatorConfig
        );
      }.bind(this),

      bitpay: function () {
        return new BitPayConfigView(
          this.widget, this._indicatorConfig
        );
      }.bind(this),

      coinbase: function () {
        return new CoinbaseConfigView(
          this.widget, this._indicatorConfig
        );
      }.bind(this)
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

    this.widget.show_all();
  },

  _addSelectUnit: function () {
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
    this._delButton.set_sensitive(this._store.size() > 0);
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
