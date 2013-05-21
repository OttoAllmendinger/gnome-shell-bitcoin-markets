const Lang = imports.lang;
const Signals = imports.signals;
const Soup = imports.gi.Soup;
const Mainloop = imports.mainloop;

/*
 * Init HTTP
 *
 */

const _version = "0.1.0";

const _userAgent = "gnome-shell-bitcoin-markets/" + _version;

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

const BaseApi = function () {}

BaseApi.prototype = {
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
        return this.attributes[options.attribute]();
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
};


const MtGoxApi = function () {
    BaseApi.prototype._init.apply(this);

    let api = this;

    this.name = "MtGox";

    this.currencies = ["USD", "AUD", "CAD", "CHF", "CNY", "DKK", "EUR", "GBP", "HKD", "NZD", "PLN", "RUB", "SGD", "THB", "NOK", "CZK"];
    
    this.attributes = {
        last_local: function () {
            return {
                text: new Selector("data.last_local.display"),
                change: new ChangeRenderer(
                    new Selector('data.last_local.value_int')
                )
            };
        }
    };

    this._getHandlerId = function (options) {
        return "mtgox://" + options.currency;
    };

    this.getUrl = function (options) {
        return "http://data.mtgox.com/"
            + "api/2/BTC" + (options.currency)
            + "/money/ticker";
    };

    this.interval = 30;
};

MtGoxApi.prototype = BaseApi.prototype;




let BitcoinChartsApi = function () {
    BaseApi.prototype._init.apply(this);

    this.name = 'BitcoinCharts';

    this.currencies = ["USD", "CHF"];

    this.getUrl = function (options) {
        return "http://bitcoincharts.com/t/markets.json";
    };

    this.interval = 15 * 60 * 1000;
}

BitcoinChartsApi.prototype = BaseApi.prototype;





const ApiProvider = function () {
    let apis = this.apis = {
        mtgox: new MtGoxApi(),
        btcharts: new BitcoinChartsApi()
    };

    this.get = function (name, options) {
        let api;

        if ((api = apis[name]) === undefined) {
            throw new Error('unknown api ' + name);
        } else {
            return api.getIndicatorModel(options);
        }
    };

    this.destroy = function () {
        for each (let api in apis) {
            api.destroy();
        }
    };
}


if (this['ARGV'] !== undefined) {
    // run by gjs
    log("command line");

    let apiProvider = new ApiProvider();

    let options = {currency: "USD", attribute: "last_local"};

    let indicator = apiProvider.get('mtgox', options);

    indicator.connect("update-start", function () {
        log("signal update-start");
    });

    indicator.connect("update", function (obj, error, data) {
        log("signal update");
        log(JSON.stringify(error));
        log(JSON.stringify(data));
        apiProvider.destroy();
    });

    Mainloop.run("main");
}
