const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Bitstamp.Api",
  Extends: BaseProvider.Api,

  apiName: "Bitstamp",

  apiDocs: [
    ["API Docs", "https://www.bitstamp.net/api/"]
  ],

  // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
  // `` Do not make more than 600 request per 10 minutes or we will ban your
  //  IP address. ''
  interval: 10, // 60 requests per 10 minutes

  getUrl({ base, quote }) {
    return `https://www.bitstamp.net/api/v2/ticker/${base}${quote}`.toLowerCase();
  },

  getLast(data) {
    return data.last;
  }
});
