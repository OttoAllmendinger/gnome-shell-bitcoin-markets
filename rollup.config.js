import { targetShell, targetShellExt, buildPath } from './gselib/rollup/rollup.base';

const targetExt = targetShell({
  input: 'src/extension.ts',
  output: {
    file: `${buildPath}/extension.js`,
    name: 'init',
    exports: 'default',
  },
});

const targetPrefs = targetShellExt({
  input: 'src/prefs/prefs.ts',
  output: {
    file: `${buildPath}/prefs.js`,
    name: 'prefs',
    exports: 'default',
  },
});

const targetGjsHttp = targetShellExt({
  input: 'src/bin/gjs_http.ts',
  output: {
    file: `${buildPath}/gjs_http.js`,
    name: 'gjs_http',
  },
});

export default [targetExt, targetPrefs, targetGjsHttp];
