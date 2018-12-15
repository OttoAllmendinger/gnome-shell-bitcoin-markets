const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "Kraken.Api",
  Extends: BaseProvider.Api,

  apiName: "Kraken",

  apiDocs: [
    ["API Docs", "https://www.kraken.com/help/api#public-market-data"],
    ["Asset Pairs (JSON)", "https://api.kraken.com/0/public/AssetPairs"]
  ],

  interval: 10, // unknown, guessing

  getUrl({ base, quote }) {
    return `https://api.kraken.com/0/public/Ticker?pair=${base}${quote}`;
  },

  getLast({ result, error }, { base, quote }) {
    if (error && error.length) {
      throw new Error(error[0]);
    }

    const pair = `${base}${quote}`;
    if (pair in result) {
      return result[pair].c[0];
    }

    throw new Error(`no data for pair ${pair}`);
  }
});
