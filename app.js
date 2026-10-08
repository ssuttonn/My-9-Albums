const SIZE = 9;
const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");   // phones and tablets
const KEY = "albums-that-shaped-me";
const MODES = {
  albums: { title: "My 9 Albums", sub: "The 9 albums that shaped who I am", tag: "#My9Albums", noun: "album", add: "Add an album",
            ph: "Search for an album or artist", hint: "Type an album or artist name to search.", file: "my-9-albums.png" },
  songs:  { title: "My 9 Songs", sub: "The 9 songs that shaped who I am", tag: "#My9Songs", noun: "song", add: "Add a song",
            ph: "Search for a song or artist", hint: "Type a song or artist name to search.", file: "my-9-songs.png" }
};
let sharedView = false;
let mode = "albums";
try { const m = sessionStorage.getItem(KEY + "-mode"); if (MODES[m]) mode = m; } catch (e) {}
const storeKey = () => mode === "songs" ? KEY + "-songs" : KEY;
function loadItems() {
  let items = Array(SIZE).fill(null);
  try { const s = JSON.parse(sessionStorage.getItem(storeKey())); if (Array.isArray(s) && s.length === SIZE) items = s; } catch (e) {}
  return items;
}
let titles = { t: "", s: "" };   // custom title/subtitle for the current mode ("" = use default)
function loadTexts() {
  try { const o = JSON.parse(sessionStorage.getItem(storeKey() + "-text")) || {}; titles = { t: String(o.t || "").slice(0, 60), s: String(o.s || "").slice(0, 100) }; }
  catch (e) { titles = { t: "", s: "" }; }
}
function saveTexts() { if (sharedView) return; try { sessionStorage.setItem(storeKey() + "-text", JSON.stringify(titles)); } catch (e) {} }
const getTitle = () => titles.t.trim() || MODES[mode].title;
const getSub = () => titles.s.trim() || MODES[mode].sub;
let albums = loadItems();   // holds albums or songs, depending on mode
loadTexts();
let activeSlot = null;

// Themes: bg gradient, card, panel (title/tag), panel text, subtitle, label bg/text/sub, border, empty-art stripes, caption text, button colors
function T(name, v) {
  const k = ["bgTop","bgBottom","card","panel","ptext","sub","lbl","ltext","lsub","line","artA","artB","cap","accent","accentText"];
  const o = { name }; k.forEach((key, i) => o[key] = v[i]); return o;
}
const THEMES = {
  forest:   T("Forest",   ["#d9ead6","#f7f3e6","#10261d","#fdf6e3","#10261d","#4a6a58","#f6efdd","#10261d","#5b6f62","#d4e3cf","#1c3a2d","#20432f","#f6efdd","#10261d","#fdf6e3"]),
  sunset:   T("Sunset",   ["#fcd9c4","#fdf1e0","#3b1f2b","#fff4e6","#3b1f2b","#a24b3a","#fde8d3","#3b1f2b","#8a5a4c","#f0c4a8","#4d2a39","#5a3345","#fde8d3","#3b1f2b","#fff4e6"]),
  ocean:    T("Ocean",    ["#cfe6f2","#eef7fb","#0f2a3f","#f4fbff","#0f2a3f","#3d6a85","#e4f2f9","#0f2a3f","#4f7288","#b9d8e8","#17405c","#1b4a6a","#e4f2f9","#0f2a3f","#f4fbff"]),
  rose:     T("Rose",     ["#f9d5e0","#fdf0f4","#3d1626","#fff5f8","#3d1626","#a14562","#fde4ec","#3d1626","#8c5568","#f0bccd","#4f2236","#5b2a41","#fde4ec","#3d1626","#fff5f8"]),
  midnight: T("Midnight", ["#12121c","#1f1b2e","#0a0a12","#26223a","#f1ecff","#b8a9e8","#2d2946","#f1ecff","#b3a9d6","#3a3556","#1a1830","#201d3a","#d9d2f5","#f1ecff","#12121c"])
};
let theme = "forest";
try { const t = sessionStorage.getItem(KEY + "-theme"); if (THEMES[t]) theme = t; } catch (e) {}
function applyTheme() {
  const t = THEMES[theme], r = document.documentElement.style;
  const map = { "--bg-top": "bgTop", "--bg-bottom": "bgBottom", "--ink": "card", "--cream": "panel", "--ptext": "ptext", "--sub": "sub",
    "--card-label": "lbl", "--ltext": "ltext", "--lsub": "lsub", "--line": "line", "--art-a": "artA", "--art-b": "artB",
    "--cap": "cap", "--accent": "accent", "--accent-text": "accentText" };
  for (const v in map) r.setProperty(v, t[map[v]]);
  $("theme").textContent = "Theme: " + t.name;
}

