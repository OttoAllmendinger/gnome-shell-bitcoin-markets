const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

import * as St from '@imports/St-1.0';
import * as Clutter from '@imports/Clutter-7';

import ExtensionUtils from './gselib/extensionUtils';
import { currentVersion } from './gselib/version';
import { openPrefs } from './gselib/openPrefs';
import { _ } from './gselib/gettext';
import { extendGObject } from './gselib/gobjectUtil';

import * as ApiService from './ApiService';
import * as Format from './format/Format';
import * as HTTP from './HTTP';
import { Defaults } from './IndicatorCollectionModel';

import { uuid } from './metadata.json';

const version = currentVersion();

const INDICATORS_KEY = 'indicators';
const FIRST_RUN_KEY = 'first-run';

const _Symbols = {
  error: '\u26A0',
  refresh: '\u27f3',
  up: '\u25b2',
  down: '\u25bc',
  unchanged: ' ',
};

const settings = ExtensionUtils.getSettings();

const MarketIndicatorView = extendGObject(
  class MarketIndicatorView extends PanelMenu.Button {
    _init(options) {
      super._init(0);
      this.providerLabel = '';
      this._initLayout();
      this.setOptions(options);
    }

    setOptions(options) {
      try {
        this.providerLabel = ApiService.getProvider(options.api).getLabel(options);
      } catch (e) {
        logError(e);
        this.providerLabel = `[${options.api}]`;
        this.onUpdateError(e);
        return;
      }

      this.options = options;
    }

    _initLayout() {
      const layout = new St.BoxLayout();

      this._indicatorView = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'indicator',
      });

      this._statusView = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'status',
      });

      layout.add_actor(this._statusView);
      layout.add_actor(this._indicatorView);

      ('actor' in this ? this.actor : this).add_actor(layout);

      this._popupItemStatus = new PopupMenu.PopupMenuItem('', { activate: false, hover: false, can_focus: false });
      this._popupItemStatus.label.set_style('max-width: 12em;');
      this._popupItemStatus.label.clutter_text.set_line_wrap(true);
      this.menu.addMenuItem(this._popupItemStatus);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      this._popupItemSettings = new PopupMenu.PopupMenuItem(_('Settings'));
      this.menu.addMenuItem(this._popupItemSettings);
      this._popupItemSettings.connect('activate', () => {
        openPrefs(version, uuid, { shell: imports.gi.Shell });
      });
    }

    getChange(lastValue, newValue) {
      if (lastValue === undefined) {
        return 'unchanged';
      }
      if (lastValue > newValue) {
        return 'down';
      } else if (lastValue < newValue) {
        return 'up';
      }
      return 'unchanged';
    }

    onUpdateStart() {
      this._displayStatus(_Symbols.refresh);
    }

    onUpdateError(error) {
      this._displayText('error');
      this._displayStatus(_Symbols.error);
      this._updatePopupItemLabel(error);
    }

    onClearValue() {
      this._displayStatus(_Symbols.refresh);
      this._displayText(Format.format(undefined, this.options));
      this._updatePopupItemLabel();
    }

    onUpdatePriceData(priceData) {
      const [p, p1] = priceData;

      const change = p1 ? this.getChange(p.value, p1.value) : 'unchanged';

      const _StatusToSymbol = {
        up: _Symbols.up,
        down: _Symbols.down,
        unchanged: ' ',
      };

      let symbol = ' ';
      if (this.options.show_change) {
        symbol = _StatusToSymbol[change];
        this._displayStatus(symbol);
      } else {
        this._statusView.width = 0;
      }

      this._displayText(Format.format(p.value, this.options));
      this._updatePopupItemLabel();
    }

    _displayStatus(text) {
      this._statusView.text = text;
    }

    _displayText(text) {
      this._indicatorView.text = text;
    }

    _updatePopupItemLabel(err?) {
      let text = this.providerLabel;
      if (err) {
        text += '\n\n' + (err instanceof HTTP.HTTPError ? err.format('\n\n') : String(err));
      }
      this._popupItemStatus.label.clutter_text.set_markup(text);
    }

    destroy() {
      this._indicatorView.destroy();
      this._statusView.destroy();
      super.destroy();
    }
  },
  PanelMenu.Button,
);

class IndicatorCollection {
  private _indicators: InstanceType<typeof MarketIndicatorView>[];
  private _settingsChangedId: number;

  constructor() {
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
    };

    this._settingsChangedId = settings.connect('changed::' + INDICATORS_KEY, tryUpdateIndicators);

    tryUpdateIndicators();
  }

  _initDefaults() {
    settings.set_strv(
      INDICATORS_KEY,
      [Defaults].map((v) => JSON.stringify(v)),
    );
  }

  _upgradeSettings() {
    function applyDefaults(options) {
      if (options.base === undefined) {
        options.base = options.coin || 'BTC';
      }

      if (options.quote === undefined) {
        options.quote = options.currency || 'USD';
      }

      if (options.format === undefined) {
        if (options.show_base_currency) {
          options.format = '{b}/{q} {v}';
        } else {
          options.format = '{v} {qs}';
        }
      }
      delete options.show_base_currency;
      delete options.coin;
      delete options.currency;
      return options;
    }

    const updated = settings
      .get_strv(INDICATORS_KEY)
      .map((v) => JSON.parse(v))
      .map(applyDefaults);
    settings.set_strv(
      INDICATORS_KEY,
      updated.map((v) => JSON.stringify(v)),
    );
  }

  _updateIndicators() {
    const arrOptions = settings
      .get_strv(INDICATORS_KEY)
      .map((str) => {
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

    ApiService.setSubscribers(this._indicators.filter((i) => i.options));
  }

  _removeAll() {
    this._indicators.forEach((i) => i.destroy());
    this._indicators = [];
  }

  destroy() {
    this._removeAll();
    ApiService.setSubscribers([]);
    settings.disconnect(this._settingsChangedId);
  }
}

let _indicatorCollection;

function init(_metadata?) {
  ExtensionUtils.initTranslations();
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

export default function () {
  init();
  return { enable, disable };
}
