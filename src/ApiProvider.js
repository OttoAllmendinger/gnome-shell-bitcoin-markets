/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();

const {
  ProviderBitcoinAverage,
  ProviderBitstamp,
  ProviderPoloniex,
  ProviderCoinbase,
  ProviderBitPay,
  ProviderBXinTH,
  ProviderPaymium,
  ProviderBtcChina,
  ProviderBitso,
  ProviderWex
} = Local.imports;


const ApiProvider = new Lang.Class({
  Name: "ApiProvider",

  _init: function () {
    this.apis = {
      bitcoinaverage: new ProviderBitcoinAverage.Api(),
      bitstamp: new ProviderBitstamp.Api(),
      poloniex: new ProviderPoloniex.Api(),
      bitpay: new ProviderBitPay.Api(),
      coinbase: new ProviderCoinbase.Api(),
      bxinth: new ProviderBXinTH.Api(),
      paymium: new ProviderPaymium.Api(),
      btcchina: new ProviderBtcChina.Api(),
      bitso: new ProviderBitso.Api(),
      wex: new ProviderWex.Api()
    };
  },

  get: function (name) {
    if (name in this.apis) {
      return this.apis[name];
    } else {
      throw new Error('unknown api ' + name);
    }
  },

  destroy: function () {
    for (let key in this.apis) {
      this.apis[key].destroy();
    }
  }
});


if (window["ARGV"] && ARGV[0] === "test") {
  // run by gjs
  log("command line");

  let apiProvider = new ApiProvider();

  let options = {currency: "USD", attribute: "last", coin: "BTC"};

  let indicator = apiProvider.get('bitpay', options);

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
