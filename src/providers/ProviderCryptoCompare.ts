import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'CryptoCompare';

  apiDocs = [['API Docs', 'https://min-api.cryptocompare.com/documentation']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=${quote}`;
  }

  getLast(data, { quote }) {
    if (!(quote in data)) {
      throw new Error(`no data for quote ${quote}`);
    }

    return data[quote];
  }
}
