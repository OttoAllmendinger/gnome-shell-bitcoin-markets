const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


// horrific api
// curl https://api.kraken.com/0/public/AssetPairs | jq '.[] | keys'
const getPairCode = (coin, currency) => {
  coin = coin.toUpperCase()
  currency = currency.toUpperCase()
  if (coin.toUpperCase() === 'BTC') {
    coin = 'XBT';
  }
  const unprefixed = ['BCH', 'DASH', 'EOS', 'GNO'];
  if (unprefixed.includes(coin)) {
    return `${coin}${currency}`;
  } else {
    return `X${coin}Z${currency}`;
  }
}

const Api = new Lang.Class({
  Name: 'Kraken.Api',
  Extends: BaseProvider.Api,

  apiName: "Kraken",

  currencies: ['USD', 'EUR'],

  coins: [
    'BTC',
    'BCH',
    'DASH',
    'ETH',
    'LTC',
    'ZEC',
    'XMR',
    'REP',
    'XRP',
    'ETC'
  ],

  interval: 10, // unknown, guessing

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const { coin, currency } = options;
      const id = getPairCode(coin, currency);
      return {
        text: ({result}) => renderCurrency(result[id].a[0]),
        change: ({result}) => renderChange(result[id].a[0])
      };
    }
  },

  getLabel({coin, currency}) {
    return "Kraken " + currency + "/" + coin;
  },

  getUrl({coin, currency}) {
    return "https://api.kraken.com/0/public/Ticker?pair=" +
      getPairCode(coin, currency);
  }
});
