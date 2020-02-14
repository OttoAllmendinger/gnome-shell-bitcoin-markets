/*jshint moz:true */
// vi: sw=2 sts=2 et

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const HTTP = Local.imports.HTTP;


const {
  ProviderBinance,
  ProviderBinanceFutures,
  ProviderBitcoinAverage,
  ProviderBitfinex,
  ProviderBitMEX,
  ProviderBitPay,
  ProviderBitso,
  ProviderBitstamp,
  ProviderBlinktrade,
  ProviderBTCMarkets,
  ProviderBXinTH,
  ProviderCexio,
  ProviderCoinbase,
  ProviderCoinGecko,
  ProviderCoinMarketCap,
  ProviderCryptoCompare,
  ProviderFtx,
  ProviderHitBTC,
  ProviderHuobi,
  ProviderKraken,
  ProviderKucoin,
  ProviderPaymium,
  ProviderPoloniex,
  ProviderSatangPro,
  ProviderVccExchange,
} = Local.imports;

const Providers = {
  binance: new ProviderBinance.Api(),
  binanceFutures: new ProviderBinanceFutures.Api(),
  bitcoinaverage: new ProviderBitcoinAverage.Api(),
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

const getProvider = (name) => {
  if (name in Providers) {
    return Providers[name];
  } else {
    throw new Error(`unknown api ${name}`);
  }
};


const filterSubscribers = (subscribers, { provider, url, ticker }) =>
  subscribers.filter(s => {
    const { options } = s;
    if ((provider !== undefined) && getProvider(options.api) !== provider) {
      return false;
    }
    if ((url !== undefined) && getSubscriberUrl(s) !== url) {
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
  subscribers.forEach(s => {
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



function PriceData() {
  return {
    map: new Map(),

    maxHistory: 10,

    get(ticker) {
      return (
        this.map.has(ticker)
          ? this.map
          : this.map.set(ticker, { values: new Map(), status: undefined })
      ).get(ticker)
    },

    addValue(ticker, date, value) {
      if (isNaN(value)) {
        throw new Error(`invalid price value ${value}`);
      }
      const { values } = this.get(ticker);
      values.set(date, value);

      const keys = [...values.keys()].sort((a, b) => b - a);
      keys.splice(this.maxHistory).forEach(k => values.delete(k));

      return keys.map(k => ({ date: k, value: values.get(k) }));
    }
  };
}


const getSubscriberUrl = ({ options }) =>
  getProvider(options.api).getUrl(options);

const getSubscriberTicker = ({ options }) =>
  getProvider(options.api).getTicker(options);


function PollLoop(provider) {
  const interval = Number(provider.interval);
  if (isNaN(interval) || interval < 5) {
    throw new Error(`invalid interval for ${provider}: ${provider.interval}`);
  }

  return {
    provider,

    cache: new Map(),

    priceData: new PriceData(),

    signal: null,

    start() {
      if (this.signal === null) {
        this.signal = Mainloop.idle_add(this.run.bind(this));
        return true;
      }
    },

    stop() {
      if (this.signal !== null) {
        Mainloop.source_remove(this.signal);
        this.signal = null;
      }
    },

    run() {
      try {
        this.update();
      } catch (e) {
        logError(e);
      }

      this.signal = Mainloop.timeout_add_seconds(
        interval, this.run.bind(this)
      );
    },

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

      this.urls.forEach(url => this.updateUrl(url, this.cache.get(url)));
    },

    updateUrl(url, cache) {
      const getUrlSubscribers = () =>
        filterSubscribers(this.subscribers, { url });

      const tickers = new Set(getUrlSubscribers().map(getSubscriberTicker));

      const processResponse = (response, date) => {
        tickers.forEach(ticker => {
          const tickerSubscribers = filterSubscribers(getUrlSubscribers(), { ticker });
          try {
            const priceData = this.priceData.addValue(
              ticker, date, this.provider.parseData(response, ticker)
            );
            applySubscribers(tickerSubscribers, s => s.onUpdatePriceData(priceData));
          } catch (e) {
            e.message = `Error updating ${url}: ${e.message}`;
            applySubscribers(tickerSubscribers, s => s.onUpdateError(e, { ticker }));
            logError(e);
          }
        });
      };

      if (cache) {
        return processResponse(cache.response, cache.date);
      }

      applySubscribers(getUrlSubscribers(), s => s.onUpdateStart());

      this.provider.fetch(url)
        .then(response => {
          const date = new Date();
          this.cache.set(url, { date, response });
          processResponse(response, date);
        })
        .catch(e => {
          logError(e);
          applySubscribers(getUrlSubscribers(), s => s.onUpdateError(e));
          this.cache.delete(url);
        });
    },

    update() {
      const lastUpdate = (url) =>
        this.cache.has(url)
          ? this.cache.get(url).date
          : undefined;

      const updateUrls = this.urls
        .filter(url => lastUpdate(url) === undefined);

      const oldestUrl = this.urls
        .filter(url => lastUpdate(url) !== undefined)
        .sort((a, b) => lastUpdate(a) - lastUpdate(b))[0]

      if (oldestUrl) {
        updateUrls.push(oldestUrl);
      }

      updateUrls.forEach(url => this.updateUrl(url));
    }
  };
}


const _pollLoops = new Map(
  Object.keys(Providers).map(k => [k, new PollLoop(Providers[k])])
);


const setSubscribers = (subscribers) => {
  subscribers = subscribers.filter(({ options }) => {
    if (options.api in Providers) {
      return true;
    }
    logError(new Error(`invalid provider ${options.api}`));
    return false;
  });

  _pollLoops.forEach(loop => loop.setSubscribers(subscribers));
};


const dumpProvidersToStdout = () => {
  if (dumpProvidersToStdout) {
    Object.keys(Providers).forEach((key) => {
      print(`* ${getProvider(key).apiName}`);
    });
  }
}

// dumpProvidersToStdout();
