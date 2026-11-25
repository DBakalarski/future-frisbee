// Wspólny skrypt wszystkich stron (bez zależności).
// build.mjs wkleja go na koniec <body>; w podglądzie .dc.html wywołuje go Component.
(function () {
  // ---------- Kalendarz wydarzeń: dane z Sanity (panel: future-frisbee.sanity.studio) ----------
  // Daty liczone na napisach RRRR-MM-DD, bez stref czasowych.
  var SANITY = 'https://xdpvlpcu.apicdn.sanity.io/v2026-01-01/data/query/production';
  var QUERY = '*[_type=="event" && (date >= $today || endDate >= $today)] | order(date asc)[0...20]' +
    '{_id,title,date,endDate,shortDescription,link,category}';
  var MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień',
    'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  var MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia',
    'września', 'października', 'listopada', 'grudnia'];
  var MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m0, d) { return y + '-' + pad(m0 + 1) + '-' + pad(d); }
  function parts(s) { return [+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)]; }
  function daysIn(y, m0) { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
  function nextDay(s) {
    var p = parts(s), d = new Date(Date.UTC(p[0], p[1], p[2] + 1));
    return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  var ffCal = {
    // Dni miesiąca od poniedziałku; null = puste pole. Długość: wielokrotność 7.
    monthGrid: function (y, m0) {
      var lead = (new Date(Date.UTC(y, m0, 1)).getUTCDay() + 6) % 7, out = [], d, n = daysIn(y, m0);
      for (d = 0; d < lead; d++) out.push(null);
      for (d = 1; d <= n; d++) out.push(iso(y, m0, d));
      while (out.length % 7) out.push(null);
      return out;
    },
    // { 'RRRR-MM-DD': [wydarzenia] }, wielodniowe rozpisane na każdy dzień.
    eventsByDay: function (events) {
      var map = {};
      events.forEach(function (ev) {
        var day = ev.date, end = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
        for (var i = 0; day <= end && i < 62; i++, day = nextDay(day)) (map[day] = map[day] || []).push(ev);
      });
      return map;
    },
    addMonths: function (y, m0, n) {
      var t = y * 12 + m0 + n;
      return [Math.floor(t / 12), ((t % 12) + 12) % 12];
    },
    monthLabel: function (y, m0) { return MONTHS[m0] + ' ' + y; },
    dayLabel: function (s) { var p = parts(s); return p[2] + ' ' + MONTHS_GEN[p[1]] + ' ' + p[0]; },
    shortMonth: function (s) { return MONTHS_SHORT[parts(s)[1]]; },
    safeLink: function (u) {
      u = String(u || '').trim();
      return /^(https?:|mailto:|tel:)/i.test(u) ? u : null;
    },
    url: function (today) {
      return SANITY + '?query=' + encodeURIComponent(QUERY) +
        '&' + encodeURIComponent('$today') + '=' + encodeURIComponent('"' + today + '"');
    }
  };
  window.ffCal = ffCal;

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
          'Forma zajęć: ' + (val('forma') || '-'),
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
        if (status) status.textContent = 'Otwieram Twoją pocztę z gotową wiadomością - wystarczy ją wysłać. ' +
          'Jeśli nic się nie otworzyło, napisz bezpośrednio na ' + to + ' albo zadzwoń.';
      });
    });
  }
  window.ffInit = init;
  init();
})();
