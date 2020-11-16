import { _ } from '../gselib/gettext';
import { CurrencyData } from './CurrencyData';

import StringFormat from 'string-format';

const defaultDigits = 2;

export function format(value, { base, quote, format }) {
  const getSymbol = (code) => (code in CurrencyData ? CurrencyData[code].symbol_native : undefined);

  const info = CurrencyData[quote];

  const formatData = {
    raw: value,
    b: base,
    btc: '₿',
    bs: getSymbol(base) || base,
    qs: getSymbol(quote) || quote,
  };

  const formatValueWithDigits = (value, scale, digits) => {
    if (value === undefined) {
      return (0).toFixed(digits).replace(/0/g, '–');
    }
    return (value * scale).toLocaleString(undefined /* locale */, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const scale = [
    ['', 1],
    ['m', 0.001],
    ['k', 1000],
    ['sat', 1e8],
  ];
  scale.forEach(([prefix, scale]) => {
    formatData[`${prefix}v`] = formatValueWithDigits(value, scale, info ? info.decimal_digits : defaultDigits);
    for (let i = 0; i < 9; i++) {
      formatData[`${prefix}v${i}`] = formatValueWithDigits(value, scale, i);
    }
  });

  return StringFormat(format, formatData);
}

export function tooltipText() {
  const pad = (s, w) =>
    s +
    Array(w - s.length)
      .fill(' ')
      .join('');

  return [
    ['q', _('Quote currency code')],
    ['qs', _('Quote currency symbol')],
    ['b', _('Base currency code')],
    ['bs', _('Base currency symbol')],
    ['btc', _('Bitcoin symbol (₿)')],
    ['v', _('formatted value with defaults')],
    ['mv', _('formatted value with defaults, divided by ') + (0.001).toLocaleString()],
    ['kv', _('formatted value with defaults, multiplied by ') + (1000).toLocaleString()],
    ['satv', _('formatted value with defaults, multiplied by ') + (1e8).toLocaleString()],
    ['(m|k|sat)v0', _('formatted value with 0 decimals')],
    ['(m|k|sat)v1', _('formatted value with 1 decimal')],
    ['(m|k|sat)v2', _('formatted value with 2 decimals')],
    ['...', ''],
    ['(m|k|sat)v8', _('formatted value with 8 decimals')],
    ['raw', _('raw value without additional formatting')],
  ]
    .map(([a, b]) => `<tt>${pad(a, 16)}</tt>${b}`)
    .join('\n');
}
