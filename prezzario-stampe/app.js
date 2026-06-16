const state = {
  data: null,
  formatId: "A4",
  paperId: "",
  quantity: 1,
  category: "ALL",
  search: "",
};

const els = {
  paperCount: document.querySelector("#paperCount"),
  formatSelect: document.querySelector("#formatSelect"),
  paperSelect: document.querySelector("#paperSelect"),
  quantityInput: document.querySelector("#quantityInput"),
  quickFormats: document.querySelector("#quickFormats"),
  totalPrice: document.querySelector("#totalPrice"),
  unitPrice: document.querySelector("#unitPrice"),
  paperCost: document.querySelector("#paperCost"),
  inkCost: document.querySelector("#inkCost"),
  ownCost: document.querySelector("#ownCost"),
  quoteNote: document.querySelector("#quoteNote"),
  searchInput: document.querySelector("#searchInput"),
  categoryTabs: document.querySelector("#categoryTabs"),
  cards: document.querySelector("#cards"),
  cardTemplate: document.querySelector("#cardTemplate"),
};

const currency = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return currency.format(value || 0);
}

function optionFor(paper, formatId = state.formatId) {
  return paper.options.find((item) => item.formatId === formatId);
}

function papersForFormat(formatId = state.formatId) {
  return state.data.papers.filter((paper) => optionFor(paper, formatId));
}

function activePaper() {
  return state.data.papers.find((paper) => paper.id === state.paperId) || papersForFormat()[0];
}

function setFormat(formatId) {
  state.formatId = formatId;
  const available = papersForFormat();
  if (!available.some((paper) => paper.id === state.paperId)) {
    state.paperId = available[0]?.id || "";
  }
  renderControls();
  renderQuote();
  renderCards();
}

function renderControls() {
  els.formatSelect.innerHTML = state.data.formats
    .map((format) => `<option value="${format.id}">${format.label} · ${format.mm}</option>`)
    .join("");
  els.formatSelect.value = state.formatId;

  els.quickFormats.innerHTML = state.data.formats
    .map((format) => {
      const active = format.id === state.formatId ? "active" : "";
      return `<button type="button" class="${active}" data-format="${format.id}">${format.label}</button>`;
    })
    .join("");

  els.paperSelect.innerHTML = papersForFormat()
    .map((paper) => `<option value="${paper.id}">${paper.name}</option>`)
    .join("");
  els.paperSelect.value = state.paperId;
  els.quantityInput.value = state.quantity;
}

function renderQuote() {
  const paper = activePaper();
  const option = paper ? optionFor(paper) : null;
  if (!option) return;

  state.paperId = paper.id;
  const quantity = Math.max(1, Number(state.quantity) || 1);
  els.totalPrice.value = formatMoney(option.clientUnit * quantity);
  els.unitPrice.textContent = formatMoney(option.clientUnit);
  els.paperCost.textContent = formatMoney(option.paperCost);
  els.inkCost.textContent = formatMoney(option.inkCost);
  els.ownCost.textContent = formatMoney(option.cost * quantity);
  els.quoteNote.textContent = option.note || "";
  els.quoteNote.classList.toggle("visible", Boolean(option.note));
}

function renderCards() {
  const query = state.search.trim().toLowerCase();
  const rows = state.data.papers
    .filter((paper) => state.category === "ALL" || paper.category === state.category)
    .filter((paper) => !query || paper.name.toLowerCase().includes(query))
    .map((paper) => ({ paper, option: optionFor(paper) }))
    .filter((row) => row.option)
    .sort((a, b) => a.option.clientUnit - b.option.clientUnit);

  els.cards.innerHTML = "";
  rows.forEach(({ paper, option }) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".category").textContent = paper.category;
    node.querySelector("h2").textContent = paper.name;
    node.querySelector("dl").innerHTML = `
      <div><dt>Cliente</dt><dd>${formatMoney(option.clientUnit)}</dd></div>
      <div><dt>Costo</dt><dd>${formatMoney(option.cost)}</dd></div>
      <div><dt>Margine</dt><dd>${formatMoney(option.clientUnit - option.cost)}</dd></div>
    `;
    node.addEventListener("click", () => {
      state.paperId = paper.id;
      renderControls();
      renderQuote();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.cards.append(node);
  });
}

async function init() {
  if (window.PREZZARIO_DATA) {
    state.data = window.PREZZARIO_DATA;
  } else {
    const response = await fetch("prices.json", { cache: "no-store" });
    state.data = await response.json();
  }
  state.paperId = papersForFormat()[0]?.id || state.data.papers[0]?.id || "";
  els.paperCount.textContent = `${state.data.papers.length} carte`;

  els.formatSelect.addEventListener("change", (event) => setFormat(event.target.value));
  els.quickFormats.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-format]");
    if (button) setFormat(button.dataset.format);
  });
  els.paperSelect.addEventListener("change", (event) => {
    state.paperId = event.target.value;
    renderQuote();
  });
  els.quantityInput.addEventListener("input", (event) => {
    state.quantity = Math.max(1, Number(event.target.value) || 1);
    renderQuote();
  });
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCards();
  });
  els.categoryTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    els.categoryTabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    renderCards();
  });

  renderControls();
  renderQuote();
  renderCards();
}

init().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><h1>Errore dati</h1><p>${error.message}</p></main>`;
});
