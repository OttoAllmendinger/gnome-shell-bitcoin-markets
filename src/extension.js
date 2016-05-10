/*jshint moz:true */
// vi: sw=2 sts=2 et

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
const N_ = function(e) e;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const ApiProvider = Extension.imports.ApiProvider;

const Convenience = Extension.imports.convenience;

const INDICATORS_KEY = "indicators";
const FIRST_RUN_KEY = "first-run";


const _Symbols = {
  error: "\u26A0",
  refresh: "\u27f3",
  up: "\u25b2",
  down: "\u25bc",
  unchanged: " ",
};

const _Colors = {
  error: '#ff0000',
};

const _Defaults = [
  {
    api: 'bitcoinaverage',
    currency: 'USD',
    attribute: 'last'
  }
];


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

    this._indicatorView = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      style_class: "indicator"
    });

    this._statusView = new St.Label({
      y_align: Clutter.ActorAlign.CENTER,
      style_class: "status"
    });

    layout.add_actor(this._statusView);
    layout.add_actor(this._indicatorView);

    this.actor.add_actor(layout);

    this._popupMenu = new PopupMenu.PopupMenuItem(_('Settings'));
    this.menu.addMenuItem(this._popupMenu);
    this._popupMenu.connect('activate', function() {
      let app_sys = Shell.AppSystem.get_default();
      let prefs = app_sys.lookup_app('gnome-shell-extension-prefs.desktop');
      if (prefs.get_state() == prefs.SHELL_APP_STATE_RUNNING)
        prefs.activate();
      else
        prefs.get_app_info().launch_uris(['extension:///' + Extension.metadata.uuid], null);
    });
  },

  _initBehavior: function () {
    let indicator = this;

    this._model = _apiProvider.get(this._options.api).getModel(this._options);

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

    this._displayStatus(_Symbols.refresh);
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

    let symbol = " ";

    if (this._options.show_change) {
      symbol = _StatusToSymbol[data.change];
    }

    this._displayStatus(symbol);
  },

  _displayStatus: function (text) {
    this._statusView.text = text;
  },

  _displayText: function (text) {
    this._indicatorView.text = text;
  },

  destroy: function () {
    this._model.destroy();
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

    if (this._settings.get_boolean(FIRST_RUN_KEY)) {
      this._initDefaults();
      this._settings.set_boolean(FIRST_RUN_KEY, false);
    }

    this._settingsChangedId = this._settings.connect(
      'changed::' + INDICATORS_KEY,
      Lang.bind(this, this._createIndicators)
    );

    this._createIndicators();
  },

  _initDefaults: function () {
    this._settings.set_strv(INDICATORS_KEY, _Defaults.map(JSON.stringify));
  },

  _createIndicators: function () {
    this._removeAll();

    this._settings.get_strv(INDICATORS_KEY).forEach(function (i) {
      try {
        this.add(new MarketIndicatorView(JSON.parse(i)));
      } catch (e) {
        log("error creating indicator: " + e);
      }
    }, this);
  },

  _removeAll: function () {
    this._indicators.forEach(function (i) i.destroy());
    this._indicators = [];
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
