const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "BTCMarkets.Api",
  Extends: BaseProvider.Api,

  apiName: "BTCMarkets",

  apiDocs: [
    ["API Docs", "https://github.com/BTCMarkets/API/wiki/Market-data-API"],
    ["Active Markets (JSON)", "https://api.btcmarkets.net/v2/market/active"],
  ],

  interval: 10,

  getUrl({ base, quote }) {
    return `https://api.btcmarkets.net/market/${base}/${quote}/tick`;
  },

  getLast(data) {
    if (data.success !== false) {
      return data.lastPrice;
    }
    const { errorCode, errorMessage } = data;
    throw new Error(`${errorCode}: ${errorMessage}`);
  }
});
