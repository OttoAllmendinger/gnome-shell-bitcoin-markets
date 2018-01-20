SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml

GIT_VERSION := $(shell git describe --abbrev=4 --dirty --always)

SOURCE = src/*.js \
		 src/CurrencyData.js \
		 src/ProviderBitcoinAverageExchangeData.js \
		 src/ProviderKrakenAssetPairs.js \
		 src/stylesheet.css \
		 src/metadata.json \
		 src/schemas/gschemas.compiled \
		 src/schemas/$(SCHEMA) \
		 src/locale/*

VENDOR = src/vendor/*.js


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
	gjs util/MakeCurrencyData.js > src/CurrencyData.js

src/ProviderBitcoinAverageExchangeData.js:
	gjs util/MakeExchangeData.js > $@

src/ProviderKrakenAssetPairs.js:
	gjs util/MakeProviderKrakenAssetPairs.js > src/ProviderKrakenAssetPairs.js

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
	cd src/vendor/ && \
		zip -r ../../$(ZIPFILE) $(patsubst src/vendor/%,%,$(VENDOR))

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)

testprefs: install
	gnome-shell-extension-prefs $(UUID)

restart: install
	gjs util/restartShell.js
