SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml

SOURCE = src/*.js \
		 src/metadata.json \
		 src/schemas/gschemas.compiled \
		 src/schemas/$(SCHEMA)

ZIPFILE = gnome-shell-bitcoin-markets.zip


.PHONY: all

all: schemas archive


src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

schemas: src/schemas/gschemas.compiled

archive: $(SOURCE)
	-rm $(ZIPFILE)
	cd src && zip ../$(ZIPFILE) $(patsubst src/%,%,$(SOURCE))

