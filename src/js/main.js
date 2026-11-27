/* ==========================================================================
   THE TSONANI TIMES — main.js
   Vanilla JS, no dependencies.

   01. Setup & helpers
   02. Intro overlay (magnifying glass)
   03. Image fallbacks
   04. Dateline & local clock
   05. Navigation (hamburger, scrolled state, active section)
   06. Scroll reveal
   07. Gallery tilt & lightbox
   08. Contact form (Formspree or mailto fallback)
   ========================================================================== */

(function () {
  "use strict";

  /* 01. SETUP & HELPERS ================================================== */
  document.documentElement.classList.add("js");

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover      = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const CONTACT_EMAIL = "tsonaninyiko@gmail.com";
  const TIMEZONE      = "Africa/Johannesburg";

  // sessionStorage can throw in private mode / blocked storage
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    set(key, val) { try { sessionStorage.setItem(key, val); } catch (e) { /* ignore */ } }
  };

  /* 02. INTRO OVERLAY ==================================================== */
  function initIntro() {
    const intro = $("#intro");
    if (!intro || storage.get("tt-intro-seen")) return;

    intro.hidden = false;
    document.documentElement.classList.remove("intro-pending");
    document.body.classList.add("intro-open");
    const useLens = canHover && !reducedMotion;
    if (!useLens) document.documentElement.classList.add("no-lens");

    let closed = false;
    let timer;
    const startedAt = Date.now();
    const IDLE_MS = 4000;     // dismiss after ~4s without movement
    const MAX_MS  = 12000;    // ...but never keep visitors longer than this

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      storage.set("tt-intro-seen", "1");
      intro.classList.add("is-leaving");
      document.body.classList.remove("intro-open");
      setTimeout(() => { intro.hidden = true; }, reducedMotion ? 0 : 750);
      intro.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
    }

    function schedule(ms) {
      clearTimeout(timer);
      const remaining = MAX_MS - (Date.now() - startedAt);
      timer = setTimeout(close, Math.max(0, Math.min(ms, remaining)));
    }

    // Lens follows the cursor; rAF keeps it smooth
    let frame = null;
    function onMove(e) {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        intro.style.setProperty("--x", e.clientX + "px");
        intro.style.setProperty("--y", e.clientY + "px");
      });
      schedule(IDLE_MS);
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter") close();
    }

    if (useLens) intro.addEventListener("mousemove", onMove);
    intro.addEventListener("click", close);
    $("#intro-skip").addEventListener("click", (e) => { e.stopPropagation(); close(); });
    document.addEventListener("keydown", onKey);
    $("#intro-skip").focus({ preventScroll: true });

    // Touch devices get a short look at the subject, then a fade
    schedule(useLens ? IDLE_MS : 2600);
  }

  /* 03. IMAGE FALLBACKS ================================================== */
  // If a photo/screenshot is missing, show the lavender "NT" / "Evidence pending" block.
  function initImageFallbacks() {
    $$(".img-frame img").forEach((img) => {
      const markMissing = () => img.closest(".img-frame").classList.add("is-missing");
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing();
      img.addEventListener("error", markMissing);
    });
  }

  /* 04. DATELINE & LOCAL CLOCK =========================================== */
  function initDates() {
    const dateEl = $("#dateline-date");
    if (dateEl) {
      const today = new Date().toLocaleDateString("en-ZA", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIMEZONE
      });
      dateEl.textContent = today.replace(",", "");          // "Friday 27 November 2026"
      dateEl.setAttribute("datetime", new Date().toISOString().slice(0, 10));
    }

    const clock = $("#local-clock");
    if (!clock) return;
    const fmt = new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TIMEZONE
    });
    const tick = () => {
      const now = new Date();
      clock.textContent = fmt.format(now) + " SAST";
      clock.setAttribute("datetime", now.toISOString());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* 05. NAVIGATION ======================================================= */
  function initNav() {
    const nav    = $("#nav");
    const toggle = $("#nav-toggle");
    const panel  = $("#nav-panel");
    if (!nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    // Close the mobile panel after choosing a link, or on Escape / outside click
    $$("a", panel).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false);
    });

    // Shadow once the nav is stuck
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Highlight the nav link for the section in view
    const links = $$(".nav__links a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const sections = Array.from(map.keys()).map((id) => document.getElementById(id)).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        const link = map.get(entry.target.id);
        if (link) { link.classList.add("is-active"); link.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* 06. SCROLL REVEAL ==================================================== */
  function initReveal() {
    const items = $$(".reveal");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => io.observe(el));
  }

  /* 07. PHOTO DECK (SHUFFLE) & LIGHTBOX ================================== */
  function initGallery() {
    const deck  = $("#deck");
    const clips = $$(".deck__card");
    if (!deck || !clips.length) return;

    // ---- The deck: order[0] is the card on top ----
    let order = clips.map((_, i) => i);
    let busy = false;
    let flip = 1;                                   // alternate the fly-out side
    const countEl = $("#deck-count");
    const VISIBLE = 4;                              // cards visible in the pile

    // Each card keeps its own slight tilt, like a messy stack of snapshots
    clips.forEach((c) => c.style.setProperty("--rot", (Math.random() * 10 - 5).toFixed(2) + "deg"));

    function layout() {
      order.forEach((cardIndex, pos) => {
        const card = clips[cardIndex];
        card.style.setProperty("--i", pos);
        card.classList.toggle("is-top", pos === 0);
        card.classList.toggle("is-deep", pos >= VISIBLE);
        card.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
      });
      if (countEl) countEl.textContent = `${order[0] + 1} / ${clips.length}`;
    }

    // Next: top card flies out to the side, then tucks in under the pile
    function next(dir) {
      if (busy) return;
      const top = clips[order[0]];
      order = order.slice(1).concat(order[0]);
      if (reducedMotion) { layout(); return; }

      busy = true;
      flip = dir || -flip;
      top.style.setProperty("--dir", flip);
      top.classList.remove("is-top");
      top.classList.add("is-flying");
      setTimeout(() => {
        top.classList.remove("is-flying");
        top.classList.add("is-tucking");
        layout();
        setTimeout(() => { top.classList.remove("is-tucking"); busy = false; }, 450);
      }, 320);
    }

    // Previous: bottom card is pulled out and dropped back on top
    function prev() {
      if (busy) return;
      const bottomIndex = order[order.length - 1];
      const card = clips[bottomIndex];
      order = [bottomIndex].concat(order.slice(0, -1));
      if (reducedMotion) { layout(); return; }

      busy = true;
      card.style.setProperty("--dir", -1);
      card.classList.remove("is-deep");
      card.style.transition = "none";
      card.classList.add("is-flying");          // jump (instantly) out to the side…
      void card.offsetWidth;                    // apply that position before animating
      card.style.transition = "";
      card.classList.remove("is-flying");       // …then glide onto the top of the pile
      layout();
      setTimeout(() => { busy = false; }, 450);
    }

    layout();
    deck.addEventListener("click", () => next());
    deck.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
    });
    $("#deck-next")?.addEventListener("click", () => next(1));
    $("#deck-prev")?.addEventListener("click", prev);

    // Swipe the deck on touch screens
    let swipeX = null;
    deck.addEventListener("touchstart", (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
    deck.addEventListener("touchend", (e) => {
      if (swipeX === null) return;
      const dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) { e.preventDefault(); dx < 0 ? next(-1) : next(1); } // a swipe flings the card that way
    });

    // ---- Lightbox (opened with "Enlarge photo") ----
    const box = $("#lightbox");
    if (!box || !clips.length) return;
    const img     = $(".lightbox__img", box);
    const caption = $(".lightbox__caption", box);
    let index = 0;
    let lastFocus = null;

    const items = clips.map((c) => {
      const im = $("img", c);
      return { src: im.getAttribute("src"), alt: im.alt, caption: $("figcaption", c)?.textContent || "" };
    });

    function show(i) {
      index = (i + items.length) % items.length;
      const item = items[index];
      img.src = item.src;
      img.alt = item.alt;
      caption.textContent = item.caption + "  ·  " + (index + 1) + " / " + items.length;
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => box.classList.add("is-open"));
      $(".lightbox__close", box).focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { box.hidden = true; }, reducedMotion ? 0 : 300);
      if (lastFocus) lastFocus.focus();
    }

    $("#deck-enlarge")?.addEventListener("click", () => open(order[0]));
    $(".lightbox__close", box).addEventListener("click", close);
    $(".lightbox__nav--prev", box).addEventListener("click", () => show(index - 1));
    $(".lightbox__nav--next", box).addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => { if (e.target === box) close(); });

    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else if (e.key === "Tab") {
        // Keep focus inside the lightbox
        const focusables = $$("button", box);
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Basic swipe support on touch screens
    let startX = null;
    box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* 08. CONTACT FORM ===================================================== */
  function initForm() {
    const form   = $("#contact-form");
    const status = $("#form-status");
    if (!form) return;

    const setStatus = (msg, isError) => {
      status.textContent = msg;
      status.classList.toggle("is-error", !!isError);
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Simple validation with friendly messages
      let firstInvalid = null;
      $$("input, textarea", form).forEach((field) => {
        const ok = field.checkValidity() && field.value.trim() !== "";
        field.closest(".field").classList.toggle("has-error", !ok);
        field.setAttribute("aria-invalid", String(!ok));
        if (!ok && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        setStatus("Please complete every field (with a valid email) before sending.", true);
        firstInvalid.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const formspreeId = form.dataset.formspree.trim(); // TODO: set data-formspree in index.html

      // Option A: Formspree (only when an ID is configured)
      if (formspreeId) {
        setStatus("Sending your letter…");
        try {
          const res = await fetch("https://formspree.io/f/" + encodeURIComponent(formspreeId), {
            method: "POST",
            headers: { Accept: "application/json" },
            body: new FormData(form)
          });
          if (!res.ok) throw new Error("Request failed");
          form.reset();
          setStatus("Letter received. Replies usually arrive within 24 hours. ✦");
          return;
        } catch (err) {
          setStatus("The wire is down, so we're opening your email app instead.", true);
          // fall through to mailto
        }
      }

      // Option B: mailto fallback — opens the visitor's email app, pre-filled
      const body = `${data.message}\n\n— ${data.name}\n${data.email}`;
      const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      if (!formspreeId) setStatus("Your email app should open with the letter ready to send. If it doesn't, write to " + CONTACT_EMAIL + ".");
    });

    // Clear the error state as soon as the visitor fixes a field
    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field && e.target.checkValidity()) {
        field.classList.remove("has-error");
        e.target.removeAttribute("aria-invalid");
      }
    });
  }

  /* 09. GOLD STAR CURSOR TRAIL =========================================== */
  // Three gold stars follow the pointer; the one nearest the pointer is the biggest.
  function initStarTrail() {
    const trail = $("#star-trail");
    if (!trail || !canHover || reducedMotion) return;

    const SIZES  = [20, 14, 9];       // px: nearest → furthest
    const EASING = [0.35, 0.28, 0.22]; // how quickly each star catches up
    const starSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.63 2 8.76l6.91-1z"/></svg>';

    const stars = SIZES.map((size) => {
      const el = document.createElement("span");
      el.className = "star";
      el.style.setProperty("--size", size + "px");
      el.innerHTML = starSVG;
      trail.appendChild(el);
      return { el, x: -100, y: -100 };
    });

    const mouse = { x: -100, y: -100 };
    let running = false;
    let idleFrames = 0;

    function frame() {
      let moving = false;
      stars.forEach((star, i) => {
        const target = i === 0 ? mouse : stars[i - 1];   // each star chases the one in front
        const dx = target.x - star.x, dy = target.y - star.y;
        star.x += dx * EASING[i];
        star.y += dy * EASING[i];
        if (Math.abs(dx) + Math.abs(dy) > 0.2) moving = true;
        star.el.style.transform = `translate(${star.x}px, ${star.y}px) rotate(${(star.x + star.y) * 0.6}deg)`;
      });
      // Stop the loop once everything has settled (saves battery)
      idleFrames = moving ? 0 : idleFrames + 1;
      if (idleFrames < 10) requestAnimationFrame(frame); else running = false;
    }

    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      if (mouse.x < 0) stars.forEach((s) => { s.x = e.clientX; s.y = e.clientY; }); // first move: start on the pointer
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      trail.classList.add("is-active");
      if (!running) { running = true; idleFrames = 0; requestAnimationFrame(frame); }
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => trail.classList.remove("is-active"));
  }

  /* 10. CROSSWORD ========================================================= */
  // Every answer comes from this portfolio. To change the puzzle, edit the
  // words below: row/col are 0-based grid positions, dir is "across" or "down".
  // Words must cross on matching letters and must not touch each other otherwise.
  const CROSSWORD = {
    rows: 13,
    cols: 15,
    words: [
      { answer: "XITSONGA",   row: 0, col: 0,  dir: "down",   clue: "First language in her 'Speaks fluently' box" },
      { answer: "TSONANI",    row: 2, col: 2,  dir: "down",   clue: "Her surname, printed in lavender on the masthead" },
      { answer: "SOSHANGUVE", row: 3, col: 0,  dir: "across", clue: "The TUT campus where she studies" },
      { answer: "GENAI",      row: 3, col: 6,  dir: "down",   clue: "The WeThinkCode_ course she completed in 2025" },
      { answer: "ASSEMBLY",   row: 5, col: 9,  dir: "down",   clue: "The lowest-level language in the Lab Report" },
      { answer: "JAVA",       row: 5, col: 14, dir: "down",   clue: "Object-oriented language, code JAV" },
      { answer: "ARMS",       row: 6, col: 6,  dir: "across", clue: "Exhibit A, an academic resource management system" },
      { answer: "PRETORIA",   row: 8, col: 7,  dir: "across", clue: "The city on her dateline" }
    ]
  };

  function initCrossword() {
    const gridEl = $("#cw-grid");
    if (!gridEl) return;
    const { rows, cols, words } = CROSSWORD;

    // Build the solution grid and give each word its clue number
    const solution = Array.from({ length: rows }, () => Array(cols).fill(null));
    const cellWords = {};                 // "r,c" → { across: word, down: word }
    const starts = {};                    // "r,c" → clue number
    const key = (r, c) => r + "," + c;

    words
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .forEach((w) => {
        const k = key(w.row, w.col);
        if (!starts[k]) starts[k] = Object.keys(starts).length + 1;
        w.number = starts[k];
      });

    words.forEach((w) => {
      w.cells = [...w.answer].map((ch, i) => {
        const r = w.row + (w.dir === "down" ? i : 0);
        const c = w.col + (w.dir === "across" ? i : 0);
        if (solution[r][c] && solution[r][c] !== ch) console.warn("Crossword clash at", r, c);
        solution[r][c] = ch;
        (cellWords[key(r, c)] = cellWords[key(r, c)] || {})[w.dir] = w;
        return { r, c };
      });
    });

    // Render the grid
    gridEl.style.setProperty("--cols", cols);
    const inputs = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.setAttribute("role", "gridcell");
        if (!solution[r][c]) {
          cell.className = "cw-cell cw-cell--block";
        } else {
          cell.className = "cw-cell";
          const num = starts[key(r, c)];
          if (num) cell.insertAdjacentHTML("beforeend", `<span class="cw-num">${num}</span>`);
          const input = document.createElement("input");
          input.maxLength = 1;
          input.autocomplete = "off";
          input.setAttribute("autocapitalize", "characters");
          input.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
          input.dataset.r = r;
          input.dataset.c = c;
          cell.appendChild(input);
          inputs[key(r, c)] = input;
        }
        gridEl.appendChild(cell);
      }
    }

    // Render the clues
    const lists = { across: $("#cw-across"), down: $("#cw-down") };
    words
      .slice()
      .sort((a, b) => a.number - b.number)
      .forEach((w) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${w.number}</b>${w.clue} <span class="crossword__len">(${w.answer.length})</span>`;
        li.addEventListener("click", () => { setActive(w); inputs[key(w.row, w.col)].focus(); });
        w.li = li;
        lists[w.dir].appendChild(li);
      });

    // Active word handling
    let active = null;
    const activeLabel = $("#cw-active");
    function setActive(w) {
      if (active) active.cells.forEach(({ r, c }) => inputs[key(r, c)].parentNode.classList.remove("is-word"));
      words.forEach((x) => x.li.classList.remove("is-active"));
      active = w;
      w.cells.forEach(({ r, c }) => inputs[key(r, c)].parentNode.classList.add("is-word"));
      w.li.classList.add("is-active");
      activeLabel.textContent = `${w.number} ${w.dir}: ${w.clue}`;
    }

    function wordFor(r, c, preferDir) {
      const both = cellWords[key(r, c)];
      return both[preferDir] || both.across || both.down;
    }

    function move(input, step) {
      const idx = active.cells.findIndex(({ r, c }) => r === +input.dataset.r && c === +input.dataset.c);
      const next = active.cells[idx + step];
      if (next) inputs[key(next.r, next.c)].focus();
    }

    Object.values(inputs).forEach((input) => {
      const r = +input.dataset.r, c = +input.dataset.c;

      input.addEventListener("focus", () => {
        if (!active || !active.cells.some((p) => p.r === r && p.c === c)) setActive(wordFor(r, c, active ? active.dir : "across"));
        input.select();
      });

      // Clicking an already-focused crossing square switches direction
      input.addEventListener("mousedown", () => {
        if (document.activeElement === input) {
          const both = cellWords[key(r, c)];
          if (both.across && both.down) setActive(active === both.across ? both.down : both.across);
        }
      });

      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase();
        input.parentNode.classList.remove("is-wrong", "is-right");
        if (input.value) move(input, 1);
        checkSolved(false);
      });

      input.addEventListener("keydown", (e) => {
        const arrows = { ArrowRight: [0, 1, "across"], ArrowLeft: [0, -1, "across"], ArrowDown: [1, 0, "down"], ArrowUp: [-1, 0, "down"] };
        if (e.key === "Backspace" && !input.value) { e.preventDefault(); move(input, -1); }
        else if (arrows[e.key]) {
          e.preventDefault();
          const [dr, dc, dir] = arrows[e.key];
          const target = inputs[key(r + dr, c + dc)];
          if (target) { const w = cellWords[key(r + dr, c + dc)][dir]; if (w) setActive(w); target.focus(); }
        }
      });
    });

    // Buttons
    const status = $("#cw-status");
    const each = (fn) => Object.entries(inputs).forEach(([k, input]) => { const [r, c] = k.split(",").map(Number); fn(input, solution[r][c]); });

    function checkSolved(announce) {
      words.forEach((w) => w.li.classList.toggle("is-solved", w.cells.every(({ r, c }) => inputs[key(r, c)].value === solution[r][c])));
      const done = Object.entries(inputs).every(([k, input]) => { const [r, c] = k.split(",").map(Number); return input.value === solution[r][c]; });
      if (done) status.textContent = "Case closed ✦ You solved the Tsonani crossword!";
      else if (announce) {
        const wrong = $$(".cw-cell.is-wrong", gridEl).length;
        const empty = Object.values(inputs).filter((i) => !i.value).length;
        status.textContent = wrong ? `${wrong} letter${wrong > 1 ? "s" : ""} don't match the record.` : `So far so good. ${empty} square${empty === 1 ? "" : "s"} still blank.`;
      }
      return done;
    }

    $("#cw-check").addEventListener("click", () => {
      each((input, ch) => {
        input.parentNode.classList.toggle("is-wrong", !!input.value && input.value !== ch);
        input.parentNode.classList.toggle("is-right", input.value === ch);
      });
      checkSolved(true);
    });
    $("#cw-reveal").addEventListener("click", () => {
      each((input, ch) => { input.value = ch; input.parentNode.classList.remove("is-wrong"); input.parentNode.classList.add("is-right"); });
      checkSolved(false);
      status.textContent = "Evidence revealed. Every answer is in the paper above.";
    });
    $("#cw-clear").addEventListener("click", () => {
      each((input) => { input.value = ""; input.parentNode.classList.remove("is-wrong", "is-right"); });
      words.forEach((w) => w.li.classList.remove("is-solved"));
      status.textContent = "";
    });
  }

  /* 11. SUDOKU ============================================================ */
  // Puzzles are generated in the browser: a random full grid is built, then
  // numbers are removed one by one, keeping only removals that leave exactly
  // one solution. GIVENS controls how many numbers each level starts with.
  function initSudoku() {
    const gridEl = $("#sd-grid");
    if (!gridEl) return;
    const GIVENS = { easy: 40, medium: 32, hard: 27 };

    const row = (i) => Math.floor(i / 9), col = (i) => i % 9;
    const box = (i) => Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3);
    // peers[i] = every other cell sharing a row, column or box with cell i
    const peers = Array.from({ length: 81 }, (_, i) =>
      Array.from({ length: 81 }, (_, j) => j).filter((j) => j !== i && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))));

    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const candidates = (g, i) => { const used = new Set(peers[i].map((p) => g[p])); return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n)); };

    // Fill a grid completely (random order, so every puzzle is different)
    function fill(g) {
      const i = g.indexOf(0);
      if (i < 0) return true;
      for (const n of shuffle(candidates(g, i))) { g[i] = n; if (fill(g)) return true; }
      g[i] = 0;
      return false;
    }

    // Count solutions, stopping at `limit` (we only need to know "exactly one")
    function countSolutions(g, limit = 2) {
      let best = -1, bestCands = null;
      for (let i = 0; i < 81; i++) {               // pick the emptiest-choice cell first (fast)
        if (g[i]) continue;
        const c = candidates(g, i);
        if (!c.length) return 0;
        if (!bestCands || c.length < bestCands.length) { best = i; bestCands = c; if (c.length === 1) break; }
      }
      if (best < 0) return 1;
      let total = 0;
      for (const n of bestCands) {
        g[best] = n;
        total += countSolutions(g, limit - total);
        if (total >= limit) break;
      }
      g[best] = 0;
      return total;
    }

    function generate(level) {
      const solution = Array(81).fill(0);
      fill(solution);
      const puzzle = solution.slice();
      let filled = 81;
      for (const i of shuffle([...Array(81).keys()])) {
        if (filled <= GIVENS[level]) break;
        const keep = puzzle[i];
        puzzle[i] = 0;
        if (countSolutions(puzzle.slice()) !== 1) puzzle[i] = keep; else filled--;
      }
      return { puzzle, solution };
    }

    // ---- Board ----
    const cells = [];
    for (let i = 0; i < 81; i++) {
      const input = document.createElement("input");
      input.className = "sd-cell";
      input.inputMode = "numeric";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.dataset.i = i;
      input.setAttribute("aria-label", `Row ${row(i) + 1}, column ${col(i) + 1}`);
      if (col(i) % 3 === 2 && col(i) < 8) input.classList.add("sd-cell--edge-r");
      if (row(i) % 3 === 2 && row(i) < 8) input.classList.add("sd-cell--edge-b");
      gridEl.appendChild(input);
      cells.push(input);
    }

    const status = $("#sd-status");
    const timerEl = $("#sd-timer");
    let state = null, current = 0, seconds = 0, timer = null, solved = false;

    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    function startTimer() {
      clearInterval(timer);
      seconds = 0; timerEl.textContent = "00:00";
      timer = setInterval(() => { if (!document.hidden) timerEl.textContent = fmt(++seconds); }, 1000);
    }

    const values = () => cells.map((c) => +c.value || 0);

    function refresh() {
      const v = values();
      const focusVal = v[current];
      cells.forEach((c, i) => {
        // Clashes: same digit somewhere among the cell's peers
        c.classList.toggle("is-conflict", !!v[i] && peers[i].some((p) => v[p] === v[i]));
        c.classList.toggle("is-peer", i !== current && peers[current].includes(i));
        c.classList.toggle("is-same", !!focusVal && i !== current && v[i] === focusVal);
      });
      if (!solved && v.every(Boolean) && !$$(".sd-cell.is-conflict", gridEl).length) {
        solved = true;
        clearInterval(timer);
        status.textContent = `Case closed ✦ Solved in ${fmt(seconds)}. Nicely done!`;
        gridEl.classList.add("is-solved");
      }
    }

    function setValue(i, n) {
      const c = cells[i];
      if (c.readOnly || solved) return;
      c.value = n ? String(n) : "";
      c.classList.remove("is-wrong", "is-hint");
      refresh();
    }

    function newPuzzle() {
      const level = $("#sd-level").value;
      status.textContent = "Setting a fresh puzzle…";
      // Let the message paint before the (short) generation work
      setTimeout(() => {
        state = generate(level);
        solved = false;
        gridEl.classList.remove("is-solved");
        cells.forEach((c, i) => {
          const n = state.puzzle[i];
          c.value = n ? String(n) : "";
          c.readOnly = !!n;
          c.classList.toggle("is-given", !!n);
          c.classList.remove("is-wrong", "is-hint", "is-conflict");
        });
        current = state.puzzle.indexOf(0);
        refresh();
        startTimer();
        status.textContent = `${level[0].toUpperCase() + level.slice(1)} puzzle · ${GIVENS[level]} numbers given.`;
      }, 30);
    }

    cells.forEach((c, i) => {
      c.addEventListener("focus", () => { current = i; refresh(); });
      c.addEventListener("input", () => {
        const n = (c.value.match(/[1-9]/g) || []).pop();
        setValue(i, n ? +n : 0);
      });
      c.addEventListener("keydown", (e) => {
        const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
        if (moves[e.key] !== undefined) {
          e.preventDefault();
          const next = i + moves[e.key];
          if (next >= 0 && next < 81 && (Math.abs(moves[e.key]) === 9 || row(next) === row(i))) cells[next].focus();
        } else if ((e.key === "Backspace" || e.key === "Delete") && !c.readOnly) {
          e.preventDefault(); setValue(i, 0);
        }
      });
    });

    // On-screen number pad (keeps focus on the selected square)
    $$("#sd-pad button").forEach((b) => {
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => { setValue(current, +b.dataset.n); cells[current].focus({ preventScroll: true }); });
    });

    $("#sd-new").addEventListener("click", newPuzzle);
    $("#sd-level").addEventListener("change", newPuzzle);
    $("#sd-clear").addEventListener("click", () => {
      cells.forEach((c, i) => { if (!c.readOnly) { c.value = ""; c.classList.remove("is-wrong", "is-hint"); } });
      solved = false; gridEl.classList.remove("is-solved");
      refresh(); status.textContent = "Board cleared. Givens kept.";
    });
    $("#sd-check").addEventListener("click", () => {
      if (!state) return;
      let wrong = 0, empty = 0;
      cells.forEach((c, i) => {
        const bad = !c.readOnly && c.value && +c.value !== state.solution[i];
        c.classList.toggle("is-wrong", !!bad);
        if (bad) wrong++;
        if (!c.value) empty++;
      });
      if (!solved) status.textContent = wrong ? `${wrong} number${wrong > 1 ? "s" : ""} don't belong there.` : `All correct so far. ${empty} square${empty === 1 ? "" : "s"} to go.`;
    });
    $("#sd-hint").addEventListener("click", () => {
      if (!state || solved) return;
      const open = cells.map((c, i) => i).filter((i) => !cells[i].readOnly && +cells[i].value !== state.solution[i]);
      if (!open.length) return;
      const i = open.includes(current) ? current : open[Math.floor(Math.random() * open.length)];
      setValue(i, state.solution[i]);
      cells[i].classList.add("is-hint");
      cells[i].focus({ preventScroll: true });
    });

    // Build the first puzzle when the section comes near the screen (keeps page load light)
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); newPuzzle(); }
      }, { rootMargin: "400px 0px" });
      io.observe(gridEl);
    } else newPuzzle();
  }

  /* BOOT ================================================================= */
  initStarTrail();
  initCrossword();
  initSudoku();
  initIntro();
  initImageFallbacks();
  initDates();
  initNav();
  initReveal();
  initGallery();
  initForm();
})();
