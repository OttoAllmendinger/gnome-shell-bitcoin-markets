const Lang = imports.lang

const Local = imports.misc.extensionUtils.getCurrentExtension()
const BaseProvider = Local.imports.BaseProvider

const Api = new Lang.Class({
  Name: 'CoinMarketCap.Api',
  Extends: BaseProvider.Api,

  apiName: 'CoinMarketCap',

  currencies: [
    'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF',
    'IDR', 'ILS', 'INR', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PKR', 'PLN',
    'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'USD', 'ZAR'
  ],

  // Top 100 coins
  coins: [
    'ADA', 'AE', 'AGI', 'AION', 'ARDR', 'ARK', 'BAT', 'BCH', 'BCN', 'BNB', 'BNT', 'BTC', 'BTG', 'BTM', 'BTS', 'BTX', 'CND',
    'CNX', 'CVC', 'DASH', 'DCN', 'DCR', 'DENT', 'DGB', 'DGD', 'DOGE', 'DRGN', 'ELF', 'EMC', 'ENG', 'EOS', 'ETC', 'ETH', 'ETHOS',
    'ETN', 'FCT', 'FUN', 'GAS', 'GBYTE', 'GNT', 'GXS', 'HSR', 'ICX', 'IOST', 'KCS', 'KIN', 'KMD', 'KNC', 'LRC', 'LSK', 'LTC',
    'MAID', 'MIOTA', 'MKR', 'MONA', 'NAS', 'NEO', 'NXS', 'NXT', 'OMG', 'PART', 'PAY', 'PIVX', 'PLR', 'POWR', 'PPT', 'QASH',
    'QSP', 'QTUM', 'R', 'RDD', 'REP', 'REQ', 'RHOC', 'SALT', 'SC', 'SMART', 'SNT', 'STEEM', 'STRAT', 'SYS', 'TRX', 'USDT',
    'VEN', 'VERI', 'WAVES', 'WTC', 'X', 'XEM', 'XLM', 'XMR', 'XPA', 'XRB', 'XRP', 'XVG', 'XZC', 'ZCL', 'ZEC', 'ZIL', 'ZRX'
  ],

  // Id needed to call the ticker
  symbolToIdMap: {
    'ADA': 'cardano',
    'AE': 'aeternity',
    'AGI': 'singularitynet',
    'AION': 'aion',
    'ARDR': 'ardor',
    'ARK': 'ark',
    'BAT': 'basic-attention-token',
    'BCH': 'bitcoin-cash',
    'BCN': 'bytecoin-bcn',
    'BNB': 'binance-coin',
    'BNT': 'bancor',
    'BTC': 'bitcoin',
    'BTG': 'bitcoin-gold',
    'BTM': 'bytom',
    'BTS': 'bitshares',
    'BTX': 'bitcore',
    'CND': 'cindicator',
    'CNX': 'cryptonex',
    'CVC': 'civic',
    'DASH': 'dash',
    'DCN': 'dentacoin',
    'DCR': 'decred',
    'DENT': 'dent',
    'DGB': 'digibyte',
    'DGD': 'digixdao',
    'DOGE': 'dogecoin',
    'DRGN': 'dragonchain',
    'ELF': 'aelf',
    'EMC': 'emercoin',
    'ENG': 'enigma-project',
    'EOS': 'eos',
    'ETC': 'ethereum-classic',
    'ETH': 'ethereum',
    'ETHOS': 'ethos',
    'ETN': 'electroneum',
    'FCT': 'factom',
    'FUN': 'funfair',
    'GAS': 'gas',
    'GBYTE': 'byteball',
    'GNT': 'golem-network-tokens',
    'GXS': 'gxshares',
    'HSR': 'hshare',
    'ICX': 'icon',
    'IOST': 'iostoken',
    'KCS': 'kucoin-shares',
    'KIN': 'kin',
    'KMD': 'komodo',
    'KNC': 'kyber-network',
    'LRC': 'loopring',
    'LSK': 'lisk',
    'LTC': 'litecoin',
    'MAID': 'maidsafecoin',
    'MIOTA': 'iota',
    'MKR': 'maker',
    'MONA': 'monacoin',
    'NAS': 'nebulas-token',
    'NEO': 'neo',
    'NXS': 'nexus',
    'NXT': 'nxt',
    'OMG': 'omisego',
    'PART': 'particl',
    'PAY': 'tenx',
    'PIVX': 'pivx',
    'PLR': 'pillar',
    'POWR': 'power-ledger',
    'PPT': 'populous',
    'QASH': 'qash',
    'QSP': 'quantstamp',
    'QTUM': 'qtum',
    'R': 'revain',
    'RDD': 'reddcoin',
    'REP': 'augur',
    'REQ': 'request-network',
    'RHOC': 'rchain',
    'SALT': 'salt',
    'SC': 'siacoin',
    'SMART': 'smartcash',
    'SNT': 'status',
    'STEEM': 'steem',
    'STRAT': 'stratis',
    'SYS': 'syscoin',
    'TRX': 'tron',
    'USDT': 'tether',
    'VEN': 'vechain',
    'VERI': 'veritaseum',
    'WAVES': 'waves',
    'WTC': 'walton',
    'XEM': 'nem',
    'XLM': 'stellar',
    'XMR': 'monero',
    'XP': 'experience-points',
    'XPA': 'xplay',
    'XRB': 'raiblocks',
    'XRP': 'ripple',
    'XVG': 'verge',
    'XZC': 'zcoin',
    'ZCL': 'zclassic',
    'ZEC': 'zcash',
    'ZIL': 'zilliqa',
    'ZRX': '0x'
  },

  interval: 60, // unclear, should be safe

  attributes: {
    last: function (options) {
      const renderCurrency = BaseProvider.CurrencyRenderer(options)
      const renderChange = BaseProvider.ChangeRenderer()
      const key = `price_${options.currency.toLowerCase()}`

      return {
        text: (data) => renderCurrency(data[0][key]),
        change: (data) => renderChange(data[0][key])
      }
    }
  },

  getLabel: function (options) {
    return 'CoinMarketCap ' + options.currency + '/' + options.coin
  },

  getUrl: function (options) {
    const coinId = this.symbolToIdMap[options.coin]
    return `https://api.coinmarketcap.com/v1/ticker/${coinId.toLowerCase()}/?convert=${options.currency.toUpperCase()}`
  }
})
