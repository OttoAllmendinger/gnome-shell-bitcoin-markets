const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BTCMarkets.Api',
  Extends: BaseProvider.Api,
  apiName: "BTCMarkets",
  currencies: ['AUD', 'BTC'],
  coins: ['BTC', 'LTC', 'ETH', 'ETC', 'XRP', 'BCH'],
  interval: 10,
  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      return {
        text: (data) => renderCurrency(data.lastPrice),
        change: (data) => renderChange(data.lastPrice)
      };
    }
  },
  getLabel: function (options) {
    return 'BTCMarkets.net ' + options.currency + '/' + options.coin;
  },
  getUrl: function (options) {
    return 'https://api.btcmarkets.net/market/' + options.coin + '/' + options.currency + '/tick';
  }
});
