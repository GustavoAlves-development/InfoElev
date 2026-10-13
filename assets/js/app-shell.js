// Shared helpers for the Infoelev member apps.
// Progress and tool state are stored per product in the browser's localStorage.

function AppStore(productId) {
  const key = "infoelev_app_" + productId;
  function read() {
    try {
      return JSON.parse(localStorage.getItem(key)) || { visited: {}, tools: {} };
    } catch (e) {
      return { visited: {}, tools: {} };
    }
  }
  function write(state) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — state just won't persist across visits */
    }
  }
  return {
    markVisited(sectionId) {
      const s = read();
      s.visited[sectionId] = true;
      write(s);
    },
    isVisited(sectionId) {
      return !!read().visited[sectionId];
    },
    getTool(toolId, fallback) {
      const s = read();
      return s.tools[toolId] !== undefined ? s.tools[toolId] : fallback;
    },
    setTool(toolId, value) {
      const s = read();
      s.tools[toolId] = value;
      write(s);
    },
  };
}

function escapeAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Generic editable-table tool used by every app. cfg:
//   storeKey, title, dek, addLabel
//   columns: [{ key, label, type: "text"|"number", placeholder }]
//   defaults: initial rows (array of objects keyed by column key)
//   fields:   optional single inputs above the table [{ key, label, value }]
//   summary(rows, fields) -> { className, html }
function renderTableTool(container, store, cfg) {
  const blank = () => Object.fromEntries(cfg.columns.map((c) => [c.key, ""]));
  let rows = store.getTool(cfg.storeKey, []);
  if (!rows.length) rows = (cfg.defaults || [blank()]).map((r) => ({ ...blank(), ...r }));
  const fields = Object.fromEntries((cfg.fields || []).map((f) => [f.key, store.getTool(cfg.storeKey + "_" + f.key, f.value)]));

  container.innerHTML =
    '<div class="app-eyebrow">Tool</div>' +
    '<h1 class="app-title">' + cfg.title + '</h1>' +
    '<p class="app-dek">' + cfg.dek + '</p>' +
    '<div class="app-rule"></div>' +
    '<div class="tool-card">' +
    (cfg.fields || []).map((f) =>
      '<div class="tool-field"><label for="tt-f-' + f.key + '">' + f.label + '</label>' +
      '<input type="number" id="tt-f-' + f.key + '" data-field="' + f.key + '" value="' + escapeAttr(fields[f.key]) + '"></div>'
    ).join("") +
    '<table class="tool-table"><thead><tr>' + cfg.columns.map((c) => '<th>' + c.label + '</th>').join("") + '<th></th></tr></thead>' +
    '<tbody class="tt-rows"></tbody></table>' +
    '<button class="btn btn-ghost btn-sm tt-add">' + cfg.addLabel + '</button>' +
    '<div class="tool-summary tt-total"></div>' +
    '</div>';

  const tbody = container.querySelector(".tt-rows");
  const total = container.querySelector(".tt-total");

  function persist() { store.setTool(cfg.storeKey, rows); }

  function recalc() {
    const s = cfg.summary(rows, fields);
    total.className = "tool-summary tt-total " + (s.className || "");
    total.innerHTML = s.html;
  }

  function renderRows() {
    tbody.innerHTML = rows.map((r, i) =>
      '<tr>' +
      cfg.columns.map((c) =>
        '<td' + (c.type === "number" ? ' class="amount-col"' : '') + '><input type="' + c.type + '" data-i="' + i + '" data-k="' + c.key + '" value="' + escapeAttr(r[c.key]) + '" placeholder="' + escapeAttr(c.placeholder || "") + '"></td>'
      ).join("") +
      '<td><button class="tool-remove-btn" data-i="' + i + '">&times;</button></td>' +
      '</tr>'
    ).join("");
    tbody.querySelectorAll("input").forEach((el) => el.addEventListener("input", () => {
      rows[+el.dataset.i][el.dataset.k] = el.value; persist(); recalc();
    }));
    tbody.querySelectorAll(".tool-remove-btn").forEach((el) => el.addEventListener("click", () => {
      rows.splice(+el.dataset.i, 1);
      if (!rows.length) rows.push(blank());
      persist(); renderRows(); recalc();
    }));
  }

  container.querySelectorAll("[data-field]").forEach((el) => el.addEventListener("input", () => {
    fields[el.dataset.field] = el.value;
    store.setTool(cfg.storeKey + "_" + el.dataset.field, el.value);
    recalc();
  }));
  container.querySelector(".tt-add").addEventListener("click", () => { rows.push(blank()); persist(); renderRows(); recalc(); });

  renderRows();
  recalc();
}

