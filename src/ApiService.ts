const Mainloop = imports.mainloop;

import * as BaseProvider from './BaseProvider';

import * as ProviderBinance from './providers/ProviderBinance';
import * as ProviderBinanceFutures from './providers/ProviderBinanceFutures';
import * as ProviderBitfinex from './providers/ProviderBitfinex';
import * as ProviderBitMEX from './providers/ProviderBitMEX';
import * as ProviderBitPay from './providers/ProviderBitPay';
import * as ProviderBitso from './providers/ProviderBitso';
import * as ProviderBitstamp from './providers/ProviderBitstamp';
import * as ProviderBlinktrade from './providers/ProviderBlinktrade';
import * as ProviderBTCMarkets from './providers/ProviderBTCMarkets';
import * as ProviderBXinTH from './providers/ProviderBXinTH';
import * as ProviderCexio from './providers/ProviderCexio';
import * as ProviderCoinbase from './providers/ProviderCoinbase';
import * as ProviderCoinGecko from './providers/ProviderCoinGecko';
import * as ProviderCoinMarketCap from './providers/ProviderCoinMarketCap';
import * as ProviderCryptoCompare from './providers/ProviderCryptoCompare';
import * as ProviderFtx from './providers/ProviderFtx';
import * as ProviderHitBTC from './providers/ProviderHitBTC';
import * as ProviderHuobi from './providers/ProviderHuobi';
import * as ProviderKraken from './providers/ProviderKraken';
import * as ProviderKucoin from './providers/ProviderKucoin';
import * as ProviderPaymium from './providers/ProviderPaymium';
import * as ProviderPoloniex from './providers/ProviderBitPay';
import * as ProviderSatangPro from './providers/ProviderSatangPro';
import * as ProviderVccExchange from './providers/ProviderVccExchange';

export const Providers: Record<string, BaseProvider.Api> = {
  binance: new ProviderBinance.Api(),
  binanceFutures: new ProviderBinanceFutures.Api(),
  bitfinex: new ProviderBitfinex.Api(),
  bitmex: new ProviderBitMEX.Api(),
  bitpay: new ProviderBitPay.Api(),
  bitso: new ProviderBitso.Api(),
  bitstamp: new ProviderBitstamp.Api(),
  blinktrade: new ProviderBlinktrade.Api(),
  btcmarkets: new ProviderBTCMarkets.Api(),
  bxinth: new ProviderBXinTH.Api(),
  cexio: new ProviderCexio.Api(),
  coinbase: new ProviderCoinbase.Api(),
  coingecko: new ProviderCoinGecko.Api(),
  coinmarketcap: new ProviderCoinMarketCap.Api(),
  cryptocompare: new ProviderCryptoCompare.Api(),
  ftx: new ProviderFtx.Api(),
  hitbtc: new ProviderHitBTC.Api(),
  huobi: new ProviderHuobi.Api(),
  kraken: new ProviderKraken.Api(),
  kucoin: new ProviderKucoin.Api(),
  paymium: new ProviderPaymium.Api(),
  poloniex: new ProviderPoloniex.Api(),
  satangpro: new ProviderSatangPro.Api(),
  vccexchange: new ProviderVccExchange.Api(),
};

type Ticker = unknown;

export function getProvider(name: string): BaseProvider.Api {
  if (name in Providers) {
    return Providers[name];
  } else {
    throw new Error(`unknown api ${name}`);
  }
}

const filterSubscribers = (
  subscribers,
  {
    provider,
    url,
    ticker,
  }: {
    provider?: BaseProvider.Api;
    url?: string;
    ticker?: Ticker;
  },
) =>
  subscribers.filter((s) => {
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

const applySubscribers = (subscribers, func) =>
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

class PriceData {
  map = new Map();

  maxHistory = 10;

  get(ticker) {
    return (this.map.has(ticker) ? this.map : this.map.set(ticker, { values: new Map(), status: undefined })).get(
      ticker,
    );
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
  private provider: BaseProvider.Api;
  private interval: number;
  private cache = new Map();
  private priceData = new PriceData();
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

  updateUrl(url, cache?) {
    const getUrlSubscribers = () => filterSubscribers(this.subscribers, { url });

    const tickers = new Set(getUrlSubscribers().map(getSubscriberTicker));

    const processResponse = (response, date) => {
      tickers.forEach((ticker) => {
        const tickerSubscribers = filterSubscribers(getUrlSubscribers(), { ticker });
        try {
          const priceData = this.priceData.addValue(ticker, date, this.provider.parseData(response, ticker));
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

export const setSubscribers = (subscribers) => {
  subscribers = subscribers.filter(({ options }) => {
    if (options.api in Providers) {
      return true;
    }
    logError(new Error(`invalid provider ${options.api}`));
    return false;
  });

  _pollLoops.forEach((loop) => loop.setSubscribers(subscribers));
};
