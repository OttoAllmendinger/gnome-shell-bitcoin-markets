const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BXinTH.Api',
  Extends: BaseProvider.Api,

  apiName: "BX.in.th",

  currencies: ['THB'],

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data["1"]["last_price"]),
        change: (data) => renderChange(data["1"]["change"])
      };
    }
  },

  getLabel: function (options) {
    return "BXinTH " + options.currency;
  },

  getUrl: function (options) {
    return "https://bx.in.th/api/";
  }
});
