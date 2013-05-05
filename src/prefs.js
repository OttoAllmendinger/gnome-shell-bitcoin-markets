const Lang = imports.lang;

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

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

        this.connect('row-changed', Lang.bind(this, this._onRowChanged));
        this.connect('row-inserted', Lang.bind(this, this._onRowInserted));
        this.connect('row-deleted', Lang.bind(this, this._onRowDeleted));
    },

    _getLabel: function (config) {
        return config.api + " " + config.currency;
    },

    _reloadFromSettings: function () {
        this.clear();

        let configs = this._settings.get_strv(INDICATORS_KEY);

        for each (let json in configs) {
            let c = JSON.parse(json);
            this.set(this.append(),
                    [this.Columns.LABEL, this.Columns.CONFIG],
                    [this._getLabel(c), json]);
        }
    },

    _onRowChanged: function () true,
    _onRowInserted: function () true,
    _onRowDeleted: function () true
});

const BitcoinMarketsSettingsWidget = new GObject.Class({
    Name: "BitcoinMarkets.BitcoinMarketsSettingsWidget",
    GTypeName: "BitcoinMarketsSettingsWidget",
    Extends: Gtk.Box,

    _init: function (params) {
        this.parent(params);
        this.margin = 10;
        this.orientation = Gtk.Orientation.HORIZONTAL;

        this._store = new IndicatorCollectionModel();

        this._initLayout();
        this._initBehavior();

        // this.add(new Gtk.Label({label: _("API Provider")}));
    },

    _initLayout: function () {
        this._indicatorList = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            'width-request': 200
        });

        this._treeView = new Gtk.TreeView({
            model: this._store,
            headers_visible: true,
            reorderable: true,
            hexpand: false,
            vexpand: true
        });

        let label = new Gtk.TreeViewColumn({title: "Label"});
        let renderer = new Gtk.CellRendererText()
        label.pack_start(renderer, true);
        label.add_attribute(renderer, "text", 0);
        this._treeView.insert_column(label, 0);

        this._indicatorList.add(this._treeView);

        let toolbar = new Gtk.Toolbar();
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

        let newButton = new Gtk.ToolButton({stock_id: Gtk.STOCK_NEW});
        newButton.connect('clicked', Lang.bind(this, this._newClicked));
        toolbar.add(newButton);

        let delButton = new Gtk.ToolButton({stock_id: Gtk.STOCK_DELETE});
        delButton.connect('clicked', Lang.bind(this, this._delClicked));
        toolbar.add(delButton);

        this._indicatorList.add(toolbar);

        this.add(this._indicatorList);




        this._configGrid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 10
        });


        this.add(this._configGrid);
    },

    _initBehavior: function () {
        this._selection = this._treeView.get_selection();
        this._selection.connect(
                'changed',
                Lang.bind(this, this._onSelectionChanged)
        );
    },

    _onSelectionChanged: function () {
        let [isSelected, model, iter] = this._selection.get_selected();
        let json = this._store.get_value(
            iter, this._store.Columns.CONFIG
        );
        this._displayConfig(JSON.parse(json));
    },

    _displayConfig: function (config) {

        for each (let w in this._configGridWidgets) {
            this._configGrid.remove(w);
        }

        this._configGridWidgets = [];

        let [x, y] = [1, 1];

        let add = Lang.bind(this, function (w) {
            this._configGridWidgets.push(w);
            this._configGrid.attach(w, x, y, 1, 1);
        });

        add(new Gtk.Label({label: _("Api Provider")}));
        y += 1;

        add(new Gtk.Label({label: _("Currency")}));
        y += 1;

        this._configGrid.show_all();
    },

    _newClicked: function () true,

    _delClicked: function () true
});

function init() {
    Convenience.initTranslations();
}


function buildPrefsWidget() {
    let widget = new BitcoinMarketsSettingsWidget();

    widget.show_all();

    return widget;
}
