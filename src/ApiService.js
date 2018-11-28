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
  ProviderBitso,
  ProviderBTCMarkets,
} = Local.imports;

const Providers = {
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
  bitso: new ProviderBitso.Api(),
  btcmarkets: new ProviderBTCMarkets.Api(),
};


const getProvider = (name) => {
  if (name in Providers) {
    return Providers[name];
  } else {
    throw new Error("unknown api " + name);
  }
};

const stop = () => {
  // eslint-disable-next-line
  for (let key in Providers) {
    Providers[key].destroy();
  }
}
