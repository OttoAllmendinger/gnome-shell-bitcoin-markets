import Gio from 'gi://Gio?version=2.0';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import GObject from 'gi://GObject?version=2.0';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
/// Decorator function to call `GObject.registerClass` with the given class.
/// Use like
/// ```
/// @registerGObjectClass
/// export class MyThing extends GObject.Object { ... }
/// ```
function registerGObjectClass(target) {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (Object.prototype.hasOwnProperty.call(target, 'metaInfo')) {
        // eslint-disable-next-line
        // @ts-ignore
        // eslint-disable-next-line
        return GObject.registerClass(target.metaInfo, target);
    }
    else {
        // eslint-disable-next-line
        // @ts-ignore
        return GObject.registerClass(target);
    }
}

let BitcoinMarketsSettingsWidget = class BitcoinMarketsSettingsWidget extends Adw.PreferencesPage {
    constructor(_ext) {
        super();
    }
};
BitcoinMarketsSettingsWidget = __decorate([
    registerGObjectClass
], BitcoinMarketsSettingsWidget);
class BitcoinMarketsSettings extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.add(new BitcoinMarketsSettingsWidget(this));
    }
}

class PrefsAppWindow {
    app;
    constructor(app) {
        this.app = app;
    }
    getWindow() {
        const windowConfig = {
            application: this.app,
            default_height: 600,
            default_width: 800,
        };
        const window = new Gtk.ApplicationWindow(windowConfig);
        new BitcoinMarketsSettings().fillPreferencesWindow(window);
        return window;
    }
}
const application = new Gtk.Application({
    application_id: 'org.gnome.GnomeShellScreenshot.PrefsTestApp',
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});
application.connect('activate', (app) => {
    let activeWindow = app.active_window;
    if (!activeWindow) {
        const imageViewerWindow = new PrefsAppWindow(app);
        activeWindow = imageViewerWindow.getWindow();
    }
    activeWindow.present();
});
application.run(null);
