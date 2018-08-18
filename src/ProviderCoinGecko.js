const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'CoinGecko.Api',
  Extends: BaseProvider.Api,

  apiName: "CoinGecko",

  currencies: ['USD', 'BRL'],

  coins: ['BTC', 'LTC', 'ETN'],

  interval: 15,

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
    return "[CG] " + options.coin + " -> " + options.currency;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return 'https://api.coingecko.com/api/v3/coins/' + (coin == "BTC" ? "bitcoin" : (coin == "LTC" ? "litecoin" : "electroneum"));
  }
});
