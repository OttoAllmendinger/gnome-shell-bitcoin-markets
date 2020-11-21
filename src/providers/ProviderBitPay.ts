import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'BitPay';

  apiDocs = [['API Docs', 'https://bitpay.com/api']];

  interval = 60; // unclear, should be safe

  getUrl({ base }) {
    return `https://bitpay.com/api/rates/${base}`;
  }

  getLast(data, { base: _base, quote }) {
    const result = data.find(({ code }) => code === quote);
    if (!result) {
      throw new Error(`no data for quote ${quote}`);
    }
    return result.rate;
  }
}
