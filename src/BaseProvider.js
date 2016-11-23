const Lang = imports.lang;
const Soup = imports.gi.Soup;
const Config = imports.misc.config;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Accounting = Local.imports.accounting.accounting;
const { CurrencyData } = Local.imports.CurrencyData;
const { IndicatorModel } = Local.imports.IndicatorModel;

const HTTP_TOO_MANY_REQUESTS = 429;

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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
};

const _clientId = getClientId();

const _httpSession = new Soup.SessionAsync();


_httpSession['user-agent'] = _userAgent;

Soup.Session.prototype.add_feature.call(
  _httpSession,
  new Soup.ProxyResolverDefault()
);


const DefaultCurrencies = [
      'USD', 'EUR', 'CNY', 'GBP', 'CAD', 'RUB', 'AUD',
      'BRL', 'CZK', 'JPY', 'NZD', 'SEK', 'SGD', 'PLN',
      'MXN'
];

const getJSON = function (url, callback) {
  // log((new Date()) + ' getJSON ' + url);
  let message = Soup.Message.new("GET", url);
  let headers = message.request_headers;
  headers.append('X-Client-Id', _clientId);
  _httpSession.queue_message(
    message,
    (session, message) => {
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
    return path.split('.').reduce((obj, key) => {
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
      HKD: front, NZD: front, SGD: front, THB: front,
      MXN: front
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

  return (number) =>
    Accounting.formatMoney(changeUnit(number), {
      symbol: symbol,
      format: format,
      precision: precision
    });
};



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
const Api = new Lang.Class({
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
    for (let key in this._urlHandlers) {
      this._urlHandlers[key].destroy();
    }
  }
});

