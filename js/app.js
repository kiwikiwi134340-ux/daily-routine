(function () {
  'use strict';
  var KEY = 'daily-routine-v1';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var WORDS = [
    ['⏰', 'wake up', 'morning', 'despertarse', 'I wake up at 6:30.'],
    ['🛏️', 'get up', 'morning', 'levantarse', 'She gets up at seven.'],
    ['🚿', 'take a shower', 'morning', 'ducharse', 'We take a shower every morning.'],
    ['🪥', 'brush {p} teeth', 'morning', 'cepillarse los dientes', 'He brushes his teeth after breakfast.'],
    ['🥣', 'have breakfast', 'morning', 'desayunar', 'I have breakfast at 7:15.'],
    ['🚌', 'go to school', 'morning', 'ir a la escuela', 'They go to school by bus.'],
    ['🍝', 'have lunch', 'afternoon', 'almorzar', 'We have lunch at noon.'],
    ['📚', 'do {p} homework', 'afternoon', 'hacer la tarea', 'She does her homework at four.'],
    ['⚽', 'play sports', 'afternoon', 'practicar deportes', 'I play sports on Fridays.'],
    ['🍽️', 'have dinner', 'evening', 'cenar', 'My family has dinner at seven.'],
    ['📺', 'watch TV', 'evening', 'ver televisión', 'He watches TV for an hour.'],
    ['🛌', 'go to bed', 'evening', 'irse a la cama', 'I go to bed at ten.']
  ];
  var COLORS = { morning: '#ff9a1f', afternoon: '#2f8fe8', evening: '#7b4df0' };
  var DAY = [[5, '😴', 'I am still asleep.'], [6, '⏰', 'I wake up and get out of bed.'], [7, '🪥', 'I brush my teeth and have breakfast.'], [8, '🚌', 'I go to school.'], [12, '🍝', 'I have lunch with my friends.'], [15, '📚', 'I get home and do my homework.'], [18, '🍽️', 'We have dinner together.'], [20, '📺', 'I relax and watch TV.'], [22, '🛌', 'I go to bed.']];
  var SKY = [[5, [255, 140, 110], [255, 214, 165]], [7, [90, 170, 255], [255, 226, 170]], [12, [60, 150, 255], [196, 232, 255]], [17, [255, 120, 80], [255, 200, 120]], [19.5, [70, 50, 150], [220, 110, 120]], [21, [20, 20, 60], [60, 40, 110]], [23, [10, 10, 40], [30, 25, 80]]];
  var SUBJ = [['I', 'my'], ['You', 'your'], ['He', 'his'], ['She', 'her'], ['We', 'our'], ['They', 'their']];
  var FREQ = ['always', 'usually', 'often', 'sometimes', 'never'];
  var QUIZ = [
    ['She ___ up at 6:00 every day.', ['wake', 'wakes', 'waking', 'is wake'], 1, 'With he, she and it, the present simple verb takes -s: she wakes.'],
    ['Which sentence is correct?', ['He go to school by bus.', 'He goes to school by bus.', 'He going to school by bus.', 'He gos to school by bus.'], 1, 'The verb go becomes goes with he, she and it.'],
    ['Which sentence puts the adverb in the right place?', ['She goes always to bed late.', 'Always she goes to bed late.', 'She always goes to bed late.', 'She goes to always bed late.'], 2, 'Adverbs of frequency usually go before the main verb.'],
    ['It is 11 p.m. and Tom is very tired. What does he do?', ['He has breakfast.', 'He goes to bed.', 'He gets up.', 'He goes to school.'], 1, 'At night people go to bed.'],
    ['What time do you get up? Choose the best answer.', ['I get up at 7:00.', 'I am getting up on 7.', 'I gets up at 7.', 'I get up in 7:00.'], 0, 'Use at + a clock time: at 7:00.'],
    ['My brother ___ his homework after dinner.', ['do', 'doing', 'does', 'dos'], 2, 'Do becomes does with he, she and it.']
  ];
  var S;
  function fresh() { return { flip: [], built: 0, qi: 0, qs: 0, qp: null, qd: false, text: '', saved: false }; }
  function load() { try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = fresh(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function speak(txt) {
    if (!('speechSynthesis' in window)) { toast('Audio is not supported in this browser'); return; }
    speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(txt); u.lang = 'en-US'; u.rate = .9; speechSynthesis.speak(u);
  }
  function phrase(w, p) { return w.replace('{p}', p || 'my'); }
  function third(v) {
    var irr = { have: 'has', go: 'goes', do: 'does' };
    if (irr[v]) return irr[v];
    if (/(s|sh|ch|x|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }
  function progress() {
    var d = [S.flip.length >= 6, S.built >= 3, S.qd, S.saved], n = d.filter(Boolean).length, before = progress.n;
    $('prog').textContent = n + '/4 done'; progress.n = n;
    if (before !== undefined && n === 4 && before < 4) toast('🎉 You finished the whole day!');
  }

  /* hero: time of day */
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function sky(h) {
    var i = 0; while (i < SKY.length - 2 && h >= SKY[i + 1][0]) i++;
    var a = SKY[i], b = SKY[i + 1], t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0]))), r = document.documentElement.style;
    function mix(k) { return 'rgb(' + [0, 1, 2].map(function (j) { return lerp(a[k][j], b[k][j], t); }).join(',') + ')'; }
    r.setProperty('--s1', mix(1)); r.setProperty('--s2', mix(2));
    r.setProperty('--stars', h >= 19.5 ? Math.min(1, (h - 19.5) / 2) : h < 6 ? 1 - (h - 5) : 0);
  }
  function setTime(h) {
    var hh = Math.floor(h), mm = h % 1 ? '30' : '00', ap = hh >= 12 ? 'PM' : 'AM';
    $('clock').textContent = ((hh + 11) % 12 + 1) + ':' + mm + ' ' + ap;
    var ev = DAY[0]; DAY.forEach(function (d) { if (h >= d[0]) ev = d; });
    if ($('nowE').textContent !== ev[1]) { var e = $('nowE'); e.textContent = ev[1]; e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; }
    $('nowT').textContent = ev[2];
    var t = (h - 5) / 18, o = $('orb'); o.classList.toggle('moon', h >= 19);
    var u = h >= 19 ? (h - 19) / 4 : t * 18 / 14; u = Math.min(1, Math.max(0, h >= 19 ? u : (h - 5) / 14));
    o.style.left = (8 + u * 84) + '%'; o.style.top = (78 - Math.sin(u * Math.PI) * 58) + '%';
    sky(h);
  }

  /* words */
  var filter = 'all';
  function buildWords() {
    $('chips').innerHTML = ['all', 'morning', 'afternoon', 'evening'].map(function (f) { return '<button class="chip' + (f === filter ? ' on' : '') + '" data-f="' + f + '">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>'; }).join('');
    $('grid').innerHTML = WORDS.map(function (w, i) {
      if (filter !== 'all' && w[2] !== filter) return '';
      return '<button class="card' + (S.flip.indexOf(i) > -1 ? ' flip' : '') + '" data-i="' + i + '" style="--c:' + COLORS[w[2]] + '" aria-label="' + phrase(w[1]) + ', tap to flip"><div class="in"><div class="face"><span class="e">' + w[0] + '</span><b>' + phrase(w[1]) + '</b><small>' + w[2] + '</small></div><div class="face back"><b>' + w[3] + '</b><small>' + w[4] + '</small><span class="say" data-say="' + esc(w[4]) + '" role="button" aria-label="Listen">🔊</span></div></div></button>';
    }).join('');
  }
  function bindWords() {
    $('chips').onclick = function (e) { var c = e.target.closest('.chip'); if (c) { filter = c.dataset.f; buildWords(); } };
    $('grid').onclick = function (e) {
      var s = e.target.closest('[data-say]'); if (s) { e.stopPropagation(); speak(s.dataset.say); return; }
      var c = e.target.closest('.card'); if (!c) return;
      var i = +c.dataset.i; c.classList.toggle('flip');
      if (c.classList.contains('flip')) { if (S.flip.indexOf(i) < 0) S.flip.push(i); speak(phrase(WORDS[i][1])); save(); progress(); }
    };
  }

  /* sentence builder */
  function buildMaker() {
    $('bs').innerHTML = SUBJ.map(function (s, i) { return '<option value="' + i + '">' + s[0] + '</option>'; }).join('');
    $('bf').innerHTML = FREQ.map(function (f) { return '<option>' + f + '</option>'; }).join('');
    $('ba').innerHTML = WORDS.map(function (w, i) { return '<option value="' + i + '">' + phrase(w[1], 'my') + '</option>'; }).join('');
    $('bgo').onclick = function () {
      var s = SUBJ[+$('bs').value], f = $('bf').value, w = phrase(WORDS[+$('ba').value][1], s[1]).split(' '), is3 = s[0] === 'He' || s[0] === 'She';
      w[0] = is3 ? third(w[0]) : w[0];
      var sen = s[0] + ' ' + f + ' ' + w.join(' ') + '.';
      $('bout').innerHTML = '<span>' + esc(sen) + '</span><button class="say" id="bsay" aria-label="Listen">🔊</button>';
      $('bsay').onclick = function () { speak(sen); };
      $('btip').innerHTML = is3 ? 'Notice: with <b>' + s[0].toLowerCase() + '</b> the verb ends in <b>-s / -es</b>.' : 'Notice: with <b>' + s[0] + '</b> the verb stays in its base form.';
      speak(sen); S.built++; save(); progress();
    };
    if (S.built) $('btip').textContent = 'Sentences built: ' + S.built;
  }

  /* quiz */
  function renderQuiz() {
    var b = $('qbox'), n = QUIZ.length;
    if (S.qd) {
      var msg = S.qs === n ? 'Perfect! Your routine English is excellent.' : S.qs >= 4 ? 'Great job! Review the missed ones and try again.' : 'Good effort. Flip the cards again and retry.';
      b.innerHTML = '<div style="text-align:center"><div class="score">' + S.qs + '/' + n + '</div><p class="q" style="margin:14px 0">' + msg + '</p><button class="btn" id="qa">Try again</button></div>';
      $('qa').onclick = function () { S.qi = 0; S.qs = 0; S.qp = null; S.qd = false; save(); renderQuiz(); progress(); };
      return;
    }
    var q = QUIZ[S.qi], ans = S.qp !== null;
    b.innerHTML = '<div class="qtop"><span>Question ' + (S.qi + 1) + ' of ' + n + '</span><span>Score: ' + S.qs + '</span></div><div class="pbar"><i style="width:' + ((S.qi + (ans ? 1 : 0)) / n * 100) + '%"></i></div><p class="q">' + esc(q[0]) + '</p><div class="opts">' +
      q[1].map(function (o, i) { return '<button class="opt' + (ans ? (i === q[2] ? ' ok' : i === S.qp ? ' bad' : '') : '') + '" data-i="' + i + '"' + (ans ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' +
      (ans ? '<div class="fb" role="status"><b>' + (S.qp === q[2] ? 'Correct! ' : 'Not quite. ') + '</b>' + q[3] + '</div><button class="btn" id="qn">' + (S.qi === n - 1 ? 'See my result' : 'Next question') + '</button>' : '');
    b.querySelectorAll('.opt').forEach(function (o) { o.onclick = function () { S.qp = +o.dataset.i; if (S.qp === q[2]) S.qs++; save(); renderQuiz(); }; });
    if (ans) $('qn').onclick = function () { if (S.qi === n - 1) S.qd = true; else { S.qi++; S.qp = null; } save(); renderQuiz(); progress(); };
  }

  /* write */
  function count() { var n = ($('mine').value.match(/[^.!?]+[.!?]+/g) || []).length; $('mcount').textContent = n + (n === 1 ? ' sentence' : ' sentences'); return n; }
  function buildWrite() {
    $('mine').value = S.text; count();
    $('mine').oninput = function () { S.text = this.value; save(); count(); };
    $('msave').onclick = function () {
      if (count() < 3) { toast('Write at least 3 sentences first'); return; }
      S.saved = true; save(); progress(); toast('Routine saved ✓');
    };
  }

  function init() { buildWords(); buildMaker(); renderQuiz(); buildWrite(); progress(); }
  load(); bindWords(); init();
  var tm = $('time'); tm.oninput = function () { setTime(+tm.value); }; setTime(+tm.value);
  $('nowSay').onclick = function () { speak($('nowT').textContent); };
  var mn = $('menu'), bg = $('burger');
  bg.onclick = function () { var o = mn.classList.toggle('open'); bg.setAttribute('aria-expanded', o); };
  mn.onclick = function (e) { if (e.target.tagName === 'A') { mn.classList.remove('open'); bg.setAttribute('aria-expanded', 'false'); } };
  $('resetAll').onclick = function () {
    if (!confirm('Erase all your progress and answers?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { } S = fresh(); filter = 'all'; init(); toast('Progress reset');
  };
})();
