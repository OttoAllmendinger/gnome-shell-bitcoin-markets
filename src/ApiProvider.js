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

let debug = function (message) {
    log(message);
};

// debug = function () {}

let getJSON = function (url, callback) {
    debug('getJSON ' + url);
    _httpSession.queue_message(
        Soup.Message.new("GET", url),
        function (session, message) {
            if (message.status_code == 200) {
                callback(null, JSON.parse(message.response_body.data));
            } else {
                debug('getJSON error status code: ' + message.status_code);
                debug('getJSON error response: ' + message.response_body.data);
                callback(message.status_code, null);
            }
        }
    );
};



let BaseApi = function () {}

BaseApi.prototype = {
    _init: function () {
        this._urlHandlers = {};
    },

    poll: function (options, callback) {
        let url = (this.getFreshUrl || this.getUrl)(options);
        getJSON(url, callback);
    },

    onupdate: function (func) {
        this._update = func;
    },

    loop: function (options) {
        let api = this;
        let url = this.getUrl(options);
        let handler = this._urlHandlers[url] || (this._urlHandlers[url] = {
            url: url,
            callbacks: [],
            onupdate: function (callback) {
                this.callbacks.push(callback);
            }
        });

        let interval = this.interval;

        if ((!interval) || (interval < 1)) {
            throw new Error('invalid interval ' + interval);
        };

        if (handler.timeout === undefined) {
            debug("starting loop for api " + api.name + " url: " + handler.url);

            let loop = function() {
                api.poll(options, function (error, data) {
                    for (i in handler.callbacks) {
                        handler.callbacks[i](error, data);
                    }
                });

                handler.timeout = Mainloop.timeout_add_seconds(interval, loop);
            };

            loop();
        } else {
            debug("loop already started for " + this.name + " url: " + handler.url);
        }

        return handler;
    },

    destroy: function () {
        debug("removing timeouts for api " + this.name);

        for (let k in this._urlHandlers) {
            let h = this._urlHandlers[k];
            debug("removing timeout for url " + h.url);
            Mainloop.source_remove(h.timeout);
        };
    }
};


let MtGoxApi = function () {
    BaseApi.prototype._init.apply(this);

    let api = this;

    this.name = "MtGox";

    this.getUrl = function (options) {
        return "http://data.mtgox.com/" +
                "api/2/BTC" + (options.currency) + "/money/ticker"
    };

    this.getFreshUrl = function (options) {
        // this function is called whenever there needs to be a cache-breaker
        return api.getUrl(options) + "?nonce=" + (+new Date());
    };

    // this.interval = 30;
    this.interval = 2;
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

    let getApi = function (name) {
        let api;

        if ((api = apis[name]) === undefined) {
            throw new Error('unknown api ' + name);
        } else {
            return api;
        }
    }

    /*
    this.poll = function (options, callback) {
        let source = apis[options.market];

        if (!source) {
            throw new Error('no source for market ' + options.market);
        } else {
            source.poll(options, callback);
        }
    };
    */

    this.get = function (name, options) {
        return getApi(name).loop(options);
    };

    this.destroy = function () {
        for (k in apis) {
            apis[k].destroy();
        }
    };
}


if (this['ARGV'] !== undefined) {
    // run by gjs

    let apiProvider = new ApiProvider();

    apiProvider
        .get('btcharts', {currency: "USD"})
        .onupdate(function (error, data) {
            debug("onupdate");
            debug(JSON.stringify(data));
            apiProvider.destroy();
        });

    Mainloop.run("main");
}