const $ = id => document.getElementById(id);
const grid = $("grid"), dlg = $("dlg"), q = $("q"), results = $("results"), msg = $("msg");

function save() { if (sharedView) return; try { sessionStorage.setItem(storeKey(), JSON.stringify(albums)); } catch (e) {} }

function fitHeader() {
  let extra = 0;
  ["title", "subtitle"].forEach(id => {
    const el = $(id); el.style.height = "auto"; el.style.height = (el.scrollHeight + 2) + "px";
    const lh = parseFloat(getComputedStyle(el).lineHeight) || el.scrollHeight;
    extra += Math.max(0, el.scrollHeight - lh);
  });
  document.documentElement.style.setProperty("--extra2", Math.round(extra) + "px");
  fitGrid();
}

// Size the covers so the whole page (title, 3x3 grid, buttons) fits the window exactly, with no scrolling.
function fitGrid() {
  const slots = grid.children;
  if (!slots.length) return;
  // On touch screens, don't resize the grid while the on-screen keyboard is up.
  const ae = document.activeElement;
  if (touchMq.matches && ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
  const wrap = document.querySelector(".wrap"), footer = document.querySelector("footer");
  const gs = getComputedStyle(grid), ws = getComputedStyle(wrap);
  let textH = 0;
  for (const sl of slots) { const art = sl.querySelector(".art"); if (art) textH = Math.max(textH, sl.offsetHeight - art.offsetHeight); }
  const rowGap = parseFloat(gs.rowGap) || 14, colGap = parseFloat(gs.columnGap) || 16;
  const footH = footer.offsetHeight + (parseFloat(getComputedStyle(footer).marginTop) || 0);
  const avail = window.innerHeight - grid.getBoundingClientRect().top - footH - (parseFloat(ws.paddingBottom) || 0) - 4;
  const byHeight = (avail - rowGap * 2) / 3 - textH;
  const byWidth = (document.documentElement.clientWidth - (parseFloat(ws.paddingLeft) || 0) * 2 - colGap * 2) / 3;
  const w = Math.floor(Math.max(56, Math.min(byHeight, byWidth, 360)));
  grid.style.setProperty("--w", w + "px");
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGrid);
window.addEventListener("resize", fitHeader);

function applyMode() {
  const m = MODES[mode];
  $("title").value = getTitle(); $("subtitle").value = getSub(); $("tag").textContent = m.tag;
  $("title").placeholder = m.title; $("subtitle").placeholder = m.sub;
  document.title = getTitle(); fitHeader();
  const Ns = m.noun.charAt(0).toUpperCase() + m.noun.slice(1) + "s", chips = $("chips");
  const ideas = ["Rock", "Rap", "Pop", "Country", "R&B", "Metal", "Indie", "Jazz"].map(g => `My 9 ${g} ${Ns}`)
    .concat([`My 9 ${Ns} of ${new Date().getFullYear()}`, `My 9 Comfort ${Ns}`, `My 9 Road Trip ${Ns}`, `${Ns} That Got Me Through College`]);
  chips.innerHTML = "";
  ideas.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = t; b.dataset.t = t.slice(0, 60); chips.appendChild(b); });
  document.querySelectorAll(".noun").forEach(el => { el.textContent = m.noun; });
  document.querySelectorAll(".anoun").forEach(el => { el.textContent = (mode === "songs" ? "a " : "an ") + m.noun; });
  $("helpPlay").textContent = mode === "songs" ? "that song" : "a random track from that album";
  q.placeholder = m.ph; q.setAttribute("aria-label", "Search " + m.noun + "s");
  results.innerHTML = `<div class="status">${m.hint}</div>`;
  $("modeAlbums").setAttribute("aria-pressed", mode === "albums");
  $("modeSongs").setAttribute("aria-pressed", mode === "songs");
}
function setMode(next) {
  if (sharedView) leaveShared();
  if (next === mode) return;
  stopAudio(); mode = next; msg.textContent = "";
  try { sessionStorage.setItem(KEY + "-mode", mode); } catch (e) {}
  albums = loadItems(); loadTexts(); applyMode(); render();
}
$("modeAlbums").onclick = () => setMode("albums");
$("modeSongs").onclick = () => setMode("songs");

