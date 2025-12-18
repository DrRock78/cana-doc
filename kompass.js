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

  // ---------- STEPS (OHNE INTRO!) ----------
  const steps = [
    {
      id: "goal",
      type: "cards",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt.",
      bubble: "Sag mir kurz die Richtung – ich begleite dich.",
      key: "goal",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein- oder Durchschlafen, Abendruhe" },
        { v: "stress", t: "Stress & Anspannung", d: "Unruhe, Druck, Gedankenkarussell" },
        { v: "pain", t: "Körperliche Beschwerden", d: "z. B. Verspannung oder Schmerz" },
        { v: "other", t: "Allgemeine Orientierung", d: "Ich bin unsicher und will Klarheit" },
      ],
    },
    {
      id: "timeframe",
      type: "cards",
      q: "Seit wann beschäftigt dich das Thema?",
      sub: "Ein grober Zeitraum reicht.",
      bubble: "Nicht perfekt sein – ehrlich reicht.",
      key: "timeframe",
      options: [
        { v: "days", t: "Ein paar Tage", d: "neu aufgetreten" },
        { v: "weeks", t: "Einige Wochen", d: "zieht sich etwas" },
        { v: "months", t: "Monate oder länger", d: "dauerhaft / wiederkehrend" },
      ],
    },
    {
      id: "impact",
      type: "cards",
      q: "Wie stark beeinflusst es deinen Alltag?",
      sub: "Nur zur Orientierung.",
      bubble: "Kein Urteil – nur ein Kompass.",
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
      q: "Möchtest du einen kurzen Satz ergänzen?",
      sub: "Optional. Nur wenn du willst.",
      bubble: "Du bestimmst, wie viel du teilst.",
      key: "notes",
      optional: true,
      placeholder: "z. B. „Ich komme abends nicht runter“",
    },
    {
      id: "result",
      type: "result",
      q: "Deine Kompass-Orientierung",
      sub: "Keine Diagnose – eine klare Einordnung.",
      bubble: "Gut gemacht. Jetzt hast du Klarheit.",
    },
  ];

  // ---------- Progress ----------
  function updateProgress() {
    stepNowEl.textContent = String(stepIndex + 1);
    stepMaxEl.textContent = String(steps.length);
    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    fill.style.width = `${clamp(pct, 0, 100)}%`;
    dotsWrap.innerHTML = "";
    steps.forEach((_, i) => {
      const dot = document.createElement("span");
      if (i === stepIndex) dot.classList.add("active");
      dotsWrap.appendChild(dot);
    });
  }

  // ---------- Bubble ----------
  function setBubble(text) {
    if (bubbleText) bubbleText.textContent = text;
  }

  // ---------- Validation ----------
  function canGoNext() {
    const step = steps[stepIndex];
    if (step.type === "result") return true;
    if (step.type === "text") return step.optional || (answers[step.key] || "").trim();
    return Boolean(answers[step.key]);
  }

  // ---------- Render ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "");

    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    btnNext.textContent = step.type === "result" ? "Fertig" : "Weiter";
    btnNext.disabled = !canGoNext();

    stage.innerHTML = "";

    const q = document.createElement("div");
    q.className = "k-question";
    q.textContent = step.q;

    const sub = document.createElement("div");
    sub.className = "k-sub";
    sub.textContent = step.sub;

    stage.append(q, sub);

    if (step.type === "cards") {
      const wrap = document.createElement("div");
      wrap.className = "k-cards";
      step.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "k-card-btn";
        btn.innerHTML = `<div class="t">${opt.t}</div><div class="d">${opt.d}</div>`;
        if (answers[step.key] === opt.v) btn.classList.add("selected");
        btn.onclick = () => {
          answers[step.key] = opt.v;
          [...wrap.children].forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          btnNext.disabled = false;
        };
        wrap.appendChild(btn);
      });
      stage.appendChild(wrap);
    }

    if (step.type === "text") {
      const ta = document.createElement("textarea");
      ta.className = "k-input";
      ta.placeholder = step.placeholder || "";
      ta.value = answers[step.key] || "";
      ta.oninput = () => {
        answers[step.key] = ta.value;
        btnNext.disabled = !canGoNext();
      };
      stage.appendChild(ta);
    }

    if (step.type === "result") {
      const box = document.createElement("div");
      box.className = "k-result";
      box.innerHTML = `
        <div class="k-result-title">Orientierung abgeschlossen</div>
        <div class="k-result-text">
          Du kannst nun entscheiden, ob du den nächsten Schritt gehen möchtest.
        </div>
        <a class="k-result-btn primary" href="weiterleitung.html">
          Diskret weiter
        </a>
        <div class="k-result-legal">
          Hinweis: Orientierung, keine Diagnose.
        </div>
      `;
      stage.appendChild(box);
    }
  }

  // ---------- Navigation ----------
  btnNext.onclick = () => {
    if (!canGoNext()) return;
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      renderStep();
    }
  };

  btnPrev.onclick = () => {
    if (stepIndex > 0) {
      stepIndex--;
      renderStep();
    }
  };

  // ---------- Init ----------
  renderStep();
})();
