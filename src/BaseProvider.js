const Lang = imports.lang;
const Soup = imports.gi.Soup;
const Config = imports.misc.config;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const HTTP = Local.imports.HTTP;
const Accounting = Local.imports.accounting.accounting;
const { CurrencyData } = Local.imports.CurrencyData;
const { IndicatorModel } = Local.imports.IndicatorModel;

const DefaultCurrencies = [
      'USD', 'EUR', 'CNY', 'GBP', 'CAD', 'RUB', 'AUD',
      'BRL', 'CZK', 'JPY', 'NZD', 'SEK', 'SGD', 'PLN',
      'MXN', 'RUR'
];

const IndicatorChange = {
  up: "up",
  down: "down",
  unchanged: "unchanged"
};


// Normalize pseudo-coins like "mBTC" to "BTC"
const baseCoin = (coin) => {
  if (coin === "mBTC") {
    return "BTC";
  }
  return coin;
}


const ChangeRenderer = (options) => {
  /**
   * Returns a function that returns the change
   * in value between consecutive calls.
   */
  let lastValue;

  return (newValue) => {
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



const CurrencyRenderer = ({currency, coin, decimals}) => {
  let format = "%v %s";
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

  return (number) => {
    if (coin === 'mBTC') {
      number = Number(number) / 1000.0;
    }

    return Accounting.formatMoney(Number(number), {
        symbol: symbol,
        format: format,
        precision: precision
    })
  }
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

    let loop = () => {
      this.emit("update-start");

      poll(options, (error, data) => {
        if (this.disabled) {
          return;
        }

        if (error) {
          logError(error);
        }

        this._lastError = error;
        this._lastData = data;
        this.emit("update", error, data);

        if (HTTP.isErrTooManyRequests(error)) {
          log("http error: too many requests: disable handler " + id);
          this.disabled = true;
        }
      });

      if (!this.disabled) {
        this._signalTimeout = Mainloop.timeout_add_seconds(
          interval, loop
        );
      }
    };

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
    HTTP.getJSON(url, callback);
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
          id, options, this.poll.bind(this), this.interval
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

  getLabel: function ({api, currency}) {
    return api + " " + currency;
  },

  destroy: function () {
    for (let key in this._urlHandlers) {
      this._urlHandlers[key].destroy();
    }
  }
});

