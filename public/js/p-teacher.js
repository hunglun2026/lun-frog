/* 教師專區：學習單（範圍＝科或流域，依年級出題，可顯示答案）＋搶答計分板（core/board.js）。
   題目只用改寫與調查資料已有的事實：科、流域、月份來自轉接器整理的資料，介紹與線索來自查核過的改寫。 */
App.boot(function (data) {
  const { esc, el, shuffle } = App;
  const S = App.SITE;
  const done = data.items.filter((a) => a.done);

  // ---- 分頁 ----
  document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    document.getElementById("tab-sheet").hidden = t.dataset.tab !== "sheet";
    document.getElementById("tab-board").hidden = t.dataset.tab !== "board";
  }));
  Board.init(document.getElementById("tab-board"));

  // ---- 範圍選單：科、流域（只列有分級介紹的）----
  const scope = document.getElementById("scope");
  const cnt = (f) => done.filter(f).length;
  scope.appendChild(el('<option value="all:">全部（' + done.length + "）</option>"));
  const group = (label, kind, vals, test, ico) => {
    const og = el('<optgroup label="' + label + '"></optgroup>');
    vals.sort((x, y) => cnt((a) => test(a, y)) - cnt((a) => test(a, x)))
      .forEach((v) => og.appendChild(el('<option value="' + kind + ":" + esc(v) + '">' + (ico ? ico(v) + " " : "") + esc(v) + "（" + cnt((a) => test(a, v)) + "）</option>")));
    scope.appendChild(og);
  };
  const TEST = { family: (a, v) => a.family === v, basin: (a, v) => a.basins.includes(v) };
  group("科", "family", Object.keys(S.FAMILIES).filter((f) => cnt((a) => a.family === f)), TEST.family, (f) => S.FAMILIES[f].emoji);
  group("流域（5 種以上）", "basin", [...new Set(done.flatMap((a) => a.basins))].filter((b) => cnt((a) => a.basins.includes(b)) >= 5), TEST.basin);

  // ---- 出題：依年級 ----
  const topMonth = (a) => { const m = Math.max(...a.months); return m ? S.MONTHS[a.months.indexOf(m)] : ""; };
  function questions(a, lv) {
    const qs = [["它屬於哪一科？＿＿＿＿＿＿", a.family], ["水利署在哪個流域記錄到它最多次？＿＿＿＿＿＿", a.basins[0] + "流域"]];
    if (lv !== "e") qs.push(["寫出它的一個特色：", a.c ? a.c[0] : ""]);
    if (lv === "s") qs.push(["它在幾月的紀錄最多？想一想可能的原因。", topMonth(a)]);
    return qs;
  }
  const sheet = document.getElementById("sheet");
  function make() {
    const [kind, val] = scope.value.split(/:(.*)/s);
    const pool = done.filter((a) => kind === "all" || TEST[kind](a, val));
    const pick = shuffle(pool).slice(0, +document.getElementById("n").value);
    const lv = App.level();
    const title = kind === "all" ? "認識臺灣溪流的兩棲類" : kind === "basin" ? "認識" + val + "流域的兩棲類" : "認識" + val;
    sheet.hidden = false;
    sheet.replaceChildren(el('<div><h2 style="margin-top:0">🐸 ' + esc(title) + "（" + App.LEVELS[lv].name + "）</h2>" +
      '<p class="head"><span>班級：</span><span>座號：</span><span>姓名：</span></p></div>'));
    pick.forEach((a, i) => {
      const q = el('<div class="q"><div class="pic"></div><div><p><b>' + (i + 1) + ". " + esc(a.name) + "</b></p>" +
        "<p>" + esc(lv === "e" ? a.k : a.e) + "</p>" +
        questions(a, lv).map(([text, ans]) => "<p>" + esc(text) + '<br><span class="ans" hidden>答：' + esc(ans) + "</span></p>").join("") +
        "</div></div>");
      q.querySelector(".pic").replaceWith(App.photo(a, false));
      sheet.appendChild(q);
    });
    sheet.appendChild(el('<p class="credit">資料來源：經濟部水利署「兩棲類調查資料」（政府資料開放授權條款第1版）；照片來自維基共享資源（作者與授權見兩棲小百科），標「示意圖」的是依資料製作的照片。兩棲探險家 frog.hunglun.com</p>'));
    showKey();
    document.getElementById("print").hidden = false;
  }
  const showKey = () => sheet.querySelectorAll(".ans").forEach((x) => (x.hidden = !document.getElementById("key").checked));
  document.getElementById("make").onclick = make;
  document.getElementById("key").onchange = showKey;
  document.getElementById("print").onclick = () => window.print();
});
