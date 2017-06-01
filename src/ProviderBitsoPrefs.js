const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitso } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBitso.ConfigView(",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBitso.Api()).currencies);
    this._addSelectCoin((new ProviderBitso.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bitso') {
      config.attributes = {
        api: 'bitso',
        currency: 'MXN',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
