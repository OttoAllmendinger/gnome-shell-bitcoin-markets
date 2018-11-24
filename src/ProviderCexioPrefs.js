const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderCexio } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderCexio.ConfigView",
  Extends: BaseProviderConfigView,

  _init(configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);
    this._addSelectCurrency((new ProviderCexio.Api()).currencies);
    this._addSelectCoin((new ProviderCexio.Api()).coins);
  },

  _setApiDefaults(config) {
    if (config.get('api') !== 'cexio') {
      config.attributes = {
        api: 'cexio',
        currency: 'USD',
        coin: 'BTC',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);
