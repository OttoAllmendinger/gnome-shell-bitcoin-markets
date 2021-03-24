import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Bittrex';

  apiDocs = [['API Docs', 'https://bittrex.github.io/api/v3#operation--markets--marketSymbol--ticker-get']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://api.bittrex.com/v3/markets/${base}-${quote}/ticker`;
  }

  getLast({ lastTradeRate }) {
    return lastTradeRate;
  }
}
