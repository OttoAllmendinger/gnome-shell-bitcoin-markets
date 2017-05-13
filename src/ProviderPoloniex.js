const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Poloniex.Api',
  Extends: BaseProvider.Api,

  apiName: "Poloniex",

  currencies: ['BTC','USD'],

  coins: ['BCN', 'BELA','BLK','BTCD','BTM','BTS','BURST','CLAM','DASH','DGB','DOGE','EMC2','FLDC','FLO','GAME',
    'GRC','HUC','LTC','MAID','OMNI','NAUT','NAV','NEOS','NMC','NOTE','NXT','PINK','POT','PPC','RIC','SJCX','STR',
    'SYS','VIA','XVC','VRC','VTC','XBC','XCP','XEM','XMR','XPM','XRP','ETH','SC','BCY','EXP','FCT','RADS','AMP',
    'DCR','LSK','LBC','STEEM','SBD','ETC','REP','ARDR','ZEC','STRAT','NXC','PASC','GNT','GNO'],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let find = (currency, coin, tickerObj) => {
        global.log(JSON.stringify(tickerObj), currency, coin)

        // The Poloniex ticker only offers BTC prices
        // Wen USD is selected, do a conversion using the USDt price
        let coinPrice;
        try {
          if (currency === 'USD') {
            let btcUsdtPrice = tickerObj['USDT_BTC'].last;
            coinPrice = tickerObj['BTC_' + coin].last * btcUsdtPrice;
            global.log(btcUsdtPrice)
          } else {
            coinPrice = tickerObj[currency + '_' + coin].last;
          }
        } catch (e) {
          return 0;
        }
        return coinPrice;
      };

      return {
        text: (data) => renderCurrency(find(options.currency, options.coin, data)),
        change: (data) => renderChange(find(options.currency, options.coin, data))
      };
    }
  },

  getLabel: function (options) {
    return "Poloniex " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    return "https://poloniex.com/public?command=returnTicker";
  }
});
