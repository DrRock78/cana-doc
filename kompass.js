(() => {
  "use strict";

  // ====== EINZIGE STELLE FÜR DEINEN SPÄTEREN DOKTORABC-LINK ======
  // Sobald du den echten Link hast: NUR diese eine Zeile ändern.
  const DOCTOR_URL = "#"; // z.B. "https://doktorabc.de/..." (wenn du ihn hast)

  // ====== DOM ======
  const elStage = document.getElementById("kStage");
  const elPrev  = document.getElementById("kPrev");
  const elNext  = document.getElementById("kNext");

  const elStepNow = document.getElementById("kStepNow");
  const elStepMax = document.getElementById("kStepMax");
  const elFill    = document.getElementById("kProgressFill");
  const elDots    = document.getElementById("kDots");

  const elStatusDot  = document.getElementById("kStatusDot");
  const elStatusText = document.getElementById("kStatusText");

  const TOTAL_STEPS = 6;

  // ====== STATE ======
  const state = {
    step: 0,
    focus: null,        // "Schlaf & Erholung" | "Stress & Anspannung" | "Körperliche Beschwerden" | "Allgemeine Orientierung"
    when: null,         // "Tage" | "Wochen" | "Monate+"
    impact: null,       // "leicht" | "mittel" | "stark"
    note: "",           // Freitext
    risk: "ok",         // "ok" | "warn" | "danger"
  };

  const steps = [
    { id: "focus",  required: true },
    { id: "when",   required: true },
    { id: "impact", required: true },
    { id: "note",   required: false },
    { id: "review", required: false },
    { id: "result", required: false }
  ];

  // ====== INIT ======
  elStepMax.textContent = String(TOTAL_STEPS);
  renderDots();
  updateNav();
  renderStep();

  elPrev.addEventListener("click", () => {
    if (state.step > 0) {
      state.step--;
      renderStep();
      updateNav();
      scrollTop();
    }
  });

  elNext.addEventListener("click", () => {
    if (!canGoNext()) return;
    if (state.step < TOTAL_STEPS - 1) {
      state.step++;
      renderStep();
      updateNav();
      scrollTop();
    }
  });

  // ====== RENDER ======
  function renderStep() {
    const s = steps[state.step];
    setProgress(state.step);

    if (!s) return;

    if (s.id === "focus")  return renderFocus();
    if (s.id === "when")   return renderWhen();
    if (s.id === "impact") return renderImpact();
    if (s.id === "note")   return renderNote();
    if (s.id === "review") return renderReview();
    if (s.id === "result") return renderResult();
  }

  function baseCard(title, subtitle) {
    return `
      <div class="k-card">
        <div class="k-h1">${escapeHtml(title)}</div>
        <div class="k-h2">${escapeHtml(subtitle)}</div>
      </div>
    `;
  }

  function renderFocus() {
    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-h1">Womit möchtest du heute starten?</div>
        <div class="k-h2">Wähle das, was am besten passt.</div>

        <div class="k-options">
          ${opt("Schlaf & Erholung", "Ein- oder durchschlafen, Abendruhe")}
          ${opt("Stress & Anspannung", "Unruhe, Druck, Gedankenkarussell")}
          ${opt("Körperliche Beschwerden", "z. B. Verspannung oder Schmerz")}
          ${opt("Allgemeine Orientierung", "Ich bin unsicher und will Klarheit")}
        </div>
      </div>
    `;

    bindOptionClicks((val) => {
      state.focus = val;
      bumpRiskFromStructured(); // mild based on selections
      updateStatusFromRisk();
      updateNav();
    });
  }

  function renderWhen() {
    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-h1">Seit wann beschäftigt dich das?</div>
        <div class="k-h2">Ganz grob – es geht nur um Orientierung.</div>

        <div class="k-options">
          ${opt("Nur ein paar Tage", "Seit kurzem", "Tage")}
          ${opt("Einige Wochen", "Seit mehreren Wochen", "Wochen")}
          ${opt("Monate oder länger", "Schon länger", "Monate+")}
        </div>
      </div>
    `;

    bindOptionClicks((val) => {
      state.when = val;
      bumpRiskFromStructured();
      updateStatusFromRisk();
      updateNav();
    });
  }

  function renderImpact() {
    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-h1">Wie stark beeinflusst es deinen Alltag?</div>
        <div class="k-h2">Dein Gefühl zählt – nicht Perfektion.</div>

        <div class="k-options">
          ${opt("Leicht", "Ich komme klar, aber es nervt", "leicht")}
          ${opt("Mittel", "Es kostet mich Energie", "mittel")}
          ${opt("Stark", "Es zieht mich spürbar runter", "stark")}
        </div>
      </div>
    `;

    bindOptionClicks((val) => {
      state.impact = val;
      bumpRiskFromStructured();
      updateStatusFromRisk();
      updateNav();
    });
  }

  function renderNote() {
    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-h1">Möchtest du einen Satz ergänzen?</div>
        <div class="k-h2">Optional. Ein Satz reicht.</div>

        <input class="k-input" id="kNote" type="text" maxlength="140"
          placeholder="z. B. „Ich fühle mich überfordert“ oder „Ich möchte mich informieren“"
          value="${escapeAttr(state.note || "")}"
        />
      </div>
    `;

    const input = document.getElementById("kNote");
    input.addEventListener("input", () => {
      state.note = input.value || "";
      state.risk = assessRisk(state.note);
      updateStatusFromRisk();
      updateNav();
    });

    // initial evaluate
    state.risk = assessRisk(state.note);
    updateStatusFromRisk();
  }

  function renderReview() {
    const focus = state.focus || "–";
    const when  = labelWhen(state.when);
    const imp   = labelImpact(state.impact);

    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-h1">Kurzcheck</div>
        <div class="k-h2">Stimmt das so für dich?</div>

        <div class="k-text">
          <div><strong>Fokus:</strong> ${escapeHtml(focus)}</div>
          <div><strong>Zeitraum:</strong> ${escapeHtml(when)}</div>
          <div><strong>Alltag:</strong> ${escapeHtml(imp)}</div>
        </div>

        ${state.note?.trim() ? `
          <div class="k-quote">
            <div class="k-quote-label">DEIN SATZ</div>
            <div class="k-quote-body">„${escapeHtml(state.note.trim())}“</div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderResult() {
    // Final risk based on freetext + structured
    if (state.risk !== "danger") bumpRiskFromStructured();

    updateStatusFromRisk();

    const focus = state.focus || "Allgemein";
    const when  = labelWhen(state.when);
    const imp   = labelImpact(state.impact);
    const note  = (state.note || "").trim();

    // Copy in CanaDoc style
    const headline = buildHeadline(focus);
    const body = buildBody(focus);

    // ====== DANGER CARD (mit Weiterleitung) ======
    if (state.risk === "danger") {
      elStage.innerHTML = `
        <div class="k-card k-danger">
          <div class="k-danger-top">
            <div class="k-danger-tag">WICHTIG</div>
            <div class="k-danger-dot" aria-hidden="true"></div>
          </div>

          <div class="k-danger-title">Wenn du daran denkst, dir etwas anzutun: bitte hol dir jetzt Hilfe.</div>
          <div class="k-text">
            Ich kann das nicht sicher begleiten – aber ich kann dir helfen, jetzt den nächsten sicheren Schritt zu gehen.
            <br><br>
            <strong>Akut / Gefahr:</strong> 112 (Notruf) oder geh in die nächste Notaufnahme.
            <br>
            <strong>TelefonSeelsorge:</strong> 116 123 (24/7, kostenlos)
          </div>

          ${note ? `
            <div class="k-quote">
              <div class="k-quote-label">DEIN SATZ</div>
              <div class="k-quote-body">„${escapeHtml(note)}“</div>
            </div>
          ` : ""}

          <div class="k-danger-actions">
            <a href="tel:112" class="primary">Notruf 112</a>
            <a href="tel:116123">116 123</a>
          </div>

          <button class="k-primary-action" id="kDoctorBtn">Zum Arztgespräch</button>

          <div class="k-subhint">
            Hinweis: Wenn unmittelbare Gefahr besteht, wähle bitte 112.
          </div>
        </div>
      `;

      const btn = document.getElementById("kDoctorBtn");
      btn.addEventListener("click", () => {
        // Auch bei „danger“: Weiterleitung möglich – Entscheidung liegt beim Arzt.
        if (DOCTOR_URL && DOCTOR_URL !== "#") window.location.href = DOCTOR_URL;
      });

      return;
    }

    // ====== NORMAL RESULT (NUR 1 BUTTON) ======
    elStage.innerHTML = `
      <div class="k-card">
        <div class="k-result-title">Deine Kompass-Orientierung</div>
        <div class="k-text">Das ist eine Orientierung – keine Diagnose. Die medizinische Entscheidung trifft ein Arzt.</div>

        <div style="height:12px"></div>

        <div class="k-badge">
          <span aria-hidden="true">🧭</span>
          <span>DIGITALER KOMPASS</span>
        </div>

        <div class="k-h1">${escapeHtml(headline)}</div>
        <div class="k-text">${escapeHtml(body)}</div>

        ${note ? `
          <div class="k-quote">
            <div class="k-quote-label">DEIN SATZ</div>
            <div class="k-quote-body">„${escapeHtml(note)}“</div>
          </div>
        ` : ""}

        <div class="k-text" style="margin-top:12px">
          <strong>Fokus:</strong> ${escapeHtml(focus)}<br>
          <strong>Zeitraum:</strong> ${escapeHtml(when)}<br>
          <strong>Alltag:</strong> ${escapeHtml(imp)}
        </div>

        <button class="k-primary-action" id="kDoctorBtn">Zum Arztgespräch</button>

        <div class="k-subhint">
          Wenn du dich gerade nicht sicher fühlst: Sprich jetzt mit einem Menschen.
          TelefonSeelsorge 116 123 · Notruf 112
        </div>
      </div>
    `;

    document.getElementById("kDoctorBtn").addEventListener("click", () => {
      if (DOCTOR_URL && DOCTOR_URL !== "#") window.location.href = DOCTOR_URL;
    });
  }

  // ====== OPTIONS HELPER ======
  function opt(title, desc, value) {
    const v = value ?? title;
    const selected = isSelected(title, v);
    return `
      <button class="k-opt ${selected ? "selected" : ""}" type="button" data-value="${escapeAttr(v)}" data-title="${escapeAttr(title)}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(desc)}</span>
      </button>
    `;
  }

  function bindOptionClicks(onPick) {
    const btns = [...elStage.querySelectorAll(".k-opt")];
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("selected"));
      b.classList.add("selected");
      onPick(b.dataset.value || b.dataset.title || "");
    }));
  }

  function isSelected(title, v){
    const s = steps[state.step]?.id;
    if (s === "focus") return state.focus === title;
    if (s === "when") return state.when === v;
    if (s === "impact") return state.impact === v;
    return false;
  }

  // ====== NAV / VALIDATION ======
  function canGoNext() {
    const s = steps[state.step];
    if (!s) return true;

    if (s.id === "focus")  return !!state.focus;
    if (s.id === "when")   return !!state.when;
    if (s.id === "impact") return !!state.impact;

    return true;
  }

  function updateNav() {
    elPrev.disabled = state.step === 0;

    // last step: Next becomes disabled (we keep it simple)
    if (state.step === TOTAL_STEPS - 1) {
      elNext.disabled = true;
      return;
    }

    // for all other steps:
    elNext.disabled = !canGoNext();
    elNext.textContent = (state.step === TOTAL_STEPS - 2) ? "Fertig" : "Weiter";
  }

  // ====== PROGRESS ======
  function renderDots(){
    elDots.innerHTML = "";
    for(let i=0;i<TOTAL_STEPS;i++){
      const d = document.createElement("div");
      d.className = "k-dot" + (i === 0 ? " active" : "");
      elDots.appendChild(d);
    }
  }

  function setProgress(stepIndex){
    const pct = Math.round((stepIndex/(TOTAL_STEPS-1))*100);
    elFill.style.width = `${pct}%`;
    elStepNow.textContent = String(stepIndex+1);

    const dots = [...elDots.querySelectorAll(".k-dot")];
    dots.forEach((d,i)=> d.classList.toggle("active", i<=stepIndex));
  }

  // ====== RISK / AMPEL ======
  function assessRisk(text){
    const t = (text || "").toLowerCase();

    // High-risk words (German) – blunt on purpose.
    const danger = [
      "selbstmord", "suizid", "umbringen", "mich töten", "mich toeten",
      "nicht mehr leben", "will nicht mehr leben", "ich bringe mich um",
      "ich werde mich umbringen", "ich tue mir was an", "ich tu mir was an"
    ];

    if (danger.some(w => t.includes(w))) return "danger";

    // warning keywords
    const warn = ["panik", "attacke", "angst", "extrem", "überfordert", "ueberfordert"];
    if (warn.some(w => t.includes(w))) return "warn";

    return state.risk || "ok";
  }

  function bumpRiskFromStructured(){
    // If already danger, keep it.
    if (state.risk === "danger") return;

    // stronger + long duration => warn
    if ((state.impact === "stark") && (state.when === "Monate+")) {
      state.risk = "warn";
      return;
    }
    // mild default
    if (!state.risk) state.risk = "ok";
  }

  function updateStatusFromRisk(){
    const r = state.risk || "ok";
    if (r === "danger") {
      elStatusDot.style.background = "var(--danger)";
      elStatusDot.style.boxShadow = "0 0 18px rgba(255,59,59,.35)";
      elStatusText.textContent = "Wichtig.";
      return;
    }
    if (r === "warn") {
      elStatusDot.style.background = "var(--warn)";
      elStatusDot.style.boxShadow = "0 0 18px rgba(255,204,0,.28)";
      elStatusText.textContent = "Achte auf dich.";
      return;
    }
    elStatusDot.style.background = "var(--ok)";
    elStatusDot.style.boxShadow = "0 0 14px rgba(17,246,165,.25)";
    elStatusText.textContent = "Alles ruhig.";
  }

  // ====== COPY ======
  function buildHeadline(focus){
    if (focus === "Stress & Anspannung") return "Stress: wir bringen Ruhe in die Lage.";
    if (focus === "Schlaf & Erholung") return "Schlaf: wir sortieren das sauber.";
    if (focus === "Körperliche Beschwerden") return "Körper: wir bleiben klar und strukturiert.";
    return "Orientierung: wir klären den nächsten Schritt.";
  }

  function buildBody(focus){
    if (focus === "Stress & Anspannung") {
      return "Wenn Druck und Gedankenkarussell dominieren, hilft ein ärztliches Gespräch oft dabei, Optionen und nächste Schritte klar zu sortieren – ohne Chaos, ohne Drama.";
    }
    if (focus === "Schlaf & Erholung") {
      return "Wenn Schlaf dauerhaft kippt, ist es sinnvoll, das ärztlich einzuordnen. So bekommst du Klarheit, was sinnvoll ist – und was du dir sparen kannst.";
    }
    if (focus === "Körperliche Beschwerden") {
      return "Wenn Beschwerden bleiben oder stärker werden, ist eine ärztliche Abklärung der sauberste nächste Schritt. Du bestimmst Tempo und Tiefe.";
    }
    return "Wenn du unsicher bist, bringt ein ärztliches Gespräch oft die schnellste Klarheit. CanaDoc begleitet nur bis zur Orientierung – die Entscheidung trifft ein Arzt.";
  }

  // ====== LABELS ======
  function labelWhen(v){
    if (v === "Tage") return "seit ein paar Tagen";
    if (v === "Wochen") return "seit Wochen";
    if (v === "Monate+") return "Monate oder länger";
    return "–";
  }
  function labelImpact(v){
    if (v === "leicht") return "leicht";
    if (v === "mittel") return "mittel";
    if (v === "stark") return "stark";
    return "–";
  }

  // ====== UTILS ======
  function scrollTop(){ window.scrollTo({ top: 0, behavior: "smooth" }); }

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function escapeAttr(str){ return escapeHtml(str).replaceAll("\n"," "); }
})();
