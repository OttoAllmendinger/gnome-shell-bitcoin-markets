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

const targetGjsHttp = target({
  input: 'src/bin/gjs_http.ts',
  output: {
    file: `${buildPath}/gjs_http.js`,
    name: 'gjs_http',
    banner: 'imports.gi.versions.Soup = imports.gi.GLib.getenv("SOUP");\n',
  },
});

export default [targetExt, targetPrefs];
