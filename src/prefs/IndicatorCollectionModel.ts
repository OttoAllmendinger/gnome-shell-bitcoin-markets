import Gtk from '@girs/gtk-4.0';
import GObject from '@girs/gobject-2.0';
import Gio from '@girs/gio-2.0';

import { getProvider } from '../providers';
import { registerGObjectClass } from '../gjs';
import { Defaults } from '../defaults';

const INDICATORS_KEY = 'indicators';

class ConfigModel {
  private attributes: Record<string, unknown>;

  constructor(private listStore: Gtk.ListStore, private iter: Gtk.TreeIter, private column = 1) {
    this.attributes = JSON.parse(this.listStore.get_value(iter, this.column));
  }

  set(key: string, value: any) {
    this.attributes[key] = value;
    this.listStore.set(this.iter, [this.column], [JSON.stringify(this.attributes)]);
  }

  get(key) {
    if (key in this.attributes) {
      return this.attributes[key];
    }
    return Defaults[key];
  }
}

@registerGObjectClass
export class IndicatorCollectionModel extends Gtk.ListStore {
  private _settings: Gio.Settings;
  private Columns: Record<string, number> = {};

  constructor(settings: Gio.Settings) {
    super();

    this.Columns = {
      LABEL: 0,
      CONFIG: 1,
    };

    this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

    this._settings = settings;

    this._reloadFromSettings();

    let flag;

    const mutex = (func: (...args: any[]) => void) =>
      function (...args: any[]) {
        if (!flag) {
          flag = true;
          func(...args);
          flag = false;
        }
      };

    this.connect('row-changed', mutex(this._onRowChanged.bind(this)));

    this.connect('row-inserted', mutex(this._onRowInserted.bind(this)));

    this.connect('row-deleted', mutex(this._onRowDeleted.bind(this)));
  }

  getConfig(iter) {
    return new ConfigModel(this, iter, this.Columns.CONFIG);
  }

  _getLabel(config) {
    try {
      return getProvider(config.api).getLabel(config);
    } catch (e) {
      console.log(e);
      return `[unsupported: ${config.api}]`;
    }
  }

  _reloadFromSettings() {
    this.clear();

    const configs = this._settings.get_strv(INDICATORS_KEY);

    Object.keys(configs).forEach((key) => {
      const json = configs[key];
      try {
        const label = this._getLabel(JSON.parse(json));
        this.set(this.append(), [this.Columns.LABEL, this.Columns.CONFIG], [label, json]);
      } catch (e) {
        console.log('error loading indicator config');
        console.error(e);
      }
    });
  }

  _writeSettings() {
    // eslint-disable-next-line
    let [res, iter] = this.get_iter_first();
    const configs: any[] = [];

    while (res) {
      configs.push(this.get_value(iter, this.Columns.CONFIG));
      res = this.iter_next(iter);
    }

    this._settings.set_strv(INDICATORS_KEY, configs);
  }

  _onRowChanged(self, path, iter) {
    const config = this.get_value(iter, this.Columns.CONFIG);

    this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], ([
      this._getLabel(JSON.parse(config as any)),
      config,
    ] as unknown) as GObject.Value[]);

    this._writeSettings();
  }

  _onRowInserted(self, path, iter) {
    this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], ([
      this._getLabel(Defaults),
      JSON.stringify(Defaults),
    ] as unknown) as GObject.Value[]);

    this._writeSettings();
  }

  _onRowDeleted(_self, _path, _iter) {
    this._writeSettings();
  }
}
