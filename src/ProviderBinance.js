const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
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
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.price),
        change: (data) => renderChange(data.price)
      };
    }
  },

  getLabel(options) {
    return "Binance " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return 'https://api.binance.com/api/v3/ticker/price?symbol=' +
      coin.toUpperCase() + options.currency.toUpperCase();
  }
});
