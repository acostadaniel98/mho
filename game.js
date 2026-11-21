
(() => {
"use strict";

const C = window.CONFIG;
const $ = (id) => document.getElementById(id);
const root = document.documentElement;

const R = Math.max(1, C.rows | 0);
const MID = Math.floor(R / 2);                       
const SLOTS = (C.slots || []).map((s, i) => ({
  id: s.id || "slot" + i,
  label: s.label || s.id || "SLOT " + (i + 1),
  optional: !!s.optional,
  enabledByDefault: s.optional ? s.enabled !== false : true,
  symbols: (s.symbols || []).filter(x => x && x.name && x.img),
}));
SLOTS.forEach(s => { s.by = Object.fromEntries(s.symbols.map(x => [x.name, x])); });
const slotById = Object.fromEntries(SLOTS.map(s => [s.id, s]));

const _buf = new Uint32Array(1);
const rnd = () => { crypto.getRandomValues(_buf); return _buf[0] / 4294967296; };

const store = {
  get(k, d) { try { const v = localStorage.getItem("outlanders_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("outlanders_" + k, JSON.stringify(v)); } catch (e) {} },
};

const savedEnabled = store.get("enabled", {});
const enabled = Object.fromEntries(SLOTS.map(s => [s.id, s.optional ? (savedEnabled[s.id] ?? s.enabledByDefault) : true]));
const excluded = new Set(store.get("excluded", []));          
let history = store.get("history", []);
let muted = store.get("muted", false);
let turbo = store.get("turbo", false);
const locked = {};                                          
const cur = {};                                              
const reelMap = {};                                            
const srcOf = {};
let spinning = false, scale = 1, lastBuild = null;

const key = (slot, name) => slot.id + "::" + name;
const active = () => SLOTS.filter(s => enabled[s.id] && s.symbols.length);
const pool = (slot) => slot.symbols.filter(x => !excluded.has(key(slot, x.name)));

function pickFrom(list, avoid) {
  let l = list;
  if (avoid && l.length > 1) l = l.filter(x => x.name !== avoid);
  const total = l.reduce((a, x) => a + (x.weight > 0 ? x.weight : 1), 0);
  let r = rnd() * total;
  for (const x of l) { r -= (x.weight > 0 ? x.weight : 1); if (r < 0) return x; }
  return l[l.length - 1];
}
const randomRows = (slot) => {
  const p = pool(slot).length ? pool(slot) : slot.symbols;
  return Array.from({ length: R }, () => pickFrom(p).name);
};

function fallbackSrc(name) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#5a3a18"; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
  g.strokeStyle = "#e6b44c"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#f1dfb4"; g.font = "bold 58px serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(name.trim().slice(0, 2).toUpperCase(), 64, 70);
  return c.toDataURL();
}
const preload = () => Promise.all(SLOTS.flatMap(s => s.symbols).map(x => new Promise(res => {
  if (srcOf[x.img]) return res();
  const im = new Image();
  im.onload = () => { srcOf[x.img] = x.img; res(); };
  im.onerror = () => { console.warn("No se pudo cargar la imagen:", x.img); srcOf[x.img] = fallbackSrc(x.name); res(); };
  im.src = x.img;
})));

function makeCell(slot, name) {
  const sym = slot.by[name];
  const d = document.createElement("div"); d.className = "cell"; d.title = name;
  const im = document.createElement("img"); im.src = srcOf[sym.img]; im.alt = name; im.draggable = false;
  d.appendChild(im); return d;
}

const setY = (strip, cells) => { strip.style.transform = `translateY(calc(var(--cell) * ${-cells}))`; };
function renderReel(slot) {
  const { strip } = reelMap[slot.id];
  strip.replaceChildren(makeCell(slot, pickFrom(slot.symbols).name), ...cur[slot.id].map(n => makeCell(slot, n)));
  setY(strip, 0);
}
function buildReels() {
  root.style.setProperty("--rows", R); root.style.setProperty("--mid", MID);
  const box = $("reels"); box.innerHTML = "";
  Object.keys(reelMap).forEach(k => delete reelMap[k]);
  active().forEach(slot => {
    if (!cur[slot.id]) cur[slot.id] = randomRows(slot);
    const col = document.createElement("div"); col.className = "slot" + (locked[slot.id] ? " locked" : "");
    const head = document.createElement("div"); head.className = "slot-head";
    head.innerHTML = `<span class="slot-label">${slot.label}</span>`;
    const lock = document.createElement("button"); lock.className = "lock"; lock.textContent = "🔒";
    lock.title = "Bloquear: este slot conserva su resultado al girar";
    lock.addEventListener("click", () => { if (spinning) return; locked[slot.id] = !locked[slot.id]; col.classList.toggle("locked", locked[slot.id]); sfx("click"); });
    head.appendChild(lock);
    const reel = document.createElement("div"); reel.className = "reel";
    const strip = document.createElement("div"); strip.className = "strip";
    const ptr = document.createElement("div"); ptr.className = "pointer";
    reel.append(strip, ptr); col.append(head, reel); box.appendChild(col);
    reelMap[slot.id] = { slot, reel, strip }; renderReel(slot);
  });
  layout();
}
function layout() {
  const n = Math.max(1, active().length), gap = n > 5 ? 5 : 8;
  const availW = Math.min(window.innerWidth, 1240) - 16 - 36 - 28 - 2 * gap - 10;
  let cell = Math.floor((availW - gap * (n - 1)) / n);
  const availH = Math.max(window.innerHeight - 470, 200);
  cell = Math.min(cell, Math.floor(availH / R), 150);
  cell = Math.max(48, cell);
  root.style.setProperty("--cell", cell + "px"); root.style.setProperty("--gap", gap + "px");
}

let AC = null;
function ac() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} return AC; }
function tone(f, d, type = "sine", v = .12, delay = 0, f2) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .03);
}
function noise(d, v, f0, f1) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * d), b = a.createBuffer(1, len, a.sampleRate), data = b.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  s.buffer = b; fl.type = "bandpass"; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t);
}
const SYNTH = {
  spin() { noise(.6, .09, 300, 2800); },
  stop() { tone(150, .13, "triangle", .22, 0, 55); },
  click() { tone(660, .05, "square", .05); },
  reveal() { [392, 523, 659, 784].forEach((f, k) => tone(f, .32, "triangle", .13, k * .09)); },
};
function sfx(kind) {
  if (muted) return;
  const path = C.sounds && C.sounds[kind];
  if (path) { try { new Audio(path).play().catch(() => {}); return; } catch (e) {} }
  try { SYNTH[kind] && SYNTH[kind](); } catch (e) {}
}

