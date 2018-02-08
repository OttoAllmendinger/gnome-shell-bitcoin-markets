const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderCoinMarketCap } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: 'ProviderCoinMarketCap.ConfigView',
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderCoinMarketCap.Api()).currencies);
    this._addSelectCoin((new ProviderCoinMarketCap.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'coinmarketcap') {
      config.attributes = {
        api: 'coinmarketcap',
        currency: 'USD',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  }
});
Signals.addSignalMethods(ConfigView.prototype);
