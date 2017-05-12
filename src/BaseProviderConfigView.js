const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain('bitcoin-markets');
const _ = Gettext.gettext;

const makeConfigRow = (description, widget) => {
  let box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_bottom: 8,
    hexpand: true,
    vexpand: false
  });

  let label = new Gtk.Label({
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

  _init: function (options) {
    let model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    let comboBox = new Gtk.ComboBox({model: model});
    let renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    this.widget = comboBox;
    this.model = model;
    this.setOptions(options);

    comboBox.connect('changed', (entry) => {
      let i = comboBox.get_active();
      if (i in this._options) {
        this.emit('changed', this._options[i].value);
      }
    });
  },

  setOptions: function (options) {
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
  let options = currencies.map(
    (c) => ({label: c, value: c, active: (c === selected)})
  );

  return new ComboBoxView(options);
};

const makeComboBoxCoin = (coins, selected) => {
  let options = coins.map(
    (c) => ({label: c, value: c, active: (c === selected)})
  );

  return new ComboBoxView(options);
};


const BaseProviderConfigView = new Lang.Class({
  Name: "BaseProviderConfigView",

  _init: function (configWidget, indicatorConfig) {
    this._configWidget = configWidget;
    this._indicatorConfig = indicatorConfig;
    this._widgets = [];
    this._setDefaults(indicatorConfig);
    this._setApiDefaults(indicatorConfig);
  },

  _addRow: function (label, widget) {
    let rowWidget = makeConfigRow(label, widget);
    this._configWidget.add(rowWidget);
    this._widgets.push(rowWidget);

    return rowWidget;
  },

  _addSelectCurrency: function (currencies) {
    let comboBoxCurrency = makeComboBoxCurrency(
      currencies, this._indicatorConfig.get('currency')
    );

    comboBoxCurrency.connect('changed', (view, value) => {
      this._indicatorConfig.set('currency', value);
    });

    let rowWidget = this._addRow(_("Currency"), comboBoxCurrency.widget);

    return {
      rowWidget: rowWidget,
      comboBoxView: comboBoxCurrency
    };
  },

  _addSelectCoin: function (coins) {
    let comboBoxCurrency = makeComboBoxCoin(
      coins, this._indicatorConfig.get('coin')
    );

    comboBoxCurrency.connect('changed', (view, value) => {
      this._indicatorConfig.set('coin', value);
    });

    let rowWidget = this._addRow(_("Coin"), comboBoxCurrency.widget);

    return {
      rowWidget: rowWidget,
      comboBoxView: comboBoxCurrency
    };
  },

  _setDefaults: function (config) {
    config.set('show_change', config.get('show_change') !== false);
  },

  destroy: function () {
    this._widgets.forEach((widget) =>
      this._configWidget.remove(widget)
    );

    this._configWidget.show_all();
  }
});
