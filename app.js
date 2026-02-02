const CSV_URL = "https://docs.google.com/spreadsheets/d/12eDhJWiqfLILLiOJjaYDXZtvxj6lUnzqQJo-3cWK_oU/export?format=csv&gid=712410912";
const MA_WINDOW = 7;

const METRICS = [
  { key: "食事評価", label: "食事評価", color: "#e0572c" },
  { key: "心の調子", label: "心の調子", color: "#1a7f5a" },
  { key: "体の調子", label: "体の調子", color: "#2b6cb0" },
  { key: "睡眠", label: "睡眠", color: "#0ea5e9" },
  { key: "筋肉痛", label: "筋肉痛", color: "#f59e0b" },
  { key: "ジムコンディション", label: "ジムコンディション", color: "#b91c1c" }
];

const ACTIVITIES = [
  { key: "ジム", label: "ジム", yes: ["行った"], no: ["行ってない"], color: "#e0572c" },
  { key: "外食", label: "外食", yes: ["あり"], no: ["なし"], color: "#2b6cb0" },
  { key: "人と会う用事", label: "人と会う用事", yes: ["あった"], no: ["なかった"], color: "#1a7f5a" },
  { key: "体組成計測定", label: "体組成計測定", yes: ["した"], no: ["してない"], color: "#f59e0b" },
  { key: "睡眠薬", label: "睡眠薬", yes: ["あり"], no: ["なし"], color: "#b91c1c" }
];

let ratingChart;
let sleepChart;
let activityChart;
let symptomChart;
let currentData = null;
let metricSelectInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  const refreshButton = document.getElementById("refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => loadAndRender());
  }
  loadAndRender();
});

async function loadAndRender() {
  setLoadingState(true);
  setStatus("Loading data...");
  try {
    const rawRows = await fetchCsvRows();
    const data = prepareData(rawRows);
    currentData = data;
    renderHeader(data);
    setupMetricSelector(data);
    renderSleepSection(data);
    renderActivitySection(data);
    renderSymptomSection(data);
    setStatus("Data loaded from Google Sheets (read only)");
  } catch (error) {
    console.error(error);
    setStatus("Failed to load data. Check the CSV URL or permissions.");
  } finally {
    setLoadingState(false);
  }
}

async function fetchCsvRows() {
  const url = `${CSV_URL}${CSV_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`);
  }
  let text = await response.text();
  text = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors && parsed.errors.length) {
    console.warn("CSV parse warnings", parsed.errors);
  }
  return parsed.data;
}

function prepareData(rawRows) {
  const rows = rawRows
    .map((row) => cleanRow(row))
    .filter((row) => row["タイムスタンプ"]);

  const records = rows
    .map((row) => ({ ...row, _ts: parseTimestamp(row["タイムスタンプ"]) }))
    .filter((row) => row._ts)
    .sort((a, b) => a._ts - b._ts);

  const dailyMap = new Map();
  records.forEach((record) => {
    const key = formatDate(record._ts);
    const existing = dailyMap.get(key);
    if (!existing || existing._ts < record._ts) {
      dailyMap.set(key, record);
    }
  });

  const dailyRecords = Array.from(dailyMap.values()).sort((a, b) => a._ts - b._ts);
  const dailyLabels = dailyRecords.map((record) => formatDate(record._ts));

  const metricSeries = {};
  const metricMA = {};
  METRICS.forEach((metric) => {
    const series = dailyRecords.map((record) => toNumber(record[metric.key]));
    metricSeries[metric.key] = series;
    metricMA[metric.key] = movingAverage(series, MA_WINDOW);
  });

  const sleepSeries = dailyRecords.map((record) => computeSleepHours(record));
  const sleepMA = movingAverage(sleepSeries, MA_WINDOW);

  const weeklyActivity = computeWeeklyActivity(records);
  const symptomStats = computeSymptoms(records);

  return {
    rows,
    records,
    dailyRecords,
    dailyLabels,
    metricSeries,
    metricMA,
    sleepSeries,
    sleepMA,
    weeklyActivity,
    symptomStats
  };
}

function cleanRow(row) {
  const cleaned = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    const trimmedKey = String(key).trim();
    if (!trimmedKey) return;
    const trimmedValue = typeof value === "string" ? value.trim() : value;
    cleaned[trimmedKey] = trimmedValue;
  });
  return cleaned;
}

