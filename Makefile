SOURCE = src/extension.js src/ApiProvider.js \
		 src/convenience.js src/metadata.json

ZIPFILE= gnome-shell-bitcoin-markets.zip

archive: $(SOURCE)
	-rm $(ZIPFILE)
	zip -j $(ZIPFILE) $(SOURCE)
