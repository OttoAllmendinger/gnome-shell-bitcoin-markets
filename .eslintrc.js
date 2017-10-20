module.exports = {
  "extends": "eslint:recommended",
  "env": {
    "es6": true
  },
  "globals": {
    "global": true,
    "window": true,
    "log": true,
    "logError": true,
    "print": true,
    "printerr": true,
    "imports": true,
    "ARGV": true,
    "Me": true
  },

  "rules": {
    "no-underscore-dangle": "off",
    "brace-style": ["error"],
    "prefer-arrow-callback": ["error", { "allowNamedFunctions": true }],
    "no-unused-vars": ["error", {
        "vars": "local",
        "args": "none",
        "varsIgnorePattern": "(init|enable|disable|buildPrefsWidget|[A-Z])"
    }],
    "prefer-template": "off",
    "comma-spacing": "error",
    "max-len": ["error", 100]
  }
}
