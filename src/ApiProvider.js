const Lang = imports.lang;
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
    log('getJSON ' + url);
    _httpSession.queue_message(
        Soup.Message.new("GET", url),
        function (session, message) {
            if (message.status_code == 200) {
                callback(null, JSON.parse(message.response_body.data));
            } else {
                log('getJSON error status code: ' + message.status_code);
                log('getJSON error response: ' + message.response_body.data);
                callback(message.status_code, null);
            }
        }
    );
};



let BaseApi = function () {}

let CallbackQueue = function () {
    var callbacks = [];

    return function (a) {
        var args = arguments;

        if ((typeof a) === "function") {
            callbacks.push(a);
        } else {
            callbacks.forEach(function (cb) {
                cb.apply(cb, args);
            });
        };

        return this;
    }
}

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
        return this.getUrl(options);
    },

    getHandler: function (options) {
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
            handler.onUpdate = new CallbackQueue(handler),
            handler.onUpdateStart = new CallbackQueue(handler);

            let loop = function() {
                handler.onUpdateStart();

                self.poll(options, function (error, data) {
                    handler.onUpdate(error, data);
                });

                handler.timeout = Mainloop.timeout_add_seconds(interval, loop);
            };

            handler.start = function () { loop(); };
        }

        return handler;
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

    this._getHandlerId = function (options) {
        return "mtgox://" + options.currency;
    };

    this.getUrl = function (options) {
        return "http://data.mtgox.com/"
            + "api/2/BTC" + (options.currency)
            + "/money/ticker?nonce=" + (+new Date());
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
    let apis = {
        mtgox: new MtGoxApi(),
        btcharts: new BitcoinChartsApi()
    };

    this.get = function (name, options) {
        let api;

        if ((api = apis[name]) === undefined) {
            throw new Error('unknown api ' + name);
        } else {
            return api.getHandler(options);
        }
    };

    this.destroy = function () {
        for (k in apis) {
            apis[k].destroy();
        }
    };
}


if (this['ARGV'] !== undefined) {
    // run by gjs
    log("command line");

    let apiProvider = new ApiProvider();

    apiProvider
        .get('btcharts', {currency: "USD"})
        .onUpdateStart(function () {
            log("onUpdateStart()");
        }).onUpdate(function (error, data) {
            log("onUpdate()");
            log(JSON.stringify(data));
            apiProvider.destroy();
        }).start();

    Mainloop.run("main");
}
