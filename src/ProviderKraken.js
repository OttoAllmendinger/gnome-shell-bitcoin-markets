const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Kraken.Api',
  Extends: BaseProvider.Api,

  apiName: "Kraken",

  currencies: ['USD', 'EUR'],

  coins: [
    'XBT',
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

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      var id = "X" + options.coin.toUpperCase() + "Z" + options.currency.toUpperCase();
      console.log(id)
      console.log(data)
      return {
        text: (data) => renderCurrency(data[id][a][1]),
        change: (data) => renderChange(data[id][a][1])
      };
    }
  },

  getLabel: function(options) {
    return "Kraken " + options.currency + "/" + options.coin;
  },

  getUrl: function(options) {
    return "https://api.kraken.com/0/public/Ticker?pair=" + options.coin.toUpperCase() + options.currency.toUpperCase();
  }
});