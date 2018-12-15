const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Bitso.Api",
  Extends: BaseProvider.Api,

  apiName: "Bitso",

  apiDocs: [
    ["API Docs", "https://bitso.com/api_info#http-api-responses"],
    ["Books (JSON)", "https://api.bitso.com/v3/available_books"]
  ],

  /* quote https://bitso.com/api_info#rate-limits
   *
   * > Rate limits are are based on one minute windows. If you do more than 30
   * > requests in a minute, you get locked out for one minute.
   */
  interval: 10,

  getUrl({ base, quote }) {
    return `https://api.bitso.com/v3/ticker?book=${base}_${quote}`.toLowerCase();
  },

  getLast({ payload }) {
    return payload.last;
  }
});
