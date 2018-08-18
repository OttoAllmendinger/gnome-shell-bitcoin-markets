const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;
const { CurrencyData } = Local.imports.CurrencyData;


const Api = new Lang.Class({
  Name: 'CoinGecko.Api',
  Extends: BaseProvider.Api,

  apiName: "CoinGecko",

  currencies: ['USD', 'BRL', 'BTC'],

  coins: ['BTC', 'ETN', 'DOGE', 'LTC'],

  interval: 300,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.market_data.current_price[options.currency.toLowerCase()]),
        change: (data) => renderChange(data.market_data.current_price[options.currency.toLowerCase()])
      };
    }
  },

  getLabel: function (options) {
    return "CoinGecko " + options.coin + "/" + options.currency;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    let info = CurrencyData[coin];
    return 'https://api.coingecko.com/api/v3/coins/' + (typeof info['name'] == "undefined" ? coin : info["name"].toLowerCase().replace(" ", ""));
  }
});
