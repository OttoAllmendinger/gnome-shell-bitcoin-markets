import Soup from '@girs/soup-3.0';
import Gio from '@girs/gio-2.0';
import Glib from '@girs/glib-2.0';
import { ExtensionMetadata } from '@gnome-shell/extensions/extension';

function _promisify(cls: any, function_name: string) {
  Gio._promisify(cls, function_name, (undefined as unknown) as string);
}

_promisify(Soup.Session.prototype, 'send_and_read_async');
_promisify(Gio.OutputStream.prototype, 'write_bytes_async');
_promisify(Gio.IOStream.prototype, 'close_async');
_promisify(Gio.Subprocess.prototype, 'wait_check_async');

const STATUS_TOO_MANY_REQUESTS = 429;

export class HTTPError extends Error {
  constructor(public message: string, public soupMessage: Soup.Message) {
    super(message);
    this.soupMessage = soupMessage;
  }

  format(sep = ' '): string {
    return [
      'message=' + this.message,
      'status_code=' + this.soupMessage.status_code,
      'reason_phrase=' + this.soupMessage.reason_phrase,
      'method=' + this.soupMessage.method,
      'uri=' + this.soupMessage.uri.to_string(),
    ].join(sep);
  }

  toString(): string {
    return this.format();
  }
}

export function isErrTooManyRequests(err: HTTPError): boolean {
  return !!(
    err.soupMessage &&
    err.soupMessage.status_code &&
    Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS
  );
}

function getExtensionVersion(metadata: ExtensionMetadata & Record<string, unknown>) {
  if (metadata['git-version']) {
    return 'git-' + metadata['git-version'];
  } else if (metadata['version']) {
    return 'v' + metadata['version'];
  } else {
    return 'unknown';
  }
}

export function getDefaultUserAgent(metadata: ExtensionMetadata, gnomeVersion: string): string {
  const repository = 'http://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets';
  const version = getExtensionVersion(metadata as ExtensionMetadata & Record<string, unknown>);
  return `gnome-shell-bitcoin-markets/${version}/Gnome${gnomeVersion} (${repository})`;
}

type Request = {
  date: Date;
  uri: Glib.Uri;
};

class RateLimiter {
  private requestLog: Request[] = [];

  constructor(private periodMillis: number, private maxRequests: number) {}

  getRequestsInPeriod(now: Date): Request[] {
    const cutoff = new Date(now.getTime() - this.periodMillis);
    return this.requestLog.filter((r) => r.date > cutoff);
  }

  rateLimit(uri: Glib.Uri): boolean {
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

export async function getJSON(url: string, { userAgent }: { userAgent: string }): Promise<unknown> {
  const uri = Glib.Uri.parse(url, Glib.UriFlags.NONE);
  if (rateLimiter.rateLimit(uri)) {
    throw new Error('rate limit exceeded for ' + url);
  }

  const session = new Soup.Session({
    user_agent: userAgent,
    timeout: 30_000,
  });
  const message = Soup.Message.new('GET', url);

  const result = await session.send_and_read_async(message, Glib.PRIORITY_DEFAULT, null);
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
  } catch (e) {
    throw new HTTPError('json parse error', message);
  }
}