const num = (v) => parseFloat(v) || 0;

function formatCurrency(n) {
  const num = Number(n) || 0;
  return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Renders the shared content block types used by chapter bodies.
function renderBlocks(blocks) {
  return blocks
    .map((b) => {
      if (b.type === "p") return "<p>" + b.text + "</p>";
      if (b.type === "h") return "<h4>" + b.text + "</h4>";
      if (b.type === "list") {
        return '<ul class="app-list">' + b.items.map((i) => "<li>" + i + "</li>").join("") + "</ul>";
      }
      if (b.type === "action") {
        return '<div class="app-action-box"><div class="label">Try it now</div><p style="margin:0">' + b.text + "</p></div>";
      }
      return "";
    })
    .join("");
}

// Generic "Action Roadmap" tool: one checklist item per chapter, built from
// that chapter's action-box text, so it always stays in sync with the content.
function buildRoadmapItems(chapters) {
  return chapters.map((ch, i) => {
    const action = ch.body.find((b) => b.type === "action");
    return { n: i + 1, title: ch.heading, desc: action ? action.text : "" };
  });
}

function renderRoadmap(container, store, roadmapItems) {
  const doneMap = store.getTool("roadmap", {});
  const doneCount = roadmapItems.filter((item) => doneMap[item.n]).length;

  container.innerHTML =
    '<div class="app-eyebrow">Tool</div>' +
    '<h1 class="app-title">Action Roadmap</h1>' +
    '<p class="app-dek">One action item per chapter. Check them off as you complete them.</p>' +
    '<div class="app-rule"></div>' +
    '<div class="week-progress" id="rm-progress">' + doneCount + " of " + roadmapItems.length + " actions done</div>" +
    '<div class="tool-card" style="padding:6px 30px;">' +
    roadmapItems
      .map(
        (item) =>
          '<label class="checklist-item' + (doneMap[item.n] ? " checked" : "") + '" data-n="' + item.n + '">' +
          '<input type="checkbox" class="rm-check" data-n="' + item.n + '"' + (doneMap[item.n] ? " checked" : "") + ">" +
          '<span class="day-num">' + String(item.n).padStart(2, "0") + "</span>" +
          '<span><span class="day-title">' + item.title + '</span><div class="day-desc">' + item.desc + "</div></span>" +
          "</label>"
      )
      .join("") +
    "</div>";

  container.querySelectorAll(".rm-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      const map = store.getTool("roadmap", {});
      map[+cb.getAttribute("data-n")] = cb.checked;
      store.setTool("roadmap", map);
      cb.closest(".checklist-item").classList.toggle("checked", cb.checked);
      const newDone = roadmapItems.filter((item) => map[item.n]).length;
      document.getElementById("rm-progress").textContent = newDone + " of " + roadmapItems.length + " actions done";
    });
  });
}

// Shown instead of the chapters to members whose plan includes the tools only.
function renderLockedCourse(container) {
  container.innerHTML =
    '<div class="app-eyebrow">Course</div>' +
    '<h1 class="app-title">Course chapters</h1>' +
    '<p class="app-dek">Your Infoelev Tools plan includes every interactive tool. The full course chapters and Action Roadmaps are part of All Access.</p>' +
    '<div class="app-rule"></div>' +
    '<div class="tool-card"><p style="margin:0 0 18px">Upgrade to Infoelev All Access for all six courses, every tool, and new products as they are released.</p>' +
    '<a class="btn btn-primary" href="/api/checkout?product=infoelev_all_access">Upgrade to All Access — $19/month</a></div>';
}

