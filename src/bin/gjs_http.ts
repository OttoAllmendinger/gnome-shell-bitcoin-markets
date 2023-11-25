import { getJSON, isErrTooManyRequests } from '../HTTP';
import { GLib } from '@girs/glib-2.0';

const ipify = 'https://api.ipify.org?format=json';
const urlRequestBin = 'http://dnsdatacheck.9v35tg8lfoefh5f2.b.requestbin.net';
const url418 = 'https://httpstat.us/418';
const url429 = 'https://httpstat.us/429';

const urls = [ipify, urlRequestBin, url418, url429];

urls.forEach((u) => {
  getJSON(u, { userAgent: 'gnome-shell-bitcoin-markets/test' })
    .then((res) => console.log({ url: u, res: res }))
    .catch((err) =>
      console.error('ERROR', {
        url: u,
        err: err.toString(),
        isErrTooManyRequests: isErrTooManyRequests(err),
      }),
    );
});

const loop = new GLib.MainLoop(null, true);

GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
  loop.quit();
  return GLib.SOURCE_REMOVE;
});
