import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Bit2C';

  apiDocs = [['API Docs', 'https://bit2c.co.il/home/api']];

  interval = 10; // unknown, guessing

  getUrl({ base, quote }) {
    return `https://bit2c.co.il/Exchanges/${base}${quote}/Ticker.json`;
  }

  getLast(data) {
    if (data.error) {
      throw new Error(data.error);
    }

    return data.ll;
  }

  getDefaultTicker(): BaseProvider.Ticker {
    return { base: 'BTC', quote: 'NIS' };
  }
}
