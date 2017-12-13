const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderKraken } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderKraken.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderKraken.Api()).currencies);
    this._addSelectCoin((new ProviderKraken.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'kraken') {
      config.attributes = {
        api: 'kraken',
        currency: 'EUR',
        coin: 'XBT',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
