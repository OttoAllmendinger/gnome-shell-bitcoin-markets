const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


var Api = new Lang.Class({
  Name: 'Cexio.Api',
  Extends: BaseProvider.Api,

  apiName: "Cexio",

  currencies: ['USD', 'EUR'],

  coins: ['BTC', 'ETH', 'BCH', 'BTG', 'DASH', 'XRP', 'ZEC'],

  interval: 10,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.last),
        change: (data) => renderChange(data.last)
      };
    }
  },

  getLabel: function (options) {
    return 'CEX.IO ' + options.currency + '/' + options.coin;
  },

  getUrl: function (options) {
    return 'https://cex.io/api/ticker/' + options.coin + '/' + options.currency;
  }
});
