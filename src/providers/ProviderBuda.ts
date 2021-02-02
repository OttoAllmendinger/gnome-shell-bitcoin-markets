import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Buda';

  apiDocs = [['API Docs', 'https://api.buda.com/#la-api-de-buda-com']];

  interval = 60;

  getUrl({ base, quote }) {
    return `https://www.buda.com/api/v2/markets/${base}-${quote}/ticker`;
  }

  getLast({ ticker }) {
    return ticker.last_price[0];
  }
}
