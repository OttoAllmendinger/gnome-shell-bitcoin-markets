const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const ApiProvider = Extension.imports.ApiProvider;

const INDICATORS_KEY = "indicators";

const _defaults = [
    {
        api: 'mtgox',
        currency: 'USD',
        attribute: 'last_local'
    }, {
        api: 'mtgox',
        currency: 'EUR',
        attribute: 'last_local'
    }
];

const ConfigModel = new Lang.Class({
    Name: "ConfigModel",

    _init: function (config) {
        this._config = config;
    },

    set: function (key, value) {
        log("key: " + key + " value: " + value);
        this._config[key] = value
        this.emit('changed', key, value);
    },

    get: function (key) {
      return this._config[key];
    },

    toString: function () {
      return JSON.stringify(this._config);
    },

    destroy: function () {
      this.disconnectAll();
    }
});

Signals.addSignalMethods(ConfigModel.prototype);


const IndicatorCollectionModel = new GObject.Class({
    Name: "BitcoinMarkets.IndicatorListModel",
    GTypeName: "IndicatorListModel",
    Extends: Gtk.ListStore,

    Columns: {
      LABEL: 0,
      CONFIG: 1
    },

    _preventRecursion: function (func) {
        var flag;

        return function () {
            if (!flag) {
                flag = true;
                func.apply(null, arguments);
                flag = false;
            }
        }
    },

    _init: function (params) {
        this.parent(params);
        this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        this._settings = Convenience.getSettings();

        this._reloadFromSettings();

        var flag;

        let mutex = function (func) {
            return function () {
                if (!flag) {
                    flag = true;
                    func.apply(null, arguments);
                    flag = false;
                }
            }
        };

        this.connect('row-changed', mutex(Lang.bind(this, this._onRowChanged)));

        this.connect('row-inserted', mutex(Lang.bind(this, this._onRowInserted)));

        this.connect('row-deleted', mutex(Lang.bind(this, this._onRowDeleted)));
    },

    _getLabel: function (config) {
        return config.api + " " + config.currency;
    },

    _getDefaults: function () {
        return {
            api: 'mtgox',
            currency: 'USD',
            attribute: 'last_local'
        };
    },

    _reloadFromSettings: function () {
        this.clear();

        let configs = this._settings.get_strv(INDICATORS_KEY);

        for each (let json in configs) {
            this.set(
                this.append(),
                [this.Columns.LABEL, this.Columns.CONFIG],
                [this._getLabel(JSON.parse(json)), json]
            );
        }
    },

    _writeSettings: function () {
        let configs = [];

        let [res, iter] = this.get_iter_first();

        while (res) {
            configs.push(this.get_value(iter, this.Columns.CONFIG));
            res = this.iter_next(iter);
        };

        log('writing ' + configs.length + ' configs');

        this._settings.set_strv(INDICATORS_KEY, configs);
    },

    _onRowChanged: function (self, path, iter) {
        let configs = this._settings.get_strv(INDICATORS_KEY);
        let [i, ] = path.get_indices();

        let config = configs[i] = this.get_value(iter, this.Columns.CONFIG);

        this.set(
            iter,
            [this.Columns.LABEL, this.Columns.CONFIG],
            [this._getLabel(JSON.parse(config)), config]
        );

        this._writeSettings();
    },

    _onRowInserted: function (self, path, iter) {
        let [i, ] = path.get_indices();
        let configs = this._settings.get_strv(INDICATORS_KEY);
        let defaults = this._getDefaults();

        this.set(
            iter,
            [this.Columns.LABEL, this.Columns.CONFIG],
            [this._getLabel(defaults), JSON.stringify(defaults)]
        );

        this._writeSettings();
    },

    _onRowDeleted: function (self, path, iter) {
        this._writeSettings();
    }
});