function render() {
  grid.innerHTML = "";
  albums.forEach((a, i) => {
    const on = !!(playing && playing.i === i);
    const b = document.createElement("div");
    b.className = "slot " + (a ? "filled" : "empty") + (on ? " playing" : "");
    b.tabIndex = 0; b.setAttribute("role", "button");
    b.setAttribute("aria-label", a ? `Play a preview from ${a.name}` : `Add ${MODES[mode].noun} to slot ${i + 1}`);
    b.innerHTML = a
      ? `<div class="art"><img draggable="false" src="${a.art}" alt="${esc(a.name)} cover"><span class="play"><svg viewBox="0 0 24 24" aria-hidden="true">${on ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>' : '<path d="M8 5v14l11-7z"/>'}</svg></span>${on ? `<span class="np">♪ ${esc(playing.title)}</span>` : ""}</div>
         <div class="label"><b>${esc(a.name)}</b><small>${esc(a.artist)}</small></div>
         <input class="cap" type="text" maxlength="60" placeholder="Add a caption" value="${esc(a.caption || "")}" aria-label="Caption for ${esc(a.name)}">
         <button class="swap" aria-label="Change ${MODES[mode].noun}" title="Change ${MODES[mode].noun}">&#8644;</button>
         <button class="remove" aria-label="Remove ${esc(a.name)}" title="Remove">&times;</button>`
      : `<div class="art"><div class="plus"></div></div><div class="label">${MODES[mode].add}</div>`;
    const cap = b.querySelector(".cap");
    if (cap) {
      cap.addEventListener("input", () => { albums[i].caption = cap.value; save(); });
      cap.addEventListener("keydown", e => { if (e.key === "Enter") cap.blur(); });
    }
    b.addEventListener("click", e => {
      if (suppressClick || e.target.closest(".cap")) return;
      if (e.target.closest(".remove")) { if (playing && playing.i === i) stopAudio(); albums[i] = null; save(); render(); return; }
      if (e.target.closest(".swap") || !albums[i]) { openSearch(i); return; }
      if (touchMq.matches) { openCard(i); return; }   // touch screens: open the options sheet
      togglePreview(i);
    });
    b.addEventListener("keydown", e => { if (e.target.closest(".cap")) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); b.click(); } });
    if (a) attachDrag(b, i);
    grid.appendChild(b);
  });
  fitGrid();
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function openSearch(i) {
  activeSlot = i; q.value = "";
  results.innerHTML = `<div class="status">${MODES[mode].hint}</div>`;
  dlg.showModal(); q.focus();
}
$("close").onclick = () => dlg.close();
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

let timer, reqId = 0;
q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 500); });
q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); search(); } });

// ---------- Track previews (30-second clips from the iTunes API) ----------
const audio = new Audio();
let playing = null;            // { i: slot index, title: track name }
const trackCache = {}, lastTrack = {};
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
audio.addEventListener("ended", () => {
  if (audio.src.indexOf("data:audio/wav") === 0) return;   // the silent unlock clip, not a real preview
  playing = null; render(); if (cardDlg.open) syncCardPlay();
});
function stopAudio() { audio.pause(); playing = null; }

// iPhones only allow audio that starts from a tap. Our previews start after a network lookup, so on the
// first tap we "unlock" the audio element with a silent clip; after that it can play previews normally.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { audio.src = SILENT; const p = audio.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
["click", "touchend"].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

