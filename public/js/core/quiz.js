/* 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
   共用出題引擎：分類、配對類的選擇題都用它。
   Quiz.run(root, { key, title, rounds, onAgain, timed })
   rounds[i] = { item, prompt(html), options:[{id,label,sub,pic}], answer(id), explain(html), say, noPic }
   pic：選項畫成照片（幼兒園「聽名字找照片」）；say：幼兒園自動唸出的題目文字；noPic：題目上方不放照片
   timed：秒數。有給就是限時模式（答完自動下一題、連續答對有加分），rounds 要準備多一點。
   Quiz.review(items)：完成畫面的「答錯的」清單，其他遊戲也共用。items = [{ item, answer }]
   Quiz.result(cfg)：完成畫面（星星、分數、最佳紀錄、再玩一次），其他遊戲也共用。 */
(function () {
  "use strict";
  const { esc, el } = App;
  const S = App.SITE;

  const best = (key) => +App.store.get("best-" + key, 0) || 0;
  const saveBest = (key, v, lower) => {
    const b = best(key);
    if (!b || (lower ? v < b : v > b)) App.store.set("best-" + key, v);
  };

  // 答錯的：縮圖＋正確答案＋看介紹，讓學生下課前再看一次
  function review(items) {
    if (!items.length) return el('<p class="lead">全部答對，沒有要複習的！</p>');
    const box = el('<div class="review"><h3>再看一次答錯的</h3><div class="rv-list"></div></div>');
    const list = box.querySelector(".rv-list");
    items.forEach((it) => {
      const row = el('<a class="rv" href="' + S.detailUrl + encodeURIComponent(it.item.id) + '" target="_blank" rel="noopener">' +
        '<span class="rv-pic"></span><span><b>' + esc(it.item.name) + "</b><br><small>正確答案：" + esc(it.answer) + "</small><br><small>看介紹 ➜</small></span></a>");
      row.querySelector(".rv-pic").replaceWith(App.photo(it.item));
      list.appendChild(row);
    });
    return box;
  }

  // 完成畫面：stars 0～3、score 文字、extra 額外說明 html、wrongs 複習清單、onAgain、onRedo
  function result(root, r) {
    if (r.key) Progress.stars(r.key, r.stars);
    if (r.stars === 3) Fx.confetti();
    const box = el(
      '<div class="stage"><h2>' + esc(r.title) + "</h2>" +
      '<div class="stars" aria-label="' + r.stars + ' 顆星">' + App.stars(r.stars) + "</div>" +
      (r.score != null ? '<div class="score">' + esc(r.score) + "</div>" : "") +
      "<p>" + (r.stars === 3 ? "太厲害了，你是" + esc(S.champion || "小博士") + "！" : r.stars === 2 ? "很不錯喔，再玩一次可以拿到三顆星！" : "沒關係，多看幾次就記住了。") + "</p>" +
      (r.extra || "") + '<div id="rv"></div><p><button class="btn primary big" id="again">再玩一次</button> ' +
      (r.wrongs && r.wrongs.length && r.onRedo ? '<button class="btn big" id="redo">只練錯的（' + r.wrongs.length + " 題）</button> " : "") +
      '<a class="btn big" href="/passport">看我的護照</a></p></div>'
    );
    if (r.wrongs) box.querySelector("#rv").appendChild(review(r.wrongs));
    root.replaceChildren(box);
    root.querySelector("#again").onclick = r.onAgain;
    const redo = root.querySelector("#redo");
    if (redo) redo.onclick = r.onRedo;
  }

  // 星星：一般模式看答對比例；限時模式看答對幾題
  const starsOf = (cfg, right, total) => cfg.timed
    ? (right >= 12 ? 3 : right >= 7 ? 2 : right > 0 ? 1 : 0)
    : (right / total >= 0.9 ? 3 : right / total >= 0.6 ? 2 : right > 0 ? 1 : 0);

  function run(root, cfg) {
    const rounds = cfg.rounds;
    let i = 0, score = 0, right = 0, combo = 0, left = cfg.timed || 0, timer = null, over = false;
    const wrongs = [];
    const label = (r) => r.options.find((o) => o.id === r.answer).label;

    function show() {
      const r = rounds[i];
      root.replaceChildren();
      const head = cfg.timed
        ? '<p class="timed"><span class="clock" id="clock">⏱️ ' + left + ' 秒</span>　⭐ ' + score + " 分</p>"
        : '<div class="bar"><i style="width:' + (i / rounds.length) * 100 + '%"></i></div><p>第 ' + (i + 1) + " / " + rounds.length + " 題　⭐ " + score + " 分</p>";
      const stage = el(
        '<div class="stage">' + head + (combo >= 2 ? '<p class="combo">🔥 連續答對 ' + combo + " 題！</p>" : "") +
        '<div id="pic"></div><h2 style="margin:.4em 0">' + r.prompt + '</h2><div class="opts" id="opts"></div>' +
        '<div class="feedback" id="fb" role="status" aria-live="polite"></div><div id="nx"></div></div>'
      );
      if (!r.noPic) stage.querySelector("#pic").appendChild(App.photo(r.item));
      if (r.say) {
        stage.querySelector("h2").appendChild(App.sayBtn(r.say, "再唸一次題目"));
        if (App.level() === "k") App.say(r.say);
      }
      const opts = stage.querySelector("#opts");
      if (r.options.some((o) => o.pic)) opts.classList.add("picopts");
      r.options.forEach((o) => {
        const b = el('<button class="opt">' + (o.pic ? "" : esc(o.label)) + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</button>");
        if (o.pic) { b.appendChild(App.photo(o.pic)); b.setAttribute("aria-label", o.label); }
        b.dataset.id = o.id;
        b.onclick = () => answer(o.id, b, stage, r);
        opts.appendChild(b);
      });
      root.appendChild(stage);
    }

    function answer(id, btn, stage, r) {
      if (over) return;
      const ok = id === r.answer;
      combo = ok ? combo + 1 : 0;
      // 限時模式連續答對 3 題以上，每題多 5 分
      if (ok) { right++; score += 10 + (cfg.timed && combo >= 3 ? 5 : 0); Fx.right(); }
      else { Fx.wrong(); wrongs.push({ item: r.item, answer: label(r), round: r }); }
      stage.querySelectorAll(".opt").forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === r.answer) b.classList.add("right");
      });
      if (!ok) btn.classList.add("wrong");
      const fb = stage.querySelector("#fb");
      fb.className = "feedback " + (ok ? "ok" : "no");
      const last = i === rounds.length - 1;
      if (cfg.timed) {
        fb.innerHTML = ok ? "答對了！🎉" + (combo >= 3 ? " 連續加分 +5" : "") : "答案是：" + esc(label(r));
        setTimeout(() => { if (over) return; i++; last ? finish() : show(); }, ok ? 600 : 1300);
        return;
      }
      fb.innerHTML = (ok ? "答對了！🎉 " : "差一點點，再記一下～ ") + (r.explain || "");
      if (App.level() === "k") App.say(ok ? "答對了！" : "答案是" + label(r));
      const next = el('<button class="btn primary big">' + (last ? "看成績 🏆" : "下一題 ➜") + "</button>");
      next.onclick = () => { i++; last ? finish() : show(); };
      stage.querySelector("#nx").appendChild(next);
      next.focus();
    }

    function finish() {
      over = true;
      clearInterval(timer);
      const total = cfg.timed ? 0 : rounds.length * 10;
      const prev = cfg.key ? best(cfg.key) : 0;
      if (cfg.key) saveBest(cfg.key, score);
      result(root, {
        key: cfg.key, title: cfg.title + (cfg.timed && left <= 0 ? " 時間到！" : " 完成！"),
        stars: starsOf(cfg, right, rounds.length), score: score + (total ? " / " + total : " 分"),
        extra: (cfg.timed ? "<p>答對 " + right + " 題，答錯 " + wrongs.length + " 題。</p>" : "") +
          (prev && score > prev ? "<p>🎊 打破自己的紀錄！（上次 " + prev + " 分）</p>" : prev ? "<p>你的最佳紀錄：" + Math.max(prev, score) + " 分</p>" : ""),
        wrongs, onAgain: cfg.onAgain,
        // 複習不限時、不記錄，只是讓學生把錯的再答一次
        onRedo: () => run(root, { title: cfg.title + "・複習", rounds: App.shuffle(wrongs.map((w) => w.round)), onAgain: cfg.onAgain }),
      });
    }

    if (cfg.timed) {
      timer = setInterval(() => {
        left--;
        const c = document.getElementById("clock");
        if (c) { c.textContent = "⏱️ " + left + " 秒"; c.classList.toggle("hurry", left <= 10); }
        if (left <= 5 && left > 0) Fx.tick();
        if (left <= 0) { Fx.ding(); finish(); }
      }, 1000);
    }
    show();
  }
  window.Quiz = { run, review, result, best, saveBest };
})();
