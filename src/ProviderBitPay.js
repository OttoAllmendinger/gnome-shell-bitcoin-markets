const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BitPay.Api',
  Extends: BaseProvider.Api,

  apiName: "BitPay",

  currencies: BaseProvider.DefaultCurrencies,

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = BaseProvider.CurrencyRenderer(options);
      let renderChange = BaseProvider.ChangeRenderer();

      let find = function (currency, arr) {
        for (let {code, rate} of arr) {
          if (code === currency) {
            return rate;
          }
        }

        throw Error("currency " + currency + " not found");
      };

      return {
        text: (data) => renderCurrency(find(options.currency, data)),
        change: (data) => renderChange(find(options.currency, data))
      };
    }
  },

  getLabel: function (options) {
    return "BitPay " + options.currency;
  },

  getUrl: function (options) {
    return "https://bitpay.com/api/rates";
  }
});
