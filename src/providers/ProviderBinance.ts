import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Binance';

  apiDocs = [['API Docs', 'https://binance-docs.github.io/apidocs/spot/en/#symbol-price-ticker']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://api.binance.com/api/v3/ticker/price?symbol=${base}${quote}`;
  }

  getLast({ price }) {
    return price;
  }
}
