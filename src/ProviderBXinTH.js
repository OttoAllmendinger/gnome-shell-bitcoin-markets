const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BXinTH.Api',
  Extends: BaseProvider.Api,

  apiName: "BX.in.th",

  currencies: ['THB'],

  coins: ['BTC','ETH','DAS','REP','GNO'],

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let find = (currency, coin, tickerObj) => {
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

      return {
        text: (data) => renderCurrency(find(options.currency, options.coin, data)["last_price"]),
        change: (data) => renderChange(find(options.currency, options.coin, data)["change"])
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
