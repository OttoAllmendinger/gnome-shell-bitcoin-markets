const Lang = imports.lang;
const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
const Gettext = imports.gettext.domain('bitcoin-markets');
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitcoinAverage } = Local.imports;
const { ExchangeData } = Local.imports.ExchangeData;
const {
    ComboBoxView,
    BaseProviderConfigView
} = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBitcoinAveragePrefs.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);

    // set defaults
    indicatorConfig.set(
      'use_average',
      indicatorConfig.get('use_average') !== false
    );

    let api = new ProviderBitcoinAverage.Api();

    /* currency selection */

    let updateExchangeSelect = () => {
      let useAverage = this._indicatorConfig.get('use_average');
      let currency = this._indicatorConfig.get('currency');
      exchangeSelect.rowWidget.sensitive = useAverage === false;
      exchangeSelect.comboBoxView.setOptions(
        this._makeExchangeOptions(currency)
      );
    };

    let currencySelect = this._addSelectCurrency(api.currencies);
    currencySelect.comboBoxView.connect('changed', updateExchangeSelect);

    /* use average switch */
    // TODO use proper view method: connect("changed")
    let averageSwitch = this._addAverageSwitch();
    averageSwitch.switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('use_average', obj.active);
      updateExchangeSelect();
    });

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

    comboBoxExchange.connect("changed", (view, value) => {
      this._indicatorConfig.set('exchange', value);
    });

    let rowWidget = this._addRow(_("Exchange"), comboBoxExchange.widget);

    return {
      rowWidget: rowWidget,
      comboBoxView: comboBoxExchange
    };
  },

  _makeExchangeOptions: function (currency) {
    let currentExchange = this._indicatorConfig.get('exchange');
    let exchanges = ExchangeData[currency];

    let options = exchanges.map((e) =>
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
Signals.addSignalMethods(ConfigView.prototype);
