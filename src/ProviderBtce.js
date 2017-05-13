const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Btce.Api',
  Extends: BaseProvider.Api,

  apiName: "Btce",

  currencies: ['USD', 'EUR', 'RUR'],

  coins: ['BTC','LTC','NMC','NVC','PPC','DSH','ETH'],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let find = (currency, coin, tickerObj) => {
        return tickerObj[coin.toLowerCase() + '_' + currency.toLowerCase()] || { "last": 0 };
      };

      return {
        text: (data) => renderCurrency(find(options.currency, options.coin, data).last),
        change: (data) => renderChange(find(options.currency, options.coin, data).last)
      };
    }
  },

  getLabel: function (options) {
    return "BTC-E " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    return "https://btc-e.com/api/3/ticker/" + options.coin.toLowerCase() + "_" + options.currency.toLowerCase();
  }
});
