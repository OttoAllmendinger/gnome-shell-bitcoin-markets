import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Paymium';

  apiDocs = [['API Docs', 'https://github.com/Paymium/api-documentation#ticker']];

  interval = 60; // unclear, should be safe

  getUrl({ base: _base, quote }) {
    if (quote === 'BTC') {
      // returns some garbage
      throw new Error(`invalid quote ${quote}`);
    }
    return `https://paymium.com/api/v1/data/${quote}/ticker`.toLowerCase();
  }

  getLast({ price }, { base }) {
    if (base !== 'BTC') {
      throw new Error(`invalid base ${base}`);
    }
    return price;
  }
}
