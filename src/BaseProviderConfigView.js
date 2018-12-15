const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain("bitcoin-markets");
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ApiService } = Local.imports;


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

const debounce = (milliseconds, func) => {
  let tag = null;
  return () => {
    if (tag !== null) {
      Mainloop.source_remove(tag);
    }
    tag = Mainloop.timeout_add(milliseconds, () => {
      func();
      tag = null;
    });
  };
};


const ComboBoxView = new Lang.Class({
  Name: "ComboBoxView",

  Columns: { LABEL: 0, VALUE: 1 },

  _init(options) {
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_STRING]);

    const comboBox = new Gtk.ComboBox({ model });
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


const BaseProviderConfigView = new Lang.Class({
  Name: "BaseProviderConfigView",

  _init(api, configWidget, indicatorConfig) {
    this._api = api;
    this._provider = ApiService.getProvider(api);
    this._configWidget = configWidget;
    this._indicatorConfig = indicatorConfig;
    this._widgets = [];
    this._setDefaults(indicatorConfig);
    this._setApiDefaults(indicatorConfig);
    this._initWidgets();
  },

  _initWidgets() {
    this._addBaseEntry();
    this._addQuoteEntry();
  },

  _setDefaults(config) {
    config.set("show_change", config.get("show_change") !== false);
  },

  _setApiDefaults(config) {
    if (config.get("api") !== this._api) {
      config.set("api", this._api);
    }
  },

  _addConfigWidget(w) {
    this._configWidget.add(w);
    this._widgets.push(w);
  },

  _addRow(label, widget) {
    const rowWidget = makeConfigRow(label, widget);
    this._addConfigWidget(rowWidget);
    return rowWidget;
  },

  _addBaseEntry() {
    return this._addSymbolEntry(_("Base"), "base", "BTC");
  },

  _addQuoteEntry() {
    return this._addSymbolEntry(_("Quote"), "quote", "USD");
  },

  _addSymbolEntry(label, key, defaultValue) {
    const entry = new Gtk.Entry({
      text: this._indicatorConfig.get(key) || defaultValue
    });
    entry.connect("changed", debounce(500, () => {
      if (entry.text.length < 2) {
        return;
      }
      this._indicatorConfig.set(key, entry.text.toUpperCase());
    }));

    const rowWidget = this._addRow(label, entry);

    return { rowWidget, entry };
  },

  destroy() {
    this._widgets.forEach((widget) =>
      this._configWidget.remove(widget)
    );
    this._widgets.slice(0);
    this._configWidget.show_all();
  }
});
