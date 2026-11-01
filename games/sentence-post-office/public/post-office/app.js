import { ROUTES, STAMPS, missionsFor, ALL_MISSIONS } from "./curriculum.js";
import {
  STORAGE_KEY,
  loadSave,
  completeMission,
  acceptInput,
  initialText,
} from "./engine.js";
import { icon, animal, landscape, train } from "./art.js";
import { PostAudio } from "./sound.js";

const $ = (selector) => document.querySelector(selector);
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let save;
try {
  save = loadSave(localStorage.getItem(STORAGE_KEY));
} catch {
  save = loadSave(null);
}
let screen = "home",
  mission = null,
  attempt = null,
  storageFailed = false;
let previousStampCount = 0;
const audio = new PostAudio(save);
const app = $("#app"),
  modal = $("#modal");
const route = () => ROUTES.find((item) => item.id === save.route);
const completedIn = (id) =>
  save.completed.filter((key) => key.startsWith(`${id}-`)).length;
const stampCount = () => Math.floor(save.completed.length / 2);
const routeNames = {
  capital: "Big A",
  space: "Space Bridge",
  punctuation: "Stamp Shop",
  letters: "Mail Run",
};
const routeSymbols = {
  capital: "a → A",
  space: "word ␣ word",
  punctuation: ".  ?  !",
  letters: "Aa ␣ .",
};
const endings = {
  sun: "A sunny hello!",
  jump: "Ready, set, jump!",
  gift: "A surprise for you!",
  song: "Time for a song!",
  hat: "A brand new hat!",
  moon: "Good night, little friend!",
  stars: "Look at the stars!",
  water: "Splash! Off we go!",
  cake: "Time for a treat!",
  flowers: "Flowers for a friend!",
};
let blockedTimer,
  lastWrongSound = 0;
function keyPicture(char) {
  if (!char) return `${icon("check")}<span>Ready!</span>`;
  if (char === " ") return '<kbd class="space-key">␣</kbd><span>SPACE</span>';
  if (/^[A-Z]$/.test(char))
    return `<kbd class="shift-key">⇧</kbd><span>+</span><kbd>${escape(char)}</kbd>`;
  if (char === "?" || char === "!")
    return `<kbd class="shift-key">⇧</kbd><span>+</span><kbd>${char === "?" ? "/" : "1"}</kbd><span class="key-result">→ ${char}</span>`;
  return `<kbd>${escape(char)}</kbd>`;
}
function nextGuide() {
  const char = mission.target[attempt.text.length] || "";
  return `<span class="hint-avatar">${animal(route().animal)}</span><div class="picture-guide">${keyPicture(char)}</div>`;
}

function persist() {
  audio.sync(save);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    storageFailed = false;
  } catch {
    if (!storageFailed) toast("浏览器暂时不能存档，这次仍可以继续玩。");
    storageFailed = true;
  }
}
function checkpoint() {
  save.draft = {
    id: mission.id,
    text: $("#paper").value,
    checks: attempt.checks,
    hints: attempt.hints,
    blocked: attempt.blocked,
    mistakes: [...attempt.mistakes],
  };
  persist();
}
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
async function activateAudio() {
  await audio.unlock();
  if (!document.hidden) audio.startMusic();
}
document.addEventListener("pointerdown", activateAudio, { once: true });
document.addEventListener("keydown", activateAudio, { once: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) audio.pause();
  else if (audio.context) activateAudio();
});
window.addEventListener("pagehide", () => audio.pause());

function header() {
  return `<header class="topbar"><div class="topbar-left"><a class="series-link" href="../" aria-label="返回系列入口">${icon("grid")}<span>GAMES</span></a><span class="header-divider"></span><button class="wordmark" data-action="home" aria-label="邮局首页">${icon("mail")}<span>POST OFFICE<small>LITTLE LETTER CLUB · 02</small></span></button></div><div class="header-actions"><span class="progress-pill" title="已送达的不同信件">${icon("mail")}<b>${save.completed.length}</b><span>/ 32</span></span><button class="tool album-tool" data-action="album" aria-label="集邮册 ${stampCount()}枚">${icon("stamp")}<span>Stamps</span><b>${stampCount()}</b></button><button class="tool sound-tool" data-action="sound" aria-label="声音：${save.sound ? "开" : "关"}" aria-pressed="${save.sound}">${icon(save.sound ? "sound" : "mute")}</button><button class="tool parent-tool" data-action="parent" aria-label="家长">${icon("parent")}<span>家长</span></button></div></header>`;
}

