/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();

const {
  ProviderBinance,
  ProviderBitcoinAverage,
  ProviderBitstamp,
  ProviderBitfinex,
  ProviderPoloniex,
  ProviderCexio,
  ProviderCoinbase,
  ProviderBitPay,
  ProviderKraken,
  ProviderBXinTH,
  ProviderPaymium,
  ProviderBtcChina,
  ProviderBitso,
  ProviderBTCMarkets,
  ProviderWex
} = Local.imports;


const ApiProvider = new Lang.Class({
  Name: "ApiProvider",

  _init() {
    this.apis = {
      binance: new ProviderBinance.Api(),
      bitcoinaverage: new ProviderBitcoinAverage.Api(),
      bitstamp: new ProviderBitstamp.Api(),
      bitfinex: new ProviderBitfinex.Api(),
      poloniex: new ProviderPoloniex.Api(),
      bitpay: new ProviderBitPay.Api(),
      kraken: new ProviderKraken.Api(),
      cexio: new ProviderCexio.Api(),
      coinbase: new ProviderCoinbase.Api(),
      bxinth: new ProviderBXinTH.Api(),
      paymium: new ProviderPaymium.Api(),
      btcchina: new ProviderBtcChina.Api(),
      bitso: new ProviderBitso.Api(),
      btcmarkets: new ProviderBTCMarkets.Api(),
      wex: new ProviderWex.Api()
    };
  },

  get(name) {
    if (name in this.apis) {
      return this.apis[name];
    } else {
      throw new Error("unknown api " + name);
    }
  },

  destroy() {
    // eslint-disable-next-line
    for (let key in this.apis) {
      this.apis[key].destroy();
    }
  }
});


if (window["ARGV"] && ARGV[0] === "test") {
  // run by gjs
  log("command line");

  const apiProvider = new ApiProvider();

  const options = {currency: "USD", attribute: "last", coin: "BTC"};

  const indicator = apiProvider.get("bitpay", options);

  indicator.connect("update-start", () => {
    log("signal update-start");
  });

  indicator.connect("update", (obj, error, data) => {
    log("signal update");
    log("error: " + JSON.stringify(error));
    log("data: " + JSON.stringify(data));
    // apiProvider.destroy();
  });

  Mainloop.run("main");
}
