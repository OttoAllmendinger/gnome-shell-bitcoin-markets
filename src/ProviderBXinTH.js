const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BXinTH.Api',
  Extends: BaseProvider.Api,

  apiName: "BX.in.th",

  currencies: ['THB'],

  coins: ['BTC','mBTC','ETH','DAS','REP','GNO', 'OMG', 'EVX', 'XRP'],//?

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const find = (currency, coin, tickerObj) => {
        let result = {
          "last_price": 0,
          "change": 0
        }
        Object.keys(tickerObj).forEach((k) => {
          let current = tickerObj[k];
          if (current['primary_currency'] === currency && current['secondary_currency'] === coin) {
            result = current;
          }
        });
        return result;
      };
      const coin = BaseProvider.baseCoin(options.coin);

      return {
        text: (data) => renderCurrency(find(options.currency, coin, data)["last_price"]),
        change: (data) => renderChange(find(options.currency, coin, data)["change"])
      };
    }
  },

  getLabel: function (options) {
    return "BXinTH " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    return "https://bx.in.th/api/";
  }
});
