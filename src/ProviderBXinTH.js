const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "BXinTH.Api",
  Extends: BaseProvider.Api,

  apiName: "BX.in.th",

  apiDocs: [
    ["API Docs", "https://bx.in.th/info/api/"],
    ["Pairings (JSON)", "https://bx.in.th/api/pairing/"]
  ],

  interval: 60, // unclear, should be safe

  getUrl(options) {
    return "https://bx.in.th/api/";
  },

  getLast(data, { base, quote }) {
    const result = Object.keys(data).map(k => data[k])
      .find(
        ({ primary_currency, secondary_currency }) =>
          (primary_currency === quote && secondary_currency === base)
      );

    if (!result) {
      throw new Error(`could not find pair ${base}/${quote}`)
    }

    return result.last_price;
  }
});
