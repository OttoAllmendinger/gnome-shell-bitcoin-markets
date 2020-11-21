import * as BaseProvider from '../BaseProvider';

export class Api extends BaseProvider.Api {
  apiName = 'Huobi';

  apiDocs = [['API Docs', 'https://huobiapi.github.io/docs/spot/v1/en/#introduction']];

  // Each API Key can send maximum of 100 https requests within 10 seconds
  // so 15 should be safe.
  interval = 15;

  getUrl({ base, quote }) {
    return 'https://api.huobi.pro/market/detail/' + `merged?symbol=${base}${quote}`.toLowerCase();
  }

  getLast(data) {
    if (data['status'] === 'error') {
      throw new Error(data['err-msg']);
    }

    return data.tick.bid[0];
  }
}
