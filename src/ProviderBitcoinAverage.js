const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const _invalidExchangeError = () =>
    new Error("use_average !== true and no exchange defined");

const Api = new Lang.Class({
  Name: 'BitcoinAverage.Api',
  Extends: BaseProvider.Api,

  apiName: "BitcoinAverage",

  // FIXME: remote attribute, derive from ExchangeData instead
  currencies: BaseProvider.DefaultCurrencies,

  coins: ['BTC','mBTC'],

  /* Quote 429 response:
   *
   *  Rate limit exceeded for unauthenticated requests.
   *  You are allowed to make 100 requests every 1440.0 minutes
   *
   * That means an interval of about 15 minutes
   *
   */
  interval: 15 * 60,

  attributes: {
    last: (options) => {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const symbol = "BTC" + options.currency.toUpperCase();

      const getNumber = (data) => {
        if (options.use_average !== false) {
          return data[symbol].last;
        } else if (options.exchange !== undefined) {
          return data.symbols[symbol].last;
        } else {
          throw _invalidExchangeError();
        }
      };

      return {
        text: (data) => renderCurrency(getNumber(data)),
        change: (data) => renderChange(getNumber(data))
      };
    }
  },

  getUrl: function ({use_average, exchange, coin, currency}) {
    coin = BaseProvider.baseCoin(coin).toUpperCase();
    currency = currency.toUpperCase();
    if (use_average !== false) {
      return "https://apiv2.bitcoinaverage.com/indices/global/ticker/short" +
        "?crypto=" + coin + "&fiats=" + currency;
    } else if (exchange !== undefined) {
      return "https://apiv2.bitcoinaverage.com/exchanges/" + exchange;
    } else {
      throw _invalidExchangeError();
    }
  },

  getLabel: function (options) {
    if (options.use_average !== false) {
      return "BitAvg " + options.currency + "/" + options.coin;
    } else if (options.exchange !== undefined) {
      return "BitAvg " + options.currency + "/" + options.coin + "@" + options.exchange;
    } else {
      throw _invalidExchangeError();
    }
  }
});
