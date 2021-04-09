import { target, buildPath, prefsFooter } from './gselib/rollup/rollup.base';

const targetExt = target({
  input: 'src/extension.ts',
  output: {
    file: `${buildPath}/extension.js`,
    name: 'init',
    exports: 'default',
  },
});

const targetPrefs = target({
  input: 'src/prefs/prefs.ts',
  output: {
    file: `${buildPath}/prefs.js`,
    name: 'prefs',
    footer: prefsFooter,
    exports: 'default',
  },
});

const targetPrefApp = target({
  input: 'src/prefs/app.ts',
  output: {
    file: `${buildPath}/dev/prefApp.js`,
    name: 'prefApp',
    banner: 'imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");\n',
  },
});

export default [targetExt, targetPrefs, targetPrefApp];
