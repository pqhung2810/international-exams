/* Test Quest – retro pixel review game for the International Tests module.
   Plain JavaScript, no build step. Progress is stored in the browser (localStorage);
   scores are sent to a Google Sheet (CONFIG.SHEET_URL) for the class ranking. */
(function () {
  'use strict';
  const CFG = window.CONFIG, LEVELS = window.LEVELS, FACTS = window.FACTS, QUIZ = window.QUIZ, READING = window.READING;
  const SPR = window.SPR, FX = window.FX, SFX = FX.SFX, spr = SPR.spr;
  const $app = document.getElementById('app');
  const STORE = 'testquest_v1', LAST = 'testquest_last';

  // ---------- helpers
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => String(s).toLowerCase().replace(/[‘’'"“”.,!?;:()]/g, '').replace(/\s+/g, ' ').trim();
  const L4 = 'ABCD';
  const $ = (id) => document.getElementById(id);
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }
  const getLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ---------- state
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  let S = load(); S.best = S.best || {};
  function save() { setLS(STORE, JSON.stringify(S)); }
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
  const starHTML = (n, px) => '<span class="stars">' + [0, 1, 2].map(k => spr(k < n ? 'star' : 'star0', px || 2)).join(' ') + '</span>';
  const totalStars = () => LEVELS.reduce((a, l) => a + stars(l.key), 0);

  // player level: one level every 200 XP
  const STEP = 200;
  const TITLES = [[1, 'Novice'], [3, 'Apprentice'], [5, 'Explorer'], [8, 'Knight'], [11, 'Champion'], [14, 'Legend']];
  const lvOf = (xp) => Math.floor(xp / STEP) + 1;
  const titleOf = (lv) => TITLES.filter(t => lv >= t[0]).pop()[1];
  const avIdx = () => S.profile && S.profile.av != null ? S.profile.av : (S.profile ? parseInt(hashId(S.profile.id), 36) % SPR.AVATARS.length : 0);

  const BADGES = [
    ['First steps', 'Finish any activity', () => Object.keys(S.best).length > 0],
    ['IELTS Insider', '80%+ in both IELTS quizzes', () => pct('quiz:ielts-ac') >= .8 && pct('quiz:ielts-gt') >= .8],
    ['ETS Expert', '80%+ in TOEIC and TOEFL quizzes', () => pct('quiz:toeic') >= .8 && pct('quiz:toefl') >= .8],
    ['British Council Pro', '80%+ in both Aptis quizzes', () => pct('quiz:aptis-g') >= .8 && pct('quiz:aptis-a') >= .8],
    ['Cambridge Champion', '80%+ in B2 First, C1 Advanced and Linguaskill', () => ['b2', 'c1', 'lingua'].every(k => pct('quiz:' + k) >= .8)],
    ['Home Hero', '80%+ in the VSTEP quiz', () => pct('quiz:vstep') >= .8],
    ['Boss Slayer', 'Beat all 10 bosses', () => LEVELS.every(l => S.best['boss:' + l.key] && S.best['boss:' + l.key].pass)],
    ['Bookworm', '60%+ in all reading passages', () => READING.every(r => pct('read:' + r.id) >= .6)],
    ['Game Master', 'Play all three arcade games', () => ['who', 'match', 'odd'].every(g => S.best['game:' + g])],
  ];
  const myBadges = () => BADGES.filter(b => b[2]()).map(b => b[0]);

  // record a finished activity; keeps the best result only
  function record(activity, score, max, xp, extra, wrong) {
    const old = S.best[activity], lvBefore = lvOf(totalXP());
    const better = !old || xp > old.xp || (extra && extra.pass && !old.pass);
    if (better) S.best[activity] = Object.assign({ score, max, xp }, extra || {}, old && old.pass ? { pass: true } : {});
    save(); renderMe(); sync(activity, score, max, wrong || []);
    const lvAfter = lvOf(totalXP());
    if (lvAfter > lvBefore) setTimeout(() => levelUp(lvAfter), 900);
    return { better, gained: better ? xp - (old ? old.xp : 0) : 0 };
  }
  function sync(activity, score, max, wrong) {
    if (!CFG.SHEET_URL || !S.profile) return;
    const body = JSON.stringify({ id: S.profile.id, name: S.profile.name, xp: totalXP(), stars: totalStars(),
      badges: myBadges().length, activity, score, max, wrong, key: S.profile.key, progress: S.best });
    fetch(CFG.SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }).catch(() => {});
  }
  function renderMe() {
    const el = $('me');
    el.innerHTML = S.profile ? `${SPR.avatar(avIdx(), 2)}<span class="nm">${esc(S.profile.name.split(' ').pop())}</span>${spr('coin', 2)}<b>${totalXP()}</b>` : '';
  }
  function levelUp(lv) {
    SFX.level(); FX.confetti(120);
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="card"><div class="bob">${SPR.avatar(avIdx(), 6)}</div><div class="lvup blink">LEVEL UP!</div>
      <p class="pix" style="font-size:12px">LV ${lv} · ${titleOf(lv).toUpperCase()}</p><button class="btn">OK</button></div>`;
    document.body.appendChild(o); o.onclick = (e) => { if (e.target === o) o.remove(); }; o.querySelector('button').onclick = () => o.remove(); o.querySelector('button').focus();
  }
  // sound button
  const snd = $('snd');
  const drawSnd = () => { snd.innerHTML = spr(FX.isOn() ? 'speaker' : 'mute', 3); snd.title = FX.isOn() ? 'Sound: on' : 'Sound: off'; };
  snd.onclick = () => { FX.toggle(); drawSnd(); }; drawSnd();
  document.addEventListener('click', (e) => { if (e.target.closest('.btn, .nav a, .back')) SFX.click(); });

  // ---------- router
  const routes = [];
  const route = (re, fn) => routes.push([re, fn]);
  let cleanup = null;
  function go() {
    if (cleanup) { cleanup(); cleanup = null; }
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    const h = location.hash.replace(/^#/, '') || '/';
    if ((!S.profile || !S.profile.key) && h !== '/login') { location.hash = '#/login'; return; }
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', ('#' + h).startsWith(a.getAttribute('href')) && (a.getAttribute('href') !== '#/' || h === '/' || h.startsWith('/level') || h.startsWith('/learn') || h.startsWith('/quiz') || h.startsWith('/boss'))));
    for (const [re, fn] of routes) { const m = h.match(re); if (m) { window.scrollTo(0, 0); fn(...m.slice(1)); return; } }
    location.hash = '#/';
  }
  window.addEventListener('hashchange', go);
  const lvl = (key) => LEVELS.find(l => l.key === key);
  const lvlIndex = (key) => LEVELS.findIndex(l => l.key === key);
  const avatarPicker = (sel) => `<div class="avpick" id="avp">${SPR.AVATARS.map((a, k) => `<button type="button" data-av="${k}" class="${k === sel ? 'sel' : ''}" aria-label="Hero ${k + 1}">${SPR.avatar(k, 3)}</button>`).join('')}</div>`;
  function bindPicker(onPick) {
    $app.querySelectorAll('#avp button').forEach(b => b.onclick = () => {
      $app.querySelectorAll('#avp button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); SFX.click(); onPick(+b.dataset.av);
    });
  }

  // ---------- title screen / sign in
  route(/^\/login$/, () => {
    let av = avIdx();
    $app.innerHTML = `<div class="title"><div class="cast">${SPR.boss(0, 4, 'bob')}<span id="bigav">${SPR.avatar(av, 7, 'bob')}</span>${SPR.boss(3, 4, 'bob')}</div>
        <div class="logo">TEST<br>QUEST</div><div class="sub">${esc(CFG.COURSE)}</div></div>
      <div class="card" style="max-width:540px;margin:0 auto">
      <h2>${S.profile ? 'Continue' : 'New game'}</h2>
      <label for="nm">Your name (shown in the ranking)</label><input id="nm" maxlength="40" value="${esc(S.profile ? S.profile.name : '')}">
      <label for="sid">Student ID</label><input id="sid" inputmode="numeric" maxlength="12" value="${esc(S.profile ? S.profile.id : '')}">
      <label for="pin">PIN (4 digits)</label><input id="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="current-password">
      <label>Choose your hero</label>${avatarPicker(av)}
      <p class="small muted"><b>First time?</b> Choose any 4-digit PIN and remember it.<br><b>Another phone or computer?</b> Use the same student ID and PIN – your progress comes back.</p>
      <button class="btn" id="go"><span class="blink">▶</span> Press start</button> <span id="wait" class="small muted"></span></div>`;
    bindPicker(k => { av = k; $('bigav').innerHTML = SPR.avatar(av, 7, 'bob'); });
    const btn = $('go');
    btn.onclick = async () => {
      const name = $('nm').value.trim(), id = $('sid').value.trim(), pin = $('pin').value.trim();
      if (name.length < 2) return toast('Please type your name.');
      if (!/^\d{6,12}$/.test(id)) return toast('Please type your student ID (numbers only).');
      if (!/^\d{4}$/.test(pin)) return toast('Please type a 4-digit PIN.');
      const key = hashId(id + ':' + pin + ':testquest');
      if (S.profile && S.profile.id !== id) S.best = {}; // a different student on this device
      if (CFG.SHEET_URL) {
        btn.disabled = true; $('wait').textContent = 'Loading…';
        try {
          const j = await fetch(`${CFG.SHEET_URL}?action=load&id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`).then(r => r.json());
          if (j.status === 'wrong') { btn.disabled = false; $('wait').textContent = ''; SFX.wrong(); return toast('Wrong PIN for this student ID. Ask your teacher if you forgot it.'); }
          if (j.status === 'ok') { merge(j.progress); toast('Welcome back! Your progress has been loaded.'); }
        } catch (e) { toast('Could not reach the ranking server – you can still play; progress will sync later.'); }
      }
      S.profile = { name, id, key, av }; save(); renderMe(); SFX.win(); sync('sign-in', 0, 0, []); location.hash = '#/';
    };
  });

  function playerCard() {
    const xp = totalXP(), lv = lvOf(xp), into = xp % STEP;
    return `<div class="card pcard"><div class="ava">${SPR.avatar(avIdx(), 6, 'bob')}</div><div>
      <div class="nm">${esc(S.profile.name)}</div><div class="lv">LV ${lv} · ${titleOf(lv).toUpperCase()}</div>
      <div class="xpbar"><i style="width:${into / STEP * 100}%"></i></div><div class="xptext">${into} / ${STEP} XP to LV ${lv + 1}</div>
      <div class="stats"><span>${spr('coin', 3)} ${xp} XP</span><span>${spr('star', 3)} ${totalStars()} / 30</span><span>${spr('trophy', 2)} ${myBadges().length} / ${BADGES.length}</span></div></div></div>`;
  }
  const badgeList = () => `<div class="badges">${BADGES.map(b => `<span class="badge ${b[2]() ? '' : 'off'}" title="${esc(b[1])}">${esc(b[0])}</span>`).join('')}</div>`;

  route(/^\/profile$/, () => {
    $app.innerHTML = `<a class="back" href="#/">Map</a>${playerCard()}
      <div class="card" style="margin-top:22px"><h2>Change your hero</h2>${avatarPicker(avIdx())}
      <h2 style="margin-top:22px">Badges</h2>${BADGES.map(b => `<div class="row" style="margin:6px 0">${spr('trophy', 2, { cls: b[2]() ? '' : 'off' })}<span ${b[2]() ? '' : 'class="muted"'}><b>${esc(b[0])}</b> – ${esc(b[1])}</span></div>`).join('')}
      <p class="small">Student ID: ${esc(S.profile.id)}</p>
      <div class="row"><a class="btn ghost" href="#/login">Edit my details</a><button class="btn danger" id="out">Sign out</button></div>
      <p class="small muted">Signing out removes your progress from this browser only. ${CFG.SHEET_URL ? 'It is kept online – sign in again with your student ID and PIN to get it back.' : ''}</p></div>`;
    $app.querySelectorAll('img.off').forEach(i => i.style.filter = 'grayscale(1) opacity(.4)');
    bindPicker(k => { S.profile.av = k; save(); renderMe(); $app.querySelector('.pcard .ava').innerHTML = SPR.avatar(k, 6, 'bob'); });
    $('out').onclick = () => {
      if (!confirm('Sign out of this device?')) return;
      sync('sign-out', 0, 0, []); S = { best: {} }; save(); renderMe(); location.hash = '#/login';
    };
  });

  // ---------- home: world map
  const XS = LEVELS.map((l, i) => Math.round(50 + 31 * Math.sin(i * 1.1)));
  const ROW = 150, TOP = 200;
  route(/^\/$/, () => {
    const H = TOP + (LEVELS.length - 1) * ROW + 120;
    const pts = [[50, 60]].concat(LEVELS.map((l, i) => [XS[i], TOP + i * ROW]));
    // decorations at fixed pseudo-random places, away from the path
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const deco = [];
    for (let i = 0; i < 26; i++) {
      const y = 30 + rnd() * (H - 60), x = 4 + rnd() * 92;
      const near = pts.some(([px, py]) => Math.abs(px - x) < 17 && Math.abs(py - y) < 95);
      if (!near) deco.push(`<div class="deco" style="left:${x}%;top:${y}px">${spr(['tree', 'tree', 'rock', 'flower', 'tree'][i % 5], i % 5 === 3 ? 3 : 4)}</div>`);
    }
    const last = Math.max(-1, Math.min(LEVELS.length - 1, parseInt(getLS(LAST) || '-1', 10)));
    const walkPos = (i) => i < 0 ? { left: 'calc(50% - 70px)', top: '120px' } : { left: `calc(${XS[i]}% + ${XS[i] > 50 ? -82 : 82}px)`, top: (TOP + i * ROW + 34) + 'px' };
    const wp = walkPos(last);
    $app.innerHTML = `<div class="home-top">${playerCard()}
        <div class="card"><h3>Where to?</h3><div class="row" style="margin-bottom:10px"><a class="btn warn" href="#/reading">${spr('chest', 2)} Reading</a><a class="btn ghost" href="#/games">${spr('joystick', 2)} Games</a><a class="btn ghost" href="#/rank">${spr('crown', 2)} Ranking</a></div>
        ${badgeList()}</div></div>
      <h2 class="on-dark" style="color:var(--yellow)">World map</h2>
      <p class="legend">Every place is one test. Tap a place: <b>Learn</b> the cards, win the <b>Quiz</b>, then beat the <b>Boss</b>. ★ quiz 60%+ · ★★ quiz 90%+ · ★★★ boss beaten</p>
      <div class="world" id="world" style="height:${H}px">
        <svg class="path" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#6b3b22" stroke-width="30" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#e8c48c" stroke-width="20" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#c99a5b" stroke-width="2" stroke-dasharray="6 10" vector-effect="non-scaling-stroke"/>
        </svg>
        ${deco.join('')}
        <div class="start" style="left:50%;top:40px">START</div>
        ${LEVELS.map((l, i) => `<a class="node ${stars(l.key) === 3 ? 'cleared' : ''}" href="#/level/${l.key}" data-i="${i}" style="left:${XS[i]}%;top:${TOP + i * ROW}px">
          <div class="bld">${SPR.building(i, 4)}</div><div class="sign"><span class="n">LV ${i + 1}</span>${esc(l.name)}<div>${starHTML(stars(l.key), 2)}</div></div></a>`).join('')}
        <div class="walker" id="walker" style="left:${wp.left};top:${wp.top}"><span class="tag">YOU</span><span class="bob" style="display:inline-block">${SPR.avatar(avIdx(), 3)}</span></div>
      </div>`;
    let t = null; cleanup = () => clearTimeout(t);
    $app.querySelectorAll('.node').forEach(a => a.onclick = (e) => {
      e.preventDefault(); const i = +a.dataset.i, w = $('walker'), p = walkPos(i);
      setLS(LAST, String(i));
      if (i === last) { location.hash = a.getAttribute('href'); return; }
      w.style.left = p.left; w.style.top = p.top; SFX.step(); setTimeout(SFX.step, 350);
      t = setTimeout(() => { location.hash = a.getAttribute('href'); }, 760);
    });
    // scroll the map so the player can see their character
    if (last > 1) { const w = $('walker'); if (w) setTimeout(() => w.scrollIntoView({ block: 'center' }), 50); }
  });

  // ---------- level page
  route(/^\/level\/([\w-]+)$/, (key) => {
    const l = lvl(key); if (!l) return (location.hash = '#/');
    const i = lvlIndex(key), learned = S.best['learn:' + key], b = S.best['boss:' + key];
    $app.innerHTML = `<a class="back" href="#/">World map</a>
      <div class="place">${SPR.building(i, 7)}<div><span class="pill">LV ${i + 1}</span><h1 style="margin-top:10px">${esc(l.name)}</h1>${starHTML(stars(key), 3)}</div></div>
      <div class="grid g3">
        <div class="card stage"><div class="ic">${spr('book', 6)}</div><h3>1. Learn</h3><p class="small">Flip through the key-fact cards.<br>${learned ? '<b>Done</b> (+20 XP)' : '+20 XP when you see every card'}</p><a class="btn" href="#/learn/${key}">Read cards</a></div>
        <div class="card stage"><div class="ic">${spr('sword', 7)}</div><h3>2. Quiz</h3><p class="small">10 questions, feedback after each one.<br>Best: <b>${Math.round(pct('quiz:' + key) * 100)}%</b></p><a class="btn" href="#/quiz/${key}">Start quiz</a></div>
        <div class="card stage"><div class="ic">${SPR.boss(i, 6, 'bob')}</div><h3>3. Boss: ${esc(l.short)} ${esc(SPR.bossName(i))}</h3>
          <p class="small">Hit it 4 times to win. You have 2 hearts and 20 seconds per question.<br>${b ? (b.pass ? '<b>Beaten!</b>' : 'Best: ' + b.score + ' hits') : 'Not fought yet'}</p><a class="btn danger" href="#/boss/${key}">Fight!</a></div>
      </div>`;
  });

  // ---------- learn (flash cards)
  route(/^\/learn\/([\w-]+)$/, (key) => {
    const l = lvl(key); const groups = FACTS[l.facts].groups; let i = 0, flipped = false; const seen = new Set();
    function draw() {
      const g = groups[i]; seen.add(i);
      $app.innerHTML = `<a class="back" href="#/level/${key}">${esc(l.name)}</a>
        <div class="hud"><span>LEARN · ${esc(l.short)}</span><span>CARD ${i + 1} / ${groups.length}</span></div>
        <div class="xpbar green" style="margin:0 4px 18px"><i style="width:${(seen.size / groups.length) * 100}%"></i></div>
        <div class="flash" id="fc">${flipped
          ? `<div class="card face"><h3>${esc(g.cat)}</h3><ol>${g.items.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`
          : `<div class="card face front">${spr('book', 6)}<span class="pill">${esc(l.short)}</span><h2>${esc(g.cat)}</h2><p class="muted">What do you remember? Tap the card to check.</p></div>`}</div>
        <div class="spread" style="margin-top:18px"><button class="btn ghost" id="prev" ${i === 0 ? 'disabled' : ''}>◀ Back</button>
          <button class="btn warn" id="flip">${flipped ? 'Hide facts' : 'Show facts'}</button>
          <button class="btn" id="next">${i === groups.length - 1 ? 'Finish' : 'Next ▶'}</button></div>`;
      $('fc').onclick = $('flip').onclick = () => { flipped = !flipped; draw(); };
      $('prev').onclick = () => { i--; flipped = false; draw(); };
      $('next').onclick = () => {
        if (i < groups.length - 1) { i++; flipped = false; draw(); return; }
        if (seen.size === groups.length) { const r = record('learn:' + key, 1, 1, 20); if (r.gained) { SFX.coin(); toast('+20 XP – cards finished!'); } else toast('Cards finished.'); }
        location.hash = '#/level/' + key;
      };
    }
    draw();
  });

  // ---------- quiz engine (used by quiz + boss)
  const BOSS_HP = 4, HEARTS = 2;
  function runQuiz({ key, title, qs, timed, boss, onEnd }) {
    let i = 0, score = 0, misses = 0, streak = 0, bonus = 0, timer = null; const wrong = [];
    const li = lvlIndex(key), l = lvl(key);
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    cleanup = stop;
    const hearts = () => Array.from({ length: HEARTS }, (_, k) => spr(k < HEARTS - misses ? 'heart' : 'heart0', 3)).join('');
    function draw() {
      const q = qs[i];
      const body = q.t === 'mc'
        ? `<div class="opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><b>${L4[k]}</b>${esc(o)}</button>`).join('')}</div>`
        : q.t === 'tf'
          ? `<div class="opts"><button class="opt" data-k="1"><b>T</b>True</button><button class="opt" data-k="0"><b>F</b>False</button></div>`
          : `<div class="row"><input id="gap" placeholder="Type your answer${q.a.length > 1 ? 's, separated by commas' : ''}" style="max-width:420px"><button class="btn warn" id="chk">Check</button></div>`;
      const scene = boss ? `<div class="battle" id="arena">
          <div class="herobox" id="herobox"><div class="plate"><div class="nm">${esc(S.profile.name.split(' ').pop()).toUpperCase()}</div><div class="hearts" id="hearts">${hearts()}</div></div><span class="bob" style="display:inline-block">${SPR.avatar(avIdx(), 5)}</span></div>
          <div class="bossbox"><div class="plate"><div class="nm">${esc(l.short).toUpperCase()} ${esc(SPR.bossName(li)).toUpperCase()}</div><div class="xpbar red"><i id="hp" style="width:${(BOSS_HP - score) / BOSS_HP * 100}%"></i></div></div><span class="bob" style="display:inline-block">${SPR.boss(li, 8, '', 'bossimg')}</span></div>
        </div>` : '';
      $app.innerHTML = `<a class="back" href="#/level/${key}">Run away</a>
        <div class="hud"><span>${boss ? 'BOSS FIGHT' : 'QUIZ'} · ${esc(l.short)}</span><span>Q ${i + 1} / ${boss ? Math.min(qs.length, BOSS_HP + HEARTS - 1) : qs.length}</span>
          <span class="coins">${spr('coin', 2)} <span id="coins">${score * 10 + bonus}</span>${streak >= 2 ? ` <span class="streak">COMBO x${streak}</span>` : ''}</span></div>
        ${boss ? '' : `<div class="xpbar green" style="margin:0 4px 14px"><i style="width:${(i / qs.length) * 100}%"></i></div>`}
        ${scene}
        <div class="dialog" id="dlg">${timed ? '<div class="xpbar time" style="margin-bottom:12px"><i id="tb" style="width:100%"></i></div>' : ''}
        <div class="qtext">${q.t === 'tf' ? '<span class="tag">TRUE OR FALSE?</span>' : q.t === 'gap' ? '<span class="tag">FILL THE GAP</span>' : ''}${esc(q.q).replace(/_{3,}/g, '______')}</div>${body}<div id="fb"></div></div>`;
      const t0 = Date.now(), LIMIT = 20000;
      if (timed) {
        timer = setInterval(() => {
          const left = Math.max(0, LIMIT - (Date.now() - t0)); const tb = $('tb');
          if (tb) tb.style.width = (left / LIMIT * 100) + '%';
          if (left <= 0) { stop(); answer(null, 0); }
        }, 100);
      }
      const secsLeft = () => Math.max(0, Math.ceil((LIMIT - (Date.now() - t0)) / 1000));
      if (q.t === 'gap') {
        const inp = $('gap'); inp.focus();
        const doIt = () => { const parts = q.a.length > 1 ? inp.value.split(/,|;|\//) : [inp.value]; answer(parts, secsLeft()); };
        $('chk').onclick = doIt; inp.onkeydown = (e) => { if (e.key === 'Enter') doIt(); };
      } else $app.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k, secsLeft(), b));
    }
    function answer(val, secs, btn) {
      stop(); const q = qs[i]; let ok;
      if (q.t === 'mc') ok = val === q.a;
      else if (q.t === 'tf') ok = val === (q.a ? 1 : 0);
      else ok = Array.isArray(val) && q.a.length === val.length && q.a.every((a, k) => norm(a) === norm(val[k] || ''));
      const before = score * 10 + bonus;
      if (ok) { score++; streak++; if (timed) bonus += Math.ceil(secs / 2); else if (streak >= 3) bonus += 2; } else { streak = 0; misses++; wrong.push({ test: title, q: q.q }); }
      const gainedNow = score * 10 + bonus - before;
      $app.querySelectorAll('.opt').forEach(b => {
        b.disabled = true; const k = +b.dataset.k;
        const isRight = q.t === 'mc' ? k === q.a : k === (q.a ? 1 : 0);
        if (isRight) b.classList.add('right'); else if (k === val) b.classList.add('wrong');
      });
      $('coins').textContent = score * 10 + bonus;
      if (boss) {
        if (ok) { const bi = $('bossimg'); SFX.hit(); FX.flash(bi); FX.shake(bi && bi.parentNode); FX.float(bi, '-1 HP', 'bad'); $('hp').style.width = Math.max(0, BOSS_HP - score) / BOSS_HP * 100 + '%'; }
        else { SFX.hurt(); FX.shake($('herobox')); FX.shake($('arena')); $('hearts').innerHTML = hearts(); }
      } else if (ok) { SFX.coin(); FX.float(btn || $('chk'), '+' + gainedNow); if (streak >= 3) setTimeout(() => FX.float($('coins'), 'COMBO!'), 250); }
      else { SFX.wrong(); FX.shake($('dlg')); }
      const over = boss && (score >= BOSS_HP || misses >= HEARTS);
      const last = over || i === qs.length - 1;
      const ans = q.t === 'mc' ? L4[q.a] + '. ' + q.opts[q.a] : q.t === 'tf' ? (q.a ? 'True' : 'False') : q.a.join(' / ');
      $('fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? (boss ? 'HIT!' : 'CORRECT!') : val === null ? 'TIME UP!' : boss ? 'OUCH!' : 'NOT QUITE.'}</b> Answer: ${esc(ans)}<br><span class="small">${esc(q.why || '')}</span></div>
        <div style="margin-top:12px;text-align:right"><button class="btn" id="nx">${last ? 'See result' : 'Next ▶'}</button></div>`;
      const gi = $('gap'); if (gi) { gi.disabled = true; $('chk').disabled = true; }
      $('nx').onclick = () => { i++; if (!last) draw(); else onEnd(score, bonus, wrong); };
      $('nx').focus({ preventScroll: true });
    }
    draw();
  }
  function pickQuestions(key, n, opts = {}) {
    const l = lvl(key); let pool = QUIZ[l.quiz].slice();
    if (opts.noGap) pool = pool.filter(q => q.t !== 'gap');
    const fresh = shuffle(pool); return fresh.slice(0, Math.min(n, fresh.length));
  }
  function endScreen({ title, art, big, sub, back, backText, win }) {
    $app.innerHTML = `<div class="card result" style="max-width:560px;margin:10px auto"><h1>${esc(title)}</h1><div class="art ${win ? 'bob' : ''}">${art || ''}</div><div class="big">${big}</div>${sub || ''}
      <div class="row" style="justify-content:center;margin-top:16px"><a class="btn ghost" href="${back}">${backText}</a><button class="btn" id="again">Play again</button></div></div>`;
    $('again').onclick = () => go();
    if (win) { SFX.win(); FX.confetti(); } else if (win === false) SFX.lose(); else SFX.chest();
  }
  const xpLine = (xp, r) => `<p>${spr('coin', 3)} <b>+${xp} XP</b> this time${r.better ? ` · <b>new best (+${r.gained})</b>` : ' · your best score is kept'}</p>`;

  route(/^\/quiz\/([\w-]+)$/, (key) => {
    const l = lvl(key), qs = pickQuestions(key, 10);
    runQuiz({ key, title: 'Quiz – ' + l.name, qs, onEnd: (score, bonus, wrong) => {
      const xp = score * 10 + bonus, r = record('quiz:' + key, score, qs.length, xp, null, wrong);
      const p = score / qs.length;
      endScreen({ title: p >= .6 ? 'QUEST CLEAR!' : 'TRY AGAIN!', art: p >= .6 ? spr('chestOpen', 6) : spr('chest', 6), big: `${score} / ${qs.length}`, win: p >= .6 ? true : undefined,
        sub: xpLine(xp, r) + `<p>${p >= .9 ? 'Excellent! ★★' : p >= .6 ? 'Good job! ★ – get 90% for ★★' : 'Read the cards again – 60% gives you the first star.'}</p>`,
        back: '#/level/' + key, backText: 'Back' });
    } });
  });
  route(/^\/boss\/([\w-]+)$/, (key) => {
    const l = lvl(key), li = lvlIndex(key);
    let qs = shuffle(QUIZ[l.quiz].filter(q => q.reverse)).concat(pickQuestions(key, 10, { noGap: true }));
    qs = qs.filter((q, k) => qs.findIndex(x => x.q === q.q) === k).slice(0, BOSS_HP + HEARTS - 1);
    runQuiz({ key, title: 'Boss – ' + l.name, qs, timed: true, boss: true, onEnd: (score, bonus, wrong) => {
      const pass = score >= BOSS_HP, xp = score * 10 + bonus;
      const r = record('boss:' + key, score, BOSS_HP, xp, pass ? { pass: true } : null, wrong);
      endScreen({ title: pass ? 'VICTORY!' : 'GAME OVER', art: pass ? spr('trophy', 7) : SPR.boss(li, 7), big: `${score} / ${BOSS_HP} hits`, win: pass,
        sub: xpLine(xp, r) + `<p>${pass ? (stars(key) === 3 ? 'Boss beaten! ★★★ for this place.' : 'Boss beaten! Get 60%+ in the quiz to collect ★★★.') : `The ${esc(l.short)} ${esc(SPR.bossName(li))} survived. You need 4 hits.`}</p>`,
        back: '#/level/' + key, backText: 'Back' });
    } });
  });

  // ---------- arcade (mini-games)
  route(/^\/games$/, () => {
    const best = (g) => S.best['game:' + g] ? S.best['game:' + g].xp + ' XP' : '–';
    const cab = (id, art, name, desc) => `<div class="card cab"><div class="screen">${art}</div><h3>${name}</h3><p class="small" style="margin:0">${desc}</p><p class="small" style="margin:0">Best: <b>${best(id)}</b></p><a class="btn" href="#/games/${id}">Play</a></div>`;
    $app.innerHTML = `<h1 class="on-dark">Arcade</h1><p class="legend">Short games that mix all ten tests. <span class="blink">INSERT COIN</span> – your best result in each game counts.</p>
      <div class="grid g3">
        ${cab('who', SPR.boss(1, 5, 'bob'), 'Who am I?', 'Clues appear one by one. Name the test with as few clues as possible.')}
        ${cab('match', spr('coin', 6, { cls: 'bob' }), 'Match the score', 'Match each test and level with its score range.')}
        ${cab('odd', SPR.boss(0, 5, 'bob'), 'Odd one out', 'Three tests share a feature. Find the one that doesn’t.')}
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
        $app.innerHTML = `<a class="back" href="#/games">Arcade</a><div class="hud"><span>WHO AM I?</span><span>ROUND ${r + 1} / ${ROUNDS}</span><span class="coins">${spr('coin', 2)} ${total}</span></div>
          <div class="dialog" id="dlg"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">${SPR.boss(1, 3, 'bob')}<ol class="clues" style="flex:1">${clues.slice(0, shown).map(c => `<li>${esc(c)}</li>`).join('')}</ol></div>
          <p class="small" style="color:var(--yellow)">${over ? '' : `This answer is worth ${(6 - shown) * 10} points.`}</p>
          <div class="answers">${LEVELS.map((x, k) => `<button class="opt" data-k="${k}" ${over ? 'disabled' : ''}>${esc(x.name)}</button>`).join('')}</div>
          <div class="row" style="margin-top:12px">${!over && shown < clues.length ? '<button class="btn warn" id="more">Another clue</button>' : ''}${over ? `<button class="btn" id="nx">${r === ROUNDS - 1 ? 'See result' : 'Next round ▶'}</button>` : ''}</div>
          ${msg || ''}</div>`;
        const more = $('more'); if (more) more.onclick = () => { shown++; draw(); };
        $app.querySelectorAll('.answers .opt').forEach(b => b.onclick = () => {
          const k = +b.dataset.k, ok = k === li; over = true; const pts = ok ? (6 - shown) * 10 : 0; total += pts; shown = clues.length;
          draw(`<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'CORRECT! +' + pts : 'NOPE.'}</b> The answer is ${esc(l.name)}.</div>`);
          $app.querySelectorAll('.answers .opt').forEach(x => { if (+x.dataset.k === li) x.classList.add('right'); else if (+x.dataset.k === k) x.classList.add('wrong'); });
          if (ok) { SFX.coin(); FX.float($app.querySelector('.answers .opt.right'), '+' + pts); } else { SFX.wrong(); FX.shake($('dlg')); }
        });
        const nx = $('nx'); if (nx) nx.onclick = () => { r++; if (r < ROUNDS) round(); else finish(); };
      }
      draw();
    }
    function finish() {
      const xp = Math.round(total / 2), res = record('game:who', total, ROUNDS * 50, xp);
      endScreen({ title: 'WHO AM I?', art: SPR.boss(1, 6), big: `${total} pts`, sub: xpLine(xp, res), back: '#/games', backText: 'Arcade', win: total >= 120 ? true : undefined });
    }
    round();
  });

  route(/^\/games\/match$/, () => {
    const seenScore = new Set();
    const pairs = shuffle(window.SCORES).filter(p => !seenScore.has(p[2]) && seenScore.add(p[2])).slice(0, 6);
    const right = shuffle(pairs.map((p, k) => k)); let sel = null, done = new Set(), mistakes = 0;
    function draw() {
      $app.innerHTML = `<a class="back" href="#/games">Arcade</a><div class="hud"><span>MATCH THE SCORE</span><span>MISTAKES: ${mistakes}</span><span>${done.size} / ${pairs.length}</span></div>
        <div class="dialog" id="dlg"><p class="small" style="margin-top:0">Tap a test on the left, then its score on the right.</p>
        <div class="match"><div class="col">${pairs.map((p, k) => `<button class="chip ${done.has(k) ? 'done' : ''} ${sel === k ? 'sel' : ''}" data-l="${k}" ${done.has(k) ? 'disabled' : ''}><b>${esc(p[0])}</b><br>${esc(p[1])}</button>`).join('')}</div>
        <div class="col">${right.map(k => `<button class="chip ${done.has(k) ? 'done' : ''}" data-r="${k}" ${done.has(k) ? 'disabled' : ''}>${esc(pairs[k][2])}</button>`).join('')}</div></div></div>`;
      $app.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { sel = +b.dataset.l; SFX.click(); draw(); });
      $app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
        if (sel === null) return toast('Choose a test on the left first.');
        const k = +b.dataset.r;
        if (k === sel) { done.add(k); sel = null; SFX.coin(); FX.float(b, '+10'); if (done.size === pairs.length) return setTimeout(finish, 400); draw(); }
        else { mistakes++; b.classList.add('bad'); SFX.wrong(); FX.shake(b); setTimeout(draw, 500); }
      });
    }
    function finish() {
      const score = Math.max(0, 60 - mistakes * 10), res = record('game:match', score, 60, score);
      endScreen({ title: 'MATCH THE SCORE', art: spr('coin', 7), big: `${score} XP`, sub: `<p>${mistakes} mistake(s)${res.better ? ` · <b>new best (+${res.gained} XP)</b>` : ''}</p>`, back: '#/games', backText: 'Arcade', win: mistakes <= 1 ? true : undefined });
    }
    draw();
  });

  route(/^\/games\/odd$/, () => {
    const rounds = shuffle(window.ODD).slice(0, 5); let r = 0, score = 0;
    function draw(msg, picked) {
      const g = rounds[r]; if (!g.order) g.order = shuffle([0, 1, 2, 3]);
      $app.innerHTML = `<a class="back" href="#/games">Arcade</a><div class="hud"><span>ODD ONE OUT</span><span>ROUND ${r + 1} / 5</span><span class="coins">${spr('coin', 2)} ${score}</span></div>
        <div class="dialog" id="dlg"><div class="qtext"><span class="tag">THREE OF THESE SHARE THIS FEATURE:</span>${esc(g.prompt)}.<br>Which one does NOT?</div>
        <div class="opts">${g.order.map(k => `<button class="opt ${picked !== undefined ? (k === g.odd ? 'right' : k === picked ? 'wrong' : '') : ''}" data-k="${k}" ${picked !== undefined ? 'disabled' : ''}>${esc(g.items[k])}</button>`).join('')}</div>
        ${msg || ''}</div>`;
      $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === g.odd; if (ok) score += 20;
        draw(`<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'CORRECT! +20' : 'NOT QUITE.'}</b> ${esc(g.why)}</div><div style="text-align:right;margin-top:12px"><button class="btn" id="nx">${r === 4 ? 'See result' : 'Next ▶'}</button></div>`, k);
        if (ok) { SFX.coin(); FX.float($app.querySelector('.opt.right'), '+20'); } else { SFX.wrong(); FX.shake($('dlg')); }
        $('nx').onclick = () => { r++; if (r < 5) draw(); else finish(); };
      });
    }
    function finish() {
      const res = record('game:odd', score / 20, 5, score);
      endScreen({ title: 'ODD ONE OUT', art: SPR.boss(0, 6), big: `${score} XP`, sub: `<p>${score / 20} / 5 correct${res.better ? ` · <b>new best (+${res.gained} XP)</b>` : ''}</p>`, back: '#/games', backText: 'Arcade', win: score >= 80 ? true : undefined });
    }
    draw();
  });

  // ---------- reading quests
  const countQ = (p) => p.groups.reduce((a, g) => a + (g.type === 'multi' ? g.pick : g.items.length), 0);
  route(/^\/reading$/, () => {
    $app.innerHTML = `<h1 class="on-dark">Reading quests</h1><p class="legend">IELTS-style reading practice for the final exam. Read the passage on the left and answer on the right. Your answers are marked when you press <b>Submit</b>. Each correct answer = 8 XP. Score 60%+ to open the chest.</p>
      <div class="grid g2 qboard">${READING.map(p => { const b = S.best['read:' + p.id], open = pct('read:' + p.id) >= .6;
        return `<div class="card"><div class="spread"><span class="pill">${esc(p.source)}</span><span class="art">${spr(open ? 'chestOpen' : 'chest', 3)}</span></div><h3 style="margin:6px 0 0">${esc(p.title)}</h3><p class="small muted" style="margin:0">${countQ(p)} questions · about 20 minutes</p>
        <p class="small" style="margin:0">${b ? `Best: <b>${b.score} / ${b.max}</b>` : 'Not tried yet'}</p><div><a class="btn" href="#/reading/${p.id}">Start quest</a></div></div>`; }).join('')}</div>`;
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
    $app.innerHTML = `<div class="spread" style="margin-bottom:12px"><a class="back" href="#/reading" style="margin:0">Quests</a>
      <span class="timer">${spr('star', 2)} TIME <span id="clock">00:00</span></span><button class="btn" id="submit">Submit</button></div>
      <div class="split"><div class="passage"><h2>${esc(p.title)}</h2>${p.paras.map(x => `<p>${x.label ? `<span class="lab">${esc(x.label)}</span>` : ''}${x.text}</p>`).join('')}</div>
      <div id="qs">${qhtml}<div style="text-align:right"><button class="btn" id="submit2">Submit</button></div></div></div>`;
    const clock = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const c = $('clock'); if (c) c.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000);
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
      const secs = Math.floor((Date.now() - t0) / 1000), xp = score * 8, open = score / max >= .6;
      const res = record('read:' + p.id, score, max, xp, { secs }, wrong);
      $('qs').insertAdjacentHTML('afterbegin', `<div class="feedback ${open ? 'ok' : 'no'}" style="margin:4px 4px 18px"><div class="row">${spr(open ? 'chestOpen' : 'chest', 4, { cls: open ? 'bob' : '' })}<div><b>${score} / ${max} CORRECT</b><br>${Math.floor(secs / 60)} min ${secs % 60} s · ${spr('coin', 2)} ${xp} XP${res.better ? ` · new best (+${res.gained})` : ''}</div></div>
        <div class="row" style="margin-top:8px"><button class="btn small" id="retry">Try again</button><a class="btn small ghost" href="#/reading">Other quests</a></div></div>`);
      $('qs').scrollTop = 0;
      if (open) { SFX.chest(); FX.confetti(70); } else SFX.wrong();
      $('retry').onclick = () => go();
      ['submit', 'submit2'].forEach(x => $(x).disabled = true);
    };
    $('submit').onclick = submit; $('submit2').onclick = submit;
  });

  // ---------- high scores
  route(/^\/rank$/, () => {
    $app.innerHTML = `<div class="hiscore"><h1>HIGH SCORES</h1><div id="rk"><p class="blink" style="text-align:center">LOADING…</p></div></div>`;
    const me = { name: S.profile.name, xp: totalXP(), stars: totalStars(), badges: myBadges().length, mine: true };
    let data = null;
    const place = (k) => k === 0 ? `${spr('crown', 2)} 1ST` : k === 1 ? '2ND' : k === 2 ? '3RD' : (k + 1) + 'TH';
    function draw() {
      const box = $('rk'); if (!box) return;
      let rows = data || [me];
      if (data) { rows = rows.map(r => r.id_hash === hashId(S.profile.id) ? Object.assign({}, r, { mine: true, xp: Math.max(r.xp, me.xp) }) : r); }
      rows.sort((a, b) => b.xp - a.xp);
      box.innerHTML = (data ? '' : `<p class="small" style="text-align:center">${CFG.SHEET_URL ? 'Could not load the class ranking right now – showing your own score.' : 'The class ranking is not connected yet – showing your own score only.'}</p>`) +
        `<table class="rank"><tr><th>RANK</th><th>NAME</th><th>XP</th><th>★</th><th>BADGES</th></tr>${rows.map((r, k) =>
          `<tr class="${r.mine ? 'mine' : ''} ${k < 3 ? 'p' + (k + 1) : ''}"><td class="pos">${place(k)}</td><td>${esc(r.name)}${r.mine ? '<span class="you blink">◀ YOU</span>' : ''}</td><td>${r.xp}</td><td>${r.stars || 0}</td><td>${r.badges || 0}</td></tr>`).join('')}</table>`;
    }
    if (!CFG.SHEET_URL) return draw();
    fetch(CFG.SHEET_URL + '?action=board').then(r => r.json()).then(j => { data = j.players || []; if (!data.some(r => r.id_hash === hashId(S.profile.id))) data.push(Object.assign({ id_hash: hashId(S.profile.id) }, me)); draw(); })
      .catch(() => draw());
  });
  // same short hash is computed in the Apps Script, so student IDs are never shown publicly
  function hashId(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); }

  renderMe(); go();
})();
