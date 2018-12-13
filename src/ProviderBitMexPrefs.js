const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitMex } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBitMex.ConfigView",
  Extends: BaseProviderConfigView,

  _init(configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderBitMex.Api()).currencies);
    this._addSelectCoin((new ProviderBitMex.Api()).coins);
  },

  _setApiDefaults(config) {
    if (config.get('api') !== 'bitmex') {
      config.attributes = {
        api: 'bitmex',
        currency: 'USD',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);

