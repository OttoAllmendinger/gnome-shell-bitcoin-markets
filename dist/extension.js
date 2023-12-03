import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GObject from 'gi://GObject';
import { panel } from 'resource:///org/gnome/shell/ui/main.js';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupMenuItem, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import GLib from 'gi://GLib';
import { PACKAGE_VERSION } from 'resource:///org/gnome/shell/misc/config.js';
import Soup from 'gi://Soup';
import Gio from 'gi://Gio';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
/// Decorator function to call `GObject.registerClass` with the given class.
/// Use like
/// ```
/// @registerGObjectClass
/// export class MyThing extends GObject.Object { ... }
/// ```
function registerGObjectClass(target) {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (Object.prototype.hasOwnProperty.call(target, 'metaInfo')) {
        // eslint-disable-next-line
        // @ts-ignore
        // eslint-disable-next-line
        return GObject.registerClass(target.metaInfo, target);
    }
    else {
        // eslint-disable-next-line
        // @ts-ignore
        return GObject.registerClass(target);
    }
}

const timeoutIds = [];
/**
 * Add single-shot timeout
 * @param intervalMS
 * @param callback
 */
function timeoutAdd(intervalMS, callback) {
    const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMS, () => {
        callback();
        return GLib.SOURCE_REMOVE;
    });
    timeoutIds.push(sourceId);
    return sourceId;
}
function removeAllTimeouts() {
    timeoutIds.forEach((sourceId) => {
        GLib.Source.remove(sourceId);
    });
    timeoutIds.splice(0);
}

function _promisify(cls, function_name) {
    Gio._promisify(cls, function_name, undefined);
}
_promisify(Soup.Session.prototype, 'send_and_read_async');
_promisify(Gio.OutputStream.prototype, 'write_bytes_async');
_promisify(Gio.IOStream.prototype, 'close_async');
_promisify(Gio.Subprocess.prototype, 'wait_check_async');
const STATUS_TOO_MANY_REQUESTS = 429;
class HTTPError extends Error {
    message;
    soupMessage;
    constructor(message, soupMessage) {
        super(message);
        this.message = message;
        this.soupMessage = soupMessage;
        this.soupMessage = soupMessage;
    }
    format(sep = ' ') {
        return [
            'message=' + this.message,
            'status_code=' + this.soupMessage.status_code,
            'reason_phrase=' + this.soupMessage.reason_phrase,
            'method=' + this.soupMessage.method,
            'uri=' + this.soupMessage.uri.to_string(),
        ].join(sep);
    }
    toString() {
        return this.format();
    }
}
function isErrTooManyRequests(err) {
    return !!(err.soupMessage &&
        err.soupMessage.status_code &&
        Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS);
}
function getExtensionVersion(metadata) {
    if (metadata['git-version']) {
        return 'git-' + metadata['git-version'];
    }
    else if (metadata['version']) {
        return 'v' + metadata['version'];
    }
    else {
        return 'unknown';
    }
}
function getDefaultUserAgent(metadata, gnomeVersion) {
    const repository = 'http://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets';
    const version = getExtensionVersion(metadata);
    return `gnome-shell-bitcoin-markets/${version}/Gnome${gnomeVersion} (${repository})`;
}
class RateLimiter {
    periodMillis;
    maxRequests;
    requestLog = [];
    constructor(periodMillis, maxRequests) {
        this.periodMillis = periodMillis;
        this.maxRequests = maxRequests;
    }
    getRequestsInPeriod(now) {
        const cutoff = new Date(now.getTime() - this.periodMillis);
        return this.requestLog.filter((r) => r.date > cutoff);
    }
    rateLimit(uri) {
        const now = new Date();
        this.requestLog = this.getRequestsInPeriod(now);
        const host = uri.get_host();
        if (!host) {
            throw new Error('no host in uri ' + uri.to_string());
        }
        const hostRequests = this.requestLog.filter((r) => r.uri.get_host() === host);
        if (hostRequests.length >= this.maxRequests) {
            return true;
        }
        this.requestLog.push({ uri, date: now });
        return false;
    }
}
const rateLimiter = new RateLimiter(1_000, 8);
async function getJSON(url, { userAgent }) {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    if (rateLimiter.rateLimit(uri)) {
        throw new Error('rate limit exceeded for ' + url);
    }
    const session = new Soup.Session({
        user_agent: userAgent,
        timeout: 30_000,
    });
    const message = Soup.Message.new('GET', url);
    const result = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    const { status_code } = message;
    if (status_code !== Soup.Status.OK) {
        throw new HTTPError('unexpected status', message);
    }
    const data = result.get_data();
    if (!data) {
        throw new HTTPError('no result data', message);
    }
    try {
        // @ts-ignore
        const string = new TextDecoder().decode(data);
        return JSON.parse(string);
    }
    catch (e) {
        throw new HTTPError('json parse error', message);
    }
}

