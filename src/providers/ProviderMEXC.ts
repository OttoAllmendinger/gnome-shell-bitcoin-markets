import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'MEXC';

  apiDocs = [['API Docs', 'https://mexcdevelop.github.io/apidocs/spot_v3_en']];

  interval = 10; // unknown, guessing

  getUrl({ base, quote }) {
    return `https://api.mexc.com/api/v3/ticker/price?symbol=${base}${quote}`;
  }

  getLast(data) {
    if (data.error) {
      throw new Error(data.error);
    }

    return data.ll;
  }

  getDefaultTicker(): BaseProvider.Ticker {
    return { base: 'BTC', quote: 'USDT' };
  }
}