const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitPay } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBitPayPrefs.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBitPay.Api()).currencies);
  },

  _setApiDefaults: function (config) {
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
Signals.addSignalMethods(ConfigView.prototype);
