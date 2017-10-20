const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Bitstamp.Api',
  Extends: BaseProvider.Api,

  // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
  // `` Do not make more than 600 request per 10 minutes or we will ban your
  //  IP address. ''
  apiName: "Bitstamp",

  currencies: ['USD', 'EUR'],

  coins: ['BTC', 'mBTC', 'LTC', 'ETH', 'XRP'],

  interval: 10, // 60 requests per 10 minutes

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
    return "BitStamp " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return "https://www.bitstamp.net/api/v2/ticker/" +
      coin.toLowerCase() + options.currency.toLowerCase() + '/';
  }
});
