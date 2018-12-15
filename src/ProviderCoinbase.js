const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Coinbase.Api",
  Extends: BaseProvider.Api,

  apiName: "Coinbase",

  apiDocs: [
    ["API Docs", "https://developers.coinbase.com/docs/wallet/guides/price-data"]
  ],

  interval: 60, // unclear, should be safe

  getUrl(options) {
    return "https://coinbase.com/api/v1/currencies/exchange_rates";
  },

  getLast(data, { base, quote }) {
    const pair = `${base}_to_${quote}`.toLowerCase();
    if (pair in data) {
      return data[pair];
    }
    throw new Error(`no such pair ${pair}`);
  }
});
