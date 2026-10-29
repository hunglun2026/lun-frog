/* 幾月遇得到：選月份，看水利署調查在那個月記錄到哪些兩棲類（attrs.months＝各月份的紀錄筆數）。
   卡片上的 12 格月份條：深色＝紀錄多（達到這一種最多月份的一半以上）、淺色＝有紀錄、灰色＝沒有紀錄。
   遊戲「猜猜哪個季節最常遇到」：四季各三個月加總，最多的季節是答案；兩季一樣多或紀錄少於 20 筆的不出題，用 core/quiz.js。
   注意：紀錄多少也跟調查人員哪幾個月去調查有關，畫面上要講清楚。 */
App.boot(function (data) {
  const { esc, el, shuffle } = App;
  const S = App.SITE;
  const root = document.getElementById("root");
  const SEASONS = [
    { id: "春", months: [3, 4, 5], emoji: "🌷" }, { id: "夏", months: [6, 7, 8], emoji: "☀️" },
    { id: "秋", months: [9, 10, 11], emoji: "🍁" }, { id: "冬", months: [12, 1, 2], emoji: "⛄" },
  ];
  let month = new Date().getMonth() + 1;
  if (/^#m=\d+$/.test(location.hash)) month = Math.min(12, Math.max(1, +location.hash.slice(3)));

  const lvOf = (a, n) => (!n ? 0 : n * 2 >= Math.max(...a.months) ? 2 : 1);
  const strip = (a) => '<span class="mstrip" aria-hidden="true">' + a.months.map((n, i) =>
    '<i class="l' + lvOf(a, n) + (i + 1 === month ? " now" : "") + '" title="' + S.MONTHS[i] + " " + n + ' 筆"></i>').join("") + "</span>";
  function card(a) {
    const n = a.months[month - 1];
    const tag = lvOf(a, n) === 2 ? '<span class="bl full">🐸 紀錄多</span>' : '<span class="bl some">🌱 有紀錄</span>';
    const c = el('<a class="acard" href="/frogs#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b>" + tag +
      "<small>" + month + " 月 " + n + " 筆</small>" + strip(a) + "</div></a>");
    c.prepend(App.photo(a));
    return c;
  }
  function draw() {
    history.replaceState(null, "", "#m=" + month);
    const now = data.items.filter((a) => a.months[month - 1] > 0).sort((x, y) => y.months[month - 1] - x.months[month - 1]);
    const many = now.filter((a) => lvOf(a, a.months[month - 1]) === 2).length;
    const total = now.reduce((s, a) => s + a.months[month - 1], 0);
    root.replaceChildren(el(
      '<div><div class="months" role="group" aria-label="選月份">' + S.MONTHS.map((m, i) =>
        '<button class="chip" data-m="' + (i + 1) + '" aria-pressed="' + (i + 1 === month) + '">' + m + "</button>").join("") + "</div>" +
      '<p class="lead" aria-live="polite"><b>' + month + " 月</b>，水利署的河川調查記錄到 " + now.length + " 種兩棲類，共 " + total.toLocaleString() +
      " 筆紀錄；其中 " + many + " 種在這個月的紀錄特別多。</p>" +
      '<div class="grid" id="sgrid"></div>' +
      '<p class="legend">月份條：<span class="mstrip"><i class="l2"></i></span> 紀錄多　<span class="mstrip"><i class="l1"></i></span> 有紀錄　<span class="mstrip"><i class="l0"></i></span> 沒有紀錄</p>' +
      '<div class="panel"><h2 style="margin-top:0">🎯 猜猜哪個季節最常遇到</h2><p>看名字，猜水利署在哪個季節記錄到牠最多次。</p>' +
      '<p><button class="btn primary big" id="play">開始（8 題）</button></p></div>' +
      '<p class="credit">資料：經濟部水利署「兩棲類調查資料」，1995～2019 年的河川情勢調查。紀錄多少也跟調查人員哪幾個月去調查有關，' +
      "沒有紀錄不代表那個月一定找不到。日期只寫到季節的紀錄不算在月份裡。</p></div>"));
    root.querySelector("#sgrid").replaceChildren(...now.map(card));
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { month = +b.dataset.m; draw(); }));
    root.querySelector("#play").onclick = () => Quiz.run(root, { key: "season", title: "猜猜哪個季節最常遇到", rounds: rounds(8), onAgain: draw });
  }

  // 每種的「主要季節」：三個月紀錄加總最多的季節；並列或紀錄太少就不出題
  const sum = (a, s) => s.months.reduce((t, m) => t + a.months[m - 1], 0);
  function seasonOf(a) {
    if (a.records < 20) return null;
    const score = SEASONS.map((s) => sum(a, s));
    const top = Math.max(...score);
    return score.filter((x) => x === top).length === 1 ? SEASONS[score.indexOf(top)] : null;
  }
  function rounds(n) {
    const choices = App.LEVELS[App.level()].choices;
    const pool = data.items.filter((a) => a.done && seasonOf(a));
    return shuffle(pool).slice(0, n).map((a) => {
      const s = seasonOf(a);
      const others = shuffle(SEASONS.filter((x) => x !== s)).slice(0, choices - 1);
      return {
        item: a, noPic: !a.hasPhoto, prompt: "<b>" + esc(a.name) + "</b> 在哪個季節被記錄到最多次？",
        options: shuffle([s].concat(others)).map((x) => ({ id: x.id, label: x.emoji + " " + x.id + "天", sub: x.months.join("、") + " 月" })),
        answer: s.id,
        explain: esc(a.name) + "在" + s.id + "天（" + s.months.join("、") + " 月）共有 " + sum(a, s) + " 筆紀錄，四季裡最多。",
      };
    });
  }
  draw();
});
