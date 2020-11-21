import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Kucoin';

  apiDocs = [['API Docs', 'https://docs.kucoin.com/']];

  interval = 15;

  getUrl({ base, quote }) {
    return 'https://openapi-v2.kucoin.com/api/v1/market/orderbook/' + `level1?symbol=${base}-${quote}`;
  }

  getLast({ code, msg, data }) {
    if (code != 200000) {
      throw new Error(msg);
    }

    return data.price;
  }
}
