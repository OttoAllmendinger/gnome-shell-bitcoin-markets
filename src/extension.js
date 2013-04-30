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
const Extension = ExtensionUtils.getCurrentExtension();

const ApiProvider = Extension.imports.ApiProvider;

const Convenience = Extension.imports.convenience;

const INDICATORS_KEY = "indicators";


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
        this.parent(0);
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

        /*
        this._tooltip = new PopupMenu.PopupMenuItem("tooltip");
        this.menu.addMenuItem(this._tooltip);
        */
    },

    _initBehavior: function () {
        let indicator = this;

        this._model = _apiProvider.get(this._options.api, this._options);

        this._model.connect("update-start", function () {
            indicator._displayStatus(_Symbols.refresh);
        });

        this._model.connect("update", function (obj, err, data) {
            if (err) {
                indicator._showError(err);
            } else {
                indicator._showData(data);
            }
        });
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
    },

    destroy: function () {
        this._model.disconnectAll();
        this._indicatorView.destroy();
        this._statusView.destroy();

        this.parent();
    }
});

let IndicatorCollection = new Lang.Class({
    Name: "IndicatorCollection",

    _init: function () {
        this._indicators = [];
        this._settings = Convenience.getSettings();

        this._settingsChangedId = this._settings.connect(
            'changed::' + INDICATORS_KEY,
            Lang.bind(this, this._createIndicators)
        );

        this._createIndicators();
    },

    _createIndicators: function () {
        this._removeAll();

        this._settings.get_strv(INDICATORS_KEY).forEach(function (i) {
            this.add(new MarketIndicatorView(JSON.parse(i)));
        }, this);
    },

    _removeAll: function () {
        this._indicators.forEach(function (i) {
            i.destroy();
        });
    },

    add: function (indicator) {
        this._indicators.push(indicator);
        let name = 'bitcoin-market-indicator-' + this._indicators.length;
        Main.panel.addToStatusArea(name, indicator);
    },

    destroy: function () {
        this._removeAll();
        this._settings.disconnect(this._settingsChangedId);
    }
});

let _indicatorCollection;
let _apiProvider;

function init(metadata) {
    Convenience.initTranslations();
}

function enable() {
    _apiProvider = new ApiProvider.ApiProvider();
    _indicatorCollection = new IndicatorCollection();
}

function disable() {
    _indicatorCollection.destroy();
    _apiProvider.destroy();
}
