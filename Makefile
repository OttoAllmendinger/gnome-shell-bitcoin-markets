SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml

SOURCE = src/*.js \
		 src/metadata.json \
		 src/schemas/gschemas.compiled \
		 src/schemas/$(SCHEMA) \
		 src/locale/*

ZIPFILE = gnome-shell-bitcoin-markets.zip


.PHONY: all

all: schemas archive

locale: src/*.po

src/%.po:
	msgfmt src/$*.po -o src/locale/$*/LC_MESSAGES/bitcoin-markets.mo

src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

schemas: src/schemas/gschemas.compiled

archive: $(SOURCE)
	-rm $(ZIPFILE)
	cd src && zip -r ../$(ZIPFILE) $(patsubst src/%,%,$(SOURCE))

