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
    equal: "="
};

let _Colors = {
    error: '#ff0000',
};

let _Selector = function (path) {
    /**
     * returns a function that returns a nested attribute
     * path format: a.b.c.d
     */
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

let _ChangeRenderer = function (getValue)  {
    /**
     * Returns a function that returns a unicode symbol representing the change
     * in value between consecutive calls.
     */
    var lastValue;

    return function (data) {
        var ret = "=";
        var newValue = getValue(data);

        if (lastValue !== undefined) {
            if (lastValue > newValue) {
                ret = _Symbols.down;
            } else if (lastValue < newValue) {
                ret = _Symbols.down;
            }
        }

        lastValue = newValue;

        return ret;
    }
}

const MarketIndicator = new Lang.Class({
    Name: 'MarketIndicator',
    Extends: PanelMenu.Button,

    _init: function (options) {
        this.parent();
        this._options = options;
        this._initLayout();
        this._initBehavior();
    },

    _initLayout: function () {
        let layout = new St.BoxLayout();
        this._priceView = new St.Label();
        this._statusView = new St.Label({
            width: 24
            // , x_fill: true
            // , x_align: Clutter.ActorAlign.CENTER
        });
        layout.add_actor(this._statusView);
        layout.add_actor(this._priceView);
        this.actor.add_actor(layout);
    },

    _initBehavior: function () {
        let indicator = this;

        this._dataSource = _apiProvider.get(this._options.api, this._options);

        this._dataSource.onUpdateStart(function () {
            indicator._displayStatus(_Symbols.refresh);
        });

        this._dataSource.onUpdate(function (err, data) {
            if (err) {
                indicator._displayError(err);
                indicator._displayStatus(_Symbols.error);
            } else {
                indicator._renderData(data);
                indicator._renderStatus(data);
            }
        });

        this._dataSource.start();
    },

    _displayError: function (error) {
        log("err " + JSON.stringify(error));
        this._priceView.text = 'error';
    },

    _displayStatus: function (text) {
        this._statusView.text = " " + text + " ";
    },

    _renderData: function (data) {
        this._priceView.text = this._options.render(data);
    },


    _renderStatus: function (data) {
        var render = this._options.renderChange;

        if (render) {
            this._displayStatus(render(data));
        }
    }
});

let IndicatorCollection = function () {
    var indicators = [];

    this.add = function (indicator) {
        indicators.push(indicator);
        Main.panel.addToStatusArea('indicator-' + indicators.length, indicator);
    };

    this.destroy = function () {
        for (k in indicators) {
            indicators[k].destroy();
        }
    };
}

let _indicatorCollection;
let _apiProvider;

function init(metadata) {
    Convenience.initTranslations();
}

function enable() {
    _indicatorCollection = new IndicatorCollection();
    _apiProvider = new ApiProvider.ApiProvider();

    let render = new _Selector('data.last_local.display');
    let selectValueInt = new _Selector('data.last_local.value_int');

    _indicatorCollection.add(
            new MarketIndicator({
                api: 'mtgox',
                currency: 'USD',
                render: render,
                renderChange: new _ChangeRenderer(selectValueInt)
            })
    );

    _indicatorCollection.add(
            new MarketIndicator({
                api: 'mtgox',
                currency: 'EUR',
                render: render,
                renderChange: new _ChangeRenderer(selectValueInt)
            })
    );
}

function disable() {
    _indicatorCollection.destroy();
    _apiProvider.destroy();
}