const embers = (() => {
  const cv = document.createElement("canvas"), g = cv.getContext("2d"), P = [];
  document.querySelector(".ember-bg").appendChild(cv);
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  size(); addEventListener("resize", size);
  const spawn = (x, y, burst) => P.push({
    x, y, vx: (Math.random() - .5) * (burst ? 7 : .6), vy: burst ? -Math.random() * 8 - 2 : -Math.random() * .9 - .25,
    life: 0, max: (burst ? 60 : 260) + Math.random() * 100, r: Math.random() * (burst ? 3.5 : 2.2) + .8, burst,
  });
  (function loop() {
    g.clearRect(0, 0, cv.width, cv.height);
    if (P.length < 70 && Math.random() < .35) spawn(Math.random() * cv.width, cv.height + 6, false);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life++; p.x += p.vx + Math.sin(p.life / 25) * .3; p.y += p.vy;
      if (p.burst) { p.vy += .22; p.vx *= .985; }
      const a = 1 - p.life / p.max;
      if (a <= 0) { P.splice(i, 1); continue; }
      g.beginPath(); g.fillStyle = `rgba(255,${p.burst ? 200 : 130},${p.burst ? 60 : 30},${a * (p.burst ? 1 : .6)})`;
      g.shadowColor = "#ff7a1a"; g.shadowBlur = 8; g.arc(p.x, p.y, p.r, 0, 6.3); g.fill();
    }
    requestAnimationFrame(loop);
  })();
  return { burst(n = 60) { const b = $("reelsWindow").getBoundingClientRect(); for (let i = 0; i < n; i++) spawn(b.left + b.width * Math.random(), b.top + b.height * .6, true); } };
})();

function animateReel(slot, dur, extra) {
  return new Promise(res => {
    const { strip, reel } = reelMap[slot.id];
    const D = R + extra, bounceMs = 190;
    let t = 0, last = performance.now();
    reel.classList.add("spinning");
    (function frame(now) {
      t += (now - last) * scale; last = now;
      if (t < dur) {
        const p = t / dur;
        setY(strip, D * Math.pow(1 - p, 3));
        if (p > .82) reel.classList.remove("spinning");
        requestAnimationFrame(frame);
      } else if (t < dur + bounceMs) {
        reel.classList.remove("spinning");
        setY(strip, -.12 * Math.sin(Math.PI * (t - dur) / bounceMs));
        requestAnimationFrame(frame);
      } else {
        reel.classList.remove("spinning"); renderReel(slot); sfx("stop"); res();
      }
    })(last);
  });
}

