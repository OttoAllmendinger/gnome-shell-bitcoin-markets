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
const N_ = (e) => e;

const Local = imports.misc.extensionUtils.getCurrentExtension();

const ApiProvider = Local.imports.ApiProvider;

const Convenience = Local.imports.convenience;

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
    coin: 'BTC',
    attribute: 'last',
    show_change: true,
    show_base_currency: false
  }
];


const MarketIndicatorView = new Lang.Class({
  Name: 'MarketIndicatorView',
  Extends: PanelMenu.Button,

  _init: function (options) {
    this.parent(0);
    this._options = options;
    this._api = _apiProvider.get(options.api);
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

    this._popupItemStatus = new PopupMenu.PopupMenuItem(
      "", {activate: false, hover: false, can_focus: false}
    );
    this._popupItemStatus.label.set_style("max-width: 12em;");
    this._popupItemStatus.label.clutter_text.set_line_wrap(true);
    this.menu.addMenuItem(this._popupItemStatus);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._popupItemSettings = new PopupMenu.PopupMenuItem(_('Settings'));
    this.menu.addMenuItem(this._popupItemSettings);
    this._popupItemSettings.connect('activate', () => {
      let app_sys = Shell.AppSystem.get_default();
      let prefs = app_sys.lookup_app('gnome-shell-extension-prefs.desktop');
      if (prefs.get_state() == prefs.SHELL_APP_STATE_RUNNING) {
        prefs.activate();
      } else {
        prefs
          .get_app_info()
          .launch_uris(['extension:///' + Local.metadata.uuid], null);
      }
    });
  },

  _initBehavior: function () {
    this._model = this._api.getModel(this._options);

    this._model.connect("update-start", () => {
      this._displayStatus(_Symbols.refresh);
    });

    this._model.connect("update", (obj, err, data) => {
      if (err) {
        this._showError(err);
      } else {
        this._showData(data);
      }

      this._updatePopupItemLabel(err, data);
    });


    this._displayStatus(_Symbols.refresh);
  },

  _showError: function (error) {
    log("err " + JSON.stringify(error));
    this._displayText('error');
    this._displayStatus(_Symbols.error);
    this._popupItemStatus.text = "error";
  },

  _showData: function (data) {
    let _StatusToSymbol = {
      up: _Symbols.up,
      down: _Symbols.down,
      unchanged: " "
    };

    let {text} = data;
    if (this._options.show_base_currency) {
      text += "/" + this._options.coin;
    }
    this._displayText(text);

    let symbol = " ";

    if (this._options.show_change) {
      symbol = _StatusToSymbol[data.change];
      this._displayStatus(symbol);
    } else {
      this._statusView.width = 0;
    }
  },

  _displayStatus: function (text) {
    this._statusView.text = text;
  },

  _displayText: function (text) {
    this._indicatorView.text = text;
  },

  _updatePopupItemLabel: function (err, data) {
    let text = this._api.getLabel(this._options);
    if (err) {
      text += "\n\nError:\n" + String(err);
    }
    this._popupItemStatus.label.text = text;
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
    } else {
      this._upgradeSettings();
    }

    this._settingsChangedId = this._settings.connect(
      'changed::' + INDICATORS_KEY,
      this._createIndicators.bind(this)
    );

    this._createIndicators();
  },

  _initDefaults: function () {
    this._settings.set_strv(INDICATORS_KEY, _Defaults.map(JSON.stringify));
  },

  _upgradeSettings: function () {
    const applyDefaults = (options) => {
      if (options.coin === undefined) {
        options.coin = 'BTC';
      }
      return options;
    };
    let updated = this._settings.get_strv(INDICATORS_KEY)
      .map(JSON.parse)
      .map(applyDefaults);
    this._settings.set_strv(INDICATORS_KEY, updated.map(JSON.stringify));
  },

  _createIndicators: function () {
    this._removeAll();

    this._settings.get_strv(INDICATORS_KEY)
      .map(JSON.parse)
      .forEach((options) => {
        try {
          this.add(new MarketIndicatorView(options));
        } catch (e) {
          log("error creating indicator: " + e);
        }
      });
  },

  _removeAll: function () {
    this._indicators.forEach((i) => i.destroy());
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
  try {
    _apiProvider = new ApiProvider.ApiProvider();
    _indicatorCollection = new IndicatorCollection();
  } catch (e) {
    logError(e);
  }
}

function disable() {
  _indicatorCollection.destroy();
  _apiProvider.destroy();
}
