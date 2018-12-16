const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "BitMEX.Api",
  Extends: BaseProvider.Api,

  apiName: "BitMEX",

  apiDocs: [
    ["API Docs", "https://www.bitmex.com/app/restAPI"],
  ],

  // ```
  //   Requests to our REST API are rate limited to 300 requests per 5
  //   minutes.  This counter refills continuously. If you are not logged in,
  //   your ratelimit is 150/5minutes.
  // ```
  interval: 10,

  getUrl({ base, quote }) {
    const symbol = `${base}${quote}`.toUpperCase();
    return "https://www.bitmex.com" +
      `/api/v1/instrument?symbol=${symbol}&columns=lastPrice`;
  },

  getLast(data, { base, quote }) {
    data = data[0];
    const symbol = `${base}${quote}`.toUpperCase();
    if (data.symbol !== symbol) {
      throw new Error(`expected symbol ${symbol}, get ${data.symbol}`);
    }
    return data.lastPrice;
  }
});
