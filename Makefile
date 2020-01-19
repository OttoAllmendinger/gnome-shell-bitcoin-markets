NAME = gnome-shell-bitcoin-markets
UUID = bitcoin-markets@ottoallmendinger.github.com
SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml
LANGUAGES = de es pt_BR

include gselib/make/gnome-shell-extension.mk

exchange_data:
	gjs tools/MakeExchangeData.js > src/ProviderBitcoinAverageExchangeData.js
