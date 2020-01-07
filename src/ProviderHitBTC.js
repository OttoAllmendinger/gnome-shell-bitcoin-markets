const Lang = imports.lang;
const Local = imports.misc.extensionUtils.getCurrentExtension();
const BaseProvider = Local.imports.BaseProvider;

const Api = new Lang.Class({
    Name: "HitBTC.Api",
    Extends: BaseProvider.Api,

    apiName: "HitBTC",

    apiDocs: [
        ["API Docs", "https://api.hitbtc.com/"]
    ],

    interval: 15,

    getUrl({
        base,
        quote
    }) {
        return `https://api.hitbtc.com/api/2/public/ticker/${base}${quote}`
    },

    getLast({
        last
    }) {
        return last;
    }
});

