import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'FTX exchange';

  apiDocs = [['API Docs', 'https://docs.ftx.com/#get-markets']];

  interval = 15;

  getUrl({ base, quote }) {
    return `https://ftx.com/api/markets/${base}-${quote}`;
  }

  getLast({ result }) {
    return result.last;
  }
}
