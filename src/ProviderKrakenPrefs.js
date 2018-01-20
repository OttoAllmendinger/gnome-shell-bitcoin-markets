const Lang = imports.lang;
const Signals = imports.signals;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const { ProviderKraken } = Local.imports;
const { BaseProviderConfigView } = Local.imports.BaseProviderConfigView;


var ConfigView = new Lang.Class({
  Name: "ProviderKraken.ConfigView",
  Extends: BaseProviderConfigView,

  _init: function (configWidget, indicatorConfig) {
    this.parent(configWidget, indicatorConfig);

    let api = new ProviderKraken.Api();

    let currencyWidgets = this._addSelectCurrency(api.currencies);
    let coinWidgets = this._addSelectCoin(api.coins);

    // make sure to only enable available currencies for this coin on init
    let selected_currency = this._indicatorConfig.get('currency');
    let allowed_currencies = ProviderKraken.getCurrenciesForCoin(this._indicatorConfig.get('coin'));
    this._updateComboBoxSensitiveItems(currencyWidgets.comboBoxView, allowed_currencies, selected_currency);

    currencyWidgets.comboBoxView.connect('changed', (view, value) => {
      let coinComboBoxView = coinWidgets.comboBoxView;

      // get selected coin
      let coin = this._getComboBoxActiveItem(coinComboBoxView);
      let currency = value;

      let pair_name = ProviderKraken.getPairNameByCurrencyAndCoin(coin, currency);
      this._indicatorConfig.set('pair', pair_name);
    });

    coinWidgets.comboBoxView.connect('changed', (view, value) => {
      let currencyComboBoxView = currencyWidgets.comboBoxView;

      // get selected currency
      let currency = this._getComboBoxActiveItem(currencyComboBoxView);
      let coin = value;

      // only enable currencies available for this coin
      let allowed_currencies = ProviderKraken.getCurrenciesForCoin(coin);
      currency = this._updateComboBoxSensitiveItems(currencyComboBoxView, allowed_currencies, currency);

      let pair_name = ProviderKraken.getPairNameByCurrencyAndCoin(coin, currency);
      this._indicatorConfig.set('pair', pair_name);
    });
  },

  _getComboBoxActiveItem: function (view) {
    let active = view.widget.get_active();
    return view._options[active].value;
  },

  _updateComboBoxSensitiveItems: function (view, allowed_values, selected_value) {
      // update sensitivivity state for each item
      view.model.foreach((model, path, iter) => {
        let label = model.get_value(iter, view.Columns.LABEL);
        if (allowed_values.indexOf(label) != -1) {
          model.set_value(iter, view.Columns.SENSITIVE, true);
        } else {
          model.set_value(iter, view.Columns.SENSITIVE, false);
        }
      });

      // select next allowed currency if needed
      if (allowed_values.indexOf(selected_value) == -1) {
        view.model.foreach((model, path, iter) => {
          let is_sensitive = model.get_value(iter, view.Columns.SENSITIVE);
          if (is_sensitive == true) {
            selected_value = model.get_value(iter, view.Columns.LABEL);
            view.widget.set_active_iter(iter);
            return selected_value;
          }
        });
      }

      return selected_value;
  },

  _setApiDefaults: function (config) {
    if (config.get('api') !== 'kraken') {
      config.attributes = {
        api: 'kraken',
        pair: 'XXBTZEUR',
        currency: 'ZEUR',
        coin: 'XXBT',
        attribute: 'last'
      };

      config.emit('update');
    }
  },
});
Signals.addSignalMethods(ConfigView.prototype);

