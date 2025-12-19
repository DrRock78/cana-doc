(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
        { v: "mid", t: "Mittel", d: "kostet Energie / nervt" },
        { v: "high", t: "Stark", d: "belastet deutlich (Tag/Job/Familie)" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Wenn du magst: ein Satz dazu.",
      sub: "Optional. Keine sensiblen Details, wenn du das nicht möchtest.",
      bubble: "Ein Satz reicht. Du behältst die Kontrolle.",
      key: "notes",
      placeholder: "z. B. „Abends komme ich nicht runter“ oder „Ich wache nachts oft auf“ …",
      optional: true,
    },
    {
      id: "result",
      type: "result",
      q: "Deine Orientierung",
      sub: "Das ist eine Einordnung – keine Diagnose.",
      bubble: "Gut. Jetzt ist der nächste Schritt klar.",
    },
  ];

  // ---------- Progress ----------
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
  function mkCard(title, desc, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-card-btn";
    btn.innerHTML = `<div class="t">${escapeHtml(title)}</div><div class="d">${escapeHtml(desc)}</div>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Render Step ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "Ich bin da.");

    // Buttons
    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    btnNext.textContent = step.type === "result" ? "Fertig" : "Weiter";
    btnNext.disabled = isTransitioning || !canGoNext();

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

    // INTRO: kein extra Container mehr (dein Wunsch)
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

          btnNext.disabled = isTransitioning || !canGoNext();
          setBubble(step.bubble || "Okay.");
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
        btnNext.disabled = isTransitioning || !canGoNext();
      });

      wrap.appendChild(input);

      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Tipp: Ein Satz reicht. Wenn du dich nicht sicher fühlst, sprich bitte sofort mit einem Menschen.";
      wrap.appendChild(hint);
    }

    // RESULT
    if (step.type === "result") {
      wrap.appendChild(buildResultCard());
    }

    stage.appendChild(wrap);
  }

  // ---------- Safety / intent detection ----------
  function detectSignals(textRaw) {
    const text = (textRaw || "").toLowerCase();

    // High-risk self-harm / suicide
    const selfHarm =
      /selbstmord|suizid|umbringen|mich töten|mein leben nehmen|brücke|springen|will nicht mehr|nicht mehr leben/.test(text);

    // explicit cannabis / prescription intent (neutral handling)
    const cannabis =
      /cannabis|thc|gras|weed|joint|blüte|rezept|auf rezept|medizinisch(es)? cannabis|telemedizin(er)?/.test(text);

    return { selfHarm, cannabis };
  }

  // ---------- Result Logic ----------
  function buildResultCard() {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";
    const notes = answers.notes || "";

    const sig = detectSignals(notes);

    // Default orientation message
    let headline = "Orientierung abgeschlossen.";
    let note =
      "Du kannst jetzt entscheiden, ob du den nächsten Schritt gehen möchtest. Für medizinische Entscheidungen ist ein Arzt zuständig.";
    let badge = "Digitaler Kompass";
    let tone = "ok"; // ok | warn

    // More specific tone (still non-diagnostic)
    if (impact === "high" || timeframe === "months") {
      note =
        "Wenn es dich stark oder lange belastet, ist ein ärztliches Gespräch der sauberste nächste Schritt. Ich begleite dich nur bis zur Orientierung.";
    } else if (impact === "low" && timeframe === "days") {
      note =
        "Wenn es neu und leicht ist: beobachte es bewusst. Wenn es bleibt oder stärker wird, ist ein ärztliches Gespräch sinnvoll.";
    }

    // Cannabis intent: allow telemedicine option without promising outcome
    if (sig.cannabis) {
      note =
        "Wenn du dich über medizinische Optionen informieren möchtest: Ein Arzt klärt Eignung, Risiken, Alternativen und die rechtlich saubere Dokumentation. Ich begleite dich bis zur Orientierung – die Entscheidung trifft der Arzt.";
    }

    // Self-harm: strong support message + emergency options + still allow doctor consult (secondary)
    if (sig.selfHarm) {
      tone = "warn";
      badge = "Wichtiger Hinweis";
      headline = "Bitte hol dir jetzt Unterstützung.";
      note =
        "Wenn du dich gerade nicht sicher fühlst: Es ist wichtig, jetzt mit einem Menschen zu sprechen. Du musst da nicht alleine durch.";
    }

    const box = document.createElement("div");
    box.className = `k-result ${tone === "warn" ? "k-result-warn" : ""}`;

    // Only ONE CTA (dein Wunsch) – zum Arztgespräch (DoctorABC).
    // Bei Self-Harm zeigen wir zusätzlich eine Hilfekarte (Text + Nummern), aber CTA bleibt Arztgespräch.
    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">${escapeHtml(badge)}</div>
        <div class="k-needle" aria-hidden="true">🧭</div>
      </div>

      <div class="k-result-title">${escapeHtml(headline)}</div>
      <div class="k-result-text">${escapeHtml(note)}</div>

      ${
        sig.selfHarm
          ? `
      <div class="k-helpcard" role="note" aria-label="Soforthilfe">
        <div class="k-help-title">Sofort sprechen:</div>
        <div class="k-help-lines">
          <div><strong>TelefonSeelsorge:</strong> 116 123 (kostenfrei, 24/7)</div>
          <div><strong>Notruf:</strong> 112</div>
        </div>
        <div class="k-help-mini">Wenn akute Gefahr besteht, bitte 112 wählen.</div>
      </div>
      `
          : ""
      }

      <div class="k-result-actions">
        <a class="k-result-btn primary" id="goDoctor" href="weiterleitung.html">Zum Arztgespräch</a>
      </div>

      <div class="k-result-legal">
        Hinweis: Dies ist eine Orientierung und ersetzt keine ärztliche Behandlung.
      </div>
    `;

    return box;
  }

  // ---------- Navigation (with 0.3s presence delay) ----------
  async function next() {
    if (isTransitioning) return;

    // guard
    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    isTransitioning = true;
    btnNext.disabled = true;

    // 0.3s “presence”
    thumbsUp();
    await sleep(300);

    // last step -> finish
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
    btnPrev.disabled = true;

    await sleep(150);

    stepIndex--;
    isTransitioning = false;
    renderStep();
  }

  // ---------- Events ----------
  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);

  stage.addEventListener("click", () => {
    btnNext.disabled = isTransitioning || !canGoNext();
  });

  // ---------- Minimal styling injection for result + helpcard ----------
  // (damit es sofort sauber aussieht – ohne CSS anfassen zu müssen)
  const style = document.createElement("style");
  style.textContent = `
    .k-result{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;background:rgba(0,0,0,.35);box-shadow:0 0 22px rgba(0,255,154,.10)}
    .k-result-warn{border-color:rgba(255,60,60,.35);box-shadow:0 0 24px rgba(255,60,60,.12)}
    .k-result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .k-badge{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,255,154,.95)}
    .k-result-warn .k-badge{color:rgba(255,120,120,.95)}
    .k-result-title{font-size:18px;font-weight:800;margin:6px 0 8px}
    .k-result-text{color:rgba(255,255,255,.78);font-size:14px;line-height:1.45}
    .k-result-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .k-result-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:999px;font-weight:800;text-decoration:none;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff}
    .k-result-btn.primary{background:#00ff9a;color:#000;border:none;box-shadow:0 0 20px rgba(0,255,154,.25)}
    .k-result-legal{margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)}
    .k-helpcard{margin-top:12px;border-radius:14px;padding:12px;border:1px solid rgba(255,120,120,.25);background:rgba(255,80,80,.06)}
    .k-help-title{font-weight:900;margin-bottom:6px}
    .k-help-lines{font-size:13px;line-height:1.5;color:rgba(255,255,255,.85)}
    .k-help-mini{margin-top:6px;font-size:12px;color:rgba(255,255,255,.70)}
    .k-hint{margin-top:10px;font-size:12px;color:rgba(255,255,255,.65)}
  `;
  document.head.appendChild(style);

  // ---------- Init ----------
  renderStep();
})();
