(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // ---------- DOM ----------
  const stage = $("kStage");
  const btnPrev = $("kPrev");
  const btnNext = $("kNext");

  const stepNowEl = $("kStepNow");
  const stepMaxEl = $("kStepMax");
  const fill = $("kProgressFill");
  const dotsWrap = $("kDots");

  const bubbleText = $("kBubbleText");
  const reaction = $("kReaction"); // optional, falls vorhanden

  // ---------- State ----------
  const answers = {};
  let stepIndex = 0;

  // ---------- Steps ----------
  // Hinweis: rein orientierend, keine Diagnose.
  const steps = [
    {
      id: "intro",
      type: "intro",
      q: "Ich bin CanaDoc.",
      sub:
        "Ich begleite dich diskret – in wenigen Schritten zur Orientierung. " +
        "Keine Registrierung. Nur notwendige Angaben.",
      bubble: "Wir machen das ruhig & klar. Ich bin an deiner Seite.",
    },
    {
      id: "goal",
      type: "cards",
      q: "Was ist heute dein Schwerpunkt?",
      sub: "Wähle den Punkt, der am besten passt. Du kannst später ergänzen.",
      bubble: "Sag mir kurz die Richtung – dann führe ich dich sauber durch.",
      key: "goal",
      options: [
        { v: "sleep", t: "Schlaf & Erholung", d: "Ein-/Durchschlafen, Erholung, Abendruhe" },
        { v: "stress", t: "Stress & Anspannung", d: "Unruhe, Druck, Gedankenkarussell" },
        { v: "pain", t: "Körperliche Beschwerden", d: "z. B. Verspannung, Schmerz, Belastung" },
        { v: "other", t: "Allgemeine Orientierung", d: "Ich will Klarheit für den nächsten Schritt" },
      ],
    },
    {
      id: "timeframe",
      type: "cards",
      q: "Seit wann beschäftigt dich das Thema?",
      sub: "Der Zeitraum hilft, die Situation besser einzuordnen.",
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
      sub: "Keine Bewertung – nur ein Marker für den Kompass.",
      bubble: "Hier geht’s um Orientierung, nicht um Urteil.",
      key: "impact",
      options: [
        { v: "low", t: "Leicht", d: "spürbar, aber handelbar" },
        { v: "mid", t: "Mittel", d: "kostet Energie, nervt, zieht runter" },
        { v: "high", t: "Stark", d: "belastet deutlich (Job/Familie/Tag)" },
      ],
    },
    {
      id: "notes",
      type: "text",
      q: "Ein Satz in deinen Worten (optional).",
      sub: "Nur wenn du magst. Keine Details, die du nicht teilen willst.",
      bubble: "Du gibst nur so viel preis, wie du willst. Wirklich.",
      key: "notes",
      placeholder: "z. B. „Ich wache nachts oft auf“ oder „Abends komme ich nicht runter“…",
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

    const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
    if (fill) fill.style.width = `${clamp(pct, 0, 100)}%`;

    const pb = document.querySelector(".k-progress-bar");
    if (pb) pb.setAttribute("aria-valuenow", String(clamp(pct, 0, 100)));

    renderDots();
  }

  // ---------- Mascot Bubble + Reaction ----------
  function setBubble(text) {
    if (!bubbleText) return;
    bubbleText.textContent = text || "Ich bin da.";
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
    setBubble(step.bubble);

    // Button labels
    if (btnPrev) btnPrev.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    if (btnNext) {
      if (step.type === "intro") btnNext.textContent = "Starten";
      else if (step.type === "result") btnNext.textContent = "Fertig";
      else btnNext.textContent = "Weiter";
      btnNext.disabled = !canGoNext();
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

    // INTRO: kein Karten-Container mehr (damit du den nervigen Block los bist)
    if (step.type === "intro") {
      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Tipp: Du kannst jederzeit zurück – und du behältst die Kontrolle.";
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
          if (btnNext) btnNext.disabled = !canGoNext();
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
        if (btnNext) btnNext.disabled = !canGoNext();
      });

      wrap.appendChild(input);

      const hint = document.createElement("div");
      hint.className = "k-hint";
      hint.textContent = "Ein Satz reicht. Keine sensiblen Details, wenn du das nicht möchtest.";
      wrap.appendChild(hint);
    }

    // RESULT
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

  // ---------- Safety + Interpretation ----------
  function detectCritical(text) {
    const t = norm(text);

    const selfHarm =
      /(\b(suizid|selbstmord|mich umbringen|mich toten|mich töten|ich will nicht mehr|leben hat keinen sinn|will sterben|bruecke|brücke|bahn|zug)\b)/i.test(
        t
      );

    const illegal =
      /(\b(bahnhof|dealer|deal|grass|weed|hash|schwarzmarkt|illegal|vom typen|von irgendeinem)\b)/i.test(t);

    return { selfHarm, illegal };
  }

  function buildResultCard() {
    const goal = answers.goal || "other";
    const timeframe = answers.timeframe || "weeks";
    const impact = answers.impact || "mid";
    const notesRaw = answers.notes || "";
    const notes = norm(notesRaw);

    const flags = detectCritical(notesRaw);

    // --- If self-harm signals: hard stop + help (no forwarding) ---
    if (flags.selfHarm) {
      setBubble("Stopp. Das ist wichtig. Du musst da nicht allein durch.");
      return buildSafetyCard();
    }

    // --- Tailored, non-medical orientation ---
    const focusLabel = labelGoal(goal);
    const timeLabel = labelTime(timeframe);
    const impactLabel = labelImpact(impact);

    // Base
    let headline = `Orientierung: ${focusLabel} – nächster Schritt bewusst wählen.`;
    let note =
      "Ich kann dir helfen, das Thema strukturiert zu sortieren. Wenn du möchtest, kannst du es ärztlich abklären lassen – diskret und nachvollziehbar.";
    let cta = "Diskret weiter";
    let badge = "Digitaler Kompass";
    let tone = "";

    // Strong signals -> stronger recommendation
    const strong = impact === "high" || timeframe === "months";
    const fresh = impact === "low" && timeframe === "days";

    if (fresh) {
      headline = `Orientierung: ${focusLabel} – kurz beobachten, klar handeln.`;
      note =
        "Wenn es neu ist, kann es helfen, 3–5 Tage bewusst zu beobachten. Wenn es bleibt oder schlimmer wird, ist ärztliche Abklärung sinnvoll.";
      cta = "Optionen ansehen";
      tone = "soft";
    } else if (strong) {
      headline = `Orientierung: ${focusLabel} – ärztliche Abklärung ist sinnvoll.`;
      note =
        "Bei starker oder längerer Belastung ist professionelle Abklärung oft der sauberste Weg. Du entscheidest Tempo und Tiefe.";
      cta = "Abklärung starten";
      tone = "firm";
    } else {
      headline = `Orientierung: ${focusLabel} – nächster Schritt kann sinnvoll sein.`;
      note =
        "Wenn du möchtest, kannst du das Thema ärztlich abklären lassen. Ich bleibe bei „notwendigen Angaben“ – ohne Drama, ohne Druck.";
      cta = "Weiter zur Abklärung";
      tone = "neutral";
    }

    // Notes-based nuance (still non-medical)
    if (notes.includes("cannabis") || notes.includes("thc")) {
      badge = "Hinweis";
      note =
        "Wenn du dich über medizinische Optionen informierst: Entscheidend sind ärztliche Eignung, Risiken, Alternativen und eine saubere Dokumentation. Ich begleite dich nur bis zur Orientierung – die Entscheidung trifft ein Arzt.";
    }

    if (flags.illegal) {
      badge = "Wichtig";
      note =
        "Bitte geh keine illegalen oder unsicheren Wege. Wenn du eine medizinische Abklärung möchtest, nutze ausschließlich legale ärztliche Angebote. Das ist sicherer – und schützt dich.";
      cta = "Legal weiter";
    }

    // Optional incorporate the note text gently (not quoting everything)
    let miniNote = "";
    if (notesRaw && notesRaw.trim().length >= 6) {
      miniNote = `Dein Satz: „${escapeHtml(trimTo(notesRaw.trim(), 120))}“`;
    }

    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">${badge}</div>
        <div class="k-needle" aria-hidden="true">🧭</div>
      </div>

      <div class="k-result-title">${escapeHtml(headline)}</div>
      <div class="k-result-text">${escapeHtml(note)}</div>

      ${miniNote ? `<div class="k-result-note">${escapeHtml(miniNote)}</div>` : ""}

      <div class="k-result-mini">
        <div><span>Fokus:</span> ${escapeHtml(focusLabel)}</div>
        <div><span>Zeitraum:</span> ${escapeHtml(timeLabel)}</div>
        <div><span>Alltag:</span> ${escapeHtml(impactLabel)}</div>
      </div>

      <div class="k-result-actions">
        <a class="k-result-btn primary" id="goPartner" href="weiterleitung.html">${escapeHtml(cta)}</a>
        <button class="k-result-btn ghost" id="saveCopy" type="button">Zusammenfassung kopieren</button>
      </div>

      <div class="k-result-legal">
        Hinweis: Dies ist eine Orientierung und ersetzt keine ärztliche Behandlung.
      </div>
    `;

    // Copy summary
    const saveBtn = box.querySelector("#saveCopy");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const text = buildSummaryText(goal, timeframe, impact, notesRaw);
        try {
          await navigator.clipboard.writeText(text);
          setBubble("Kopiert. Sauber.");
          thumbsUp();
        } catch {
          setBubble("Kopieren ging nicht – aber alles bleibt hier sichtbar.");
        }
      });
    }

    return box;
  }

  function buildSafetyCard() {
    const box = document.createElement("div");
    box.className = "k-result";

    box.innerHTML = `
      <div class="k-result-head">
        <div class="k-badge">Wichtig</div>
        <div class="k-needle" aria-hidden="true">🛑</div>
      </div>

      <div class="k-result-title">Wenn du daran denkst, dir etwas anzutun: bitte hol dir jetzt Hilfe.</div>
      <div class="k-result-text">
        Ich kann das nicht sicher begleiten – aber ich kann dir helfen, <b>jetzt</b> den nächsten sicheren Schritt zu gehen.
      </div>

      <div class="k-result-mini">
        <div><span>Akut / Gefahr:</span> 112 (Notruf) oder geh in die nächste Notaufnahme</div>
        <div><span>TelefonSeelsorge:</span> 116 123 (24/7, kostenlos)</div>
        <div><span>Wenn du nicht allein sein willst:</span> ruf eine vertraute Person an und sag: „Bleib bitte kurz bei mir.“</div>
      </div>

      <div class="k-result-actions">
        <button class="k-result-btn primary" id="safetyBack" type="button">Zurück</button>
        <button class="k-result-btn ghost" id="safetyCopy" type="button">Hilfetext kopieren</button>
      </div>

      <div class="k-result-legal">
        Hinweis: Wenn unmittelbare Gefahr besteht, wähle bitte 112.
      </div>
    `;

    box.querySelector("#safetyBack").addEventListener("click", () => {
      // Zurück zur Notiz oder zum Start – je nachdem, was du willst:
      stepIndex = Math.max(0, steps.findIndex((s) => s.id === "notes"));
      renderStep();
    });

    box.querySelector("#safetyCopy").addEventListener("click", async () => {
      const text =
        "Wenn du daran denkst, dir etwas anzutun: Bitte hol dir jetzt Hilfe.\n" +
        "Akut: 112.\n" +
        "TelefonSeelsorge: 116 123 (24/7, kostenlos).\n" +
        "Du musst da nicht allein durch.";
      try {
        await navigator.clipboard.writeText(text);
        setBubble("Kopiert. Bitte bleib nicht allein damit.");
      } catch {
        setBubble("Kopieren ging nicht – aber die Nummern stehen hier.");
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
      notes && notes.trim() ? `Notiz: ${notes.trim()}` : "",
      "",
      "Hinweis: Orientierung, keine Diagnose."
    ]
      .filter(Boolean)
      .join("\n");
  }

  function labelGoal(v) {
    return (
      {
        sleep: "Schlaf & Erholung",
        stress: "Stress & Anspannung",
        pain: "Körperliche Beschwerden",
        other: "Allgemeine Orientierung",
      }[v] || "Allgemeine Orientierung"
    );
  }
  function labelTime(v) {
    return (
      {
        days: "seit Tagen",
        weeks: "seit Wochen",
        months: "seit Monaten+",
      }[v] || "seit Wochen"
    );
  }
  function labelImpact(v) {
    return (
      {
        low: "leicht",
        mid: "mittel",
        high: "stark",
      }[v] || "mittel"
    );
  }

  function trimTo(s, max) {
    if (!s) return "";
    const str = String(s);
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Navigation ----------
  function next() {
    if (!canGoNext()) {
      setBubble("Ein kurzer Klick reicht – dann weiter.");
      return;
    }

    if (stepIndex >= steps.length - 1) {
      // Fertig -> zurück zur Startseite
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
  if (btnNext) btnNext.addEventListener("click", next);
  if (btnPrev) btnPrev.addEventListener("click", prev);

  if (stage) {
    stage.addEventListener("click", () => {
      if (btnNext) btnNext.disabled = !canGoNext();
    });
  }

  // ---------- Minimal Result Styling (falls kompass.css es noch nicht hat) ----------
  // Du kannst das später in kompass.css ziehen – läuft aber sofort.
  const style = document.createElement("style");
  style.textContent = `
    .k-result{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;background:rgba(0,0,0,.35);box-shadow:0 0 22px rgba(0,255,154,.10)}
    .k-result-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .k-badge{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:rgba(0,255,154,.95)}
    .k-result-title{font-size:18px;font-weight:750;margin:6px 0 8px}
    .k-result-text{color:rgba(255,255,255,.78);font-size:14px;line-height:1.45}
    .k-result-note{margin-top:10px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.82);font-size:13px;line-height:1.4}
    .k-result-mini{margin-top:12px;color:rgba(255,255,255,.70);font-size:13px;display:grid;gap:6px}
    .k-result-mini span{color:rgba(255,255,255,.52)}
    .k-result-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .k-result-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 14px;border-radius:999px;font-weight:750;text-decoration:none;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff}
    .k-result-btn.primary{background:#00ff9a;color:#000;border:none;box-shadow:0 0 20px rgba(0,255,154,.25)}
    .k-result-legal{margin-top:10px;font-size:12px;color:rgba(255,255,255,.55)}
  `;
  document.head.appendChild(style);

  // ---------- Init ----------
  renderStep();
})();