function parseTimestamp(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split(" ");
  if (!datePart) return null;
  const [year, month, day] = datePart.split("/").map((item) => Number(item));
  if (!year || !month || !day) return null;
  const [hour = 0, minute = 0, second = 0] = (timePart || "0:0:0")
    .split(":")
    .map((item) => Number(item));
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function movingAverage(series, windowSize) {
  return series.map((_, index) => {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, index - windowSize + 1);
    for (let i = start; i <= index; i += 1) {
      const value = series[i];
      if (Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    }
    return count ? Number((sum / count).toFixed(2)) : null;
  });
}

function computeSleepHours(record) {
  const sleep = record["入眠時間"];
  const wake = record["起床時間"];
  if (!sleep || !wake || !record._ts) return null;
  const [sh, sm, ss] = sleep.split(":").map((item) => Number(item));
  const [wh, wm, ws] = wake.split(":").map((item) => Number(item));
  if ([sh, sm, ss, wh, wm, ws].some((value) => Number.isNaN(value))) return null;
  const start = new Date(record._ts);
  start.setHours(sh, sm, ss || 0, 0);
  const end = new Date(record._ts);
  end.setHours(wh, wm, ws || 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  const hours = (end - start) / 36e5;
  if (hours <= 0 || hours > 16) return null;
  return Number(hours.toFixed(2));
}

function computeWeeklyActivity(records) {
  const weekMap = new Map();
  records.forEach((record) => {
    const key = formatDate(getWeekStart(record._ts));
    if (!weekMap.has(key)) {
      const counts = {};
      ACTIVITIES.forEach((activity) => {
        counts[activity.key] = 0;
      });
      weekMap.set(key, counts);
    }
    const counts = weekMap.get(key);
    ACTIVITIES.forEach((activity) => {
      const result = parseYesNo(record[activity.key], activity.yes, activity.no);
      if (result === true) {
        counts[activity.key] += 1;
      }
    });
  });

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sortedWeeks.map(([key]) => key);
  const datasets = ACTIVITIES.map((activity) => ({
    label: activity.label,
    data: sortedWeeks.map(([, counts]) => counts[activity.key]),
    backgroundColor: activity.color
  }));

  const totals = ACTIVITIES.map((activity) => {
    const total = sortedWeeks.reduce((sum, [, counts]) => sum + counts[activity.key], 0);
    return { label: activity.label, value: total };
  });

  return { labels, datasets, totals };
}

function parseYesNo(value, yesList, noList) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (yesList.includes(trimmed)) return true;
  if (noList.includes(trimmed)) return false;
  return null;
}

function getWeekStart(date) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayIndex = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayIndex);
  return base;
}

function computeSymptoms(records) {
  const counts = new Map();
  let entries = 0;
  records.forEach((record) => {
    const raw = record["体の不調"];
    if (!raw) return;
    const parts = String(raw)
      .split(/[、,]/)
      .map((item) => item.trim())
      .filter((item) => item && item !== "なし");
    if (!parts.length) return;
    entries += 1;
    parts.forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
  });

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    labels: sorted.map(([label]) => label),
    data: sorted.map(([, count]) => count),
    entries,
    unique: counts.size
  };
}

function renderHeader(data) {
  const { records, dailyRecords } = data;
  const countEl = document.getElementById("record-count");
  const rangeEl = document.getElementById("date-range");
  const lastEl = document.getElementById("last-entry");

  countEl.textContent = records.length.toString();
  if (dailyRecords.length) {
    const start = dailyRecords[0]._ts;
    const end = dailyRecords[dailyRecords.length - 1]._ts;
    rangeEl.textContent = `${formatDate(start)} → ${formatDate(end)}`;
    lastEl.textContent = formatDateTime(end);
  }
}

function setupMetricSelector(data) {
  const select = document.getElementById("metric-select");
  if (!metricSelectInitialized) {
    METRICS.forEach((metric) => {
      const option = document.createElement("option");
      option.value = metric.key;
      option.textContent = metric.label;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      if (!currentData) return;
      renderRatingSection(currentData, select.value);
    });
    metricSelectInitialized = true;
  }

  const initialKey = select.value || METRICS[0].key;
  select.value = initialKey;
  renderRatingSection(data, initialKey);
}

function renderRatingSection(data, metricKey) {
  const metric = METRICS.find((item) => item.key === metricKey);
  const values = data.metricSeries[metricKey];
  const moving = data.metricMA[metricKey];

  renderStats("rating-stats", buildNumericStats(values, metric.label));

  if (ratingChart) ratingChart.destroy();
  ratingChart = new Chart(document.getElementById("rating-chart"), {
    type: "line",
    data: {
      labels: data.dailyLabels,
      datasets: [
        {
          label: metric.label,
          data: values,
          borderColor: metric.color,
          backgroundColor: `${metric.color}33`,
          tension: 0.3,
          spanGaps: true,
          fill: true
        },
        {
          label: `${metric.label} ${MA_WINDOW}日移動平均`,
          data: moving,
          borderColor: metric.color,
          borderDash: [6, 4],
          tension: 0.3,
          spanGaps: true
        }
      ]
    },
    options: baseChartOptions({
      scales: {
        y: {
          suggestedMin: 1,
          suggestedMax: 5,
          ticks: { stepSize: 1 }
        }
      }
    })
  });
}