/**
 * Api definitions
 */
class Api {
    tickers = [];
    getLabel({ base, quote }) {
        return `${this.apiName} ${base}/${quote}`;
    }
    getTickerInstance(ticker) {
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
    getTicker({ base, quote }) {
        return this.getTickerInstance({ base, quote });
    }
    parseData(data, ticker) {
        return Number(this.getLast(data, ticker));
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USD' };
    }
}

class Api$1 extends Api {
    apiName = 'Binance';
    apiDocs = [['API Docs', 'https://binance-docs.github.io/apidocs/spot/en/#symbol-price-ticker']];
    interval = 15;
    getUrl({ base, quote }) {
        return `https://api.binance.com/api/v3/ticker/price?symbol=${base}${quote}`;
    }
    getLast({ price }) {
        return price;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USDT' };
    }
}

class Api$2 extends Api {
    apiName = 'Binance Futures';
    apiDocs = [
        [
            'API Docs',
            'https://binance-docs.github.io/apidocs/futures/en/' + '#24hr-ticker-price-change-statistics-market_data',
        ],
    ];
    interval = 15;
    getUrl({ base, quote }) {
        return `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${base}${quote}`;
    }
    getLast({ price }) {
        return price;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USDT' };
    }
}

class Api$3 extends Api {
    apiName = 'Bit2C';
    apiDocs = [['API Docs', 'https://bit2c.co.il/home/api']];
    interval = 10; // unknown, guessing
    getUrl({ base, quote }) {
        return `https://bit2c.co.il/Exchanges/${base}${quote}/Ticker.json`;
    }
    getLast(data) {
        if (data.error) {
            throw new Error(data.error);
        }
        return data.ll;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'NIS' };
    }
}

class Api$4 extends Api {
    apiName = 'Bitfinex';
    apiDocs = [
        ['API Docs', 'https://docs.bitfinex.com/v1/reference#rest-public-ticker'],
        ['Symbols (JSON)', 'https://api.bitfinex.com/v1/symbols'],
    ];
    /* quote https://www.bitfinex.com/posts/188
     *
     * > If an IP address exceeds 90 requests per minute to the REST APIs,
     * > the requesting IP address will be blocked for 10-60 seconds
     */
    interval = 10;
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
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USD' };
    }
}

class Api$5 extends Api {
    apiName = 'BitMEX';
    apiDocs = [['API Docs', 'https://www.bitmex.com/app/restAPI']];
    // ```
    //   Requests to our REST API are rate limited to 300 requests per 5
    //   minutes.  This counter refills continuously. If you are not logged in,
    //   your ratelimit is 150/5minutes.
    // ```
    interval = 10;
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
    getDefaultTicker() {
        return { base: 'XBT', quote: 'USD' };
    }
}

