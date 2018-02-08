![Screenshot](https://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets/blob/master/data/screenshot.png?raw=true)

Displays Bitcoin and Altcoin market information in the Gnome Shell.


Available APIs:

* Binance
* BitcoinAverage.com
* BitStamp
* Bitfinex
* BitPay
* Poloniex
* CEX.IO
* Coinbase
* BX.in.th
* Kraken
* Paymium
* BTCChina
* Bitso
* WEX
* BTCMarkets.net
* Binance


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
gnome-tweak-tool. With `make restart` the gnome-shell can be restarted during development iterations.
On most systems you can use `journalctl /usr/bin/gnome-shell -f -o cat` to get log output from this (and other) extensions. 


## Contributors

* https://github.com/filidorwiese - Altcoin support, CoinMarketCap and Poloniex support
* https://github.com/fearenales - Popup settings implementation, BTCChina support
* https://github.com/b00bl1k - WEX support
* https://github.com/osiux - Bitso support
* https://github.com/brunobertoldi - Bitfinex support
* https://github.com/eloo - Kraken support
* https://github.com/plehatron -- CEX.io support
* https://github.com/h6w - BTCMarkets.net support
* https://github.com/vecr25 - Binance support

## TODO

* Charts

Tip address 1645A1qhW3FHxr2JLdqLuYGQ6QSmN5BbNS
