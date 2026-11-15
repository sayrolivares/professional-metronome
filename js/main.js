/* main.js — wiring: the metronome, the tuner, then the switch between them (the tuner
   opens first). Switching tools stops the one being left (js/ui.js, js/tuner-ui.js). */
(function () {
  MN.i18n.start();                      // translate the page from here on (js/i18n.js)
  const store = new MN.Store();
  const engine = new MN.Engine(store);
  MN.ui.init(store, engine);
  const tuner = MN.tunerUI.init({ appStore: store, toast: MN.toast });
  MN.views.init();
  window.metronome = { store, engine };   // handy for the console
  window.tuner = tuner;
})();