async function getTracks(a) {
  const key = a.id || (a.name + "|" + a.artist);
  if (trackCache[key]) return trackCache[key];
  let list = [];
  if (a.id) {
    const d = await itunes(`https://itunes.apple.com/lookup?id=${a.id}&entity=song`);
    list = d.results.filter(r => r.wrapperType === "track" && r.previewUrl);
  }
  if (!list.length) { // fallback for albums saved before ids were stored
    const d = await itunes(`https://itunes.apple.com/search?media=music&entity=song&limit=50&term=${encodeURIComponent(a.name + " " + a.artist)}`);
    const nm = a.name.toLowerCase();
    list = d.results.filter(r => r.previewUrl && (r.collectionName || "").toLowerCase() === nm);
  }
  trackCache[key] = list;
  return list;
}

async function togglePreview(i) {
  const a = albums[i]; if (!a) return;
  if (playing && playing.i === i) { stopAudio(); render(); return; }
  msg.style.color = "var(--sub)"; msg.textContent = "Loading preview…";
  try {
    let list;
    if (a.kind === "song") {
      if (!a.preview && a.id) {   // shared links don't carry the preview URL, so look it up
        const d = await itunes(`https://itunes.apple.com/lookup?id=${a.id}`);
        const r = d.results && d.results[0];
        if (r && r.previewUrl) a.preview = r.previewUrl;
      }
      list = a.preview ? [{ previewUrl: a.preview, trackName: a.name, trackId: a.id }] : [];
    } else list = await getTracks(a);
    if (!list.length) { msg.style.color = "#8a2d2d"; msg.textContent = `No preview available for this ${MODES[mode].noun}.`; return; }
    const key = a.id || (a.name + "|" + a.artist);
    let pick;
    do { pick = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && pick.trackId === lastTrack[key]);
    lastTrack[key] = pick.trackId;
    audio.pause(); audio.src = pick.previewUrl;
    await audio.play();
    playing = { i, title: pick.trackName };
    msg.textContent = "";
    render();
  } catch (e) {
    msg.style.color = "#8a2d2d"; msg.textContent = "Couldn't play the preview. Try clicking the cover again.";
  }
}

// Apple request: try a normal fetch first (works on the hosted https site and lets us see rate-limit errors),
// then fall back to the script-tag method (works from a double-clicked local file or where fetch is blocked).
const apiCache = {};
async function itunes(url) {
  if (apiCache[url]) return apiCache[url];
  let data;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (res.status === 403 || res.status === 429) { const e = new Error("rate limited"); e.rate = true; throw e; }
    if (!res.ok) throw new Error("http " + res.status);
    data = await res.json();
  } catch (e) {
    if (e.rate) throw e;
    data = await jsonp(url);
  }
  apiCache[url] = data;
  return data;
}

// Script-tag (JSONP) request: works from a double-clicked local file, where fetch() is blocked by CORS.
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "itunesCb" + Date.now() + Math.floor(Math.random() * 1000);
    const s = document.createElement("script");
    const done = () => { delete window[cb]; s.remove(); clearTimeout(t); };
    const t = setTimeout(() => { done(); reject(new Error("timeout")); }, 10000);
    window[cb] = data => { done(); resolve(data); };
    s.onerror = () => { done(); reject(new Error("network")); };
    s.src = url + "&callback=" + cb;
    document.head.appendChild(s);
  });
}

async function search() {
  const term = q.value.trim();
  if (term.length < 2) { results.innerHTML = `<div class="status">${MODES[mode].hint}</div>`; return; }
  const id = ++reqId;
  results.innerHTML = '<div class="status">Searching…</div>';
  try {
    const url = `https://itunes.apple.com/search?media=music&entity=${mode === "songs" ? "song" : "album"}&limit=25&term=${encodeURIComponent(term)}`;
    const data = await itunes(url);
    if (id !== reqId) return;
    if (!data.results.length) { results.innerHTML = `<div class="status">No ${MODES[mode].noun}s found. Try a different spelling.</div>`; return; }
    results.innerHTML = "";
    data.results.filter(r => mode === "songs" ? r.trackName : r.collectionName).forEach(r => {
      const isSong = mode === "songs";
      const album = isSong
        ? { kind: "song", name: r.trackName, artist: r.artistName, id: r.trackId, preview: r.previewUrl || "",
            art: r.artworkUrl100.replace("100x100bb", "600x600bb") }
        : { name: r.collectionName, artist: r.artistName, id: r.collectionId,
            art: r.artworkUrl100.replace("100x100bb", "600x600bb") };
      const btn = document.createElement("button");
      btn.className = "res"; btn.type = "button";
      btn.innerHTML = `<img src="${r.artworkUrl100}" alt=""><div><b>${esc(album.name)}</b><span>${esc(album.artist)}${isSong && r.collectionName ? " · " + esc(r.collectionName) : ""}${r.releaseDate ? " · " + r.releaseDate.slice(0, 4) : ""}</span></div>`;
      btn.onclick = () => { if (playing && playing.i === activeSlot) stopAudio(); albums[activeSlot] = album; save(); render(); dlg.close(); };
      results.appendChild(btn);
    });
  } catch (e) {
    if (id === reqId) results.innerHTML = e && e.rate
      ? '<div class="status">Apple\'s search is busy right now (too many requests). Wait about a minute and try again.</div>'
      : '<div class="status">Couldn\'t reach Apple\'s music search. Check your connection. If you\'re on a phone, try Wi-Fi, and turn off any content blocker or private browsing for this site.</div>';
  }
}

