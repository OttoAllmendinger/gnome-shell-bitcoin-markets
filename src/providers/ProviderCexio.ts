import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'CEX.IO';

  apiDocs = [
    ['API Docs', 'https://cex.io/rest-api#ticker'],
    ['Pairs (JSON)', 'https://cex.io/api/currency_limits'],
  ];

  interval = 10;

  getUrl({ base, quote }) {
    return `https://cex.io/api/ticker/${base}/${quote}`;
  }

  getLast({ last, error }) {
    if (error) {
      throw new Error(error);
    }
    return last;
  }
}
