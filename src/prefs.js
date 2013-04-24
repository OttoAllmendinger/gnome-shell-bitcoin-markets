const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

let extension = imports.misc.extensionUtils.getCurrentExtension();
let convenience = extension.imports.convenience;

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.bitcoin-markets';
const SETTINGS_FIRST_TIME = 'first-time';
const SETTINGS_MARKET = 'market';
const SETTINGS_CURRENCY = 'currency';


let settings;

function init() {
    log(extension);
    // convenience.initTranslations(extension);
    settings = convenience.getSettings();
}

function buildPrefsWidget() {
    let frame = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        border_width: 10
    });

    let vbox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin_left: 20
    });

    let label = new Gtk.Label({
        label: 'TODO'
    });

    frame.add(label);

    frame.show_all();

    return frame;
}