function say(text, ok) { const m = $("message"); m.className = "message" + (ok ? " ok" : ""); m.textContent = text; }
function toast(text) {
  const t = $("toast"); t.textContent = text; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 1800);
}
function clearReveal() {
  $("reels").classList.remove("revealed");
  document.querySelectorAll(".cell.hit").forEach(c => c.classList.remove("hit"));
  $("result").innerHTML = "";
}
function updateUI() {
  $("spin").classList.toggle("stopmode", spinning);
  $("spinLabel").textContent = spinning ? "PARAR" : "GIRAR";
  $("turbo").classList.toggle("on", turbo);
  $("mute").textContent = muted ? "🔇" : "🔊";
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", !!enabled[c.dataset.id]));
}
function buildChips() {
  const box = $("chips"); box.innerHTML = "";
  SLOTS.filter(s => s.optional).forEach(s => {
    const b = document.createElement("button"); b.className = "chip"; b.dataset.id = s.id;
    b.innerHTML = `<span class="sw"></span>${s.label}`;
    b.title = "Activar / quitar este slot";
    b.addEventListener("click", () => {
      if (spinning) return;
      enabled[s.id] = !enabled[s.id]; store.set("enabled", enabled);
      clearReveal(); lastBuild = null; buildReels(); updateUI(); sfx("click");
      say(enabled[s.id] ? `${s.label} activado` : `${s.label} quitado`);
    });
    box.appendChild(b);
  });
}

async function spin() {
  if (spinning) { scale = 5; return; }              
  const act = active();
  if (!act.length) { say("No hay slots activos."); return; }
  const todo = act.filter(s => !locked[s.id]);
  if (!todo.length) { say("Todos los slots están bloqueados 🔒"); return; }
  const empty = todo.find(s => !pool(s).length);
  if (empty) { say(`No quedan opciones en ${empty.label}. Revisa FILTROS.`); return; }

  spinning = true; scale = 1; clearReveal(); say("La cacería decide…"); sfx("spin"); updateUI();
  const tf = turbo ? C.turboFactor : 1;

  const jobs = todo.map((slot, k) => {
    const result = pickFrom(pool(slot), C.avoidRepeat ? cur[slot.id][MID] : null).name;
    const p = pool(slot), old = cur[slot.id];
    const rows = Array.from({ length: R }, (_, r) => r === MID ? result : pickFrom(p).name);
    cur[slot.id] = rows;
    const dur = (C.spinDuration + k * C.reelStagger) * tf;
    const extra = Math.max(3, Math.round(dur / 1000 * 15));
    const { strip } = reelMap[slot.id];
    const fillers = Array.from({ length: extra }, () => makeCell(slot, pickFrom(slot.symbols).name));
    strip.replaceChildren(makeCell(slot, pickFrom(slot.symbols).name), ...rows.map(n => makeCell(slot, n)), ...fillers, ...old.map(n => makeCell(slot, n)));
    setY(strip, R + extra);
    return animateReel(slot, dur, extra);
  });
  await Promise.all(jobs);
  spinning = false; scale = 1;
  reveal(act); updateUI();
}

function reveal(act) {
  $("reels").classList.add("revealed");
  act.forEach(s => reelMap[s.id].strip.children[1 + MID].classList.add("hit"));
  lastBuild = act.map(s => ({ slot: s.label, name: cur[s.id][MID], img: s.by[cur[s.id][MID]].img }));
  const box = $("result"); box.innerHTML = "";
  lastBuild.forEach((b, i) => {
    const d = document.createElement("div"); d.className = "res-card"; d.style.animationDelay = i * 90 + "ms";
    d.innerHTML = `<img src="${srcOf[b.img]}" alt=""><div><div class="res-label">${b.slot}</div><div class="res-name">${b.name}</div></div>`;
    box.appendChild(d);
  });
  say("¡Tu build está listo!", true);
  sfx("reveal"); embers.burst(40);
  const cab = $("cabinet"); cab.classList.remove("flash"); void cab.offsetWidth; cab.classList.add("flash");
  history.unshift({ t: Date.now(), build: lastBuild.map(b => ({ slot: b.slot, name: b.name })) });
  history = history.slice(0, 30); store.set("history", history);
}

