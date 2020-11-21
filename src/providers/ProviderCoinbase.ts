import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Coinbase';

  apiDocs = [['API Docs', 'https://developers.coinbase.com/api/v2#exchange-rates']];

  interval = 60; // unclear, should be safe

  getUrl({ base }) {
    base = base.toUpperCase();
    return `https://api.coinbase.com/v2/exchange-rates?currency=${base}`;
  }

  getLast(data, { quote }) {
    const { rates } = data.data;
    if (!rates) {
      throw new Error('invalid response');
    }
    quote = quote.toUpperCase();
    if (!(quote in rates)) {
      throw new Error(`no data for quote ${quote}`);
    }
    return rates[quote];
  }
}
