const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Bitfinex.Api",
  Extends: BaseProvider.Api,

  apiName: "Bitfinex",

  currencies: ["USD"],

  coins: ["BTC", "LTC", "ETH", "ETC", "RRT", "ZEC", "XMR", "DASH", "BCC", "BCU", "XRP", "IOTA",
          "EOS", "SAN", "OMG", "BCH", "NEO", "ETP", "QTUM", "BT1", "BT2", "AVT", "EDO", "BTG",
          "DATA", "QASH", "YYW"],

  /* quote https://www.bitfinex.com/posts/188
   *
   * > If an IP address exceeds 90 requests per minute to the REST APIs,
   * > the requesting IP address will be blocked for 10-60 seconds
   */
  interval: 10,

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data[6]),
        change: (data) => renderChange(data[6])
      };
    }
  },

  getLabel(options) {
    return "Bitfinex " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    const coin = BaseProvider.baseCoin(options.coin);
    let coinParam = coin;
    switch (coin) {
      case "DASH":
        coinParam = "DSH"
        break;
      case "IOTA":
        coinParam = "IOT"
        break;
      case "QTUM":
        coinParam = "QTM"
        break;
      case "DATA":
        coinParam = "DAT"
        break;
      case "QASH":
        coinParam = "QSH"
        break;
      default:
        break;
    }
    return "https://api.bitfinex.com/v2/ticker/t" + coinParam + options.currency + "/";
  }
});
