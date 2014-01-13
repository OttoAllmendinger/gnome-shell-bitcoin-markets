/*jshint moz:true */
(function main () {
  if (this.ARGV !== undefined) {
    const Soup = imports.gi.Soup;
    const _httpSession = new Soup.SessionAsync();
    const url = "http://www.localeplanet.com/api/auto/currencymap.json";
    _httpSession.queue_message(
      Soup.Message.new("GET", url),
      function (session, message) {
        let json = message.response_body.data;
        print("/*jshint -W100, moz:true */");
        print("const CurrencyData = " + JSON.stringify(
          JSON.parse(json), null, 4
        ) + ";");
        // this makes it a quine ;-)
        // print("(" + main + ")()");
        imports.mainloop.quit("main");
      }
    );

    imports.mainloop.run("main");
  }
  // vi: sw=2 sts=2 et
})();