$("clear").onclick = () => { if (confirm(`Remove all ${MODES[mode].noun}s?`)) { stopAudio(); albums = Array(SIZE).fill(null); save(); render(); } };

/* ---------- Image export (drawn on a canvas so it matches the page) ---------- */
function loadImg(src) {
  return new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => rej(new Error("Image failed: " + src));
    im.src = src;
  });
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function wrapLines(c, text, maxW) {
  const lines = [""];
  text.trim().split(/\s+/).forEach(w => {
    const cur = lines[lines.length - 1], t = cur ? cur + " " + w : w;
    if (c.measureText(t).width <= maxW || !cur) lines[lines.length - 1] = t; else lines.push(w);
  });
  return lines;
}
function fitText(c, text, maxW) {
  if (c.measureText(text).width <= maxW) return text;
  while (text.length > 1 && c.measureText(text + "…").width > maxW) text = text.slice(0, -1);
  return text + "…";
}

async function generate() {
  msg.textContent = "";
  if (!albums.some(Boolean)) { msg.textContent = `Add at least one ${MODES[mode].noun} first.`; return; }
  const btn = $("gen"); btn.disabled = true; btn.textContent = "Generating…";
  try {
    const imgs = await Promise.all(albums.map(a => a ? loadImg(a.art) : null));
    const th = THEMES[theme];
    const font = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    const W = 1200, pad = 70, gap = 30, cw = (W - pad * 2 - gap * 2) / 3;
    const hasCap = albums.some(a => a && a.caption && a.caption.trim());
    const mc = document.createElement("canvas").getContext("2d");
    let ts = 54, tl;
    do { mc.font = `700 ${ts}px ${font}`; tl = wrapLines(mc, getTitle(), 1060); if (tl.length <= 2) break; ts -= 2; } while (ts > 34);
    let ss = 21, sl;
    do { mc.font = `500 ${ss}px ${font}`; sl = wrapLines(mc, getSub(), 1060); if (sl.length <= 2) break; ss -= 1; } while (ss > 14);
    const titleLH = ts * 1.15, ssLH = ss * 1.35;
    const subFirst = 92 + (tl.length - 1) * titleLH + 42;
    const gy = Math.round(subFirst + (sl.length - 1) * ssLH + 56);
    const ch = cw + (hasCap ? 112 : 66);
    const H = gy + ch * 3 + gap * 2 + 90;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, th.bgTop); bg.addColorStop(1, th.bgBottom);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    c.textAlign = "center"; c.fillStyle = th.ptext; c.font = `700 ${ts}px ${font}`;
    tl.forEach((ln, k) => c.fillText(ln, W / 2, 92 + k * titleLH));
    c.fillStyle = th.sub; c.font = `500 ${ss}px ${font}`;
    sl.forEach((ln, k) => c.fillText(ln, W / 2, subFirst + k * ssLH));

    albums.forEach((a, i) => {
      const x = pad + (i % 3) * (cw + gap), y = gy + Math.floor(i / 3) * (ch + gap);
      if (imgs[i]) {
        c.save(); c.shadowColor = "rgba(0,0,0,.22)"; c.shadowBlur = 22; c.shadowOffsetY = 8;
        rr(c, x, y, cw, cw, 18); c.fillStyle = th.artA; c.fill(); c.restore();
        c.save(); rr(c, x, y, cw, cw, 18); c.clip(); c.drawImage(imgs[i], x, y, cw, cw); c.restore();
      } else {
        c.save(); rr(c, x, y, cw, cw, 18); c.globalAlpha = .07; c.fillStyle = th.ptext; c.fill();
        c.globalAlpha = .3; c.strokeStyle = th.ptext; c.lineWidth = 2; c.setLineDash([10, 8]); c.stroke(); c.restore();
        c.save(); c.globalAlpha = .55; c.strokeStyle = th.sub; c.lineWidth = 3; c.lineCap = "round";
        const cx = x + cw / 2, cy = y + cw / 2, k = 22;
        c.beginPath(); c.moveTo(cx - k, cy); c.lineTo(cx + k, cy); c.moveTo(cx, cy - k); c.lineTo(cx, cy + k); c.stroke(); c.restore();
      }
      if (!a) return;
      c.textAlign = "left";
      c.fillStyle = th.ptext; c.font = `600 19px ${font}`; c.fillText(fitText(c, a.name, cw - 6), x + 3, y + cw + 32);
      c.fillStyle = th.lsub; c.font = `400 16px ${font}`; c.fillText(fitText(c, a.artist, cw - 6), x + 3, y + cw + 55);
      const cp = (a.caption || "").trim();
      if (cp) {
        c.fillStyle = th.sub; c.font = `italic 16px ${font}`;
        const lines = [""];
        cp.split(/\s+/).forEach(w => {
          const t = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w;
          if (c.measureText(t).width <= cw - 6 || !lines[lines.length - 1]) lines[lines.length - 1] = t;
          else lines.push(w);
        });
        lines.slice(0, 2).forEach((ln, li) => {
          const out = (li === 1 && lines.length > 2) ? fitText(c, ln + " …", cw - 6) : fitText(c, ln, cw - 6);
          c.fillText(out, x + 3, y + cw + 86 + li * 21);
        });
      }
    });

    c.textAlign = "center"; c.fillStyle = th.sub; c.font = `600 18px ${font}`;
    c.fillText(MODES[mode].tag, W / 2, gy + ch * 3 + gap * 2 + 48);

    const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/png"));
    if (touchMq.matches) {   // phones: show the image so it can be shared or saved to Photos
      showImage(blob);
      msg.style.color = "#2d6a45"; msg.textContent = "Your image is ready.";
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = MODES[mode].file;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      msg.style.color = "#2d6a45"; msg.textContent = `Saved ${MODES[mode].file} to your downloads.`;
    }
  } catch (e) {
    msg.style.color = "#8a2d2d";
    msg.textContent = "Couldn't build the image. Check your internet connection and try again.";
    console.error(e);
  } finally { btn.disabled = false; btn.textContent = "Generate image"; }
}
$("gen").onclick = generate;
$("theme").onclick = () => {
  const keys = Object.keys(THEMES);
  theme = keys[(keys.indexOf(theme) + 1) % keys.length];
  if (!sharedView) { try { sessionStorage.setItem(KEY + "-theme", theme); } catch (e) {} }
  applyTheme();
};

