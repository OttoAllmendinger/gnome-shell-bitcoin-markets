import * as Soup from '@gi-types/soup3';
import * as Gio from '@gi-types/gio2';
import { PRIORITY_DEFAULT } from '@gi-types/glib2';
import { dump } from './gselib/dump';

function _promisify(cls: any, function_name: string) {
  Gio._promisify(cls, function_name, (undefined as unknown) as string);
}

_promisify(Soup.Session.prototype, 'send_and_read_async');
_promisify(Gio.OutputStream.prototype, 'write_bytes_async');
_promisify(Gio.IOStream.prototype, 'close_async');
_promisify(Gio.Subprocess.prototype, 'wait_check_async');

const STATUS_TOO_MANY_REQUESTS = 429;

export class HTTPError extends Error {
  soupMessage: Soup.Message;

  constructor(message: string, soupMessage: Soup.Message) {
    super(message);
    this.soupMessage = soupMessage;
  }

  format(sep = ' '): string {
    return [
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
  log(dump({ err }, { all: true, values: true }));
  return !!(
    err.soupMessage &&
    err.soupMessage.status_code &&
    Number(err.soupMessage.status_code) === STATUS_TOO_MANY_REQUESTS
  );
}

function getExtensionVersion(metadata: Record<string, unknown>) {
  if (metadata['git-version']) {
    return 'git-' + metadata['git-version'];
  } else if (metadata['version']) {
    return 'v' + metadata['version'];
  } else {
    return 'unknown';
  }
}

export function getDefaultUserAgent(metadata: Record<string, unknown>, gnomeVersion: string): string {
  const _repository = 'http://github.com/OttoAllmendinger/' + 'gnome-shell-bitcoin-markets';
  return `gnome-shell-bitcoin-markets/${getExtensionVersion(metadata)}/Gnome${gnomeVersion} (${_repository})`;
}

export async function getJSON(url: string, { userAgent }: { userAgent: string }): Promise<unknown> {
  const session = new Soup.Session({
    user_agent: userAgent,
    timeout: 30_000,
  });
  const message = Soup.Message.new('GET', url);

  log(`> GET ${url}`);
  const result = await session.send_and_read_async(message, PRIORITY_DEFAULT, null);
  log(dump({ result }));
  const { status_code } = message;
  if (status_code !== Soup.Status.OK) {
    throw new HTTPError('unexpected status', message);
  }

  const data = result.get_data();
  if (!data) {
    throw new HTTPError('no result data', message);
  }

  try {
    return JSON.parse(imports.byteArray.toString(data));
  } catch (e) {
    throw new HTTPError('json parse error', message);
  }
}
