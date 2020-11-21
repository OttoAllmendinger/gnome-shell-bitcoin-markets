import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'BTCMarkets';

  apiDocs = [
    ['API Docs', 'https://github.com/BTCMarkets/API/wiki/Market-data-API'],
    ['Active Markets (JSON)', 'https://api.btcmarkets.net/v2/market/active'],
  ];

  interval = 10;

  getUrl({ base, quote }) {
    return `https://api.btcmarkets.net/market/${base}/${quote}/tick`;
  }

  getLast(data) {
    if (data.success !== false) {
      return data.lastPrice;
    }
    const { errorCode, errorMessage } = data;
    throw new Error(`${errorCode}: ${errorMessage}`);
  }
}
