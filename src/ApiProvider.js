/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;
const Signals = imports.signals;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Accounting = Local.imports.accounting.accounting;
const CurrencyData = Local.imports.CurrencyData.CurrencyData;
const ExchangeData = Local.imports.ExchangeData.ExchangeData;
const Config = imports.misc.config;

/*
 * Init HTTP
 *
 */

const getExtensionVersion = function () {
  if (Local.metadata['git-version']) {
    return 'git-' + Local.metadata['git-version'];
  } else if (Local.metadata.version) {
    return 'v' + Local.metadata.version;
  } else {
    return 'unknown';
  }
};

const getGnomeVersion = function () {
  return Config.PACKAGE_VERSION;
};

const _repository = "http://github.com/OttoAllmendinger/" +
                    "gnome-shell-bitcoin-markets";

const _userAgent =  "gnome-shell-bitcoin-markets" +
                    "/" + getExtensionVersion() +
                    "/Gnome" + getGnomeVersion() +
                    " (" + _repository + ")";


// Some API providers have had issues with high traffic coming from single IPs
// this code helps determine if these are actually different clients from behind
// a NAT or if some clients really do many requests
const getClientId = function () {
  // GUID code from http://stackoverflow.com/a/2117523/92493
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
};

const _clientId = getClientId();

const _httpSession = new Soup.SessionAsync();

const HTTP_TOO_MANY_REQUESTS = 429;

_httpSession['user-agent'] = _userAgent;

Soup.Session.prototype.add_feature.call(
  _httpSession,
  new Soup.ProxyResolverDefault()
);


const DefaultCurrencies = [
      'USD', 'EUR', 'CNY', 'GBP', 'CAD', 'RUB', 'AUD',
      'BRL', 'CZK', 'JPY', 'NZD', 'SEK', 'SGD', 'PLN'
];


const getCurrencyToExchange = function () ExchangeData;

const getExchangeToCurrency = function ()
  Object.keys(ExchangeData).reduce(function (o, currency) {
    ExchangeData[currency].forEach(function (exchange) {
      let a = o[exchange] || [];
      a.push(currency);
      o[exchange] = a;
    });
    return o;
  }, {});

const getJSON = function (url, callback) {
  // log((new Date()) + ' getJSON ' + url);
  let message = Soup.Message.new("GET", url);
  let headers = message.request_headers;
  headers.append('X-Client-Id', _clientId);
  _httpSession.queue_message(
    message,
    function (session, message) {
      if (message.status_code == 200) {
        callback(null, JSON.parse(message.response_body.data));
      } else {
        log('getJSON error url: ' + url);
        log('getJSON error status code: ' + message.status_code);
        log('getJSON error response: ' + message.response_body.data);
        callback(message.status_code, null);
      }
    }
  );
};


const Selector = function (path) {
  /**
   * returns a function that returns a nested attribute
   * path format: a.b.c.d
   */
  return function (obj) {
    return path.split('.').reduce(function (obj, key) {
      if (obj[key]) {
        return obj[key];
      } else {
        throw new Error('invalid path: ' + path);
      }
    }, obj);
  };
};


const IndicatorChange = {
  up: "up",
  down: "down",
  unchanged: "unchanged"
};


const ChangeRenderer = function (options) {
  /**
   * Returns a function that returns the change
   * in value between consecutive calls.
   */
  let lastValue;

  return function (newValue) {
    let ret = IndicatorChange.unchanged;

    if (lastValue !== undefined) {
      if (lastValue > newValue) {
        ret = IndicatorChange.down;
      } else if (lastValue < newValue) {
        ret = IndicatorChange.up;
      }
    }

    lastValue = newValue;

    return ret;
  };
};



const CurrencyRenderer = function ({unit, currency, decimals}) {
  unit = unit || 'mBTC';

  const getFormat = function (currency) {
    /* determined after mtgox api */
    const front = "%s%v";
    const back = "%v %s";
    const frontFormats = {
      USD: front, CAD: front, AUD: front, GBP: front,
      HKD: front, NZD: front, SGD: front, THB: front
    };

    return frontFormats[currency] || back;
  };

  const changeUnit = function (number) {
    if (unit === 'mBTC') {
      return Number(number) / 1000.0;
    } else {
      return Number(number);
    }
  };

  let format = getFormat(currency);
  let symbol = currency;
  let precision = 2;

  let info = CurrencyData[currency];

  if (info) {
    symbol = info.symbol_native;

    /* disambiguate dollar currencies */
    if (symbol === '$') symbol = info.symbol;

    precision = info.decimal_digits;
  }

  if (decimals !== null) {
    precision = decimals;
  }

  return function (number)
    Accounting.formatMoney(changeUnit(number), {
      symbol: symbol,
      format: format,
      precision: precision
    });
};


/**
 * Instances of this class emit update signals periodically with formatted
 * data from api sources
 */