const BitcoinMarketsSettingsWidget = new GObject.Class({
    Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
    GTypeName: "BitcoinMarketsSettingsWidget",
    Extends: Gtk.Box,

    _init: function (params) {
        this.parent(params);
        this.margin = 10;
        this.orientation = Gtk.Orientation.HORIZONTAL;

        this._apiProvider = new ApiProvider.ApiProvider();
        this._store = new IndicatorCollectionModel();

        this._initLayout();
        this._initBehavior();

        // this.add(new Gtk.Label({label: _("API Provider")}));
    },

    _getApis: function () {
        return [
            { label: 'MtGox',           value: 'mtgox' },
            { label: 'Bitcoin Charts',  value: 'btcharts' }
        ];
    },

    _getCurrencies: function (config) {
        return this._apiProvider.apis[config.get('api')].currencies.map(
            function (c) ({label: c, value: c})
        );
    },

    _initLayout: function () {
        this._initIndicatorList();
        this._initConfigGrid();
    },

    _initIndicatorList: function () {
        let layout = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            'width-request': 200
        });

        layout.add(this._initTreeView());
        layout.add(this._initToolbar());

        this.add(layout);
    },

    _initTreeView: function () {
        this._treeView = new Gtk.TreeView({
            model: this._store,
            headers_visible: false,
            reorderable: true,
            hexpand: false,
            vexpand: true
        });

        let label = new Gtk.TreeViewColumn({title: "Label"});
        let renderer = new Gtk.CellRendererText()
        label.pack_start(renderer, true);
        label.add_attribute(renderer, "text", 0);
        this._treeView.insert_column(label, 0);

        return this._treeView;
    },

    _initToolbar: function () {
        let toolbar = new Gtk.Toolbar({
            icon_size: 1
        });

        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

        let getAddIndicatorAction = function ({label, value}) {
            let action = new Gtk.Action({
                name: label,
                label: label
            });
        };

        /* new widget button with menu */
        let newButton = new Gtk.ToolButton({icon_name: "list-add-symbolic"});
        newButton.connect('clicked', Lang.bind(this, this._addClicked));
        toolbar.add(newButton);

        /* delete button */
        let delButton = new Gtk.ToolButton({icon_name: "list-remove-symbolic"});
        delButton.connect('clicked', Lang.bind(this, this._delClicked));

        toolbar.add(delButton);


        return toolbar;
    },

    _initConfigGrid: function()  {
        this._configGrid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 10
        });

        this.add(this._configGrid);
    },

    _getComboBox: function (config, key, options) {
        let model = new Gtk.ListStore();

        let Columns = { LABEL: 0, VALUE: 1 };

        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        let comboBox = new Gtk.ComboBox({model: model});
        let renderer = new Gtk.CellRendererText();

        comboBox.pack_start(renderer, true);
        comboBox.add_attribute(renderer, 'text', 0);

        for each (let {label, value} in options) {
            let iter;

            model.set(
                iter = model.append(),
                [Columns.LABEL, Columns.VALUE],
                [label, value]
            );

            if (value === config.get(key)) {
                comboBox.set_active_iter(iter);
            }
        }

        comboBox.connect('changed', Lang.bind(this, function (entry) {
            let [success, iter] = comboBox.get_active_iter();

            if (!success) {
                return;
            }

            let value = model.get_value(iter, Columns.VALUE);

            config.set(key, value);
        }));

        return comboBox;
    },

    _initBehavior: function () {
        this._selection = this._treeView.get_selection();
        this._selection.connect(
            'changed',
            Lang.bind(this, this._onSelectionChanged)
        );
    },


    _onConfigChanged: function (config) {
        let [isSelected, model, iter] = this._selection.get_selected();
        this._store.set(
            iter,
            [this._store.Columns.CONFIG],
            [config.toString()]
        );
    },

    _setConfig: function (config) {
        if (this._config) {
            this._config.destroy();
            this._config = null;
        }

        if (config) {
            this._config = new ConfigModel(config);
            this._config.connect(
                "changed", Lang.bind(this, this._onConfigChanged)
            );
            this._displayConfig(this._config);
        };
    },

    _displayConfig: function (config) {
        for each (let w in this._configGridWidgets) {
            this._configGrid.remove(w);
        }

        this._configGridWidgets = [];

        let add = Lang.bind(this, function (w) {
            w.margin = 10;
            this._configGridWidgets.push(w);
            this._configGrid.attach(w, x, y, 1, 1);
        });

        /*
        [x, y] = [0, 0];
        add(new Gtk.Label({label: _("Api Provider")}));

        [x, y] = [x + 1, y];
        add(this._getComboBox(config, 'api', this._getApis()));
        */

        // [x, y] = [0, y + 1];
        [x, y] = [0, 0];
        add(new Gtk.Label({label: _("Currency")}));

        [x, y] = [x + 1, y];
        add(this._getComboBox(config, 'currency', this._getCurrencies(config)));

        this._configGrid.show_all();
    },

    _onSelectionChanged: function () {
        let [isSelected, model, iter] = this._selection.get_selected();
        let json = this._store.get_value(iter, this._store.Columns.CONFIG);
        this._setConfig(JSON.parse(json));
    },

    _addClicked: function () {
        this._store.append();
    },

    _delClicked: function () {
        let [isSelected, model, iter] = this._selection.get_selected();
        this._store.remove(iter);
    }
});

function init() {
    Convenience.initTranslations();
}


function buildPrefsWidget() {
    let widget = new BitcoinMarketsSettingsWidget();

    widget.show_all();

    return widget;
}
