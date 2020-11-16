const Config = imports.misc.config;
const Mainloop = imports.mainloop;

import * as Soup from '@imports/Soup-2.4';

const Metadata = imports.misc.extensionUtils.getCurrentExtension().metadata;

export class HTTPError {
  name: string;
  soupMessage: any;
  stack?: string;

  constructor(soupMessage, _error?) {
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

export function isErrTooManyRequests(err) {
  return (
    err &&
    err.soupMessage &&
    err.soupMessage.status_code &&
    Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS
  );
}

function getExtensionVersion() {
  if (Metadata['git-version']) {
    return 'git-' + Metadata['git-version'];
  } else if (Metadata['version']) {
    return 'v' + Metadata['version'];
  } else {
    return 'unknown';
  }
}

function getGnomeVersion() {
  return Config.PACKAGE_VERSION;
}

const _repository = 'http://github.com/OttoAllmendinger/' + 'gnome-shell-bitcoin-markets';

const _userAgent =
  'gnome-shell-bitcoin-markets' + '/' + getExtensionVersion() + '/Gnome' + getGnomeVersion() + ' (' + _repository + ')';

// Some API providers have had issues with high traffic coming from single IPs
// this code helps determine if these are actually different clients from behind
// a NAT or if some clients really do many requests
function getClientId() {
  // GUID code from http://stackoverflow.com/a/2117523/92493
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const _clientId = getClientId();

const _testDelayMs = 0;
const _timeoutMs = 30000;

function getSession() {
  const session = new Soup.SessionAsync();
  session['user-agent'] = _userAgent;
  Soup.Session.prototype.add_feature.call(session, new Soup.ProxyResolverDefault());
  return session;
}

export function getJSON(url, _params?) {
  if (_testDelayMs) {
    url = `http://slowwly.robertomurray.co.uk/delay/${_testDelayMs}/url/${url}`;
  }

  const session = getSession();
  const message = Soup.Message.new('GET', url);
  const headers = message.request_headers;
  headers.append('X-Client-Id', _clientId);
  // log(`> GET ${url}`);
  return Object.assign(
    new Promise((resolve, reject) => {
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
        } catch (e) {
          return reject(new Error(`GET ${url}: error parsing as JSON: ${e}; data=${JSON.stringify(data)}`));
        }
      });

      Mainloop.timeout_add(_timeoutMs, () => session.abort());
    }),

    {
      cancel() {
        session.abort();
      },
    },
  );
}
