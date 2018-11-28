const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Bitso.Api",
  Extends: BaseProvider.Api,

  apiName: "Bitso",

  currencies: ["MXN"],

  coins: ["BTC", "mBTC", "ETH", "XRP", "LTC"],

  /* quote https://bitso.com/api_info#rate-limits
   *
   * > Rate limits are are based on one minute windows. If you do more than 30
   * > requests in a minute, you get locked out for one minute.
   */
  interval: 30,

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data.payload.last),
        change: (data) => renderChange(data.payload.last)
      };
    }
  },

  getLabel(options) {
    return "Bitso " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    const coin = BaseProvider.baseCoin(options.coin);
    return "https://api.bitso.com/v3/ticker?book=" +
          coin.toLowerCase() + "_" +
          options.currency.toLowerCase();
  }
});