const IndicatorModel = new Lang.Class({
  Name: "IndicatorModel",

  _init: function (options, handler, formatter) {
    this._formatter = formatter;
    this._handler = handler;

    let onUpdate = Lang.bind(this, function (error, data) {
      if (error) {
        this.emit("update", error, null);
      } else {
        try {
          this.emit("update", null, {
            text: formatter.text(data, options),
            change: formatter.change(data, options)
          });
        } catch (formatError) {
          log("formatError " + formatError);
          this.emit("update", formatError, null);
        }
      }
    });

    this._signalUpdateStart = handler.connect(
        "update-start", Lang.bind(this, function () {
          this.emit("update-start");
        }));

    this._signalUpdate = handler.connect(
        "update", function (obj, error, data) {
          onUpdate(error, data);
        });

    if (handler._lastError || handler._lastData) {
      Mainloop.idle_add(function () {
        onUpdate(handler._lastError, handler._lastData);
      });
    }
  },

  destroy: function () {
    this.disconnectAll();
    this._handler.disconnect(this._signalUpdateStart);
    this._handler.disconnect(this._signalUpdate);
  }
});


Signals.addSignalMethods(IndicatorModel.prototype);




/**
 * We want to return a handler for each data source. The handler
 * polls the API in periodic intervals and calls onUpdate and
 * onUpdateStart methods.
 *
 * Some URLs respond with data for many different indicators, others
 * have different URLs for each poll request. Thus we request a handler
 * id for each set of query options
 */
const Handler = new Lang.Class({
  Name: "Handler",

  _init: function (id, options, poll, interval) {
    this.disabled = false;

    if ((!interval) || (interval < 1)) {
      throw new Error('invalid interval ' + interval);
    }

    this._id = id;

    let loop = Lang.bind(this, function() {
      this.emit("update-start");

      poll(options, Lang.bind(this, function (error, data) {
        if (this.disabled) {
          return;
        }

        this._lastError = error;
        this._lastData = data;
        this.emit("update", error, data);

        if (Number(error) == HTTP_TOO_MANY_REQUESTS) {
          log("error " + HTTP_TOO_MANY_REQUESTS + " - disable handler " + id);
          this.disabled = true;
        }
      }));

      if (!this.disabled) {
        this._signalTimeout = Mainloop.timeout_add_seconds(
          interval, loop
        );
      }
    });

    Mainloop.idle_add(loop);
  },

  destroy: function () {
    if (this._signalTimeout) {
      Mainloop.source_remove(this._signalTimeout);
    }

    this.disconnectAll();
  }
});

Signals.addSignalMethods(Handler.prototype);




/**
 * Api definitions
 */

const BaseApi = new Lang.Class({
  Name: "BaseApi",

  _init: function () {
    this._urlHandlers = {};
    this._update = undefined;
  },

  poll: function (options, callback) {
    let url = this.getUrl(options);
    getJSON(url, callback);
  },

  _getHandlerId: function (options) {
    /**
     * default case: each poll URL gets a separate handler. This doesn't
     * work so well if the url needs to be dynamic (MtGox nonce)
     */
    return this.getUrl(options);
  },

  getHandler: function (options) {

    let id = this._getHandlerId(options);
    let handler = this._urlHandlers[id];

    if (handler === undefined) {
      handler = this._urlHandlers[id] =
        new Handler(
          id, options, Lang.bind(this, this.poll), this.interval
        );
    }

    return handler;
  },

  getFormatter: function (options) {
    if (this.attributes[options.attribute]) {
      return this.attributes[options.attribute](options);
    } else {
      throw new Error("unknown attribute: " + options.attribute);
    }
  },

  getModel: function (options) {
    return new IndicatorModel(
      options,
      this.getHandler(options),
      this.getFormatter(options)
    );
  },

  getLabel: function (options) {
    return options.api + " " + options.currency;
  },

  destroy: function () {
    for each (let handler in this._urlHandlers) {
      handler.destroy();
    }
  }
});



const BitstampApi = new Lang.Class({
  Name: 'BitstampApi',
  Extends: BaseApi,

  // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
  // `` Do not make more than 600 request per 10 minutes or we will ban your
  //  IP address. ''
  apiName: "Bitstamp",

  currencies: ['USD'],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      return {
        text: function (data)
          renderCurrency(data.last),
        change: function (data)
          renderChange(data.last)
      };
    }
  },

  getLabel: function (options) {
    return "BitStamp " + options.currency;
  },

  getUrl: function (options) {
    return "https://www.bitstamp.net/api/ticker/";
  }
});






