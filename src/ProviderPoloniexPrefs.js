const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderPoloniex } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderPoloniex.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderPoloniex.Api()).currencies);
    this._addSelectCoin((new ProviderPoloniex.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'poloniex') {
      config.attributes = {
        api: 'poloniex',
        currency: 'USD',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);

