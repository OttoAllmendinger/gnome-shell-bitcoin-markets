import * as HTTP from './HTTP';

/**
 * Api definitions
 */
export abstract class Api {
  private permanentError: Error | null;
  private lastUpdate: number;
  private tickers: any[];
  private pendingRequest: any;

  abstract apiName: string;
  abstract apiDocs: string[][];
  abstract interval: number;

  constructor() {
    this.permanentError = null;
    this.lastUpdate = -Infinity;
    this.tickers = [];
    this.pendingRequest = null;
  }

  getLabel({ base, quote }): string {
    return `${this.apiName} ${base}/${quote}`;
  }

  fetch(url): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.permanentError) {
        return reject(this.permanentError);
      }

      this.pendingRequest = HTTP.getJSON(url);

      return this.pendingRequest
        .then((data) => {
          this.pendingRequest = null;
          resolve(data);
        })
        .catch((err) => {
          this.pendingRequest = null;
          if (HTTP.isErrTooManyRequests(err)) {
            this.permanentError = err;
          }
          return reject(err);
        });
      // not supported in Gnome 3.24
      // .finally(() => this.pendingRequest = null);
    });
  }

  _getTickerInstance(ticker) {
    const equalArray = (arr1, arr2) => arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);

    const equalObjects = (obj1, obj2) => {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();
      return (
        equalArray(keys1, keys2) &&
        equalArray(
          keys1.map((k) => obj1[k]),
          keys1.map((k) => obj2[k]),
        )
      );
    };

    const match = this.tickers.find((t) => equalObjects(t, ticker));
    if (match) {
      return match;
    }
    this.tickers.push(ticker);
    return ticker;
  }

  abstract getUrl(options: unknown): string;

  abstract getLast(obj: any, ticker: unknown): number;

  getTicker({ base, quote, attribute }) {
    return this._getTickerInstance({ base, quote, attribute });
  }

  parseData(data, ticker) {
    if (ticker.attribute === 'last') {
      return this.getLast(data, ticker);
    }
    throw new Error(`unknown attribute ${ticker.attribute}`);
  }
}
