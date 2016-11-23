const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BtcChina.Api',
  Extends: BaseProvider.Api,

  apiName: "BtcChina",

  currencies: ['CNY'],

  interval: 10,

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data["ticker"]["last"]),
        change: (data) => renderChange(data["ticker"]["last"])
      };
    }
  },

  getLabel: function (options) {
    return "BTCC " + options.currency;
  },

  getUrl: function (options) {
    return "https://data.btcchina.com/data/ticker?market=btccny";
  }
});
