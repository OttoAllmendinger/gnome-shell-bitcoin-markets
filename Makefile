SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml

GIT_VERSION := $(shell git describe --abbrev=4 --dirty --always)

SOURCE = src/*.js \
		 src/vendor/*.js \
		 src/CurrencyData.js \
		 src/ProviderBitcoinAverageExchangeData.js \
		 src/stylesheet.css \
		 src/metadata.json \
		 src/schemas/gschemas.compiled \
		 src/schemas/$(SCHEMA) \
		 src/locale/*


TRANSLATION_SOURCE=$(wildcard src/*.po)

ZIPFILE = gnome-shell-bitcoin-markets.zip

UUID = bitcoin-markets@ottoallmendinger.github.com
EXTENSION_PATH = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all schemas metadata

all: schemas archive translations

lint: src/*.js
	eslint $?

metadata:
	sed 's/_gitversion_/$(GIT_VERSION)/' src/metadata.json.in > src/metadata.json

src/CurrencyData.js:
	gjs tools/MakeCurrencyData.js > src/CurrencyData.js

src/ProviderBitcoinAverageExchangeData.js:
	gjs tools/MakeExchangeData.js > $@

src/locale/%/LC_MESSAGES/bitcoin-markets.mo: src/%.po
	mkdir -p $(dir $@)
	msgfmt src/$*.po -o $@

translations: $(TRANSLATION_SOURCE:src/%.po=src/locale/%/LC_MESSAGES/bitcoin-markets.mo)

src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

schemas: src/schemas/gschemas.compiled

schema_reset:
	gsettings --schemadir ./src/schemas/ reset-recursively \
		org.gnome.shell.extensions.bitcoin-markets

archive: schemas metadata translations $(SOURCE) $(VENDOR)
	-rm $(ZIPFILE)
	cd src/ && \
		zip -r ../$(ZIPFILE) $(patsubst src/%,%,$(SOURCE))

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)

testprefs: install
	gnome-shell-extension-prefs $(UUID)

restart: install
	gjs tools/restartShell.js
