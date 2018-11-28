const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain("bitcoin-markets");
const _ = Gettext.gettext;

const makeConfigRow = (description, widget) => {
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_bottom: 8,
    hexpand: true,
    vexpand: false
  });

  const label = new Gtk.Label({
    label: description,
    xalign: 0,
    expand: true
  });

  box.add(label);
  box.add(widget);

  return box;
};



const ComboBoxView = new Lang.Class({
  Name: "ComboBoxView",

  Columns: { LABEL: 0, VALUE: 1 },

  _init(options) {
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    const comboBox = new Gtk.ComboBox({model});
    const renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, "text", 0);

    this.widget = comboBox;
    this.model = model;
    this.setOptions(options);

    comboBox.connect("changed", (entry) => {
      const i = comboBox.get_active();
      if (i in this._options) {
        this.emit("changed", this._options[i].value);
      }
    });
  },

  setOptions(options) {
    this.model.clear();
    this._options = options || [];

    this._options.forEach((o) => {
      let iter;

      this.model.set(
        iter = this.model.append(), [this.Columns.LABEL], [o.label]
      );

      if (o.active) {
        this.widget.set_active_iter(iter);
      }
    });
  }
});
Signals.addSignalMethods(ComboBoxView.prototype);


const makeComboBoxCurrency = (currencies, selected) => {
  const options = currencies.map(
    (c) => ({label: c, value: c, active: (c === selected)})
  );

  return new ComboBoxView(options);
};

const makeComboBoxCoin = (coins, selected) => {
  const options = coins.map(
    (c) => ({label: c, value: c, active: (c === selected)})
  );

  return new ComboBoxView(options);
};


const BaseProviderConfigView = new Lang.Class({
  Name: "BaseProviderConfigView",

  _init(configWidget, indicatorConfig) {
    this._configWidget = configWidget;
    this._indicatorConfig = indicatorConfig;
    this._widgets = [];
    this._setDefaults(indicatorConfig);
    this._setApiDefaults(indicatorConfig);
  },

  _addRow(label, widget) {
    const rowWidget = makeConfigRow(label, widget);
    this._configWidget.add(rowWidget);
    this._widgets.push(rowWidget);

    return rowWidget;
  },

  _addSelectCurrency(currencies) {
    const comboBoxCurrency = makeComboBoxCurrency(
      currencies, this._indicatorConfig.get("currency")
    );

    comboBoxCurrency.connect("changed", (view, value) => {
      this._indicatorConfig.set("currency", value);
    });

    const rowWidget = this._addRow(_("Currency"), comboBoxCurrency.widget);

    return {
      rowWidget,
      comboBoxView: comboBoxCurrency
    };
  },

  _addSelectCoin(coins) {
    const comboBoxCurrency = makeComboBoxCoin(
      coins, this._indicatorConfig.get("coin")
    );

    comboBoxCurrency.connect("changed", (view, value) => {
      this._indicatorConfig.set("coin", value);
    });

    const rowWidget = this._addRow(_("Coin"), comboBoxCurrency.widget);

    return {
      rowWidget,
      comboBoxView: comboBoxCurrency
    };
  },

  _setDefaults(config) {
    config.set("show_change", config.get("show_change") !== false);
  },

  destroy() {
    this._widgets.forEach((widget) =>
      this._configWidget.remove(widget)
    );

    this._configWidget.show_all();
  }
});
