const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderPaymium } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderPaymium.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderPaymium.Api()).currencies);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'paymium') {
      config.attributes = {
        api: 'paymium',
        currency: 'EUR',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
