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


let _marketProvider = new MarketProvider.MarketProvider();

let _selector = function (path) {
    return function (obj) {
        return path.split('.').reduce(function (obj, key) {
            if (obj[key]) {
                return obj[key];
            } else {
                throw new Error('invalid path: ' + path);
            }
        }, obj);
    };
}

const MarketIndicator = new Lang.Class({
    Name: 'MarketIndicator',
    Extends: PanelMenu.Button,

    _init: function (options) {
        this.parent();

        this._options = options;

        this._pollInterval = 30;
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
        this._pollLoop();
    },

    _pollLoop: function () {
        _marketProvider.poll(
            this._options,
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
        this._priceView.text = this._options.render(data);
    },

    destroy: function () {
        Mainloop.source_remove(this._timeoutUpdateDisplay);

        PanelMenu.Button.prototype.destroy.apply(this);
    }
});

let IndicatorCollection = function () {
    var indicators = [];

    this.add = function (indicator) {
        indicators.push(indicator);
        Main.panel.addToStatusArea('indicator-' + indicators.length, indicator);
    };

    this.destroy = function () {
        for (i in indicators) {
            i.destroy();
        }
    };
}

let _indicatorCollection = new IndicatorCollection();

function init(metadata) {
    Convenience.initTranslations();
}

function enable() {
    /*
    _indicatorCollection.add(
            new MarketIndicator({
                market: 'mtgox',
                currency: 'USD',
                render: _selector('data.last_local.display')
            })
    );

    _indicatorCollection.add(
            new MarketIndicator({
                market: 'mtgox',
                currency: 'EUR',
                render: _selector('data.last_local.display')
            })
    );
    */

    /*
    _indicatorCollection.add(
            new MarketIndicator({
                market: 'bitcoin24',
                currency: 'EUR',
                render: _selector('data.last_local.display')
            })
    );
    */
}

function disable() {
    _indicatorCollection.destroy();
}
