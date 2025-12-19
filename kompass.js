(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // ----------------------------
  // DOM
  // ----------------------------
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction");

  if (!stage || !btnPrev || !btnNext) {
    console.error("CanaDoc Kompass: DOM-Elemente fehlen (kStage/kPrev/kNext).");
    return;
  }

  // ----------------------------
  // Inject Styles (damit Cards NIE weiß werden)
  // ----------------------------
  const style = document.createElement("style");
  style.textContent = `
    /* Cards niemals weiß (auch nicht bei focus/active) */
    .k-card-btn{
      background: rgba(255,255,255,.06) !important;
      color: #fff !important;
      border: 1px solid rgba(255,255,255,.14) !important;
      border-radius: 16px;
      padding: 14px;
      text-align: left;
      cursor: pointer;
      transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
      -webkit-tap-highlight-color: transparent;
      outline: none;
    }
    .k-card-btn:hover{ transform: translateY(-1px); box-shadow: 0 0 18px rgba(0,255,154,.12); border-color: rgba(0,255,154,.28) !important; }
    .k-card-btn:focus, .k-card-btn:focus-visible{
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(0,255,154,.28), 0 0 18px rgba(0,255,154,.10) !important;
      border-color: rgba(0,255,154,.40) !important;
      background: rgba(255,255,255,.06) !important;
    }
    .k-card-btn:active{
      background: rgba(255,255,255,.08) !important;
      transform: translateY(0px);
    }
    .k-card-btn.selected{
      border-color: rgba(0,255,154,.80) !important;
      box-shadow: 0 0 22px rgba(0,255,154,.18) !important;
      background: rgba(0,255,154,.10) !important;
    }
    .k-card-btn .t{ font-weight: 800; margin-bottom: 4px; }
    .k-card-btn .d{ color: rgba(255,255,255,.72); font-size: 13px; line-height: 1.35; }

    /* Buttons sauber */
    #kNext.primary, #kNext{
      background: #00ff9a;
      color: #000;
      border: none;
      font-weight: 900;
      border-radius: 999px;
      padding: 12px 18px;
      cursor: pointer;
      box-shadow: 0 0 18px rgba(0,255,154,.22);
    }
    #kNext:disabled{
      opacity: .45;
      cursor: not-allowed;
      box-shadow: none;
    }
    #kPrev{
      background: rgba(255,255,255,.06);
      color: #fff;
      border: 1px solid rgba(255,255,255,.14);
      font-weight: 800;
      border-radius: 999px;
      padding: 12px 18px;
      cursor: pointer;
    }

    /* Reaction */
    .k-reaction{
      position: fixed;
      right: 18px;
      bottom: 18px;
      font-size: 26px;
      opacity: 0;
      transform: scale(.8);
      transition: opacity .18s ease, transform .18s ease;
      pointer-events:none;
      z-index: 9999;
      filter: drop-shadow(0 0 14px rgba(0,255,154,.35));
    }
    .k-reaction.show{ opacity: 1; transform: scale(1); }

    /* Result + Help */
    .k-result{
      margin-top: 12px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 16px;
      padding: 14px;
      background: rgba(0,0,0,.35);
      box-shadow: 0 0 22px rgba(0,255,154,.10);
    }
    .k-result.warn{
      border-color: rgba(255,80,80,.35);
      box-shadow: 0 0 24px rgba(255,80,80,.12);
    }
    .k-result-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .k-badge{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color: rgba(0,255,154,.95); font-weight: 900; }
    .k-result.warn .k-badge{ color: rgba(255,140,140,.95); }
    .k-result-title{ font-size:18px; font-weight: 900; margin: 6px 0 8px; }
    .k-result-text{ color: rgba(255,255,255,.80); font-size: 14px; line-height: 1.45; }
    .k-result-actions{ display:flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    .k-result-btn{
      display:inline-flex; align-items:center; justify-content:center;
      padding: 12px 16px; border-radius: 999px;
      font-weight: 900; text-decoration:none; cursor:pointer;
      background: #00ff9a; color: #000;
      box-shadow: 0 0 20px rgba(0,255,154,.25);
    }
    .k-helpcard{
      margin-top: 12px;
      border-radius: 14px;
      padding: 12px;
      border: 1px solid rgba(255,120,120,.25);
      background: rgba(255,80,80,.06);
    }
    .k-helpcard .h1{ font-weight: 900; margin-bottom: 6px; }
    .k-helpcard .h2{ font-size: 13px; line-height: 1.5; color: rgba(255,255,255,.88); }
    .k-helpcard .h3{ margin-top: 6px; font-size: 12px; color: rgba(255,255,255,.70); }

    /* Hint */
    .k-hint{ margin-top: 10px; font-size: 12px; color: rgba(255,255,255,.65); }
  `;
  document.head.appendChild(style);

  // ----------------------------
  // State
  // ----------------------------
  const answers = { goal: "", timeframe: "", impact: "", notes: "" };
  let stepIndex = 0;

  // simple click throttle (verhindert Doppelklick-Bugs)
  let lastNav = 0;
  const throttle = (ms = 250) => {
    const now = Date.now();
    if (now - lastNav < ms) return false;
    lastNav = now;
    return true;
  };

  // ----------------------------
  // Steps
  // ----------------------------
  const steps = [
    {
      id: "intro",
      type: "intro",
      q: "Kompass starten",
      sub: "In ~60 Sekunden bekommst du Orientierung. Keine Registrierung. Nur notwendige Angaben.",
      bubble: "Alles gut. Ich führe dich ruhig durch – Schritt für Schritt.",
    },
    {
      id: "goal",
      type: "cards",
      key: "goal",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt. Du kannst später ergänzen.",
      bubble: "Sag mir kurz die Richtung – dann wird’s klar.",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein- oder Durchschlafen, Abendruhe" },
        { v: "stress", t: "Stress & Anspannung", d: "Unruhe, Druck, Gedankenkarussell" },
        { v: "pain", t: "Körperliche Beschwerden", d: "z. B. Verspannung, Schmerz, Belastung" },
        { v: "other", t: "Allgemeine Orientierung", d: "Ich bin unsicher und will Klarheit" },
      ],
    },
    {
      id: "timeframe",
      type: "cards",
      key: "timeframe",
      q: "Seit wann beschäftigt dich das Thema?",
      sub: "Ein Gefühl für den Zeitraum hilft bei der Orientierung.",
      bubble: "Nur grob. Perfekt muss es nicht sein.",
      options: [
        { v: "days", t: "Ein paar Tage", d: "neu / frisch aufgetreten" },
        { v: "weeks", t: "Einige Wochen", d: "zieht sich schon etwas" },
        { v: "months", t: "Monate oder länger", d: "dauerhaft / wiederkehrend" },
      ],
    },
    {
      id: "impact",
      type: "cards",
      key: "impact",
      q: "Wie stark beeinflusst es deinen Alltag?",
      sub: "Nur zur Orientierung – keine Bewertung.",
      bubble: "Ich bewerte nicht. Ich ordne nur ein.",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie / nervt" },
        { v: "high", t: "Stark", d: "belastet deutlich (Tag/Job/Familie)" },
      ],
    },
    {
      id: "notes",
      type: "text",
      key: "notes",
      optional: true,
      q: "Wenn du magst: ein Satz dazu.",
      sub: "Optional. Keine sensiblen Details, wenn du das nicht möchtest.",
      bubble: "Ein Satz reicht. Du behältst die Kontrolle.",
      placeholder: "z. B. „Abends komme ich nicht runter“ oder „Ich wache nachts oft auf“ …",
    },
    {
      id: "result",
      type: "result",
      q: "Deine Orientierung",
      sub: "Das ist eine Einordnung – keine Diagnose.",
      bubble: "Gut. Jetzt ist der nächste Schritt klar.",
    },
  ];

  // ----------------------------
  // UI
  // ----------------------------
  function setBubble(text) {
    if (!bubbleText) return;
    bubbleText.textContent = text || "";
  }

  function thumbsUp() {
    if (!reaction) return;
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 650);
  }

  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    for (let i = 0; i < steps.length; i++) {
      const dot = document.createElement("span");
      if (i === stepIndex) dot.classList.add("active");
      dotsWrap.appendChild(dot);
    }
  }

  function updateProgress() {
    if (stepNowEl) stepNowEl.textContent = String(stepIndex + 1);
    if (stepMaxEl) stepMaxEl.textContent = String(steps.length);

    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    if (fill) fill.style.width = `${clamp(pct, 0, 100)}%`;

    const pb = document.querySelector(".k-progress-bar");
    if (pb) pb.setAttribute("aria-valuenow", String(clamp(pct, 0, 100)));

    renderDots();
  }

  function canGoNext() {
    const step = steps[stepIndex];
    if (step.type === "intro" || step.type === "result") return true;
    if (step.type === "text") return true; // optional immer ok
    if (step.type === "cards") return Boolean(answers[step.key]);
    return true;
  }

  function mkCard(opt, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-card-btn";
    btn.innerHTML = `<div class="t">${esc(opt.t)}</div><div class="d">${esc(opt.d)}</div>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ----------------------------
  // Safety / Intent detection
  // ----------------------------
  function detectSignals(textRaw) {
    const text = (textRaw || "").toLowerCase();

    const selfHarm =
      /selbstmord|suizid|umbringen|mich töten|mein leben nehmen|brücke|springen|will nicht mehr|nicht mehr leben|ich bringe mich um/.test(
        text
      );

    const cannabis =
      /cannabis|thc|gras|weed|joint|blüte|rezept|auf rezept|medizinisch(es)? cannabis|telemedizin(er)?|arzt.*rezept/.test(
        text
      );

    return { selfHarm, cannabis };
  }

  // ----------------------------
  // Result builder (nur 1 CTA – "Zum Arztgespräch")
  // ----------------------------
  function buildResultCard() {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";
    const notes = answers.notes || "";

    const sig = detectSignals(notes);

    let badge = "Digitaler Kompass";
    let title = "Orientierung abgeschlossen.";
    let text =
      "Du kannst jetzt entscheiden, ob du den nächsten Schritt gehen möchtest. Medizinische Entscheidungen trifft ein Arzt.";

    // Leicht angepasst, ohne Diagnose:
    if (impact === "high" || timeframe === "months") {
      text =
        "Wenn es dich stark oder lange belastet: Ein ärztliches Gespräch ist oft der sauberste nächste Schritt. Ich begleite dich bis zur Orientierung.";
    } else if (impact === "low" && timeframe === "days") {
      text =
        "Wenn es neu und eher leicht ist: beobachte es bewusst. Wenn es bleibt oder stärker wird, ist ein ärztliches Gespräch sinnvoll.";
    }

    // Cannabis: neutral, nicht wertend, aber „Option Arzt“ klar
    if (sig.cannabis) {
      text =
        "Wenn du dich über medizinische Optionen informieren willst: Ein Arzt klärt Eignung, Risiken, Alternativen und die saubere Dokumentation. Ich begleite dich bis zur Orientierung.";
    }

    // Self-harm: Hilfekarte + trotzdem „Zum Arztgespräch“ als Option
    const warn = sig.selfHarm;
    if (warn) {
      badge = "Wichtiger Hinweis";
      title = "Bitte hol dir jetzt Unterstützung.";
      text =
        "Wenn du dich gerade nicht sicher fühlst: Sprich jetzt mit einem Menschen. Du musst da nicht allein durch.";
    }

    const box = document.createElement("div");
    box.className = `k-result${warn ? " warn" : ""}`;

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">${esc(badge)}</div>
        <div aria-hidden="true">🧭</div>
      </div>

      <div class="k-result-title">${esc(title)}</div>
      <div class="k-result-text">${esc(text)}</div>

      ${
        warn
          ? `
        <div class="k-helpcard" role="note" aria-label="Soforthilfe">
          <div class="h1">Sofort sprechen:</div>
          <div class="h2"><strong>TelefonSeelsorge:</strong> 116 123 (kostenfrei, 24/7)</div>
          <div class="h2"><strong>Notruf:</strong> 112</div>
          <div class="h3">Wenn akute Gefahr besteht, bitte 112 wählen.</div>
        </div>
      `
          : ""
      }

      <div class="k-result-actions">
        <a class="k-result-btn" href="weiterleitung.html">Zum Arztgespräch</a>
      </div>

      <div class="k-hint">Hinweis: Orientierung, keine Diagnose.</div>
    `;

    return box;
  }

  // ----------------------------
  // Render step
  // ----------------------------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "Ich bin da.");

    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    btnNext.textContent = step.type === "result" ? "Fertig" : "Weiter";
    btnNext.disabled = !canGoNext();

    stage.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "k-step";

    const q = document.createElement("div");
    q.className = "k-question";
    q.textContent = step.q;

    const sub = document.createElement("div");
    sub.className = "k-sub";
    sub.textContent = step.sub;

    wrap.appendChild(q);
    wrap.appendChild(sub);

    if (step.type === "intro") {
      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Hinweis: Orientierung – keine Diagnose.";
      wrap.appendChild(hint);
    }

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach((opt) => {
        const el = mkCard(opt, () => {
          answers[step.key] = opt.v;

          // selected state
          cards.querySelectorAll(".k-card-btn").forEach((b) => b.classList.remove("selected"));
          el.classList.add("selected");

          btnNext.disabled = !canGoNext();
          thumbsUp();
        });

        if (answers[step.key] === opt.v) el.classList.add("selected");
        cards.appendChild(el);
      });

      wrap.appendChild(cards);
    }

    if (step.type === "text") {
      const input = document.createElement("textarea");
      input.className = "k-input";
      input.placeholder = step.placeholder || "";
      input.value = answers.notes || "";
      input.rows = 4;

      input.addEventListener("input", () => {
        answers.notes = input.value;
      });

      wrap.appendChild(input);

      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Tipp: Ein Satz reicht. Wenn du dich nicht sicher fühlst, sprich bitte sofort mit einem Menschen.";
      wrap.appendChild(hint);
    }

    if (step.type === "result") {
      wrap.appendChild(buildResultCard());
    }

    stage.appendChild(wrap);
  }

  // ----------------------------
  // Navigation
  // ----------------------------
  function goNext() {
    if (!throttle(200)) return;

    if (!canGoNext()) {
      // Klarer Hinweis statt „nichts passiert“
      setBubble("Bitte wähle kurz eine Option aus – dann geht’s weiter.");
      thumbsUp();
      return;
    }

    if (stepIndex >= steps.length - 1) {
      // Fertig
      window.location.href = "index.html";
      return;
    }

    stepIndex += 1;
    renderStep();
  }

  function goPrev() {
    if (!throttle(150)) return;
    if (stepIndex <= 0) return;
    stepIndex -= 1;
    renderStep();
  }

  // Events
  btnNext.addEventListener("click", goNext);
  btnPrev.addEventListener("click", goPrev);

  // ----------------------------
  // Init
  // ----------------------------
  renderStep();
})();
