const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBXinTH } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBXinTH.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBXinTH.Api()).currencies);
    this._addSelectCoin((new ProviderBXinTH.Api()).coins);
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'bxinth') {
      config.attributes = {
        api: 'bxinth',
        currency: 'THB',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
