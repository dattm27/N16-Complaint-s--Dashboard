"use strict";

const DATA_URL = "data/consumer_complaints.csv";
const OPEN_COLOR = "#ed806e";
const CLOSED_COLOR = "#90cdd0";
const EMPTY_COLOR = "#ffffff";
const SOFT_OPEN = "#f3e3e0";
const LINE_COLOR = "#c8c8c8";

const state = {
  records: [],
  filters: {
    start: "",
    end: "",
    status: "all",
    product: "all",
    state: "",
    issue: "",
    company: "",
    search: ""
  },
  minDate: "",
  maxDate: ""
};

const els = {
  startDate: document.querySelector("#start-date"),
  endDate: document.querySelector("#end-date"),
  startDateLabel: document.querySelector("#start-date-label"),
  endDateLabel: document.querySelector("#end-date-label"),
  rangeFill: document.querySelector("#range-fill"),
  statusFilter: document.querySelector("#status-filter"),
  productFilter: document.querySelector("#product-filter"),
  searchBox: document.querySelector("#search-box"),
  resetBtn: document.querySelector("#reset-btn"),
  exportBtn: document.querySelector("#export-btn"),
  activeFilters: document.querySelector("#active-filters"),
  total: document.querySelector("#total-complaints"),
  open: document.querySelector("#open-complaints"),
  closed: document.querySelector("#closed-complaints"),
  openRate: document.querySelector("#open-rate"),
  oldestOpen: document.querySelector("#oldest-open"),
  dateWindow: document.querySelector("#date-window"),
  timeChart: document.querySelector("#time-chart"),
  stateMap: document.querySelector("#state-map"),
  mapMeta: document.querySelector("#map-meta"),
  issueChart: document.querySelector("#issue-chart"),
  companyChart: document.querySelector("#company-chart"),
  detailTable: document.querySelector("#detail-table"),
  tooltip: document.querySelector("#tooltip")
};

const numberFmt = new Intl.NumberFormat("en-US");
const percentFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const HEX_ROWS = [
  { offset: 9, codes: ["ME"] },
  { offset: 8.5, codes: ["VT", "NH"] },
  { offset: 0, codes: ["WA", "ID", "MT", "ND", "MN", "IL", "WI", "MI", "NY", "MA"] },
  { offset: 0.5, codes: ["OR", "NV", "WY", "SD", "IA", "IN", "OH", "PA", "NJ", "CT", "RI"] },
  { offset: 1, codes: ["CA", "UT", "CO", "NE", "MO", "KY", "WV", "VA", "MD", "DE"] },
  { offset: 1.5, codes: ["AZ", "NM", "KS", "AR", "TN", "NC", "SC", "DC"] },
  { offset: 0, codes: ["AK", "HI", "OK", "LA", "MS", "AL", "GA"] },
  { offset: 2, codes: ["TX", "FL"] }
];

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming"
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = cells[index] || "";
    });
    return item;
  });
}

function parseDate(value) {
  const parts = value.split("-").map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function dateKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayIndex(dateValue) {
  return Math.round((parseDate(dateValue) - parseDate(state.minDate)) / 86400000);
}

function dateFromDayIndex(index) {
  return dateKey(parseDate(state.minDate) + Number(index) * 86400000);
}

function formatDateNumeric(dateValue) {
  const date = new Date(parseDate(dateValue));
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function formatShortDate(keyOrMs) {
  const ms = typeof keyOrMs === "number" ? keyOrMs : parseDate(keyOrMs);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(ms));
}

function weekStart(ms) {
  const date = new Date(ms);
  const day = date.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offset);
}

function monthStart(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function normalizeRow(row) {
  const date = row["Date received"];
  const response = clean(row["Company response"]) || "Unknown";
  return {
    id: clean(row["Complaint ID"]),
    date,
    dateMs: parseDate(date),
    weekMs: weekStart(parseDate(date)),
    monthMs: monthStart(parseDate(date)),
    product: clean(row.Product) || "Unknown product",
    issue: clean(row.Issue) || "Unknown issue",
    state: clean(row.State) || "Unknown",
    company: clean(row.Company) || "Unknown company",
    response,
    status: response === "In progress" ? "Open" : "Closed",
    timely: clean(row["Timely response?"]) || "Unknown",
    disputed: clean(row["Consumer disputed?"]) || "Unknown"
  };
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeCsv(value) {
  const raw = String(value ?? "");
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replaceAll("\"", "\"\"")}"`;
  }
  return raw;
}

