import * as Gio from '@gi-types/gio2';

import * as Gtk3 from '@gi-types/gtk3';
import * as Gtk4 from '@gi-types/gtk4';

import prefs from './prefs';

class PrefsAppWindow {
  constructor(private app: Gtk3.Application) {}

  getWindow(): Gtk3.Window {
    const windowConfig = {
      application: this.app,
      default_height: 600,
      default_width: 800,
    };
    let window;
    switch ((imports.gi as any).versions.Gtk) {
      case '3.0':
        window = new Gtk3.ApplicationWindow(windowConfig);
        window.add(prefs.buildPrefsWidget());
        window.show_all();
        break;
      case '4.0':
        window = new Gtk4.ApplicationWindow(windowConfig as any);
        window.set_child(prefs.buildPrefsWidget());
        break;
    }

    return window;
  }
}

const application = new Gtk3.Application({
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

(application as any).run(null);
