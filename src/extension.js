// vi: sw=4 sts=4 et

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GnomeDesktop = imports.gi.GnomeDesktop;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e };

const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();

const Convenience = extension.imports.convenience;
const MarketProvider = extension.imports.MarketProvider;


/**
 * TODO: use WebSockets for MtGox streaming api
 * Depends on libsoup websocket support
 * https://github.com/djdeath/libsoup
 *
 * or pure JS impl
 */



const BitcoinMarkets = new Lang.Class({
    Name: 'BitcoinMarkets',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent();

        this._pollInterval = 5;
        this._pollLoopContinue = true;

        this._initLayout();
        this._initBehavior();
    },

    _initLayout: function () {
        let layout = new St.BoxLayout();
        this._priceView = new St.Label({text: "..."});
        layout.add_actor(this._priceView);
        this.actor.add_actor(layout);
    },

    _initBehavior: function () {
        let ext = this;

        this._marketProvider = new MarketProvider.MarketProvider();

        this._pollLoop();
    },

    _getPollOptions: function () {
        return {
            market: "mtgox",
            currency: "USD"
        }
    },

    _pollLoop: function () {
        this._marketProvider.poll(
            this._getPollOptions(),
            Lang.bind(this, function (err, res) {
                if (err) {
                    this._displayError(err);
                } else {
                    this._displayUpdate(res);
                }

                if (this._pollLoopContinue) {
                    this._timeoutUpdateDisplay = Mainloop.timeout_add_seconds(
                            this._pollInterval,
                            Lang.bind(this, this._pollLoop)
                    );
                }
            }
            )
        );
    },

    _displayError: function (error) {
        this._priceView.text = 'error';
    },

    _displayUpdate: function (data) {
        this._priceView.text = data.last_all.display;
    },

    destroy: function () {
        Mainloop.source_remove(this._timeoutUpdateDisplay);

        PanelMenu.Button.prototype.destroy.apply(this)
    }
});

function init(metadata) {
    Convenience.initTranslations();
}

let _bitcoinMarkets;

function enable() {
    _bitcoinMarkets = new BitcoinMarkets();
    Main.panel.addToStatusArea('display', _bitcoinMarkets);
}

function disable() {
    if (_bitcoinMarkets) {
        _bitcoinMarkets.destroy();
    }
}
