const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BtcChina.Api',
  Extends: BaseProvider.Api,

  apiName: "BtcChina",

  currencies: ['CNY'],

  coins: ['BTC','mBTC','LTC'],

  interval: 10,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data["ticker"]["last"]),
        change: (data) => renderChange(data["ticker"]["last"])
      };
    }
  },

  getLabel: function (options) {
    return "BTCC " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return "https://data.btcchina.com/data/ticker?market=" + options.currency.toLowerCase() + coin.toLowerCase();
  }
});
