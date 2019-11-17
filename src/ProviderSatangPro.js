const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "SatangPro.Api",
  Extends: BaseProvider.Api,

  apiName: "Satang.pro",

  apiDocs: [
    ["API Docs", "https://docs.satang.pro/apis/public/orders"]
  ],

  interval: 60, // unclear, should be safe

  getUrl({ base, quote }) {
    return "https://api.tdax.com/api/orders/?pair=" +
      `${base}_${quote}`.toLowerCase();
  },

  getLast(data) {
    const bidding = parseFloat(data.bid[0].price);
    const asking = parseFloat(data.ask[0].price);
    return ((asking - bidding) * 0.5) + bidding;
  }
});
