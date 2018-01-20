const Lang = imports.lang;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;
const ProviderKraken = Local.imports.ProviderKraken;
const AssetPairs = Local.imports.ProviderKrakenAssetPairs.AssetPairs;

var getPairByName = (name) => {
  return AssetPairs[name];
};

var getPairNameByCurrencyAndCoin = (coin, currency) => {
  let found = Object.keys(AssetPairs).filter((x, i, a) => ((AssetPairs[x].base == coin) && (AssetPairs[x].quote == currency)));
  if (found.length > 0)
    return found[0];
  else
    return undefined;
}

var getCurrenciesForCoin = (coin) => {
  let currencies = [];
  let found = Object.keys(AssetPairs).filter((x, i, a) => (AssetPairs[x].base == coin));
  found.forEach((pair_name) => {
    let pair = AssetPairs[pair_name];
    if (currencies.indexOf(pair.quote) == -1) {
      currencies.push(pair.quote);
    }
  });
  return currencies;
}

var getCoinsForCurrency = (currency) => {
  let coins = [];
  let found = Object.keys(AssetPairs).filter((x, i, a) => (AssetPairs[x].quote == currency));
  found.forEach((pair_name) => {
    let pair = AssetPairs[pair_name];
    if (coins.indexOf(pair.currency) == -1) {
      coins.push(pair.currency);
    }
  });
  return coins;
}

var getCurrencyFromKrakenQuote = (symbol) => {
  return symbol.substr(1);
}

var getCoinFromKrakenBase = (symbol) => {
  if (symbol.charAt(0) == 'X') {
    return symbol.substr(1);
  }
  return symbol;
};

const calculateCurrentPrice = (price_data) => {
  return ((parseFloat(price_data["a"][0]) + parseFloat(price_data["b"][0])) / 2);
};

var Api = new Lang.Class({
  Name: 'Kraken.Api',
  Extends: BaseProvider.Api,

  apiName: "Kraken",

  currencies: [],

  coins: [],

  // See https://www.kraken.com/help/api#api-call-rate-limit
  interval: 10,

  _init: function () {
    this.parent();
    this._updateExchangeData();
  },

  _updateExchangeData: function() {
    let pairs = AssetPairs;
    Object.keys(pairs).forEach((key) => {
      let pair = pairs[key];
      if (this.currencies.indexOf(pair.quote) == -1) {
        this.currencies.push(pair.quote);
      }
      if (this.coins.indexOf(pair.base) == -1) {
        this.coins.push(pair.base);
      }
    });
  },

  attributes: {
    last: function (options) {
      let pair = getPairByName(options.pair);

      let decimals = (options.decimals === undefined ? pair.pair_decimals: options.decimals);

      let info = {
        currency: getCurrencyFromKrakenQuote(pair.quote),
        coin: getCoinFromKrakenBase(pair.base),
        decimals: decimals
      };
      const renderCurrency = BaseProvider.CurrencyRenderer(info);
      const renderChange = BaseProvider.ChangeRenderer();

      let pair_name = options.pair;

      return {
        text: (data) => renderCurrency(calculateCurrentPrice(data["result"][pair_name])),
        change: (data) => renderChange(calculateCurrentPrice(data["result"][pair_name]))
      };
    }
  },

  getLabel: function(options) {
    let pair = getPairByName(options.pair);
    return "Kraken " + getCurrencyFromKrakenQuote(pair.quote) + "/" + getCoinFromKrakenBase(pair.base);
  },

  getUrl: function(options) {
    let pair = getPairByName(options.pair);
    if (pair === undefined) {
      return;
    }

    // See https://www.kraken.com/help/api#get-ticker-info
    return "https://api.kraken.com/0/public/Ticker?pair=" + options.pair;
  }
});