const buildText = (b) => b.map(x => `${x.slot[0] + x.slot.slice(1).toLowerCase()}: ${x.name}`).join(" | ");
async function copyBuild() {
  if (!lastBuild) { toast("Primero realiza un sorteo"); return; }
  const txt = buildText(lastBuild);
  try { await navigator.clipboard.writeText(txt); }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {} ta.remove();
  }
  toast("Build copiado");
}

const openModal = (id) => { $(id).hidden = false; };
const closeModals = () => document.querySelectorAll(".modal").forEach(m => { m.hidden = true; });

function buildFilters() {
  const body = $("filterBody"); body.innerHTML = "";
  SLOTS.forEach(slot => {
    const sec = document.createElement("div"); sec.className = "f-sec";
    const head = document.createElement("div"); head.className = "f-head";
    const count = document.createElement("b");
    const btns = document.createElement("span");
    const all = document.createElement("button"); all.className = "toggle"; all.textContent = "TODAS";
    const none = document.createElement("button"); none.className = "toggle"; none.textContent = "NINGUNA";
    btns.append(all, none); head.append(count, btns);
    const grid = document.createElement("div"); grid.className = "f-grid";
    const refresh = () => { count.textContent = `${slot.label} (${pool(slot).length}/${slot.symbols.length})`; };
    slot.symbols.forEach(x => {
      const t = document.createElement("div"); t.className = "tile" + (excluded.has(key(slot, x.name)) ? " off" : "");
      t.innerHTML = `<img src="${srcOf[x.img]}" alt=""><span>${x.name}</span>`;
      t.addEventListener("click", () => {
        const k = key(slot, x.name);
        excluded.has(k) ? excluded.delete(k) : excluded.add(k);
        t.classList.toggle("off", excluded.has(k)); store.set("excluded", [...excluded]); refresh();
      });
      grid.appendChild(t);
    });
    const setAll = (on) => {
      slot.symbols.forEach(x => on ? excluded.delete(key(slot, x.name)) : excluded.add(key(slot, x.name)));
      store.set("excluded", [...excluded]); buildFilters();
    };
    all.addEventListener("click", () => setAll(true)); none.addEventListener("click", () => setAll(false));
    refresh(); sec.append(head, grid); body.appendChild(sec);
  });
}
function buildHistory() {
  const body = $("historyBody");
  if (!history.length) { body.innerHTML = `<div class="empty">Aún no hay builds. Realiza el primero!</div>`; return; }
  body.innerHTML = history.map(h => {
    const d = new Date(h.t);
    return `<div class="h-row"><small>${d.toLocaleDateString("es")} ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</small>` +
      h.build.map(x => `${x.slot[0] + x.slot.slice(1).toLowerCase()}: <b>${x.name}</b>`).join(" &nbsp;·&nbsp; ") + `</div>`;
  }).join("");
}

function bind() {
  $("spin").addEventListener("click", () => { ac(); spin(); });
  $("turbo").addEventListener("click", () => { turbo = !turbo; store.set("turbo", turbo); updateUI(); });
  $("mute").addEventListener("click", () => { muted = !muted; store.set("muted", muted); updateUI(); });
  $("filters").addEventListener("click", () => { buildFilters(); openModal("modalFilters"); });
  $("history").addEventListener("click", () => { buildHistory(); openModal("modalHistory"); });
  $("copy").addEventListener("click", copyBuild);
  $("clearHistory").addEventListener("click", () => { history = []; store.set("history", history); buildHistory(); });
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", (e) => { if (e.target === m) closeModals(); }));
  addEventListener("keydown", (e) => {
    if (e.code === "Escape") closeModals();
    const modalOpen = [...document.querySelectorAll(".modal")].some(m => !m.hidden);
    if (e.code === "Space" && !modalOpen) { e.preventDefault(); if (!e.repeat) { ac(); spin(); } }
  });
  addEventListener("resize", layout);
}

(async function init() {
  document.title = C.titulo || "Outlanders";
  $("subtitle").textContent = C.subtitulo || "";
  if (!SLOTS.some(s => s.symbols.length)) { say("Configura al menos un slot con símbolos en config.js"); return; }
  await preload();
  buildChips(); buildReels(); bind(); updateUI();
  window.Ruleta = { get build() { return lastBuild; }, spin, slots: SLOTS };
})();
})();
