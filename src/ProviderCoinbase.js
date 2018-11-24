const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Coinbase.Api',
  Extends: BaseProvider.Api,

  apiName: "Coinbase",

  currencies: BaseProvider.DefaultCurrencies,

  coins: ['BTC', 'mBTC', 'LTC', 'ETH'],

  interval: 60, // unclear, should be safe

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const coin = BaseProvider.baseCoin(options.coin);
      const key = coin.toLowerCase() + '_to_' + options.currency.toLowerCase();

      return {
        text: (data) => renderCurrency(data[key]),
        change: (data) => renderChange(data[key])
      };
    }
  },

  getLabel(options) {
    return "Coinbase " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    return "https://coinbase.com/api/v1/currencies/exchange_rates";
  }
});
