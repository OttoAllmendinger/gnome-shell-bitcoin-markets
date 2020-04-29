NAME = gnome-shell-bitcoin-markets
UUID = bitcoin-markets@ottoallmendinger.github.com
SCHEMA = org.gnome.shell.extensions.bitcoin-markets.gschema.xml
LANGUAGES = de es pt_BR

all: update_dependencies
	make archive

update_dependencies:
	git submodule update --init

-include gselib/make/gnome-shell-extension.mk
