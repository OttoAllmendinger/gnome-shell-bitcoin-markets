const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const _invalidExchangeError = () =>
    new Error("use_average !== true and no exchange defined");

const Api = new Lang.Class({
  Name: "BitcoinAverage.Api",
  Extends: BaseProvider.Api,

  apiName: "BitcoinAverage",

  apiDocs: [
    ["API Docs", "https://apiv2.bitcoinaverage.com/"],
    ["Symbols (JSON)", "https://apiv2.bitcoinaverage.com/symbols/indices/ticker"]
  ],

  /* Quote 429 response:
   *
   *  Rate limit exceeded for unauthenticated requests.
   *  You are allowed to make 100 requests every 1440.0 minutes
   *
   * That means an interval of about 15 minutes
   *
   */
  interval: 15 * 60,

  getLabel({ use_average, exchange, base, quote }) {
    const pair = `${base}/${quote}`
    if (use_average !== false) {
      return `BitAvg ${pair}`;
    } else if (exchange !== undefined) {
      return `BitAvg/${exchange} ${pair}`;
    } else {
      throw _invalidExchangeError();
    }
  },

  getUrl({ use_average, exchange, base, quote }) {
    if (use_average !== false) {
      return "https://apiv2.bitcoinaverage.com/indices/global/ticker/short" +
        `?crypto=${base}&fiats=${quote}`;
    } else if (exchange !== undefined) {
      return `https://apiv2.bitcoinaverage.com/exchanges/${exchange}`;
    } else {
      throw _invalidExchangeError();
    }
  },

  getTicker({ base, quote, exchange, use_average, attribute }) {
    return this._getTickerInstance({
      base, quote, exchange, use_average, attribute
    });
  },

  getLast: (data, { base, quote, use_average, exchange }) => {
    let tickers;
    if (use_average !== false) {
      tickers = data;
    } else if (exchange !== undefined) {
      tickers = data.symbols;
      if (!tickers) {
        throw new Error(`illegal response for exchange=${exchange}`)
      }
    } else {
      throw _invalidExchangeError();
    }
    const symbol = `${base}${quote}`;
    if (symbol in tickers) {
      return tickers[symbol].last;
    }
    throw new Error(`no data for symbol ${symbol}`);
  }
});
