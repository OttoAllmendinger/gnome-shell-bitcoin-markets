const Lang = imports.lang;
const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
const Gettext = imports.gettext.domain("gnome-shell-bitcoin-markets");
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderBitcoinAverage } = Local.imports;
const { ExchangeData } = Local.imports.ProviderBitcoinAverageExchangeData;
const {
    ComboBoxView,
    BaseProviderConfigView
} = Local.imports.BaseProviderConfigView;


const ConfigView = new Lang.Class({
  Name: "ProviderBitcoinAveragePrefs.ConfigView",
  Extends: BaseProviderConfigView,

  _init(configWidget, indicatorConfig) {
    this.parent("bitcoinaverage", configWidget, indicatorConfig);
  },

  _initWidgets() {
    /* currency selection */

    const updateExchangeSelect = () => {
      const useAverage = this._indicatorConfig.get("use_average");
      const base = this._indicatorConfig.get("base");
      const quote = this._indicatorConfig.get("quote");
      exchangeSelect.rowWidget.sensitive = useAverage === false;
      exchangeSelect.comboBoxView.setOptions(
        this._makeExchangeOptions({ base, quote })
      );
    };

    {
      const { entry } = this._addBaseEntry();
      entry.connect("changed", updateExchangeSelect);
    }

    {
      const { entry } = this._addQuoteEntry();
      entry.connect("changed", updateExchangeSelect);
    }


    /* use average switch */
    // TODO use proper view method: connect("changed")
    const averageSwitch = this._addAverageSwitch();
    averageSwitch.switchView.connect("notify::active", (obj) => {
      this._indicatorConfig.set("use_average", obj.active);
      updateExchangeSelect();
    });

    /* exchange selection */
    const exchangeSelect = this._addSelectExchange();
    updateExchangeSelect();

    this._addHelp();
  },

  _addAverageSwitch() {
    const switchView = new Gtk.Switch({
      active: this._indicatorConfig.get("use_average") !== false
    });

    const rowWidget = this._addRow(_("Average"), switchView);

    return {
      rowWidget,
      switchView
    };
  },

  _addSelectExchange() {
    const comboBoxExchange = new ComboBoxView();

    comboBoxExchange.connect("changed", (view, value) => {
      this._indicatorConfig.set("exchange", value);
    });

    const rowWidget = this._addRow(_("Exchange"), comboBoxExchange.widget);

    return {
      rowWidget,
      comboBoxView: comboBoxExchange
    };
  },

  _makeExchangeOptions({ base, quote }) {
    const symbol = base + quote;
    const currentExchange = this._indicatorConfig.get("exchange");
    const getVolume = (e) => {
      if (("symbols" in e) && (symbol in e.symbols)) {
        return e.symbols[symbol].volume;
      }
      return 0;
    }
    const exchangeByVolume = ExchangeData.filter((e) => getVolume(e) > 0);

    // swap order of (b, a) to sort in descending order
    exchangeByVolume.sort((a, b) => getVolume(b) - getVolume(a));

    const options = exchangeByVolume.map(({display_name, name}) =>
      ({label: display_name, value: name, active: name === currentExchange})
    );

    if (currentExchange === undefined) {
      options[0].active = true;
    }

    return options;
  }
});
Signals.addSignalMethods(ConfigView.prototype);
