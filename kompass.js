(() => {
  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- DOM ----------
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction"); // optional: falls nicht vorhanden, kein Problem

  // ---------- State ----------
  const answers = {};
  let stepIndex = 0;

  // ---------- Steps (Kurz: 6) ----------
  // Hinweis: rein orientierend, keine Diagnose.
  const steps = [
    {
      id: "start",
      type: "intro",
      q: "Ich bin CanaDoc.",
      sub: "Ich begleite dich diskret – in wenigen Schritten zur Orientierung. Keine Registrierung. Nur notwendige Angaben.",
      bubble: "Wir machen das ruhig & klar. Ich bin an deiner Seite.",
    },
    {
      id: "goal",
      type: "cards",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt. Du kannst später ergänzen.",
      bubble: "Sag mir kurz die Richtung – dann führe ich dich sauber durch.",
      key: "goal",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein- oder Durchschlafen, Erholung, Abendruhe" },
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
      bubble: "Nicht perfekt sein – nur ehrlich. Das reicht völlig.",
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
      sub: "Das ist keine Bewertung – nur ein Kompass-Marker.",
      bubble: "Hier geht’s um Orientierung, nicht um Urteil.",
      key: "impact",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber handelbar" },
        { v: "mid", t: "Mittel", d: "nervt, kostet Energie" },
        { v: "high", t: "Stark", d: "belastet deutlich (Job/Familie/Tag)" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Ein Satz, damit ich dich besser einordnen kann.",
      sub: "Optional – wenn du magst. Keine Details, die du nicht teilen willst.",
      bubble: "Du gibst nur so viel preis, wie du willst. Wirklich.",
      key: "notes",
      placeholder: "z. B. „Ich wache nachts oft auf“ oder „Abends komme ich nicht runter“ …",
      optional: true,
    },
    {
      id: "result",
      type: "result",
      q: "Dein Kompass-Ergebnis",
      sub: "Das ist eine Orientierung – keine Diagnose.",
      bubble: "Stark. Du hast Klarheit geschaffen. Jetzt entscheiden wir sauber den nächsten Schritt.",
    },
  ];

  // ---------- Render Dots ----------
  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    for (let i = 0; i < steps.length; i++) {
      const dot = document.createElement("span");
      if (i === stepIndex) dot.classList.add("active");
      dotsWrap.appendChild(dot);
    }
  }

  // ---------- Progress ----------
  function updateProgress() {
    if (stepNowEl) stepNowEl.textContent = String(stepIndex + 1);
    if (stepMaxEl) stepMaxEl.textContent = String(steps.length);

    const pct = Math.round(((stepIndex) / (steps.length - 1)) * 100);
    if (fill) fill.style.width = `${clamp(pct, 0, 100)}%`;
    document.querySelector(".k-progress-bar")?.setAttribute("aria-valuenow", String(pct));

    renderDots();
  }

  // ---------- Mascot Bubble + Reaction ----------
  let bubbleTimer = null;
  function setBubble(text) {
    if (!bubbleText) return;
    bubbleText.textContent = text;
    if (bubbleTimer) clearTimeout(bubbleTimer);
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

  // ---------- Render Step ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "Ich bin da.");

    // Button labels
    if (btnPrev) btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    if (btnNext) {
      btnNext.textContent = step.type === "result" ? "Fertig" : "Weiter";
      btnNext.disabled = !canGoNext();
    }

    // Stage
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
      const cards = document.createElement("div");
      cards.className = "k-cards";

      // ✅ FIX: KEIN „60 Sekunden…“ mehr hier – das steht schon oben in der Top-Bar
      const startBtn = mkCard("Kompass starten", "Diskret. Unverbindlich. Ohne Verpflichtung.", () => {
        thumbsUp();
        next();
      });
      startBtn.classList.add("selected");

      const privacyBtn = mkCard("Diskret & unverbindlich", "Du behältst jederzeit die Kontrolle.", () => {
        setBubble("Genau. Du behältst die Kontrolle.");
        thumbsUp();
      });

      cards.appendChild(startBtn);
      cards.appendChild(privacyBtn);
      wrap.appendChild(cards);
    }

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach(opt => {
        const el = mkCard(opt.t, opt.d, () => {
          answers[step.key] = opt.v;
          [...cards.querySelectorAll(".k-card-btn")].forEach(b => b.classList.remove("selected"));
          el.classList.add("selected");
          if (btnNext) btnNext.disabled = !canGoNext();
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
      input.value = answers[step.key] || "";
      input.rows = 4;

      input.addEventListener("input", () => {
        answers[step.key] = input.value;
        if (btnNext) btnNext.disabled = !canGoNext();
      });

      wrap.appendChild(input);

      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Tipp: Ein Satz reicht. Keine sensiblen Details, wenn du das nicht möchtest.";
      wrap.appendChild(hint);
    }

    if (step.type === "result") {
      wrap.appendChild(buildResultCard());
    }

    stage.appendChild(wrap);
  }

  function mkCard(title, desc, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-card-btn";
    btn.innerHTML = `<div class="t">${title}</div><div class="d">${desc}</div>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ---------- Result Logic ----------
  function buildResultCard() {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";

    let headline = "Orientierung: nächster Schritt kann sinnvoll sein.";
    let note = "Wenn du möchtest, kannst du das Thema ärztlich abklären lassen – diskret und nachvollziehbar.";
    let cta = "Diskret weiter";

    if (impact === "low" && timeframe === "days") {
      headline = "Orientierung: beobachte es kurz – und handle bewusst.";
      note = "Wenn es bleibt oder sich verschlechtert, ist ärztliche Abklärung sinnvoll.";
      cta = "Optionen ansehen";
    }
    if (impact === "high" || timeframe === "months") {
      headline = "Orientierung: ärztliche Abklärung ist empfehlenswert.";
      note = "Bei starker oder langer Belastung ist professionelle Abklärung oft der sauberste Weg.";
      cta = "Abklärung starten";
    }

    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">Digitaler Kompass</div>
        <div class="k-needle" aria-hidden="true">🧭</div>
      </div>
      <div class="k-result-title">${headline}</div>
      <div class="k-result-text">${note}</div>

      <div class="k-result-mini">
        <div><span>Fokus:</span> ${labelGoal(goal)}</div>
        <div><span>Zeitraum:</span> ${labelTime(timeframe)}</div>
        <div><span>Alltag:</span> ${labelImpact(impact)}</div>
      </div>

      <div class="k-result-actions">
        <a class="k-result-btn primary" id="goPartner" href="weiterleitung.html">${cta}</a>
        <button class="k-result-btn ghost" id="saveCopy" type="button">Zusammenfassung kopieren</button>
      </div>

      <div class="k-result-legal">
        Hinweis: Dies ist eine Orientierung und ersetzt keine ärztliche Behandlung.
      </div>
    `;

    box.querySelector("#saveCopy").addEventListener("click", async () => {
      const text = buildSummaryText(goal, timeframe, impact, answers.notes || "");
      try {
        await navigator.clipboard.writeText(text);
        setBubble("Kopiert. Sauber.");
        thumbsUp();
      } catch {
        setBubble("Kopieren ging nicht – aber alles bleibt hier sichtbar.");
      }
    });

    return box;
  }

  function buildSummaryText(goal, timeframe, impact, notes) {
    return [
      "CanaDoc – Kompass-Zusammenfassung",
      `Fokus: ${labelGoal(goal)}`,
      `Zeitraum: ${labelTime(timeframe)}`,
      `Alltag: ${labelImpact(impact)}`,
      notes ? `Notiz: ${notes}` : "",
      "",
      "Hinweis: Orientierung, keine Diagnose."
    ].filter(Boolean).join("\n");
  }

  function labelGoal(v){
    return ({
      sleep: "Schlaf & Erholung",
      stress: "Stress & Anspannung",
      pain: "Körperliche Beschwerden",
      other: "Allgemeine Orientierung"
    }[v] || "Allgemeine Orientierung");
  }
  function labelTime(v){
    return ({
      days: "seit Tagen",
      weeks: "seit Wochen",
      months: "seit Monaten+"
    }[v] || "seit Wochen");
  }
  function labelImpact(v){
    return ({
      low: "leicht",
      mid: "mittel",
      high: "stark"
    }[v] || "mittel");
  }

  // ---------- Navigation ----------
  function next() {
    if (stepIndex >= steps.length - 1) {
      window.location.href = "index.html";
      return;
    }

    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    stepIndex++;
    thumbsUp();
    renderStep();
  }

  function prev() {
    if (stepIndex <= 0) return;
    stepIndex--;
    renderStep();
  }

  // ---------- Events ----------
  if (btnNext) btnNext.addEventListener("click", next);
  if (btnPrev) btnPrev.addEventListener("click", prev);

  stage.addEventListener("click", () => {
    if (btnNext) btnNext.disabled = !canGoNext();
  });

  // ---------- Result Styling injected (minimal, keeps CSS clean) ----------
  const style = document.createElement("style");
  style.textContent = `
    .k-result{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;background:rgba(0,0,0,.35);box-shadow:0 0 22px rgba(0,255,154,.10)}
    .k-result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .k-badge{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,255,154,.95)}
    .k-result-title{font-size:18px;font-weight:700;margin:6px 0 8px}
    .k-result-text{color:rgba(255,255,255,.78);font-size:14px;line-height:1.45}
    .k-result-mini{margin-top:12px;color:rgba(255,255,255,.70);font-size:13px;display:grid;gap:6px}
    .k-result-mini span{color:rgba(255,255,255,.52)}
    .k-result-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .k-result-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:999px;font-weight:700;text-decoration:none;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff}
    .k-result-btn.primary{background:#00ff9a;color:#000;border:none;box-shadow:0 0 20px rgba(0,255,154,.25)}
    .k-result-legal{margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)}
  `;
  document.head.appendChild(style);

  // ---------- Init ----------
  renderStep();
})();
