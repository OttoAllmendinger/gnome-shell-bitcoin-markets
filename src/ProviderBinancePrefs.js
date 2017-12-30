const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitfinex } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBinance.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBinance.Api()).currencies);
    this._addSelectCoin((new ProviderBinance.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'binance') {
      config.attributes = {
        api: 'binance',
        currency: 'USD',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
