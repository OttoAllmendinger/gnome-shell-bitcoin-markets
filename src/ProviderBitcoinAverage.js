const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const ExchangeData = Local.imports.ExchangeData.ExchangeData;

const getExchangeToCurrency = () =>
  Object.keys(ExchangeData).reduce((o, currency) => {
    ExchangeData[currency].forEach((exchange) => {
      let a = o[exchange] || [];
      a.push(currency);
      o[exchange] = a;
    });
    return o;
  }, {});



const Api = new Lang.Class({
  Name: 'BitcoinAverage.Api',
  Extends: BaseProvider.Api,

  apiName: "BitcoinAverage",

  exchanges: Object.keys(getExchangeToCurrency()),

  currencies: BaseProvider.DefaultCurrencies,
  /* quote https://bitcoinaverage.com/api.htm
   *
   * > API is updated along with the site, normally around every minute. There
   * > is no explicit restriction about how often you can call the API, yet
   * > calling it more often than once a minute makes no sense. Please be good.
   */
  interval: 60,

  _invalidExchangeError: function () {
    return new Error("use_average !== true and no exchange defined");
  },

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let getNumber = function (data) {
        if (options.use_average !== false) {
          return data.last;
        } else if (options.exchange !== undefined) {
          return data[options.exchange].rates.last;
        } else {
          throw this._invalidExchangeError();
        }
      };

      return {
        text: (data) => renderCurrency(getNumber(data)),
        change: (data) => renderChange(getNumber(data))
      };
    }
  },

  getUrl: function (options) {
    if (options.use_average !== false) {
      return "https://api.bitcoinaverage.com/ticker/" + options.currency;
    } else if (options.exchange !== undefined) {
      return "https://api.bitcoinaverage.com/exchanges/" + options.currency;
    } else {
      throw this._invalidExchangeError();
    }
  },

  getLabel: function (options) {
    if (options.use_average !== false) {
      return "BitAvg " + options.currency;
    } else if (options.exchange !== undefined) {
      return "BitAvg " + options.currency + "@" + options.exchange;
    } else {
      throw this._invalidExchangeError();
    }
  }
});
