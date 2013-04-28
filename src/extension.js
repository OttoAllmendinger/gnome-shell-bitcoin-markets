// vi: sw=4 sts=4 et

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GnomeDesktop = imports.gi.GnomeDesktop;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

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
const ApiProvider = extension.imports.ApiProvider;


/**
 * TODO: use WebSockets for MtGox streaming api
 * Depends on libsoup websocket support
 * https://github.com/djdeath/libsoup
 *
 * or pure JS impl
 */

let _Symbols = {
    error: "\u26A0",
    refresh: "\u27f2",
    up: "\u25b2",
    down: "\u25bc",
};

let _Colors = {
    error: '#ff0000',
};

const MarketIndicatorView = new Lang.Class({
    Name: 'MarketIndicatorView',
    Extends: PanelMenu.Button,

    _init: function (options) {
        this.parent();
        this._options = options;
        this._initLayout();
        this._initBehavior();
    },

    _initLayout: function () {
        let layout = new St.BoxLayout();
        this._indicatorView = new St.Label();
        this._statusView = new St.Label({
            width: 24
            // , x_fill: true
            // , x_align: Clutter.ActorAlign.CENTER
        });
        layout.add_actor(this._statusView);
        layout.add_actor(this._indicatorView);
        this.actor.add_actor(layout);
    },

    _initBehavior: function () {
        let indicator = this;

        this._model = _apiProvider.get(this._options.api, this._options);

        this._model.onUpdateStart(function () {
            indicator._displayStatus(_Symbols.refresh);
        });

        this._model.onUpdate(function (err, data) {
            if (err) {
                indicator._showError(err);
            } else {
                indicator._showData(data);
            }
        });

        this._model.start();
    },

    _showError: function (error) {
        log("err " + JSON.stringify(error));
        this._displayText('error');
        this._displayStatus(_Symbols.error);
    },

    _showData: function (data) {
        let _StatusToSymbol = {
            up: _Symbols.up,
            down: _Symbols.down,
            unchanged: " "
        };

        this._displayText(data.text);
        this._displayStatus(_StatusToSymbol[data.change]);
    },

    _displayStatus: function (text) {
        this._statusView.text = " " + text + " ";
    },

    _displayText: function (text) {
        this._indicatorView.text = text;
    }
});

let IndicatorCollection = function () {
    var indicators = [];

    this.add = function (indicator) {
        indicators.push(indicator);
        Main.panel.addToStatusArea('indicator-' + indicators.length, indicator);
    };

    this.destroy = function () {
        for (let k in indicators) {
            indicators[k].destroy();
        }
    };
}

let _indicatorCollection;
let _apiProvider;
let _settings;

function init(metadata) {
    Convenience.initTranslations();
    _settings = Convenience.getSettings();
}

let _defaults = [
    {
        api: 'mtgox',
        currency: 'USD',
        attribute: 'last_local'
    } /*
    , {
        api: 'mtgox',
        currency: 'EUR',
        attribute: 'last_local'
    } */
];

function enable() {
    _indicatorCollection = new IndicatorCollection();
    _apiProvider = new ApiProvider.ApiProvider();

    for (let k in _defaults) {
        _indicatorCollection.add(
            new MarketIndicatorView(_defaults[k])
        );
    }
}

function disable() {
    _indicatorCollection.destroy();
    _apiProvider.destroy();
}
