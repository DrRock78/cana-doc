(() => {
  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(s = "") {
    return String(s).toLowerCase().trim();
  }

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

  // ---------- Steps (6) ----------
  const steps = [
    {
      id: "start",
      type: "intro",
      q: "Los geht’s.",
      sub: "60 Sekunden, dann hast du Orientierung. Keine Registrierung. Nur notwendige Angaben.",
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
      q: "Ein Satz – damit ich dich besser einordnen kann.",
      sub: "Optional. Keine sensiblen Details, wenn du das nicht möchtest.",
      bubble: "Du gibst nur so viel preis, wie du willst. Wirklich.",
      key: "notes",
      placeholder: "z. B. „Ich wache nachts oft auf“ oder „Abends komme ich nicht runter“ …",
      optional: true,
    },
    {
      id: "result",
      type: "result",
      q: "Deine Kompass-Orientierung",
      sub: "Das ist eine Orientierung – keine Diagnose.",
      bubble: "Stark. Du hast Klarheit geschaffen. Jetzt entscheiden wir sauber den nächsten Schritt.",
    },
  ];

  // ---------- Dots ----------
  function renderDots() {
    dotsWrap.innerHTML = "";
    for (let i = 0; i < steps.length; i++) {
      const dot = document.createElement("span");
      if (i === stepIndex) dot.classList.add("active");
      dotsWrap.appendChild(dot);
    }
  }

  // ---------- Progress ----------
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

  // ---------- Intent & Safety Detection ----------
  function detectFlags(notesRaw = "") {
    const t = norm(notesRaw);

    // Selbstgefährdung / Suizid
    const selfHarm = /(selbstmord|suizid|umbringen|mich töten|ich töte mich|ich bringe mich um|nicht mehr leben|von einer brücke|spring(en)?|leben beenden)/i.test(t);

    // Illegale Beschaffung / Bahnhof / Dealer etc.
    const illegalDrug = /(bahnhof|dealer|deal|straß(en)?|auf der straße|schwarzmarkt|illegal|afrikaner.*cannabis|kaufen.*cannabis.*bahnhof)/i.test(t);

    // Cannabis / Rezept / Telemedizin
    const cannabis = /(cannabis|thc|gras|weed|slurricane|medizinisch(es)? cannabis|cannabis auf rezept|rezept.*cannabis)/i.test(t);
    const telemed = /(telemedizin|telemediziner|online arzt|arzt online|videoarzt|doktorabc|doctorabc|dr\.?\s?abc)/i.test(t);

    // Medikamenten-/Rezept-Frage allgemein
    const prescription = /(rezept|verschreibung|verordnung|medikament|medikamente)/i.test(t);

    return { selfHarm, illegalDrug, cannabis, telemed, prescription };
  }

  function storePayload(extra = {}) {
    try {
      const payload = {
        goal: answers.goal || "",
        timeframe: answers.timeframe || "",
        impact: answers.impact || "",
        notes: answers.notes || "",
        createdAt: new Date().toISOString(),
        ...extra,
      };
      sessionStorage.setItem("canadoc_compass", JSON.stringify(payload));
    } catch {}
  }

  // ---------- Render Step ----------
  function renderStep() {
    const step = steps[stepIndex];
    updateProgress();
    setBubble(step.bubble || "Ich bin da.");

    // Buttons
    btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";

    if (step.type === "intro") {
      btnNext.textContent = "Kompass starten";
    } else if (step.type === "result") {
      btnNext.textContent = "Fertig";
    } else {
      btnNext.textContent = "Weiter";
    }

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

    // Intro: NUR EIN Element -> keine Dopplung
    if (step.type === "intro") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      const startBtn = mkCard(
        "Kompass starten",
        "60 Sekunden – dann hast du Orientierung.",
        () => {
          thumbsUp();
          next();
        }
      );
      startBtn.classList.add("selected");

      cards.appendChild(startBtn);
      wrap.appendChild(cards);
    }

    if (step.type === "cards") {
      const cards = document.createElement("div");
      cards.className = "k-cards";

      step.options.forEach((opt) => {
        const el = mkCard(opt.t, opt.d, () => {
          answers[step.key] = opt.v;
          [...cards.querySelectorAll(".k-card-btn")].forEach((b) => b.classList.remove("selected"));
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
      wrap.appendChild(buildResultOrSafety());
    }

    stage.appendChild(wrap);
  }

  function mkCard(title, desc, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "k-card-btn";
    btn.innerHTML = `<div class="t">${escapeHtml(title)}</div><div class="d">${escapeHtml(desc)}</div>`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ---------- Result + Safety ----------
  function buildResultOrSafety() {
    const notes = answers.notes || "";
    const flags = detectFlags(notes);

    // 1) Selbstgefährdung -> Safety Card
    if (flags.selfHarm) {
      storePayload({ theme: "safety", severity: "high" });
      return buildSafetyCard(notes);
    }

    // 2) Illegale Beschaffung -> klare, ruhige Umleitung auf legal/ärztlich
    if (flags.illegalDrug) {
      storePayload({ theme: "illegal_intent", severity: "medium" });
      return buildIllegalCard(notes);
    }

    // 3) Standard Ergebnis (aber individualisiert nach intent)
    storePayload({ theme: "standard", severity: "low" });
    return buildResultCard(notes, flags);
  }

  function buildSafetyCard(notes) {
    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">Wichtiger Hinweis</div>
        <div class="k-needle" aria-hidden="true">🛟</div>
      </div>

      <div class="k-result-title">Ich nehme dich ernst.</div>

      <div class="k-result-text">
        Wenn Gedanken auftauchen, dir selbst etwas anzutun, ist das ein Signal:
        <strong>Du brauchst jetzt menschliche Unterstützung.</strong>
        Wir stellen keine Diagnosen – aber wir helfen dir, den richtigen nächsten Schritt zu wählen.
      </div>

      ${notes ? `<div class="k-quote">Dein Satz: „${escapeHtml(notes)}“</div>` : ""}

      <div class="k-result-mini">
        <div><span>TelefonSeelsorge (24/7):</span> 0800 111 0 111 / 0800 111 0 222</div>
        <div><span>Akut / Gefahr:</span> 112</div>
      </div>

      <div class="k-result-actions">
        <a class="k-result-btn primary" href="tel:112">112 anrufen</a>
        <a class="k-result-btn ghost" href="tel:08001110111">TelefonSeelsorge anrufen</a>
        <a class="k-result-btn ghost" href="weiterleitung.html">Ärztliche Abklärung starten</a>
      </div>

      <div class="k-result-legal">
        Hinweis: Bei akuter Gefahr bitte 112. Ärztliche Abklärung ersetzt keine Notfallhilfe.
      </div>
    `;
    return box;
  }

  function buildIllegalCard(notes) {
    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">Hinweis</div>
        <div class="k-needle" aria-hidden="true">🧭</div>
      </div>

      <div class="k-result-title">Ich kann dir dabei nicht helfen.</div>

      <div class="k-result-text">
        Wenn es um den Kauf von Substanzen außerhalb legaler Wege geht, kann ich keine Anleitung geben.
        <strong>Wenn du medizinische Hilfe suchst</strong>, ist der saubere Weg: ärztliche Abklärung über Telemedizin.
      </div>

      ${notes ? `<div class="k-quote">Dein Satz: „${escapeHtml(notes)}“</div>` : ""}

      <div class="k-result-actions">
        <a class="k-result-btn primary" href="weiterleitung.html">Ärztliche Abklärung starten</a>
        <button class="k-result-btn ghost" id="saveCopy" type="button">Zusammenfassung kopieren</button>
      </div>

      <div class="k-result-legal">
        Hinweis: Orientierung, keine Diagnose.
      </div>
    `;

    box.querySelector("#saveCopy")?.addEventListener("click", async () => {
      const text = buildSummaryText(answers.goal, answers.timeframe, answers.impact, notes);
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

  function buildResultCard(notes, flags) {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";

    // Grundlogik (Orientierung, nicht medizinisch)
    let headline = "Orientierung: ein nächster Schritt kann sinnvoll sein.";
    let note = "Wenn du möchtest, kannst du das Thema ärztlich abklären lassen – diskret und nachvollziehbar.";
    let cta = "Abklärung starten";

    if (impact === "low" && timeframe === "days") {
      headline = `Orientierung: beobachte es kurz – und handle bewusst.`;
      note = "Wenn es bleibt oder sich verschlechtert, ist ärztliche Abklärung sinnvoll.";
      cta = "Optionen ansehen";
    }
    if (impact === "high" || timeframe === "months") {
      headline = "Orientierung: ärztliche Abklärung ist empfehlenswert.";
      note = "Bei starker oder langer Belastung ist professionelle Abklärung oft der sauberste Weg.";
      cta = "Abklärung starten";
    }

    // Individualisierung nach Freitext-Intent (Telemedizin/Cannabis/Rezept)
    if (flags?.telemed) {
      headline = "Orientierung: du willst ärztlich (telemedizinisch) abklären – das ist der richtige Weg.";
      note = "Wir stellen keine Diagnosen. Für medizinische Entscheidungen ist ein Arztgespräch der saubere nächste Schritt.";
      cta = "Telemedizin starten";
    } else if (flags?.cannabis || (flags?.prescription && /cannabis|thc/i.test(norm(notes)))) {
      headline = "Orientierung: wenn es um medizinisches Cannabis geht, entscheidet das ärztliche Gespräch.";
      note = "Wir stellen keine Diagnosen. Wenn du das Thema medizinisch prüfen lassen willst, ist Telemedizin der korrekte Weg.";
      cta = "Ärztlich prüfen lassen";
    } else if (flags?.prescription) {
      headline = "Orientierung: bei Rezept-Fragen ist ärztliche Abklärung der saubere Weg.";
      note = "Wir können dir Orientierung geben – die Entscheidung über Behandlung/Rezept liegt bei Ärztinnen und Ärzten.";
      cta = "Ärztlich abklären";
    }

    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">Digitaler Kompass</div>
        <div class="k-needle" aria-hidden="true">🧭</div>
      </div>

      <div class="k-result-title">${escapeHtml(headline)}</div>
      <div class="k-result-text">${escapeHtml(note)}</div>

      ${notes ? `<div class="k-quote">Dein Satz: „${escapeHtml(notes)}“</div>` : ""}

      <div class="k-result-mini">
        <div><span>Fokus:</span> ${escapeHtml(labelGoal(goal))}</div>
        <div><span>Zeitraum:</span> ${escapeHtml(labelTime(timeframe))}</div>
        <div><span>Alltag:</span> ${escapeHtml(labelImpact(impact))}</div>
      </div>

      <div class="k-result-actions">
        <a class="k-result-btn primary" id="goPartner" href="weiterleitung.html">${escapeHtml(cta)}</a>
        <button class="k-result-btn ghost" id="saveCopy" type="button">Zusammenfassung kopieren</button>
      </div>

      <div class="k-result-legal">
        Hinweis: Dies ist eine Orientierung und ersetzt keine ärztliche Behandlung.
      </div>
    `;

    box.querySelector("#saveCopy")?.addEventListener("click", async () => {
      const text = buildSummaryText(goal, timeframe, impact, notes);
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
    ]
      .filter(Boolean)
      .join("\n");
  }

  function labelGoal(v) {
    return ({
      sleep: "Schlaf & Erholung",
      stress: "Stress & Anspannung",
      pain: "Körperliche Beschwerden",
      other: "Allgemeine Orientierung",
    }[v] || "Allgemeine Orientierung");
  }
  function labelTime(v) {
    return ({
      days: "seit Tagen",
      weeks: "seit Wochen",
      months: "seit Monaten+",
    }[v] || "seit Wochen");
  }
  function labelImpact(v) {
    return ({
      low: "leicht",
      mid: "mittel",
      high: "stark",
    }[v] || "mittel");
  }

  // ---------- Navigation ----------
  function next() {
    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    if (stepIndex >= steps.length - 1) {
      // Finish: sauber zurück zur Startseite
      window.location.href = "index.html";
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
  btnNext?.addEventListener("click", next);
  btnPrev?.addEventListener("click", prev);

  stage?.addEventListener("click", () => {
    btnNext.disabled = !canGoNext();
  });

  // ---------- Minimal Result Styling (falls nicht in CSS vorhanden) ----------
  const style = document.createElement("style");
  style.textContent = `
    .k-result{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;background:rgba(0,0,0,.35);box-shadow:0 0 22px rgba(0,255,154,.10)}
    .k-result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .k-badge{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,255,154,.95)}
    .k-result-title{font-size:18px;font-weight:800;margin:6px 0 10px;line-height:1.2}
    .k-result-text{color:rgba(255,255,255,.78);font-size:14px;line-height:1.5}
    .k-quote{margin-top:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);border-radius:999px;padding:10px 12px;color:rgba(255,255,255,.88);font-size:13px}
    .k-result-mini{margin-top:12px;color:rgba(255,255,255,.70);font-size:13px;display:grid;gap:6px}
    .k-result-mini span{color:rgba(255,255,255,.52)}
    .k-result-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .k-result-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:999px;font-weight:800;text-decoration:none;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff}
    .k-result-btn.primary{background:#00ff9a;color:#000;border:none;box-shadow:0 0 20px rgba(0,255,154,.25)}
    .k-result-legal{margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)}
    .k-reaction.show{opacity:1;transform:translateY(0)}
  `;
  document.head.appendChild(style);

  // ---------- Init ----------
  renderStep();
})();
