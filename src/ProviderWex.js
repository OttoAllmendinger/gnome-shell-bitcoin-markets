const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'ProviderWex.Api',
  Extends: BaseProvider.Api,

  apiName: "WEX",

  currencies: ['USD', 'RUR', 'EUR'],

  coins: ['BTC', 'LTC', 'NMC', 'NVC', 'PPC', 'DSH', 'ETH', 'BCH', 'ZEC'],

  interval: 60,

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      var id = options.coin.toLowerCase() + "_" + options.currency.toLowerCase();

      return {
        text: (data) => renderCurrency(data[id]["last"]),
        change: (data) => renderChange(data[id]["last"])
      };
    }
  },

  getLabel: function (options) {
    return "WEX " + options.currency + "/" + options.coin;
  },

  getUrl: function (options) {
    return "https://wex.nz/api/3/ticker/" + options.coin.toLowerCase() + "_"
      + options.currency.toLowerCase()
  }
});
