const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'ProviderPaymium.Api',
  Extends: BaseProvider.Api,

  apiName: "Paymium",

  currencies: ['EUR'],

  coins: ['BTC', 'mBTC'],

  interval: 60, // unclear, should be safe

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data["price"]),
        change: (data) => renderChange(data["price"])
      };
    }
  },

  getLabel(options) {
    return "Paymium " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    return "https://paymium.com/api/v1/data/" + options.currency.toLowerCase() + "/ticker";
  }
});
