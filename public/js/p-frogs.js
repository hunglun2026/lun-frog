/* 兩棲小百科：搜尋、篩選（科、常見程度、流域）、詳細介紹對話框（網址 #id 可直接開啟）、比一比。
   介紹文字依年級切換：低年級一句話＋白話段（有注音）、中年級白話段、高年級白話段＋可展開調查資料整理。
   打開詳細介紹＝在探險護照蓋章（progress.js）。月份長條是水利署調查各月份的紀錄筆數。 */
App.boot(function (data) {
  const { esc, el, photo } = App;
  const S = App.SITE;
  const all = data.items;
  const state = { q: "", family: "", common: "", basin: "" };
  const grid = document.getElementById("grid");
  const dlg = document.getElementById("dlg");
  const body = document.getElementById("dlg-body");

  // ---- 篩選 ----
  const count = (f) => all.filter(f).length;
  const chipRow = (key, label, opts) => {
    const row = el('<div class="chips"><span class="lab">' + label + "</span></div>");
    opts.forEach(([val, text]) => {
      const b = el('<button class="chip" aria-pressed="false">' + esc(text) + "</button>");
      b.dataset.v = val;
      b.onclick = () => {
        state[key] = state[key] === val ? "" : val;
        row.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === state[key])));
        render();
      };
      row.appendChild(b);
    });
    return row;
  };
  const filters = document.getElementById("filters");
  const families = Object.keys(S.FAMILIES).filter((f) => count((a) => a.family === f));
  filters.appendChild(chipRow("family", "科", families.map((f) => [f, S.FAMILIES[f].emoji + " " + f + "（" + count((a) => a.family === f) + "）"])));
  filters.appendChild(chipRow("common", "常見程度", S.COMMON.map((c) => [c.id, c.emoji + " " + c.id + "（" + count((a) => a.common === c) + "）"])));
  const basins = [...new Set(all.flatMap((a) => a.basins))].sort((x, y) => count((a) => a.basins.includes(y)) - count((a) => a.basins.includes(x)));
  const srow = el('<div class="chips nokid"><span class="lab">更多</span>' +
    '<select class="inline" id="basin" aria-label="選流域"><option value="">全部流域</option>' +
    basins.map((b) => '<option value="' + esc(b) + '">' + esc(b) + "流域（" + count((a) => a.basins.includes(b)) + " 種）</option>").join("") + "</select></div>");
  filters.appendChild(srow);
  srow.querySelector("#basin").onchange = (e) => { state.basin = e.target.value; render(); };
  document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
  // 從地圖或其他頁點進來：/frogs?basin=花蓮溪&family=樹蛙科
  const qs = new URLSearchParams(location.search);
  if (qs.get("basin")) { state.basin = qs.get("basin"); srow.querySelector("#basin").value = state.basin; }
  ["family", "common"].forEach((k) => {
    if (!qs.get(k)) return;
    state[k] = qs.get(k);
    filters.querySelectorAll(".chip").forEach((c) => { if (c.dataset.v === state[k]) c.setAttribute("aria-pressed", "true"); });
  });

  function match(a) {
    if (state.family && a.family !== state.family) return false;
    if (state.common && a.common.id !== state.common) return false;
    if (state.basin && !a.basins.includes(state.basin)) return false;
    if (state.q && !(a.name + a.family + a.latin + a.oldLatin.join(" ")).toLowerCase().includes(state.q.toLowerCase())) return false;
    return true;
  }
  function render() {
    const list = all.filter(match).sort((x, y) => (y.hasPhoto - x.hasPhoto) || (y.records - x.records));
    document.getElementById("count").textContent = list.length ? "找到 " + list.length + " 種兩棲類" : "找不到，換個條件試試看。";
    grid.replaceChildren(...list.map(card));
  }
  document.addEventListener("app-level", render);

  const famBadge = (a) => '<span class="tbadge" style="background:' + a.familyInfo.color + '">' + a.familyInfo.emoji + " " + esc(a.family) + "</span>";
  const comBadge = (a) => '<span class="ubadge">' + a.common.emoji + " " + esc(a.common.id) + "</span>";
  function card(a) {
    const c = el('<button class="acard"><div class="info"><b>' + esc(a.name) + "</b><small>" + esc(a.order + "・" + a.family) + "</small>" +
      '<div class="meta">' + famBadge(a) + comBadge(a) + "</div></div></button>");
    c.prepend(photo(a));
    c.onclick = () => open(a);
    return c;
  }

  // ---- 月份長條：12 個月各幾筆紀錄（高度依這一種最多的月份）----
  function bars(a) {
    const top = Math.max(1, ...a.months);
    return '<div class="mbars" role="img" aria-label="' + esc(a.name + "各月份紀錄筆數：" + a.months.map((n, i) => S.MONTHS[i] + n + "筆").join("、")) + '">' +
      a.months.map((n, i) => '<span class="mb' + (n === top ? " top" : "") + '"><i style="height:' + Math.round((n / top) * 100) + '%"></i><em>' + (i + 1) + "</em></span>").join("") + "</div>";
  }

  // ---- 詳細介紹 ----
  const fact = (title, html) => (html ? '<div class="fact"><h4>' + title + "</h4><p>" + html + "</p></div>" : "");
  const NONE = "（資料沒有寫）";
  function credit(a) {
    if (!a.photo) return "這種兩棲類目前沒有照片。";
    if (a.photo.by === "示意圖") return "示意圖：依資料製作的寫實照片，不是這種兩棲類的真實照片。";
    return "照片：" + esc(a.photo.by) + (a.photo.page ? '　<a href="' + esc(a.photo.page) + '" target="_blank" rel="noopener">看照片出處</a>' : "");
  }
  const source = () => '原始資料：<a href="https://data.gov.tw/dataset/25771" target="_blank" rel="noopener">經濟部水利署「兩棲類調查資料」</a>（政府資料開放授權條款第1版）。' +
    "分級介紹由 AI 依調查資料改寫並經程式查核，有錯請按頁尾「回報內容錯誤」。";
  const basinLinks = (a, n) => a.basins.slice(0, n).map((b, i) =>
    '<a href="/map#b=' + encodeURIComponent(b) + '">' + esc(b) + "</a> " + a.basinN[i] + " 筆").join("、") +
    (a.basins.length > n ? "…等 " + a.basins.length + " 個流域" : "");
  function open(a) {
    history.replaceState(null, "", location.pathname + location.search + "#" + a.id);
    Progress.seen(a.id);
    const lv = App.level();
    const at = a.attrs;
    body.innerHTML =
      '<div class="dlg-bar"><button class="btn" id="add">' + (cmp.includes(a) ? "✔ 已加入比一比" : "➕ 加入比一比") + "</button>" +
      '<button class="btn" id="x">關閉 ✕</button></div>' +
      "<h2 style='margin-top:0'>" + esc(a.name) + ' <span id="say1"></span></h2>' +
      "<p>" + famBadge(a) + " " + comBadge(a) + "</p>" +
      '<div class="gallery big" id="gal"></div><p class="credit">' + credit(a) + "</p>" +
      (a.done ? '<div class="fact intro"><h4>認識我</h4>' + (lv === "e" ? '<p class="one" id="onetext"></p>' : "") + '<p id="introtext"></p></div>' : "") +
      '<div class="facts">' +
        fact("學名", "<i>" + esc(a.latin) + "</i>" + (a.oldLatin.length && lv !== "e" ? "（舊學名 <i>" + a.oldLatin.map(esc).join("、") + "</i>）" : "")) +
        fact("目、科", esc(a.order + "，" + a.family)) +
        fact("調查紀錄", a.records.toLocaleString() + " 筆，" + esc(a.common.id) + "（" + esc(a.common.hint) + "）" +
          (lv !== "e" ? "，" + at.sites + " 個樣點，數量合計 " + at.total.toLocaleString() + " 隻次" : "")) +
        (at.year_from ? fact("調查年份", at.year_from === at.year_to ? at.year_from + " 年" : at.year_from + "～" + at.year_to + " 年") : "") +
        fact("在哪些流域記錄到", basinLinks(a, lv === "e" ? 3 : 8) + '　<a href="/map#s=' + encodeURIComponent(a.id) + '">在地圖上看</a>') +
        '<div class="fact"><h4>每個月的紀錄筆數</h4>' + bars(a) + "</div></div>" +
      (lv === "s" ? '<details class="orig"><summary>看調查資料整理（水利署資料）</summary><p id="origtext">載入中…</p></details>' : "") +
      '<p class="credit">' + source() + "</p>";
    if (a.done) {
      body.querySelector("#introtext").textContent = App.intro(a, lv);
      const one = body.querySelector("#onetext");
      if (one) one.textContent = a.k;
    }
    body.querySelector("#say1").appendChild(App.sayBtn(a.name + "。" + (a.k || ""), "唸出" + a.name));
    body.querySelector("#gal").appendChild(photo(a, true, "xl"));
    body.querySelector("#x").onclick = () => dlg.close();
    body.querySelector("#add").onclick = (e) => { addCmp(a); e.target.textContent = "✔ 已加入比一比"; };
    if (!dlg.open) dlg.showModal();
    body.parentElement.scrollTop = 0;
    const o = body.querySelector("#origtext");
    if (o) App.loadOrig(a).then((t) => { o.textContent = t || NONE; });
  }
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // ---- 比一比：選兩種並排比較 ----
  const cmp = [];
  const bar = document.getElementById("cmpbar");
  const cmpBox = document.getElementById("cmp");
  function addCmp(a) {
    if (cmp.includes(a)) return;
    if (cmp.length >= 2) cmp.shift(); // 只比兩種，加第三種就換掉最早的
    cmp.push(a);
    drawBar();
  }
  function drawBar() {
    bar.hidden = !cmp.length;
    document.body.classList.toggle("has-cmpbar", cmp.length > 0);
    bar.replaceChildren(el("<div><b>比一比：</b>" + cmp.map((a, i) => '<button class="chip" data-i="' + i + '" aria-label="移除 ' + esc(a.name) + '">' + esc(a.name) + " ✕</button>").join(" ") +
      (cmp.length < 2 ? " <small>再選一種兩棲類</small>" : ' <button class="btn primary" id="go-cmp">開始比較 ➜</button>') + "</div>"));
    bar.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { cmp.splice(+b.dataset.i, 1); drawBar(); }));
    const go = bar.querySelector("#go-cmp");
    if (go) go.onclick = () => { dlg.close(); compare(cmp[0], cmp[1]); };
  }
  const topMonth = (a) => { const m = Math.max(...a.months); return m ? S.MONTHS[a.months.indexOf(m)] : NONE; };
  const ROWS = [
    ["科", (a) => a.family || NONE],
    ["紀錄筆數", (a) => a.records.toLocaleString() + " 筆"],
    ["幾個流域", (a) => a.basins.length + " 個"],
    ["紀錄最多的流域", (a) => a.basins[0] || NONE],
    ["紀錄最多的月份", topMonth],
    ["一句話介紹", (a) => a.k || NONE],
  ];
  function compare(a, b) {
    cmpBox.hidden = false;
    cmpBox.replaceChildren(el(
      '<div class="sheet"><h2>🔍 比一比：' + esc(a.name) + " 和 " + esc(b.name) + "</h2>" +
      '<div class="tablewrap"><table class="cmp"><thead><tr><th></th><th scope="col">' + esc(a.name) + '</th><th scope="col">' + esc(b.name) + "</th></tr></thead><tbody>" +
      '<tr><th scope="row">照片</th><td class="p0"></td><td class="p1"></td></tr>' +
      ROWS.map(([label, f]) => {
        const x = f(a), y = f(b);
        return '<tr><th scope="row">' + label + (x === y && x !== NONE ? ' <span class="same">一樣</span>' : "") + "</th><td>" + esc(x) + "</td><td>" + esc(y) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      "<p><b>想一想：</b>為什麼兩種的紀錄筆數差這麼多？牠們常被記錄的月份一樣嗎？</p><p class=\"lines\"></p>" +
      '<p class="noprint"><button class="btn primary" id="cmp-print">列印</button> <button class="btn" id="cmp-close">關閉比較</button></p></div>'
    ));
    cmpBox.querySelector(".p0").appendChild(photo(a));
    cmpBox.querySelector(".p1").appendChild(photo(b));
    cmpBox.querySelector("#cmp-close").onclick = () => { cmpBox.hidden = true; };
    cmpBox.querySelector("#cmp-print").onclick = () => { document.body.classList.add("pcmp"); window.print(); };
    cmpBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  addEventListener("afterprint", () => document.body.classList.remove("pcmp"));

  render();
  const want = decodeURIComponent(location.hash.slice(1));
  const hit = want && all.find((a) => a.id === want);
  if (hit) open(hit);
});