/* ---------- Drag to reorder (mouse and touch) ---------- */
let suppressClick = false;
function attachDrag(b, i) {
  b.addEventListener("pointerdown", e => {
    if (e.button !== 0 || e.target.closest(".cap, .remove, .swap") || !albums[i]) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, over = -1;
    const clearOver = () => grid.querySelectorAll(".dropover").forEach(el => el.classList.remove("dropover"));
    const move = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        const img = b.querySelector(".art img");
        ghost = img.cloneNode(); ghost.className = "ghost";
        const sz = Math.max(70, b.getBoundingClientRect().width * .7);
        ghost.style.width = ghost.style.height = sz + "px";
        document.body.appendChild(ghost); b.classList.add("dragging");
      }
      const sz = ghost.offsetWidth;
      ghost.style.left = (ev.clientX - sz / 2) + "px"; ghost.style.top = (ev.clientY - sz / 2) + "px";
      const t = document.elementFromPoint(ev.clientX, ev.clientY), sl = t && t.closest(".slot");
      const idx = sl ? Array.prototype.indexOf.call(grid.children, sl) : -1;
      clearOver(); over = idx;
      if (idx >= 0 && idx !== i) sl.classList.add("dropover");
    };
    const end = ev => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!ghost) return;
      ghost.remove(); clearOver(); b.classList.remove("dragging");
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 60);
      if (ev.type === "pointerup" && over >= 0 && over !== i) {
        [albums[i], albums[over]] = [albums[over], albums[i]];
        if (playing) { if (playing.i === i) playing.i = over; else if (playing.i === over) playing.i = i; }
        save(); render();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}

