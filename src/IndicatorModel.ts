const Signals = imports.signals;
const Mainloop = imports.mainloop;

import { SignalEmitter } from './gselib/SignalEmitter';

/**
 * Instances of this class emit update signals periodically with formatted
 * data from api sources
 */

export declare interface IndicatorModel extends SignalEmitter {}

export class IndicatorModel {
  private _formatter: any;
  private _handler: any;
  private _signalUpdate: number;
  private _signalUpdateStart: number;

  constructor(options, handler, formatter) {
    this._formatter = formatter;
    this._handler = handler;

    const onUpdate = (error, data) => {
      if (error) {
        this.emit('update', error, null);
      } else {
        try {
          this.emit('update', null, {
            text: formatter.text(data, options),
            change: formatter.change(data, options),
          });
        } catch (formatError) {
          log('formatError ' + formatError);
          this.emit('update', formatError, null);
        }
      }
    };

    this._signalUpdateStart = handler.connect('update-start', () => {
      this.emit('update-start');
    });

    this._signalUpdate = handler.connect('update', (obj, error, data) => {
      onUpdate(error, data);
    });

    if (handler._lastError || handler._lastData) {
      Mainloop.idle_add(() => {
        onUpdate(handler._lastError, handler._lastData);
      });
    }
  }

  destroy() {
    this.disconnectAll();
    this._handler.disconnect(this._signalUpdateStart);
    this._handler.disconnect(this._signalUpdate);
  }
}

Signals.addSignalMethods(IndicatorModel.prototype);
