import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Blinktrade';

  apiDocs = [['API Docs', 'https://blinktrade.com/docs/']];

  interval = 30; // unclear, should be safe

  getUrl({ base, quote }) {
    base = base.toUpperCase();
    quote = quote.toUpperCase();

    const host = quote === 'BRL' ? 'bitcambio_api.blinktrade.com' : 'api.blinktrade.com';

    return `https://${host}/api/v1/${quote}/ticker?crypto_currency=${base}`;
  }

  getLast(data) {
    return data.last;
  }
}
