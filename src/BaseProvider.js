const Lang = imports.lang;
const Soup = imports.gi.Soup;
const Config = imports.misc.config;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const HTTP = Local.imports.HTTP;


/**
 * Api definitions
 */
const Api = new Lang.Class({
  Name: "BaseApi",

  _init() {
    this.permanentError = null;
    this.lastUpdate = -Infinity;
    this.tickers = [];
    this.pendingRequest = null;
  },

  getLabel({base, quote}) {
    return `${this.apiName} ${base}/${quote}`;
  },

  fetch(url) {
    return new Promise((resolve, reject) => {
      if (this.permanentError) {
        return reject(this.permanentError);
      }

      if (this.pendingRequest) {
        this.pendingRequest.cancel();
      }

      this.pendingRequest = HTTP.getJSON(url);

      return this.pendingRequest
        .then(data => resolve(data))
        .catch(err => {
          if (HTTP.isErrTooManyRequests(err)) {
            this.permanentError = err;
          }
          return reject(err);
        })
        .finally(() => this.pendingRequest = null);
    });
  },

  _getTickerInstance(ticker) {
    const equalArray = (arr1, arr2) =>
      arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);

    const equalObjects = (obj1, obj2) => {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();
      return equalArray(keys1, keys2) &&
        equalArray(keys1.map(k => obj1[k]), keys1.map(k => obj2[k]))
    }

    const match = this.tickers.find(t => equalObjects(t, ticker));
    if (match) {
      return match;
    }
    this.tickers.push(ticker);
    return ticker;
  },

  getTicker({ base, quote, attribute }) {
    return this._getTickerInstance({ base, quote, attribute });
  },

  parseData(data, ticker) {
    if (ticker.attribute === "last") {
      return this.getLast(data, ticker);
    }
    throw new Error(`unknown attribute ${ticker.attribute}`);
  }
});

