import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'VccExchange(Vietnam)';

  apiDocs = [['API Docs', 'https://vcc.exchange/api']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://api.vcc.exchange/v3/trades/${base}_${quote}`;
  }

  getLast({ message, data }) {
    if (message != null) {
      throw new Error(message);
    }
    return data[0].price;
  }
}
