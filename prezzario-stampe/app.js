const state = {
  data: null,
  formatId: "A4",
  paperId: "",
  quantity: 1,
  category: "ALL",
  search: "",
  estimate: [],
};

const AUTH_KEY = "prezzario-auth-v1";
const ESTIMATE_KEY = "prezzario-estimate-v1";
const APP_VERSION = "20260616-estimate";
const elsAuth = {
  lockScreen: document.querySelector("#lockScreen"),
  appShell: document.querySelector("#appShell"),
  passwordForm: document.querySelector("#passwordForm"),
  passwordInput: document.querySelector("#passwordInput"),
  authError: document.querySelector("#authError"),
  logoutButton: document.querySelector("#logoutButton"),
};

const els = {
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
  markupMultiplier: document.querySelector("#markupMultiplier"),
  addLineButton: document.querySelector("#addLineButton"),
  clearEstimateButton: document.querySelector("#clearEstimateButton"),
  clientImageButton: document.querySelector("#clientImageButton"),
  toggleMarginButton: document.querySelector("#toggleMarginButton"),
  estimateEmpty: document.querySelector("#estimateEmpty"),
  estimateLines: document.querySelector("#estimateLines"),
  estimateTotal: document.querySelector("#estimateTotal"),
  marginPanel: document.querySelector("#marginPanel"),
  marginGross: document.querySelector("#marginGross"),
  marginNet: document.querySelector("#marginNet"),
  marginVat: document.querySelector("#marginVat"),
  marginCost: document.querySelector("#marginCost"),
  marginProfit: document.querySelector("#marginProfit"),
  clientImageBox: document.querySelector("#clientImageBox"),
  clientImagePreview: document.querySelector("#clientImagePreview"),
  clientImageDownload: document.querySelector("#clientImageDownload"),
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

function formatMeta(formatId = state.formatId) {
  return state.data.formats.find((format) => format.id === formatId) || { id: formatId, label: formatId, mm: "" };
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
  els.markupMultiplier.textContent = `x${String(state.data.meta.multiplier).replace(".", ",")}`;
  els.quoteNote.textContent = option.note || "";
  els.quoteNote.classList.toggle("visible", Boolean(option.note));
}

function currentLine() {
  const paper = activePaper();
  const option = paper ? optionFor(paper) : null;
  if (!paper || !option) return null;
  const format = formatMeta(option.formatId);
  const quantity = Math.max(1, Number(state.quantity) || 1);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    formatId: option.formatId,
    formatLabel: format.label,
    paperId: paper.id,
    paperName: paper.name,
    quantity,
    unitPrice: option.clientUnit,
    unitCost: option.cost,
    total: option.clientUnit * quantity,
  };
}

function saveEstimate() {
  localStorage.setItem(ESTIMATE_KEY, JSON.stringify(state.estimate));
}

function loadEstimate() {
  try {
    const saved = JSON.parse(localStorage.getItem(ESTIMATE_KEY) || "[]");
    state.estimate = Array.isArray(saved) ? saved : [];
  } catch {
    state.estimate = [];
  }
}

function addLineToEstimate() {
  const line = currentLine();
  if (!line) return;
  const existing = state.estimate.find(
    (item) => item.formatId === line.formatId && item.paperId === line.paperId && item.unitPrice === line.unitPrice,
  );
  if (existing) {
    existing.quantity += line.quantity;
    existing.total = existing.unitPrice * existing.quantity;
  } else {
    state.estimate.push(line);
  }
  saveEstimate();
  renderEstimate();
}

function removeEstimateLine(id) {
  state.estimate = state.estimate.filter((line) => line.id !== id);
  saveEstimate();
  renderEstimate();
}

function clearEstimate() {
  state.estimate = [];
  saveEstimate();
  renderEstimate();
}

function estimateSummary() {
  const gross = state.estimate.reduce((sum, line) => sum + line.total, 0);
  const ownCost = state.estimate.reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
  const iva = Number(state.data?.meta?.iva ?? 0.22);
  const net = gross / (1 + iva);
  const vat = gross - net;
  const profit = net - ownCost;
  return { gross, ownCost, net, vat, profit };
}