function home() {
  const resume = save.draft || save.completed.length > 0;
  return `<main class="home-screen"><section class="home-world">${landscape("home-landscape")}<div class="hero-copy"><div class="eyebrow"><span></span>LITTLE LETTER CLUB · 02</div><h1>Little letters.<br>Big <span>adventures.</span></h1><div class="hero-rules"><span>a → A</span><span>␣</span><span>. ? !</span></div><button class="primary hero-start" data-action="start">${icon("mail")}<span>${resume ? "Continue" : "Play"}</span>${icon("arrow")}</button><span class="hero-note">One little key. One big smile.</span></div><div class="home-train-area">${train("waiting")}<div class="floating-letter">${icon("mail")}</div><div class="scene-caption">NEXT STOP · HAPPY MAIL <span>→</span></div></div><div class="postmark-decoration">HAPPY MAIL<br><span>POST OFFICE</span><b>✦</b></div></section><section class="route-station" aria-label="选择练习区"><div class="station-heading"><h2>Where shall we go?</h2><span>PICK A PATH</span></div><div class="route-list">${ROUTES.map((item, i) => `<button class="route-ticket" style="--route:${item.color}" data-route="${item.id}" data-testid="route-${item.id}"><div class="ticket-icon">${icon(item.icon)}</div><div class="ticket-copy"><span class="ticket-number">PATH 0${i + 1}</span><strong>${routeNames[item.id]}</strong><span class="ticket-description">${routeSymbols[item.id]} <i>·</i> ${completedIn(item.id)} / 8</span></div>${icon("arrow", "ticket-arrow")}<span class="ticket-progress" style="--progress:${(completedIn(item.id) / 8) * 100}%"></span></button>`).join("")}</div></section><footer class="home-footer"><span>Made for little hands.</span><span class="keyboard-note">A real keyboard works best.</span><button data-action="parent">存档与家长设置 ${icon("arrow")}</button></footer></main>`;
}

function reference() {
  return [...mission.target]
    .map(
      (char, index) =>
        `<span class="reference-letter ${index < attempt.text.length ? "typed" : ""} ${index === attempt.text.length ? "is-current" : ""} ${char === " " ? "reference-space" : ""}" ${char === " " ? 'aria-label="space"' : ""}>${char === " " ? "<span>␣</span>" : escape(char)}</span>`,
    )
    .join("");
}
function game() {
  return `<main class="game-screen route-${save.route}"><div class="route-topline"><button class="subtle back-button" data-action="home" aria-label="Back to post office">${icon("back")}${icon("home")}</button><div class="route-title" style="--route:${route().color}">${icon(route().icon)}<strong>${routeNames[save.route]}</strong><span>${mission.index + 1} / 8</span></div><div class="mission-dots" aria-label="Choose a letter">${missionsFor(
    save.route,
  )
    .map(
      (item) =>
        `<button data-mission="${item.index}" class="${item.id === mission.id ? "current" : ""} ${save.completed.includes(item.id) ? "done" : ""}" aria-label="Letter ${item.index + 1}${save.completed.includes(item.id) ? ", delivered" : ""}" ${item.id === mission.id ? 'aria-current="step"' : ""}>${save.completed.includes(item.id) ? icon("check") : item.index + 1}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="desk-world" style="--route:${route().color}">${landscape("desk-landscape")}<div class="desk-journey">${icon("mail")}<span class="journey-line"></span>${animal(route().animal)}</div>${train("desk-train")}<div class="recipient">${animal(route().animal)}<span>${icon("mail")}<b>Hi!</b></span></div></div><section class="letter-desk"><div class="letter-meta"><span class="letter-mode">${icon(mission.repair ? "help" : route().icon)}<b>${mission.repair ? "FIX & SEND" : routeSymbols[save.route]}</b></span><div class="letter-progress"><span style="width:${(attempt.text.length / mission.target.length) * 100}%"></span></div><span class="postal-code">LETTER ${String(mission.index + 1).padStart(2, "0")} / 08</span></div><div class="reference-line"><span class="reference-label">${icon("mail")}</span><p class="reference" lang="en" aria-label="${escape(mission.target)}">${reference()}</p></div><label class="paper-label" for="paper">${icon("arrow")} YOUR LETTER</label><div class="paper-wrap"><textarea id="paper" aria-label="我的信纸" rows="1" maxlength="120" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" enterkeyhint="done" placeholder="…" lang="en">${escape(attempt.text)}</textarea><span class="paper-corner key-target"></span></div><div class="letter-bottom"><div class="rule-checks" aria-label="Capital, space, punctuation"><span data-rule="capital">${icon("flag")}<b>A</b></span><span data-rule="space">${icon("bridge")}<b>␣</b></span><span data-rule="punctuation">${icon("stamp")}<b>. ? !</b></span></div><div class="typed-count">${attempt.text.length} <span>/ ${mission.target.length}</span></div></div></section><div class="desk-controls"><div class="feedback" role="status" aria-live="polite">${nextGuide()}</div><div class="action-buttons"><button class="help-button" data-action="hint" aria-label="Help">${icon("help")}<span>Help</span></button><button class="primary send-button" data-action="send" aria-label="Send">${icon("mail")}Send${icon("arrow")}</button></div></div></main>`;
}

