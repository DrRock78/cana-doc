(() => {
  /* ============================
     Helpers
  ============================ */
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const nowISO = () => new Date().toISOString();

  /* ============================
     D5: Privacy-first Tracking (NO free text)
     - logs only: step changes, button clicks, selected options, ampel status
     - stores locally (localStorage), capped
  ============================ */
  const TRACK_KEY = "canadoc_kompass_log_v1";
  const sessionId = (() => {
    const k = "canadoc_kompass_session_v1";
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const id = Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
    sessionStorage.setItem(k, id);
    return id;
  })();

  function track(event, data = {}) {
    // Whitelist only safe fields (no notes/freetext)
    const safe = {
      ts: nowISO(),
      sessionId,
      event,
      stepId: data.stepId ?? null,
      stepIndex: typeof data.stepIndex === "number" ? data.stepIndex : null,
      ampel: data.ampel ?? null,
      goal: data.goal ?? null,
      timeframe: data.timeframe ?? null,
      impact: data.impact ?? null,
      action: data.action ?? null,
    };

    try {
      const arr = JSON.parse(localStorage.getItem(TRACK_KEY) || "[]");
      arr.push(safe);
      // Cap size
      const capped = arr.slice(-200);
      localStorage.setItem(TRACK_KEY, JSON.stringify(capped));
    } catch {
      /* ignore */
    }
  }

  /* ============================
     DOM
  ============================ */
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction");

  // D4 Ampel
  const ampelDot = $("kAmpelDot");
  const ampelText = $("kAmpelText");

  /* ============================
     State
  ============================ */
  const answers = {
    goal: null,
    timeframe: null,
    impact: null,
    notes: "",
  };

  let stepIndex = 0;

  /* ============================
     Steps (keine Diagnose, reine Orientierung)
  ============================ */
  const steps = [
    {
      id: "start",
      type: "intro",
      q: "Kompass starten",
      sub: "60 Sekunden – dann hast du Orientierung. Diskret. Ohne Registrierung.",
      bubble: "Wir gehen Schritt für Schritt. Du behältst die Kontrolle.",
    },
    {
      id: "goal",
      type: "cards",
      q: "Worum geht es dir heute am ehesten?",
      sub: "Wähle das, was am besten passt.",
      bubble: "Sag mir kurz die Richtung – ich halte es klar und ruhig.",
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
      sub: "Der Zeitraum hilft, die Lage besser einzuordnen.",
      bubble: "Nur grob reicht. Wir brauchen keine Perfektion.",
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
      sub: "Kein Urteil – nur ein Marker.",
      bubble: "Du wirst hier nicht bewertet. Nur orientiert.",
      key: "impact",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie" },
        { v: "high", t: "Stark", d: "belastet deutlich" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Wenn du magst: ein Satz Kontext.",
      sub: "Optional. Teile nur, was für dich passt.",
      bubble: "Nur so viel, wie du willst. Ein Satz reicht.",
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

  /* ============================
     Progress UI
  ============================ */
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

    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    fill.style.width = `${clamp(pct, 0, 100)}%`;
    renderDots();

    track("progress", {
      stepId: steps[stepIndex].id,
      stepIndex,
      ampel: currentAmpel(),
      goal: answers.goal,
      timeframe: answers.timeframe,
      impact: answers.impact,
    });
  }

  function setBubble(text) {
    bubbleText.textContent = text;
  }

  function thumbsUp() {
    reaction.classList.add("show");
    setTimeout(() => reaction.classList.remove("show"), 650);
  }

  function canGoNext() {
    const step = steps[stepIndex];
    if (step.type === "intro" || step.type === "result") return true;

    const key = step.key;
    const val = answers[key];

    if (step.type === "text") return true; // optional by design
    if (step.type === "cards") return Boolean(val);

    return true;
  }

  /* ============================
     D4: Ampel Logic
     - red: self-harm phrases
     - yellow: high impact OR high emotional distress
     - green: otherwise
  ============================ */
  function analyzeFreeText(text = "") {
    const t = String(text || "").toLowerCase();

    // RED: direct self-harm / suicide phrases
    const redPatterns = [
      /selbstmord|suizid|mich umbringen|mich töten|will sterben/,
      /ich .* (bringe mich um|töte mich)/,
      /wenn .* dann .* (sterbe|selbstmord|umbringen)/,
    ];

    // YELLOW: heavy distress (not suicidal)
    const yellowPatterns = [
      /verzweifelt|halte es kaum aus|weiß nicht weiter|panik|zusammenbruch|am ende/,
      /ich kann nicht mehr|es überfordert mich|zu viel/,
    ];

    if (redPatterns.some(r => r.test(t))) return "red";
    if (yellowPatterns.some(r => r.test(t))) return "yellow";
    return "green";
  }

  function currentAmpel() {
    const textAmp = analyzeFreeText(answers.notes || "");
    if (textAmp === "red") return "red";

    // If impact is high -> yellow (unless red)
    if (answers.impact === "high") return "yellow";

    // If months+ and mid/high -> yellow-ish
    if (answers.timeframe === "months" && (answers.impact === "mid" || answers.impact === "high")) return "yellow";

    return "green";
  }

  function applyAmpelUI() {
    const a = currentAmpel();

    // dot classes
    ampelDot.classList.remove("is-green", "is-yellow", "is-red");
    ampelDot.classList.add(a === "red" ? "is-red" : a === "yellow" ? "is-yellow" : "is-green");

    // text (CanaDoc tone)
    if (a === "red") ampelText.textContent = "Wichtig: Sprich jetzt mit einem Menschen.";
    else if (a === "yellow") ampelText.textContent = "Wir nehmen das ernst. Schritt für Schritt.";
    else ampelText.textContent = "Alles ruhig.";

    track("ampel", {
      stepId: steps[stepIndex].id,
      stepIndex,
      ampel: a,
      goal: answers.goal,
      timeframe: answers.timeframe,
      impact: answers.impact,
    });
  }

  /* ============================
     D3: Copy & Result Logic
     - Always offers doctor conversation / telemedicine path
     - No diagnosis
     - If user asks “Cannabis Rezept” etc in freetext: handle respectfully, route to doctor
     - Illegal acquisition mention -> calm deterrence + still doctor route
  ============================ */
  function includesCannabisInterest(text = "") {
    const t = String(text || "").toLowerCase();
    return /cannabis|thc|gras|weed|rezept/i.test(t);
  }

  function includesIllegalPurchase(text = "") {
    const t = String(text || "").toLowerCase();
    return /bahnhof|dealer|straße kaufen|illegal|schwarzmarkt/i.test(t);
  }

  function buildResult() {
    const a = currentAmpel();
    const notes = String(answers.notes || "");
    const wantsCannabis = includesCannabisInterest(notes);
    const mentionsIllegal = includesIllegalPurchase(notes);

    // Core result copy (D3 tone)
    let title = "Orientierung abgeschlossen.";
    let body =
      "Wenn du willst, kannst du jetzt den nächsten Schritt gehen und ein ärztliches Gespräch nutzen. " +
      "CanaDoc begleitet nur bis zur Orientierung – die Entscheidung trifft ein Arzt.";
    let ctaPrimary = "Zum Arztgespräch";
    let ctaSecondary = "Telemedizin nutzen";

    // Tune by goal (soft personalization)
    if (answers.goal === "sleep") {
      title = "Schlaf: wir ordnen das ein.";
      body =
        "Wenn Schlaf dich gerade aus dem Takt bringt, ist ein ärztliches Gespräch oft der sauberste Weg, " +
        "um Ursachen, Risiken und Optionen zu klären – diskret und strukturiert.";
    }
    if (answers.goal === "stress") {
      title = "Stress: wir bringen Ruhe in die Lage.";
      body =
        "Wenn Druck und Gedankenkarussell dominieren, kann ein ärztliches Gespräch helfen, " +
        "Optionen und nächste Schritte fundiert zu sortieren – ohne Chaos, ohne Drama.";
    }
    if (answers.goal === "pain") {
      title = "Beschwerden: wir klären den nächsten Schritt.";
      body =
        "Bei Beschwerden ist ärztliche Einordnung sinnvoll – damit Risiken, Alternativen und das weitere Vorgehen sauber geklärt werden.";
    }

    // Cannabis interest: never promise, always doctor decides
    if (wantsCannabis) {
      title = "Medizinische Optionen: ärztlich klären.";
      body =
        "Wenn du dich zu medizinischen Optionen informieren möchtest: Das entscheidet ein Arzt nach Eignung und Situation. " +
        "Du kannst jetzt diskret ein ärztliches Gespräch nutzen und es dort offen ansprechen.";
    }

    // Illegal mention: discourage + route to doctor
    if (mentionsIllegal) {
      title = "Wichtig: bleib auf dem legalen Weg.";
      body =
        "Ich kann keine illegalen Wege unterstützen. Wenn du medizinische Fragen oder einen Wunsch hast, " +
        "sprich bitte mit einem Arzt – dort wird legal und fachlich geprüft, was sinnvoll ist.";
    }

    // Red amp: crisis copy + emergency resources + still provide doctor route
    const crisisBlock = (a === "red") ? `
      <div class="k-result-legal small">
        Wenn du dich gerade nicht sicher fühlst: Es ist wichtig, jetzt mit einem Menschen zu sprechen.<br>
        TelefonSeelsorge <b>116 123</b> · Notfall <b>112</b>
      </div>
    ` : "";

    const box = document.createElement("div");
    box.className = "k-result";
    box.innerHTML = `
      <div class="k-result-title">${escapeHTML(title)}</div>
      <div class="k-result-text">${escapeHTML(body)}</div>

      <div class="k-result-actions">
        <a class="k-result-btn primary" id="ctaDoctor" href="weiterleitung.html">${escapeHTML(ctaPrimary)}</a>
        <a class="k-result-btn ghost" id="ctaTele" href="weiterleitung.html">${escapeHTML(ctaSecondary)}</a>
        <button class="k-result-btn ghost" id="copySummary" type="button">Zusammenfassung kopieren</button>
        <button class="k-result-btn ghost" id="exportLog" type="button">Protokoll exportieren</button>
      </div>

      ${crisisBlock}

      <div class="k-result-legal">
        Hinweis: Orientierung, keine Diagnose. Die medizinische Entscheidung trifft ein Arzt.
      </div>
    `;

    // Copy summary (safe)
    box.querySelector("#copySummary").addEventListener("click", async () => {
      const text = buildSummaryText();
      track("action", { action: "copy_summary", ampel: a, goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
      try {
        await navigator.clipboard.writeText(text);
        setBubble("Kopiert. Sauber.");
        thumbsUp();
      } catch {
        setBubble("Kopieren ging nicht – aber du siehst alles hier.");
      }
    });

    // Export log (D5) – download JSON
    box.querySelector("#exportLog").addEventListener("click", () => {
      track("action", { action: "export_log", ampel: a, goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
      const log = localStorage.getItem(TRACK_KEY) || "[]";
      const blob = new Blob([log], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url;
      aEl.download = "canadoc-kompass-protokoll.json";
      document.body.appendChild(aEl);
      aEl.click();
      aEl.remove();
      URL.revokeObjectURL(url);
      setBubble("Protokoll exportiert.");
      thumbsUp();
    });

    // Track CTAs
    box.querySelector("#ctaDoctor").addEventListener("click", () => {
      track("action", { action: "cta_doctor", ampel: a, goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
    });
    box.querySelector("#ctaTele").addEventListener("click", () => {
      track("action", { action: "cta_telemedicine", ampel: a, goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
    });

    return box;
  }

  function buildSummaryText() {
    const lines = [
      "CanaDoc – Kompass-Zusammenfassung",
      `Fokus: ${labelGoal(answers.goal)}`,
      `Zeitraum: ${labelTime(answers.timeframe)}`,
      `Alltag: ${labelImpact(answers.impact)}`,
      "",
      "Hinweis: Orientierung, keine Diagnose. Die medizinische Entscheidung trifft ein Arzt.",
    ];
    return lines.join("\n");
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

  function escapeHTML(s){
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  /* ============================
     Render Step
  ============================ */
  function renderStep() {
    const step = steps[stepIndex];

    updateProgress();
    setBubble(step.bubble || "Ich bin da.");
    applyAmpelUI();

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
      // One clean start button (no duplicate container text)
      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className = "k-card-btn selected";
      startBtn.innerHTML = `<div class="t">Los geht’s</div><div class="d">60 Sekunden – dann hast du Orientierung.</div>`;
      startBtn.addEventListener("click", () => {
        track("action", { action: "start", stepId: step.id, stepIndex, ampel: currentAmpel() });
        thumbsUp();
        next();
      });
      wrap.appendChild(startBtn);
    }

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach(opt => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "k-card-btn";
        b.innerHTML = `<div class="t">${opt.t}</div><div class="d">${opt.d}</div>`;

        b.addEventListener("click", () => {
          answers[step.key] = opt.v;

          [...cards.querySelectorAll(".k-card-btn")].forEach(x => x.classList.remove("selected"));
          b.classList.add("selected");

          btnNext.disabled = !canGoNext();

          applyAmpelUI();
          thumbsUp();

          track("select", {
            action: `select_${step.key}:${opt.v}`,
            stepId: step.id,
            stepIndex,
            ampel: currentAmpel(),
            goal: answers.goal,
            timeframe: answers.timeframe,
            impact: answers.impact
          });
        });

        if (answers[step.key] === opt.v) b.classList.add("selected");
        cards.appendChild(b);
      });

      wrap.appendChild(cards);
    }

    if (step.type === "text") {
      const ta = document.createElement("textarea");
      ta.className = "k-input";
      ta.placeholder = step.placeholder || "";
      ta.value = answers.notes || "";
      ta.rows = 4;

      ta.addEventListener("input", () => {
        answers.notes = ta.value;

        // D4: Ampel live updaten – aber NICHT loggen den Text
        applyAmpelUI();

        track("input", {
          action: "notes_changed",
          stepId: step.id,
          stepIndex,
          ampel: currentAmpel(),
          goal: answers.goal,
          timeframe: answers.timeframe,
          impact: answers.impact
        });
      });

      wrap.appendChild(ta);
    }

    if (step.type === "result") {
      wrap.appendChild(buildResult());
    }

    stage.appendChild(wrap);
  }

  /* ============================
     Navigation
  ============================ */
  function next() {
    const step = steps[stepIndex];

    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    if (step.type === "result") {
      // Finish -> back to start (oder später: Dankeseite)
      track("action", { action: "finish", stepId: step.id, stepIndex, ampel: currentAmpel(), goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
      window.location.href = "index.html";
      return;
    }

    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    thumbsUp();
    renderStep();
  }

  function prev() {
    stepIndex = Math.max(stepIndex - 1, 0);
    renderStep();
  }

  btnNext.addEventListener("click", () => {
    track("action", { action: "next", stepId: steps[stepIndex].id, stepIndex, ampel: currentAmpel(), goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
    next();
  });

  btnPrev.addEventListener("click", () => {
    track("action", { action: "prev", stepId: steps[stepIndex].id, stepIndex, ampel: currentAmpel(), goal: answers.goal, timeframe: answers.timeframe, impact: answers.impact });
    prev();
  });

  /* ============================
     Init
  ============================ */
  track("init", { stepId: steps[0].id, stepIndex: 0, ampel: currentAmpel() });
  renderStep();
})();
