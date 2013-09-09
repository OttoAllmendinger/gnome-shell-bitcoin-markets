const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Signals = imports.signals;

const Gettext = imports.gettext.domain('bitcoin-markets');
const _ = Gettext.gettext;
const N_ = function(e) { return e; };

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;
const ApiProvider = Extension.imports.ApiProvider;

const INDICATORS_KEY = "indicators";


/*
const ConfigModel = new Lang.Class({
    Name: "ConfigModel",

    _init: function (config) {
        this._config = config;
    },

    toString: function () {
      return JSON.stringify(this._config);
    },

    destroy: function () {
      this.disconnectAll();
    }
});

Signals.addSignalMethods(ConfigModel.prototype);
*/




const IndicatorCollectionModel = new GObject.Class({
    Name: "BitcoinMarkets.IndicatorListModel",
    GTypeName: "IndicatorListModel",
    Extends: Gtk.ListStore,

    Columns: {
      LABEL: 0,
      CONFIG: 1
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

    size: function () {
        return this._configs.length;
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

        this._configs = this._settings.get_strv(INDICATORS_KEY);

        for each (let json in this._configs) {
            this.set(
                this.append(),
                [this.Columns.LABEL, this.Columns.CONFIG],
                [this._getLabel(JSON.parse(json)), json]
            );
        }
    },

    _writeSettings: function () {
        let [res, iter] = this.get_iter_first();

        this._configs = [];

        while (res) {
            this._configs.push(this.get_value(iter, this.Columns.CONFIG));
            res = this.iter_next(iter);
        };

        this._settings.set_strv(INDICATORS_KEY, this._configs);
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




const makeConfigLine = function (description, widget) {
    let box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_bottom: 5,
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


const GjsComboBox = new Lang.Class({
    Name: "GjsComboBox",

    _init: function (options) {
        const Columns = { LABEL: 0, VALUE: 1 };

        let model = new Gtk.ListStore();
        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

        let comboBox = new Gtk.ComboBox({model: model});
        let renderer = new Gtk.CellRendererText();

        comboBox.pack_start(renderer, true);
        comboBox.add_attribute(renderer, 'text', 0);

        for each (let o in options) {
            let iter;

            model.set(
                iter = model.append(),
                [Columns.LABEL, Columns.VALUE],
                [o.label, o.value]
            );

            if (o.active) {
                comboBox.set_active_iter(iter);
            }
        }

        comboBox.connect('changed', function (entry) {
            let [success, iter] = comboBox.get_active_iter();

            if (success) {
                this.emit('select', model.get_value(iter, Columns.VALUE));
            }
        });

        this.widget = comboBox;
        this.model = model;
    }
});

GjsComboBox.Options = function () {
    return Array.prototype.map.call(
        arguments,
        function ([value, label, active]) ({
            value: value,
            label: label,
            active: !!active
        })
    )
};

Signals.addSignalMethods(GjsComboBox.prototype);





const IndicatorConfigView = new GObject.Class({
    Name: "BitcoinMarkets.IndicatorConfigView",
    GTypeName: "IndicatorConfigView",
    Extends: Gtk.Box,

    _init: function (indicatorConfig, onConfigChanged) {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
        });

        this._indicatorConfig = indicatorConfig;

        this._comboBox = new GjsComboBox(GjsComboBox.Options(
            ['mtgox',       'MtGox',    true],
            ['bitstamp',    'BitStamp', false]
        ));

        let label = new Gtk.Label({
            label: "Label"
        });

        this.add(makeConfigLine(_("Provider"), this._comboBox.widget));
        this.add(makeConfigLine(_("Provider"), new Gtk.Label({label: 'Foo'})));

        this.show_all();
    }

    /*
    _getApis: function () {
        return [
            { label: 'MtGox',           value: 'mtgox' },
            { label: 'BitStamp',        value: 'bitstamp' },
            // { label: 'Bitcoin Charts',  value: 'btcharts' }
        ];
    },

    _getCurrencies: function (config) {
        return this._apiProvider.apis[config.get('api')].currencies.map(
            function (c) ({label: c, value: c})
        );
    },
    */

});


const BitcoinMarketsSettingsWidget = new GObject.Class({
    Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
    GTypeName: "BitcoinMarketsSettingsWidget",
    Extends: Gtk.Box,

    _init: function () {
        this.parent({
            orientation: Gtk.Orientation.HORIZONTAL
        });

        this._apiProvider = new ApiProvider.ApiProvider();
        this._store = new IndicatorCollectionModel();

        /* sidebar (left) */

        let sidebar = new Gtk.Box({
            margin: 10,
            orientation: Gtk.Orientation.VERTICAL,
            width_request: 200
        });

        sidebar.add(this._getTreeView());
        sidebar.add(this._getToolbar());

        this.add(sidebar);

        /* config (right) */

        this._configLayout = new Gtk.Box({
            margin: 10,
            orientation: Gtk.Orientation.HORIZONTAL,
            expand: true,
        });

        this.add(this._configLayout);

        /* behavior */

        this._selection = this._treeView.get_selection();
        this._selection.connect(
            'changed',
            Lang.bind(this, this._onSelectionChanged)
        );
    },

    _getTreeView: function () {
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

    _getToolbar: function () {
        let toolbar = this._toolbar = new Gtk.Toolbar({
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
        let delButton = this._delButton =
            new Gtk.ToolButton({icon_name: "list-remove-symbolic"});
        delButton.connect('clicked', Lang.bind(this, this._delClicked));

        toolbar.add(delButton);

        this._updateToolbar();

        return toolbar;
    },

    _onSelectionChanged: function () {
        let [isSelected, model, iter] = this._selection.get_selected();

        if (isSelected) {
            let json = this._store.get_value(iter, this._store.Columns.CONFIG);
            this._showIndicatorConfig(iter, JSON.parse(json));
        } else {
            this._showIndicatorConfig(null, null);
        }
    },

    _showIndicatorConfig: function (iter, indicatorConfig) {
        if (this._indicatorConfigView) {
            this._configLayout.remove(this._indicatorConfigView);
            this._indicatorConfigView.destroy();
            this._indicatorConfigView = null;
        }

        if ((iter === null) || (indicatorConfig === null)) {
            return;
        }

        let onConfigChanged = function (config) {
            this._store.set(
                iter,
                [this._store.Columns.CONFIG],
                [JSON.stringify(config)]
            );
        }.bind(this);

        this._indicatorConfigView = new IndicatorConfigView(
            indicatorConfig, onConfigChanged
        );

        this._configLayout.add(this._indicatorConfigView);
    },


    /*
    _initConfigPanel: function()  {
        this._configPanel = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });

        this.add(this._configPanel);

        this._panelSelectApi = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL
        });

        this._configPanel.add(this._panelSelectApi);

        this._panelsConfigApi = [];
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

            config.emit('select', key, value);
        }));

        return comboBox;
    },

    _initBehavior: function () {
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
        }

        this._displayConfig(this._config);
    },

    _displayConfig: function (config) {
        add(new Gtk.Label({label: _("Currency")}));
        add(this._getComboBox(config, 'currency', this._getCurrencies(config)));

        this._configGrid.show_all();
    },

    */

    _updateToolbar: function () {
        this._delButton.set_sensitive(this._store.size() > 0);
    },

    _addClicked: function () {
        this._store.append();
        this._updateToolbar();
    },

    _delClicked: function () {
        let [isSelected, model, iter] = this._selection.get_selected();

        if (isSelected) {
            this._store.remove(iter);
        }

        this._updateToolbar();
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
