import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Poloniex';

  apiDocs = [
    ['API Docs', 'https://poloniex.com/support/api/'],
    ['Currencies (JSON)', 'https://poloniex.com/public?command=returnCurrencies'],
  ];

  interval = 10; // 60 requests per 10 minutes

  getUrl(_options) {
    return 'https://poloniex.com/public?command=returnTicker';
  }

  getLast(data, { base, quote }) {
    const pair = `${quote}_${base}`;

    if (!data[pair]) {
      throw new Error(`no data for pair ${pair}`);
    }

    return data[pair].last;
  }
}
