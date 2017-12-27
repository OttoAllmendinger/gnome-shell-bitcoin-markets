const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBTCMarkets } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
	  Name: "ProviderBTCMarkets.ConfigView",
	  Extends: BaseProviderConfigView,

	  _init: function (configWidget, indicatorConfig) {
		      this.parent(configWidget, indicatorConfig);
		      this._addSelectCurrency((new ProviderBTCMarkets.Api()).currencies);
		      this._addSelectCoin((new ProviderBTCMarkets.Api()).coins);
		    },

	  _setApiDefaults: function (config) {
		      if (config.get('api') !== 'btcmarkets') {
			            config.attributes = {
					            api: 'btcmarkets',
					            currency: 'USD',
					            coin: 'BTC',
					            attribute: 'last'
					          };

			            config.emit('update');
			          }
		    },
});
Signals.addSignalMethods(ConfigView.prototype);
