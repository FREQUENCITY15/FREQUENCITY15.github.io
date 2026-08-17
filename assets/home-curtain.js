const tools = [
  {
    title: "The Tool Shelf",
    kicker: "Catalogue",
    description: "A filterable shelf for the tools, experiments, and useful oddities that keep earning a place.",
    href: "/tool-shelf/",
    mark: "01",
    accent: "violet",
    tags: ["catalogue", "portable", "growing"],
  },
  {
    title: "Prompt Budget Builder",
    kicker: "Prompting",
    description: "Turn a sprawling request into a scored contract with priorities, gates, and an honest quality floor.",
    href: "/prompt-budget-builder/",
    mark: "02",
    accent: "electric",
    tags: ["prompts", "planning", "local save"],
  },
  {
    title: "RECAP Invocation Lab",
    kicker: "Decision gates",
    description: "Compare RECAP modes and choose the smallest invocation that can protect the decision in front of you.",
    href: "/recap-invocation-lab/",
    mark: "03",
    accent: "mint",
    tags: ["recap", "learning", "interactive"],
  },
  {
    title: "Between the Seams Pocket Console",
    kicker: "Continuity",
    description: "Shape a fresh-chat card, preserve the boundary, and carry only what the next conversation needs.",
    href: "/between-seams-pocket-console/",
    mark: "04",
    accent: "coral",
    tags: ["mobile", "boundaries", "local save"],
  },
  {
    title: "Bad Boi Bogans: The Pole Puzzle",
    kicker: "Algebra lesson",
    description: "Learn four algebra rules, watch three 12-inch poles break, then solve x, y, and z by rebuilding every row.",
    href: "/bad-boi-bogans/lesson-1/",
    mark: "05",
    accent: "amber",
    tags: ["algebra", "animation", "puzzle"],
  },
  {
    title: "Curtain Calamity",
    kicker: "Algebra lesson",
    description: "Fix a broken curtain rod with one algebra move by solving x + 63 = 200.",
    href: "/curtain-calamity/",
    mark: "06",
    accent: "amber",
    tags: ["algebra", "story", "interactive"],
  },
  {
    title: "The Claim Crucible",
    kicker: "Evidence courtroom",
    description: "Investigate Project Looking Glass through competing cases, source-quality filters, contradictions, provenance, and an explicit provisional verdict.",
    href: "/claim-crucible/",
    mark: "07",
    accent: "violet",
    tags: ["evidence", "research", "interactive"],
  },
];

const root = document.getElementById("root");

root.innerHTML = `
  <main class="hub-shell">
    <div class="grain" aria-hidden="true"></div>
    <nav class="hub-nav" aria-label="Primary">
      <a class="wordmark" href="/" aria-label="FREQUENCITY home"><span>F</span>REQUENCITY</a>
      <a class="github-link" href="https://github.com/FREQUENCITY15">GitHub ↗</a>
    </nav>
    <header class="hub-hero">
      <p class="overline">Independent tools · one address</p>
      <h1>Make the thinking<br><em>concrete.</em></h1>
      <div class="hero-lower">
        <p>Small browser tools for prompts, project boundaries, continuity, and decisions that deserve more structure than a blank box.</p>
        <div class="privacy-chip"><i></i> Runs in your browser</div>
      </div>
    </header>
    <section class="catalogue" aria-labelledby="catalogue-title">
      <div class="catalogue-heading">
        <div>
          <p class="section-number">01 / COLLECTION</p>
          <h2 id="catalogue-title">Public workbench</h2>
        </div>
        <label class="filter">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Filter tools" aria-label="Filter tools">
          <button type="button" aria-label="Clear filter" hidden>×</button>
        </label>
      </div>
      <div class="tool-grid" aria-live="polite"></div>
      <p class="empty-state" hidden></p>
    </section>
    <footer class="hub-footer">
      <p>Built by Thom · Brisbane, Australia</p>
      <p>Drafts and settings stay on the device that created them.</p>
    </footer>
  </main>`;

const input = root.querySelector(".filter input");
const clearButton = root.querySelector(".filter button");
const grid = root.querySelector(".tool-grid");
const emptyState = root.querySelector(".empty-state");

function renderCards() {
  const needle = input.value.trim().toLowerCase();
  const visible = needle
    ? tools.filter((tool) => [tool.title, tool.kicker, tool.description, ...tool.tags].join(" ").toLowerCase().includes(needle))
    : tools;

  grid.innerHTML = visible.map((tool) => `
    <article class="tool-card accent-${tool.accent}">
      <div class="card-index">${tool.mark}</div>
      <p class="card-kicker">${tool.kicker}</p>
      <h3>${tool.title}</h3>
      <p class="card-description">${tool.description}</p>
      <div class="card-tags">${tool.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <a class="open-button" href="${tool.href}">Open tool <span aria-hidden="true">↗</span></a>
    </article>`).join("");

  clearButton.hidden = needle.length === 0;
  emptyState.hidden = visible.length !== 0;
  emptyState.textContent = visible.length === 0 ? `Nothing here matches “${input.value}”.` : "";
}

input.addEventListener("input", renderCards);
clearButton.addEventListener("click", () => {
  input.value = "";
  input.focus();
  renderCards();
});

renderCards();
