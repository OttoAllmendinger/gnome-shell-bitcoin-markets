const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

const ApiProvider = Extension.imports.ApiProvider;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.bitcoin-markets';
const SETTINGS_FIRST_TIME = 'first-time';
const SETTINGS_MARKET = 'market';
const SETTINGS_CURRENCY = 'currency';


let _settings;

let initSettings = function () {
    _settings = Extension.getSettings();
}

let _defaults = [
    {
        api: 'mtgox',
        currency: 'USD',
        attribute: 'last_local'
    }, {
        api: 'mtgox',
        currency: 'EUR',
        attribute: 'last_local'
    }
];

const BitcoinMarketsSettingsWidget = new GObject.Class({
    Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
    GTypeName: "BitcoinMarketsSettingsWidget",
    Extends: Gtk.Grid,

    _init: function (params) {
        this.parent(params);

        this.margin = 10;
        this.orientation = Gtk.Orientation.VERTICAL;

        this.add(new Gtk.Label({label: _("API Provider")}));

        for (let i=0; i < 10; i++) {
            this.attach(
                new Gtk.Label({label: _("foo " + i)}),
                i, 2, 1, 1);

        }
    }
});

function init() {
    initSettings();
    Convenience.initTranslations();
}


function buildPrefsWidget() {
    let widget = new BitcoinMarketsSettingsWidget();

    widget.show_all();

    return widget;
}