function render() {
  clearTimeout(blockedTimer);
  app.innerHTML =
    header() +
    (screen === "home" ? home() : screen === "game" ? game() : success());
  if (screen === "game") {
    const paper = $("#paper");
    paper.addEventListener("input", edit);
    paper.addEventListener("keydown", (event) => {
      // The accepted prefix is already correct: physical typing always continues
      // at its end, even if a click or focus restoration moved the native caret.
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        (event.key.length === 1 ||
          event.key === "Backspace" ||
          event.key === "Delete")
      )
        paper.setSelectionRange(paper.value.length, paper.value.length);
      if (
        event.key === "Enter" &&
        !event.isComposing &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        if (!event.repeat && paper.value === mission.target) send();
      }
    });
    updateDesk();
    // Focus before returning from render. A delayed frame could otherwise move
    // a native replacement/paste selection between selection and insertion.
    if (!modal.open) {
      paper.focus({ preventScroll: true });
      paper.setSelectionRange(paper.value.length, paper.value.length);
    }
  }
  if (screen === "success") focusDeliveryAction();
}

function focusDeliveryAction() {
  $(".delivery-actions .primary").focus({ preventScroll: true });
}

function start(routeId, index, resume = false) {
  save.route = routeId;
  const missions = missionsFor(routeId);
  mission =
    missions[
      index ?? missions.findIndex((item) => !save.completed.includes(item.id))
    ] || missions[0];
  save.index = mission.index;
  const draft = resume && save.draft?.id === mission.id ? save.draft : null;
  attempt = draft
    ? {
        text: acceptInput("", draft.text, mission.target).text,
        checks: draft.checks,
        hints: draft.hints,
        blocked: draft.blocked || 0,
        mistakes: new Set(draft.mistakes),
      }
    : {
        text: initialText(mission),
        checks: 0,
        hints: 0,
        blocked: 0,
        mistakes: new Set(),
      };
  screen = "game";
  render();
  checkpoint();
}

