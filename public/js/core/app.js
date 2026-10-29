/* 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改；要改請改工具的 site_template 再 build。
   ○○探險家系列的共用資料層：每頁先載入 /js/site.js（window.SITE，這一站的設定），再載入這支。
   負責：四級難度、載入 site.json（先讀 meta.json 拿版本號，換版不用手改）、原文分檔載入、照片、線索遮名、語音、小工具、自製對話框。 */
(function () {
  "use strict";
  const S = window.SITE;
  if (!S) throw new Error("缺 /js/site.js（window.SITE）");
  const P = S.key + "-"; // localStorage 前綴，每站分開

  // ---- 三個年級（跟動物探險家一樣：低、中、高年級；低年級有注音）：存在 localStorage，頁首可切換 ----
  const LEVELS = {
    e: { name: "低年級", choices: 3 },
    j: { name: "中年級", choices: 3 },
    s: { name: "高年級", choices: 4 },
  };
  function level() {
    try { const v = localStorage.getItem(P + "level"); if (LEVELS[v]) return v; } catch (e) { /* 無痕模式 */ }
    return "e";
  }
  function setLevel(v) {
    try { localStorage.setItem(P + "level", v); } catch (e) { /* 忽略 */ }
    document.dispatchEvent(new CustomEvent("app-level", { detail: v }));
  }
  // 依難度給介紹文字：幼兒園一句、國小與國中白話段（國中另可展開原文）、高中原文（要先 loadOrig）
  function intro(a, lv) {
    lv = lv || level();
    if (lv === "k") return a.k || "";
    return a.e || a.k || "";
  }

  // ---- 載入：meta.json 不快取（很小），用它的版本號抓 site.json，瀏覽器快取一天也不怕舊 ----
  let cache = null;
  async function load() {
    if (cache) return cache;
    const m = await fetch("/data/meta.json", { cache: "no-cache" });
    if (!m.ok) throw new Error("meta.json HTTP " + m.status);
    const meta = await m.json();
    const r = await fetch(S.dataFile + "?v=" + encodeURIComponent(meta.version));
    if (!r.ok) throw new Error("site.json HTTP " + r.status);
    const d = await r.json();
    d.items.forEach((a) => {
      a.hasPhoto = !!a.photo;
      a.done = !!a.k;            // 有改寫才進遊戲
      if (S.enrich) S.enrich(a);
    });
    d.version = meta.version;
    cache = d;
    return d;
  }
  // 原文依縣市分檔：打開詳情或高中程度才載入
  const origFiles = {};
  async function loadOrig(a) {
    if (a.orig) return a.orig;
    if (!origFiles[a.of]) {
      const v = cache ? cache.version : "";
      origFiles[a.of] = fetch("/data/orig/" + a.of + ".json?v=" + encodeURIComponent(v)).then((r) => (r.ok ? r.json() : {}));
    }
    const d = await origFiles[a.of];
    a.orig = d[a.id] || "";
    return a.orig;
  }

  // ---- 照片：本站 webp（480 卡片、800 詳情）；沒有照片或載入失敗就畫圖示 ----
  function placeholder(a, cls) {
    const d = document.createElement("div");
    d.className = "ph " + (cls || "");
    d.style.background = (S.color ? S.color(a) : "#8a8f98") + "22";
    d.innerHTML = '<span aria-hidden="true">' + (S.icon ? S.icon(a) : "📍") + "</span>";
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", a.name);
    return d;
  }
  function photo(a, big, cls) {
    if (!a.photo) return placeholder(a, cls);
    const img = new Image();
    img.className = "photo " + (cls || "");
    img.loading = big ? "eager" : "lazy"; // 詳情對話框裡的大圖懶載入會一直不載
    img.decoding = "async";
    img.alt = a.name;
    img.src = "/img/p/" + a.id + "-" + (big ? 800 : 480) + ".webp" + (cache ? "?v=" + encodeURIComponent(cache.version) : "");
    img.onerror = () => img.replaceWith(placeholder(a, cls));
    return img;
  }

  // 線索常含自己的名字，遮起來（各站在 SITE.maskNames 決定要遮哪些）
  function mask(a, text) {
    const names = new Set([a.name].concat(S.maskNames ? S.maskNames(a) : []));
    let t = text;
    [...names].filter((n) => n && n.length >= 2).sort((x, y) => y.length - x.length).forEach((n) => { t = t.split(n).join("○○"); });
    return t;
  }

  // ---- 語音：幼兒園按一下唸出來（瀏覽器內建，沒有中文語音的裝置就安靜，不影響遊戲）----
  function say(text) {
    try {
      if (!window.speechSynthesis) return false;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[○]+/g, "什麼"));
      u.lang = "zh-TW";
      u.rate = 0.9;
      const v = speechSynthesis.getVoices().find((x) => /zh[-_]TW/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function sayBtn(text, label) {
    const b = document.createElement("button");
    b.className = "say";
    b.type = "button";
    b.textContent = "🔈";
    b.setAttribute("aria-label", label || "唸給我聽");
    b.onclick = (ev) => { ev.stopPropagation(); say(text); };
    b.hidden = level() !== "k";
    return b;
  }

  // ---- 小工具 ----
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  // el(html)：HTML 字串轉成「單一」元素。多個頂層元素要自己包一層 <div>
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    if (t.content.children.length > 1) console.warn("App.el：HTML 有多個頂層元素，只會用第一個", html.slice(0, 60));
    return t.content.firstElementChild;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* 存不了就算了 */ } },
  };

  // 自製對話框（不用瀏覽器內建的 alert／confirm）
  function dialog(message, buttons) {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "zdlg";
      d.innerHTML = "<p>" + esc(message) + '</p><div class="row"></div>';
      (buttons || [{ label: "好", value: true, primary: true }]).forEach((b) => {
        const btn = document.createElement("button");
        btn.className = "btn" + (b.primary ? " primary" : "") + (b.danger ? " danger" : "");
        btn.textContent = b.label;
        btn.onclick = () => { d.close(); d.remove(); resolve(b.value); };
        d.lastChild.appendChild(btn);
      });
      document.body.appendChild(d);
      d.showModal();
    });
  }
  const stars = (n) => "⭐".repeat(n) + "☆".repeat(3 - n);

  window.App = { SITE: S, LEVELS, level, setLevel, intro, load, loadOrig, photo, placeholder, mask, say, sayBtn, esc, shuffle, pick, el, store, dialog, stars };
})();
