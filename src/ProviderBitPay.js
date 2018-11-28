const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: "BitPay.Api",
  Extends: BaseProvider.Api,

  apiName: "BitPay",

  currencies: BaseProvider.DefaultCurrencies,

  coins: ["BTC", "mBTC"],

  interval: 60, // unclear, should be safe

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();
      const find = (currency, arr) => {
        // eslint-disable-next-line
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

  getLabel(options) {
    return "BitPay " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    return "https://bitpay.com/api/rates";
  }
});
