import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Gate.io';

  apiDocs = [['API Docs', 'https://www.gate.io/docs/developers/apiv4']];

  interval = 60; // unknown, guessing

  getUrl({ base, quote }) {
    return `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${base}_${quote}`;
  }

  getLast(data) {
    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error('invalid response');
    }
    return data[0].last;
  }

  getDefaultTicker(): BaseProvider.Ticker {
    return { base: 'BTC', quote: 'USDT' };
  }
}
