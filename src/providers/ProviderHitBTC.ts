import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'HitBTC';

  apiDocs = [['API Docs', 'https://api.hitbtc.com/']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://api.hitbtc.com/api/2/public/ticker/${base}${quote}`;
  }

  getLast({ last }) {
    return last;
  }
}
