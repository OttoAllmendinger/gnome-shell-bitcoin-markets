const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

/**
 * Instances of this class emit update signals periodically with formatted
 * data from api sources
 */

const IndicatorModel = new Lang.Class({
  Name: "IndicatorModel",

  _init: function (options, handler, formatter) {
    this._formatter = formatter;
    this._handler = handler;

    let onUpdate = (error, data) => {
      if (error) {
        this.emit("update", error, null);
      } else {
        try {
          this.emit("update", null, {
            text: formatter.text(data, options),
            change: formatter.change(data, options)
          });
        } catch (formatError) {
          log("formatError " + formatError);
          this.emit("update", formatError, null);
        }
      }
    };

    this._signalUpdateStart = handler.connect(
        "update-start", () => {
            this.emit("update-start")
        }
    );

    this._signalUpdate = handler.connect(
        "update", (obj, error, data) => {
          onUpdate(error, data);
        }
    );

    if (handler._lastError || handler._lastData) {
      Mainloop.idle_add(() => {
        onUpdate(handler._lastError, handler._lastData);
      });
    }
  },

  destroy: function () {
    this.disconnectAll();
    this._handler.disconnect(this._signalUpdateStart);
    this._handler.disconnect(this._signalUpdate);
  }
});


Signals.addSignalMethods(IndicatorModel.prototype);
