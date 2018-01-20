const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


var Api = new Lang.Class({
  Name: 'Binance.Api',
  Extends: BaseProvider.Api,

  apiName: "Binance",

  currencies: ['USDT'],

  coins: ['BTC', 'LTC', 'ETH', 'BNB', 'BCC', 'NEO'],

  /* I couldn't find any limitations
   *
   * https://www.binance.com/restapipub.html
   *
   */
  interval: 15,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.price),
        change: (data) => renderChange(data.price)
      };
    }
  },

  getLabel: function (options) {
    return "Binance " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return 'https://api.binance.com/api/v3/ticker/price?symbol=' +
      coin.toUpperCase() + options.currency.toUpperCase();
  }
});
