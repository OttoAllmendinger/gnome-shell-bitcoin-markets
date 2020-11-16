const Signals = imports.signals;

import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';

import { extendGObject } from './gselib/gobjectUtil';
import ExtensionUtils from 'gselib/extensionUtils';
import { SignalEmitter } from './gselib/SignalEmitter';

import * as ApiService from './ApiService';

const INDICATORS_KEY = 'indicators';

export const Defaults = {
  api: 'bitstamp',
  base: 'BTC',
  quote: 'USD',
  attribute: 'last',
  show_change: true,
  format: '{v} {qs}',
};

declare interface ConfigModel extends SignalEmitter {}

class ConfigModel {
  private attributes: Record<string, unknown>;

  constructor(attributes: Record<string, unknown>) {
    this.attributes = attributes;
  }

  set(key, value) {
    this.attributes[key] = value;
    this.emit('update', key, value);
  }

  get(key) {
    if (key in this.attributes) {
      return this.attributes[key];
    }
    return Defaults[key];
  }

  toString() {
    return JSON.stringify(this.attributes);
  }

  destroy() {
    this.disconnectAll();
  }
}

Signals.addSignalMethods(ConfigModel.prototype);

export const IndicatorCollectionModel = extendGObject(
  class IndicatorCollectionModel extends Gtk.ListStore {
    private _settings: any;
    private Columns: Record<string, number> = {};

    _init(params) {
      super._init(params);

      this.Columns = {
        LABEL: 0,
        CONFIG: 1,
      };

      this.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);

      this._settings = ExtensionUtils.getSettings();

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
      const json = this.get_value(iter, this.Columns.CONFIG);

      if (!json) {
        throw new Error('getConfig() failed for iter=' + iter);
      }

      const config = new ConfigModel(JSON.parse(json));

      config.connect('update', () => {
        this.set(iter, [this.Columns.CONFIG], [config.toString()]);
      });

      return config;
    }

    _getLabel(config) {
      try {
        return ApiService.getProvider(config.api).getLabel(config);
      } catch (e) {
        logError(e);
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
          log('error loading indicator config');
          logError(e);
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

      this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [this._getLabel(JSON.parse(config)), config]);

      this._writeSettings();
    }

    _onRowInserted(self, path, iter) {
      this.set(iter, [this.Columns.LABEL, this.Columns.CONFIG], [this._getLabel(Defaults), JSON.stringify(Defaults)]);

      this._writeSettings();
    }

    _onRowDeleted(_self, _path, _iter) {
      this._writeSettings();
    }
  },
  Gtk.ListStore,
);
