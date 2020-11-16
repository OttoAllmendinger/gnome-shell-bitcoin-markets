import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Binance Futures';

  apiDocs = [
    [
      'API Docs',
      'https://binance-docs.github.io/apidocs/futures/en/' + '#24hr-ticker-price-change-statistics-market_data',
    ],
  ];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${base}${quote}`;
  }

  getLast({ price }) {
    return price;
  }
}