// Log out links (data-logout) end the session and return to the login page.
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-logout]");
  if (!link) return;
  event.preventDefault();
  fetch("/api/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login.html";
  });
});

// Builds the sidebar + content shell. `sections` is an ordered array of:
// { id, group: 'content'|'tools', label, render(container, store) }
// `locked: true` adds a "Course chapters" entry explaining that the chapters need All Access.
function initAppShell(config) {
  if (config.locked) {
    config.sections = [{ id: "course-locked", group: "locked", label: "Course chapters &#128274;", render: renderLockedCourse }].concat(config.sections);
  }
  const store = AppStore(config.productId);
  const sidebar = document.getElementById("app-sidebar-nav");
  const main = document.getElementById("app-main-content");
  const progressFill = document.getElementById("app-progress-fill");
  const progressLabel = document.getElementById("app-progress-label");

  const contentSections = config.sections.filter((s) => s.group === "content");
  const toolSections = config.sections.filter((s) => s.group === "tools");
  const lockedSections = config.sections.filter((s) => s.group === "locked");

  function updateProgress() {
    const total = contentSections.length;
    progressFill.closest(".app-progress-wrap").hidden = !total;
    const done = contentSections.filter((s) => store.isVisited(s.id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLabel.innerHTML = "<span>" + done + " of " + total + " read</span><span>" + pct + "%</span>";
  }

  function renderNav(activeId) {
    let html = "";
    if (lockedSections.length) {
      html += '<div class="app-nav-group-label">Content</div>';
      lockedSections.forEach((s) => {
        html += '<div class="app-nav-item' + (s.id === activeId ? " active" : "") + '" data-id="' + s.id + '">' + s.label + "</div>";
      });
    }
    if (contentSections.length) {
      html += '<div class="app-nav-group-label">Content</div>';
      contentSections.forEach((s) => {
        const done = store.isVisited(s.id);
        html +=
          '<div class="app-nav-item' + (s.id === activeId ? " active" : "") + (done ? " done" : "") + '" data-id="' + s.id + '">' +
          '<span class="app-nav-check">' + (done ? "&#10003;" : "") + "</span>" + s.label + "</div>";
      });
    }
    if (toolSections.length) {
      html += '<div class="app-nav-group-label">Tools</div>';
      toolSections.forEach((s) => {
        html += '<div class="app-nav-item' + (s.id === activeId ? " active" : "") + '" data-id="' + s.id + '">' + s.label + "</div>";
      });
    }
    sidebar.innerHTML = html;
    sidebar.querySelectorAll(".app-nav-item").forEach((el) => {
      el.addEventListener("click", () => goTo(el.getAttribute("data-id")));
    });
  }

  function renderSectionNavButtons(id) {
    const idx = contentSections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const prev = contentSections[idx - 1];
    const next = contentSections[idx + 1];
    const wrap = document.createElement("div");
    wrap.className = "app-nav-buttons";
    wrap.innerHTML =
      (prev ? '<button class="btn btn-ghost" id="app-prev-btn">&larr; ' + prev.label + "</button>" : "<span></span>") +
      (next
        ? '<button class="btn btn-primary" id="app-next-btn">' + next.label + " &rarr;</button>"
        : '<span class="btn btn-secondary" style="pointer-events:none;">You have reached the end</span>');
    main.appendChild(wrap);
    const prevBtn = document.getElementById("app-prev-btn");
    const nextBtn = document.getElementById("app-next-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => goTo(prev.id));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(next.id));
  }

  function goTo(id) {
    const section = config.sections.find((s) => s.id === id);
    if (!section) return;
    if (section.group === "content") store.markVisited(id);
    window.location.hash = id;
    main.innerHTML = "";
    section.render(main, store);
    if (section.group === "content") renderSectionNavButtons(id);
    renderNav(id);
    updateProgress();
    window.scrollTo(0, 0);
  }

  const startId = (window.location.hash || "").replace("#", "") || config.sections[0].id;
  goTo(config.sections.find((s) => s.id === startId) ? startId : config.sections[0].id);
}
