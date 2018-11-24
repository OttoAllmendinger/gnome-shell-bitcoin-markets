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

  _init(configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);

    // set defaults
    indicatorConfig.set(
      'use_average',
      indicatorConfig.get('use_average') !== false
    );

    const api = new ProviderBitcoinAverage.Api();

    /* currency selection */

    const updateExchangeSelect = () => {
      const useAverage = this._indicatorConfig.get('use_average');
      const currency = this._indicatorConfig.get('currency');
      exchangeSelect.rowWidget.sensitive = useAverage === false;
      exchangeSelect.comboBoxView.setOptions(
        this._makeExchangeOptions(currency)
      );
    };

    const currencySelect = this._addSelectCurrency(api.currencies);
    currencySelect.comboBoxView.connect('changed', updateExchangeSelect);

    this._addSelectCoin(api.coins);

    /* use average switch */
    // TODO use proper view method: connect("changed")
    const averageSwitch = this._addAverageSwitch();
    averageSwitch.switchView.connect('notify::active', (obj) => {
      this._indicatorConfig.set('use_average', obj.active);
      updateExchangeSelect();
    });

    /* exchange selection */
    const exchangeSelect = this._addSelectExchange();
    updateExchangeSelect();
  },

  _addAverageSwitch() {
    const switchView = new Gtk.Switch({
      active: this._indicatorConfig.get('use_average') !== false
    });

    const rowWidget = this._addRow(_("Average"), switchView);

    return {
      rowWidget,
      switchView
    };
  },

  _addSelectExchange() {
    const comboBoxExchange = new ComboBoxView();

    comboBoxExchange.connect("changed", (view, value) => {
      this._indicatorConfig.set('exchange', value);
    });

    const rowWidget = this._addRow(_("Exchange"), comboBoxExchange.widget);

    return {
      rowWidget,
      comboBoxView: comboBoxExchange
    };
  },

  _makeExchangeOptions(currency) {
    const coin = "BTC";
    const symbol = coin + currency.toUpperCase();
    const currentExchange = this._indicatorConfig.get('exchange');
    const getVolume = (e) => {
      if (symbol in e.symbols) {
        return e.symbols[symbol].volume;
      }
      return 0;
    }
    const exchangeByVolume = ExchangeData.filter((e) => getVolume(e) > 0);

    // swap order of (b, a) to sort in descending order
    exchangeByVolume.sort((a, b) => getVolume(b) - getVolume(a));

    const options = exchangeByVolume.map(({display_name, name}) =>
      ({label: display_name, value: name, active: name === currentExchange})
    );

    if (currentExchange === undefined) {
      options[0].active = true;
    }

    return options;
  },

  _setApiDefaults(config) {
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
