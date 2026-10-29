/* 蛙蛙分類：三種玩法，都用 core/quiz.js 出題，只出有分級介紹的種類。
   1. 認識蛙的家族：看照片和名字選科（科別是資料裡最新登錄的那筆）。樹蛙科、赤蛙科占大多數，出題時其他科先抽。
   2. 誰的紀錄比較多：兩種並排，選水利署調查紀錄筆數比較多的那種（筆數差太少的不出題）。
   3. 家族分類 60 秒挑戰。
   科的說明只寫資料裡數得出來的事（幾種、哪幾種），不寫外形特徵。 */
App.boot(function (data) {
  const { esc, el, shuffle } = App;
  const S = App.SITE;
  const root = document.getElementById("root");
  const pool = data.items.filter((a) => a.done);
  const FAMS = Object.keys(S.FAMILIES).filter((f) => pool.some((a) => a.family === f));
  const BIG = ["樹蛙科", "赤蛙科"];

  // 選項：正確答案＋同數量的其他科（依年級 3 或 4 個）
  function famOptions(a) {
    const n = App.LEVELS[App.level()].choices;
    const others = shuffle(FAMS.filter((f) => f !== a.family)).slice(0, n - 1);
    return shuffle([a.family].concat(others)).map((f) => ({ id: f, label: S.FAMILIES[f].emoji + " " + f }));
  }
  function famItems(n) {
    const small = shuffle(pool.filter((a) => !BIG.includes(a.family)));
    const big = shuffle(pool.filter((a) => BIG.includes(a.family)));
    const out = [];
    while (out.length < n && (small.length || big.length)) {
      // 大約一半出小家族，免得整輪都是樹蛙和赤蛙；種類不夠就重洗再抽（60 秒挑戰要很多題）
      const src = (out.length % 2 === 0 && small.length) || !big.length ? small : big;
      out.push(src.shift());
      if (!small.length && !big.length && out.length < n) {
        small.push(...shuffle(pool.filter((a) => !BIG.includes(a.family))));
        big.push(...shuffle(pool.filter((a) => BIG.includes(a.family))));
      }
    }
    return out;
  }
  function famRounds(n) {
    return famItems(n).map((a) => ({
      item: a, prompt: "<b>" + esc(a.name) + "</b> 是哪一科？",
      options: famOptions(a), answer: a.family,
      explain: esc(a.name) + "屬於" + esc(a.order) + esc(a.family) + "。這個網站的" + esc(a.family) + "有：" +
        pool.filter((x) => x.family === a.family).map((x) => esc(x.name)).join("、") + "。",
    }));
  }
  function moreRounds(n) {
    const pairs = [];
    const list = shuffle(pool);
    for (let i = 0; i < list.length && pairs.length < n * 3; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i], list[j]];
        if (Math.max(a.records, b.records) >= Math.min(a.records, b.records) * 1.5) pairs.push([a, b]);
      }
    }
    return shuffle(pairs).slice(0, n).map(([a, b]) => {
      const win = a.records > b.records ? a : b;
      return {
        item: win, noPic: true, prompt: "水利署調查記錄到哪一種比較多次？",
        options: shuffle([a, b]).map((x) => ({ id: x.id, label: x.familyInfo.emoji + " " + x.name, sub: x.family })),
        answer: win.id,
        explain: esc(a.name) + " " + a.records.toLocaleString() + " 筆，" + esc(b.name) + " " + b.records.toLocaleString() + " 筆。",
      };
    });
  }

  function menu() {
    const cnt = (f) => pool.filter((a) => a.family === f).length;
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">水利署在臺灣的溪流記錄到的兩棲類，分屬 ' + FAMS.length + " 個科：</p>" +
      '<ul class="hints">' + FAMS.map((f) => "<li>" + S.FAMILIES[f].emoji + " <b>" + esc(f) + "</b>（" + cnt(f) + " 種）：" +
        pool.filter((a) => a.family === f).slice(0, 4).map((a) => esc(a.name)).join("、") + (cnt(f) > 4 ? "…" : "") + "</li>").join("") + "</ul>" +
      '<p><button class="btn primary big" id="family">認識蛙的家族（10 題）</button></p>' +
      '<p><button class="btn big" id="more">誰的紀錄比較多（10 題）</button></p>' +
      '<p><button class="btn big" id="timed">家族分類 60 秒挑戰</button></p></div>'));
    root.querySelector("#family").onclick = () => Quiz.run(root, { key: "family", title: "認識蛙的家族", rounds: famRounds(10), onAgain: menu });
    root.querySelector("#more").onclick = () => Quiz.run(root, { key: "more", title: "誰的紀錄比較多", rounds: moreRounds(10), onAgain: menu });
    root.querySelector("#timed").onclick = () => Quiz.run(root, { key: "classify-timed", title: "60 秒挑戰", rounds: famRounds(60), timed: 60, onAgain: menu });
  }
  document.addEventListener("app-level", menu);
  menu();
});