function showBlocked(result) {
  attempt.blocked++;
  const expected = result.expected;
  const kind =
    expected === " "
      ? "space"
      : /[.!?]/.test(expected) && expected
        ? "punctuation"
        : result.index === 0 && /^[A-Z]$/.test(expected)
          ? "capital"
          : "spelling";
  attempt.mistakes.add(kind);
  const picture =
    kind === "capital"
      ? `<span class="case-demo"><del>${escape(result.received || expected.toLowerCase())}</del><span>→</span><b>${escape(expected)}</b></span>`
      : kind === "space"
        ? `<span class="word-bridge-demo"><span>${escape(mission.target.slice(0, result.index).split(" ").at(-1))}</span>${icon("bridge")}<span>${escape(
            mission.target
              .slice(result.index + 1)
              .split(" ")[0]
              .replace(/[.!?]/g, ""),
          )}</span></span>`
        : kind === "punctuation"
          ? `<span class="punctuation-demo">${icon("stamp")}<b>${escape(expected)}</b></span>`
          : `<span class="case-demo"><del>${escape(result.received)}</del><span>→</span><b>${escape(expected)}</b></span>`;
  $(".feedback").className = "feedback blocked-feedback";
  $(".feedback").innerHTML =
    `<span class="hint-avatar">${animal(route().animal)}</span>${picture}<span class="error-key-guide">${keyPicture(expected)}</span>`;
  const paperWrap = $(".paper-wrap");
  paperWrap.classList.remove("shake");
  void paperWrap.offsetWidth;
  paperWrap.classList.add("shake", "blocked-error");
  clearTimeout(blockedTimer);
  blockedTimer = setTimeout(() => paperWrap.classList.remove("shake"), 450);
  if (performance.now() - lastWrongSound > 160) {
    audio.play("wrong");
    lastWrongSound = performance.now();
  }
}
function edit(event) {
  const input = event.target;
  const result = acceptInput(attempt.text, input.value, mission.target);
  if (result.blocked && result.index < attempt.text.length) {
    result.index = attempt.text.length;
    result.expected = mission.target[result.index] || "";
  }
  const oldText = attempt.text;
  attempt.text = result.text;
  input.value = result.text;
  input.setSelectionRange(result.text.length, result.text.length);
  if (result.blocked) showBlocked(result);
  else {
    clearTimeout(blockedTimer);
    $(".paper-wrap").classList.remove("shake", "blocked-error");
    const inserted = result.text.slice(oldText.length);
    if (result.text.length < oldText.length) audio.play("erase");
    else if (/[.!?]/.test(inserted)) audio.play("punctuation");
    else if (inserted.includes(" ")) audio.play("space");
    else if (result.text[0] !== oldText[0] && /^[A-Z]/.test(result.text))
      audio.play("capital");
    else if (result.text !== oldText) audio.play("letter");
    $(".feedback").className = "feedback";
    $(".feedback").innerHTML = nextGuide();
    if (inserted === " ") {
      const engine = $(".desk-train");
      engine.classList.remove("bridge-pop");
      void engine.offsetWidth;
      engine.classList.add("bridge-pop");
    }
  }
  updateDesk();
  checkpoint();
}

function updateDesk() {
  if (screen !== "game") return;
  const text = $("#paper").value;
  const lettersOnly = (value) => value.replace(/[^a-z]/gi, "").toLowerCase();
  const statuses = {
    capital: text[0] === mission.target[0],
    space:
      lettersOnly(text) === lettersOnly(mission.target) &&
      text.replace(/[^a-z ]/gi, "").toLowerCase() ===
        mission.target.replace(/[^a-z ]/gi, "").toLowerCase(),
    punctuation:
      text.at(-1) === mission.target.at(-1) &&
      (text.match(/[.!?]/g) || []).length === 1,
  };
  for (const key of Object.keys(statuses))
    $(`[data-rule="${key}"]`).classList.toggle("ready", statuses[key]);
  $(".desk-train").classList.toggle("flag-up", statuses.capital);
  $(".desk-train").classList.toggle("connected", statuses.space);
  $(".paper-corner").classList.toggle("stamped", statuses.punctuation);
  $('[data-action="send"]').disabled = text !== mission.target;
  $(".reference").innerHTML = reference();
  $(".key-target").innerHTML = keyPicture(mission.target[text.length] || "");
  $(".typed-count").innerHTML =
    `${text.length} <span>/ ${mission.target.length}</span>`;
  $(".letter-progress > span").style.width =
    `${(text.length / mission.target.length) * 100}%`;
}

function send() {
  if (screen !== "game" || modal.open || $("#paper").value !== mission.target)
    return;
  attempt.text = $("#paper").value;
  attempt.checks++;
  previousStampCount = stampCount();
  save = completeMission(save, mission, attempt);
  persist();
  screen = "success";
  audio.play("train");
  render();
  audio.play("deliver");
}

function hint() {
  if (screen !== "game") return;
  attempt.hints++;
  checkpoint();
  $(".feedback").className = "feedback helping";
  $(".feedback").innerHTML = nextGuide();
  const key = $(".key-target");
  key.classList.remove("key-bounce");
  void key.offsetWidth;
  key.classList.add("key-bounce");
  const current = $(".reference .is-current");
  if (current) current.classList.add("hint-glow");
  $("#paper").focus({ preventScroll: true });
  $("#paper").setSelectionRange(attempt.text.length, attempt.text.length);
  audio.play("hint");
}

