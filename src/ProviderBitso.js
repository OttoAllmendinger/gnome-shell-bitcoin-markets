const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'Bitso.Api',
  Extends: BaseProvider.Api,

  apiName: "Bitso",

  currencies: ['MXN'],

  coins: ['BTC','mBTC','ETH'],

  /* quote https://bitso.com/api_info#rate-limits
   *
   * > Rate limits are are based on one minute windows. If you do more than 30
   * > requests in a minute, you get locked out for one minute.
   */
  interval: 30,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.last),
        change: (data) => renderChange(data.last)
      };
    }
  },

  getLabel: function(options) {
    return "Bitso " + options.currency + "/" + options.coin;
  },

  getUrl: function(options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return "https://api.bitso.com/v2/ticker?book=" + coin + "_" + options.currency;
  }
});
