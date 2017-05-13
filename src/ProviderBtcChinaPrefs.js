const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBtcChina } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBtcChina.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBtcChina.Api()).currencies);
    this._addSelectCoin((new ProviderBtcChina.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'btcchina') {
      config.attributes = {
        api: 'btcchina',
        currency: 'CNY',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