function success() {
  const independent =
    attempt.checks === 1 && attempt.hints === 0 && !attempt.blocked;
  const newStamp = stampCount() > previousStampCount;
  const routeDone = completedIn(save.route) === 8;
  const effectName = ["jump", "sun"].includes(mission.effect)
    ? "stars"
    : mission.effect;
  return `<main class="delivery-screen effect-${mission.effect}">${landscape("delivery-landscape")}<div class="delivery-heading"><span class="eyebrow">${routeDone ? "ALL 8 LETTERS DELIVERED!" : "YOU MADE SOMEONE SMILE"}</span><h1>Delivered<span>!</span></h1><p>${endings[mission.effect] || "A letter for a friend!"}</p></div><div class="delivery-characters"><div class="recipient-party">${animal(route().animal, "happy-recipient")}<span class="speech">${independent ? "Perfect!" : "You did it!"}</span></div><div class="delivery-surprise">${icon(effectName)}<i>✦</i><i>✧</i><i>✦</i></div>${train("driving flag-up connected")}</div><div class="delivered-letter"><span class="delivered-label">${icon("check")}SENT WITH LOVE</span><p lang="en">${escape(mission.target)}</p>${newStamp ? `<button class="new-stamp" data-action="album">${icon(STAMPS[stampCount() - 1][0])}<span>New stamp!<small>+ 1</small></span>${icon("arrow")}</button>` : `<span class="next-stamp-note">${save.completed.length === 32 ? "16 / 16 stamps. Amazing!" : "2 new letters = 1 new stamp"}</span>`}</div><div class="delivery-actions"><button class="secondary" data-action="home" aria-label="Home">${icon("home")}Home</button>${mission.index < 7 ? `<button class="primary" data-action="next">Next${icon("arrow")}</button>` : `<button class="primary" data-action="album">${icon("stamp")}Stamps</button>`}</div></main>`;
}

function showDialog(content, className = "") {
  modal.className = className;
  modal.innerHTML = `<button class="modal-close" data-action="close" aria-label="关闭">${icon("close")}</button>${content}`;
  if (!modal.open) modal.showModal();
}
function album() {
  const count = stampCount();
  showDialog(
    `<div class="dialog-heading"><span class="eyebrow">MEMORIES FROM EVERY LETTER</span><h2>My stamps</h2><p>2 new letters → 1 little surprise</p><b>${count} / 16</b></div><div class="stamp-grid">${STAMPS.map(([name, title], i) => `<button class="collectible ${i < count ? "earned" : "locked"}" data-stamp="${i}" aria-label="${i < count ? title : "Locked stamp"}" ${i >= count ? "disabled" : ""}>${["fox", "bunny", "bear", "cat"].includes(name) ? animal(name) : icon(name)}<span>${i < count ? "★" : "○ ○"}</span><small>${String(i + 1).padStart(2, "0")}</small></button>`).join("")}</div>`,
    "album-dialog",
  );
}
function parent() {
  const records = Object.values(save.records);
  const independent = records.filter((r) => r.lastIndependent).length;
  showDialog(
    `<div class="dialog-heading"><span class="eyebrow">FOR GROWN-UPS</span><h2>练习记录</h2><p>句子邮局有单独的进度，不使用键盘小岛存档。</p></div><div class="parent-summary"><strong>${save.completed.length}<small>不同信件已送达</small></strong><strong>${independent}<small>最近一次独立完成</small></strong><strong>${stampCount()}<small>已收集邮票</small></strong></div><p class="parent-explanation">“独立完成”指没有输错、不点帮助，第一次就寄出成功。所有字符按顺序输入，输错会留在原位；空格和标点也要正确才能前进。可以对照范例，不要求背句子。重玩不会重复增加邮票。</p><div class="skill-stats">${ROUTES.map((item) => `<div><span>${icon(item.icon)}${item.short}</span><meter min="0" max="8" value="${completedIn(item.id)}" aria-label="${item.name}进度"></meter><b>${completedIn(item.id)} / 8</b></div>`).join("")}</div><div class="mistake-summary">曾需要检查：${[
      ["capital", "大写"],
      ["space", "空格"],
      ["punctuation", "标点"],
      ["spelling", "字母"],
    ]
      .map(
        ([kind, label]) =>
          `<span>${label} ${records.filter((r) => r.mistakes.includes(kind)).length} 封</span>`,
      )
      .join(
        "",
      )}</div><div class="audio-settings"><label>背景音乐 <input type="checkbox" id="music-setting" ${save.music ? "checked" : ""}></label><label>音量 <input type="range" id="volume-setting" min="0" max="1" step="0.05" value="${save.volume}"></label></div><p class="storage-note">${storageFailed ? "当前浏览器不能保存，请不要关闭后期待恢复进度。" : "自动保存在这台电脑的当前浏览器中。清除网站数据或更换地址后，进度不会跟随。"}<br>没有上传、录音或摄像头；音乐和音效在本机生成。</p><button class="reset-button" data-action="confirm-reset">重新开始邮局</button>`,
    "parent-dialog",
  );
}

