/* Test Quest – 8-bit sound effects (Web Audio, no files) and pixel effects. */
(function () {
  'use strict';
  const KEY = 'testquest_sound';
  let on = true; try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  let ctx = null;
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // play a list of [frequency, duration] notes as square-wave beeps
  function tones(notes, type, vol) {
    if (!on) return; const c = ac(); if (!c) return;
    let t = c.currentTime + 0.01;
    notes.forEach(([f, d]) => {
      if (f) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
      }
      t += d;
    });
  }
  const SFX = {
    click: () => tones([[660, 0.04]], 'square', 0.03),
    coin: () => tones([[988, 0.07], [1319, 0.22]]),
    wrong: () => tones([[220, 0.12], [165, 0.25]], 'sawtooth', 0.05),
    hit: () => tones([[150, 0.05], [90, 0.12]], 'square', 0.08),
    hurt: () => tones([[300, 0.08], [200, 0.08], [120, 0.2]], 'triangle', 0.1),
    step: () => tones([[392, 0.05], [0, 0.05], [440, 0.05]], 'triangle', 0.08),
    win: () => tones([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3], [0, 0.05], [784, 0.1], [1047, 0.4]]),
    lose: () => tones([[392, 0.18], [370, 0.18], [349, 0.18], [330, 0.5]], 'triangle', 0.1),
    level: () => tones([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.08], [1568, 0.35]]),
    chest: () => tones([[440, 0.08], [554, 0.08], [659, 0.08], [880, 0.3]]),
  };
  function toggle() { on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} if (on) SFX.click(); return on; }

  // pixel confetti
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.className = 'confetti';
    cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
    const g = cv.getContext('2d'), cols = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#ff77a8', '#fff1e8'];
    const ps = Array.from({ length: n || 90 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight / 3, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      s: 6 + Math.floor(Math.random() * 3) * 3, c: cols[Math.floor(Math.random() * cols.length)] }));
    let f = 0;
    (function tick() {
      g.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; g.fillStyle = p.c; g.fillRect(Math.round(p.x / 3) * 3, Math.round(p.y / 3) * 3, p.s, p.s); });
      if (++f < 110) requestAnimationFrame(tick); else cv.remove();
    })();
  }
  // floating "+10" text above an element
  function float(el, text, cls) {
    if (!el) return; const r = el.getBoundingClientRect(), d = document.createElement('div');
    d.className = 'floater ' + (cls || ''); d.textContent = text;
    d.style.left = (r.left + r.width / 2 + scrollX) + 'px'; d.style.top = (r.top + scrollY) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function flash(el) { if (!el) return; el.classList.remove('hitfx'); void el.offsetWidth; el.classList.add('hitfx'); }
  window.FX = { SFX, toggle, isOn: () => on, confetti, float, shake, flash };
})();
