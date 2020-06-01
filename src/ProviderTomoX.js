const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;

const TokenInfo = {
"TOMO": {address: "0x0000000000000000000000000000000000000001", decimal: 18},
"BTC": {address: "0xae44807d8a9ce4b30146437474ed6faaafa1b809", decimal: 8},
"ETH": {address: "0x2eaa73bd0db20c64f53febea7b5f5e5bccc7fb8b", decimal: 18},
"USDT": {address: "0x381B31409e4D220919B2cFF012ED94d70135A59e", decimal: 6},
"POMO": { address: "0x31e58cca9ecaa057edabaccff5abfbbc3443480c", decimal: 18},
}
const Api = new Lang.Class({
  Name: "TomoX.Api",
  Extends: BaseProvider.Api,

  apiName: "TomoX(TomoChain)",

  apiDocs: [
    ["API Docs", "https://apidocs.tomochain.com/#tomodex-apis-trades"]
  ],

  interval: 15,

  getUrl({ base, quote }) {
    base = TokenInfo[base].address;
    quote = TokenInfo[quote].address;
    return `https://dex.tomochain.com/api/pair/data?baseToken=${base}&quoteToken=${quote}`;
  },

  getLast({ data }) {
    let decimal = 18
    Object.keys(TokenInfo).forEach(function(key) {
      if (TokenInfo[key].address == data.pair.quoteToken) {
       decimal = TokenInfo[key].decimal;
      }
    });
    return data.close/Math.pow(10, decimal)
  }
});
