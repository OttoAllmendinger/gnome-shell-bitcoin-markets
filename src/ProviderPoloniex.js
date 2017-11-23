const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Poloniex.Api',
  Extends: BaseProvider.Api,

  apiName: "Poloniex",

  currencies: ['USD'],

  coins: [
    'BTC', 'mBTC',
    'BCH',
    'BCN', 'BELA', 'BLK', 'BTCD', 'BTM', 'BTS', 'BURST', 'CLAM', 'DASH', 'DCR',
    'DGB', 'DOGE', 'EMC2', 'ETH', 'FLDC', 'FLO', 'GAME', 'GRC', 'HUC', 'LTC',
    'MAID', 'OMNI',
    'NAUT', 'NAV', 'NEOS', 'NMC', 'NOTE', 'NXT', 'PINK', 'POT', 'PPC', 'RIC',
    'SJCX', 'STR', 'SYS', 'VIA', 'XVC', 'VRC', 'VTC', 'XBC', 'XCP', 'XEM',
    'XMR', 'XPM', 'XRP', 'ETH', 'SC', 'BCY', 'EXP', 'FCT', 'RADS', 'AMP', 'DCR',
    'LSK', 'LBC', 'STEEM', 'SBD', 'ETC', 'REP', 'ARDR', 'ZEC', 'STRAT', 'NXC',
    'PASC', 'GNT', 'GNO'
  ],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const find = (currency, coin, tickerObj) => {
        // The Poloniex ticker only offers BTC prices
        // When USD is selected, do a conversion using the USDt price
        let coinPrice;
        try {
          if (currency === 'USD') {
            let btcUsdtPrice = tickerObj['USDT_BTC'].last;
            if (coin === 'BTC') {
              coinPrice = btcUsdtPrice
            } else {
              coinPrice = tickerObj['BTC_' + coin].last * btcUsdtPrice;
            }
          } else {
            coinPrice = tickerObj[currency + '_' + coin].last;
          }
        } catch (e) {
          return 0;
        }
        return coinPrice;
      };
      const coin = BaseProvider.baseCoin(options.coin);

      return {
        text: (data) => renderCurrency(find(options.currency, coin, data)),
        change: (data) => renderChange(find(options.currency, coin, data))
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