function renderEstimate() {
  els.estimateEmpty.classList.toggle("hidden", state.estimate.length > 0);
  els.estimateLines.innerHTML = "";
  state.estimate.forEach((line) => {
    const row = document.createElement("article");
    row.className = "estimate-line";
    row.innerHTML = `
      <div>
        <strong>${line.quantity} x ${line.formatLabel}</strong>
        <span>${line.paperName}</span>
        <em>${formatMoney(line.unitPrice)} cad.</em>
      </div>
      <div class="line-actions">
        <strong>${formatMoney(line.total)}</strong>
        <button type="button" data-remove-line="${line.id}" aria-label="Rimuovi riga">&times;</button>
      </div>
    `;
    els.estimateLines.append(row);
  });
  const summary = estimateSummary();
  els.estimateTotal.textContent = formatMoney(summary.gross);
  els.marginGross.textContent = formatMoney(summary.gross);
  els.marginNet.textContent = formatMoney(summary.net);
  els.marginVat.textContent = formatMoney(summary.vat);
  els.marginCost.textContent = formatMoney(summary.ownCost);
  els.marginProfit.textContent = formatMoney(summary.profit);
  els.clientImageButton.disabled = state.estimate.length === 0;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  let currentY = y;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

async function createClientImage() {
  if (!state.estimate.length) return;
  const summary = estimateSummary();
  const scale = 2;
  const width = 1080;
  const padding = 72;
  const rowHeight = 118;
  const height = 300 + state.estimate.length * rowHeight + 190;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#172026";
  ctx.font = "900 54px system-ui, -apple-system, sans-serif";
  ctx.fillText("Preventivo Stampe", padding, 95);
  ctx.font = "700 25px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#65707a";
  ctx.fillText(new Date().toLocaleDateString("it-IT"), padding, 138);

  let y = 205;
  state.estimate.forEach((line) => {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d8d0c4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(padding, y - 52, width - padding * 2, 92, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#172026";
    ctx.font = "900 30px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${line.quantity} x ${line.formatLabel}`, padding + 24, y - 14);
    ctx.font = "700 23px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#65707a";
    drawWrappedText(ctx, line.paperName, padding + 24, y + 18, 570, 27);
    ctx.font = "900 32px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#172026";
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(line.total), width - padding - 24, y + 6);
    ctx.font = "700 21px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#65707a";
    ctx.fillText(`${formatMoney(line.unitPrice)} cad.`, width - padding - 24, y + 34);
    ctx.textAlign = "left";
    y += rowHeight;
  });

  y += 20;
  ctx.fillStyle = "#0b4f49";
  ctx.beginPath();
  ctx.roundRect(padding, y, width - padding * 2, 124, 14);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "800 27px system-ui, -apple-system, sans-serif";
  ctx.fillText("Totale preventivo", padding + 30, y + 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 58px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(summary.gross), width - padding - 30, y + 78);
  ctx.textAlign = "left";

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  els.clientImagePreview.src = url;
  els.clientImageDownload.href = url;
  els.clientImageBox.classList.remove("hidden");

  if (navigator.canShare && navigator.canShare({ files: [new File([blob], "preventivo-stampe.png", { type: "image/png" })] })) {
    const file = new File([blob], "preventivo-stampe.png", { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "Preventivo Stampe" });
    } catch {
      // The preview and download link stay visible if sharing is cancelled.
    }
  }
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

function bytesFromBase64(value) {
  return Uint8Array.from(atob(String(value).replace(/\s/g, "")), (char) => char.charCodeAt(0));
}

async function decryptPrices(password) {
  const response = await fetch(`encrypted-data.json?v=${APP_VERSION}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Listino non trovato. Ricarica la pagina.");
  }
  const payload = await response.json();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bytesFromBase64(payload.salt),
      iterations: payload.iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesFromBase64(payload.iv) },
    key,
    bytesFromBase64(payload.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

async function unlock(password) {
  elsAuth.authError.textContent = "";
  try {
    state.data = await decryptPrices(password);
    sessionStorage.setItem(AUTH_KEY, password);
    elsAuth.lockScreen.classList.add("hidden");
    elsAuth.appShell.classList.remove("locked");
    startApp();
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    elsAuth.authError.textContent = "Password non corretta o pagina da aggiornare.";
    elsAuth.passwordInput.select();
  }
}

function startApp() {
  state.paperId = papersForFormat()[0]?.id || state.data.papers[0]?.id || "";

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
  els.addLineButton.addEventListener("click", addLineToEstimate);
  els.clearEstimateButton.addEventListener("click", clearEstimate);
  els.toggleMarginButton.addEventListener("click", () => {
    els.marginPanel.classList.toggle("hidden");
  });
  els.clientImageButton.addEventListener("click", createClientImage);
  els.estimateLines.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-remove-line]");
    if (button) removeEstimateLine(button.dataset.removeLine);
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

  loadEstimate();
  renderControls();
  renderQuote();
  renderEstimate();
  renderCards();
}

async function initAuth() {
  elsAuth.passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    unlock(elsAuth.passwordInput.value);
  });
  elsAuth.logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.reload();
  });

  const saved = sessionStorage.getItem(AUTH_KEY);
  if (saved) {
    await unlock(saved);
  }
}

initAuth().catch((error) => {
  elsAuth.authError.textContent = error.message;
});
