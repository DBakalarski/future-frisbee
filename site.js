// Wspólny skrypt wszystkich stron (bez zależności).
// build.mjs wkleja go na koniec <body>; w podglądzie .dc.html wywołuje go Component.
(function () {
  function init() {
    if (window.__ffReady) return;
    var reveal = document.querySelectorAll('[data-reveal]');
    var forms = document.querySelectorAll('form[data-mailto]');
    if (!reveal.length && !forms.length) return; // treść jeszcze się nie wyrenderowała
    window.__ffReady = true;
    document.documentElement.classList.add('js');

    // Pojawianie się elementów przy przewijaniu
    reveal.forEach(function (el) {
      var d = el.getAttribute('data-delay');
      if (d) el.style.transitionDelay = d + 'ms';
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          el.classList.add('in');
          io.unobserve(el);
          setTimeout(function () { el.style.transitionDelay = ''; }, 1400);
        });
      }, { threshold: 0.12 });
      reveal.forEach(function (el) { io.observe(el); });
    } else {
      reveal.forEach(function (el) { el.classList.add('in'); });
    }

    // Wybór usługi w formularzu: przyciski z data-pick i adres ?temat=...
    function pick(value) {
      var sel = document.querySelector('form[data-mailto] select[name="temat"]');
      if (sel && value) sel.value = value;
    }
    document.querySelectorAll('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () { pick(a.getAttribute('data-pick')); });
    });
    try { pick(new URLSearchParams(location.search).get('temat')); } catch (e) {}

    // Formularz → gotowa wiadomość w programie pocztowym
    forms.forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = form.elements;
        var val = function (n) { return f[n] ? String(f[n].value || '').trim() : ''; };
        var temat = val('temat') || 'Pytanie';
        var body = [
          'Czego dotyczy: ' + temat,
          'Forma zajęć: ' + (val('forma') || '—'),
          'Imię: ' + val('imie'),
          'Kontakt: ' + val('kontakt'),
          '',
          val('wiadomosc')
        ].join('\n');
        var to = form.getAttribute('data-mailto');
        location.href = 'mailto:' + to +
          '?subject=' + encodeURIComponent('Zgłoszenie ze strony: ' + temat) +
          '&body=' + encodeURIComponent(body);
        var status = form.querySelector('.form-status');
        if (status) status.textContent = 'Otwieram Twoją pocztę z gotową wiadomością — wystarczy ją wysłać. ' +
          'Jeśli nic się nie otworzyło, napisz bezpośrednio na ' + to + ' albo zadzwoń.';
      });
    });
  }
  window.ffInit = init;
  init();
})();
