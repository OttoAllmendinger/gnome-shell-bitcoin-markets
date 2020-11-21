var init = (function (St, Clutter, GLib, Gio, Shell, GObject, Soup, Gtk) {
    'use strict';

    var ExtensionUtils = imports.misc.extensionUtils;

    const versionArray = (v) => v.split('.').map(Number);
    const zip = function (a, b, defaultValue) {
        if (a.length === 0 && b.length === 0) {
            return [];
        }
        const headA = a.length > 0 ? a.shift() : defaultValue;
        const headB = b.length > 0 ? b.shift() : defaultValue;
        return [[headA, headB]].concat(zip(a, b, defaultValue));
    };
    function versionEqual(a, b) {
        return zip(versionArray(a), versionArray(b), 0).reduce((prev, [a, b]) => prev && a === b, true);
    }
    function versionGreater(a, b) {
        const diff = zip(versionArray(a), versionArray(b), 0).find(([a, b]) => a !== b);
        if (!diff) {
            return false;
        }
        const [x, y] = diff;
        return x > y;
    }
    function versionSmaller(a, b) {
        return !versionEqual(a, b) && !versionGreater(a, b);
    }
    function currentVersion() {
        return new Version(imports.misc.config.PACKAGE_VERSION);
    }
    class Version {
        constructor(packageVersion) {
            this.packageVersion = packageVersion;
        }
        equal(v) {
            return versionEqual(this.packageVersion, v);
        }
        greater(v) {
            return versionGreater(this.packageVersion, v);
        }
        smaller(v) {
            return versionSmaller(this.packageVersion, v);
        }
        greaterEqual(v) {
            return this.equal(v) || this.greater(v);
        }
        smallerEqual(v) {
            return this.equal(v) || this.smaller(v);
        }
    }
    if (window['ARGV'] && ARGV[0] == 'test') {
        log('zip("1.2.3", "1.2")=' + JSON.stringify(zip(versionArray('1.2.3'), versionArray('1.2'))));
        log('versionEqual("1.2.3", "1.2")=' + versionEqual('1.2.3', '1.2'));
        [
            ['1', '1', false],
            ['1', '1.0', false],
            ['1', '1.0.0', false],
            ['1.0', '1.0', false],
            ['1.2', '2.1', false],
            ['1.2.3', '2.1', false],
            ['2.1', '1.2', true],
            ['2.1.1', '1.2', true],
            ['1.2.1', '1.2.0', true],
            ['1.2.1', '1.2', true],
            ['1.2', '1.2.0', false],
            ['1.2', '1.2.1', false],
            ['3.32.2', '3.32', true],
            ['3.32', '3.32.2', false],
        ].forEach(([a, b, expected]) => {
            const actual = versionGreater(a, b);
            if (expected !== actual) {
                log(`ERROR: versionGreater("${a}", "${b}") is ${actual}, ` + `expected ${expected}`);
            }
        });
    }

    /**
     * This works for < 3.36
     */
    function openPrefsAppSystem(uuid, params = {}) {
        const shell = params.shell;
        if (!shell) {
            throw new Error('must provide shell');
        }
        const appSys = shell.AppSystem.get_default();
        const appId = 'gnome-shell-extension-prefs.desktop';
        const prefs = appSys.lookup_app(appId);
        if (!prefs) {
            logError(new Error('could not find prefs app'));
            return;
        }
        if (prefs.get_state() == Shell.AppState.RUNNING) {
            prefs.activate();
        }
        else {
            prefs.get_app_info().launch_uris(['extension:///' + uuid], null);
        }
    }
    /**
     * Works for >= 3.36, maybe earlier
     */
    function openPrefsUtilSpawn(uuid) {
        const Util = imports.misc.util;
        Util.spawn(['gnome-extensions', 'prefs', uuid]);
    }
    function openPrefs(version, uuid, params = {}) {
        if (version.greaterEqual('3.36')) {
            return openPrefsUtilSpawn(uuid);
        }
        return openPrefsAppSystem(uuid, params);
    }
    if ('ARGV' in window) {
        if ('0' in window.ARGV) {
            openPrefsAppSystem(window.ARGV[0]);
        }
    }

    var uuid = "bitcoin-markets@ottoallmendinger.github.com";

    const _ = imports.gettext.domain(uuid).gettext;

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
    const setSubscribers = (subscribers) => {
        subscribers = subscribers.filter(({ options }) => {
            if (options.api in Providers) {
                return true;
            }
            logError(new Error(`invalid provider ${options.api}`));
            return false;
        });
        _pollLoops.forEach((loop) => loop.setSubscribers(subscribers));
    };

    const CurrencyData = {
        AED: {
            symbol: 'AED',
            symbol_native: 'د.إ.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'AED',
        },
        AFN: {
            symbol: 'AFN',
            symbol_native: '؋',
            decimal_digits: 0,
            rounding: 0,
            code: 'AFN',
        },
        ALL: {
            symbol: 'ALL',
            symbol_native: 'Lek',
            decimal_digits: 0,
            rounding: 0,
            code: 'ALL',
        },
        AMD: {
            symbol: 'AMD',
            symbol_native: 'դր.',
            decimal_digits: 0,
            rounding: 0,
            code: 'AMD',
        },
        AOA: {
            symbol: 'AOA',
            symbol_native: 'Kz',
            decimal_digits: 2,
            rounding: 0,
            code: 'AOA',
        },
        ARS: {
            symbol: 'ARS',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'ARS',
        },
        AUD: {
            symbol: 'AU$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'AUD',
        },
        AWG: {
            symbol: 'AWG',
            symbol_native: 'Afl.',
            decimal_digits: 2,
            rounding: 0,
            code: 'AWG',
        },
        AZN: {
            symbol: 'AZN',
            symbol_native: 'ман.',
            decimal_digits: 2,
            rounding: 0,
            code: 'AZN',
        },
        BAM: {
            symbol: 'BAM',
            symbol_native: 'KM',
            decimal_digits: 2,
            rounding: 0,
            code: 'BAM',
        },
        BBD: {
            symbol: 'BBD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'BBD',
        },
        BDT: {
            symbol: 'BDT',
            symbol_native: '৳',
            decimal_digits: 2,
            rounding: 0,
            code: 'BDT',
        },
        BGN: {
            symbol: 'BGN',
            symbol_native: 'лв.',
            decimal_digits: 2,
            rounding: 0,
            code: 'BGN',
        },
        BHD: {
            symbol: 'BHD',
            symbol_native: 'د.ب.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'BHD',
        },
        BIF: {
            symbol: 'BIF',
            symbol_native: 'FBu',
            decimal_digits: 0,
            rounding: 0,
            code: 'BIF',
        },
        BMD: {
            symbol: 'BMD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'BMD',
        },
        BND: {
            symbol: 'BND',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'BND',
        },
        BOB: {
            symbol: 'BOB',
            symbol_native: 'Bs',
            decimal_digits: 2,
            rounding: 0,
            code: 'BOB',
        },
        BRL: {
            symbol: 'R$',
            symbol_native: 'R$',
            decimal_digits: 2,
            rounding: 0,
            code: 'BRL',
        },
        BTC: {
            symbol: 'BTC',
            symbol_native: 'BTC',
            decimal_digits: 2,
            rounding: 0,
            code: 'BTC',
        },
        BWP: {
            symbol: 'BWP',
            symbol_native: 'P',
            decimal_digits: 2,
            rounding: 0,
            code: 'BWP',
        },
        BYR: {
            symbol: 'BYR',
            symbol_native: 'BYR',
            decimal_digits: 0,
            rounding: 0,
            code: 'BYR',
        },
        BZD: {
            symbol: 'BZD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'BZD',
        },
        CAD: {
            symbol: 'CA$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'CAD',
        },
        CDF: {
            symbol: 'CDF',
            symbol_native: 'FrCD',
            decimal_digits: 2,
            rounding: 0,
            code: 'CDF',
        },
        CHF: {
            symbol: 'CHF',
            symbol_native: 'CHF',
            decimal_digits: 2,
            rounding: 0.05,
            code: 'CHF',
        },
        CLP: {
            symbol: 'CLP',
            symbol_native: '$',
            decimal_digits: 0,
            rounding: 0,
            code: 'CLP',
        },
        CNY: {
            symbol: 'CN¥',
            symbol_native: 'CN¥',
            decimal_digits: 2,
            rounding: 0,
            code: 'CNY',
        },
        COP: {
            symbol: 'COP',
            symbol_native: '$',
            decimal_digits: 0,
            rounding: 0,
            code: 'COP',
        },
        CRC: {
            symbol: 'CRC',
            symbol_native: '₡',
            decimal_digits: 0,
            rounding: 0,
            code: 'CRC',
        },
        CVE: {
            symbol: 'CVE',
            symbol_native: 'CVE',
            decimal_digits: 2,
            rounding: 0,
            code: 'CVE',
        },
        CZK: {
            symbol: 'CZK',
            symbol_native: 'Kč',
            decimal_digits: 2,
            rounding: 0,
            code: 'CZK',
        },
        DJF: {
            symbol: 'DJF',
            symbol_native: 'Fdj',
            decimal_digits: 0,
            rounding: 0,
            code: 'DJF',
        },
        DKK: {
            symbol: 'DKK',
            symbol_native: 'kr',
            decimal_digits: 2,
            rounding: 0,
            code: 'DKK',
        },
        DOP: {
            symbol: 'DOP',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'DOP',
        },
        DZD: {
            symbol: 'DZD',
            symbol_native: 'د.ج.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'DZD',
        },
        EGP: {
            symbol: 'EGP',
            symbol_native: 'ج.م.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'EGP',
        },
        ERN: {
            symbol: 'ERN',
            symbol_native: 'Nfk',
            decimal_digits: 2,
            rounding: 0,
            code: 'ERN',
        },
        ETB: {
            symbol: 'ETB',
            symbol_native: 'ብር',
            decimal_digits: 2,
            rounding: 0,
            code: 'ETB',
        },
        EUR: {
            symbol: '€',
            symbol_native: '€',
            decimal_digits: 2,
            rounding: 0,
            code: 'EUR',
        },
        GBP: {
            symbol: '£',
            symbol_native: '£',
            decimal_digits: 2,
            rounding: 0,
            code: 'GBP',
        },
        GEL: {
            symbol: 'GEL',
            symbol_native: 'GEL',
            decimal_digits: 2,
            rounding: 0,
            code: 'GEL',
        },
        GHS: {
            symbol: 'GHS',
            symbol_native: 'GHS',
            decimal_digits: 2,
            rounding: 0,
            code: 'GHS',
        },
        GNF: {
            symbol: 'GNF',
            symbol_native: 'FG',
            decimal_digits: 0,
            rounding: 0,
            code: 'GNF',
        },
        GTQ: {
            symbol: 'GTQ',
            symbol_native: 'Q',
            decimal_digits: 2,
            rounding: 0,
            code: 'GTQ',
        },
        GYD: {
            symbol: 'GYD',
            symbol_native: 'GYD',
            decimal_digits: 0,
            rounding: 0,
            code: 'GYD',
        },
        HKD: {
            symbol: 'HK$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'HKD',
        },
        HNL: {
            symbol: 'HNL',
            symbol_native: 'L',
            decimal_digits: 2,
            rounding: 0,
            code: 'HNL',
        },
        HRK: {
            symbol: 'HRK',
            symbol_native: 'kn',
            decimal_digits: 2,
            rounding: 0,
            code: 'HRK',
        },
        HUF: {
            symbol: 'HUF',
            symbol_native: 'Ft',
            decimal_digits: 0,
            rounding: 0,
            code: 'HUF',
        },
        IDR: {
            symbol: 'IDR',
            symbol_native: 'Rp',
            decimal_digits: 0,
            rounding: 0,
            code: 'IDR',
        },
        ILS: {
            symbol: '₪',
            symbol_native: '₪',
            decimal_digits: 2,
            rounding: 0,
            code: 'ILS',
        },
        INR: {
            symbol: '₹',
            symbol_native: '₹',
            decimal_digits: 2,
            rounding: 0,
            code: 'INR',
        },
        IQD: {
            symbol: 'IQD',
            symbol_native: 'د.ع.‏',
            decimal_digits: 0,
            rounding: 0,
            code: 'IQD',
        },
        IRR: {
            symbol: 'IRR',
            symbol_native: '﷼',
            decimal_digits: 0,
            rounding: 0,
            code: 'IRR',
        },
        ISK: {
            symbol: 'ISK',
            symbol_native: 'kr',
            decimal_digits: 0,
            rounding: 0,
            code: 'ISK',
        },
        JMD: {
            symbol: 'JMD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'JMD',
        },
        JOD: {
            symbol: 'JOD',
            symbol_native: 'د.أ.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'JOD',
        },
        JPY: {
            symbol: '¥',
            symbol_native: '￥',
            decimal_digits: 0,
            rounding: 0,
            code: 'JPY',
        },
        KES: {
            symbol: 'KES',
            symbol_native: 'Ksh',
            decimal_digits: 2,
            rounding: 0,
            code: 'KES',
        },
        KHR: {
            symbol: 'KHR',
            symbol_native: '៛',
            decimal_digits: 2,
            rounding: 0,
            code: 'KHR',
        },
        KMF: {
            symbol: 'KMF',
            symbol_native: 'CF',
            decimal_digits: 0,
            rounding: 0,
            code: 'KMF',
        },
        KRW: {
            symbol: '₩',
            symbol_native: '₩',
            decimal_digits: 0,
            rounding: 0,
            code: 'KRW',
        },
        KWD: {
            symbol: 'KWD',
            symbol_native: 'د.ك.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'KWD',
        },
        KZT: {
            symbol: 'KZT',
            symbol_native: '₸',
            decimal_digits: 2,
            rounding: 0,
            code: 'KZT',
        },
        LBP: {
            symbol: 'LBP',
            symbol_native: 'ل.ل.‏',
            decimal_digits: 0,
            rounding: 0,
            code: 'LBP',
        },
        LKR: {
            symbol: 'LKR',
            symbol_native: 'රු.',
            decimal_digits: 2,
            rounding: 0,
            code: 'LKR',
        },
        LRD: {
            symbol: 'LRD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'LRD',
        },
        LTL: {
            symbol: 'LTL',
            symbol_native: 'Lt',
            decimal_digits: 2,
            rounding: 0,
            code: 'LTL',
        },
        LVL: {
            symbol: 'LVL',
            symbol_native: 'Ls',
            decimal_digits: 2,
            rounding: 0,
            code: 'LVL',
        },
        LYD: {
            symbol: 'LYD',
            symbol_native: 'د.ل.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'LYD',
        },
        MAD: {
            symbol: 'MAD',
            symbol_native: 'د.م.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'MAD',
        },
        MDL: {
            symbol: 'MDL',
            symbol_native: 'MDL',
            decimal_digits: 2,
            rounding: 0,
            code: 'MDL',
        },
        MGA: {
            symbol: 'MGA',
            symbol_native: 'MGA',
            decimal_digits: 0,
            rounding: 0,
            code: 'MGA',
        },
        MKD: {
            symbol: 'MKD',
            symbol_native: 'MKD',
            decimal_digits: 2,
            rounding: 0,
            code: 'MKD',
        },
        MMK: {
            symbol: 'MMK',
            symbol_native: 'K',
            decimal_digits: 0,
            rounding: 0,
            code: 'MMK',
        },
        MOP: {
            symbol: 'MOP',
            symbol_native: 'MOP',
            decimal_digits: 2,
            rounding: 0,
            code: 'MOP',
        },
        MUR: {
            symbol: 'MUR',
            symbol_native: 'MUR',
            decimal_digits: 0,
            rounding: 0,
            code: 'MUR',
        },
        MXN: {
            symbol: 'MX$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'MXN',
        },
        MYR: {
            symbol: 'MYR',
            symbol_native: 'RM',
            decimal_digits: 2,
            rounding: 0,
            code: 'MYR',
        },
        MZN: {
            symbol: 'MZN',
            symbol_native: 'MTn',
            decimal_digits: 2,
            rounding: 0,
            code: 'MZN',
        },
        NAD: {
            symbol: 'NAD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'NAD',
        },
        NGN: {
            symbol: 'NGN',
            symbol_native: '₦',
            decimal_digits: 2,
            rounding: 0,
            code: 'NGN',
        },
        NIO: {
            symbol: 'NIO',
            symbol_native: 'C$',
            decimal_digits: 2,
            rounding: 0,
            code: 'NIO',
        },
        NOK: {
            symbol: 'NOK',
            symbol_native: 'kr',
            decimal_digits: 2,
            rounding: 0,
            code: 'NOK',
        },
        NPR: {
            symbol: 'NPR',
            symbol_native: 'नेरू',
            decimal_digits: 2,
            rounding: 0,
            code: 'NPR',
        },
        NZD: {
            symbol: 'NZ$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'NZD',
        },
        OMR: {
            symbol: 'OMR',
            symbol_native: 'ر.ع.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'OMR',
        },
        PAB: {
            symbol: 'PAB',
            symbol_native: 'B/.',
            decimal_digits: 2,
            rounding: 0,
            code: 'PAB',
        },
        PEN: {
            symbol: 'PEN',
            symbol_native: 'S/.',
            decimal_digits: 2,
            rounding: 0,
            code: 'PEN',
        },
        PHP: {
            symbol: 'PHP',
            symbol_native: '₱',
            decimal_digits: 2,
            rounding: 0,
            code: 'PHP',
        },
        PKR: {
            symbol: 'PKR',
            symbol_native: '₨',
            decimal_digits: 0,
            rounding: 0,
            code: 'PKR',
        },
        PLN: {
            symbol: 'PLN',
            symbol_native: 'zł',
            decimal_digits: 2,
            rounding: 0,
            code: 'PLN',
        },
        PYG: {
            symbol: 'PYG',
            symbol_native: '₲',
            decimal_digits: 0,
            rounding: 0,
            code: 'PYG',
        },
        QAR: {
            symbol: 'QAR',
            symbol_native: 'ر.ق.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'QAR',
        },
        RON: {
            symbol: 'RON',
            symbol_native: 'RON',
            decimal_digits: 2,
            rounding: 0,
            code: 'RON',
        },
        RSD: {
            symbol: 'RSD',
            symbol_native: 'дин.',
            decimal_digits: 0,
            rounding: 0,
            code: 'RSD',
        },
        RUB: {
            symbol: 'RUB',
            symbol_native: '₽',
            decimal_digits: 2,
            rounding: 0,
            code: 'RUB',
        },
        RUR: {
            symbol: 'RUR',
            symbol_native: '₽',
            decimal_digits: 2,
            rounding: 0,
            code: 'RUR',
        },
        RWF: {
            symbol: 'RWF',
            symbol_native: 'FR',
            decimal_digits: 0,
            rounding: 0,
            code: 'RWF',
        },
        SAR: {
            symbol: 'SAR',
            symbol_native: 'ر.س.‏',
            decimal_digits: 2,
            rounding: 0,
            code: 'SAR',
        },
        SDG: {
            symbol: 'SDG',
            symbol_native: 'SDG',
            decimal_digits: 2,
            rounding: 0,
            code: 'SDG',
        },
        SEK: {
            symbol: 'SEK',
            symbol_native: 'kr',
            decimal_digits: 2,
            rounding: 0,
            code: 'SEK',
        },
        SGD: {
            symbol: 'SGD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'SGD',
        },
        SOS: {
            symbol: 'SOS',
            symbol_native: 'SOS',
            decimal_digits: 0,
            rounding: 0,
            code: 'SOS',
        },
        STD: {
            symbol: 'STD',
            symbol_native: 'Db',
            decimal_digits: 0,
            rounding: 0,
            code: 'STD',
        },
        SYP: {
            symbol: 'SYP',
            symbol_native: 'ل.س.‏',
            decimal_digits: 0,
            rounding: 0,
            code: 'SYP',
        },
        THB: {
            symbol: '฿',
            symbol_native: '฿',
            decimal_digits: 2,
            rounding: 0,
            code: 'THB',
        },
        TND: {
            symbol: 'TND',
            symbol_native: 'د.ت.‏',
            decimal_digits: 3,
            rounding: 0,
            code: 'TND',
        },
        TOP: {
            symbol: 'TOP',
            symbol_native: 'T$',
            decimal_digits: 2,
            rounding: 0,
            code: 'TOP',
        },
        TRY: {
            symbol: 'TRY',
            symbol_native: 'TL',
            decimal_digits: 2,
            rounding: 0,
            code: 'TRY',
        },
        TTD: {
            symbol: 'TTD',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'TTD',
        },
        TWD: {
            symbol: 'NT$',
            symbol_native: 'NT$',
            decimal_digits: 2,
            rounding: 0,
            code: 'TWD',
        },
        TZS: {
            symbol: 'TZS',
            symbol_native: 'TSh',
            decimal_digits: 0,
            rounding: 0,
            code: 'TZS',
        },
        UAH: {
            symbol: 'UAH',
            symbol_native: '₴',
            decimal_digits: 2,
            rounding: 0,
            code: 'UAH',
        },
        UGX: {
            symbol: 'UGX',
            symbol_native: 'USh',
            decimal_digits: 0,
            rounding: 0,
            code: 'UGX',
        },
        USD: {
            symbol: '$',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'USD',
        },
        UYU: {
            symbol: 'UYU',
            symbol_native: '$',
            decimal_digits: 2,
            rounding: 0,
            code: 'UYU',
        },
        UZS: {
            symbol: 'UZS',
            symbol_native: 'UZS',
            decimal_digits: 0,
            rounding: 0,
            code: 'UZS',
        },
        VEF: {
            symbol: 'VEF',
            symbol_native: 'Bs.F.',
            decimal_digits: 2,
            rounding: 0,
            code: 'VEF',
        },
        VND: {
            symbol: '₫',
            symbol_native: '₫',
            decimal_digits: 0,
            rounding: 0,
            code: 'VND',
        },
        XAF: {
            symbol: 'FCFA',
            symbol_native: 'FCFA',
            decimal_digits: 0,
            rounding: 0,
            code: 'XAF',
        },
        XOF: {
            symbol: 'CFA',
            symbol_native: 'CFA',
            decimal_digits: 0,
            rounding: 0,
            code: 'XOF',
        },
        YER: {
            symbol: 'YER',
            symbol_native: 'ر.ي.‏',
            decimal_digits: 0,
            rounding: 0,
            code: 'YER',
        },
        ZAR: {
            symbol: 'ZAR',
            symbol_native: 'R',
            decimal_digits: 2,
            rounding: 0,
            code: 'ZAR',
        },
        ZMK: {
            symbol: 'ZMK',
            symbol_native: 'ZK',
            decimal_digits: 0,
            rounding: 0,
            code: 'ZMK',
        },
    };

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

    const defaultDigits = 2;
    function format(value, { base, quote, format }) {
        const getSymbol = (code) => (code in CurrencyData ? CurrencyData[code].symbol_native : undefined);
        const info = CurrencyData[quote];
        const formatData = {
            raw: value,
            b: base,
            btc: '₿',
            bs: getSymbol(base) || base,
            qs: getSymbol(quote) || quote,
        };
        const formatValueWithDigits = (value, scale, digits) => {
            if (value === undefined) {
                return (0).toFixed(digits).replace(/0/g, '–');
            }
            return (value * scale).toLocaleString(undefined /* locale */, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            });
        };
        const scale = [
            ['', 1],
            ['m', 0.001],
            ['k', 1000],
            ['sat', 1e8],
        ];
        scale.forEach(([prefix, scale]) => {
            formatData[`${prefix}v`] = formatValueWithDigits(value, scale, info ? info.decimal_digits : defaultDigits);
            for (let i = 0; i < 9; i++) {
                formatData[`${prefix}v${i}`] = formatValueWithDigits(value, scale, i);
            }
        });
        return stringFormat(format, formatData);
    }

    const Signals = imports.signals;
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
    Signals.addSignalMethods(ConfigModel.prototype);
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

    const Main = imports.ui.main;
    const PanelMenu = imports.ui.panelMenu;
    const PopupMenu = imports.ui.popupMenu;
    const version = currentVersion();
    const INDICATORS_KEY$1 = 'indicators';
    const FIRST_RUN_KEY = 'first-run';
    const _Symbols = {
        error: '\u26A0',
        refresh: '\u27f3',
        up: '\u25b2',
        down: '\u25bc',
        unchanged: ' ',
    };
    const settings = ExtensionUtils.getSettings();
    const MarketIndicatorView = extendGObject(class MarketIndicatorView extends PanelMenu.Button {
        _init(options) {
            super._init(0);
            this.providerLabel = '';
            this._initLayout();
            this.setOptions(options);
        }
        setOptions(options) {
            try {
                this.providerLabel = getProvider(options.api).getLabel(options);
            }
            catch (e) {
                logError(e);
                this.providerLabel = `[${options.api}]`;
                this.onUpdateError(e);
                return;
            }
            this.options = options;
        }
        _initLayout() {
            const layout = new St.BoxLayout();
            this._indicatorView = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'indicator',
            });
            this._statusView = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'status',
            });
            layout.add_actor(this._statusView);
            layout.add_actor(this._indicatorView);
            ('actor' in this ? this.actor : this).add_actor(layout);
            this._popupItemStatus = new PopupMenu.PopupMenuItem('', { activate: false, hover: false, can_focus: false });
            this._popupItemStatus.label.set_style('max-width: 12em;');
            this._popupItemStatus.label.clutter_text.set_line_wrap(true);
            this.menu.addMenuItem(this._popupItemStatus);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._popupItemSettings = new PopupMenu.PopupMenuItem(_('Settings'));
            this.menu.addMenuItem(this._popupItemSettings);
            this._popupItemSettings.connect('activate', () => {
                openPrefs(version, uuid, { shell: imports.gi.Shell });
            });
        }
        getChange(lastValue, newValue) {
            if (lastValue === undefined) {
                return 'unchanged';
            }
            if (lastValue > newValue) {
                return 'down';
            }
            else if (lastValue < newValue) {
                return 'up';
            }
            return 'unchanged';
        }
        onUpdateStart() {
            this._displayStatus(_Symbols.refresh);
        }
        onUpdateError(error) {
            this._displayText('error');
            this._displayStatus(_Symbols.error);
            this._updatePopupItemLabel(error);
        }
        onClearValue() {
            this._displayStatus(_Symbols.refresh);
            this._displayText(format(undefined, this.options));
            this._updatePopupItemLabel();
        }
        onUpdatePriceData(priceData) {
            const [p, p1] = priceData;
            const change = p1 ? this.getChange(p.value, p1.value) : 'unchanged';
            const _StatusToSymbol = {
                up: _Symbols.up,
                down: _Symbols.down,
                unchanged: ' ',
            };
            let symbol = ' ';
            if (this.options.show_change) {
                symbol = _StatusToSymbol[change];
                this._displayStatus(symbol);
            }
            else {
                this._statusView.width = 0;
            }
            this._displayText(format(p.value, this.options));
            this._updatePopupItemLabel();
        }
        _displayStatus(text) {
            this._statusView.text = text;
        }
        _displayText(text) {
            this._indicatorView.text = text;
        }
        _updatePopupItemLabel(err) {
            let text = this.providerLabel;
            if (err) {
                text += '\n\n' + (err instanceof HTTPError ? err.format('\n\n') : String(err));
            }
            this._popupItemStatus.label.clutter_text.set_markup(text);
        }
        destroy() {
            this._indicatorView.destroy();
            this._statusView.destroy();
            super.destroy();
        }
    }, PanelMenu.Button);
    class IndicatorCollection {
        constructor() {
            this._indicators = [];
            if (settings.get_boolean(FIRST_RUN_KEY)) {
                this._initDefaults();
                settings.set_boolean(FIRST_RUN_KEY, false);
            }
            else {
                this._upgradeSettings();
            }
            const tryUpdateIndicators = () => {
                try {
                    this._updateIndicators();
                }
                catch (e) {
                    logError(e);
                }
            };
            this._settingsChangedId = settings.connect('changed::' + INDICATORS_KEY$1, tryUpdateIndicators);
            tryUpdateIndicators();
        }
        _initDefaults() {
            settings.set_strv(INDICATORS_KEY$1, [Defaults].map((v) => JSON.stringify(v)));
        }
        _upgradeSettings() {
            function applyDefaults(options) {
                if (options.base === undefined) {
                    options.base = options.coin || 'BTC';
                }
                if (options.quote === undefined) {
                    options.quote = options.currency || 'USD';
                }
                if (options.format === undefined) {
                    if (options.show_base_currency) {
                        options.format = '{b}/{q} {v}';
                    }
                    else {
                        options.format = '{v} {qs}';
                    }
                }
                delete options.show_base_currency;
                delete options.coin;
                delete options.currency;
                return options;
            }
            const updated = settings
                .get_strv(INDICATORS_KEY$1)
                .map((v) => JSON.parse(v))
                .map(applyDefaults);
            settings.set_strv(INDICATORS_KEY$1, updated.map((v) => JSON.stringify(v)));
        }
        _updateIndicators() {
            const arrOptions = settings
                .get_strv(INDICATORS_KEY$1)
                .map((str) => {
                try {
                    return JSON.parse(str);
                }
                catch (e) {
                    e.message = `Error parsing string ${str}: ${e.message}`;
                    logError(e);
                }
            })
                .filter(Boolean);
            if (arrOptions.length === this._indicators.length) {
                arrOptions.forEach((options, i) => {
                    try {
                        this._indicators[i].setOptions(options);
                    }
                    catch (e) {
                        logError(e);
                    }
                });
            }
            else {
                this._removeAll();
                const indicators = arrOptions.map((options) => {
                    return new MarketIndicatorView(options);
                });
                indicators.forEach((view, i) => {
                    Main.panel.addToStatusArea(`bitcoin-market-indicator-${i}`, view);
                });
                this._indicators = indicators;
            }
            setSubscribers(this._indicators.filter((i) => i.options));
        }
        _removeAll() {
            this._indicators.forEach((i) => i.destroy());
            this._indicators = [];
        }
        destroy() {
            this._removeAll();
            setSubscribers([]);
            settings.disconnect(this._settingsChangedId);
        }
    }
    let _indicatorCollection;
    function init(_metadata) {
        ExtensionUtils.initTranslations();
    }
    function enable() {
        try {
            _indicatorCollection = new IndicatorCollection();
        }
        catch (e) {
            logError(e);
        }
    }
    function disable() {
        _indicatorCollection.destroy();
    }
    function extension () {
        init();
        return { enable, disable };
    }

    return extension;

}(imports.gi.St, imports.gi.Clutter, imports.gi.GLib, imports.gi.Gio, imports.gi.Shell, imports.gi.GObject, imports.gi.Soup, imports.gi.Gtk));
