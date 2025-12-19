(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Config ----------
  // Ziel-Link: deine Weiterleitung zu DoktorABC (oder deine Zwischen-Seite)
  const DOCTOR_URL = "weiterleitung.html";

  // ---------- DOM ----------
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction");

  // Top-right: wir bauen eine Status-Ampel dynamisch, falls sie nicht existiert
  const topRight = document.querySelector(".k-top-right");
  let statusPill = document.querySelector(".k-status");
  if (topRight && !statusPill) {
    statusPill = document.createElement("div");
    statusPill.className = "k-status k-status-ok";
    statusPill.innerHTML = `<span class="k-status-dot" aria-hidden="true"></span><span class="k-status-text">Alles ruhig.</span>`;
    topRight.appendChild(statusPill);
  }

  // ---------- State ----------
  const answers = {
    goal: "",
    timeframe: "",
    impact: "",
    notes: "",
  };

  let stepIndex = 0;
  let isTransitioning = false;

  // ---------- Steps (6) ----------
  // Hinweis: reine Orientierung, keine Diagnose.
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
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt. Du kannst später ergänzen.",
      bubble: "Sag mir kurz die Richtung – dann wird’s klar.",
      key: "goal",
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
      q: "Seit wann beschäftigt dich das Thema?",
      sub: "Ein Gefühl für den Zeitraum hilft bei der Orientierung.",
      bubble: "Nur grob. Perfekt muss es nicht sein.",
      key: "timeframe",
      options: [
        { v: "days", t: "Ein paar Tage", d: "neu / frisch aufgetreten" },
        { v: "weeks", t: "Einige Wochen", d: "zieht sich schon etwas" },
        { v: "months", t: "Monate oder länger", d: "dauerhaft / wiederkehrend" },
      ],
    },
    {
      id: "impact",
      type: "cards",
      q: "Wie stark beeinflusst es deinen Alltag?",
      sub: "Nur zur Orientierung – keine Bewertung.",
      bubble: "Ich bewerte nicht. Ich ordne nur ein.",
      key: "impact",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie / zieht runter" },
        { v: "high", t: "Stark", d: "belastet deutlich (Tag/Job/Familie)" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Wenn du magst: ein Satz dazu.",
      sub: "Optional. Du entscheidest, wie viel du teilen willst.",
      bubble: "Ein Satz reicht. Du behältst die Kontrolle.",
      key: "notes",
      placeholder: "z. B. „Abends komme ich nicht runter“ oder „Ich wache nachts oft auf“ …",
      optional: true,
    },
    {
      id: "result",
      type: "result",
      q: "Deine Kompass-Orientierung",
      sub: "Orientierung – keine Diagnose. Die medizinische Entscheidung trifft ein Arzt.",
      bubble: "Danke. Jetzt machen wir den nächsten Schritt sauber.",
    },
  ];

  // ---------- Progress ----------
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
    document.querySelector(".k-progress-bar")?.setAttribute("aria-valuenow", String(pct));
    renderDots();
  }

  // ---------- Mascot Bubble + Reaction ----------
  function setBubble(text) {
    if (!bubbleText) return;
    bubbleText.textContent = text || "";
  }

  function thumbsUp() {
    if (!reaction) return;
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 650);
  }

  // ---------- Validation ----------
  function canGoNext() {
    const step = steps[stepIndex];
    if (step.type === "intro" || step.type === "result") return true;

    const key = step.key;
    const val = answers[key];

    if (step.type === "text") {
      if (step.optional) return true;
      return Boolean(val && String(val).trim().length > 0);
    }
    if (step.type === "cards") return Boolean(val);
    return true;
  }

  // ---------- UI helpers ----------
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function mkCard(title, desc, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-card-btn";
    btn.innerHTML = `<div class="t">${escapeHtml(title)}</div><div class="d">${escapeHtml(desc)}</div>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ---------- Safety / intent detection ----------
  function detectSignals(textRaw) {
    const text = (textRaw || "").toLowerCase();

    // high-risk self-harm phrases
    const selfHarm =
      /selbstmord|suizid|umbringen|mich töten|mein leben nehmen|brücke|springen|will nicht mehr|nicht mehr leben/.test(text);

    // cannabis / prescription intent (neutral handling)
    const cannabis =
      /cannabis|thc|gras|weed|joint|blüte|rezept|auf rezept|medizinisch(es)? cannabis|telemedizin(er)?/.test(text);

    return { selfHarm, cannabis };
  }

  // ---------- Status (Ampel) ----------
  function setStatus(level, text) {
    if (!statusPill) return;
    statusPill.classList.remove("k-status-ok", "k-status-warn", "k-status-danger");
    statusPill.classList.add(
      level === "danger" ? "k-status-danger" : level === "warn" ? "k-status-warn" : "k-status-ok"
    );
    const t = statusPill.querySelector(".k-status-text");
    if (t) t.textContent = text || (level === "danger" ? "Achtung." : level === "warn" ? "Achtsam." : "Alles ruhig.");
  }

  function computeStatus() {
    // Default
    let level = "ok";
    let text = "Alles ruhig.";

    const sig = detectSignals(answers.notes || "");

    // Rot: Selbstgefährdung im Text
    if (sig.selfHarm) {
      level = "danger";
      text = "Bitte jetzt Hilfe holen.";
      return { level, text };
    }

    // Gelb: starke Belastung oder lange Dauer
    if (answers.impact === "high" || answers.timeframe === "months") {
      level = "warn";
      text = "Achtsam.";
      return { level, text };
    }

    // Sonst grün
    return { level, text };
  }

  // ---------- Render Step ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "Ich bin da.");

    const st = computeStatus();
    setStatus(st.level, st.text);

    // Buttons
    if (btnPrev) btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    if (btnNext) {
      btnNext.textContent = step.type === "result" ? "Fertig" : "Weiter";
      btnNext.disabled = isTransitioning || !canGoNext();
    }

    // Stage
    if (!stage) return;
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

    // INTRO: nur ein kurzer Hinweis – kein extra „Los geht’s“-Container
    if (step.type === "intro") {
      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Hinweis: Orientierung – keine Diagnose.";
      wrap.appendChild(hint);
    }

    // CARDS
    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach((opt) => {
        const el = mkCard(opt.t, opt.d, () => {
          answers[step.key] = opt.v;

          [...cards.querySelectorAll(".k-card-btn")].forEach((b) => b.classList.remove("selected"));
          el.classList.add("selected");

          const st2 = computeStatus();
          setStatus(st2.level, st2.text);

          if (btnNext) btnNext.disabled = isTransitioning || !canGoNext();
          thumbsUp();
        });

        if (answers[step.key] === opt.v) el.classList.add("selected");
        cards.appendChild(el);
      });

      wrap.appendChild(cards);
    }

    // TEXT
    if (step.type === "text") {
      const input = document.createElement("textarea");
      input.className = "k-input";
      input.placeholder = step.placeholder || "";
      input.value = answers[step.key] || "";
      input.rows = 4;

      input.addEventListener("input", () => {
        answers[step.key] = input.value;

        const st2 = computeStatus();
        setStatus(st2.level, st2.text);

        if (btnNext) btnNext.disabled = isTransitioning || !canGoNext();
      });

      wrap.appendChild(input);

      // ruhiger Hinweis – ohne „Sekundär, ruhig, klein:“
      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Wenn du dich gerade nicht sicher fühlst: TelefonSeelsorge 116 123 · Notfall 112";
      wrap.appendChild(hint);
    }

    // RESULT
    if (step.type === "result") {
      wrap.appendChild(buildResultCard());
    }

    stage.appendChild(wrap);
  }

  // ---------- Result Logic ----------
  function buildResultCard() {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";
    const notes = answers.notes || "";

    const sig = detectSignals(notes);

    // Copy in CanaDoc-Stil (neutral, diskret, keine Diagnose)
    let title = "Orientierung: nächster Schritt Richtung Arztgespräch.";
    let text =
      "Ich stelle keine Diagnose. Ich helfe dir, deine Lage zu sortieren – damit du im Arztgespräch klar, ruhig und strukturiert bist.";

    // feiner Ton je nach Belastung (ohne Diagnose)
    if (impact === "high" || timeframe === "months") {
      title = "Orientierung: ärztliche Abklärung ist sinnvoll.";
      text =
        "Wenn es stark oder länger belastet, ist ein ärztliches Gespräch meist der sauberste nächste Schritt. Du bestimmst Tempo und Tiefe.";
    }

    // Cannabis-Intent: neutral, keine Zusagen, trotzdem „zum Arztgespräch“
    if (sig.cannabis) {
      title = "Orientierung: ärztliche Abklärung ist sinnvoll.";
      text =
        "Wenn du medizinische Optionen besprechen möchtest: Das entscheidet ein Arzt – inkl. Eignung, Risiken und Alternativen. Ich begleite dich bis zur Orientierung.";
    }

    // Self-harm: Hilfe-Karte + trotzdem Arztgespräch als CTA (wie du wolltest)
    const danger = sig.selfHarm;

    const box = document.createElement("div");
    box.className = `k-result ${danger ? "k-result-warn" : ""}`;

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">${escapeHtml(danger ? "WICHTIG" : "DIGITALER KOMPASS")}</div>
        <div class="k-needle" aria-hidden="true">${danger ? "🛑" : "🧭"}</div>
      </div>

      <div class="k-result-title">${escapeHtml(title)}</div>
      <div class="k-result-text">${escapeHtml(text)}</div>

      ${
        notes.trim().length
          ? `<div class="k-quote"><div class="k-quote-label">DEIN SATZ</div><div class="k-quote-text">„${escapeHtml(
              notes.trim()
            )}“</div></div>`
          : ""
      }

      ${
        danger
          ? `
        <div class="k-helpcard" role="note" aria-label="Soforthilfe">
          <div class="k-help-title">Wenn du dich gerade nicht sicher fühlst:</div>
          <div class="k-help-lines">
            <div><strong>TelefonSeelsorge:</strong> 116 123 (kostenfrei, 24/7)</div>
            <div><strong>Notruf:</strong> 112</div>
          </div>
          <div class="k-help-mini">Wenn akute Gefahr besteht: bitte 112.</div>
        </div>
      `
          : ""
      }

      <div class="k-result-actions">
        <a class="k-result-btn primary" href="${escapeHtml(DOCTOR_URL)}">Zum Arztgespräch</a>
      </div>

      <div class="k-result-mini">
        Hinweis: Orientierung – keine Diagnose. Medizinische Entscheidungen trifft ein Arzt.
      </div>
    `;

    return box;
  }

  // ---------- Navigation ----------
  async function next() {
    if (isTransitioning) return;

    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    isTransitioning = true;
    if (btnNext) btnNext.disabled = true;

    thumbsUp();
    await sleep(250);

    // finish -> zurück zur Startseite
    if (stepIndex >= steps.length - 1) {
      window.location.href = "index.html";
      return;
    }

    stepIndex++;
    isTransitioning = false;
    renderStep();
  }

  async function prev() {
    if (isTransitioning) return;
    if (stepIndex <= 0) return;

    isTransitioning = true;
    if (btnPrev) btnPrev.disabled = true;

    await sleep(120);

    stepIndex--;
    isTransitioning = false;
    renderStep();
  }

  // ---------- Events ----------
  if (btnNext) btnNext.addEventListener("click", next);
  if (btnPrev) btnPrev.addEventListener("click", prev);

  // ---------- Init ----------
  renderStep();
})();
