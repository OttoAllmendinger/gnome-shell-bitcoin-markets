const Lang = imports.lang;
const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
const Gettext = imports.gettext.domain('bitcoin-markets');
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitcoinAverage } = Local.imports;
const { ExchangeData } = Local.imports.ProviderBitcoinAverageExchangeData;
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

    this._addSelectCoin(api.coins);

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
    let coin = "BTC";
    let symbol = coin + currency.toUpperCase();
    let currentExchange = this._indicatorConfig.get('exchange');
    let getVolume = (e) => {
      if (symbol in e.symbols) {
        return e.symbols[symbol].volume;
      }
      return 0;
    }
    let exchangeByVolume = ExchangeData.filter((e) => getVolume(e) > 0);

    // swap order of (b, a) to sort in descending order
    exchangeByVolume.sort((a, b) => getVolume(b) - getVolume(a));

    let options = exchangeByVolume.map(({display_name, name}) =>
      ({label: display_name, value: name, active: name === currentExchange})
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
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
