const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Binance.Api",
  Extends: BaseProvider.Api,

  apiName: "Binance",

  apiDocs: [
    ["API Docs", "https://www.binance.com/restapipub.html"]
  ],

  interval: 15,

  getUrl({ base, quote }) {
    return `https://api.binance.com/api/v3/ticker/price?symbol=${base}${quote}`;
  },

  getLast({ price }) {
    return price;
  }
});