function truncateLabel(value, maxLength = 32) {
  const text = String(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 52);
}

function getFiltered(options = {}) {
  const ignore = options.ignore || [];
  const startMs = parseDate(state.filters.start);
  const endMs = parseDate(state.filters.end);
  const search = state.filters.search.toLowerCase();

  return state.records.filter((record) => {
    if (record.dateMs < startMs || record.dateMs > endMs) {
      return false;
    }
    if (!ignore.includes("status") && state.filters.status !== "all" && record.status !== state.filters.status) {
      return false;
    }
    if (!ignore.includes("product") && state.filters.product !== "all" && record.product !== state.filters.product) {
      return false;
    }
    if (!ignore.includes("state") && state.filters.state && record.state !== state.filters.state) {
      return false;
    }
    if (!ignore.includes("issue") && state.filters.issue && record.issue !== state.filters.issue) {
      return false;
    }
    if (!ignore.includes("company") && state.filters.company && record.company !== state.filters.company) {
      return false;
    }
    if (search) {
      const haystack = `${record.company} ${record.issue} ${record.product} ${record.state} ${record.response}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

function countByStatus(records) {
  return records.reduce(
    (acc, record) => {
      acc.total += 1;
      if (record.status === "Open") {
        acc.open += 1;
      } else {
        acc.closed += 1;
      }
      return acc;
    },
    { total: 0, open: 0, closed: 0 }
  );
}

function groupedCounts(records, key) {
  const map = new Map();
  records.forEach((record) => {
    const name = typeof key === "function" ? key(record) : record[key];
    if (!map.has(name)) {
      map.set(name, { name, open: 0, closed: 0, total: 0 });
    }
    const item = map.get(name);
    item.total += 1;
    if (record.status === "Open") {
      item.open += 1;
    } else {
      item.closed += 1;
    }
  });
  return Array.from(map.values());
}

function syncDateControls() {
  const max = Math.max(Number(els.endDate.max), 1);
  const start = dayIndex(state.filters.start);
  const end = dayIndex(state.filters.end);
  const startPct = (start / max) * 100;
  const endPct = (end / max) * 100;

  els.startDate.value = String(start);
  els.endDate.value = String(end);
  els.startDateLabel.textContent = formatDateNumeric(state.filters.start);
  els.endDateLabel.textContent = formatDateNumeric(state.filters.end);
  els.rangeFill.style.left = `${startPct}%`;
  els.rangeFill.style.width = `${Math.max(0, endPct - startPct)}%`;
}

function handleDateRangeInput(changed) {
  let start = Number(els.startDate.value);
  let end = Number(els.endDate.value);

  if (changed === "start" && start > end) {
    start = end;
  }
  if (changed === "end" && end < start) {
    end = start;
  }

  state.filters.start = dateFromDayIndex(start);
  state.filters.end = dateFromDayIndex(end);
  syncDateControls();
  render();
}

function initControls() {
  const dates = state.records.map((record) => record.date).sort();
  state.minDate = dates[0];
  state.maxDate = dates[dates.length - 1];
  state.filters.start = state.minDate;
  state.filters.end = state.maxDate;

  const maxDay = dayIndex(state.maxDate);
  els.startDate.min = "0";
  els.startDate.max = String(maxDay);
  els.startDate.step = "1";
  els.endDate.min = "0";
  els.endDate.max = String(maxDay);
  els.endDate.step = "1";
  syncDateControls();

  const products = groupedCounts(state.records, "product")
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((item) => item.name);

  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product;
    option.textContent = product;
    els.productFilter.appendChild(option);
  });

  els.startDate.addEventListener("input", () => handleDateRangeInput("start"));
  els.endDate.addEventListener("input", () => handleDateRangeInput("end"));

  els.statusFilter.addEventListener("change", () => {
    state.filters.status = els.statusFilter.value;
    render();
  });

  els.productFilter.addEventListener("change", () => {
    state.filters.product = els.productFilter.value;
    render();
  });

  els.searchBox.addEventListener("input", () => {
    state.filters.search = els.searchBox.value.trim();
    render();
  });

  els.resetBtn.addEventListener("click", resetFilters);
  els.exportBtn.addEventListener("click", exportFiltered);
}

function resetFilters() {
  state.filters = {
    start: state.minDate,
    end: state.maxDate,
    status: "all",
    product: "all",
    state: "",
    issue: "",
    company: "",
    search: ""
  };
  syncDateControls();
  els.statusFilter.value = state.filters.status;
  els.productFilter.value = state.filters.product;
  els.searchBox.value = "";
  render();
}

function exportFiltered() {
  const rows = getFiltered();
  const header = ["Complaint ID", "Date", "State", "Product", "Issue", "Company", "Status", "Company response"];
  const lines = [
    header.map(escapeCsv).join(","),
    ...rows.map((record) =>
      [
        record.id,
        record.date,
        record.state,
        record.product,
        record.issue,
        record.company,
        record.status,
        record.response
      ].map(escapeCsv).join(",")
    )
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "filtered-consumer-complaints.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function render() {
  hideTooltip();
  const records = getFiltered();
  renderActiveFilters();
  renderKpis(records);
  renderTimeChart(records);
  renderStateMap();
  renderHorizontalChart({
    container: els.issueChart,
    records,
    key: "issue",
    selected: state.filters.issue,
    testPrefix: "issue",
    onSelect: (value) => {
      state.filters.issue = state.filters.issue === value ? "" : value;
      render();
    }
  });
  renderHorizontalChart({
    container: els.companyChart,
    records,
    key: "company",
    selected: state.filters.company,
    testPrefix: "company",
    labelMax: 34,
    onSelect: (value) => {
      state.filters.company = state.filters.company === value ? "" : value;
      render();
    }
  });
  window.__dashboard = {
    filters: { ...state.filters },
    summary: countByStatus(records),
    rowCount: records.length
  };
}

function renderActiveFilters() {
  const chips = [];
  if (state.filters.state) {
    chips.push({ key: "state", label: `State: ${state.filters.state}` });
  }
  if (state.filters.issue) {
    chips.push({ key: "issue", label: `Issue: ${state.filters.issue}` });
  }
  if (state.filters.company) {
    chips.push({ key: "company", label: `Company: ${state.filters.company}` });
  }
  if (!chips.length) {
    els.activeFilters.innerHTML = "";
    return;
  }
  els.activeFilters.innerHTML = chips.map((chip) => `
    <div class="filter-chip">
      <span>${escapeHtml(chip.label)}</span>
      <button class="chip-clear" type="button" data-clear="${chip.key}" aria-label="Clear ${escapeHtml(chip.key)} filter">x</button>
    </div>
  `).join("");

  els.activeFilters.querySelectorAll("[data-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters[button.dataset.clear] = "";
      render();
    });
  });
}

function renderKpis(records) {
  const counts = countByStatus(records);
  const openRate = counts.total ? (counts.open / counts.total) * 100 : 0;
  const oldestOpen = records
    .filter((record) => record.status === "Open")
    .sort((a, b) => a.dateMs - b.dateMs)[0];
  const age = oldestOpen ? Math.max(0, Math.round((parseDate(state.maxDate) - oldestOpen.dateMs) / 86400000)) : null;

  els.total.textContent = numberFmt.format(counts.total);
  els.open.textContent = numberFmt.format(counts.open);
  els.closed.textContent = numberFmt.format(counts.closed);
  els.openRate.textContent = `${percentFmt.format(openRate)}%`;
  els.oldestOpen.textContent = oldestOpen ? `Oldest open: ${age} days (${formatShortDate(oldestOpen.date)})` : "Oldest open: n/a";
  els.dateWindow.textContent = `${formatShortDate(state.filters.start)} - ${formatShortDate(state.filters.end)}`;
}

function renderTimeChart(records) {
  if (!records.length) {
    renderEmpty(els.timeChart);
    return;
  }

  const grouped = groupedCounts(records, (record) => record.weekMs)
    .sort((a, b) => Number(a.name) - Number(b.name))
    .map((item) => ({
      ...item,
      weekMs: Number(item.name),
      displayMs: Math.max(Number(item.name), parseDate(state.minDate)),
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(Math.max(Number(item.name), parseDate(state.minDate)))),
      year: new Date(Math.max(Number(item.name), parseDate(state.minDate))).getUTCFullYear()
    }));

  const width = 560;
  const height = 270;
  const margin = { top: 28, right: 16, bottom: 34, left: 46 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const maxTotal = Math.max(...grouped.map((item) => item.total), 1);
  const tickCount = 4;
  const band = innerW / grouped.length;
  const barW = Math.max(10, Math.min(30, band * 0.72));

  const y = (value) => margin.top + innerH - (value / maxTotal) * innerH;
  const h = (value) => (value / maxTotal) * innerH;

  const grid = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = Math.round((maxTotal / tickCount) * index);
    const yPos = y(value);
    return `
      <text class="axis" x="${margin.left - 10}" y="${yPos + 4}" text-anchor="end">${numberFmt.format(value)}</text>
    `;
  }).join("");

  const bars = grouped.map((item, index) => {
    const x = margin.left + index * band + (band - barW) / 2;
    const openHeight = h(item.open);
    const closedHeight = h(item.closed);
    const openY = margin.top + innerH - openHeight;
    const closedY = openY - closedHeight;
    const showLabel = grouped.length <= 15 || index % Math.ceil(grouped.length / 12) === 0;

    return `
      <g class="time-bar" data-testid="time-bar">
        <title>${escapeHtml(item.label)}: ${item.open} open, ${item.closed} closed</title>
        <rect class="open-fill" x="${x}" y="${openY}" width="${barW}" height="${openHeight}"></rect>
        <rect class="closed-fill" x="${x}" y="${closedY}" width="${barW}" height="${closedHeight}"></rect>
        ${showLabel ? `<text class="tick-label" x="${x + barW / 2}" y="${height - 18}" text-anchor="middle">${escapeHtml(item.label)}</text>` : ""}
      </g>
    `;
  }).join("");

  const yearLabels = Array.from(new Set(grouped.map((item) => item.year))).map((year) => {
    const first = grouped.findIndex((item) => item.year === year);
    const last = grouped.length - 1 - [...grouped].reverse().findIndex((item) => item.year === year);
    const x1 = margin.left + first * band;
    const x2 = margin.left + (last + 1) * band;
    return `<text class="axis" x="${(x1 + x2) / 2}" y="16" text-anchor="middle">${year}</text>`;
  }).join("");

  els.timeChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Stacked bar chart showing open and closed complaints over time">
      ${yearLabels}
      ${grid}
      <line x1="${margin.left}" x2="${width - margin.right}" y1="${margin.top + innerH}" y2="${margin.top + innerH}" stroke="${LINE_COLOR}"></line>
      ${bars}
    </svg>
  `;
}

function renderHorizontalChart(config) {
  const { container, records, key, selected, onSelect, testPrefix, labelMax = 38 } = config;
  if (!records.length) {
    renderEmpty(container);
    return;
  }

  const items = groupedCounts(records, key)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 10);

  if (!items.length) {
    renderEmpty(container);
    return;
  }

  const width = 610;
  const rowH = 16;
  const height = 54 + items.length * rowH + 24;
  const labelW = key === "issue" ? 236 : 190;
  const split = key === "issue" ? 348 : 318;
  const leftMaxW = split - labelW - 8;
  const rightMaxW = width - split - 42;
  const maxClosed = Math.max(...items.map((item) => item.closed), 1);
  const maxOpen = Math.max(...items.map((item) => item.open), 1);
  const chartBottom = 42 + items.length * rowH + 8;

  const rows = items.map((item, index) => {
    const y = 44 + index * rowH;
    const closedW = (item.closed / maxClosed) * leftMaxW;
    const openW = (item.open / maxOpen) * rightMaxW;
    const active = item.name === selected ? " is-active" : "";
    const label = truncateLabel(item.name, key === "issue" ? 42 : labelMax);
    return `
      <g class="bar-hit${active}" role="button" tabindex="0" data-value="${escapeHtml(item.name)}" data-testid="${testPrefix}-bar-${slug(item.name)}">
        <title>${escapeHtml(item.name)}: ${item.open} open, ${item.closed} closed</title>
        <text class="bar-label" x="${labelW - 8}" y="${y + 9}" text-anchor="end">${escapeHtml(label)}</text>
        <rect class="closed-fill" x="${labelW + 4}" y="${y + 2}" width="${closedW}" height="10"></rect>
        <rect class="open-fill" x="${split + 4}" y="${y + 2}" width="${openW}" height="10"></rect>
        <text class="bar-value" x="${width - 4}" y="${y + 10}" text-anchor="end">${numberFmt.format(item.total)}</text>
      </g>
    `;
  }).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Horizontal stacked bar chart">
      <text class="chart-heading" x="${split - leftMaxW}" y="18">Closed</text>
      <text class="chart-heading" x="${split + 4}" y="18">Open</text>
      <line class="baseline" x1="${labelW}" x2="${labelW}" y1="26" y2="${chartBottom}"></line>
      <line class="baseline" x1="${split}" x2="${split}" y1="26" y2="${chartBottom}"></line>
      <line class="baseline" x1="${width - 2}" x2="${width - 2}" y1="26" y2="${chartBottom}"></line>
      ${rows}
      <text class="axis" x="${labelW}" y="${height - 4}" text-anchor="middle">0</text>
      <text class="axis" x="${split - leftMaxW / 2}" y="${height - 4}" text-anchor="middle">${numberFmt.format(Math.round(maxClosed / 2))}</text>
      <text class="axis" x="${split}" y="${height - 4}" text-anchor="middle">${numberFmt.format(maxClosed)}</text>
      <text class="axis" x="${split + 4}" y="${height - 4}" text-anchor="middle">0</text>
      <text class="axis" x="${split + rightMaxW / 2}" y="${height - 4}" text-anchor="middle">${numberFmt.format(Math.round(maxOpen / 2))}</text>
      <text class="axis" x="${width - 2}" y="${height - 4}" text-anchor="end">${numberFmt.format(maxOpen)}</text>
    </svg>
  `;

  container.querySelectorAll(".bar-hit").forEach((group) => {
    const value = group.dataset.value;
    group.addEventListener("click", () => onSelect(value));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(value);
      }
    });
    group.addEventListener("mousemove", (event) => showTooltip(event, group.querySelector("title").textContent));
    group.addEventListener("mouseleave", hideTooltip);
  });
}

function renderStateMap() {
  const mapRecords = getFiltered({ ignore: ["state"] });
  const counts = groupedCounts(mapRecords, "state").reduce((acc, item) => {
    acc[item.name] = item;
    return acc;
  }, {});
  const mappedCodes = new Set(Object.keys(STATE_NAMES));
  const maxOpen = Math.max(
    ...Object.keys(STATE_NAMES).map((code) => counts[code]?.open || 0),
    1
  );
  const otherOpen = Object.entries(counts)
    .filter(([code]) => !mappedCodes.has(code))
    .reduce((sum, [, item]) => sum + item.open, 0);

  if (els.mapMeta) {
    els.mapMeta.textContent = otherOpen > 0
      ? `Each state has equal visual weight. Other regions open: ${numberFmt.format(otherOpen)}.`
      : "Each state has equal visual weight.";
  }

  const r = 14;
  const dx = 29;
  const dy = 25;
  const width = 455;
  const height = 245;
  const startX = 34;
  const startY = 22;

  const hexes = HEX_ROWS.map((row, rowIndex) => {
    return row.codes.map((code, colIndex) => {
      const x = startX + (row.offset + colIndex) * dx;
      const y = startY + rowIndex * dy;
      const item = counts[code] || { open: 0, closed: 0, total: 0 };
      const fill = item.open ? interpolateColor(SOFT_OPEN, OPEN_COLOR, item.open / maxOpen) : EMPTY_COLOR;
      const active = state.filters.state === code ? " is-active" : "";
      const labelColor = item.open / maxOpen > 0.58 ? "#ffffff" : "#20242a";
      return `
        <g class="hex-hit${active}" role="button" tabindex="0" data-state="${code}" data-testid="state-${code}">
          <title>${STATE_NAMES[code]}: ${item.open} open, ${item.closed} closed</title>
          <polygon points="${hexPoints(x, y, r)}" fill="${fill}" stroke="${LINE_COLOR}" stroke-width="1.2"></polygon>
          <text class="map-label" x="${x}" y="${y + 4}" text-anchor="middle" fill="${labelColor}">${code}</text>
        </g>
      `;
    }).join("");
  }).join("");

  els.stateMap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Hex map of open complaints by state">
      ${hexes}
    </svg>
  `;

  els.stateMap.querySelectorAll(".hex-hit").forEach((hex) => {
    const code = hex.dataset.state;
    hex.addEventListener("click", () => {
      state.filters.state = state.filters.state === code ? "" : code;
      render();
    });
    hex.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.filters.state = state.filters.state === code ? "" : code;
        render();
      }
    });
    hex.addEventListener("mousemove", (event) => showTooltip(event, hex.querySelector("title").textContent));
    hex.addEventListener("mouseleave", hideTooltip);
  });
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function interpolateColor(start, end, ratio) {
  const amount = Math.max(0, Math.min(1, ratio));
  const a = hexToRgb(start);
  const b = hexToRgb(end);
  const mix = {
    r: Math.round(a.r + (b.r - a.r) * amount),
    g: Math.round(a.g + (b.g - a.g) * amount),
    b: Math.round(a.b + (b.b - a.b) * amount)
  };
  return `rgb(${mix.r}, ${mix.g}, ${mix.b})`;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16)
  };
}

