const Mainloop = imports.mainloop;

import * as HTTP from './HTTP';
import { getProvider, BaseProvider, Providers } from './providers';

interface PriceData {
  date: Date;
  value: number;
}

export interface Subscriber {
  options: BaseProvider.Options;

  onUpdateStart();

  onUpdateError(err: Error, opts?: { ticker: BaseProvider.Ticker });

  onUpdatePriceData(priceData: PriceData[]);
}

const permanentErrors: Map<BaseProvider.Api, Error> = new Map();

function filterSubscribers(
  subscribers: Subscriber[],
  {
    provider,
    url,
    ticker,
  }: {
    provider?: BaseProvider.Api;
    url?: string;
    ticker?: BaseProvider.Ticker;
  },
): Subscriber[] {
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

const applySubscribers = (subscribers, func: (s: Subscriber) => void) =>
  subscribers.forEach((s) => {
    try {
      func(s);
    } catch (e) {
      try {
        const { api, base, quote } = s.options;
        s.onUpdateError(e);
        e.message = `Error with subscriber ${api} ${base}${quote}: ${e.message}`;
        logError(e);
      } catch (e) {
        logError(e);
      }
    }
  });

class PriceDataLog {
  map: Map<BaseProvider.Ticker, Map<Date, number>> = new Map();

  maxHistory = 10;

  get(ticker): Map<Date, number> {
    if (!this.map.has(ticker)) {
      this.map.set(ticker, new Map());
    }
    return this.map.get(ticker)!;
  }

  addValue(ticker, date, value): PriceData[] {
    if (isNaN(value)) {
      throw new Error(`invalid price value ${value}`);
    }
    const values = this.get(ticker);
    values.set(date, value);

    const keys = [...values.keys()].sort((a, b) => b.getTime() - a.getTime());
    keys.splice(this.maxHistory).forEach((k) => values.delete(k));

    return keys.map((k: Date) => ({ date: k, value: values.get(k)! }));
  }
}

const getSubscriberUrl = ({ options }: Subscriber) => getProvider(options.api).getUrl(options);

const getSubscriberTicker = ({ options }: Subscriber) => getProvider(options.api).getTicker(options);

class PollLoop {
  private provider: BaseProvider.Api;
  private interval: number;
  private cache = new Map();
  private priceDataLog = new PriceDataLog();
  private signal = null;
  private subscribers: any[] = [];
  private urls: string[] = [];

  constructor(provider: BaseProvider.Api) {
    const interval = Number(provider.interval);
    if (isNaN(interval) || interval < 5) {
      throw new Error(`invalid interval for ${provider}: ${provider.interval}`);
    }
    this.interval = interval;
    this.provider = provider;
  }

  start() {
    if (this.signal === null) {
      this.signal = Mainloop.idle_add(this.run.bind(this));
      return true;
    }
  }

  stop() {
    if (this.signal !== null) {
      Mainloop.source_remove(this.signal);
      this.signal = null;
    }
  }

  run() {
    try {
      this.update();
    } catch (e) {
      logError(e);
    }

    this.signal = Mainloop.timeout_add_seconds(this.interval, this.run.bind(this));
  }

  setSubscribers(subscribers: Subscriber[]) {
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

  async updateUrl(url, cache?) {
    const getUrlSubscribers = () => filterSubscribers(this.subscribers, { url });

    const tickers: Set<BaseProvider.Ticker> = new Set(getUrlSubscribers().map(getSubscriberTicker));

    const processResponse = (response, date) => {
      tickers.forEach((ticker) => {
        const tickerSubscribers = filterSubscribers(getUrlSubscribers(), { ticker });
        try {
          const priceData = this.priceDataLog.addValue(ticker, date, this.provider.parseData(response, ticker));
          applySubscribers(tickerSubscribers, (s) => s.onUpdatePriceData(priceData));
        } catch (e) {
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

    const error = permanentErrors.get(this.provider);
    if (error) {
      applySubscribers(getUrlSubscribers(), (s) => s.onUpdateError(error));
      return;
    }

    try {
      const response = await HTTP.getJSON(url);
      const date = new Date();
      this.cache.set(url, { date, response });
      processResponse(response, date);
    } catch (err) {
      if (HTTP.isErrTooManyRequests(err)) {
        permanentErrors.set(this.provider, err);
      }
      logError(err);
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

export function setSubscribers(subscribers: Subscriber[]) {
  subscribers = subscribers.filter(({ options }) => {
    if (options.api in Providers) {
      return true;
    }
    logError(new Error(`invalid provider ${options.api}`));
    return false;
  });

  _pollLoops.forEach((loop) => loop.setSubscribers(subscribers));
}
