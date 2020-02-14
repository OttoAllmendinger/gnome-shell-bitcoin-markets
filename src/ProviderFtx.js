const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Ftx.Api",
  Extends: BaseProvider.Api,

  apiName: "FTX exchange",

  apiDocs: [
    ["API Docs", "https://docs.ftx.com/#get-markets"]
  ],

  interval: 15,

  getUrl({ base, quote }) {
    return `https://ftx.com/api/markets/${base}-${quote}`;
  },

  getLast({ result }) {
    return result.last;
  }
});
