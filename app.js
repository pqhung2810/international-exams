/* Test Quest – review game for the International Tests module.
   Plain JavaScript, no build step. Progress is stored in the browser (localStorage);
   scores are sent to a Google Sheet (CONFIG.SHEET_URL) for the class ranking. */
(function () {
  'use strict';
  const CFG = window.CONFIG, LEVELS = window.LEVELS, FACTS = window.FACTS, QUIZ = window.QUIZ, READING = window.READING;
  const $app = document.getElementById('app');
  const STORE = 'testquest_v1';

  // ---------- helpers
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => String(s).toLowerCase().replace(/[‘’'"“”.,!?;:()]/g, '').replace(/\s+/g, ' ').trim();
  const L4 = 'ABCD';
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }

  // ---------- state
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  let S = load(); S.best = S.best || {};
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }
  // merge progress from another device: keep the better result of each activity
  function merge(remote) {
    Object.entries(remote || {}).forEach(([k, r]) => {
      const l = S.best[k];
      if (!l || (r.xp || 0) > (l.xp || 0)) S.best[k] = Object.assign({}, r, l && l.pass ? { pass: true } : {});
      else if (r.pass && !l.pass) l.pass = true;
    });
  }
  const totalXP = () => Object.values(S.best).reduce((a, b) => a + (b.xp || 0), 0);
  const pct = (k) => { const b = S.best[k]; return b && b.max ? b.score / b.max : 0; };
  function stars(key) {
    let n = 0; const q = pct('quiz:' + key);
    if (q >= 0.6) n = 1; if (q >= 0.9) n = 2;
    if (S.best['boss:' + key] && S.best['boss:' + key].pass && n >= 1) n = 3;
    return n;
  }
  const starHTML = (n) => '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span></span>';
  const totalStars = () => LEVELS.reduce((a, l) => a + stars(l.key), 0);

  const BADGES = [
    ['First steps', 'Finish any activity', () => Object.keys(S.best).length > 0],
    ['IELTS Insider', '80%+ in both IELTS quizzes', () => pct('quiz:ielts-ac') >= .8 && pct('quiz:ielts-gt') >= .8],
    ['ETS Expert', '80%+ in TOEIC and TOEFL quizzes', () => pct('quiz:toeic') >= .8 && pct('quiz:toefl') >= .8],
    ['British Council Pro', '80%+ in both Aptis quizzes', () => pct('quiz:aptis-g') >= .8 && pct('quiz:aptis-a') >= .8],
    ['Cambridge Champion', '80%+ in B2 First, C1 Advanced and Linguaskill', () => ['b2', 'c1', 'lingua'].every(k => pct('quiz:' + k) >= .8)],
    ['Home Hero', '80%+ in the VSTEP quiz', () => pct('quiz:vstep') >= .8],
    ['Boss Slayer', 'Beat all 10 boss rounds', () => LEVELS.every(l => S.best['boss:' + l.key] && S.best['boss:' + l.key].pass)],
    ['Bookworm', '60%+ in all reading passages', () => READING.every(r => pct('read:' + r.id) >= .6)],
    ['Game Master', 'Play all three mini-games', () => ['who', 'match', 'odd'].every(g => S.best['game:' + g])],
  ];
  const myBadges = () => BADGES.filter(b => b[2]()).map(b => b[0]);

  // record a finished activity; keeps the best result only
  function record(activity, score, max, xp, extra, wrong) {
    const old = S.best[activity];
    const better = !old || xp > old.xp || (extra && extra.pass && !old.pass);
    if (better) S.best[activity] = Object.assign({ score, max, xp }, extra || {}, old && old.pass ? { pass: true } : {});
    save(); renderMe(); sync(activity, score, max, wrong || []);
    return { better, gained: better ? xp - (old ? old.xp : 0) : 0 };
  }
  function sync(activity, score, max, wrong) {
    if (!CFG.SHEET_URL || !S.profile) return;
    const body = JSON.stringify({ id: S.profile.id, name: S.profile.name, xp: totalXP(), stars: totalStars(),
      badges: myBadges().length, activity, score, max, wrong, key: S.profile.key, progress: S.best });
    fetch(CFG.SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }).catch(() => {});
  }
  function renderMe() {
    const el = document.getElementById('me');
    el.innerHTML = S.profile ? esc(S.profile.name) + ' · <b>' + totalXP() + ' XP</b>' : '';
  }

  // ---------- router
  const routes = [];
  const route = (re, fn) => routes.push([re, fn]);
  let cleanup = null;
  function go() {
    if (cleanup) { cleanup(); cleanup = null; }
    const h = location.hash.replace(/^#/, '') || '/';
    if ((!S.profile || !S.profile.key) && h !== '/login') { location.hash = '#/login'; return; }
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', ('#' + h).startsWith(a.getAttribute('href')) && (a.getAttribute('href') !== '#/' || h === '/')));
    for (const [re, fn] of routes) { const m = h.match(re); if (m) { window.scrollTo(0, 0); fn(...m.slice(1)); return; } }
    location.hash = '#/';
  }
  window.addEventListener('hashchange', go);
  const lvl = (key) => LEVELS.find(l => l.key === key);

  // ---------- login / profile
  route(/^\/login$/, () => {
    $app.innerHTML = `<div class="card" style="max-width:460px;margin:30px auto">
      <h1>Welcome to Test Quest</h1>
      <p class="muted">Review the ten international English tests, play games and climb the class ranking.</p>
      <label for="nm">Your name (shown in the ranking)</label><input id="nm" maxlength="40" value="${esc(S.profile ? S.profile.name : '')}">
      <label for="sid">Student ID</label><input id="sid" inputmode="numeric" maxlength="12" value="${esc(S.profile ? S.profile.id : '')}">
      <label for="pin">PIN (4 digits)</label><input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password">
      <p class="small muted"><b>First time?</b> Choose any 4-digit PIN and remember it.<br><b>Another phone or computer?</b> Sign in with the same student ID and PIN – your progress comes back.</p>
      <button class="btn" id="go">Start</button> <span id="wait" class="small muted"></span></div>`;
    const btn = document.getElementById('go');
    btn.onclick = async () => {
      const name = document.getElementById('nm').value.trim(), id = document.getElementById('sid').value.trim(), pin = document.getElementById('pin').value.trim();
      if (name.length < 2) return toast('Please type your name.');
      if (!/^\d{6,12}$/.test(id)) return toast('Please type your student ID (numbers only).');
      if (!/^\d{4}$/.test(pin)) return toast('Please type a 4-digit PIN.');
      const key = hashId(id + ':' + pin + ':testquest');
      if (S.profile && S.profile.id !== id) S.best = {}; // a different student on this device
      if (CFG.SHEET_URL) {
        btn.disabled = true; document.getElementById('wait').textContent = 'Checking…';
        try {
          const j = await fetch(`${CFG.SHEET_URL}?action=load&id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`).then(r => r.json());
          if (j.status === 'wrong') { btn.disabled = false; document.getElementById('wait').textContent = ''; return toast('Wrong PIN for this student ID. Ask your teacher if you forgot it.'); }
          if (j.status === 'ok') { merge(j.progress); toast('Welcome back! Your progress has been loaded.'); }
        } catch (e) { toast('Could not reach the ranking server – you can still play; progress will sync later.'); }
      }
      S.profile = { name, id, key }; save(); renderMe(); sync('sign-in', 0, 0, []); location.hash = '#/';
    };
  });
  route(/^\/profile$/, () => {
    $app.innerHTML = `<a class="back" href="#/">← Map</a><div class="card" style="max-width:520px">
      <h1>${esc(S.profile.name)}</h1><p>Student ID: ${esc(S.profile.id)}</p>
      <p><b>${totalXP()} XP</b> · ${totalStars()} / 30 stars · ${myBadges().length} badges</p>
      <div class="row"><a class="btn ghost" href="#/login">Edit my details</a>
      <button class="btn ghost" id="out">Sign out of this device</button></div>
      <p class="small muted" style="margin-top:12px">Signing out removes your progress from this browser only. ${CFG.SHEET_URL ? 'It is kept online – sign in again with your student ID and PIN to get it back.' : ''}</p></div>`;
    document.getElementById('out').onclick = () => {
      if (!confirm('Sign out of this device?')) return;
      sync('sign-out', 0, 0, []); S = { best: {} }; save(); renderMe(); location.hash = '#/login';
    };
  });

  // ---------- home map
  route(/^\/$/, () => {
    const done = LEVELS.filter(l => stars(l.key) === 3).length;
    $app.innerHTML = `
      <div class="hero">
        <div class="card"><h1>${esc(CFG.COURSE)}</h1>
          <p class="muted">Each level is one test. <b>Learn</b> the key facts, take the <b>Quiz</b>, then beat the <b>Boss</b> round. Your best score in every activity counts towards your XP.</p>
          <div class="row"><a class="btn" href="#/reading">Reading Arena</a><a class="btn ghost" href="#/games">Mini-games</a><a class="btn ghost" href="#/rank">Class ranking</a></div></div>
        <div class="card"><div class="muted small">Your score</div><div class="stat">${totalXP()} XP</div>
          <div>${totalStars()} / 30 stars · ${done} / 10 levels cleared</div>
          <div class="badges" style="margin-top:10px">${BADGES.map(b => `<span class="badge ${b[2]() ? '' : 'off'}" title="${esc(b[1])}">${esc(b[0])}</span>`).join('')}</div></div>
      </div>
      <h2>Levels</h2>
      <div class="grid g2">${LEVELS.map((l, i) => `
        <a class="card level" href="#/level/${l.key}"><span class="num">${i + 1}</span>
          <h3>${esc(l.name)}</h3><div>${starHTML(stars(l.key))}</div>
          <div class="small muted" style="margin-top:6px">Quiz best: ${Math.round(pct('quiz:' + l.key) * 100)}% · Boss: ${S.best['boss:' + l.key] && S.best['boss:' + l.key].pass ? 'beaten' : 'not yet'}</div></a>`).join('')}</div>
      <p class="small muted" style="margin-top:18px">★ quiz 60%+ &nbsp; ★★ quiz 90%+ &nbsp; ★★★ boss beaten</p>`;
  });

  // ---------- level page
  route(/^\/level\/([\w-]+)$/, (key) => {
    const l = lvl(key); if (!l) return (location.hash = '#/');
    const learned = S.best['learn:' + key];
    $app.innerHTML = `<a class="back" href="#/">← Map</a><h1>${esc(l.name)}</h1><div>${starHTML(stars(key))}</div>
      <div class="grid g3" style="margin-top:16px">
        <div class="card"><h3>1. Learn</h3><p class="muted small">Flip through the key-fact cards.</p><p class="small">${learned ? 'Done (+20 XP)' : '+20 XP when you see every card'}</p><a class="btn" href="#/learn/${key}">Open cards</a></div>
        <div class="card"><h3>2. Quiz</h3><p class="muted small">10 questions. Feedback after each answer.</p><p class="small">Best: ${Math.round(pct('quiz:' + key) * 100)}%</p><a class="btn" href="#/quiz/${key}">Start quiz</a></div>
        <div class="card"><h3>3. Boss round</h3><p class="muted small">5 questions, 20 seconds each. Get 4 right to win. Faster answers earn more XP.</p>
          <p class="small">${S.best['boss:' + key] ? 'Best: ' + S.best['boss:' + key].score + '/5' : 'Not tried yet'}</p><a class="btn" href="#/boss/${key}">Fight the boss</a></div>
      </div>`;
  });

  // ---------- learn (flash cards)
  route(/^\/learn\/([\w-]+)$/, (key) => {
    const l = lvl(key); const groups = FACTS[l.facts].groups; let i = 0, flipped = false; const seen = new Set();
    function draw() {
      const g = groups[i]; seen.add(i);
      $app.innerHTML = `<a class="back" href="#/level/${key}">← ${esc(l.name)}</a>
        <div class="spread"><h1>Learn: ${esc(l.name)}</h1><span class="muted">Card ${i + 1} / ${groups.length}</span></div>
        <div class="bar" style="margin-bottom:14px"><i style="width:${(seen.size / groups.length) * 100}%"></i></div>
        <div class="flash" id="fc">${flipped
          ? `<div class="face"><h3>${esc(g.cat)}</h3><ol>${g.items.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`
          : `<div class="face front"><div class="pill">${esc(l.short)}</div><h2 style="margin-top:12px">${esc(g.cat)}</h2><p class="muted">What do you remember? Click the card to check.</p></div>`}</div>
        <div class="spread" style="margin-top:14px"><button class="btn ghost" id="prev" ${i === 0 ? 'disabled' : ''}>← Previous</button>
          <button class="btn ghost" id="flip">${flipped ? 'Hide facts' : 'Show facts'}</button>
          <button class="btn" id="next">${i === groups.length - 1 ? 'Finish' : 'Next →'}</button></div>`;
      document.getElementById('fc').onclick = document.getElementById('flip').onclick = () => { flipped = !flipped; draw(); };
      document.getElementById('prev').onclick = () => { i--; flipped = false; draw(); };
      document.getElementById('next').onclick = () => {
        if (i < groups.length - 1) { i++; flipped = false; draw(); return; }
        if (seen.size === groups.length) { const r = record('learn:' + key, 1, 1, 20); toast(r.gained ? '+20 XP – cards finished!' : 'Cards finished.'); }
        location.hash = '#/level/' + key;
      };
    }
    draw();
  });

  // ---------- quiz engine (used by quiz + boss)
  function runQuiz({ key, title, qs, timed, onEnd }) {
    let i = 0, score = 0, streak = 0, bonus = 0, timer = null; const wrong = [];
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    cleanup = stop;
    function draw() {
      const q = qs[i];
      const body = q.t === 'mc'
        ? `<div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><b>${L4[k]}</b>${esc(o)}</button>`).join('')}</div>`
        : q.t === 'tf'
          ? `<div class="opts"><button class="opt" data-k="1"><b>T</b>True</button><button class="opt" data-k="0"><b>F</b>False</button></div>`
          : `<div class="row"><input id="gap" placeholder="Type your answer${q.a.length > 1 ? 's, separated by commas' : ''}" style="max-width:420px"><button class="btn" id="chk">Check</button></div>`;
      $app.innerHTML = `<a class="back" href="#/level/${key}">← Quit</a>
        <div class="card"><div class="qhead"><b>${esc(title)}</b><span>Question ${i + 1} / ${qs.length} · Score ${score}${streak >= 2 ? ` · <span class="streak">Streak ${streak}</span>` : ''}</span></div>
        <div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        ${timed ? '<div class="bar time" style="margin-top:6px"><i id="tb" style="width:100%"></i></div>' : ''}
        <div class="qtext">${q.t === 'tf' ? 'True or False? ' : ''}${esc(q.q).replace(/_{3,}/g, '______')}</div>${body}<div id="fb"></div></div>`;
      const t0 = Date.now(), LIMIT = 20000;
      if (timed) {
        timer = setInterval(() => {
          const left = Math.max(0, LIMIT - (Date.now() - t0)); const tb = document.getElementById('tb');
          if (tb) tb.style.width = (left / LIMIT * 100) + '%';
          if (left <= 0) { stop(); answer(null, 0); }
        }, 100);
      }
      const secsLeft = () => Math.max(0, Math.ceil((LIMIT - (Date.now() - t0)) / 1000));
      if (q.t === 'gap') {
        const inp = document.getElementById('gap'); inp.focus();
        const doIt = () => { const parts = q.a.length > 1 ? inp.value.split(/,|;|\//) : [inp.value]; answer(parts, secsLeft()); };
        document.getElementById('chk').onclick = doIt; inp.onkeydown = (e) => { if (e.key === 'Enter') doIt(); };
      } else $app.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k, secsLeft()));
    }
    function answer(val, secs) {
      stop(); const q = qs[i]; let ok;
      if (q.t === 'mc') ok = val === q.a;
      else if (q.t === 'tf') ok = val === (q.a ? 1 : 0);
      else ok = Array.isArray(val) && q.a.length === val.length && q.a.every((a, k) => norm(a) === norm(val[k] || ''));
      if (ok) { score++; streak++; if (timed) bonus += Math.ceil(secs / 2); else if (streak >= 3) bonus += 2; } else { streak = 0; wrong.push({ test: title, q: q.q }); }
      $app.querySelectorAll('.opt').forEach(b => {
        b.disabled = true; const k = +b.dataset.k;
        const isRight = q.t === 'mc' ? k === q.a : k === (q.a ? 1 : 0);
        if (isRight) b.classList.add('right'); else if (k === val) b.classList.add('wrong');
      });
      const ans = q.t === 'mc' ? L4[q.a] + '. ' + q.opts[q.a] : q.t === 'tf' ? (q.a ? 'True' : 'False') : q.a.join(' / ');
      document.getElementById('fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'Correct!' : val === null ? 'Time is up.' : 'Not quite.'}</b> Answer: ${esc(ans)}<br><span class="small">${esc(q.why || '')}</span></div>
        <div style="margin-top:12px;text-align:right"><button class="btn" id="nx">${i === qs.length - 1 ? 'See result' : 'Next →'}</button></div>`;
      const gi = document.getElementById('gap'); if (gi) { gi.disabled = true; document.getElementById('chk').disabled = true; }
      document.getElementById('nx').onclick = () => { i++; if (i < qs.length) draw(); else onEnd(score, bonus, wrong); };
      document.getElementById('nx').focus();
    }
    draw();
  }
  function pickQuestions(key, n, opts = {}) {
    const l = lvl(key); let pool = QUIZ[l.quiz].slice();
    if (opts.noGap) pool = pool.filter(q => q.t !== 'gap');
    const fresh = shuffle(pool); return fresh.slice(0, Math.min(n, fresh.length));
  }
  function resultScreen({ key, title, score, max, xp, gained, better, extra }) {
    $app.innerHTML = `<div class="card result"><h1>${esc(title)}</h1><div class="big">${score} / ${max}</div>
      <p>${xp} XP this time${better ? ` · <b>new best (+${gained} XP)</b>` : ' · your best score is kept'}</p>${extra || ''}
      <div class="row" style="justify-content:center;margin-top:16px"><a class="btn ghost" href="#/level/${key}">Back to level</a><button class="btn" id="again">Try again</button></div></div>`;
    document.getElementById('again').onclick = () => go();
  }

  route(/^\/quiz\/([\w-]+)$/, (key) => {
    const l = lvl(key), qs = pickQuestions(key, 10);
    runQuiz({ key, title: 'Quiz – ' + l.name, qs, onEnd: (score, bonus, wrong) => {
      const xp = score * 10 + bonus, r = record('quiz:' + key, score, qs.length, xp, null, wrong);
      const p = score / qs.length;
      resultScreen({ key, title: 'Quiz – ' + l.name, score, max: qs.length, xp, gained: r.gained, better: r.better,
        extra: `<p>${p >= .9 ? 'Excellent!' : p >= .6 ? 'Good job!' : 'Review the cards and try again – 60% gives you the first star.'}</p>` });
    } });
  });
  route(/^\/boss\/([\w-]+)$/, (key) => {
    const l = lvl(key);
    let qs = shuffle(QUIZ[l.quiz].filter(q => q.reverse)).concat(pickQuestions(key, 10, { noGap: true }));
    qs = qs.filter((q, k) => qs.findIndex(x => x.q === q.q) === k).slice(0, 5);
    runQuiz({ key, title: 'Boss – ' + l.name, qs, timed: true, onEnd: (score, bonus, wrong) => {
      const pass = score >= 4, xp = score * 10 + bonus;
      const r = record('boss:' + key, score, 5, xp, pass ? { pass: true } : null, wrong);
      resultScreen({ key, title: 'Boss – ' + l.name, score, max: 5, xp, gained: r.gained, better: r.better,
        extra: `<p><b>${pass ? 'Boss beaten! ★★★ unlocked (if your quiz has 1 star).' : 'The boss survived. You need 4 correct answers.'}</b></p>` });
    } });
  });

  // ---------- mini-games
  route(/^\/games$/, () => {
    const best = (g) => S.best['game:' + g] ? S.best['game:' + g].xp + ' XP' : 'not played';
    $app.innerHTML = `<h1>Mini-games</h1><p class="muted">Short games mixing all ten tests. Your best result in each game counts.</p>
      <div class="grid g3">
        <div class="card"><h3>Who am I?</h3><p class="small muted">Clues appear one by one. Name the test with as few clues as possible.</p><p class="small">Best: ${best('who')}</p><a class="btn" href="#/games/who">Play</a></div>
        <div class="card"><h3>Match the score</h3><p class="small muted">Match each test and level with its score range.</p><p class="small">Best: ${best('match')}</p><a class="btn" href="#/games/match">Play</a></div>
        <div class="card"><h3>Odd one out</h3><p class="small muted">Three tests share a feature. Find the one that doesn’t.</p><p class="small">Best: ${best('odd')}</p><a class="btn" href="#/games/odd">Play</a></div>
      </div>`;
  });

  const MASK = /IELTS General Training|IELTS Academic|IELTS for UKVI|IELTS Life Skills|IELTS|TOEIC Bridge|TOEIC|TOEFL iBT|TOEFL Junior|TOEFL Primary|TOEFL|Aptis ESOL Advanced|Aptis ESOL General|Aptis ESOL|Aptis Advanced|Aptis General|Aptis|B2 First for Schools|B2 First|C1 Advanced|VSTEP\.3-5|VSTEP|Linguaskill Business|Linguaskill|FCE|CAE|\bGT\b|\bAcademic\b(?= Reading| Writing| and)|General Training/g;
  route(/^\/games\/who$/, () => {
    const ROUNDS = 5, order = ['Validity of results', 'Official holder and organiser', 'Skills, parts and time', 'CEFR range and B2 / C1 scores', 'Main target test-takers', 'Important facts to remember (what makes it different)'];
    const picks = shuffle(LEVELS.map((l, i) => i)).slice(0, ROUNDS);
    let r = 0, total = 0;
    function round() {
      const li = picks[r], l = LEVELS[li], fact = FACTS[l.facts];
      const clues = order.map(cat => { const g = fact.groups.find(x => x.cat === cat); if (!g) return null;
        const items = g.items.filter(t => !/For reference/.test(t)); return items.length ? items[Math.floor(Math.random() * items.length)].replace(MASK, 'this test') : null; }).filter(Boolean).slice(0, 5);
      let shown = 1, over = false;
      function draw(msg) {
        $app.innerHTML = `<a class="back" href="#/games">← Games</a><div class="card"><div class="qhead"><b>Who am I?</b><span>Round ${r + 1} / ${ROUNDS} · ${total} points</span></div>
          <ol class="clues">${clues.slice(0, shown).map(c => `<li>${esc(c)}</li>`).join('')}</ol>
          <p class="small muted">${over ? '' : `This answer is worth <b>${(6 - shown) * 10}</b> points.`}</p>
          <div class="answers">${LEVELS.map((x, k) => `<button class="opt" data-k="${k}" ${over ? 'disabled' : ''}>${esc(x.name)}</button>`).join('')}</div>
          <div class="row" style="margin-top:12px">${!over && shown < clues.length ? '<button class="btn ghost" id="more">Show another clue</button>' : ''}${over ? `<button class="btn" id="nx">${r === ROUNDS - 1 ? 'See result' : 'Next round →'}</button>` : ''}</div>
          ${msg || ''}</div>`;
        const more = document.getElementById('more'); if (more) more.onclick = () => { shown++; draw(); };
        $app.querySelectorAll('.answers .opt').forEach(b => b.onclick = () => {
          const k = +b.dataset.k, ok = k === li; over = true; const pts = ok ? (6 - shown) * 10 : 0; total += pts; shown = clues.length;
          draw(`<div class="feedback ${ok ? 'ok' : 'no'}">${ok ? `Correct! +${pts} points.` : 'Not this one.'} The answer is <b>${esc(l.name)}</b>.</div>`);
          $app.querySelectorAll('.answers .opt').forEach(x => { if (+x.dataset.k === li) x.classList.add('right'); else if (+x.dataset.k === k) x.classList.add('wrong'); });
        });
        const nx = document.getElementById('nx'); if (nx) nx.onclick = () => { r++; if (r < ROUNDS) round(); else finish(); };
      }
      draw();
    }
    function finish() {
      const xp = Math.round(total / 2), res = record('game:who', total, ROUNDS * 50, xp);
      $app.innerHTML = `<div class="card result"><h1>Who am I?</h1><div class="big">${total} points</div><p>${xp} XP${res.better ? ` · <b>new best (+${res.gained} XP)</b>` : ''}</p>
        <div class="row" style="justify-content:center"><a class="btn ghost" href="#/games">Games</a><button class="btn" id="again">Play again</button></div></div>`;
      document.getElementById('again').onclick = () => go();
    }
    round();
  });

  route(/^\/games\/match$/, () => {
    const seenScore = new Set();
    const pairs = shuffle(window.SCORES).filter(p => !seenScore.has(p[2]) && seenScore.add(p[2])).slice(0, 6);
    const right = shuffle(pairs.map((p, k) => k)); let sel = null, done = new Set(), mistakes = 0;
    function draw() {
      $app.innerHTML = `<a class="back" href="#/games">← Games</a><div class="card"><div class="qhead"><b>Match the score</b><span>Mistakes: ${mistakes}</span></div>
        <p class="small muted">Click a test on the left, then its score on the right.</p>
        <div class="match"><div class="col">${pairs.map((p, k) => `<button class="chip ${done.has(k) ? 'done' : ''} ${sel === k ? 'sel' : ''}" data-l="${k}" ${done.has(k) ? 'disabled' : ''}><b>${esc(p[0])}</b><br><span class="small">${esc(p[1])}</span></button>`).join('')}</div>
        <div class="col">${right.map(k => `<button class="chip ${done.has(k) ? 'done' : ''}" data-r="${k}" ${done.has(k) ? 'disabled' : ''}>${esc(pairs[k][2])}</button>`).join('')}</div></div></div>`;
      $app.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { sel = +b.dataset.l; draw(); });
      $app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
        if (sel === null) return toast('Choose a test on the left first.');
        const k = +b.dataset.r;
        if (k === sel) { done.add(k); sel = null; if (done.size === pairs.length) return finish(); draw(); }
        else { mistakes++; b.classList.add('bad'); setTimeout(draw, 500); }
      });
    }
    function finish() {
      const score = Math.max(0, 60 - mistakes * 10), res = record('game:match', score, 60, score);
      $app.innerHTML = `<div class="card result"><h1>Match the score</h1><div class="big">${score} XP</div><p>${mistakes} mistake(s)${res.better ? ` · <b>new best (+${res.gained} XP)</b>` : ''}</p>
        <div class="row" style="justify-content:center"><a class="btn ghost" href="#/games">Games</a><button class="btn" id="again">Play again</button></div></div>`;
      document.getElementById('again').onclick = () => go();
    }
    draw();
  });

  route(/^\/games\/odd$/, () => {
    const rounds = shuffle(window.ODD).slice(0, 5); let r = 0, score = 0;
    function draw(msg, picked) {
      const g = rounds[r]; if (!g.order) g.order = shuffle([0, 1, 2, 3]);
      $app.innerHTML = `<a class="back" href="#/games">← Games</a><div class="card"><div class="qhead"><b>Odd one out</b><span>Round ${r + 1} / 5 · Score ${score}</span></div>
        <p class="qtext">Three of these share this feature: <i>${esc(g.prompt)}</i>. Which one does NOT?</p>
        <div class="opts">${g.order.map(k => `<button class="opt ${picked !== undefined ? (k === g.odd ? 'right' : k === picked ? 'wrong' : '') : ''}" data-k="${k}" ${picked !== undefined ? 'disabled' : ''}>${esc(g.items[k])}</button>`).join('')}</div>
        ${msg || ''}</div>`;
      $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === g.odd; if (ok) score += 20;
        draw(`<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'Correct! +20' : 'Not quite.'}</b> ${esc(g.why)}</div><div style="text-align:right;margin-top:12px"><button class="btn" id="nx">${r === 4 ? 'See result' : 'Next →'}</button></div>`, k);
        document.getElementById('nx').onclick = () => { r++; if (r < 5) draw(); else finish(); };
      });
    }
    function finish() {
      const res = record('game:odd', score / 20, 5, score);
      $app.innerHTML = `<div class="card result"><h1>Odd one out</h1><div class="big">${score} XP</div><p>${score / 20} / 5 correct${res.better ? ` · <b>new best (+${res.gained} XP)</b>` : ''}</p>
        <div class="row" style="justify-content:center"><a class="btn ghost" href="#/games">Games</a><button class="btn" id="again">Play again</button></div></div>`;
      document.getElementById('again').onclick = () => go();
    }
    draw();
  });

  // ---------- reading arena
  const countQ = (p) => p.groups.reduce((a, g) => a + (g.type === 'multi' ? g.pick : g.items.length), 0);
  route(/^\/reading$/, () => {
    $app.innerHTML = `<h1>Reading Arena</h1><p class="muted">IELTS-style reading practice for the final exam. Read the passage on the left and answer on the right. Your answers are marked only when you press <b>Submit</b>. Each correct answer = 8 XP (best attempt counts).</p>
      <div class="grid g2">${READING.map(p => { const b = S.best['read:' + p.id];
        return `<div class="card"><div class="pill">${esc(p.source)}</div><h3 style="margin-top:8px">${esc(p.title)}</h3><p class="small muted">${countQ(p)} questions · about 20 minutes</p>
        <p class="small">${b ? `Best: ${b.score} / ${b.max}` : 'Not tried yet'}</p><a class="btn" href="#/reading/${p.id}">Start</a></div>`; }).join('')}</div>`;
  });
  route(/^\/reading\/([\w-]+)$/, (id) => {
    const p = READING.find(x => x.id === id); if (!p) return (location.hash = '#/reading');
    let n = 0; const t0 = Date.now();
    const qhtml = p.groups.map((g, gi) => {
      let inner = '';
      if (g.type === 'multi') {
        const start = n + 1; n += g.pick;
        inner = `<div class="ritem" data-g="${gi}" data-i="0"><div class="n">${start}–${n}</div><div><div class="mcopts">${g.opts.map(([L, t]) => `<label><input type="checkbox" value="${L}"> <span><b>${L}</b> ${esc(t)}</span></label>`).join('')}</div><div class="kk"></div></div></div>`;
      } else inner = g.items.map((it, ii) => {
        n++; const q = it[0];
        let ctl;
        if (g.type === 'tfng') ctl = `<select><option value="">–</option><option>TRUE</option><option>FALSE</option><option>NOT GIVEN</option></select>`;
        else if (g.type === 'letter') ctl = `<select><option value="">–</option>${g.opts.map(o => `<option>${o}</option>`).join('')}</select>`;
        else if (g.type === 'gap') ctl = `<input type="text" autocomplete="off">`;
        else ctl = `<div class="mcopts">${it[1].map((o, k) => `<label><input type="radio" name="q${gi}_${ii}" value="${L4[k]}"> <span><b>${L4[k]}</b> ${esc(o)}</span></label>`).join('')}</div>`;
        return `<div class="ritem" data-g="${gi}" data-i="${ii}"><div class="n">${n}</div><div>${esc(q).replace(/_{3,}/g, '______')}<div>${ctl}</div><div class="kk"></div></div></div>`;
      }).join('');
      const m = g.intro.match(/^(.*?)(List of [^:]+):(.*)$/);
      const introHTML = m ? `${esc(m[1])}<div class="headings"><b>${esc(m[2])}</b>${m[3].split('·').map(h => `<div>${esc(h.trim())}</div>`).join('')}</div>` : esc(g.intro);
      return `<div class="qgroup"><div class="intro">${introHTML}</div>${inner}</div>`;
    }).join('');
    $app.innerHTML = `<div class="spread" style="margin-bottom:10px"><a class="back" href="#/reading" style="margin:0">← Reading Arena</a>
      <span>Time: <span class="timer" id="clock">00:00</span></span><button class="btn" id="submit">Submit</button></div>
      <div class="split"><div class="passage"><h2>${esc(p.title)}</h2>${p.paras.map(x => `<p>${x.label ? `<span class="lab">${esc(x.label)}</span>` : ''}${x.text}</p>`).join('')}</div>
      <div id="qs">${qhtml}<div style="text-align:right"><button class="btn" id="submit2">Submit</button></div></div></div>`;
    const clock = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const c = document.getElementById('clock'); if (c) c.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000);
    cleanup = () => clearInterval(clock);
    let submitted = false;
    const submit = () => {
      if (submitted) return;
      const blanks = [...$app.querySelectorAll('.ritem select, .ritem input[type=text]')].filter(x => !x.value.trim()).length;
      if (blanks && !confirm(`You have ${blanks} unanswered question(s). Submit anyway?`)) return;
      submitted = true; clearInterval(clock);
      let score = 0; const max = countQ(p), wrong = [];
      $app.querySelectorAll('.ritem').forEach(el => {
        const g = p.groups[+el.dataset.g], it = g.items ? g.items[+el.dataset.i] : null, kk = el.querySelector('.kk');
        if (g.type === 'multi') {
          const picked = [...el.querySelectorAll('input:checked')].map(x => x.value);
          const hit = picked.filter(x => g.answer.includes(x)).length - Math.max(0, picked.length - g.pick);
          const pts = Math.max(0, Math.min(g.pick, hit)); score += pts;
          el.classList.add(pts === g.pick ? 'ok' : 'no'); kk.innerHTML = `<div class="key">Answer: ${g.answer.join(', ')} (${pts}/${g.pick})</div>`;
          if (pts < g.pick) wrong.push({ test: 'Reading – ' + p.title, q: g.intro });
          return;
        }
        let val, ok, ans;
        if (g.type === 'mc') { const c = el.querySelector('input:checked'); val = c ? c.value : ''; ok = val === it[2]; ans = it[2]; }
        else if (g.type === 'gap') { val = el.querySelector('input').value; ok = it[1].some(a => norm(a) === norm(val)); ans = it[1][0]; }
        else { val = el.querySelector('select').value; ok = val === it[1]; ans = it[1]; }
        if (ok) score++; else wrong.push({ test: 'Reading – ' + p.title, q: it[0] });
        el.classList.add(ok ? 'ok' : 'no'); kk.innerHTML = ok ? '' : `<div class="key">Answer: ${esc(ans)}</div>`;
      });
      $app.querySelectorAll('.ritem input, .ritem select').forEach(x => x.disabled = true);
      const secs = Math.floor((Date.now() - t0) / 1000), xp = score * 8;
      const res = record('read:' + p.id, score, max, xp, { secs }, wrong);
      document.getElementById('qs').insertAdjacentHTML('afterbegin', `<div class="feedback ${score / max >= .6 ? 'ok' : 'no'}" style="margin:0 0 14px"><b>${score} / ${max} correct</b> in ${Math.floor(secs / 60)} min ${secs % 60} s · ${xp} XP${res.better ? ` · new best (+${res.gained} XP)` : ''}
        <div class="row" style="margin-top:8px"><button class="btn small" id="retry">Try again</button><a class="btn small ghost" href="#/reading">Other passages</a></div></div>`);
      document.getElementById('qs').scrollTop = 0;
      document.getElementById('retry').onclick = () => go();
      ['submit', 'submit2'].forEach(x => document.getElementById(x).disabled = true);
    };
    document.getElementById('submit').onclick = submit; document.getElementById('submit2').onclick = submit;
  });

  // ---------- ranking
  route(/^\/rank$/, () => {
    $app.innerHTML = `<h1>Class ranking</h1><div id="rk"><p class="muted">Loading…</p></div>`;
    const me = { name: S.profile.name, xp: totalXP(), stars: totalStars(), badges: myBadges().length, mine: true };
    let data = null;
    function draw() {
      const box = document.getElementById('rk'); if (!box) return;
      let rows = data || [me];
      if (data) { rows = rows.map(r => r.id_hash === hashId(S.profile.id) ? Object.assign({}, r, { mine: true, xp: Math.max(r.xp, me.xp) }) : r); }
      rows.sort((a, b) => b.xp - a.xp);
      box.innerHTML = (data ? '' : `<p class="muted small">${CFG.SHEET_URL ? 'Could not load the class ranking right now – showing your own score.' : 'The class ranking is not connected yet – showing your own score only.'}</p>`) +
        `<table class="rank"><tr><th>#</th><th>Name</th><th>XP</th><th>Stars</th><th>Badges</th></tr>${rows.map((r, k) =>
          `<tr class="${r.mine ? 'mine' : ''}"><td class="pos">${k + 1}</td><td>${esc(r.name)}</td><td>${r.xp}</td><td>${r.stars || 0}</td><td>${r.badges || 0}</td></tr>`).join('')}</table>`;
    }
    if (!CFG.SHEET_URL) return draw();
    fetch(CFG.SHEET_URL + '?action=board').then(r => r.json()).then(j => { data = j.players || []; if (!data.some(r => r.id_hash === hashId(S.profile.id))) data.push(Object.assign({ id_hash: hashId(S.profile.id) }, me)); draw(); })
      .catch(() => draw());
  });
  // same short hash is computed in the Apps Script, so student IDs are never shown publicly
  function hashId(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); }

  renderMe(); go();
})();
