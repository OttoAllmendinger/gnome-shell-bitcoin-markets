const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Coinbase.Api",
  Extends: BaseProvider.Api,

  apiName: "Coinbase",

  apiDocs: [
    ["API Docs", "https://developers.coinbase.com/api/v2#exchange-rates"]
  ],

  interval: 60, // unclear, should be safe

  getUrl({ base }) {
    base = base.toUpperCase();
    return `https://api.coinbase.com/v2/exchange-rates?currency=${base}`;
  },

  getLast(data, { quote }) {
    const { rates } = data.data;
    if (!rates) {
      throw new Error("invalid response");
    }
    quote = quote.toUpperCase();
    if (!(quote in rates)) {
      throw new Error(`no data for quote ${quote}`);
    }
    return rates[quote];
  }
});
