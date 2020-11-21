import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'CoinGecko';

  apiDocs = [
    ['API Docs', 'https://www.coingecko.com/api/docs/v3#/coins/get_coins_list'],
    ['Coins List (JSON)', 'https://api.coingecko.com/api/v3/coins/list'],
  ];

  // ```
  //   7 Dec 2018= Due to the overwhelming requests we are receiving, we are
  //   updating our api limit from 10/second to 300/minute, that is 13
  //   million requests/month!
  // ```
  interval = 10;

  getUrl({ base }) {
    return `https://api.coingecko.com/api/v3/coins/${base}/tickers`.toLowerCase();
  }

  getLast(data, { quote }) {
    if (!data.tickers) {
      throw new Error('no tickers');
    }
    const result = data.tickers.find(({ target }) => target === quote.toUpperCase());
    if (!result) {
      throw new Error(`no quote currency ${quote.toUpperCase()}`);
    }
    return result.last;
  }
}
