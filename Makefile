SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml

SOURCE = src/*.js \
		 src/CurrencyMap.js \
		 src/metadata.json \
		 src/schemas/gschemas.compiled \
		 src/schemas/$(SCHEMA) \
		 src/locale/*


TRANSLATION_SOURCE=$(wildcard src/*.po)

ZIPFILE = gnome-shell-bitcoin-markets.zip

UUID = bitcoin-markets@ottoallmendinger.github.com
EXTENSION_PATH = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all

all: schemas archive translations

src/CurrencyMap.js:
	gjs util/MakeCurrencyMap.js > src/CurrencyMap.js

src/locale/%/LC_MESSAGES/bitcoin-markets.mo: src/%.po
	mkdir -p $(dir $@)
	msgfmt src/$*.po -o $@

translations: $(TRANSLATION_SOURCE:src/%.po=src/locale/%/LC_MESSAGES/bitcoin-markets.mo)

src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

schemas: src/schemas/gschemas.compiled

archive: schemas translations $(SOURCE)
	-rm $(ZIPFILE)
	cd src && zip -r ../$(ZIPFILE) $(patsubst src/%,%,$(SOURCE))

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)