/* ---------- Shareable link (the collage is stored in the URL after the #) ---------- */
function encodeShare() {
  const o = { m: mode, t: theme, l: albums.map(a => a ? { n: a.name, a: a.artist, i: a.id, r: a.art, c: a.caption || undefined } : null), tt: titles.t || undefined, ss: titles.s || undefined };
  return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeShare(str) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))));
    if (!MODES[o.m] || !Array.isArray(o.l) || o.l.length !== SIZE) return null;
    const okArt = /^https:\/\/[a-z0-9.-]+\.mzstatic\.com\//i;
    const items = o.l.map(x => (x && typeof x.n === "string" && typeof x.a === "string" && typeof x.r === "string" && okArt.test(x.r))
      ? Object.assign(o.m === "songs" ? { kind: "song" } : {}, { name: x.n.slice(0, 200), artist: x.a.slice(0, 200), id: Number(x.i) || 0, art: x.r },
          x.c ? { caption: String(x.c).slice(0, 60) } : {})
      : null);
    return { mode: o.m, theme: THEMES[o.t] ? o.t : "forest", items, texts: { t: String(o.tt || "").slice(0, 60), s: String(o.ss || "").slice(0, 100) } };
  } catch (e) { return null; }
}
function applyShared() {
  const m = location.hash.match(/^#s=([\w-]+)/);
  if (!m) return false;
  const d = decodeShare(m[1]);
  if (!d) return false;
  stopAudio(); sharedView = true; mode = d.mode; theme = d.theme; albums = d.items; titles = d.texts;
  document.body.classList.add("shared"); $("banner").hidden = false;
  return true;
}
function leaveShared() {
  sharedView = false; document.body.classList.remove("shared"); $("banner").hidden = true;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const m = sessionStorage.getItem(KEY + "-mode"), t = sessionStorage.getItem(KEY + "-theme");
    mode = MODES[m] ? m : "albums"; theme = THEMES[t] ? t : "forest";
  } catch (e) { mode = "albums"; theme = "forest"; }
  stopAudio(); albums = loadItems(); loadTexts(); applyTheme(); applyMode(); render();
}
$("backMine").onclick = leaveShared;
$("saveCopy").onclick = () => {
  let has = false;
  try { const own = JSON.parse(sessionStorage.getItem(storeKey())); has = Array.isArray(own) && own.some(Boolean); } catch (e) {}
  if (has && !confirm(`This will replace your current ${MODES[mode].noun} list. Continue?`)) return;
  const keep = albums;
  sharedView = false; document.body.classList.remove("shared"); $("banner").hidden = true;
  history.replaceState(null, "", location.pathname + location.search);
  try { sessionStorage.setItem(KEY + "-mode", mode); sessionStorage.setItem(KEY + "-theme", theme); } catch (e) {}
  albums = keep; save(); saveTexts(); applyMode(); render();
};
$("share").onclick = async () => {
  if (!albums.some(Boolean)) { msg.style.color = "#8a2d2d"; msg.textContent = `Add at least one ${MODES[mode].noun} first.`; return; }
  const url = location.href.split("#")[0] + "#s=" + encodeShare();
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
    try { const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (e2) {}
  }
  if (!ok) { prompt("Copy this link:", url); return; }
  msg.style.color = "#2d6a45";
  msg.textContent = location.protocol === "file:"
    ? "Link copied. Others can open it once the site is hosted online."
    : "Link copied!";
};
window.addEventListener("hashchange", () => { if (applyShared()) { applyTheme(); applyMode(); render(); } });

