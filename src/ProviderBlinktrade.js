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

    const host =
      (quote === "BRL")
        ? "bitcambio_api.blinktrade.com"
        : "api.blinktrade.com";

    return (
      `https://${host}/api/v1/${quote}/ticker?crypto_currency=${base}`
    );
  },

  getLast(data) {
    return data.last;
  }
});
