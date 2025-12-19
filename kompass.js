/* kompass.js?v=202 */

(() => {
  // =========================
  // KONFIG
  // =========================
  const DOCTOR_ABC_URL = "https://www.doktorabc.com/"; // TODO: später finaler Tracking-Link

  // =========================
  // DOM
  // =========================
  const elStage = document.getElementById("kStage");
  const elPrev = document.getElementById("kPrev");
  const elNext = document.getElementById("kNext");

  const elStepNow = document.getElementById("kStepNow");
  const elStepMax = document.getElementById("kStepMax");
  const elProgressFill = document.getElementById("kProgressFill");
  const elDots = document.getElementById("kDots");

  const elStatusPill = document.getElementById("kStatusPill");
  const elBubbleText = document.getElementById("kBubbleText");
  const elReaction = document.getElementById("kReaction");

  // =========================
  // STATE
  // =========================
  const state = {
    step: 0,
    focus: null,
    duration: null,
    impact: null,
    note: "",
    risk: "ok" // ok | warn | danger
  };

  // 6 Schritte total: 0..5
  const TOTAL_STEPS = 6;

  // =========================
  // UTIL
  // =========================
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const setStatus = (lvl, text) => {
    state.risk = lvl;
    elStatusPill.classList.remove("ok","warn","danger");
    elStatusPill.classList.add(lvl);
    elStatusPill.textContent = text;

    // Reaction dot (unten links) – sehr subtil
    elReaction.classList.remove("ok","warn","danger","show");
    elReaction.classList.add("show", lvl);
    window.setTimeout(() => elReaction.classList.remove("show"), 900);
  };

  const escapeHtml = (s) =>
    (s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  const looksLikeSelfHarm = (text) => {
    const t = (text || "").toLowerCase();

    // Deutsch + Umgangssprache + typische Muster
    const hard = [
      "selbstmord", "suizid", "ich bringe mich um", "ich bring mich um",
      "ich will sterben", "ich werde sterben", "ich will nicht mehr leben",
      "leben beenden", "mich umbringen", "mich töten", "töten",
      "springe von", "spring", "brücke", "bahngleis", "zug",
      "überdosis", "tabletten", "pillen", "messer", "klinge"
    ];
    return hard.some(k => t.includes(k));
  };

  const looksLikeCannabisRequest = (text) => {
    const t = (text || "").toLowerCase();
    const keys = [
      "cannabis", "thc", "gras", "weed", "blüte", "blüten",
      "rezept", "auf rezept", "telemedizin", "doktorabc", "doctorabc"
    ];
    return keys.some(k => t.includes(k));
  };

  const canProceed = () => {
    switch (state.step) {
      case 0: return true; // Intro
      case 1: return !!state.focus;
      case 2: return !!state.duration;
      case 3: return !!state.impact;
      case 4: return true; // Note optional
      case 5: return true;
      default: return true;
    }
  };

  // =========================
  // UI BUILDERS
  // =========================
  const buildIntro = () => {
    elBubbleText.textContent = "Wir gehen Schritt für Schritt. Du behältst die Kontrolle.";
    return `
      <h1 class="k-h1">Kompass starten</h1>
      <p class="k-p">
        60 Sekunden – dann hast du Orientierung. Diskret. Ohne Registrierung.
      </p>
      <div class="k-card">
        <div class="k-card-title">
          <div class="k-badge">Kurz & klar</div>
          <div class="k-flag ok" aria-hidden="true"></div>
        </div>
        <p class="k-p" style="margin:0;">
          Ich stelle keine Diagnosen. Ich helfe dir, deine Lage zu sortieren – und
          wenn du willst, den nächsten Schritt Richtung Arztgespräch zu gehen.
        </p>
      </div>
    `;
  };

  const buildOptions = (title, subtitle, options, selectedValue, onSelectKey) => {
    const optHtml = options.map(o => {
      const selected = (selectedValue === o.value) ? "selected" : "";
      return `
        <button type="button" class="k-opt ${selected}" data-value="${escapeHtml(o.value)}">
          <div class="k-opt-title">${escapeHtml(o.title)}</div>
          ${o.sub ? `<p class="k-opt-sub">${escapeHtml(o.sub)}</p>` : ``}
        </button>
      `;
    }).join("");

    // event delegation after render
    setTimeout(() => {
      document.querySelectorAll(".k-opt").forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.getAttribute("data-value");
          state[onSelectKey] = v;
          render();
        }, { passive:true });
      });
    }, 0);

    return `
      <h1 class="k-h1">${escapeHtml(title)}</h1>
      <p class="k-p">${escapeHtml(subtitle)}</p>
      <div class="k-options">${optHtml}</div>
    `;
  };

  const buildNote = () => {
    elBubbleText.textContent = "Wenn du willst: ein Satz genügt. Je klarer, desto besser.";

    setTimeout(() => {
      const ta = document.getElementById("kNote");
      if (!ta) return;
      ta.value = state.note || "";
      ta.addEventListener("input", () => {
        state.note = ta.value;

        // Live Risk
        if (looksLikeSelfHarm(state.note)) {
          setStatus("danger", "Wichtig.");
        } else if (looksLikeCannabisRequest(state.note)) {
          setStatus("warn", "Achte auf dich.");
        } else {
          setStatus("ok", "Alles ruhig.");
        }
      }, { passive:true });
    }, 0);

    return `
      <h1 class="k-h1">Möchtest du einen kurzen Satz ergänzen?</h1>
      <p class="k-p">Optional. Nur so viel, wie für dich passt.</p>
      <textarea id="kNote" class="k-input" rows="4"
        placeholder="z. B. Unruhe seit Wochen, abends stark. Ich will Optionen sortieren."></textarea>

      <div class="k-card" style="margin-top:12px;">
        <div class="k-card-title">
          <div class="k-badge">Hinweis</div>
          <div class="k-flag ok" aria-hidden="true"></div>
        </div>
        <p class="k-p" style="margin:0;">
          Wenn du dich gerade nicht sicher fühlst: sprich jetzt mit einem Menschen.
          TelefonSeelsorge <strong>116 123</strong> · Notfall <strong>112</strong>
        </p>
      </div>
    `;
  };

  const buildCrisisCard = () => {
    // CanaDoc-Style: NICHT diagnostizieren, sondern sichern.
    elBubbleText.textContent = "Sicherheit zuerst. Ich lasse dich nicht allein mit dem Moment.";

    const helpText =
`Wenn du dich gerade nicht sicher fühlst:
• Notfall: 112
• TelefonSeelsorge: 116 123 (24/7, kostenlos)
• Wenn möglich: ruf eine vertraute Person an und sag: „Bleib bitte kurz bei mir.“`;

    setTimeout(() => {
      const copyBtn = document.getElementById("kCopyHelp");
      if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(helpText);
            copyBtn.textContent = "Kopiert ✓";
            setTimeout(() => (copyBtn.textContent = "Hilfetext kopieren"), 1200);
          } catch {
            copyBtn.textContent = "Kopieren nicht möglich";
            setTimeout(() => (copyBtn.textContent = "Hilfetext kopieren"), 1200);
          }
        });
      }
    }, 0);

    return `
      <h1 class="k-h1">Wichtig</h1>
      <p class="k-p">Das hier ist größer als ein Formular. Wir machen es jetzt sicher.</p>

      <div class="k-card">
        <div class="k-card-title">
          <div class="k-badge">Sofort-Schritt</div>
          <div class="k-flag danger" aria-hidden="true"></div>
        </div>

        <p class="k-p" style="margin-top:0;">
          Wenn du daran denkst, dir etwas anzutun: hol dir bitte jetzt Hilfe.
          Ich begleite dich hier nur bis zur Orientierung – die medizinische Entscheidung trifft ein Arzt.
        </p>

        <p class="k-p" style="white-space:pre-line; margin-bottom:0;">${escapeHtml(helpText)}</p>

        <div class="k-ctaRow">
          <a class="k-cta primary" href="${escapeHtml(DOCTOR_ABC_URL)}" target="_blank" rel="noopener">
            Zum Arztgespräch
          </a>
          <button class="k-cta ghost" id="kCopyHelp" type="button">Hilfetext kopieren</button>
        </div>

        <p class="k-p" style="margin-top:12px; font-size:13px; color:rgba(231,236,234,.75);">
          Sekundär, ruhig, klein: Nach TelefonSeelsorge 116 123 · Notfall 112
        </p>
      </div>
    `;
  };

  const buildResult = () => {
    // Wenn Freitext Selbstgefährdung enthält -> Krisenkarte statt normalem Ergebnis
    if (looksLikeSelfHarm(state.note)) {
      setStatus("danger", "Wichtig.");
      return buildCrisisCard();
    }

    // Sonst: Normaler CanaDoc-Output (keine Diagnose, aber konkrete Richtung)
    setStatus(state.risk === "warn" ? "warn" : "ok", state.risk === "warn" ? "Achte auf dich." : "Alles ruhig.");

    const focusTitle = (() => {
      switch(state.focus){
        case "sleep": return "Schlaf & Erholung";
        case "stress": return "Stress & Anspannung";
        case "body": return "Körperliche Beschwerden";
        case "general": return "Allgemeine Orientierung";
        default: return "Orientierung";
      }
    })();

    const opener = (() => {
      if (state.focus === "stress") return "Stress: wir bringen Ruhe in die Lage.";
      if (state.focus === "sleep") return "Schlaf: wir bringen Struktur in die Nacht.";
      if (state.focus === "body") return "Körper: wir sortieren Symptome sauber.";
      return "Orientierung: wir bringen Klarheit in den nächsten Schritt.";
    })();

    // CanaDoc-Wortwahl (dein Stil): ruhig, sachlich, kein „Drama“
    const body = (() => {
      if (state.focus === "stress") {
        return "Wenn Druck und Gedankenkarussell dominieren, hilft ein ärztliches Gespräch, Optionen und nächste Schritte fundiert zu sortieren – ohne Chaos, ohne Drama.";
      }
      if (state.focus === "sleep") {
        return "Wenn Schlaf kippt, ist ein ärztliches Gespräch oft der sauberste Weg, Ursachen, Optionen und Risiken strukturiert zu prüfen – in deinem Tempo.";
      }
      if (state.focus === "body") {
        return "Bei Beschwerden ist medizinische Abklärung sinnvoll, um ernstes auszuschließen und Optionen klar zu besprechen – strukturiert und nachvollziehbar.";
      }
      return "Wenn du unsicher bist, bringt ein Arztgespräch Klarheit: was passt, was nicht – und welcher nächste Schritt wirklich Sinn macht.";
    })();

    // Note-Hinweis, ohne Wertung
    const noteLine = state.note?.trim()
      ? `<div class="k-card" style="margin-top:12px;">
           <div class="k-card-title">
             <div class="k-badge">Dein Satz</div>
             <div class="k-flag ${state.risk === "warn" ? "warn":"ok"}" aria-hidden="true"></div>
           </div>
           <p class="k-p" style="margin:0;">„${escapeHtml(state.note.trim())}“</p>
         </div>`
      : "";

    return `
      <h1 class="k-h1">Deine Kompass-Orientierung</h1>
      <p class="k-p">Orientierung – keine Diagnose. Die medizinische Entscheidung trifft ein Arzt.</p>

      <div class="k-card">
        <div class="k-card-title">
          <div class="k-badge">Digitaler Kompass</div>
          <div class="k-flag ${state.risk === "warn" ? "warn":"ok"}" aria-hidden="true"></div>
        </div>

        <h2 style="margin:0 0 10px; font-size:22px; font-weight:950;">
          ${escapeHtml(opener)}
        </h2>

        <p class="k-p" style="margin-top:0;">
          ${escapeHtml(body)}
        </p>

        <p class="k-p" style="margin:0;">
          <span style="color:rgba(231,236,234,.70); font-weight:800;">Fokus:</span> ${escapeHtml(focusTitle)}<br/>
          <span style="color:rgba(231,236,234,.70); font-weight:800;">Zeitraum:</span> ${escapeHtml(labelDuration(state.duration))}<br/>
          <span style="color:rgba(231,236,234,.70); font-weight:800;">Alltag:</span> ${escapeHtml(labelImpact(state.impact))}
        </p>

        ${noteLine}

        <div class="k-ctaRow">
          <a class="k-cta primary" href="${escapeHtml(DOCTOR_ABC_URL)}" target="_blank" rel="noopener">
            Zum Arztgespräch
          </a>
        </div>

        <p class="k-p" style="margin-top:12px; font-size:13px; color:rgba(231,236,234,.75);">
          Sekundär, ruhig, klein: Wenn du dich gerade nicht sicher fühlst: TelefonSeelsorge 116 123 · Notfall 112
        </p>
      </div>
    `;
  };

  // =========================
  // LABELS
  // =========================
  function labelDuration(v){
    switch(v){
      case "days": return "nur ein paar Tage";
      case "weeks": return "seit einigen Wochen";
      case "months": return "Monate oder länger";
      default: return "—";
    }
  }
  function labelImpact(v){
    switch(v){
      case "low": return "leicht";
      case "mid": return "mittel";
      case "high": return "stark";
      default: return "—";
    }
  }

  // =========================
  // RENDER
  // =========================
  const renderDots = () => {
    elDots.innerHTML = "";
    for (let i=0;i<TOTAL_STEPS;i++){
      const d = document.createElement("div");
      d.className = "dot" + (i === state.step ? " on" : "");
      elDots.appendChild(d);
    }
  };

  const renderProgress = () => {
    const pct = clamp((state.step/(TOTAL_STEPS-1))*100, 0, 100);
    elProgressFill.style.width = `${pct}%`;
    elProgressFill.parentElement?.setAttribute("aria-valuenow", String(Math.round(pct)));
  };

  const renderNav = () => {
    elStepNow.textContent = String(state.step + 1);
    elStepMax.textContent = String(TOTAL_STEPS);

    elPrev.disabled = (state.step === 0);

    // Button Label: Step 0 = Kompass starten, sonst Weiter, Step 5 = Fertig
    if (state.step === 0) elNext.textContent = "Kompass starten";
    else if (state.step === 5) elNext.textContent = "Fertig";
    else elNext.textContent = "Weiter";

    // Aktivierbar?
    elNext.disabled = !canProceed();
  };

  const render = () => {
    renderDots();
    renderProgress();
    renderNav();

    // Status pill default
    if (!state.note?.trim() && state.risk === "ok") setStatus("ok", "Alles ruhig.");

    switch(state.step){
      case 0:
        elStage.innerHTML = buildIntro();
        break;

      case 1:
        elBubbleText.textContent = "Sag mir kurz, worum es dir heute am ehesten geht.";
        elStage.innerHTML = buildOptions(
          "Worum geht es dir heute am ehesten?",
          "Wähle das, was am besten passt.",
          [
            { value:"sleep",  title:"Schlaf & Erholung",          sub:"Ein- oder Durchschlafen, Abendruhe" },
            { value:"stress", title:"Stress & Anspannung",        sub:"Unruhe, Druck, Gedankenkarussell" },
            { value:"body",   title:"Körperliche Beschwerden",    sub:"z. B. Verspannung oder Schmerz" },
            { value:"general",title:"Allgemeine Orientierung",    sub:"Ich bin unsicher und will Klarheit" }
          ],
          state.focus,
          "focus"
        );
        break;

      case 2:
        elBubbleText.textContent = "Zeit ist ein Signal. Wir halten es einfach.";
        elStage.innerHTML = buildOptions(
          "Seit wann beschäftigt dich das Thema?",
          "Wähle eine Option.",
          [
            { value:"days", title:"Nur ein paar Tage", sub:"Frisch – kann sich schnell ändern" },
            { value:"weeks", title:"Einige Wochen", sub:"Wiederkehrend oder anhaltend" },
            { value:"months", title:"Monate oder länger", sub:"Stabil – ärztliche Einordnung sinnvoll" }
          ],
          state.duration,
          "duration"
        );
        break;

      case 3:
        elBubbleText.textContent = "Wie stark ist es im Alltag? Nur grob – reicht.";
        elStage.innerHTML = buildOptions(
          "Wie stark beeinflusst es deinen Alltag?",
          "Wähle eine Option.",
          [
            { value:"low", title:"Leicht", sub:"Spürbar, aber gut machbar" },
            { value:"mid", title:"Mittel", sub:"Bremst – kostet Energie" },
            { value:"high", title:"Stark", sub:"Zieht runter oder blockiert" }
          ],
          state.impact,
          "impact"
        );
        break;

      case 4:
        elStage.innerHTML = buildNote();
        break;

      case 5:
        elStage.innerHTML = buildResult();
        break;
    }
  };

  // =========================
  // NAV HANDLERS
  // =========================
  elPrev.addEventListener("click", () => {
    state.step = clamp(state.step - 1, 0, TOTAL_STEPS - 1);
    render();
  });

  elNext.addEventListener("click", () => {
    if (!canProceed()) return;

    // Beim Übergang zu Ergebnis: Risiko final setzen
    if (state.step === 4) {
      if (looksLikeSelfHarm(state.note)) setStatus("danger", "Wichtig.");
      else if (looksLikeCannabisRequest(state.note)) setStatus("warn", "Achte auf dich.");
      else setStatus("ok", "Alles ruhig.");
    }

    state.step = clamp(state.step + 1, 0, TOTAL_STEPS - 1);
    render();
  });

  // =========================
  // INIT
  // =========================
  render();

})();
