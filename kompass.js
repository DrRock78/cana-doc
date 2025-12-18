(() => {
  // ========= Helpers =========
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ========= DOM =========
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction");

  // ========= State =========
  const answers = {};
  let stepIndex = 0;

  // ========= Steps =========
  const steps = [
    {
      id: "start",
      type: "start",
      q: "Bereit für deinen digitalen Kompass?",
      sub: "In wenigen Schritten zur Orientierung. Diskret. Ohne Verpflichtung.",
      bubble: "Ich bin da. Wenn du willst, starten wir jetzt.",
    },
    {
      id: "goal",
      type: "cards",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt.",
      bubble: "Sag mir die Richtung – ich halte den Kompass ruhig.",
      key: "goal",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein- oder Durchschlafen, Abendruhe" },
        { v: "stress", t: "Stress & Anspannung", d: "Unruhe, Druck, Gedankenkarussell" },
        { v: "pain", t: "Körperliche Beschwerden", d: "z. B. Verspannung, Schmerz" },
        { v: "other", t: "Allgemeine Orientierung", d: "Ich bin unsicher und will Klarheit" },
      ],
    },
    {
      id: "timeframe",
      type: "cards",
      q: "Seit wann beschäftigt dich das Thema?",
      sub: "Ein Gefühl für den Zeitraum hilft bei der Einordnung.",
      bubble: "Keine Eile. Nur ehrlich.",
      key: "timeframe",
      options: [
        { v: "days", t: "Ein paar Tage", d: "neu aufgetreten" },
        { v: "weeks", t: "Einige Wochen", d: "zieht sich schon" },
        { v: "months", t: "Monate oder länger", d: "dauerhaft / wiederkehrend" },
      ],
    },
    {
      id: "impact",
      type: "cards",
      q: "Wie stark beeinflusst es deinen Alltag?",
      sub: "Das ist keine Bewertung – nur Orientierung.",
      bubble: "Hier gibt es kein Richtig oder Falsch.",
      key: "impact",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber gut handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie" },
        { v: "high", t: "Stark", d: "belastet deutlich" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Möchtest du einen Satz ergänzen?",
      sub: "Optional. Teile nur, was du möchtest.",
      bubble: "Du bestimmst die Tiefe.",
      key: "notes",
      optional: true,
      placeholder: "z. B. „Ich komme abends nicht zur Ruhe“ …",
    },
    {
      id: "result",
      type: "result",
      q: "Deine Kompass-Orientierung",
      sub: "Das ist eine Orientierung – keine Diagnose.",
      bubble: "Danke für dein Vertrauen. Lass uns sauber einordnen.",
    },
  ];

  // ========= Progress =========
  function updateProgress() {
    stepNowEl.textContent = stepIndex + 1;
    stepMaxEl.textContent = steps.length;
    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    fill.style.width = `${clamp(pct, 0, 100)}%`;

    dotsWrap.innerHTML = "";
    for (let i = 0; i < steps.length; i++) {
      const d = document.createElement("span");
      if (i === stepIndex) d.classList.add("active");
      dotsWrap.appendChild(d);
    }
  }

  // ========= Bubble / Reaction =========
  function setBubble(text) {
    if (bubbleText) bubbleText.textContent = text;
  }
  function thumbsUp() {
    if (!reaction) return;
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 600);
  }

  // ========= Validation =========
  function canGoNext() {
    const step = steps[stepIndex];
    if (step.type === "start" || step.type === "result") return true;
    if (step.type === "cards") return Boolean(answers[step.key]);
    if (step.type === "text") return true;
    return true;
  }

  // ========= Render =========
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "");

    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    btnNext.textContent = step.type === "start" ? "Kompass starten" : step.type === "result" ? "Fertig" : "Weiter";
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

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";
      step.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "k-card-btn";
        btn.innerHTML = `<div class="t">${opt.t}</div><div class="d">${opt.d}</div>`;
        btn.onclick = () => {
          answers[step.key] = opt.v;
          [...cards.children].forEach(c => c.classList.remove("selected"));
          btn.classList.add("selected");
          btnNext.disabled = false;
          thumbsUp();
        };
        cards.appendChild(btn);
      });
      wrap.appendChild(cards);
    }

    if (step.type === "text") {
      const ta = document.createElement("textarea");
      ta.className = "k-input";
      ta.placeholder = step.placeholder;
      ta.oninput = () => answers[step.key] = ta.value;
      wrap.appendChild(ta);
    }

    if (step.type === "result") {
      wrap.appendChild(buildResult());
    }

    stage.appendChild(wrap);
  }

  // ========= Result =========
  function buildResult() {
    const box = document.createElement("div");
    box.className = "k-result";

    const text = (answers.notes || "").toLowerCase();
    const critical = /suizid|umbringen|nicht mehr leben|töten/.test(text);

    let title = "Orientierung abgeschlossen.";
    let note = "Du kannst nun entscheiden, ob du den nächsten Schritt gehen möchtest.";

    if (critical) {
      title = "Wichtiger Hinweis";
      note = "Deine Angaben zeigen eine ernsthafte Belastung. Bitte wende dich umgehend an professionelle Hilfe oder vertraute Personen.";
    }

    box.innerHTML = `
      <div class="k-result-title">${title}</div>
      <div class="k-result-text">${note}</div>
      <div class="k-result-actions">
        <a class="k-result-btn primary" href="weiterleitung.html">Diskret weiter</a>
      </div>
      <div class="k-result-legal">Hinweis: Orientierung, keine Diagnose.</div>
    `;
    return box;
  }

  // ========= Navigation =========
  btnNext.onclick = () => {
    if (!canGoNext()) return;
    stepIndex++;
    if (stepIndex >= steps.length) stepIndex = steps.length - 1;
    renderStep();
  };
  btnPrev.onclick = () => {
    if (stepIndex > 0) stepIndex--;
    renderStep();
  };

  // ========= Init =========
  renderStep();
})();
