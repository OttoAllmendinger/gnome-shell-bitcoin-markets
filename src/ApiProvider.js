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

let getJSON = function (url, callback) {
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


let Selector = function (path) {
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

var IndicatorChange = {
    up: "up",
    down: "down",
    unchanged: "unchanged"
};

let ChangeRenderer = function (getValue)  {
    /**
     * Returns a function that returns a unicode symbol representing the change
     * in value between consecutive calls.
     */
    var lastValue;

    return function (data) {
        var ret = IndicatorChange.unchanged;
        var newValue = getValue(data);

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
}



/**
 * Api definitions
 */

let BaseApi = function () {}

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
        /**
         * We want to return a handler for each data source. The handler
         * polls the API in periodic intervals and calls onUpdate and
         * onUpdateStart methods.
         *
         * Some URLs respond with data for many different indicators, others
         * have different URLs for each poll request. Thus we request a handler
         * id for each set of query options
         */

        var self = this;
        var interval = this.interval;
        var id = this._getHandlerId(options);
        var handler = this._urlHandlers[id];

        if ((!interval) || (interval < 1)) {
            throw new Error('invalid interval ' + interval);
        };

        if (!handler) {
            handler = this._urlHandlers[id] = {}
            handler.id = id;
            Signals.addSignalMethods(handler);

            let loop = function() {
                handler.emit("update-start");

                self.poll(options, function (error, data) {
                    handler.emit("update", error, data);
                });

                handler.timeout = Mainloop.timeout_add_seconds(interval, loop);
            };

            Mainloop.idle_add(function () { loop(); });
        }

        return handler;
    },

    getFormatter: function (options) {
        return this.attributes[options.attribute]();
    },

    getIndicator: function (options) {
        let handler = this.getHandler(options);

        let indicator = {};
        Signals.addSignalMethods(indicator);

        let formatter = this.getFormatter(options);

        handler.connect("update-start", function () {
            indicator.emit("update-start");
        });

        handler.connect("update", function (obj, error, data) {
            if (error) {
                indicator.emit("update", error, null);
            } else {
                indicator.emit("update", null, {
                    text: formatter.text(data, options),
                    change: formatter.change(data, options)
                });
            }
        });

        return indicator;
    },

    destroy: function () {
        log("removing timeouts for api " + this.name);

        for (let k in this._urlHandlers) {
            let h = this._urlHandlers[k];
            if (h.timeout) {
                log("removing timeout for handler " + h.id);
                Mainloop.source_remove(h.timeout);
            }
        };
    }
};


let MtGoxApi = function () {
    BaseApi.prototype._init.apply(this);

    let api = this;

    this.name = "MtGox";

    this.currencies = ["USD", "EUR"];

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

    this.getUrl = function (options) {
        return "http://bitcoincharts.com/t/markets.json";
    };

    this.interval = 15 * 60 * 1000;
}

BitcoinChartsApi.prototype = BaseApi.prototype;





var ApiProvider = function () {
    let apis = this.apis = {
        mtgox: new MtGoxApi(),
        btcharts: new BitcoinChartsApi()
    };

    this.get = function (name, options) {
        let api;

        if ((api = apis[name]) === undefined) {
            throw new Error('unknown api ' + name);
        } else {
            return api.getIndicator(options);
        }
    };

    this.destroy = function () {
        for (let k in apis) {
            apis[k].destroy();
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

    indicator.connect("update", function (error, data) {
        log("signal update");
        log(JSON.stringify(data));
        apiProvider.destroy();
    });

    Mainloop.run("main");
}