const BitcoinAverageApi = new Lang.Class({
  Name: 'BitcoinAverageApi',
  Extends: BaseApi,

  apiName: "BitcoinAverage",

  exchanges: Object.keys(getExchangeToCurrency()),

  currencies: DefaultCurrencies,
  /* quote https://bitcoinaverage.com/api.htm
   *
   * > API is updated along with the site, normally around every minute. There
   * > is no explicit restriction about how often you can call the API, yet
   * > calling it more often than once a minute makes no sense. Please be good.
   */
  interval: 60,

  _invalidExchangeError: function () {
    return new Error("use_average !== true and no exchange defined");
  },

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      let getNumber = function (data) {
        if (options.use_average !== false) {
          return data.last;
        } else if (options.exchange !== undefined) {
          return data[options.exchange].rates.last;
        } else {
          throw this._invalidExchangeError();
        }
      };

      return {
        text: function (data)
          renderCurrency(getNumber(data)),

        change: function (data)
          renderChange(getNumber(data))
      };
    }
  },

  getUrl: function (options) {
    if (options.use_average !== false) {
      return "https://api.bitcoinaverage.com/ticker/" + options.currency;
    } else if (options.exchange !== undefined) {
      return "https://api.bitcoinaverage.com/exchanges/" + options.currency;
    } else {
      throw this._invalidExchangeError();
    }
  },

  getLabel: function (options) {
    if (options.use_average !== false) {
      return "BitAvg " + options.currency;
    } else if (options.exchange !== undefined) {
      return "BitAvg " + options.currency + "@" + options.exchange;
    } else {
      throw this._invalidExchangeError();
    }
  }
});


const BitPayApi = new Lang.Class({
  Name: 'BitPayApi',
  Extends: BaseApi,

  apiName: "BitPay",

  currencies: DefaultCurrencies,

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      let find = function (currency, arr) {
        for (let {code, rate} of arr) {
          if (code === currency) {
            return rate;
          }
        }

        throw Error("currency " + currency + " not found");
      };

      return {
        text: function (data)
          renderCurrency(find(options.currency, data)),
        change: function (data)
          renderChange(find(options.currency, data))
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



const CoinbaseApi = new Lang.Class({
  Name: 'CoinbaseApi',
  Extends: BaseApi,

  apiName: "Coinbase",

  currencies: DefaultCurrencies,

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      let key = 'btc_to_' + options.currency.toLowerCase();

      return {
        text: function (data)
          renderCurrency(data[key]),
        change: function (data)
          renderChange(data[key])
      };
    }
  },

  getLabel: function (options) {
    return "Coinbase " + options.currency;
  },

  getUrl: function (options) {
    return "https://coinbase.com/api/v1/currencies/exchange_rates";
  }
});


const BXinTHApi = new Lang.Class({
  Name: 'BXinTHApi',
  Extends: BaseApi,

  apiName: "BX.in.th",

  currencies: ['THB'],

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      let key = 'last_price';

      return {
        text: function (data)
          renderCurrency(data["1"]["last_price"]),
        change: function (data)
          renderChange(data["1"]["change"])
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


const PaymiumApi = new Lang.Class({
  Name: 'PaymiumApi',
  Extends: BaseApi,

  apiName: "Paymium",

  currencies: ['EUR'],

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      let key = 'price';

      return {
        text: function (data)
          renderCurrency(data["price"]),
        change: function (data)
          renderChange(data["price"])
      };
    }
  },

  getLabel: function (options) {
    return "Paymium " + options.currency;
  },

  getUrl: function (options) {
    return "https://paymium.com/api/v1/data/eur/ticker";
  }
});


const BtcChinaApi = new Lang.Class({
  Name: 'BtcChinaApi',
  Extends: BaseApi,

  apiName: "BtcChina",

  currencies: ['CNY'],

  interval: 10,

  attributes: {
    last: function (options) {
      let renderCurrency = new CurrencyRenderer(options);
      let renderChange = new ChangeRenderer();

      return {
        text: function (data)
          renderCurrency(data["ticker"]["last"]),
        change: function (data)
          renderChange(data["ticker"]["last"])
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


const ApiProvider = new Lang.Class({
  Name: "ApiProvider",

  _init: function () {
    this.apis = {
      bitcoinaverage: new BitcoinAverageApi(),
      bitstamp: new BitstampApi(),
      bitpay: new BitPayApi(),
      coinbase: new CoinbaseApi(),
      bxinth: new BXinTHApi(),
      paymium: new PaymiumApi(),
      btcchina: new BtcChinaApi()
    };
  },

  get: function (name) {
    if (name in this.apis) {
      return this.apis[name];
    } else {
      throw new Error('unknown api ' + name);
    }
  },

  destroy: function () {
    for each (let api in this.apis) {
      api.destroy();
    }
  }
});


if (this.ARGV !== undefined) {
  // run by gjs
  log("command line");

  let apiProvider = new ApiProvider();

  let options = {currency: "USD", attribute: "last"};

  let indicator = apiProvider.get('bitpay', options);

  indicator.connect("update-start", function () {
    log("signal update-start");
  });

  indicator.connect("update", function (obj, error, data) {
    log("signal update");
    log("error: " + JSON.stringify(error));
    log("data: " + JSON.stringify(data));
    // apiProvider.destroy();
  });

  Mainloop.run("main");
}
