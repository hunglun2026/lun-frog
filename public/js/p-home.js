/* 首頁：引導入口（身分 → 年級 → 推薦工具）、數字跳動、捲到才浮現、今天的兩棲類。
   引導入口沿用故宮與海洋探險家；樣式在 /css/base.css 的「首頁」段。 */
(function () {
  "use strict";
  const { esc } = App;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 引導入口：身分記在這台裝置，程度就是全站程度（App.setLevel） ----
  const R = (href, ico, name, why) => ({ href, ico, name, why });
  const RECS = {
    student: {
      e: [R("/frogs", "📖", "兩棲小百科", "有注音，挑一種最喜歡的蛙"), R("/season", "📅", "幾月遇得到", "看看這個月記錄到哪些蛙"), R("/map", "🗺️", "溪流地圖", "找找你家附近的溪流")],
      j: [R("/classify", "🧩", "蛙蛙分類", "認識蛙的家族"), R("/season", "📅", "幾月遇得到", "猜猜哪個季節最常遇到"), R("/frogs", "📖", "兩棲小百科", "挑兩種比一比")],
      s: [R("/classify", "🧩", "蛙蛙分類", "誰的紀錄比較多？還有 60 秒挑戰"), R("/map", "🗺️", "溪流地圖", "比較不同流域記錄到的種類"), R("/frogs", "📖", "兩棲小百科", "可以展開讀調查資料")],
    },
    teacher: {
      e: [R("/teacher", "📝", "學習單", "選科或流域，一鍵產生"), R("/frogs", "📖", "兩棲小百科", "投影給全班看照片")],
      j: [R("/classify", "🧩", "蛙蛙分類", "自然課認識兩棲類的家族"), R("/teacher", "📝", "學習單", "依科或流域產生學習單"), R("/map", "🗺️", "溪流地圖", "配合鄉土課找家鄉的溪流")],
      s: [R("/map", "🗺️", "溪流地圖", "用真實調查資料討論分布"), R("/teacher", "📝", "學習單", "白話介紹加探究題"), R("/season", "📅", "幾月遇得到", "看月份紀錄討論季節")],
    },
  };
  const WHO = { student: "學生", teacher: "老師" };
  const guide = document.getElementById("start");
  const steps = [...guide.querySelectorAll(".g-step")];
  let who = App.store.get("guide", null);
  if (!WHO[who]) who = null;
  const show = (name) => steps.forEach((s) => (s.hidden = s.dataset.step !== name));
  function done() {
    const lv = App.level();
    document.getElementById("g-who").textContent = WHO[who] + "・" + App.LEVELS[lv].name;
    document.getElementById("g-recs").innerHTML = RECS[who][lv].map((r) =>
      '<a class="tool" href="' + r.href + '"><div class="ico">' + r.ico + "</div><h3>" + esc(r.name) + '</h3><span class="why">' + esc(r.why) + "</span></a>").join("");
    show("done");
  }
  guide.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => {
    who = b.dataset.who;
    App.store.set("guide", who);
    document.getElementById("g-lvq").textContent = who === "teacher" ? "你教哪個年級？" : "你幾年級？";
    guide.querySelectorAll("[data-lv]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.lv === App.level())));
    show("lv");
  }));
  guide.querySelectorAll("[data-lv]").forEach((b) => (b.onclick = () => {
    App.setLevel(b.dataset.lv);
    const sel = document.getElementById("lvl");
    if (sel) sel.value = b.dataset.lv; // 頁首的程度選單跟著換
    done();
  }));
  guide.querySelector("[data-back]").onclick = () => show("who");
  guide.querySelector("[data-reset]").onclick = () => { who = null; App.store.set("guide", null); show("who"); };
  document.addEventListener("app-level", () => { if (who && !guide.querySelector('[data-step="done"]').hidden) done(); });
  if (who) done();

  // ---- 捲到才浮現 ----
  const io = "IntersectionObserver" in window && !reduce
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } }), { threshold: 0.15 })
    : null;
  document.querySelectorAll(".w-reveal").forEach((x) => (io ? io.observe(x) : x.classList.add("in-view")));

  // ---- 數字跳動＋今天的兩棲類（要等資料）----
  function countUp(elm, to) {
    if (reduce) { elm.textContent = to.toLocaleString(); return; }
    const t0 = performance.now(), dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      elm.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  App.boot(function (data) {
    const items = data.items;
    const nums = { count: items.length, records: items.reduce((s, a) => s + a.records, 0),
      basins: new Set(items.flatMap((a) => a.basins)).size, families: new Set(items.map((a) => a.family)).size };
    document.querySelectorAll("[data-w]").forEach((e) => countUp(e, nums[e.dataset.w] || 0));
    const pool = items.filter((a) => a.done && a.hasPhoto);
    const today = App.shuffle(pool).slice(0, 8);
    document.getElementById("today").replaceChildren(...today.map((a) => {
      const c = App.el('<a class="acard" href="/frogs#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b><small>" +
        a.familyInfo.emoji + " " + esc(a.family) + "・" + a.records + " 筆紀錄</small></div></a>");
      c.prepend(App.photo(a));
      return c;
    }));
  });
})();
