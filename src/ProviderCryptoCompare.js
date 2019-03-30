const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "CryptoCompare.Api",
  Extends: BaseProvider.Api,

  apiName: "CryptoCompare",

  apiDocs: [
    ["API Docs", "https://min-api.cryptocompare.com/documentation"]
  ],

  interval: 15,

  getUrl({ base, quote }) {
    return `https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=${quote}`;
  },

  getLast(data, { quote }) {
    if (!(quote in data)) {
      throw new Error(`no data for quote ${quote}`);
    }

    return data[quote];
  }
});
