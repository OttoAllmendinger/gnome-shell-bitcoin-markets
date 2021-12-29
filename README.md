![Screenshot](https://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets/blob/master/data/screenshot.png?raw=true)

Displays Bitcoin and Altcoin market information in the Gnome Shell.

Available APIs:

- BTCMarkets
- Binance
- Binance Futures
- BitMEX
- BitPay
- BitPay
- Bitfinex
- Bitso
- Bitstamp
- Bittrex
- Buda
- CEX.IO
- CoinGecko
- Coinbase
- CryptoCompare
- FTX exchange
- HitBTC
- Huobi
- Kraken
- Kucoin
- Paymium
- Satang.pro
- TomoX(TomoChain)
- VccExchange(Vietnam)

## Installation

### Via extensions.gnome.org

The latest reviewed version can be found at
https://extensions.gnome.org/extension/648/bitcoin-markets/

### Via github.com

The latest development version can be installed manually with these commands

        git clone https://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets.git
        cd gnome-shell-bitcoin-markets
        make install

Then go to https://extensions.gnome.org/local/ to turn on the extension or use
gnome-tweak-tool.

## Format options

### Base options

| option | result                                       |
| ------ | -------------------------------------------- |
| b      | base currency code                           |
| bs     | base currency symbol \|\| base currency code |
| btc    | btc symbol                                   |

### Value options

| option         | result                                  |
|----------------|-----------------------------------------|
| v              | value                                   |
| mv             | value divided by 1000                   |
| kv             | value multiplied by 1000                |
| satv           | value multiplied by 1e8                 |
| (m\            | k\                                      |sat)v0 | value with 0 decimals                   |
| (m\            | k\                                      |sat)v1 | value with 1 decimals                   |
| (m\            | k\                                      |sat)v2 | value with 2 decimals                   |
| ...            | ...                                     |
| (m\            | k\                                      |sat)v8 | value with 8 decimals                   |
| raw            | raw value without additional formatting |
| moscow         | moscow time                             |
| moscow!segment | moscow time as segment characters       |

### Quote options

| option | result                                         |
| ------ | ---------------------------------------------- |
| q      | quote currency code                            |
| qs     | quote currency symbol \|\| quote currency code |

## Development

With `make restart` the gnome-shell can be restarted during development iterations.

On most systems you can use `journalctl /usr/bin/gnome-shell -f` to get log output from this (and other) extensions.

## Contributors

- https://github.com/filidorwiese - Altcoin support, CoinMarketCap and Poloniex support
- https://github.com/fearenales - Popup settings implementation, BTCChina support
- https://github.com/b00bl1k - WEX support
- https://github.com/osiux - Bitso support
- https://github.com/brunobertoldi - Bitfinex support
- https://github.com/eloo - Kraken support
- https://github.com/plehatron - CEX.io support
- https://github.com/h6w - BTCMarkets.net support
- https://github.com/vecr25 - Binance support
- https://github.com/joaoescribano - CoinGecko support
- https://github.com/volandku - BitMEX support
- https://github.com/HawtDogFlvrWtr - CryptoCompare support
- https://github.com/jpereira - Blinktrade support
- https://github.com/rossigee - BX.in.th and Satang.pro support
- https://github.com/WeirdFishBK201 - Huobi support
- https://github.com/thanhnguyennguyen - HitBTC, Kucoin, VccExchange, BinanceFutures, FTX and Tomo support
- https://github.com/luissantos - Bittrex support
- https://github.com/omerta - Buda support

## Tips

Bitcoin 3MuUGXgSyZXdqdgn6V4VxGBR3dtA92w1C1
