const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Btce.Api',
  Extends: BaseProvider.Api,

  apiName: "Btce",

  currencies: ['USD', 'EUR', 'RUR'],

  coins: ['BTC','mBTC','LTC','NMC','NVC','PPC','DSH','ETH'],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const find = (currency, coin, tickerObj) => {
        return tickerObj[coin.toLowerCase() + '_' + currency.toLowerCase()] || { "last": 0 };
      };
      const coin = BaseProvider.baseCoin(options.coin);

      return {
        text: (data) => renderCurrency(find(options.currency, coin, data).last),
        change: (data) => renderChange(find(options.currency, coin, data).last)
      };
    }
  },

  getLabel: function (options) {
    return "BTC-E " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return "https://btc-e.com/api/3/ticker/" +
      coin.toLowerCase() + "_" + options.currency.toLowerCase();
  }
});
