/*jshint moz:true */
// vi: sw=2 sts=2 et

// const Gdk = imports.gi.Gdk;
// const Gio = imports.gi.Gio;
// const GLib = imports.gi.GLib;
// const GnomeDesktop = imports.gi.GnomeDesktop;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;

const Gettext = imports.gettext.domain("gnome-shell-extensions");
const _ = Gettext.gettext;
const N_ = (e) => e;

const Local = imports.misc.extensionUtils.getCurrentExtension();

const ApiService = Local.imports.ApiService;

const Convenience = Local.imports.convenience;

const { Format } = Local.imports;
const { Defaults } = Local.imports.IndicatorCollectionModel;


const INDICATORS_KEY = "indicators";
const FIRST_RUN_KEY = "first-run";

const DEBUG_HANDLERS = true;

const _Symbols = {
  error: "\u26A0",
  refresh: "\u27f3",
  up: "\u25b2",
  down: "\u25bc",
  unchanged: " ",
};

const _Colors = {
  error: "#ff0000",
};

const settings = Convenience.getSettings();

const MarketIndicatorView = new Lang.Class({
  Name: "MarketIndicatorView",
  Extends: PanelMenu.Button,

  _init(options) {
    this.parent(0);
    this.providerLabel = "";
    this._initLayout();
    this.setOptions(options);
  },

  setOptions(options) {
    try {
      this.providerLabel =
        ApiService.getProvider(options.api).getLabel(options);
    } catch (e) {
      logError(e);
      this.providerLabel = `[${options.api}]`;
      this.onUpdateError(e);
      return;
    }

    this.options = options;
  },

  _initLayout() {
    const layout = new St.BoxLayout();

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

    this._popupItemSettings = new PopupMenu.PopupMenuItem(_("Settings"));
    this.menu.addMenuItem(this._popupItemSettings);
    this._popupItemSettings.connect("activate", () => {
      const app_sys = Shell.AppSystem.get_default();
      const prefs = app_sys.lookup_app("gnome-shell-extension-prefs.desktop");
      if (prefs.get_state() == prefs.SHELL_APP_STATE_RUNNING) {
        prefs.activate();
      } else {
        prefs
          .get_app_info()
          .launch_uris(["extension:///" + Local.metadata.uuid], null);
      }
    });
  },

  getChange(lastValue, newValue) {
    if (lastValue === undefined) {
      return "unchanged";
    }
    if (lastValue > newValue) {
      return "down";
    } else if (lastValue < newValue) {
      return "up";
    }
    return "unchanged";
  },

  onUpdateStart() {
    this._displayStatus(_Symbols.refresh);
  },

  onUpdateError(error) {
    this._displayText("error");
    this._displayStatus(_Symbols.error);
    this._updatePopupItemLabel(error);
  },

  onClearValue() {
    this._displayStatus(_Symbols.refresh);
    this._displayText(Format.format(undefined, this.options));
    this._updatePopupItemLabel();
  },

  onUpdatePriceData(priceData) {
    const [p, p1] = priceData;

    const change = p1
      ? this.getChange(p.value, p1.value)
      : "unchanged";

    const _StatusToSymbol = {
      up: _Symbols.up,
      down: _Symbols.down,
      unchanged: " "
    };

    let symbol = " ";
    if (this.options.show_change) {
      symbol = _StatusToSymbol[change];
      this._displayStatus(symbol);
    } else {
      this._statusView.width = 0;
    }

    this._displayText(Format.format(p.value, this.options));
    this._updatePopupItemLabel();
  },

  _displayStatus(text) {
    this._statusView.text = text;
  },

  _displayText(text) {
    this._indicatorView.text = text;
  },

  _updatePopupItemLabel(err) {
    let text = this.providerLabel;
    if (err) {
      text += "\n\n" + String(err);
    }
    this._popupItemStatus.label.text = text;
  },

  destroy() {
    this._indicatorView.destroy();
    this._statusView.destroy();
    this.parent();
  }
});

const IndicatorCollection = new Lang.Class({
  Name: "IndicatorCollection",

  _init() {
    this._indicators = [];

    if (settings.get_boolean(FIRST_RUN_KEY)) {
      this._initDefaults();
      settings.set_boolean(FIRST_RUN_KEY, false);
    } else {
      this._upgradeSettings();
    }

    const tryUpdateIndicators = () => {
      try {
        this._updateIndicators();
      } catch (e) {
        logError(e);
      }
    }

    this._settingsChangedId = settings.connect(
      "changed::" + INDICATORS_KEY,
      tryUpdateIndicators
    );

    tryUpdateIndicators();
  },

  _initDefaults() {
    settings.set_strv(INDICATORS_KEY, [Defaults].map(JSON.stringify));
  },

  _upgradeSettings() {
    const applyDefaults = (options) => {
      if (options.base === undefined) {
        options.base = options.coin || "BTC";
      }

      if (options.quote === undefined) {
        options.quote = options.currency || "USD";
      }

      if (options.format === undefined) {
        if (options.show_base_currency) {
          options.format = "{b}/{q} {v}";
        } else {
          options.format = "{v} {qs}";
        }
      }
      delete options.show_base_currency;
      delete options.coin;
      delete options.currency;
      return options;
    };
    const updated = settings.get_strv(INDICATORS_KEY)
      .map(JSON.parse)
      .map(applyDefaults);
    settings.set_strv(INDICATORS_KEY, updated.map(JSON.stringify));
  },

  _updateIndicators() {
    const arrOptions = settings.get_strv(INDICATORS_KEY)
      .map(str => {
        try {
          return JSON.parse(str);
        } catch (e) {
          e.message = `Error parsing string ${str}: ${e.message}`;
          logError(e);
        }
      })
      .filter(Boolean);

    if (arrOptions.length === this._indicators.length) {
      arrOptions.forEach((options, i) => {
        try {
          this._indicators[i].setOptions(options);
        } catch (e) {
          logError(e);
        }
      });
    } else {
      this._removeAll();
      const indicators = arrOptions.map((options) => {
        return new MarketIndicatorView(options);
      });
      indicators.forEach((view, i) => {
        Main.panel.addToStatusArea(`bitcoin-market-indicator-${i}`, view);
      });
      this._indicators = indicators;
    }

    ApiService.setSubscribers(this._indicators);
  },

  _removeAll() {
    this._indicators.forEach((i) => i.destroy());
    this._indicators = [];
  },

  destroy() {
    this._removeAll();
    ApiService.setSubscribers([]);
    settings.disconnect(this._settingsChangedId);
  }
});

let _indicatorCollection;

function init(metadata) {
  Convenience.initTranslations();
}

function enable() {
  try {
    _indicatorCollection = new IndicatorCollection();
  } catch (e) {
    logError(e);
  }
}

function disable() {
  _indicatorCollection.destroy();
}
