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
  const reaction = $("kReaction");

  // ---------- State ----------
  const answers = {};
  let stepIndex = 0;

  // ---------- Steps ----------
  const steps = [
    {
      id: "start",
      type: "intro",
      q: "Kompass starten",
      sub: "60 Sekunden – dann hast du Orientierung. Keine Registrierung. Nur notwendige Angaben.",
      bubble: "Ruhig & klar. Ich bin an deiner Seite.",
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
      sub: "Keine Bewertung – nur ein Kompass-Marker.",
      bubble: "Orientierung, kein Urteil.",
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
      q: "Ein Satz – nur wenn du magst.",
      sub: "Optional. Keine Details, die du nicht teilen willst.",
      bubble: "Du gibst nur so viel preis, wie du willst.",
      key: "notes",
      placeholder: "z. B. „Abends komme ich nicht runter“ …",
      optional: true,
    },
    {
      id: "result",
      type: "result",
      q: "Dein Kompass-Ergebnis",
      sub: "Orientierung – keine Diagnose.",
      bubble: "Stark. Jetzt entscheiden wir sauber den nächsten Schritt.",
    },
  ];

  // ---------- UI ----------
  function renderDots() {
    dotsWrap.innerHTML = "";
    for (let i = 0; i < steps.length; i++) {
      const dot = document.createElement("span");
      if (i === stepIndex) dot.classList.add("active");
      dotsWrap.appendChild(dot);
    }
  }

  function updateProgress() {
    stepNowEl.textContent = String(stepIndex + 1);
    stepMaxEl.textContent = String(steps.length);

    const pct = Math.round(((stepIndex) / (steps.length - 1)) * 100);
    fill.style.width = `${clamp(pct, 0, 100)}%`;
    document.querySelector(".k-progress-bar")?.setAttribute("aria-valuenow", String(pct));
    renderDots();
  }

  function setBubble(text) {
    if (bubbleText) bubbleText.textContent = text || "Ich bin da.";
  }

  function thumbsUp() {
    if (!reaction) return;
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 550);
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

  // ---------- Render ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble);

    // Controls
    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    btnNext.textContent = step.type === "intro" ? "Kompass starten" : (step.type === "result" ? "Fertig" : "Weiter");
    btnNext.disabled = !canGoNext();

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

    // INTRO: Kein doppelter Container mehr, keine Karten -> nur sauberer Einstieg
    if (step.type === "intro") {
      const note = document.createElement("div");
      note.className = "k-hint";
      note.textContent = "Du gehst keine Verpflichtung ein.";
      wrap.appendChild(note);
    }

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach(opt => {
        const el = mkCard(opt.t, opt.d, () => {
          answers[step.key] = opt.v;
          [...cards.querySelectorAll(".k-card-btn")].forEach(b => b.classList.remove("selected"));
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
      input.value = answers[step.key] || "";
      input.rows = 4;

      input.addEventListener("input", () => {
        answers[step.key] = input.value;
        btnNext.disabled = !canGoNext();
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

  // ---------- Result ----------
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
    box.style.border = "1px solid rgba(255,255,255,.12)";
    box.style.borderRadius = "16px";
    box.style.padding = "14px";
    box.style.background = "rgba(0,0,0,.35)";
    box.style.boxShadow = "0 0 22px rgba(0,255,154,.10)";

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,255,154,.95)">Digitaler Kompass</div>
        <div aria-hidden="true">🧭</div>
      </div>

      <div style="font-size:18px;font-weight:800;margin:6px 0 8px">${headline}</div>
      <div style="color:rgba(255,255,255,.78);font-size:14px;line-height:1.45">${note}</div>

      <div style="margin-top:12px;color:rgba(255,255,255,.70);font-size:13px;display:grid;gap:6px">
        <div><span style="color:rgba(255,255,255,.52)">Fokus:</span> ${labelGoal(goal)}</div>
        <div><span style="color:rgba(255,255,255,.52)">Zeitraum:</span> ${labelTime(timeframe)}</div>
        <div><span style="color:rgba(255,255,255,.52)">Alltag:</span> ${labelImpact(impact)}</div>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <a style="display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:999px;font-weight:800;text-decoration:none;cursor:pointer;background:#00ff9a;color:#000;border:none;box-shadow:0 0 20px rgba(0,255,154,.25)"
           href="weiterleitung.html">${cta}</a>

        <button id="saveCopy" type="button"
          style="display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:999px;font-weight:800;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff">
          Zusammenfassung kopieren
        </button>
      </div>

      <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)">
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

  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);

  stage.addEventListener("click", () => {
    btnNext.disabled = !canGoNext();
  });

  // Init
  renderStep();
})();
