import Gio from '@girs/gio-2.0';
import St from '@girs/st-13';
import Clutter from '@girs/clutter-13';
import { Extension, ExtensionBase, ExtensionMetadata } from '@gnome-shell/extensions/extension';
import { registerGObjectClass } from 'gjs';

import * as Main from '@gnome-shell/ui/main';
import * as PanelMenu from '@gnome-shell/ui/panelMenu';
import * as PopupMenu from '@gnome-shell/ui/popupMenu';

import * as ApiService from './ApiService';
import * as Format from './format/Format';
import * as HTTP from './HTTP';

import { Options } from './providers/BaseProvider';
import { getProvider } from './providers';
import { removeAllTimeouts } from './timeouts';
import { Defaults } from './defaults';

const INDICATORS_KEY = 'indicators';
const FIRST_RUN_KEY = 'first-run';

const _Symbols = {
  error: '\u26A0',
  refresh: '\u27f3',
  up: '\u25b2',
  down: '\u25bc',
  unchanged: ' ',
};

interface IndicatorOptions extends Options {
  show_change: boolean;
}

type PopupMenuItemWithLabel = PopupMenu.PopupMenuItem & {
  label: St.Label;
};

@registerGObjectClass
class MarketIndicatorView extends PanelMenu.Button {
  options?: IndicatorOptions;
  providerLabel!: string;
  _indicatorView!: St.Label;
  _statusView!: St.Label;
  _popupItemStatus!: PopupMenuItemWithLabel;
  _popupItemSettings!: PopupMenu.PopupMenuItem;

  // actor!: Clutter.Actor;

  constructor(private ext: ExtensionBase, options) {
    super(1.0, 'Bitcoin Markets Indicator', false);
    this.providerLabel = '[providerlabel]';
    this._initLayout();
    this.setOptions(options);
  }

  setOptions(options: IndicatorOptions) {
    try {
      this.providerLabel = getProvider(options.api).getLabel(options);
    } catch (e) {
      console.error(e);
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

    layout.add_child(this._statusView);
    layout.add_child(this._indicatorView);

    this.add_child(layout);

    this._popupItemStatus = new PopupMenu.PopupMenuItem('', {
      activate: false,
      hover: false,
      can_focus: false,
    }) as PopupMenuItemWithLabel;
    this._popupItemStatus.label.set_style('max-width: 12em;');
    this._popupItemStatus.label.clutter_text.set_line_wrap(true);
    this.menu.addMenuItem(this._popupItemStatus);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._popupItemSettings = new PopupMenu.PopupMenuItem('Settings');
    this.menu.addMenuItem(this._popupItemSettings);
    this._popupItemSettings.connect('activate', () => {
      this.ext.openPreferences();
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
    this._displayText(Format.format(undefined, this.options!));
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
    if (this.options!.show_change) {
      symbol = _StatusToSymbol[change];
      this._displayStatus(symbol);
    } else {
      this._statusView.width = 0;
    }

    this._displayText(Format.format(p.value, this.options!));
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
}

class IndicatorCollection {
  private settings: Gio.Settings;
  private _indicators: InstanceType<typeof MarketIndicatorView>[];
  private _settingsChangedId: number;

  constructor(private ext: ExtensionBase) {
    this.settings = ext.getSettings();
    this._indicators = [];

    if (this.settings.get_boolean(FIRST_RUN_KEY)) {
      this._initDefaults();
      this.settings.set_boolean(FIRST_RUN_KEY, false);
    } else {
      this._upgradeSettings();
    }

    const tryUpdateIndicators = () => {
      try {
        this._updateIndicators();
      } catch (e) {
        console.error(e);
      }
    };

    this._settingsChangedId = this.settings.connect('changed::' + INDICATORS_KEY, tryUpdateIndicators);

    tryUpdateIndicators();
  }

  _initDefaults() {
    this.settings.set_strv(
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

    const updated = this.settings
      .get_strv(INDICATORS_KEY)
      .map((v) => JSON.parse(v))
      .map(applyDefaults);
    this.settings.set_strv(
      INDICATORS_KEY,
      updated.map((v) => JSON.stringify(v)),
    );
  }

  _updateIndicators() {
    const arrOptions = this.settings
      .get_strv(INDICATORS_KEY)
      .map((str) => {
        try {
          return JSON.parse(str);
        } catch (e: any) {
          e.message = `Error parsing string ${str}: ${e.message}`;
          console.error(e);
        }
      })
      .filter(Boolean);

    if (arrOptions.length === this._indicators.length) {
      arrOptions.forEach((options, i) => {
        try {
          this._indicators[i].setOptions(options);
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      this._removeAll();
      const indicators = arrOptions.map((options) => {
        return new MarketIndicatorView(this.ext, options);
      });
      indicators.forEach((view, i) => {
        Main.panel.addToStatusArea(`bitcoin-market-indicator-${i}`, view);
      });
      this._indicators = indicators;
    }

    ApiService.setSubscribers(this._indicators.filter((i) => i.options) as ApiService.Subscriber[]);
  }

  _removeAll() {
    this._indicators.forEach((i) => i.destroy());
    this._indicators = [];
  }

  destroy() {
    this._removeAll();
    ApiService.setSubscribers([]);
    this.settings.disconnect(this._settingsChangedId);
  }
}

export default class BitcoinMarketsExtension extends Extension {
  _indicatorCollection: IndicatorCollection | null = null;

  constructor(props: ExtensionMetadata) {
    super(props);
  }

  enable(): void {
    try {
      this._indicatorCollection = new IndicatorCollection(this);
    } catch (e) {
      console.log(e);
    }
  }

  disable(): void {
    this._indicatorCollection?.destroy();
    this._indicatorCollection = null;
    removeAllTimeouts();
  }
}
