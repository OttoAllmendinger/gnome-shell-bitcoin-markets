const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "CoinMarketCap.Api",
  Extends: BaseProvider.Api,

  apiName: "CoinMarketCap",

  apiDocs: [
    ["API Docs", "https://coinmarketcap.com/api/documentation/v1/#section/Introduction"],
  ],

  //  https://coinmarketcap.com
  //   /api/documentation/v1/#section/Standards-and-Conventions
  //  ```
  //     Free / Trial plans are limited to 10 API calls a minute.
  //  ```
  interval: 10,

  getUrl({ base, quote }) {
    return `https://api.coinmarketcap.com/v1/ticker/${base}/?convert=${quote}`.toLowerCase();
  },

  getLast(data, { quote }) {
    data = data[0];
    const key = `price_${quote}`.toLowerCase();
    if (!(key in data)) {
      throw new Error(`could not find quote in ${quote}`);
    }
    return data[key];
  }
});