const oneLine = el => { if (/\n/.test(el.value)) el.value = el.value.replace(/\n+/g, " "); };
$("title").addEventListener("input", () => { oneLine($("title")); titles.t = $("title").value; saveTexts(); document.title = getTitle(); fitHeader(); });
$("subtitle").addEventListener("input", () => { oneLine($("subtitle")); titles.s = $("subtitle").value; saveTexts(); fitHeader(); });
["title", "subtitle"].forEach(id => {
  $(id).addEventListener("blur", () => { $("title").value = getTitle(); $("subtitle").value = getSub(); fitHeader(); });
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
});
$("chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  titles.t = b.dataset.t; saveTexts(); applyMode(); $("helpDlg").close();
});
$("help").onclick = () => $("helpDlg").showModal();
$("helpClose").onclick = () => $("helpDlg").close();
$("helpDlg").addEventListener("click", e => { if (e.target === $("helpDlg")) $("helpDlg").close(); });

/* ---------- Touch screens: options sheet for a tapped cover ---------- */
const cardDlg = $("cardDlg"), imgDlg = $("imgDlg");
let cardSlot = null;
function syncCardPlay() { $("cardPlay").textContent = (playing && playing.i === cardSlot) ? "Stop preview" : "Play preview"; }
function openCard(i) {
  const a = albums[i]; if (!a) return;
  cardSlot = i;
  $("cardImg").src = a.art; $("cardName").textContent = a.name; $("cardArtist").textContent = a.artist;
  $("cardCap").value = a.caption || ""; $("cardMsg").textContent = ""; syncCardPlay();
  cardDlg.showModal();
}
$("cardCap").addEventListener("input", () => { if (albums[cardSlot]) { albums[cardSlot].caption = $("cardCap").value; save(); } });
$("cardCap").addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
$("cardPlay").onclick = async () => {
  $("cardPlay").textContent = "Loading…"; $("cardMsg").textContent = "";
  await togglePreview(cardSlot);
  syncCardPlay();
  $("cardMsg").textContent = /^Loading/.test(msg.textContent) ? "" : msg.textContent;
};
$("cardChange").onclick = () => { cardDlg.close(); openSearch(cardSlot); };
$("cardRemove").onclick = () => {
  if (playing && playing.i === cardSlot) stopAudio();
  albums[cardSlot] = null; save(); render(); cardDlg.close();
};
$("cardClose").onclick = () => cardDlg.close();
cardDlg.addEventListener("click", e => { if (e.target === cardDlg) cardDlg.close(); });

/* ---------- Touch screens: show the finished image so it can be shared or saved ---------- */
let outUrl = null, outFile = null;
function showImage(blob) {
  if (outUrl) URL.revokeObjectURL(outUrl);
  outUrl = URL.createObjectURL(blob);
  try { outFile = new File([blob], MODES[mode].file, { type: "image/png" }); } catch (e) { outFile = null; }
  $("outImg").src = outUrl;
  const canShare = !!(navigator.canShare && outFile && navigator.canShare({ files: [outFile] }));
  $("imgShare").textContent = canShare ? "Share / Save" : "Download";
  imgDlg.showModal();
}
$("imgShare").onclick = async () => {
  if (navigator.canShare && outFile && navigator.canShare({ files: [outFile] })) {
    try { await navigator.share({ files: [outFile], title: getTitle() }); } catch (e) {}
    return;
  }
  const a = document.createElement("a"); a.href = outUrl; a.download = MODES[mode].file;
  document.body.appendChild(a); a.click(); a.remove();
};
$("imgClose").onclick = () => imgDlg.close();
imgDlg.addEventListener("click", e => { if (e.target === imgDlg) imgDlg.close(); });

/* ---------- Touch layout + keep dialogs above the on-screen keyboard ---------- */
function applyTouch() { document.documentElement.classList.toggle("touch", touchMq.matches); fitGrid(); }
if (touchMq.addEventListener) touchMq.addEventListener("change", applyTouch); else if (touchMq.addListener) touchMq.addListener(applyTouch);
if (window.visualViewport) {
  const setVV = () => document.documentElement.style.setProperty("--vvh", window.visualViewport.height + "px");
  window.visualViewport.addEventListener("resize", setVV); setVV();
}
document.documentElement.classList.toggle("touch", touchMq.matches);

applyShared();
applyTheme();
applyMode();
render();
