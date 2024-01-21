import * as BaseProvider from './BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Bybit';

  apiDocs = [
    ['API Docs', 'https://bybit-exchange.github.io/docs/v5/market/tickers'],
    ['Symbols', 'https://bybit-exchange.github.io/docs/v5/enum#symbol'],
  ];

  /* quote https://bybit-exchange.github.io/docs/v5/rate-limit
   *
   * `No more than 120 requests are allowed in any 5-second window.`
   */
  interval = 10;

  getUrl({ base, quote }) {
    const symbol = `${base}${quote}`.toUpperCase();
    return `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  }

  getLast(data) {
    if (data.retMsg !== 'OK') {
      throw new Error(data.retMsg);
    }
    return data.result.list[0].lastPrice;
  }

  getDefaultTicker(): BaseProvider.Ticker {
    return { base: 'BTC', quote: 'USDT' };
  }
}
