const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Coinbase.Api',
  Extends: BaseProvider.Api,

  apiName: "Coinbase",

  currencies: BaseProvider.DefaultCurrencies,

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let key = 'btc_to_' + options.currency.toLowerCase();

      return {
        text: (data) => renderCurrency(data[key]),
        change: (data) => renderChange(data[key])
      };
    }
  },

  getLabel: function (options) {
    return "Coinbase " + options.currency;
  },

  getUrl: function (options) {
    return "https://coinbase.com/api/v1/currencies/exchange_rates";
  }
});