function renderTable(records) {
  const rows = [...records]
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "Open" ? -1 : 1;
      }
      return a.dateMs - b.dateMs;
    })
    .slice(0, 10);

  if (!rows.length) {
    els.detailTable.innerHTML = `
      <tr>
        <td colspan="6">No records match the selected filters.</td>
      </tr>
    `;
    return;
  }

  els.detailTable.innerHTML = rows.map((record) => `
    <tr>
      <td>${escapeHtml(record.date)}</td>
      <td>${escapeHtml(record.state)}</td>
      <td>${escapeHtml(record.product)}</td>
      <td>${escapeHtml(record.issue)}</td>
      <td>${escapeHtml(record.company)}</td>
      <td><span class="status-pill ${record.status === "Open" ? "status-open" : "status-closed"}">${escapeHtml(record.status)}</span></td>
    </tr>
  `).join("");
}

function renderEmpty(container) {
  container.innerHTML = `<div class="empty-state">No records match the selected filters.</div>`;
}

function showTooltip(event, html) {
  els.tooltip.innerHTML = `<strong>${escapeHtml(html.split(":")[0])}</strong>${escapeHtml(html.split(":").slice(1).join(":").trim())}`;
  els.tooltip.style.display = "block";
  const pad = 14;
  const rect = els.tooltip.getBoundingClientRect();
  const x = Math.min(window.innerWidth - rect.width - pad, event.clientX + pad);
  const y = Math.min(window.innerHeight - rect.height - pad, event.clientY + pad);
  els.tooltip.style.left = `${Math.max(pad, x)}px`;
  els.tooltip.style.top = `${Math.max(pad, y)}px`;
}

function hideTooltip() {
  els.tooltip.style.display = "none";
}

function showError(message) {
  document.body.innerHTML = `
    <main class="shell">
      <section class="panel">
        <h1>Dashboard could not load</h1>
        <p class="subtitle">${escapeHtml(message)}</p>
      </section>
    </main>
  `;
}

async function boot() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const csv = await response.text();
    state.records = parseCSV(csv)
      .map(normalizeRow)
      .filter((record) => Number.isFinite(record.dateMs));
    initControls();
    render();
  } catch (error) {
    showError(`Unable to load ${DATA_URL}. Start a local web server from this folder and reload. Details: ${error.message}`);
  }
}

boot();
