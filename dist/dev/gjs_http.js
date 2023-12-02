import Soup from 'gi://Soup?version=3.0';
import Gio from 'gi://Gio?version=2.0';
import GLib from 'gi://GLib?version=2.0';

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

const ipify = 'https://api.ipify.org?format=json';
const urlRequestBin = 'http://dnsdatacheck.9v35tg8lfoefh5f2.b.requestbin.net';
const url418 = 'https://httpstat.us/418';
const url429 = 'https://httpstat.us/429';
const urls = [ipify, urlRequestBin, url418, url429];
urls.forEach((u) => {
    getJSON(u, { userAgent: 'gnome-shell-bitcoin-markets/test' })
        .then((res) => console.log({ url: u, res: res }))
        .catch((err) => console.error('ERROR', {
        url: u,
        err: err.toString(),
        isErrTooManyRequests: isErrTooManyRequests(err),
    }));
});
const loop = new GLib.MainLoop(null, true);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
    loop.quit();
    return GLib.SOURCE_REMOVE;
});
