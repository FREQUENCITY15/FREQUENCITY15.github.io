/* The Claim Crucible — renderer + interaction logic.
 * Self-contained, no external dependencies. Reads CWD.CASE_DATA from case-data.js.
 * Pure JS; case JSON consistency is verified by the node test harness, not in-browser. */
(function () {
  "use strict";

  var CASE = (typeof window !== "undefined" && window.CASE_DATA) || null;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Render a citation tag like [S01] linking to the source card. */
  function renderCites(cites) {
    if (!Array.isArray(cites) || cites.length === 0) return "";
    return ' <span class="cc-cites">' + cites.map(function (c) {
      return '<code class="cc-cite"><a href="#source-' + c.toLowerCase() + '" data-jump-source="' + c.toLowerCase() + '">[' + esc(c) + ']</a></code>';
    }).join(" ") + "</span>";
  }

  var SOURCES = [];
  var STATUS_ORDER = { supports: 0, challenges: 1, contextual: 2, ambiguous: 3 };
  var AUTHORITY_ORDER = { high: 0, medium: 1, low: 2 };

  function sourceStatus(s) { return s.status || "contextual"; }
  function sourceAuthority(s) { return s.authority || "low"; }

  function badge(label, cls, extra) {
    return '<span class="cc-badge ' + cls + '"' + (extra || "") + ">" + esc(label) + "</span>";
  }

  /* Build a single source card element (not yet in DOM is fine; re-render on filter). */
  function buildSourceCard(s) {
    var card = document.createElement("li");
    card.className = "cc-source-card " + (s.status || "contextual");
    card.id = "source-" + s.id.toLowerCase();
    card.setAttribute("data-status", s.status || "contextual");
    card.setAttribute("data-authority", s.authority || "low");
    card.setAttribute("data-verification", s.verification || "unresolved");
    card.setAttribute("data-search", ((s.title || "") + " " + (s.id || "") + " " + (s.publisher || "") + " " + (s.summary || "")).toLowerCase());

    var head = document.createElement("div");
    head.className = "cc-source-head";
    head.innerHTML =
      '<span class="cc-source-id">' + esc(s.id) + "</span>" +
      (s.date ? ' &middot; <span class="cc-source-meta">' + esc(s.date) + "</span>" : "");

    var title = document.createElement("div");
    title.className = "cc-source-title";
    title.textContent = s.title || "(untitled)";

    var meta = document.createElement("div");
    meta.className = "cc-source-meta";
    meta.textContent = [s.publisher, s.author, s["source_type"]].filter(Boolean).join(" — ");

    head.appendChild(title);
    head.appendChild(meta);
    card.appendChild(head);

    var badges = document.createElement("div");
    badges.className = "cc-source-badges";
    badges.innerHTML =
      badge(s.status || "contextual", "status " + (s.status || "contextual"), ' title="How this source bears on the claim"') +
      badge(s.authority || "low", "authority " + (s.authority || "low"), ' title="Source authority"') +
      badge(s["source_type"] || "secondary", "type", ' title="Source type"') +
      badge("verify: " + (s.verification || "unresolved"), "verify " + (s.verification || "unresolved"), ' title="How it was verified"') +
      badge("indep: " + (s.independence || "unresolved"), "indep " + (s.independence || "unresolved"), ' title="Independent vs derivative"');
    card.appendChild(badges);

    var summary = document.createElement("div");
    summary.className = "cc-source-summary";
    summary.innerHTML =
      (s.summary ? "<p>" + esc(s.summary) + "</p>" : "") +
      (s.subclaim ? "<p><strong>Subclaim:</strong> " + esc(s.subclaim) + "</p>" : "") +
      (Array.isArray(s.strength) ?
        strengthList(s.strength) :
        (s.strength ? "<p>" + esc(s.strength) + "</p>" : "")) +
      '<button class="cc-toggle" type="button" aria-expanded="false"><span class="cc-more">More detail</span><span class="cc-less">Less detail</span></button>' +
      '<div class="cc-source-detail" hidden></div>';
    card.appendChild(summary);

    var actions = document.createElement("div");
    actions.className = "cc-source-actions";
    if (s.url) {
      var a = document.createElement("a");
      a.className = "cc-link";
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Open source ↗";
      a.setAttribute("aria-label", "Open source " + s.id + " in a new tab");
      actions.appendChild(a);
    }
    card.appendChild(actions);

    return { card: card, detail: $(".cc-source-detail", summary), toggle: $(".cc-toggle", summary) };
  }

  function strengthList(arr) {
    var out = '<ul class="cc-strength">';
    out += (Array.isArray(arr.str) ? arr.str : arr).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    out += "</ul>";
    return out;
  }

  function renderSourceLibrary() {
    var wrap = $("#source-grid");
    if (!wrap) return;
    wrap.innerHTML = "";
    SOURCES = (CASE && CASE.sources) ? CASE.sources.slice() : [];
    SOURCES.forEach(function (s) {
      var built = buildSourceCard(s);
      built.card._detail = built.detail;
      built.card._toggle = built.toggle;
      wrap.appendChild(built.card);
      built.toggle.addEventListener("click", function () {
        var expanded = built.toggle.getAttribute("aria-expanded") === "true";
        built.toggle.setAttribute("aria-expanded", String(!expanded));
        built.detail.hidden = expanded;
        if (!expanded) built.detail.innerHTML = renderDetail(built.detail, s);
      });
    });
    applyFilters();
    updateSourceCount();
  }

  function renderDetail(el, s) {
    var html = "";
    if (s.paraphrase) html += "<p><strong>Paraphrase:</strong> " + esc(s.paraphrase) + "</p>";
    if (s.strength) html += "<p><strong>Strength:</strong> " + esc(s.strength) + "</p>";
    if (s.limitation) html += "<p><strong>Limitation:</strong> " + esc(s.limitation) + "</p>";
    if (s.relevance) html += "<p><strong>Relevance:</strong> " + esc(s.relevance) + "</p>";
    if (s.independence) html += "<p><strong>Independence:</strong> " + esc(s.independence) + "</p>";
    if (s.verification) html += "<p><strong>Verification:</strong> " + esc(s.verification) + "</p>";
    if (!html) html = "<p>No additional detail.</p>";
    return html;
  }

  function currentFilters() {
    var search = ($("#source-search") && $("#source-search").value || "").trim().toLowerCase();
    return {
      search: search,
      status: $("#filter-status") ? $("#filter-status").value : "all",
      authority: $("#filter-authority") ? $("#filter-authority").value : "all",
      verification: $("#filter-verification") ? $("#filter-verification").value : "all"
    };
  }

  function applyFilters() {
    var f = currentFilters();
    var visible = 0;
    $$("#source-grid .cc-source-card").forEach(function (card) {
      var status = card.getAttribute("data-status");
      var authority = card.getAttribute("data-authority");
      var verification = card.getAttribute("data-verification");
      var hay = card.getAttribute("data-search");
      var ok =
        (f.status === "all" || status === f.status) &&
        (f.authority === "all" || authority === f.authority) &&
        (f.verification === "all" || verification === f.verification) &&
        (!f.search || hay.indexOf(f.search) !== -1);
      var hidden = !ok;
      card.classList.toggle("hidden", hidden);
      if (!hidden) visible++;
    });
    updateSourceCount(visible);
  }

  function updateSourceCount(visible) {
    var el = $("#source-count");
    if (!el) return;
    var total = SOURCES.length;
    if (typeof visible === "number") {
      el.textContent = visible + " of " + total + " sources shown";
    } else {
      el.textContent = total + " sources";
    }
  }

  /* ---------- Static content rendering ---------- */

  function renderStatic() {
    if (!CASE) { return; }
    // Claim
    var claimEl = $("#head-claim");
    if (claimEl) claimEl.textContent = CASE.claim.text;

    var epi = $("#epistemic-note");
    if (epi) {
      epi.innerHTML =
        "<p><strong>Epistemic labels used throughout:</strong> " +
        "<code>OBSERVED</code> — directly supported by a cited source or by the executed checks; " +
        "<code>INFERRED</code> — reasoned from observed evidence but not directly demonstrated; " +
        "<code>UNRESOLVED</code> — evidence insufficient or conflicting.</p>" +
        "<p>Every factual statement is either tied to a source ID or explicitly labelled INFERRED / UNRESOLVED.</p>";
    }

    renderVerdict();
    renderEpistemicTable();
    renderFacts();
    renderMatrix();
    renderCases();
    renderTimeline();
    renderLists();
  }

  function renderVerdict() {
    var v = CASE.verdict;
    if (!v) return;
    var card = $("#verdict-card");
    if (card) {
      card.className = "cc-verdict-card v-" + (v.label || "insufficient").replace(/ +/g, "-");
      card.innerHTML =
        '<div class="cc-verdict-label">Provisional Verdict</div>' +
        '<div class="cc-verdict-value">' + esc(v.label || "insufficient evidence") + "</div>" +
        '<div class="cc-confidence">Confidence: <span class="pct">' + esc(v.confidence_label || v.confidence || "low") + "</span>" +
        (v.confidence_pct ? " &middot; " + esc(v.confidence_pct) + "% confidence" : "") + "</div>";
    }
    var ex = $("#verdict-explanation");
    if (ex) ex.innerHTML = "<p>" + esc(v.explanation || "") + "</p>";

    // quality summary bars
    var q = CASE.source_quality || {};
    var qs = $("#quality-summary");
    if (qs) {
      var total = (q.high || 0) + (q.medium || 0) + (q.low || 0) || 1;
      qs.innerHTML =
        "<h4>Audited source quality</h4>" +
        '<div class="cc-bars">' +
        row("High", q.high || 0, (q.high || 0) / total, "high") +
        row("Medium", q.medium || 0, (q.medium || 0) / total, "medium") +
        row("Low", q.low || 0, (q.low || 0) / total, "low") +
        "</div>";
    }
  }

  function row(label, num, frac, cls) {
    return '<div class="cc-bar-row"><span>' + esc(label) + "</span>" +
      '<div class="cc-bar-track"><div class="cc-bar-fill ' + esc(cls) + '" style="width:' + Math.round(frac * 100) + '%"></div></div>' +
      '<span class="cc-bar-num">' + num + "</span></div>";
  }

  function renderEpistemicTable() {
    var et = $("#epistemic-table");
    if (!et) return;
    var rows = CASE.epistemic_summary || [];
    if (!rows.length) {
      // fall back to rendering the three definitions if no structured summary exists
      rows = [
        { label: "OBSERVED", kind: "observed", body: CASE.epistemic && CASE.epistemic.observed },
        { label: "INFERRED", kind: "inferred", body: CASE.epistemic && CASE.epistemic.inferred },
        { label: "UNRESOLVED", kind: "unresolved", body: CASE.epistemic && CASE.epistemic.unresolved }
      ].filter(function (r) { return r.body; });
    }
    et.innerHTML = rows.map(function (r) {
      return '<div class="cc-epi-row ' + esc(r.kind || r.label.toLowerCase()) + '">' +
        '<span class="cc-epi-label">' + esc(r.label) + "</span>" +
        '<div class="cc-epi-body">' + esc(r.body) + "</div></div>";
    }).join("");
  }

  function renderFacts() {
    var af = $("#agreed-facts");
    if (af) af.innerHTML = (CASE.agreed_facts || []).map(liItem).join("");
    var da = $("#disputed-assertions");
    if (da) da.innerHTML = (CASE.disputed_assertions || []).map(liItem).join("");
    var pl = $("#provenance-list");
    if (pl) pl.innerHTML = (CASE.provenance || []).map(liItem).join("");
  }

  function liItem(t) {
    if (typeof t === "string") return "<li>" + esc(t) + "</li>";
    if (!t) return "<li></li>";
    var body = t.text ? esc(t.text) : esc(String(t));
    return "<li>" + body + renderCites(t.cites) + "</li>";
  }

  function renderMatrix() {
    var body = $("#subclaim-matrix-body");
    if (!body) return;
    body.innerHTML = (CASE.subclaims || []).map(function (sc) {
      var st = sc.status || "ambiguous";
      var stLabel = st.charAt(0).toUpperCase() + st.slice(1);
      return "<tr>" +
        "<td>" + esc(sc.text) + "</td>" +
        '<td><span class="cc-status ' + esc(st) + '">' + esc(stLabel) + "</span></td>" +
        "<td>" + renderCites(sc.supporting_sources) + "</td>" +
        "<td>" + renderCites(sc.challenging_sources) + "</td>" +
        "<td>" + esc(sc.settled_by || "") + "</td>" +
        "</tr>";
    }).join("");
  }

  function renderCases() {
    var sup = $("#supporting-case");
    var opp = $("#opposing-case");
    if (sup) sup.innerHTML = (CASE.summary && CASE.summary.supporting || CASE.case_supporting || []).map(caseItem).join("");
    if (opp) opp.innerHTML = (CASE.summary && CASE.summary.opposing || CASE.case_opposing || []).map(caseItem).join("");
  }

  function caseItem(t) {
    if (typeof t === "string") return "<li>" + esc(t) + "</li>";
    if (!t) return "<li></li>";
    return "<li><span class=\"cc-em\">" + esc(t.text || "") + "</span>" + renderCites(t.cites) + "</li>";
  }

  function renderTimeline() {
    var tl = $("#timeline-list");
    if (!tl) return;
    tl.innerHTML = (CASE.timeline || []).map(function (ev) {
      return "<li><div class=\"cc-tl-date\">" + esc(ev.date || ev.year || "") + "</div>" +
        '<div class="cc-tl-event">' + esc(ev.event || "") + renderCites(ev.cites) + "</div></li>";
    }).join("");
  }

  function renderLists() {
    var gotVCl = $("#verdict-change-list");
    if (gotVCl) gotVCl.innerHTML = (CASE.verdict_change || []).map(liItem).join("");
    var uq = $("#unresolved-questions");
    if (uq) uq.innerHTML = (CASE.unresolved_questions || []).map(liItem).join("");
    var cl = $("#contradiction-list");
    if (cl) cl.innerHTML = (CASE.contradictions || []).map(liItem).join("");
  }

  /* ---------- Interactions ---------- */

  function init() {
    if (!CASE) {
      document.body.insertAdjacentHTML("afterbegin",
        '<div style="padding:1rem;background:#331c1a;color:#ef9c8c;border-bottom:1px solid #6d3a32">' +
        "Error: CASE_DATA not found. Include case-data.js before app.js.</div>");
      return;
    }
    renderStatic();
    renderSourceLibrary();

    var filters = ["#filter-status", "#filter-authority", "#filter-verification"];
    filters.forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("change", applyFilters);
    });
    var search = $("#source-search");
    if (search) search.addEventListener("input", applyFilters);
    var reset = $("#filter-reset");
    if (reset) reset.addEventListener("click", function () {
      if (search) search.value = "";
      filters.forEach(function (sel) { var e = $(sel); if (e) e.value = "all"; });
      applyFilters();
    });

    // In-page nav smooth scroll
    document.addEventListener("click", function (ev) {
      var target = ev.target.closest ? ev.target.closest("[data-scroll], [data-jump-source]") : null;
      if (!target) return;
      ev.preventDefault();
      var jump = target.getAttribute("data-jump-source");
      var selector = jump ? "#source-" + jump : target.getAttribute("href");
      var el = $(selector);
      if (el) {
        // ensure source card not hidden by filters
        el.classList.remove("hidden");
        el.scrollIntoView({ behavior: (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "smooth" : "auto", block: "center" });
        var ft = $(".cc-toggle", el);
        if (jump && ft && ft.getAttribute("aria-expanded") !== "true") {
          ft.setAttribute("aria-expanded", "true");
          var det = $(".cc-source-detail", el);
          if (det && det.hidden) { det.hidden = false; det.innerHTML = renderDetail(det, findSource(jump)); }
        }
        var focusable = $(jump ? ".cc-source-title, .cc-link" : "", el);
        if (focusable) { try { focusable.focus({ preventScroll: true }); } catch (e) { try { focusable.focus(); } catch (e2) {} } }
      } else {
        var plain = $("#" + target.getAttribute("href").replace(/^#/, ""));
        if (plain) plain.scrollIntoView({ behavior: "auto" });
      }
    });
  }

  function findSource(id) {
    return SOURCES.filter(function (s) { return s.id.toLowerCase() === id; })[0] || {};
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
