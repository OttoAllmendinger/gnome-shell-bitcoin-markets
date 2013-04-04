const Lang = imports.lang;
const Soup = imports.gi.Soup;

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
                log('getJSON error status code', message.status_code);
                log('getJSON error response', message.response_body.data);
                callback(message.status_code, null);
            }
        }
    );
};

let MtGoxApi = function () {
    var tickerBase = "http://data.mtgox.com/api/2/";

    var getTickerUrl = function (options) {
        return tickerBase + "BTC" + (options.currency) +
            "/money/ticker?nonce=" + (+new Date());
    }

    this.poll = function (options, callback) {
        getJSON(getTickerUrl(options), function (error, obj) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, obj);
            }
        });
    };
};


let BitcoinChartsApi = function () {
    var url = "http://bitcoincharts.com/t/markets.json";
    var data;
    var minInterval = 15 * 60 * 1000;
    var lastTime = 0;
    var lastError;
    var lastData;

    var rateLimitedGetJSON = function (options, callback) {
        if ((+new Date() - lastTime) > minInterval) {
            getJSON(url, function (err, data) {
                lastTime = +new Date();
                lastError = err;
                lastData = data;
                callback(err, data);
            });
        } else {
            callback(lastError, lastData);
        }
    }

    this.poll = function (options, callback) {
        rateLimitedGetJSON(options, function (err, data) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, data);
            }
        });
    }
}


var MarketProvider = function () {
    let btcharts = new BitcoinChartsApi();

    let markets = {
        mtgox: new MtGoxApi(),
        bitcoin24: btcharts
    };

    this.poll = function (options, callback) {
        log('polling with ' + JSON.stringify(options));
        let source = markets[options.market];

        if (!source) {
            throw new Error('no source for market ' + options.market);
        } else {
            source.poll(options, callback);
        }
    }
}


if (this['ARGV']) {
    // run by gjs
    let p = new MarketProvider();

    let o = {
        currency: "USD",
        market: "bitcoin24"
    }

    p.poll(o, function (error, result) {
        log(error);
        log(JSON.stringify(result.value));

        imports.mainloop.quit("main");
    });

    imports.mainloop.run("main");
}
