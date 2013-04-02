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
    // log('getJSON ' + url);
    _httpSession.queue_message(
        Soup.Message.new("GET", url),
        function (session, message) {
            if (message.status_code == 200) {
                callback(null, JSON.parse(message.response_body.data));
            } else {
                callback(message.status_code, null);
            }
        }
    );
};

let MtGoxMarket = function () {
    var tickerBase = "http://data.mtgox.com/api/2/";

    var getTickerUrl = function (options) {
        return tickerBase + "BTC" + (options.currency) +
            "/money/ticker?nonce=" + (+new Date());
    }

    var marketInfo = function (obj) {
        return obj.data;
    };

    this.poll = function (options, callback) {
        getJSON(getTickerUrl(options), function (error, obj) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, marketInfo(obj));
            }
        });
    };
};


var MarketProvider = function () {
    let markets = {
        mtgox: new MtGoxMarket()
    }

    this.poll = function (options, callback) {
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
        market: "mtgox"
    }

    p.poll(o, function (error, result) {
        log(error);
        log(result.value);

        imports.mainloop.quit("main");
    });

    imports.mainloop.run("main");
}
