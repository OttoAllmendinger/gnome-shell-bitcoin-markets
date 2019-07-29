const Lang = imports.lang;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;

const Api = new Lang.Class({
  Name: "Blinktrade.Api",
  Extends: BaseProvider.Api,

  apiName: "Blinktrade",

  apiDocs: [
    ["API Docs", "https://blinktrade.com/docs/"]
  ],

  interval: 30, // unclear, should be safe

  getUrl({ base, quote }) {
    base = base.toUpperCase();
    quote = quote.toUpperCase();

    return (
      `https://api.blinktrade.com/api/v1/${quote}/` +
      `ticker?crypto_currency=${base}`
    );
  },

  getLast(data) {
    return data.last;
  }
});
