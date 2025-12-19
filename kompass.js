(() => {
  "use strict";

  /* =========================
     DOM HELPERS
  ========================= */
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* =========================
     DOM REFERENCES
  ========================= */
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction");

  if (!stage || !btnPrev || !btnNext) return;

  /* =========================
     STATE
  ========================= */
  let stepIndex = 0;
  const answers = {
    goal: "",
    timeframe: "",
    impact: "",
    notes: ""
  };

  /* =========================
     STEPS
  ========================= */
  const steps = [
    {
      type: "intro",
      q: "Kompass starten",
      sub: "In ~60 Sekunden bekommst du Orientierung.",
      bubble: "Ich begleite dich ruhig durch jeden Schritt."
    },
    {
      type: "cards",
      key: "goal",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt.",
      bubble: "Gib mir die Richtung.",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein- oder Durchschlafen, Abendruhe" },
        { v: "stress", t: "Stress & Anspannung", d: "Unruhe, Druck, Gedankenkarussell" },
        { v: "pain", t: "Körperliche Beschwerden", d: "z. B. Verspannung, Schmerz" },
        { v: "other", t: "Allgemeine Orientierung", d: "Ich bin unsicher" }
      ]
    },
    {
      type: "cards",
      key: "timeframe",
      q: "Seit wann beschäftigt dich das?",
      sub: "Grobe Einschätzung reicht.",
      bubble: "Zeit hilft beim Einordnen.",
      options: [
        { v: "days", t: "Ein paar Tage", d: "neu aufgetreten" },
        { v: "weeks", t: "Einige Wochen", d: "zieht sich" },
        { v: "months", t: "Monate oder länger", d: "dauerhaft" }
      ]
    },
    {
      type: "cards",
      key: "impact",
      q: "Wie stark beeinflusst es deinen Alltag?",
      sub: "Keine Bewertung – nur Orientierung.",
      bubble: "Sag mir, wie schwer es wiegt.",
      options: [
        { v: "low", t: "Leicht", d: "handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie" },
        { v: "high", t: "Stark", d: "belastet deutlich" }
      ]
    },
    {
      type: "text",
      key: "notes",
      q: "Möchtest du etwas ergänzen?",
      sub: "Optional. Ein Satz reicht.",
      bubble: "Du bestimmst, wie viel du teilst."
    },
    {
      type: "result",
      q: "Orientierung abgeschlossen",
      sub: "Keine Diagnose. Nächster Schritt möglich.",
      bubble: "Jetzt weißt du, wo du stehst."
    }
  ];

  stepMaxEl.textContent = steps.length;

  /* =========================
     UI HELPERS
  ========================= */
  function setBubble(text) {
    if (bubbleText) bubbleText.textContent = text || "";
  }

  function thumbsUp() {
    if (!reaction) return;
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 600);
  }

  function renderProgress() {
    stepNowEl.textContent = stepIndex + 1;
    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    fill.style.width = clamp(pct, 0, 100) + "%";

    dotsWrap.innerHTML = "";
    steps.forEach((_, i) => {
      const d = document.createElement("span");
      if (i === stepIndex) d.classList.add("active");
      dotsWrap.appendChild(d);
    });
  }

  function canGoNext() {
    const step = steps[stepIndex];
    if (!step.key) return true;
    return !!answers[step.key];
  }

  /* =========================
     RENDER STEP
  ========================= */
  function renderStep() {
    const step = steps[stepIndex];
    renderProgress();
    setBubble(step.bubble);

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

    stage.appendChild(q);
    stage.appendChild(sub);

    if (step.type === "cards") {
      const wrap = document.createElement("div");
      wrap.className = "k-cards";

      step.options.forEach(opt => {
        const b = document.createElement("button");
        b.className = "k-card-btn";
        b.innerHTML = `<div class="t">${opt.t}</div><div class="d">${opt.d}</div>`;
        if (answers[step.key] === opt.v) b.classList.add("selected");

        b.onclick = () => {
          answers[step.key] = opt.v;
          renderStep();
          thumbsUp();
        };

        wrap.appendChild(b);
      });

      stage.appendChild(wrap);
    }

    if (step.type === "text") {
      const ta = document.createElement("textarea");
      ta.className = "k-input";
      ta.rows = 4;
      ta.value = answers.notes || "";
      ta.oninput = () => {
        answers.notes = ta.value.trim();
        btnNext.disabled = false;
      };
      stage.appendChild(ta);
    }

    if (step.type === "result") {
      const box = document.createElement("div");
      box.className = "k-result";
      box.innerHTML = `
        <div class="k-result-title">Orientierung abgeschlossen</div>
        <div class="k-result-text">
          Du kannst jetzt entscheiden, ob du ein ärztliches Gespräch führen möchtest.
        </div>
        <a href="weiterleitung.html" class="k-result-btn primary">
          Zum Arztgespräch
        </a>
        <div class="k-result-legal">
          Hinweis: Dies ist keine Diagnose.
        </div>
      `;
      stage.appendChild(box);
    }
  }

  /* =========================
     NAVIGATION
  ========================= */
  btnNext.onclick = () => {
    if (!canGoNext()) return;
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      renderStep();
    } else {
      window.location.href = "index.html";
    }
  };

  btnPrev.onclick = () => {
    if (stepIndex > 0) {
      stepIndex--;
      renderStep();
    }
  };

  /* =========================
     INIT
  ========================= */
  renderStep();

})();
