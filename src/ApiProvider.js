// vi: sw=2 sts=2 et

const Lang = imports.lang;
const Signals = imports.signals;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Accounting = Local.imports.accounting.accounting;
const CurrencyMap = Local.imports.CurrencyMap.CurrencyMap;


/*
 * Init HTTP
 *
 */

const _version = "0.2.0";
const _repository = "http://github.com/OttoAllmendinger/" +
                    "gnome-shell-bitcoin-markets";

const _userAgent =  "gnome-shell-bitcoin-markets/" + _version +
                    " (" + _repository + ")";

const _httpSession = new Soup.SessionAsync();

_httpSession['user-agent'] = _userAgent;

Soup.Session.prototype.add_feature.call(
  _httpSession,
  new Soup.ProxyResolverDefault()
);


const getJSON = function (url, callback) {
  // log('getJSON ' + url);
  _httpSession.queue_message(
    Soup.Message.new("GET", url),
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


const ChangeRenderer = function (getValue)  {
  /**
   * Returns a function that returns the change
   * in value between consecutive calls.
   */
  let lastValue;

  return function (data) {
    let ret = IndicatorChange.unchanged;
    let newValue = getValue(data);

    if (lastValue !== undefined) {
      if (lastValue > newValue) {
        ret = IndicatorChange.down;
      } else if (lastValue < newValue) {
        ret = IndicatorChange.up;
      }
    }

    lastValue = newValue;

    return ret;
  }
};



const CurrencyRenderer = function ({currency}) {
  const getFormat = function (currency) {
    /* determined after mtgox api */
    const front = "%s%v";
    const back = "%v %s";
    const frontFormats = {
      USD: front, CAD: front, AUD: front, GBP: front,
      HKD: front, NZD: front, SGD: front, THB: front
    };

    return frontFormats[currency] || back;
  }

  let format = getFormat(currency);
  let symbol = currency;
  let precision = 2;

  let info = CurrencyMap[currency];

  if (info) {
    symbol = info.symbol_native;

    /* disambiguate dollar currencies */
    if (symbol === '$') symbol = info.symbol;

    precision = info.decimal_digits;
  }

  return function (number)
    Accounting.formatMoney(number, {
      symbol: symbol,
      format: format,
      precision: precision
    });
}


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
        this.emit("update", null, {
          text: formatter.text(data, options),
          change: formatter.change(data, options)
        });
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
    if ((!interval) || (interval < 1)) {
      throw new Error('invalid interval ' + interval);
    };

    this._id = id;

    let loop = Lang.bind(this, function() {
      this.emit("update-start");

      poll(options, Lang.bind(this, function (error, data) {
        this._lastError = error;
        this._lastData = data;
        this.emit("update", error, data);
      }));

      this._signalTimeout = Mainloop.timeout_add_seconds(
        interval, loop
      );
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

  getIndicatorModel: function (options) {
    return new IndicatorModel(
      options,
      this.getHandler(options),
      this.getFormatter(options)
    );
  },

  destroy: function () {
    for each (let handler in this._urlHandlers) {
      handler.destroy();
    };
  }
});


const MtGoxApi = new Lang.Class({
  Name: "MtGoxApi",
  Extends: BaseApi,

  apiName: "MtGox",

  interval: 30,

  currencies: [
    "USD", "EUR", "GBP", "AUD", "CAD", "CHF", "CNY", "DKK",
    "HKD", "NZD", "PLN", "RUB", "SGD", "THB", "NOK", "CZK"
  ],

  attributes: {
    last_local: function (options) {
      return {
        text: new Selector("data.last_local.display"),
        change: new ChangeRenderer(
          new Selector('data.last_local.value_int')
        )
      };
    }
  },

  _getHandlerId: function (options) {
    return "mtgox://" + options.currency;
  },

  getUrl: function (options) {
    return "http://data.mtgox.com/"
      + "api/2/BTC" + (options.currency)
      + "/money/ticker";
  },
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
      let currencyRenderer = new CurrencyRenderer(options);

      return {
        text: function (data) currencyRenderer(data.last),
        change: new ChangeRenderer(new Selector("last"))
      }
    }
  },

  getUrl: function (options) {
    return "https://www.bitstamp.net/api/ticker/";
  }
});






const BitcoinAverageApi = new Lang.Class({
  Name: 'BitcoinAverageApi',
  Extends: BaseApi,

  apiName: "BitcoinAverage",

  currencies: [ 'USD', 'EUR', 'GBP', 'CAD', 'RUB', 'AUD', 'BRL',
                'CNY', 'CZK', 'JPY', 'NZD', 'SEK', 'SGD', 'PLN'],

  interval: 10, // 60 requests per 10 minutes

  attributes: {
    last: function (options) {
      let currencyRenderer = new CurrencyRenderer(options);

      return {
        text: function (data) currencyRenderer(data.last),
        change: new ChangeRenderer(new Selector("last"))
      }
    }
  },

  getUrl: function (options) (
    "http://api.bitcoinaverage.com/ticker/" + options.currency
  )
});




const BitcoinChartsApi = new Lang.Class({
  Name: "BitcoinChartsApi",

  Extends: BaseApi,

  apiName: "BitcoinCharts",

  interval: 15 * 60 * 1000,

  currencies: ["USD", "CHF"],

  getUrl: function (options) {
    return "http://bitcoincharts.com/t/markets.json";
  }
});


const ApiProvider = new Lang.Class({
  Name: "ApiProvider",

  apis: {
    mtgox: new MtGoxApi(),
    bitstamp: new BitstampApi(),
    bitcoinaverage: new BitcoinAverageApi()
    // btcharts: new BitcoinChartsApi()
  },

  get: function (name, options) {
    let api;

    if ((api = this.apis[name]) === undefined) {
      throw new Error('unknown api ' + name);
    } else {
      return api.getIndicatorModel(options);
    }
  },

  destroy: function () {
    for each (let api in this.apis) {
      api.destroy();
    }
  }
});


if (this['ARGV'] !== undefined) {
  // run by gjs
  log("command line");

  let apiProvider = new ApiProvider();

  let options = {currency: "USD", attribute: "last"};

  let indicator = apiProvider.get('bitstamp', options);

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
