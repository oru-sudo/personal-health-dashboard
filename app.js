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

const RANGE_CONFIG = {
  day: {
    label: "日",
    maWindow: 7,
    maLabel: "7日移動平均",
    statsLabel: "7日平均",
    pointWidth: 36
  },
  week: {
    label: "週",
    maWindow: 4,
    maLabel: "4週移動平均",
    statsLabel: "4週平均",
    pointWidth: 60
  },
  month: {
    label: "月",
    maWindow: 3,
    maLabel: "3ヶ月移動平均",
    statsLabel: "3ヶ月平均",
    pointWidth: 80
  }
};

const FILTER_CONFIG = {
  all: { label: "全期間" },
  d7: { label: "直近7日", days: 7 },
  d30: { label: "直近30日", days: 30 },
  m6: { label: "直近6ヶ月", months: 6 },
  m12: { label: "直近12ヶ月", months: 12 }
};

const SLEEP_RANGE = {
  min: 18,
  max: 42,
  placeholderSpan: 0.5
};


let ratingChart;
let sleepChart;
let activityChart;
let symptomChart;
let currentData = null;
let currentMetricKey = METRICS[0].key;
let ratingRangeKey = "day";
let sleepRangeKey = "day";
let ratingFilterKey = "all";
let sleepFilterKey = "all";
let currentActivityKey = ACTIVITIES[0].key;
let currentActivityMonth = null;
let activityMode = "single";
let selectorsInitialized = false;

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
    initSelectors(data);
    renderAll(data);
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
  const dailyByDate = new Map(dailyRecords.map((record) => [formatDate(record._ts), record]));
  const monthKeys = Array.from(new Set(dailyRecords.map((record) => formatMonth(record._ts)))).sort();

  const metricSeries = {};
  METRICS.forEach((metric) => {
    const series = dailyRecords.map((record) => toNumber(record[metric.key]));
    metricSeries[metric.key] = series;
  });

  const sleepSeries = dailyRecords.map((record) => computeSleepHours(record));

  const weeklyActivity = computeWeeklyActivity(records);
  const symptomStats = computeSymptoms(records);

  return {
    rows,
    records,
    dailyRecords,
    dailyLabels,
    dailyByDate,
    monthKeys,
    metricSeries,
    sleepSeries,
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

function formatMonth(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function aggregateByRange(records, values, rangeKey) {
  if (rangeKey === "week") {
    return aggregateSeries(records, values, (record) => formatDate(getWeekStart(record._ts)));
  }
  if (rangeKey === "month") {
    return aggregateSeries(records, values, (record) => formatMonth(record._ts));
  }
  return {
    labels: records.map((record) => formatDate(record._ts)),
    values
  };
}

function aggregateSeries(records, values, keyFn) {
  const order = [];
  const buckets = new Map();

  records.forEach((record, index) => {
    const key = keyFn(record);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    const value = values[index];
    if (Number.isFinite(value)) {
      buckets.get(key).push(value);
    }
  });

  const aggregated = order.map((key) => {
    const bucket = buckets.get(key) || [];
    if (!bucket.length) return null;
    const sum = bucket.reduce((total, value) => total + value, 0);
    return Number((sum / bucket.length).toFixed(2));
  });

  return { labels: order, values: aggregated };
}

function mapSleepValueToAxis(value) {
  if (!Number.isFinite(value)) return null;
  if (value >= 24) return value;
  return value < SLEEP_RANGE.min ? value + 24 : value;
}

function filterRecordsByRange(records, values, filterKey) {
  const filter = FILTER_CONFIG[filterKey];
  if (!filter || filterKey === "all" || records.length === 0) {
    return { records, values };
  }
  const endDate = records[records.length - 1]._ts;
  const cutoff = computeCutoffDate(endDate, filter);
  const filteredRecords = [];
  const filteredValues = [];

  records.forEach((record, index) => {
    if (record._ts >= cutoff) {
      filteredRecords.push(record);
      filteredValues.push(values[index]);
    }
  });

  return { records: filteredRecords, values: filteredValues };
}

function computeCutoffDate(endDate, filter) {
  const cutoff = new Date(endDate);
  cutoff.setHours(0, 0, 0, 0);

  if (filter.days) {
    cutoff.setDate(cutoff.getDate() - (filter.days - 1));
    return cutoff;
  }

  if (filter.months) {
    cutoff.setDate(1);
    cutoff.setMonth(cutoff.getMonth() - (filter.months - 1));
  }

  return cutoff;
}

function formatTimeValue(value) {
  if (!Number.isFinite(value)) return "-";
  const normalized = ((value % 24) + 24) % 24;
  let hours = Math.floor(normalized);
  let minutes = Math.round((normalized - hours) * 60);
  if (minutes === 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeString(value) {
  if (!value) return "-";
  const parts = String(value).split(":");
  if (parts.length < 2) return value;
  const hours = String(parts[0]).padStart(2, "0");
  const minutes = String(parts[1]).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSymptomsForCell(value) {
  if (!value) return { text: "", title: "" };
  const items = String(value)
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "なし");
  if (!items.length) return { text: "", title: "" };
  const joined = items.join("・");
  const maxLength = 16;
  if (joined.length > maxLength) {
    return { text: `${joined.slice(0, maxLength)}…`, title: joined };
  }
  return { text: joined, title: joined };
}

function applyActivityStyle(element, color) {
  const rgb = hexToRgb(color);
  if (!rgb) return;
  element.style.borderColor = color;
  element.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`;
}

function getMovingAverageColor(baseColor) {
  const hsl = hexToHsl(baseColor);
  if (!hsl) return "#111827";
  const hue = (hsl.h + 180) % 360;
  const sat = Math.min(90, Math.max(45, hsl.s));
  const light = hsl.l < 50 ? 65 : 35;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  const cleaned = hex.replace("#", "").trim();
  if (![3, 6].includes(cleaned.length)) return null;
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((ch) => ch + ch).join("")
    : cleaned;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / delta + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / delta + 4;
        break;
      default:
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
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
  const window = computeSleepWindow(record);
  return window ? window.duration : null;
}

function computeSleepWindow(record) {
  const sleep = record["入眠時間"];
  const wake = record["起床時間"];
  if (!sleep || !wake) return null;
  const [sh, sm, ss] = sleep.split(":").map((item) => Number(item));
  const [wh, wm, ws] = wake.split(":").map((item) => Number(item));
  if ([sh, sm, ss, wh, wm, ws].some((value) => Number.isNaN(value))) return null;

  const start = sh + sm / 60 + (ss || 0) / 3600;
  let end = wh + wm / 60 + (ws || 0) / 3600;
  if (end <= start) {
    end += 24;
  }
  const duration = end - start;
  if (duration <= 0 || duration > 16) return null;

  return {
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    duration: Number(duration.toFixed(2))
  };
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

function initSelectors(data) {
  const metricSelect = document.getElementById("metric-select");
  const ratingRangeSelect = document.getElementById("rating-range");
  const sleepRangeSelect = document.getElementById("sleep-range");
  const ratingFilterSelect = document.getElementById("rating-filter");
  const sleepFilterSelect = document.getElementById("sleep-filter");
  const activitySelect = document.getElementById("activity-select");
  const activityMonthSelect = document.getElementById("activity-month");
  const activityPrev = document.getElementById("activity-prev");
  const activityNext = document.getElementById("activity-next");
  const activityModeSelect = document.getElementById("activity-mode");

  if (metricSelect && metricSelect.options.length === 0) {
    METRICS.forEach((metric) => {
      const option = document.createElement("option");
      option.value = metric.key;
      option.textContent = metric.label;
      metricSelect.appendChild(option);
    });
  }

  if (activitySelect && activitySelect.options.length === 0) {
    ACTIVITIES.forEach((activity) => {
      const option = document.createElement("option");
      option.value = activity.key;
      option.textContent = activity.label;
      activitySelect.appendChild(option);
    });
  }

  if (activityModeSelect && activityModeSelect.options.length === 0) {
    const options = [
      { value: "single", label: "個別" },
      { value: "summary", label: "サマリー" }
    ];
    options.forEach((mode) => {
      const option = document.createElement("option");
      option.value = mode.value;
      option.textContent = mode.label;
      activityModeSelect.appendChild(option);
    });
  }

  [ratingRangeSelect, sleepRangeSelect].forEach((select) => {
    if (!select || select.options.length) return;
    Object.entries(RANGE_CONFIG).forEach(([key, config]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = config.label;
      select.appendChild(option);
    });
  });

  [ratingFilterSelect, sleepFilterSelect].forEach((select) => {
    if (!select || select.options.length) return;
    Object.entries(FILTER_CONFIG).forEach(([key, config]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = config.label;
      select.appendChild(option);
    });
  });

  if (activityMonthSelect) {
    activityMonthSelect.innerHTML = "";
    (data?.monthKeys || []).forEach((monthKey) => {
      const option = document.createElement("option");
      option.value = monthKey;
      option.textContent = monthKey;
      activityMonthSelect.appendChild(option);
    });
    if (data?.monthKeys?.length) {
      const latest = data.monthKeys[data.monthKeys.length - 1];
      if (!currentActivityMonth || !data.monthKeys.includes(currentActivityMonth)) {
        currentActivityMonth = latest;
      }
    }
  }

  if (!selectorsInitialized) {
    if (metricSelect) {
      metricSelect.addEventListener("change", () => {
        currentMetricKey = metricSelect.value;
        if (!currentData) return;
        renderRatingSection(currentData, currentMetricKey, ratingRangeKey, ratingFilterKey);
      });
    }

    if (ratingRangeSelect) {
      ratingRangeSelect.addEventListener("change", () => {
        ratingRangeKey = ratingRangeSelect.value;
        if (!currentData) return;
        renderRatingSection(currentData, currentMetricKey, ratingRangeKey, ratingFilterKey);
      });
    }

    if (ratingFilterSelect) {
      ratingFilterSelect.addEventListener("change", () => {
        ratingFilterKey = ratingFilterSelect.value;
        if (!currentData) return;
        renderRatingSection(currentData, currentMetricKey, ratingRangeKey, ratingFilterKey);
      });
    }

    if (sleepRangeSelect) {
      sleepRangeSelect.addEventListener("change", () => {
        sleepRangeKey = sleepRangeSelect.value;
        if (!currentData) return;
        renderSleepSection(currentData, sleepRangeKey, sleepFilterKey);
      });
    }

    if (sleepFilterSelect) {
      sleepFilterSelect.addEventListener("change", () => {
        sleepFilterKey = sleepFilterSelect.value;
        if (!currentData) return;
        renderSleepSection(currentData, sleepRangeKey, sleepFilterKey);
      });
    }

    if (activitySelect) {
      activitySelect.addEventListener("change", () => {
        currentActivityKey = activitySelect.value;
        if (!currentData) return;
        renderActivitySection(currentData);
      });
    }

    if (activityModeSelect) {
      activityModeSelect.addEventListener("change", () => {
        activityMode = activityModeSelect.value;
        if (!currentData) return;
        renderActivitySection(currentData);
      });
    }

    if (activityMonthSelect) {
      activityMonthSelect.addEventListener("change", () => {
        currentActivityMonth = activityMonthSelect.value;
        if (!currentData) return;
        renderActivitySection(currentData);
      });
    }

    if (activityPrev) {
      activityPrev.addEventListener("click", () => {
        moveActivityMonth(-1);
      });
    }

    if (activityNext) {
      activityNext.addEventListener("click", () => {
        moveActivityMonth(1);
      });
    }
    selectorsInitialized = true;
  }

  if (metricSelect) {
    metricSelect.value = currentMetricKey;
  }
  if (ratingRangeSelect) {
    ratingRangeSelect.value = ratingRangeKey;
  }
  if (ratingFilterSelect) {
    ratingFilterSelect.value = ratingFilterKey;
  }
  if (sleepRangeSelect) {
    sleepRangeSelect.value = sleepRangeKey;
  }
  if (sleepFilterSelect) {
    sleepFilterSelect.value = sleepFilterKey;
  }
  if (activitySelect) {
    activitySelect.value = currentActivityKey;
  }
  if (activityModeSelect) {
    activityModeSelect.value = activityMode;
  }
  if (activityMonthSelect) {
    activityMonthSelect.value = currentActivityMonth || "";
  }
  updateActivityMonthButtons();
}

function renderAll(data) {
  renderHeader(data);
  renderRatingSection(data, currentMetricKey, ratingRangeKey, ratingFilterKey);
  renderSleepSection(data, sleepRangeKey, sleepFilterKey);
  renderActivitySection(data);
  renderSymptomSection(data);
}

function renderRatingSection(data, metricKey, rangeKey, filterKey) {
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];
  const range = RANGE_CONFIG[rangeKey] || RANGE_CONFIG.day;
  const values = data.metricSeries[metric.key];
  const filtered = filterRecordsByRange(data.dailyRecords, values, filterKey);
  const aggregated = aggregateByRange(filtered.records, filtered.values, rangeKey);
  const moving = movingAverage(aggregated.values, range.maWindow);

  renderStats(
    "rating-stats",
    buildNumericStats(aggregated.values, metric.label, null, range.statsLabel, range.maWindow)
  );

  setChartWidth("rating-inner", aggregated.labels.length, range.pointWidth);

  if (ratingChart) ratingChart.destroy();
  ratingChart = new Chart(document.getElementById("rating-chart"), {
    type: "line",
    data: {
      labels: aggregated.labels,
      datasets: [
        {
          label: metric.label,
          data: aggregated.values,
          borderColor: metric.color,
          backgroundColor: `${metric.color}33`,
          tension: 0.3,
          spanGaps: true,
          fill: true
        },
        {
          label: `${metric.label} ${range.maLabel}`,
          data: moving,
          borderColor: getMovingAverageColor(metric.color),
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

function renderSleepSection(data, rangeKey, filterKey) {
  const range = RANGE_CONFIG[rangeKey] || RANGE_CONFIG.day;
  const filtered = filterRecordsByRange(data.dailyRecords, data.sleepSeries, filterKey);
  const aggregated = aggregateByRange(filtered.records, filtered.values, rangeKey);
  const moving = movingAverage(aggregated.values, range.maWindow);

  renderStats(
    "sleep-stats",
    buildNumericStats(aggregated.values, "睡眠時間", "時間", range.statsLabel, range.maWindow)
  );

  if (rangeKey === "day") {
    const rangeValues = [];
    const meta = [];

    filtered.records.forEach((record) => {
      const window = computeSleepWindow(record);
      if (!window) {
        rangeValues.push(null);
        meta.push(null);
        return;
      }
      const displayStart = mapSleepValueToAxis(window.start);
      const displayEnd = mapSleepValueToAxis(window.end);
      const invalidDisplay =
        displayStart === null ||
        displayEnd === null ||
        displayEnd <= displayStart;
      const outOfRange =
        invalidDisplay ||
        displayStart < SLEEP_RANGE.min ||
        displayEnd > SLEEP_RANGE.max;
      let barStart = displayStart;
      let barEnd = displayEnd;
      if (outOfRange) {
        barStart = SLEEP_RANGE.min;
        barEnd = SLEEP_RANGE.min + SLEEP_RANGE.placeholderSpan;
      }
      rangeValues.push([barStart, barEnd]);
      meta.push({
        start: window.start,
        end: window.end,
        displayStart,
        displayEnd,
        duration: window.duration,
        rawStart: record["入眠時間"],
        rawEnd: record["起床時間"],
        outOfRange
      });
    });

    setChartWidth("sleep-inner", filtered.records.length, range.pointWidth);

    if (sleepChart) sleepChart.destroy();
    sleepChart = new Chart(document.getElementById("sleep-chart"), {
      type: "bar",
      data: {
        labels: filtered.records.map((record) => formatDate(record._ts)),
        datasets: [
          {
            label: "睡眠時間帯",
            data: rangeValues,
            backgroundColor: (context) => {
              const item = meta[context.dataIndex];
              if (!item) return "rgba(26, 127, 90, 0.15)";
              return item.outOfRange ? "rgba(148, 163, 184, 0.5)" : "rgba(26, 127, 90, 0.25)";
            },
            borderColor: (context) => {
              const item = meta[context.dataIndex];
              if (!item) return "rgba(26, 127, 90, 0.2)";
              return item.outOfRange ? "rgba(100, 116, 139, 0.9)" : "#1a7f5a";
            },
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: baseChartOptions({
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = meta[context.dataIndex];
                if (!item) return "データなし";
                const startLabel = item.rawStart ? formatTimeString(item.rawStart) : formatTimeValue(item.start);
                const endLabel = item.rawEnd ? formatTimeString(item.rawEnd) : formatTimeValue(item.end);
                const durationLabel = item.duration ? `${item.duration.toFixed(1)}h` : "-";
                const prefix = item.outOfRange ? "範囲外" : "睡眠";
                return `${prefix}: ${startLabel} → ${endLabel} (${durationLabel})`;
              }
            }
          }
        },
        scales: {
          y: {
            min: SLEEP_RANGE.min,
            max: SLEEP_RANGE.max,
            reverse: true,
            ticks: {
              stepSize: 4,
              callback: (value) => formatTimeValue(value)
            }
          }
        }
      })
    });
  } else {
    setChartWidth("sleep-inner", aggregated.labels.length, range.pointWidth);

    if (sleepChart) sleepChart.destroy();
    sleepChart = new Chart(document.getElementById("sleep-chart"), {
      type: "line",
      data: {
        labels: aggregated.labels,
        datasets: [
          {
            label: "睡眠時間 (時間)",
            data: aggregated.values,
            borderColor: "#1a7f5a",
            backgroundColor: "rgba(26, 127, 90, 0.2)",
            tension: 0.3,
            spanGaps: true,
            fill: true
          },
          {
            label: range.maLabel,
            data: moving,
            borderColor: getMovingAverageColor("#1a7f5a"),
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
}

function renderActivitySection(data) {
  const activity = ACTIVITIES.find((item) => item.key === currentActivityKey) || ACTIVITIES[0];
  const monthKey = currentActivityMonth || (data.monthKeys.length ? data.monthKeys[data.monthKeys.length - 1] : "");
  if (!monthKey) return;
  currentActivityMonth = monthKey;

  const monthStats = buildActivityCalendar(data, activity, monthKey, activityMode);
  const stats = activityMode === "summary"
    ? [
      { label: "モード", value: "サマリー", sub: "mode" },
      { label: "実施日数", value: monthStats.activeDays.toString(), sub: "days" },
      { label: "記録日数", value: monthStats.recordedDays.toString(), sub: "days" },
      { label: "実施率", value: monthStats.rate, sub: "rate" }
    ]
    : [
      { label: "選択中", value: activity.label, sub: "activity" },
      { label: "今月の実施日", value: monthStats.activeDays.toString(), sub: "days" },
      { label: "記録日数", value: monthStats.recordedDays.toString(), sub: "days" },
      { label: "実施率", value: monthStats.rate, sub: "rate" }
    ];
  renderStats("activity-stats", stats);
  renderActivityLegend();
  updateActivityMonthButtons();
}

function moveActivityMonth(delta) {
  if (!currentData || !currentData.monthKeys?.length) return;
  const index = currentData.monthKeys.indexOf(currentActivityMonth);
  if (index === -1) return;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= currentData.monthKeys.length) return;
  currentActivityMonth = currentData.monthKeys[nextIndex];
  const select = document.getElementById("activity-month");
  if (select) {
    select.value = currentActivityMonth;
  }
  renderActivitySection(currentData);
}

function updateActivityMonthButtons() {
  const prev = document.getElementById("activity-prev");
  const next = document.getElementById("activity-next");
  if (!prev || !next || !currentData?.monthKeys?.length) return;
  const index = currentData.monthKeys.indexOf(currentActivityMonth);
  prev.disabled = index <= 0;
  next.disabled = index >= currentData.monthKeys.length - 1;
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

function buildActivityCalendar(data, activity, monthKey, mode) {
  const calendar = document.getElementById("activity-calendar");
  if (!calendar) return { activeDays: 0, recordedDays: 0, rate: "-" };
  calendar.innerHTML = "";

  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  weekdays.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "calendar-header";
    cell.textContent = label;
    calendar.appendChild(cell);
  });

  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return { activeDays: 0, recordedDays: 0, rate: "-" };

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startIndex = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startIndex + daysInMonth) / 7) * 7;

  let activeDays = 0;
  let recordedDays = 0;

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (i < startIndex || i >= startIndex + daysInMonth) {
      cell.classList.add("empty");
      calendar.appendChild(cell);
      continue;
    }

    const day = i - startIndex + 1;
    const dateKey = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
    const record = data.dailyByDate.get(dateKey) || null;
    const status = record
      ? parseYesNo(record[activity.key], activity.yes, activity.no)
      : null;
    const activeList = record ? getActiveActivities(record) : [];
    const symptomInfo = record ? formatSymptomsForCell(record["体の不調"]) : { text: "", title: "" };

    if (record) recordedDays += 1;
    if (!record) {
      cell.classList.add("no-data");
    }
    if (mode === "summary") {
      if (activeList.length) activeDays += 1;
    } else if (status === true) {
      activeDays += 1;
    }

    const dayEl = document.createElement("div");
    dayEl.className = "day";
    dayEl.textContent = day.toString();
    cell.appendChild(dayEl);

    if (mode === "summary") {
      const dots = document.createElement("div");
      dots.className = "calendar-dots";
      activeList.forEach((active) => {
        const dot = document.createElement("span");
        dot.className = "calendar-dot";
        dot.style.backgroundColor = active.color;
        dot.title = active.label;
        dots.appendChild(dot);
      });
      cell.appendChild(dots);
      if (activeList.length) {
        cell.classList.add("active");
      }
    } else if (status === true) {
      cell.classList.add("active");
      applyActivityStyle(cell, activity.color);
    }

    const statusEl = document.createElement("div");
    statusEl.className = "status";
    statusEl.textContent = symptomInfo.text;
    if (symptomInfo.title) {
      statusEl.title = symptomInfo.title;
      cell.title = symptomInfo.title;
    }
    cell.appendChild(statusEl);

    cell.dataset.date = dateKey;
    cell.addEventListener("click", () => {
      renderDayDetails(dateKey, record, calendar);
    });

    calendar.appendChild(cell);
  }

  const rate = recordedDays ? `${Math.round((activeDays / recordedDays) * 100)}%` : "-";
  return { activeDays, recordedDays, rate };
}

function renderActivityLegend() {
  const legend = document.getElementById("activity-legend");
  if (!legend) return;
  if (activityMode !== "summary") {
    legend.classList.remove("visible");
    legend.innerHTML = "";
    return;
  }
  legend.classList.add("visible");
  legend.innerHTML = "";
  ACTIVITIES.forEach((activity) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const dot = document.createElement("span");
    dot.className = "calendar-dot";
    dot.style.backgroundColor = activity.color;
    const label = document.createElement("span");
    label.textContent = activity.label;
    item.appendChild(dot);
    item.appendChild(label);
    legend.appendChild(item);
  });
}

function getActiveActivities(record) {
  return ACTIVITIES.filter((activity) => parseYesNo(record[activity.key], activity.yes, activity.no) === true);
}

function renderDayDetails(dateKey, record, calendar) {
  const detail = document.getElementById("day-details");
  if (!detail) return;

  if (calendar) {
    calendar.querySelectorAll(".calendar-cell.selected").forEach((cell) => {
      cell.classList.remove("selected");
    });
  }

  if (!record) {
    detail.innerHTML = `<strong>${dateKey}</strong><div class="detail-grid"><div class="detail-item"><div class="detail-label">記録</div><div class="detail-value">なし</div></div></div>`;
    return;
  }

  const cell = calendar?.querySelector(`[data-date="${dateKey}"]`);
  if (cell) cell.classList.add("selected");

  const sleepWindow = computeSleepWindow(record);
  const sleepStart = record["入眠時間"] ? formatTimeString(record["入眠時間"]) : "-";
  const sleepEnd = record["起床時間"] ? formatTimeString(record["起床時間"]) : "-";
  const sleepDuration = sleepWindow ? `${sleepWindow.duration.toFixed(1)}h` : "-";

  const ratingItems = METRICS.map((metric) => ({
    label: metric.label,
    value: record[metric.key] || "-"
  }));

  detail.innerHTML = `
    <strong>${dateKey}</strong>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">睡眠</div>
        <div class="detail-value">${sleepStart} → ${sleepEnd}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">睡眠時間</div>
        <div class="detail-value">${sleepDuration}</div>
      </div>
      ${ratingItems
        .map(
          (item) => `
            <div class="detail-item">
              <div class="detail-label">${item.label}</div>
              <div class="detail-value">${item.value}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function buildNumericStats(values, label, unit, windowLabel = `${MA_WINDOW}日平均`, windowSize = MA_WINDOW) {
  const numeric = values.filter((value) => Number.isFinite(value));
  const hasData = numeric.length > 0;
  const sum = numeric.reduce((total, value) => total + value, 0);
  const avg = hasData ? sum / numeric.length : null;
  const latest = latestValue(values);
  const windowValues = values.slice(-windowSize).filter((value) => Number.isFinite(value));
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
    { label: windowLabel, value: fmt(windowAvg), sub: "moving avg" }
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

function setChartWidth(innerId, pointCount, pointWidth) {
  const inner = document.getElementById(innerId);
  if (!inner) return;
  const outer = inner.parentElement;
  const baseWidth = outer ? outer.clientWidth : 0;
  const desired = Math.max(baseWidth, pointCount * pointWidth);
  inner.style.setProperty("--chart-width", `${desired}px`);
}

function baseChartOptions(overrides = {}) {
  const { plugins: overridePlugins = {}, scales: overrideScales = {}, ...rest } = overrides;
  const basePlugins = {
    legend: {
      labels: { usePointStyle: true }
    },
    tooltip: {
      padding: 10
    }
  };
  const mergedPlugins = {
    ...basePlugins,
    ...overridePlugins,
    legend: { ...basePlugins.legend, ...(overridePlugins.legend || {}) },
    tooltip: { ...basePlugins.tooltip, ...(overridePlugins.tooltip || {}) }
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    ...rest,
    plugins: mergedPlugins,
    scales: {
      x: {
        ticks: { maxTicksLimit: 8 }
      },
      ...overrideScales
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