class Api$6 extends Api {
    apiName = 'BitPay';
    apiDocs = [['API Docs', 'https://bitpay.com/api']];
    interval = 60; // unclear, should be safe
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

class Api$7 extends Api {
    apiName = 'Bitso';
    apiDocs = [
        ['API Docs', 'https://bitso.com/api_info#http-api-responses'],
        ['Books (JSON)', 'https://api.bitso.com/v3/available_books'],
    ];
    /* quote https://bitso.com/api_info#rate-limits
     *
     * > Rate limits are are based on one minute windows. If you do more than 30
     * > requests in a minute, you get locked out for one minute.
     */
    interval = 10;
    getUrl({ base, quote }) {
        return `https://api.bitso.com/v3/ticker?book=${base}_${quote}`.toLowerCase();
    }
    getLast({ payload }) {
        return payload.last;
    }
}

class Api$8 extends Api {
    apiName = 'Bitstamp';
    apiDocs = [['API Docs', 'https://www.bitstamp.net/api/']];
    // Quote 2013-08-09  ---  https://www.bitstamp.net/api/
    // `` Do not make more than 600 request per 10 minutes or we will ban your
    //  IP address. ''
    interval = 10;
    getUrl({ base, quote }) {
        return `https://www.bitstamp.net/api/v2/ticker/${base}${quote}`.toLowerCase();
    }
    getLast(data) {
        return data.last;
    }
}

class Api$9 extends Api {
    apiName = 'Bittrex';
    apiDocs = [['API Docs', 'https://bittrex.github.io/api/v3#operation--markets--marketSymbol--ticker-get']];
    interval = 15;
    getUrl({ base, quote }) {
        return `https://api.bittrex.com/v3/markets/${base}-${quote}/ticker`;
    }
    getLast({ lastTradeRate }) {
        return lastTradeRate;
    }
}

class Api$a extends Api {
    apiName = 'Buda';
    apiDocs = [['API Docs', 'https://api.buda.com/#la-api-de-buda-com']];
    interval = 60;
    getDefaultTicker() {
        return { base: 'BTC', quote: 'CLP' };
    }
    getUrl({ base, quote }) {
        return `https://www.buda.com/api/v2/markets/${base}-${quote}/ticker`;
    }
    getLast({ ticker }) {
        return ticker.last_price[0];
    }
}

class Api$b extends Api {
    apiName = 'BTCMarkets';
    apiDocs = [
        ['API Docs', 'https://github.com/BTCMarkets/API/wiki/Market-data-API'],
        ['Active Markets (JSON)', 'https://api.btcmarkets.net/v2/market/active'],
    ];
    interval = 10;
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
    getDefaultTicker() {
        return { base: 'BTC', quote: 'AUD' };
    }
}

class Api$c extends Api {
    apiName = 'CEX.IO';
    apiDocs = [
        ['API Docs', 'https://cex.io/rest-api#ticker'],
        ['Pairs (JSON)', 'https://cex.io/api/currency_limits'],
    ];
    interval = 10;
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

class Api$d extends Api {
    apiName = 'Coinbase';
    apiDocs = [['API Docs', 'https://developers.coinbase.com/api/v2#exchange-rates']];
    interval = 60; // unclear, should be safe
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

class Api$e extends Api {
    apiName = 'CoinGecko';
    apiDocs = [
        ['API Docs', 'https://www.coingecko.com/api/docs/v3#/coins/get_coins_list'],
        ['Coins List (JSON)', 'https://api.coingecko.com/api/v3/coins/list'],
    ];
    // ```
    //   7 Dec 2018= Due to the overwhelming requests we are receiving, we are
    //   updating our api limit from 10/second to 300/minute, that is 13
    //   million requests/month!
    // ```
    interval = 10;
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
    getDefaultTicker() {
        return { base: 'bitcoin', quote: 'usd' };
    }
}

class Api$f extends Api {
    apiName = 'CryptoCompare';
    apiDocs = [['API Docs', 'https://min-api.cryptocompare.com/documentation']];
    interval = 15;
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
    apiName = 'FTX exchange';
    apiDocs = [['API Docs', 'https://docs.ftx.com/#get-markets']];
    interval = 15;
    getUrl({ base, quote }) {
        return `https://ftx.com/api/markets/${base}/${quote}`;
    }
    getLast({ result }) {
        return result.last;
    }
}

class Api$h extends Api {
    apiName = 'HitBTC';
    apiDocs = [['API Docs', 'https://api.hitbtc.com/']];
    interval = 15;
    getUrl({ base, quote }) {
        return 'https://api.hitbtc.com/api/2/public/ticker/' + `${base}${quote}`.toUpperCase();
    }
    getLast({ last }) {
        return last;
    }
}

class Api$i extends Api {
    apiName = 'Huobi';
    apiDocs = [['API Docs', 'https://huobiapi.github.io/docs/spot/v1/en/#introduction']];
    // Each API Key can send maximum of 100 https requests within 10 seconds
    // so 15 should be safe.
    interval = 15;
    getUrl({ base, quote }) {
        return 'https://api.huobi.pro/market/detail/' + `merged?symbol=${base}${quote}`.toLowerCase();
    }
    getLast(data) {
        if (data['status'] === 'error') {
            throw new Error(data['err-msg']);
        }
        return data.tick.bid[0];
    }
    getDefaultTicker() {
        return { base: 'btc', quote: 'usdt' };
    }
}

class Api$j extends Api {
    apiName = 'Kraken';
    apiDocs = [
        ['API Docs', 'https://www.kraken.com/help/api#public-market-data'],
        ['Asset Pairs (JSON)', 'https://api.kraken.com/0/public/AssetPairs'],
    ];
    interval = 10; // unknown, guessing
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
    getDefaultTicker() {
        return { base: 'XXBT', quote: 'ZUSD' };
    }
}

class Api$k extends Api {
    apiName = 'Kucoin';
    apiDocs = [['API Docs', 'https://docs.kucoin.com/']];
    interval = 15;
    getUrl({ base, quote }) {
        return 'https://openapi-v2.kucoin.com/api/v1/market/orderbook/level1?symbol=' + `${base}-${quote}`.toUpperCase();
    }
    getLast({ code, msg, data }) {
        if (code != 200000) {
            throw new Error(msg);
        }
        return data.price;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USDT' };
    }
}

class Api$l extends Api {
    apiName = 'Paymium';
    apiDocs = [['API Docs', 'https://github.com/Paymium/api-documentation#ticker']];
    interval = 60; // unclear, should be safe
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
    getDefaultTicker() {
        return { base: 'BTC', quote: 'EUR' };
    }
}

class Api$m extends Api {
    apiName = 'Satang.pro';
    apiDocs = [['API Docs', 'https://docs.satang.pro/apis/public/orders']];
    interval = 60; // unclear, should be safe
    getUrl({ base, quote }) {
        return 'https://api.tdax.com/api/orders/?pair=' + `${base}_${quote}`.toLowerCase();
    }
    getLast(data) {
        const bidding = parseFloat(data.bid[0].price);
        const asking = parseFloat(data.ask[0].price);
        return (asking - bidding) * 0.5 + bidding;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'THB' };
    }
}

const tokenInfo = {
    TOMO: { address: '0x0000000000000000000000000000000000000001', decimal: 18 },
    BTC: { address: '0xAE44807D8A9CE4B30146437474Ed6fAAAFa1B809', decimal: 8 },
    ETH: { address: '0x2EAA73Bd0db20c64f53fEbeA7b5F5E5Bccc7fb8b', decimal: 18 },
    USDT: { address: '0x381B31409e4D220919B2cFF012ED94d70135A59e', decimal: 6 },
    POMO: { address: '0X31E58CCA9ECAA057EDABACCFF5ABFBBC3443480C', decimal: 18 },
    YFI: { address: '0XE189A56891F6CA22797878E34992395A4AFBDE46', decimal: 18 },
    ORBYT: { address: '0X4DD28C75B28F05DF193B4E1BBB61CD186EB968C6', decimal: 18 },
    DEC: { address: '0xfEB9aE1cCEc15cD8CcD37894eF3E24EC5414e781', decimal: 18 },
    SRM: { address: '0xc01643aC912B6a8ffC50CF8c1390934A6142bc91', decimal: 6 },
    VNDC: { address: '0xC43A2df23dAfACb9106AB239896599B705E2e67e', decimal: 0 },
    FTX: { address: '0x33fa3c0c714638f12339F85dae89c42042a2D9Af', decimal: 18 },
};
function getTokenInfo(code) {
    if (!(code in tokenInfo)) {
        throw new Error(`no TokenInfo for ${code}`);
    }
    return tokenInfo[code];
}
class Api$n extends Api {
    apiName = 'TomoX(TomoChain)';
    apiDocs = [['API Docs', 'https://apidocs.tomochain.com/#tomodex-apis-trades']];
    interval = 15;
    getDefaultTicker() {
        return { base: 'TOMO', quote: 'USDT' };
    }
    getUrl({ base, quote }) {
        const baseAddress = getTokenInfo(base).address;
        const quoteAddress = getTokenInfo(quote).address;
        return `https://dex.tomochain.com/api/pair/data?baseToken=${baseAddress}&quoteToken=${quoteAddress}`;
    }
    getLast({ data }) {
        let decimal = 18;
        Object.keys(tokenInfo).forEach(function (key) {
            if (tokenInfo[key].address == data.pair.quoteToken) {
                decimal = tokenInfo[key].decimal;
            }
        });
        return data.close / Math.pow(10, decimal);
    }
}

class Api$o extends Api {
    apiName = 'VccExchange(Vietnam)';
    apiDocs = [['API Docs', 'https://vcc.exchange/api']];
    interval = 15;
    getUrl({ base, quote }) {
        return `https://api.vcc.exchange/v3/trades/${base}_${quote}`;
    }
    getLast({ message, data }) {
        if (message != null) {
            throw new Error(message);
        }
        return data[0].price;
    }
    getDefaultTicker() {
        return { base: 'BTC', quote: 'USDT' };
    }
}

const Providers = {
    binance: new Api$1(),
    binanceFutures: new Api$2(),
    bit2c: new Api$3(),
    bitfinex: new Api$4(),
    bitmex: new Api$5(),
    bitpay: new Api$6(),
    bitso: new Api$7(),
    bitstamp: new Api$8(),
    bittrex: new Api$9(),
    btcmarkets: new Api$b(),
    buda: new Api$a(),
    cexio: new Api$c(),
    coinbase: new Api$d(),
    coingecko: new Api$e(),
    cryptocompare: new Api$f(),
    ftx: new Api$g(),
    hitbtc: new Api$h(),
    huobi: new Api$i(),
    kraken: new Api$j(),
    kucoin: new Api$k(),
    paymium: new Api$l(),
    poloniex: new Api$6(),
    satangpro: new Api$m(),
    tomox: new Api$n(),
    vccexchange: new Api$o(),
};
function getProvider(name) {
    if (name in Providers) {
        return Providers[name];
    }
    else {
        throw new Error(`unknown api ${name}`);
    }
}

const permanentErrors = new Map();
function filterSubscribers(subscribers, { provider, url, ticker, }) {
    return subscribers.filter((s) => {
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
}
const applySubscribers = (subscribers, func) => subscribers.forEach((s) => {
    try {
        func(s);
    }
    catch (e) {
        try {
            const { api, base, quote } = s.options;
            s.onUpdateError(e);
            e.message = `Error with subscriber ${api} ${base}${quote}: ${e.message}`;
            console.log(e);
        }
        catch (e) {
            console.log(e);
        }
    }
});
class PriceDataLog {
    map = new Map();
    maxHistory = 10;
    get(ticker) {
        if (!this.map.has(ticker)) {
            this.map.set(ticker, new Map());
        }
        return this.map.get(ticker);
    }
    addValue(ticker, date, value) {
        if (isNaN(value)) {
            throw new Error(`invalid price value ${value}`);
        }
        const values = this.get(ticker);
        values.set(date, value);
        const keys = [...values.keys()].sort((a, b) => b.getTime() - a.getTime());
        keys.splice(this.maxHistory).forEach((k) => values.delete(k));
        return keys.map((k) => ({ date: k, value: values.get(k) }));
    }
}
const getSubscriberUrl = ({ options }) => getProvider(options.api).getUrl(options);
const getSubscriberTicker = ({ options }) => getProvider(options.api).getTicker(options);
class PollLoop {
    provider;
    interval;
    cache = new Map();
    priceDataLog = new PriceDataLog();
    signal = null;
    subscribers = [];
    urls = [];
    constructor(provider) {
        const interval = Number(provider.interval);
        if (isNaN(interval) || interval < 5) {
            throw new Error(`invalid interval for ${provider}: ${provider.interval}`);
        }
        this.interval = interval;
        this.provider = provider;
    }
    start() {
        if (this.signal === null) {
            this.signal = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this.run();
                return GLib.SOURCE_REMOVE;
            });
            return true;
        }
    }
    stop() {
        if (this.signal !== null) {
            GLib.source_remove(this.signal);
            this.signal = null;
        }
    }
    run() {
        try {
            this.update();
        }
        catch (e) {
            console.error(e);
        }
        this.signal = timeoutAdd(this.interval * 1000, this.run.bind(this));
    }
    setSubscribers(subscribers) {
        this.subscribers = filterSubscribers(subscribers, { provider: this.provider });
        if (this.subscribers.length === 0) {
            this.cache.clear();
            return this.stop();
        }
        this.urls = [...new Set(this.subscribers.map((s) => getSubscriberUrl(s)))];
        if (this.start()) {
            return;
        }
        this.urls.forEach((url) => this.updateUrl(url, this.cache.get(url)));
    }
    async updateUrl(url, cache) {
        const getUrlSubscribers = () => filterSubscribers(this.subscribers, { url });
        const tickers = new Set(getUrlSubscribers().map(getSubscriberTicker));
        const processResponse = (response, date) => {
            tickers.forEach((ticker) => {
                const tickerSubscribers = filterSubscribers(getUrlSubscribers(), { ticker });
                try {
                    const priceData = this.priceDataLog.addValue(ticker, date, this.provider.parseData(response, ticker));
                    applySubscribers(tickerSubscribers, (s) => s.onUpdatePriceData(priceData));
                }
                catch (e) {
                    e.message = `Error updating ${url}: ${e.message}`;
                    applySubscribers(tickerSubscribers, (s) => s.onUpdateError(e, { ticker }));
                    console.log(e);
                }
            });
        };
        if (cache) {
            return processResponse(cache.response, cache.date);
        }
        applySubscribers(getUrlSubscribers(), (s) => s.onUpdateStart());
        const error = permanentErrors.get(this.provider);
        if (error) {
            applySubscribers(getUrlSubscribers(), (s) => s.onUpdateError(error));
            return;
        }
        const ext = Extension.lookupByURL(import.meta.url);
        if (!ext) {
            throw new Error('Unable to find extension');
        }
        try {
            const response = await getJSON(url, {
                userAgent: getDefaultUserAgent(ext.metadata, PACKAGE_VERSION),
            });
            const date = new Date();
            this.cache.set(url, { date, response });
            processResponse(response, date);
        }
        catch (err) {
            if (isErrTooManyRequests(err)) {
                permanentErrors.set(this.provider, err);
            }
            console.error(err);
            this.cache.delete(url);
            applySubscribers(getUrlSubscribers(), (s) => s.onUpdateError(err));
        }
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
function setSubscribers(subscribers) {
    subscribers = subscribers.filter(({ options }) => {
        if (options.api in Providers) {
            return true;
        }
        console.log(new Error(`invalid provider ${options.api}`));
        return false;
    });
    _pollLoops.forEach((loop) => loop.setSubscribers(subscribers));
}

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
    NIS: {
        symbol: '₪',
        symbol_native: '₪',
        decimal_digits: 2,
        rounding: 0,
        code: 'NIS',
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

const segments = ['🯰', '🯱', '🯲', '🯳', '🯴', '🯵', '🯶', '🯷', '🯸', '🯹'];
function getSegmentChar(v) {
    if (0 <= v && v <= 9) {
        return segments[v];
    }
    throw new Error('invalid input');
}
function toSegmentStr(base10Str) {
    return base10Str
        .split('')
        .map((v) => {
        const n = Number(v);
        return Number.isInteger(n) ? getSegmentChar(n) : v;
    })
        .join('');
}
function getMoscowTime(value) {
    if (value === undefined) {
        return '--:--';
    }
    const satPerBase = (1e8 / value).toFixed(0);
    const a = satPerBase.substr(0, satPerBase.length - 2);
    const b = satPerBase.substr(satPerBase.length - 2, satPerBase.length);
    return `${a}:${b}`;
}

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
        moscow: getMoscowTime(value),
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
    return stringFormat.create({
        segment(str) {
            return toSegmentStr(str);
        },
    })(format, formatData);
}

const Defaults = {
    api: 'bitstamp',
    base: 'BTC',
    quote: 'USD',
    attribute: 'last',
    show_change: true,
    format: '{v} {qs}',
};

const INDICATORS_KEY = 'indicators';
const FIRST_RUN_KEY = 'first-run';
const _Symbols = {
    error: '\u26A0',
    refresh: '\u27f3',
    up: '\u25b2',
    down: '\u25bc',
    unchanged: ' ',
};
let MarketIndicatorView = class MarketIndicatorView extends Button {
    ext;
    options;
    providerLabel;
    _indicatorView;
    _statusView;
    _popupItemStatus;
    _popupItemSettings;
    // actor!: Clutter.Actor;
    constructor(ext, options) {
        super(1.0, 'Bitcoin Markets Indicator', false);
        this.ext = ext;
        this.providerLabel = '[providerlabel]';
        this._initLayout();
        this.setOptions(options);
    }
    setOptions(options) {
        try {
            this.providerLabel = getProvider(options.api).getLabel(options);
        }
        catch (e) {
            console.error(e);
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
        this.add_actor(layout);
        this._popupItemStatus = new PopupMenuItem('', {
            activate: false,
            hover: false,
            can_focus: false,
        });
        this._popupItemStatus.label.set_style('max-width: 12em;');
        this._popupItemStatus.label.clutter_text.set_line_wrap(true);
        this.menu.addMenuItem(this._popupItemStatus);
        this.menu.addMenuItem(new PopupSeparatorMenuItem());
        this._popupItemSettings = new PopupMenuItem('Settings');
        this.menu.addMenuItem(this._popupItemSettings);
        this._popupItemSettings.connect('activate', () => {
            this.ext.openPreferences();
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
};
MarketIndicatorView = __decorate([
    registerGObjectClass
], MarketIndicatorView);
class IndicatorCollection {
    ext;
    settings;
    _indicators;
    _settingsChangedId;
    constructor(ext) {
        this.ext = ext;
        this.settings = ext.getSettings();
        this._indicators = [];
        if (this.settings.get_boolean(FIRST_RUN_KEY)) {
            this._initDefaults();
            this.settings.set_boolean(FIRST_RUN_KEY, false);
        }
        else {
            this._upgradeSettings();
        }
        const tryUpdateIndicators = () => {
            try {
                this._updateIndicators();
            }
            catch (e) {
                console.error(e);
            }
        };
        this._settingsChangedId = this.settings.connect('changed::' + INDICATORS_KEY, tryUpdateIndicators);
        tryUpdateIndicators();
    }
    _initDefaults() {
        this.settings.set_strv(INDICATORS_KEY, [Defaults].map((v) => JSON.stringify(v)));
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
        const updated = this.settings
            .get_strv(INDICATORS_KEY)
            .map((v) => JSON.parse(v))
            .map(applyDefaults);
        this.settings.set_strv(INDICATORS_KEY, updated.map((v) => JSON.stringify(v)));
    }
    _updateIndicators() {
        const arrOptions = this.settings
            .get_strv(INDICATORS_KEY)
            .map((str) => {
            try {
                return JSON.parse(str);
            }
            catch (e) {
                e.message = `Error parsing string ${str}: ${e.message}`;
                console.error(e);
            }
        })
            .filter(Boolean);
        if (arrOptions.length === this._indicators.length) {
            arrOptions.forEach((options, i) => {
                try {
                    this._indicators[i].setOptions(options);
                }
                catch (e) {
                    console.error(e);
                }
            });
        }
        else {
            this._removeAll();
            const indicators = arrOptions.map((options) => {
                return new MarketIndicatorView(this.ext, options);
            });
            indicators.forEach((view, i) => {
                panel.addToStatusArea(`bitcoin-market-indicator-${i}`, view);
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
        this.settings.disconnect(this._settingsChangedId);
    }
}
class BitcoinMarketsExtension extends Extension {
    _indicatorCollection = null;
    constructor(props) {
        super(props);
    }
    enable() {
        try {
            this._indicatorCollection = new IndicatorCollection(this);
        }
        catch (e) {
            console.log(e);
        }
    }
    disable() {
        this._indicatorCollection?.destroy();
        this._indicatorCollection = null;
        removeAllTimeouts();
    }
}

export default BitcoinMarketsExtension;
