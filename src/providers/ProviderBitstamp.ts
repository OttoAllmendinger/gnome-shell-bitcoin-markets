import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Bitstamp';

  apiDocs = [['API Docs', 'https://www.bitstamp.net/api/']];

  // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
  // `` Do not make more than 600 request per 10 minutes or we will ban your
  //  IP address. ''
  interval = 10;

  getUrl({ base, quote }) {
    return `https://www.bitstamp.net/api/v2/ticker/${base}${quote}`.toLowerCase();
  }

  getLast(data) {
    return data.last;
  }
}
