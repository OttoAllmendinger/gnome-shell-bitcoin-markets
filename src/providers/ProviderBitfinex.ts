import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Bitfinex';

  apiDocs = [
    ['API Docs', 'https://docs.bitfinex.com/v1/reference#rest-public-ticker'],
    ['Symbols (JSON)', 'https://api.bitfinex.com/v1/symbols'],
  ];

  /* quote https://www.bitfinex.com/posts/188
   *
   * > If an IP address exceeds 90 requests per minute to the REST APIs,
   * > the requesting IP address will be blocked for 10-60 seconds
   */
  interval = 10;

  getUrl({ base, quote }) {
    switch (base) {
      case 'DASH':
        base = 'DSH';
        break;
      case 'IOTA':
        base = 'IOT';
        break;
      case 'QTUM':
        base = 'QTM';
        break;
      case 'DATA':
        base = 'DAT';
        break;
      case 'QASH':
        base = 'QSH';
        break;
      default:
        break;
    }
    return `https://api.bitfinex.com/v2/ticker/t${base}${quote}/`;
  }

  getLast(data) {
    return data[6];
  }
}
