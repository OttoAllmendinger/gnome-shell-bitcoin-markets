import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Gate.io';

  apiDocs = [['API Docs', 'https://www.gate.io/docs/developers/apiv4']];

  interval = 10; // unknown, guessing

  getUrl({ base, quote }) {
    return `https://api.gateio.ws/api/v4/spot/currency_pairs/${base}_${quote}`;
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