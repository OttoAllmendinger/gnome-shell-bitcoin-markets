var prefs = (function (Gtk, GObject, Gio, Soup) {
    'use strict';

    // eslint-disable-next-line @typescript-eslint/ban-types
    function registerClass(meta, cls) {
        return GObject.registerClass(meta, cls);
    }
    function extendGObject(cls, parent) {
        return registerClass({
            Name: cls.name,
            GTypeName: cls.name,
            Extends: parent,
        }, cls);
    }

    var uuid = "bitcoin-markets@ottoallmendinger.github.com";

    const _ = imports.gettext.domain(uuid).gettext;

    var ExtensionUtils = imports.misc.extensionUtils;

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var stringFormat = createCommonjsModule(function (module) {
    void function(global) {

      //  ValueError :: String -> Error
      function ValueError(message) {
        var err = new Error(message);
        err.name = 'ValueError';
        return err;
      }

      //  create :: Object -> String,*... -> String
      function create(transformers) {
        return function(template) {
          var args = Array.prototype.slice.call(arguments, 1);
          var idx = 0;
          var state = 'UNDEFINED';

          return template.replace(
            /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
            function(match, literal, _key, xf) {
              if (literal != null) {
                return literal;
              }
              var key = _key;
              if (key.length > 0) {
                if (state === 'IMPLICIT') {
                  throw ValueError('cannot switch from ' +
                                   'implicit to explicit numbering');
                }
                state = 'EXPLICIT';
              } else {
                if (state === 'EXPLICIT') {
                  throw ValueError('cannot switch from ' +
                                   'explicit to implicit numbering');
                }
                state = 'IMPLICIT';
                key = String(idx);
                idx += 1;
              }

              //  1.  Split the key into a lookup path.
              //  2.  If the first path component is not an index, prepend '0'.
              //  3.  Reduce the lookup path to a single result. If the lookup
              //      succeeds the result is a singleton array containing the
              //      value at the lookup path; otherwise the result is [].
              //  4.  Unwrap the result by reducing with '' as the default value.
              var path = key.split('.');
              var value = (/^\d+$/.test(path[0]) ? path : ['0'].concat(path))
                .reduce(function(maybe, key) {
                  return maybe.reduce(function(_, x) {
                    return x != null && key in Object(x) ?
                      [typeof x[key] === 'function' ? x[key]() : x[key]] :
                      [];
                  }, []);
                }, [args])
                .reduce(function(_, x) { return x; }, '');

              if (xf == null) {
                return value;
              } else if (Object.prototype.hasOwnProperty.call(transformers, xf)) {
                return transformers[xf](value);
              } else {
                throw ValueError('no transformer named "' + xf + '"');
              }
            }
          );
        };
      }

      //  format :: String,*... -> String
      var format = create({});

      //  format.create :: Object -> String,*... -> String
      format.create = create;

      //  format.extend :: Object,Object -> ()
      format.extend = function(prototype, transformers) {
        var $format = create(transformers);
        prototype.format = function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(this);
          return $format.apply(global, args);
        };
      };

      /* istanbul ignore else */
      {
        module.exports = format;
      }

    }.call(commonjsGlobal, commonjsGlobal);
    });

    function tooltipText() {
        const pad = (s, w) => s +
            Array(w - s.length)
                .fill(' ')
                .join('');
        return [
            ['q', _('Quote currency code')],
            ['qs', _('Quote currency symbol')],
            ['b', _('Base currency code')],
            ['bs', _('Base currency symbol')],
            ['btc', _('Bitcoin symbol (₿)')],
            ['v', _('formatted value with defaults')],
            ['mv', _('formatted value with defaults, divided by ') + (0.001).toLocaleString()],
            ['kv', _('formatted value with defaults, multiplied by ') + (1000).toLocaleString()],
            ['satv', _('formatted value with defaults, multiplied by ') + (1e8).toLocaleString()],
            ['(m|k|sat)v0', _('formatted value with 0 decimals')],
            ['(m|k|sat)v1', _('formatted value with 1 decimal')],
            ['(m|k|sat)v2', _('formatted value with 2 decimals')],
            ['...', ''],
            ['(m|k|sat)v8', _('formatted value with 8 decimals')],
            ['raw', _('raw value without additional formatting')],
        ]
            .map(([a, b]) => `<tt>${pad(a, 16)}</tt>${b}`)
            .join('\n');
    }

    const Config = imports.misc.config;
    const Mainloop = imports.mainloop;
    const Metadata = imports.misc.extensionUtils.getCurrentExtension().metadata;
    class HTTPError {
        constructor(soupMessage, _error) {
            this.name = 'HTTPError';
            this.soupMessage = soupMessage;
            this.stack = new Error().stack;
        }
        format(sep = ' ') {
            return [
                'status_code=' + this.soupMessage.status_code,
                'reason_phrase=' + this.soupMessage.reason_phrase,
                'method=' + this.soupMessage.method,
                'uri=' + this.soupMessage.uri.to_string(false /* short */),
            ].join(sep);
        }
        toString() {
            return this.format();
        }
    }
    const STATUS_TOO_MANY_REQUESTS = 429;
    function isErrTooManyRequests(err) {
        return (err &&
            err.soupMessage &&
            err.soupMessage.status_code &&
            Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS);
    }
    function getExtensionVersion() {
        if (Metadata['git-version']) {
            return 'git-' + Metadata['git-version'];
        }
        else if (Metadata['version']) {
            return 'v' + Metadata['version'];
        }
        else {
            return 'unknown';
        }
    }
    function getGnomeVersion() {
        return Config.PACKAGE_VERSION;
    }
    const _repository = 'http://github.com/OttoAllmendinger/' + 'gnome-shell-bitcoin-markets';
    const _userAgent = 'gnome-shell-bitcoin-markets' + '/' + getExtensionVersion() + '/Gnome' + getGnomeVersion() + ' (' + _repository + ')';
    // Some API providers have had issues with high traffic coming from single IPs
    // this code helps determine if these are actually different clients from behind
    // a NAT or if some clients really do many requests
    function getClientId() {
        // GUID code from http://stackoverflow.com/a/2117523/92493
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    const _clientId = getClientId();
    const _timeoutMs = 30000;
    function getSession() {
        const session = new Soup.SessionAsync();
        session['user-agent'] = _userAgent;
        Soup.Session.prototype.add_feature.call(session, new Soup.ProxyResolverDefault());
        return session;
    }
    function getJSON(url, _params) {
        const session = getSession();
        const message = Soup.Message.new('GET', url);
        const headers = message.request_headers;
        headers.append('X-Client-Id', _clientId);
        // log(`> GET ${url}`);
        return Object.assign(new Promise((resolve, reject) => {
            session.queue_message(message, (session, message) => {
                // log(`< GET ${url}: ${message.status_code}`);
                if (message.status_code !== 200) {
                    const err = new HTTPError(message);
                    logError(err);
                    return reject(err);
                }
                if (message.response_body === undefined) {
                    return reject(new Error(`GET ${url}: message.response_body not defined`));
                }
                const { response_body } = message;
                if (!('data' in response_body)) {
                    return reject(new Error(`GET ${url}: response_body.data not defined`));
                }
                const { data } = message.response_body;
                try {
                    return resolve(JSON.parse(data));
                }
                catch (e) {
                    return reject(new Error(`GET ${url}: error parsing as JSON: ${e}; data=${JSON.stringify(data)}`));
                }
            });
            Mainloop.timeout_add(_timeoutMs, () => session.abort());
        }), {
            cancel() {
                session.abort();
            },
        });
    }

    /**
     * Api definitions
     */
    class Api {
        constructor() {
            this.permanentError = null;
            this.lastUpdate = -Infinity;
            this.tickers = [];
            this.pendingRequest = null;
        }
        getLabel({ base, quote }) {
            return `${this.apiName} ${base}/${quote}`;
        }
        fetch(url) {
            return new Promise((resolve, reject) => {
                if (this.permanentError) {
                    return reject(this.permanentError);
                }
                this.pendingRequest = getJSON(url);
                return this.pendingRequest
                    .then((data) => {
                    this.pendingRequest = null;
                    resolve(data);
                })
                    .catch((err) => {
                    this.pendingRequest = null;
                    if (isErrTooManyRequests(err)) {
                        this.permanentError = err;
                    }
                    return reject(err);
                });
                // not supported in Gnome 3.24
                // .finally(() => this.pendingRequest = null);
            });
        }
        _getTickerInstance(ticker) {
            const equalArray = (arr1, arr2) => arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);
            const equalObjects = (obj1, obj2) => {
                const keys1 = Object.keys(obj1).sort();
                const keys2 = Object.keys(obj2).sort();
                return (equalArray(keys1, keys2) &&
                    equalArray(keys1.map((k) => obj1[k]), keys1.map((k) => obj2[k])));
            };
            const match = this.tickers.find((t) => equalObjects(t, ticker));
            if (match) {
                return match;
            }
            this.tickers.push(ticker);
            return ticker;
        }
        getTicker({ base, quote, attribute }) {
            return this._getTickerInstance({ base, quote, attribute });
        }
        parseData(data, ticker) {
            if (ticker.attribute === 'last') {
                return this.getLast(data, ticker);
            }
            throw new Error(`unknown attribute ${ticker.attribute}`);
        }
    }

    class Api$1 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Binance';
            this.apiDocs = [['API Docs', 'https://binance-docs.github.io/apidocs/spot/en/#symbol-price-ticker']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://api.binance.com/api/v3/ticker/price?symbol=${base}${quote}`;
        }
        getLast({ price }) {
            return price;
        }
    }

    class Api$2 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Binance Futures';
            this.apiDocs = [
                [
                    'API Docs',
                    'https://binance-docs.github.io/apidocs/futures/en/' + '#24hr-ticker-price-change-statistics-market_data',
                ],
            ];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${base}${quote}`;
        }
        getLast({ price }) {
            return price;
        }
    }

    class Api$3 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Bitfinex';
            this.apiDocs = [
                ['API Docs', 'https://docs.bitfinex.com/v1/reference#rest-public-ticker'],
                ['Symbols (JSON)', 'https://api.bitfinex.com/v1/symbols'],
            ];
            /* quote https://www.bitfinex.com/posts/188
             *
             * > If an IP address exceeds 90 requests per minute to the REST APIs,
             * > the requesting IP address will be blocked for 10-60 seconds
             */
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            switch (base) {
                case 'DASH':
                    base = 'DSH';
                    break;
                case 'IOTA':
                    base = 'IOT';
                    break;
                case 'QTUM':
                    base = 'QTM';
                    break;
                case 'DATA':
                    base = 'DAT';
                    break;
                case 'QASH':
                    base = 'QSH';
                    break;
            }
            return `https://api.bitfinex.com/v2/ticker/t${base}${quote}/`;
        }
        getLast(data) {
            return data[6];
        }
    }

    class Api$4 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'BitMEX';
            this.apiDocs = [['API Docs', 'https://www.bitmex.com/app/restAPI']];
            // ```
            //   Requests to our REST API are rate limited to 300 requests per 5
            //   minutes.  This counter refills continuously. If you are not logged in,
            //   your ratelimit is 150/5minutes.
            // ```
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            const symbol = `${base}${quote}`.toUpperCase();
            return 'https://www.bitmex.com' + `/api/v1/instrument?symbol=${symbol}&columns=lastPrice`;
        }
        getLast(data, { base, quote }) {
            data = data[0];
            const symbol = `${base}${quote}`.toUpperCase();
            if (data.symbol !== symbol) {
                throw new Error(`expected symbol ${symbol}, get ${data.symbol}`);
            }
            return data.lastPrice;
        }
    }

    class Api$5 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'BitPay';
            this.apiDocs = [['API Docs', 'https://bitpay.com/api']];
            this.interval = 60; // unclear, should be safe
        }
        getUrl({ base }) {
            return `https://bitpay.com/api/rates/${base}`;
        }
        getLast(data, { base: _base, quote }) {
            const result = data.find(({ code }) => code === quote);
            if (!result) {
                throw new Error(`no data for quote ${quote}`);
            }
            return result.rate;
        }
    }

    class Api$6 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Bitso';
            this.apiDocs = [
                ['API Docs', 'https://bitso.com/api_info#http-api-responses'],
                ['Books (JSON)', 'https://api.bitso.com/v3/available_books'],
            ];
            /* quote https://bitso.com/api_info#rate-limits
             *
             * > Rate limits are are based on one minute windows. If you do more than 30
             * > requests in a minute, you get locked out for one minute.
             */
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            return `https://api.bitso.com/v3/ticker?book=${base}_${quote}`.toLowerCase();
        }
        getLast({ payload }) {
            return payload.last;
        }
    }

    class Api$7 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Bitstamp';
            this.apiDocs = [['API Docs', 'https://www.bitstamp.net/api/']];
            // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
            // `` Do not make more than 600 request per 10 minutes or we will ban your
            //  IP address. ''
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            return `https://www.bitstamp.net/api/v2/ticker/${base}${quote}`.toLowerCase();
        }
        getLast(data) {
            return data.last;
        }
    }

    class Api$8 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Blinktrade';
            this.apiDocs = [['API Docs', 'https://blinktrade.com/docs/']];
            this.interval = 30; // unclear, should be safe
        }
        getUrl({ base, quote }) {
            base = base.toUpperCase();
            quote = quote.toUpperCase();
            const host = quote === 'BRL' ? 'bitcambio_api.blinktrade.com' : 'api.blinktrade.com';
            return `https://${host}/api/v1/${quote}/ticker?crypto_currency=${base}`;
        }
        getLast(data) {
            return data.last;
        }
    }

    class Api$9 extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'BTCMarkets';
            this.apiDocs = [
                ['API Docs', 'https://github.com/BTCMarkets/API/wiki/Market-data-API'],
                ['Active Markets (JSON)', 'https://api.btcmarkets.net/v2/market/active'],
            ];
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            return `https://api.btcmarkets.net/market/${base}/${quote}/tick`;
        }
        getLast(data) {
            if (data.success !== false) {
                return data.lastPrice;
            }
            const { errorCode, errorMessage } = data;
            throw new Error(`${errorCode}: ${errorMessage}`);
        }
    }

    class Api$a extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'BX.in.th';
            this.apiDocs = [
                ['API Docs', 'https://bx.in.th/info/api/'],
                ['Pairings (JSON)', 'https://bx.in.th/api/pairing/'],
            ];
            this.interval = 60; // unclear, should be safe
        }
        getUrl(_options) {
            return 'https://bx.in.th/api/';
        }
        getLast(data, { base, quote }) {
            const result = Object.keys(data)
                .map((k) => data[k])
                .find(({ primary_currency, secondary_currency }) => primary_currency === quote && secondary_currency === base);
            if (!result) {
                throw new Error(`could not find pair ${base}/${quote}`);
            }
            return result.last_price;
        }
    }

    class Api$b extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'CEX.IO';
            this.apiDocs = [
                ['API Docs', 'https://cex.io/rest-api#ticker'],
                ['Pairs (JSON)', 'https://cex.io/api/currency_limits'],
            ];
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            return `https://cex.io/api/ticker/${base}/${quote}`;
        }
        getLast({ last, error }) {
            if (error) {
                throw new Error(error);
            }
            return last;
        }
    }

    class Api$c extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Coinbase';
            this.apiDocs = [['API Docs', 'https://developers.coinbase.com/api/v2#exchange-rates']];
            this.interval = 60; // unclear, should be safe
        }
        getUrl({ base }) {
            base = base.toUpperCase();
            return `https://api.coinbase.com/v2/exchange-rates?currency=${base}`;
        }
        getLast(data, { quote }) {
            const { rates } = data.data;
            if (!rates) {
                throw new Error('invalid response');
            }
            quote = quote.toUpperCase();
            if (!(quote in rates)) {
                throw new Error(`no data for quote ${quote}`);
            }
            return rates[quote];
        }
    }

    class Api$d extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'CoinGecko';
            this.apiDocs = [
                ['API Docs', 'https://www.coingecko.com/api/docs/v3#/coins/get_coins_list'],
                ['Coins List (JSON)', 'https://api.coingecko.com/api/v3/coins/list'],
            ];
            // ```
            //   7 Dec 2018= Due to the overwhelming requests we are receiving, we are
            //   updating our api limit from 10/second to 300/minute, that is 13
            //   million requests/month!
            // ```
            this.interval = 10;
        }
        getUrl({ base }) {
            return `https://api.coingecko.com/api/v3/coins/${base}/tickers`.toLowerCase();
        }
        getLast(data, { quote }) {
            if (!data.tickers) {
                throw new Error('no tickers');
            }
            const result = data.tickers.find(({ target }) => target === quote.toUpperCase());
            if (!result) {
                throw new Error(`no quote currency ${quote.toUpperCase()}`);
            }
            return result.last;
        }
    }

    class Api$e extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'CoinMarketCap';
            this.apiDocs = [['API Docs', 'https://coinmarketcap.com/api/documentation/v1/#section/Introduction']];
            //  https://coinmarketcap.com
            //   /api/documentation/v1/#section/Standards-and-Conventions
            //  ```
            //     Free / Trial plans are limited to 10 API calls a minute.
            //  ```
            this.interval = 10;
        }
        getUrl({ base, quote }) {
            return `https://api.coinmarketcap.com/v1/ticker/${base}/?convert=${quote}`.toLowerCase();
        }
        getLast(data, { quote }) {
            data = data[0];
            const key = `price_${quote}`.toLowerCase();
            if (!(key in data)) {
                throw new Error(`could not find quote in ${quote}`);
            }
            return data[key];
        }
    }

    class Api$f extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'CryptoCompare';
            this.apiDocs = [['API Docs', 'https://min-api.cryptocompare.com/documentation']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=${quote}`;
        }
        getLast(data, { quote }) {
            if (!(quote in data)) {
                throw new Error(`no data for quote ${quote}`);
            }
            return data[quote];
        }
    }

    class Api$g extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'FTX exchange';
            this.apiDocs = [['API Docs', 'https://docs.ftx.com/#get-markets']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://ftx.com/api/markets/${base}-${quote}`;
        }
        getLast({ result }) {
            return result.last;
        }
    }

    class Api$h extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'HitBTC';
            this.apiDocs = [['API Docs', 'https://api.hitbtc.com/']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://api.hitbtc.com/api/2/public/ticker/${base}${quote}`;
        }
        getLast({ last }) {
            return last;
        }
    }

    class Api$i extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Huobi';
            this.apiDocs = [['API Docs', 'https://huobiapi.github.io/docs/spot/v1/en/#introduction']];
            // Each API Key can send maximum of 100 https requests within 10 seconds
            // so 15 should be safe.
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return 'https://api.huobi.pro/market/detail/' + `merged?symbol=${base}${quote}`.toLowerCase();
        }
        getLast(data) {
            if (data['status'] === 'error') {
                throw new Error(data['err-msg']);
            }
            return data.tick.bid[0];
        }
    }

    class Api$j extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Kraken';
            this.apiDocs = [
                ['API Docs', 'https://www.kraken.com/help/api#public-market-data'],
                ['Asset Pairs (JSON)', 'https://api.kraken.com/0/public/AssetPairs'],
            ];
            this.interval = 10; // unknown, guessing
        }
        getUrl({ base, quote }) {
            return `https://api.kraken.com/0/public/Ticker?pair=${base}${quote}`;
        }
        getLast({ result, error }, { base, quote }) {
            if (error && error.length) {
                throw new Error(error[0]);
            }
            const pair = `${base}${quote}`;
            if (pair in result) {
                return result[pair].c[0];
            }
            throw new Error(`no data for pair ${pair}`);
        }
    }

    class Api$k extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Kucoin';
            this.apiDocs = [['API Docs', 'https://docs.kucoin.com/']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return 'https://openapi-v2.kucoin.com/api/v1/market/orderbook/' + `level1?symbol=${base}-${quote}`;
        }
        getLast({ code, msg, data }) {
            if (code != 200000) {
                throw new Error(msg);
            }
            return data.price;
        }
    }

    class Api$l extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Paymium';
            this.apiDocs = [['API Docs', 'https://github.com/Paymium/api-documentation#ticker']];
            this.interval = 60; // unclear, should be safe
        }
        getUrl({ base: _base, quote }) {
            if (quote === 'BTC') {
                // returns some garbage
                throw new Error(`invalid quote ${quote}`);
            }
            return `https://paymium.com/api/v1/data/${quote}/ticker`.toLowerCase();
        }
        getLast({ price }, { base }) {
            if (base !== 'BTC') {
                throw new Error(`invalid base ${base}`);
            }
            return price;
        }
    }

    class Api$m extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'Satang.pro';
            this.apiDocs = [['API Docs', 'https://docs.satang.pro/apis/public/orders']];
            this.interval = 60; // unclear, should be safe
        }
        getUrl({ base, quote }) {
            return 'https://api.tdax.com/api/orders/?pair=' + `${base}_${quote}`.toLowerCase();
        }
        getLast(data) {
            const bidding = parseFloat(data.bid[0].price);
            const asking = parseFloat(data.ask[0].price);
            return (asking - bidding) * 0.5 + bidding;
        }
    }

    class Api$n extends Api {
        constructor() {
            super(...arguments);
            this.apiName = 'VccExchange(Vietnam)';
            this.apiDocs = [['API Docs', 'https://vcc.exchange/api']];
            this.interval = 15;
        }
        getUrl({ base, quote }) {
            return `https://api.vcc.exchange/v3/trades/${base}_${quote}`;
        }
        getLast({ message, data }) {
            if (message != null) {
                throw new Error(message);
            }
            return data[0].price;
        }
    }

    const Mainloop$1 = imports.mainloop;
    const Providers = {
        binance: new Api$1(),
        binanceFutures: new Api$2(),
        bitfinex: new Api$3(),
        bitmex: new Api$4(),
        bitpay: new Api$5(),
        bitso: new Api$6(),
        bitstamp: new Api$7(),
        blinktrade: new Api$8(),
        btcmarkets: new Api$9(),
        bxinth: new Api$a(),
        cexio: new Api$b(),
        coinbase: new Api$c(),
        coingecko: new Api$d(),
        coinmarketcap: new Api$e(),
        cryptocompare: new Api$f(),
        ftx: new Api$g(),
        hitbtc: new Api$h(),
        huobi: new Api$i(),
        kraken: new Api$j(),
        kucoin: new Api$k(),
        paymium: new Api$l(),
        poloniex: new Api$5(),
        satangpro: new Api$m(),
        vccexchange: new Api$n(),
    };
    function getProvider(name) {
        if (name in Providers) {
            return Providers[name];
        }
        else {
            throw new Error(`unknown api ${name}`);
        }
    }
    const filterSubscribers = (subscribers, { provider, url, ticker, }) => subscribers.filter((s) => {
        const { options } = s;
        if (provider !== undefined && getProvider(options.api) !== provider) {
            return false;
        }
        if (url !== undefined && getSubscriberUrl(s) !== url) {
            return false;
        }
        if (ticker !== undefined) {
            if (ticker !== getProvider(options.api).getTicker(s.options)) {
                return false;
            }
        }
        return true;
    });
    const applySubscribers = (subscribers, func) => subscribers.forEach((s) => {
        try {
            func(s);
        }
        catch (e) {
            try {
                const { api, base, quote } = s.options;
                s.onUpdateError(e);
                e.message = `Error with subscriber ${api} ${base}${quote}: ${e.message}`;
                logError(e);
            }
            catch (e) {
                logError(e);
            }
        }
    });
    class PriceData {
        constructor() {
            this.map = new Map();
            this.maxHistory = 10;
        }
        get(ticker) {
            return (this.map.has(ticker) ? this.map : this.map.set(ticker, { values: new Map(), status: undefined })).get(ticker);
        }
        addValue(ticker, date, value) {
            if (isNaN(value)) {
                throw new Error(`invalid price value ${value}`);
            }
            const { values } = this.get(ticker);
            values.set(date, value);
            const keys = [...values.keys()].sort((a, b) => b - a);
            keys.splice(this.maxHistory).forEach((k) => values.delete(k));
            return keys.map((k) => ({ date: k, value: values.get(k) }));
        }
    }
    const getSubscriberUrl = ({ options }) => getProvider(options.api).getUrl(options);
    const getSubscriberTicker = ({ options }) => getProvider(options.api).getTicker(options);
    class PollLoop {
        constructor(provider) {
            this.cache = new Map();
            this.priceData = new PriceData();
            this.signal = null;
            this.subscribers = [];
            this.urls = [];
            const interval = Number(provider.interval);
            if (isNaN(interval) || interval < 5) {
                throw new Error(`invalid interval for ${provider}: ${provider.interval}`);
            }
            this.interval = interval;
            this.provider = provider;
        }
        start() {
            if (this.signal === null) {
                this.signal = Mainloop$1.idle_add(this.run.bind(this));
                return true;
            }
        }
        stop() {
            if (this.signal !== null) {
                Mainloop$1.source_remove(this.signal);
                this.signal = null;
            }
        }
        run() {
            try {
                this.update();
            }
            catch (e) {
                logError(e);
            }
            this.signal = Mainloop$1.timeout_add_seconds(this.interval, this.run.bind(this));
        }
        setSubscribers(subscribers) {
            this.subscribers = filterSubscribers(subscribers, { provider: this.provider });
            if (this.subscribers.length === 0) {
                this.cache.clear();
                return this.stop();
            }
            this.urls = [...new Set(this.subscribers.map(getSubscriberUrl))];
            if (this.start()) {
                return;
            }
            this.urls.forEach((url) => this.updateUrl(url, this.cache.get(url)));
        }
        updateUrl(url, cache) {
            const getUrlSubscribers = () => filterSubscribers(this.subscribers, { url });
            const tickers = new Set(getUrlSubscribers().map(getSubscriberTicker));
            const processResponse = (response, date) => {
                tickers.forEach((ticker) => {
                    const tickerSubscribers = filterSubscribers(getUrlSubscribers(), { ticker });
                    try {
                        const priceData = this.priceData.addValue(ticker, date, this.provider.parseData(response, ticker));
                        applySubscribers(tickerSubscribers, (s) => s.onUpdatePriceData(priceData));
                    }
                    catch (e) {
                        e.message = `Error updating ${url}: ${e.message}`;
                        applySubscribers(tickerSubscribers, (s) => s.onUpdateError(e, { ticker }));
                        logError(e);
                    }
                });
            };
            if (cache) {
                return processResponse(cache.response, cache.date);
            }
            applySubscribers(getUrlSubscribers(), (s) => s.onUpdateStart());
            this.provider
                .fetch(url)
                .then((response) => {
                const date = new Date();
                this.cache.set(url, { date, response });
                processResponse(response, date);
            })
                .catch((e) => {
                logError(e);
                applySubscribers(getUrlSubscribers(), (s) => s.onUpdateError(e));
                this.cache.delete(url);
            });
        }
        update() {
            const lastUpdate = (url) => (this.cache.has(url) ? this.cache.get(url).date : undefined);
            const updateUrls = this.urls.filter((url) => lastUpdate(url) === undefined);
            const oldestUrl = this.urls
                .filter((url) => lastUpdate(url) !== undefined)
                .sort((a, b) => lastUpdate(a) - lastUpdate(b))[0];
            if (oldestUrl) {
                updateUrls.push(oldestUrl);
            }
            updateUrls.forEach((url) => this.updateUrl(url));
        }
    }
    const _pollLoops = new Map(Object.keys(Providers).map((k) => [k, new PollLoop(Providers[k])]));

    const Signals = imports.signals;
    const Mainloop$2 = imports.mainloop;
    function makeConfigRow(description, widget) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_bottom: 8,
            hexpand: true,
            vexpand: false,
        });
        const label = new Gtk.Label({
            label: description,
            xalign: 0,
            expand: true,
        });
        box.add(label);
        box.add(widget);
        return box;
    }
    function debounce(milliseconds, func) {
        let tag = null;
        return () => {
            if (tag !== null) {
                Mainloop$2.source_remove(tag);
            }
            tag = Mainloop$2.timeout_add(milliseconds, () => {
                func();
                tag = null;
            });
        };
    }
    class ComboBoxView {
        constructor(options) {
            this.Columns = { LABEL: 0, VALUE: 1 };
            const model = new Gtk.ListStore();
            model.set_column_types([GObject.TYPE_STRING]);
            const comboBox = new Gtk.ComboBox({ model });
            const renderer = new Gtk.CellRendererText();
            comboBox.pack_start(renderer, true);
            comboBox.add_attribute(renderer, 'text', 0);
            this.widget = comboBox;
            this.model = model;
            this.setOptions(options);
            comboBox.connect('changed', (_entry) => {
                const i = comboBox.get_active();
                if (!this._options) {
                    throw new Error();
                }
                if (i in this._options) {
                    this.emit('changed', this._options[i].value);
                }
            });
        }
        setOptions(options) {
            this.model.clear();
            this._options = options || [];
            this._options.forEach((o) => {
                let iter;
                this.model.set((iter = this.model.append()), [this.Columns.LABEL], [o.label]);
                if (o.active) {
                    this.widget.set_active_iter(iter);
                }
            });
        }
    }
    Signals.addSignalMethods(ComboBoxView.prototype);
    class BaseProviderConfigView {
        constructor(api, configWidget, indicatorConfig) {
            this._api = api;
            this._provider = getProvider(api);
            this._configWidget = configWidget;
            this._indicatorConfig = indicatorConfig;
            this._widgets = [];
            this._setDefaults(indicatorConfig);
            this._setApiDefaults(indicatorConfig);
            this._initWidgets();
        }
        _initWidgets() {
            this._addBaseEntry();
            this._addQuoteEntry();
            this._addHelp();
        }
        _setDefaults(config) {
            config.set('show_change', config.get('show_change') !== false);
        }
        _setApiDefaults(config) {
            if (config.get('api') !== this._api) {
                config.set('api', this._api);
            }
        }
        _addConfigWidget(w) {
            this._configWidget.add(w);
            this._widgets.push(w);
        }
        _addRow(label, widget) {
            const rowWidget = makeConfigRow(label, widget);
            this._addConfigWidget(rowWidget);
            return rowWidget;
        }
        _addBaseEntry() {
            return this._addSymbolEntry(_('Base'), 'base', 'BTC');
        }
        _addQuoteEntry() {
            return this._addSymbolEntry(_('Quote'), 'quote', 'USD');
        }
        _addSymbolEntry(label, key, defaultValue) {
            const entry = new Gtk.Entry({
                text: this._indicatorConfig.get(key) || defaultValue,
            });
            entry.connect('changed', debounce(500, () => {
                if (entry.text.length < 2) {
                    return;
                }
                this._indicatorConfig.set(key, entry.text.toUpperCase());
            }));
            const rowWidget = this._addRow(label, entry);
            return { rowWidget, entry };
        }
        _addHelp() {
            const { apiDocs } = this._provider;
            if (!apiDocs) {
                return logError(new Error(`no apiDocs for ${this._api}`));
            }
            const helpText = apiDocs.map(([label, url]) => `<a href="${url}">${label}</a>`).join(', ');
            this._addRow(_('Help'), new Gtk.Label({
                label: helpText,
                use_markup: true,
            }));
            /*
            apiDocs.forEach(([label, url]) => {
              this._addConfigWidget(
                new Gtk.Label({
                  label: `<a href="${url}">${label}</a>`,
                  use_markup: true,
                  margin_bottom: 8
                })
              );
            });
            */
        }
        destroy() {
            this._widgets.forEach((widget) => this._configWidget.remove(widget));
            this._widgets.slice(0);
            this._configWidget.show_all();
        }
    }

    var BaseProviderConfigView$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        makeConfigRow: makeConfigRow,
        ComboBoxView: ComboBoxView,
        BaseProviderConfigView: BaseProviderConfigView
    });

    const Signals$1 = imports.signals;
    const INDICATORS_KEY = 'indicators';
    const Defaults = {
        api: 'bitstamp',
        base: 'BTC',
        quote: 'USD',
        attribute: 'last',
        show_change: true,
        format: '{v} {qs}',
    };
    class ConfigModel {
        constructor(attributes) {
            this.attributes = attributes;
        }
        set(key, value) {
            this.attributes[key] = value;
            this.emit('update', key, value);
        }
        get(key) {
            if (key in this.attributes) {
                return this.attributes[key];
            }
            return Defaults[key];
        }
        toString() {
            return JSON.stringify(this.attributes);
        }
        destroy() {
            this.disconnectAll();
        }
    }
    Signals$1.addSignalMethods(ConfigModel.prototype);
    const IndicatorCollectionModel = extendGObject(class IndicatorCollectionModel extends Gtk.ListStore {
        constructor() {
            super(...arguments);
            this.Columns = {};
        }
        _init(params) {
            super._init(params);
            this.Columns = {
                LABEL: 0,
                CONFIG: 1,
            };
            this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
            this._settings = ExtensionUtils.getSettings();
            this._reloadFromSettings();
            let flag;
            const mutex = (func) => function (...args) {
                if (!flag) {
                    flag = true;
                    func(...args);
                    flag = false;
                }
            };
            this.connect('row-changed', mutex(this._onRowChanged.bind(this)));
            this.connect('row-inserted', mutex(this._onRowInserted.bind(this)));
            this.connect('row-deleted', mutex(this._onRowDeleted.bind(this)));
        }
        getConfig(iter) {
            const json = this.get_value(iter, this.Columns.CONFIG);
            if (!json) {
                throw new Error('getConfig() failed for iter=' + iter);
            }
            const config = new ConfigModel(JSON.parse(json));
            config.connect('update', () => {
                this.set(iter, [this.Columns.CONFIG], [config.toString()]);
            });
            return config;
        }
        _getLabel(config) {
            try {
                return getProvider(config.api).getLabel(config);
            }
            catch (e) {
                logError(e);
                return `[unsupported: ${config.api}]`;
            }
        }
        _reloadFromSettings() {
            this.clear();
            const configs = this._settings.get_strv(INDICATORS_KEY);
            Object.keys(configs).forEach((key) => {
                const json = configs[key];
                try {
                    const label = this._getLabel(JSON.parse(json));
                    this.set(this.append(), [this.Columns.LABEL, this.Columns.CONFIG], [label, json]);
                }
                catch (e) {
                    log('error loading indicator config');
                    logError(e);
                }
            });
        }
        _writeSettings() {
            // eslint-disable-next-line
            let [res, iter] = this.get_iter_first();
            const configs = [];
            while (res) {
                configs.push(this.get_value(iter, this.Columns.CONFIG));
                res = this.iter_next(iter);
            }
            this._settings.set_strv(INDICATORS_KEY, configs);
        }
        _onRowChanged(self, path, iter) {
            const config = this.get_value(iter, this.Columns.CONFIG);
            this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [this._getLabel(JSON.parse(config)), config]);
            this._writeSettings();
        }
        _onRowInserted(self, path, iter) {
            this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [this._getLabel(Defaults), JSON.stringify(Defaults)]);
            this._writeSettings();
        }
        _onRowDeleted(_self, _path, _iter) {
            this._writeSettings();
        }
    }, Gtk.ListStore);

    const Signals$2 = imports.signals;
    const { ComboBoxView: ComboBoxView$1, makeConfigRow: makeConfigRow$1 } = BaseProviderConfigView$1;
    class IndicatorConfigView {
        constructor(indicatorConfig) {
            const padding = 8;
            this._indicatorConfig = indicatorConfig;
            this.widget = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
            });
            {
                const frame = new Gtk.Frame({
                    label: _('Indicator Settings'),
                    margin_bottom: 8,
                });
                this._layoutIndicatorSettings = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    border_width: padding,
                });
                frame.add(this._layoutIndicatorSettings);
                this.widget.add(frame);
            }
            {
                const frame = new Gtk.Frame({ label: _('Provider Settings') });
                this._layoutProviderSettings = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    border_width: padding,
                });
                frame.add(this._layoutProviderSettings);
                this.widget.add(frame);
            }
            this._addIndicatorSettings();
            this._selectApi(indicatorConfig.get('api'));
            this.widget.show_all();
        }
        _addIndicatorSettings() {
            const layout = this._layoutIndicatorSettings;
            layout.add(this._confFormat());
            layout.add(this._confShowChange());
            layout.add(this._confProvider());
        }
        _selectApi(api) {
            const widget = this._layoutProviderSettings;
            const config = this._indicatorConfig;
            if (this._apiConfigView) {
                this._apiConfigView.destroy();
                this._apiConfigView = undefined;
            }
            try {
                this._apiConfigView = new BaseProviderConfigView(api, widget, config);
            }
            catch (e) {
                e.message = `Error creating configView for api ${api}: ${e.message}`;
                logError(e);
            }
            widget.show_all();
        }
        _confFormat() {
            const format = this._indicatorConfig.get('format');
            const entry = new Gtk.Entry({
                text: format,
                tooltip_markup: tooltipText(),
            });
            entry.connect('changed', () => {
                this._indicatorConfig.set('format', entry.text);
            });
            return makeConfigRow$1(_('Format'), entry);
        }
        _confProvider() {
            const preset = this._indicatorConfig.get('api');
            const options = Object.keys(Providers).map((name) => ({
                value: name,
                label: getProvider(name).apiName,
                active: false,
            }));
            options.forEach((o) => {
                if (o.value === preset) {
                    o.active = true;
                }
            });
            const view = new ComboBoxView$1(options);
            view.connect('changed', (view, api) => this._selectApi(api));
            return makeConfigRow$1(_('Provider'), view.widget);
        }
        _confShowChange() {
            const preset = this._indicatorConfig.get('show_change') !== false;
            const switchView = new Gtk.Switch({ active: preset });
            switchView.connect('notify::active', (obj) => {
                this._indicatorConfig.set('show_change', obj.active);
            });
            return makeConfigRow$1(_('Show Change'), switchView);
        }
        _confShowBaseCurrency() {
            const preset = this._indicatorConfig.get('show_base_currency') === true;
            const switchView = new Gtk.Switch({ active: preset });
            switchView.connect('notify::active', (obj) => {
                this._indicatorConfig.set('show_base_currency', obj.active);
            });
            return makeConfigRow$1(_('Show Base Currency'), switchView);
        }
        destroy() {
            this.disconnectAll();
            this.widget.destroy();
        }
    }
    Signals$2.addSignalMethods(IndicatorConfigView.prototype);
    const BitcoinMarketsSettingsWidget = extendGObject(class BitcoinMarketsSettingsWidget extends Gtk.Box {
        _init() {
            super._init({
                orientation: Gtk.Orientation.HORIZONTAL,
            });
            this._store = new IndicatorCollectionModel();
            /* sidebar (left) */
            const sidebar = new Gtk.Box({
                margin: 10,
                orientation: Gtk.Orientation.VERTICAL,
                width_request: 240,
            });
            sidebar.add(this._getTreeView());
            sidebar.add(this._getToolbar());
            this.add(sidebar);
            /* config (right) */
            this._configLayout = new Gtk.Box({
                margin: 10,
                orientation: Gtk.Orientation.HORIZONTAL,
                expand: true,
            });
            this.add(this._configLayout);
            /* behavior */
            this._selection = this._treeView.get_selection();
            this._selection.connect('changed', this._onSelectionChanged.bind(this));
        }
        _getTreeView() {
            this._treeView = new Gtk.TreeView({
                model: this._store,
                headers_visible: false,
                reorderable: true,
                hexpand: false,
                vexpand: true,
            });
            const label = new Gtk.TreeViewColumn({ title: 'Label' });
            const renderer = new Gtk.CellRendererText();
            label.pack_start(renderer, true);
            label.add_attribute(renderer, 'text', 0);
            this._treeView.insert_column(label, 0);
            return this._treeView;
        }
        _getToolbar() {
            const toolbar = (this._toolbar = new Gtk.Toolbar({
                icon_size: 1,
            }));
            toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
            /* new widget button with menu */
            const newButton = new Gtk.ToolButton({ icon_name: 'list-add-symbolic' });
            newButton.connect('clicked', this._addClicked.bind(this));
            toolbar.add(newButton);
            /* delete button */
            const delButton = (this._delButton = new Gtk.ToolButton({ icon_name: 'list-remove-symbolic' }));
            delButton.connect('clicked', this._delClicked.bind(this));
            toolbar.add(delButton);
            this._updateToolbar();
            return toolbar;
        }
        _onSelectionChanged() {
            const [isSelected, , iter] = this._selection.get_selected();
            if (isSelected) {
                this._showIndicatorConfig(this._store.getConfig(iter));
            }
            else {
                this._showIndicatorConfig(null);
            }
            this._updateToolbar();
        }
        _showIndicatorConfig(indicatorConfig) {
            if (this._indicatorConfigView) {
                this._configLayout.remove(this._indicatorConfigView.widget);
                this._indicatorConfigView.destroy();
                this._indicatorConfigView = null;
            }
            if (indicatorConfig === null) {
                return;
            }
            this._indicatorConfigView = new IndicatorConfigView(indicatorConfig);
            this._configLayout.add(this._indicatorConfigView.widget);
        }
        _updateToolbar() {
            let sensitive = false;
            if (this._selection) {
                const [isSelected] = this._selection.get_selected();
                sensitive = isSelected;
            }
            this._delButton.set_sensitive(sensitive);
        }
        _addClicked() {
            this._store.append();
            this._updateToolbar();
        }
        _delClicked() {
            const [isSelected, , iter] = this._selection.get_selected();
            if (!iter) {
                throw new Error();
            }
            if (isSelected) {
                this._store.remove(iter);
            }
            this._updateToolbar();
        }
    }, Gtk.Box);
    var prefs = {
        init() {
            ExtensionUtils.initTranslations();
        },
        buildPrefsWidget() {
            const widget = new BitcoinMarketsSettingsWidget();
            widget.show_all();
            return widget;
        },
    };

    return prefs;

}(imports.gi.Gtk, imports.gi.GObject, imports.gi.Gio, imports.gi.Soup));

var init = prefs.init;
var buildPrefsWidget = prefs.buildPrefsWidget;