async function handleClick(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  await activateAudio();
  audio.play("click");
  if (button.dataset.route) return start(button.dataset.route);
  if (button.dataset.mission !== undefined)
    return start(save.route, Number(button.dataset.mission));
  if (button.dataset.stamp !== undefined) {
    const [name, title] = STAMPS[Number(button.dataset.stamp)];
    showDialog(
      `<div class="stamp-detail">${["fox", "bunny", "bear", "cat"].includes(name) ? animal(name) : icon(name)}<h2>Special delivery!</h2><p>A little memory of your adventure.</p><button class="primary" data-action="album">My stamps</button></div>`,
      "stamp-detail-dialog",
    );
    return;
  }
  switch (button.dataset.action) {
    case "start": {
      const draft =
        save.draft && ALL_MISSIONS.find((m) => m.id === save.draft.id);
      start(draft?.routeId || save.route, draft?.index, Boolean(draft));
      break;
    }
    case "home":
      screen = "home";
      render();
      break;
    case "next":
      start(save.route, mission.index + 1);
      break;
    case "send":
      send();
      break;
    case "hint":
      hint();
      break;
    case "album":
      album();
      break;
    case "parent":
      parent();
      break;
    case "close":
      modal.close();
      break;
    case "sound":
      save.sound = !save.sound;
      persist();
      button.setAttribute("aria-label", `声音：${save.sound ? "开" : "关"}`);
      button.setAttribute("aria-pressed", String(save.sound));
      button.innerHTML = icon(save.sound ? "sound" : "mute");
      break;
    case "confirm-reset":
      showDialog(
        `<div class="reset-confirm">${icon("mail")}<h2>重新开始邮局？</h2><p>将清空邮局的信件进度、草稿和邮票。<br>键盘小岛的进度不受影响。</p><button class="primary" data-action="cancel-reset">先不清空</button><button class="reset-button" data-action="reset">确认清空邮局</button></div>`,
      );
      break;
    case "cancel-reset":
      parent();
      break;
    case "reset": {
      const sound = save.sound,
        music = save.music,
        volume = save.volume;
      save = { ...loadSave(null), sound, music, volume };
      persist();
      modal.close();
      screen = "home";
      render();
      toast("邮局重新开张啦。");
      break;
    }
  }
}
app.addEventListener("click", handleClick);
document.addEventListener(
  "keydown",
  (event) => {
    if (
      screen !== "success" ||
      event.key !== "Enter" ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    // Enter still held from sending auto-repeats into the newly focused button,
    // which would skip the celebration.
    if (event.repeat) event.preventDefault();
    // Clicking the scenery drops focus to the page, where Enter would do nothing.
    else if (!modal.open && event.target === document.body)
      $(".delivery-actions .primary").click();
  },
  true,
);
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
  else handleClick(event);
});
// A closing dialog returns focus to its opener, so Enter would only reopen it.
modal.addEventListener("close", () => {
  if (screen === "success") focusDeliveryAction();
});
modal.addEventListener("change", (event) => {
  if (event.target.id === "music-setting") {
    save.music = event.target.checked;
    persist();
  }
});
modal.addEventListener("input", (event) => {
  if (event.target.id === "volume-setting") {
    save.volume = Number(event.target.value);
    persist();
  }
});
render();