function renderSleepSection(data) {
  renderStats("sleep-stats", buildNumericStats(data.sleepSeries, "睡眠時間", "時間"));

  if (sleepChart) sleepChart.destroy();
  sleepChart = new Chart(document.getElementById("sleep-chart"), {
    type: "line",
    data: {
      labels: data.dailyLabels,
      datasets: [
        {
          label: "睡眠時間 (時間)",
          data: data.sleepSeries,
          borderColor: "#1a7f5a",
          backgroundColor: "rgba(26, 127, 90, 0.2)",
          tension: 0.3,
          spanGaps: true,
          fill: true
        },
        {
          label: `${MA_WINDOW}日移動平均`,
          data: data.sleepMA,
          borderColor: "#1a7f5a",
          borderDash: [6, 4],
          tension: 0.3,
          spanGaps: true
        }
      ]
    },
    options: baseChartOptions({
      scales: {
        y: {
          suggestedMin: 0,
          suggestedMax: 12,
          ticks: {
            callback: (value) => `${value}h`
          }
        }
      }
    })
  });
}

function renderActivitySection(data) {
  const stats = data.weeklyActivity.totals.map((item) => ({
    label: item.label,
    value: item.value.toString(),
    sub: "total"
  }));
  renderStats("activity-stats", stats);

  if (activityChart) activityChart.destroy();
  activityChart = new Chart(document.getElementById("activity-chart"), {
    type: "bar",
    data: {
      labels: data.weeklyActivity.labels,
      datasets: data.weeklyActivity.datasets
    },
    options: baseChartOptions({
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    })
  });
}

function renderSymptomSection(data) {
  const stats = [
    { label: "症状記録", value: data.symptomStats.entries.toString(), sub: "entries" },
    { label: "ユニーク", value: data.symptomStats.unique.toString(), sub: "types" }
  ];
  renderStats("symptom-stats", stats);

  if (symptomChart) symptomChart.destroy();
  symptomChart = new Chart(document.getElementById("symptom-chart"), {
    type: "bar",
    data: {
      labels: data.symptomStats.labels,
      datasets: [
        {
          label: "件数",
          data: data.symptomStats.data,
          backgroundColor: "rgba(224, 87, 44, 0.7)"
        }
      ]
    },
    options: baseChartOptions({
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    })
  });
}

function buildNumericStats(values, label, unit) {
  const numeric = values.filter((value) => Number.isFinite(value));
  const hasData = numeric.length > 0;
  const sum = numeric.reduce((total, value) => total + value, 0);
  const avg = hasData ? sum / numeric.length : null;
  const latest = latestValue(values);
  const windowValues = values.slice(-MA_WINDOW).filter((value) => Number.isFinite(value));
  const windowAvg = windowValues.length
    ? windowValues.reduce((total, value) => total + value, 0) / windowValues.length
    : null;

  const fmt = (value) => {
    if (value === null) return "-";
    return unit ? `${value.toFixed(2)} ${unit}` : value.toFixed(2);
  };
  const latestValueText = latest === null ? "-" : unit ? `${latest.toFixed(2)} ${unit}` : latest.toFixed(2);

  return [
    { label: `最新 ${label}`, value: latestValueText, sub: "latest" },
    { label: "合計", value: hasData ? fmt(sum) : "-", sub: "sum" },
    { label: "平均", value: fmt(avg), sub: "average" },
    { label: `${MA_WINDOW}日平均`, value: fmt(windowAvg), sub: "moving avg" }
  ];
}

function latestValue(values) {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return null;
}

function renderStats(containerId, stats) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "stat";
    card.innerHTML = `
      <div class="stat-label">${stat.label}</div>
      <div class="stat-value">${stat.value}</div>
      <div class="stat-sub">${stat.sub || ""}</div>
    `;
    container.appendChild(card);
  });
}

function baseChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: { usePointStyle: true }
      },
      tooltip: {
        padding: 10
      }
    },
    ...overrides,
    scales: {
      x: {
        ticks: { maxTicksLimit: 8 }
      },
      ...(overrides.scales || {})
    }
  };
}

function setStatus(message) {
  const status = document.getElementById("data-status");
  status.textContent = message;
}

function setLoadingState(isLoading) {
  const refreshButton = document.getElementById("refresh-button");
  if (!refreshButton) return;
  refreshButton.disabled = isLoading;
  refreshButton.textContent = isLoading ? "更新中..." : "更新";
}
