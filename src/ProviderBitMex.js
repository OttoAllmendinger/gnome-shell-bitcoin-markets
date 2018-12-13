const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;


const Api = new Lang.Class({
  Name: 'BitMex.Api',
  Extends: BaseProvider.Api,

  apiName: "BitMex",

  currencies: ['USD'],

  coins: ['XBT', 'ETH'],

  
  interval: 10,

  attributes: {
    last(options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options);
      const renderChange = BaseProvider.ChangeRenderer();

      return {
        text: (data) => renderCurrency(data[data.length-1].price),
        change: (data) => renderChange(data[data.length-1].price)
      };
    }
  },

  getLabel(options) {
    return "BitMex " + options.currency + "/" + options.coin;
  },

  getUrl(options) {
    const coin = BaseProvider.baseCoin(options.coin);
    let coinParam = coin;
    switch (coin) {
      case 'XBT':
        coinParam = 'XBTUSD'
        break;
      case 'ETH':
        coinParam = 'ETHUSD'
        break;
      default:
        break;
    }
    return "https://www.bitmex.com/api/bitcoincharts/"+ coinParam +"/trades";
  }
});
