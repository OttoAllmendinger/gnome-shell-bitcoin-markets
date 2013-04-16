![Screenshot](https://raw.github.com/OttoAllmendinger/gnome-shell-bitcoin-markets/master/data/screenshot.png)

Displays bitcoin market information in the gnome shell. Currently only shows
last MtGox trades.

## Installation

### Via extensions.gnome.org

The latest reviewed version can be found at
https://extensions.gnome.org/extension/648/bitcoin-markets/

### Via github.com

The latest development version can be installed manually with these commands

        cd && git clone https://github.com/OttoAllmendinger/gnome-shell-bitcoin-markets.git
        cd ~/.local/share/gnome-shell/extensions
        ln -s ~/gnome-shell-bitcoin-markets/src bitcoin-markets@ottoallmendinger.github.com

Then go to https://extensions.gnome.org/local/ to turn on the extension or use
gnome-tweak-tool.

## TODO

* Show tooltip info (last refresh, buy/sell prices)
* Add markets besides MtGox
* Charts

Tip address 1645A1qhW3FHxr2JLdqLuYGQ6QSmN5BbNS
