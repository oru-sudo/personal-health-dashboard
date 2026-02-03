const CSV_URL = "https://docs.google.com/spreadsheets/d/12eDhJWiqfLILLiOJjaYDXZtvxj6lUnzqQJo-3cWK_oU/export?format=csv&gid=712410912";
const COMPOSITION_URL =
  "https://docs.google.com/spreadsheets/d/12eDhJWiqfLILLiOJjaYDXZtvxj6lUnzqQJo-3cWK_oU/gviz/tq?tqx=out:csv&sheet=%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A0%E3%81%AE%E5%9B%9E%E7%AD%94%202";
const OMRON_GAS_URL =
  "https://script.google.com/macros/s/AKfycbx0NMxSb0tehOkARuwOCuFtLWXlgxw0C0l-5JZUoSrgtE4nYIl86iE9DzEnwUq8K549/exec";
const OMRON_GAS_TOKEN = "token";
const OMRON_POINT_WIDTH = 36;
const USER_HEIGHT_CM = 180;
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

const BODY_METRICS = [
  {
    key: "fat_rate",
    label: "体脂肪率",
    unit: "%",
    parts: [
      { key: "【体脂肪率】体幹部", label: "体幹部", position: "core" },
      { key: "【体脂肪率】左腕", label: "左腕", position: "left-arm" },
      { key: "【体脂肪率】右腕", label: "右腕", position: "right-arm" },
      { key: "【体脂肪率】左脚", label: "左脚", position: "left-leg" },
      { key: "【体脂肪率】右脚", label: "右脚", position: "right-leg" }
    ]
  },
  {
    key: "muscle_mass",
    label: "筋肉量",
    unit: "kg",
    parts: [
      { key: "【筋肉量】体幹部", label: "体幹部", position: "core" },
      { key: "【筋肉量】左腕", label: "左腕", position: "left-arm" },
      { key: "【筋肉量】右腕", label: "右腕", position: "right-arm" },
      { key: "【筋肉量】左脚", label: "左脚", position: "left-leg" },
      { key: "【筋肉量】右脚", label: "右脚", position: "right-leg" }
    ]
  }
];

const BODY_TREND_METRICS = [
  { key: "weight", label: "体重", unit: "kg" },
  { key: "fat_mass", label: "体脂肪量", unit: "kg" },
  { key: "fat_rate", label: "体脂肪率", unit: "%" },
  { key: "muscle", label: "筋肉量", unit: "kg" },
  { key: "water", label: "体水分量", unit: "kg" },
  { key: "bone", label: "推定骨量", unit: "kg" },
  { key: "bmr", label: "基礎代謝量", unit: "kcal" },
  { key: "visceral", label: "内臓脂肪レベル", unit: "" },
  { key: "athlete", label: "アスリート指数", unit: "" },
  { key: "bmi", label: "BMI", unit: "" }
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
let omronTempChart;
let omronSpo2Chart;
let omronBpChart;
let omronWeightChart;
let currentData = null;
let currentMetricKey = METRICS[0].key;
let ratingRangeKey = "day";
let sleepRangeKey = "day";
let ratingFilterKey = "all";
let sleepFilterKey = "all";
let currentActivityKey = ACTIVITIES[0].key;
let currentActivityMonth = null;
let activityMode = "single";
let bodyMetricKey = "fat_rate";
let bodyRecordIndex = null;
let bodyTrendMetricKey = "weight";
let bodyTrendRangeKey = "day";
let bodyTrendFilterKey = "all";
let bodyTrendChart;
let selectorsInitialized = false;
let loadVersion = 0;

document.addEventListener("DOMContentLoaded", () => {
  const refreshButtons = document.querySelectorAll("[data-refresh]");
  refreshButtons.forEach((button) => {
    button.addEventListener("click", () => loadAndRender(button));
  });
  loadAndRender();
});

async function loadAndRender(triggerButton = null) {
  loadVersion += 1;
  const currentVersion = loadVersion;
  setLoadingState(true, triggerButton);
  setStatus("Loading data...");
  try {
    const [mainResult, compositionResult] = await Promise.allSettled([
      fetchCsvRows(CSV_URL),
      fetchCsvRows(COMPOSITION_URL)
    ]);
    if (mainResult.status !== "fulfilled") {
      throw mainResult.reason;
    }
    const data = prepareData(mainResult.value);
    if (compositionResult.status === "fulfilled") {
      data.bodyComposition = prepareBodyComposition(compositionResult.value);
    } else {
      console.warn("Body composition fetch failed", compositionResult.reason);
      data.bodyComposition = null;
    }
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

  setOmronLoading(true);
  fetchOmronDataWithTimeout(8000)
    .then((omron) => finalizeOmronFetch(currentVersion, omron, null))
    .catch((error) => finalizeOmronFetch(currentVersion, null, error));
}

async function fetchCsvRows(sourceUrl) {
  const url = `${sourceUrl}${sourceUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
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

async function fetchOmronData() {
  const keys = ["bodyTemperature", "spo2", "bloodPressure", "bodyComposition"];
  const urls = {
    bodyTemperature: buildOmronGasUrl("bodyTemperature"),
    spo2: buildOmronGasUrl("spo2"),
    bloodPressure: buildOmronGasUrl("bloodPressure"),
    bodyComposition: buildOmronGasUrl("bodyComposition")
  };

  const requests = keys.map((key) => {
    const url = urls[key];
    if (!url) return Promise.resolve(null);
    return fetchCsvRows(url);
  });

  const results = await Promise.allSettled(requests);
  const rows = {};
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === "fulfilled") {
      rows[key] = result.value;
    } else {
      console.warn(`OMRON fetch failed: ${key}`, result.reason);
      rows[key] = null;
    }
  });

  return prepareOmronData(rows);
}

function buildOmronGasUrl(type) {
  const params = new URLSearchParams({ type, token: OMRON_GAS_TOKEN });
  return `${OMRON_GAS_URL}?${params.toString()}`;
}

function fetchOmronDataWithTimeout(timeoutMs) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("OMRON fetch timeout"));
    }, timeoutMs);
    fetchOmronData()
      .then((data) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(data);
      })
      .catch((error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(error);
      });
  });
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

function prepareOmronData(rows) {
  if (!rows) return null;
  const temperature = prepareOmronSeries(rows.bodyTemperature, "体温(℃)");
  const spo2 = prepareOmronSeries(rows.spo2, "酸素飽和度(%)");
  const weight = prepareOmronSeries(rows.bodyComposition, "体重(kg)");
  const bloodPressure = prepareOmronBloodPressure(rows.bloodPressure);

  if (!temperature && !spo2 && !weight && !bloodPressure) return null;
  return {
    temperature,
    spo2,
    weight,
    bloodPressure
  };
}

function prepareOmronSeries(rawRows, valueKey) {
  if (!rawRows?.length) return null;
  const records = rawRows
    .map((row) => cleanRow(row))
    .filter((row) => row["測定日"])
    .map((row) => ({ ...row, _ts: parseTimestamp(row["測定日"]) }))
    .filter((row) => row._ts)
    .sort((a, b) => a._ts - b._ts);

  if (!records.length) return null;
  return { records, valueKey };
}

function prepareOmronBloodPressure(rawRows) {
  if (!rawRows?.length) return null;
  const records = rawRows
    .map((row) => cleanRow(row))
    .filter((row) => row["測定日"])
    .map((row) => ({ ...row, _ts: parseTimestamp(row["測定日"]) }))
    .filter((row) => row._ts)
    .sort((a, b) => a._ts - b._ts);
  if (!records.length) return null;
  return { records };
}

function prepareBodyComposition(rawRows) {
  const rows = rawRows.map((row) => cleanRow(row)).filter((row) => row["タイムスタンプ"]);
  const records = rows
    .map((row) => {
      const measured = parseDateOnly(row["測定実施日"]);
      const timestamp = parseTimestamp(row["タイムスタンプ"]);
      return {
        ...row,
        _measured: measured || timestamp,
        _timestamp: timestamp,
        _ts: measured || timestamp
      };
    })
    .filter((row) => row._measured)
    .sort((a, b) => a._measured - b._measured);

  if (!records.length) return null;

  return {
    records
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

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("/").map((item) => Number(item));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
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

function formatDateSafe(date) {
  if (!date) return "-";
  return formatDate(date);
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

function computeDelta(currentValue, previousValue) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return null;
  }
  const diff = previousValue - currentValue;
  const pct = Math.abs((diff / previousValue) * 100);
  if (diff > 0) {
    return { direction: "down", value: pct };
  }
  if (diff < 0) {
    return { direction: "up", value: pct };
  }
  return { direction: "flat", value: 0 };
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
  const countEl = document.getElementById("record-count-1");
  const rangeEl = document.getElementById("date-range-1");
  const lastEl = document.getElementById("last-entry-1");

  if (countEl) countEl.textContent = records.length.toString();
  if (dailyRecords.length && rangeEl && lastEl) {
    const start = dailyRecords[0]._ts;
    const end = dailyRecords[dailyRecords.length - 1]._ts;
    rangeEl.textContent = `${formatDate(start)} → ${formatDate(end)}`;
    lastEl.textContent = formatDateTime(end);
  }

  const countEl2 = document.getElementById("record-count-2");
  const rangeEl2 = document.getElementById("date-range-2");
  const lastEl2 = document.getElementById("last-entry-2");
  const bodyRecords = data.bodyComposition?.records || [];

  if (countEl2) countEl2.textContent = bodyRecords.length.toString();
  if (bodyRecords.length && rangeEl2 && lastEl2) {
    const start = bodyRecords[0]._measured;
    const end = bodyRecords[bodyRecords.length - 1]._measured;
    rangeEl2.textContent = `${formatDateSafe(start)} → ${formatDateSafe(end)}`;
    lastEl2.textContent = formatDateSafe(end);
  }
}

function renderOmronSection(omron) {
  omronTempChart = renderOmronLineChart(
    omron?.temperature,
    {
      canvasId: "omron-temp-chart",
      innerId: "omron-temp-inner",
      label: "体温",
      unit: "℃",
      color: "#e0572c",
      suggestedMin: 35,
      suggestedMax: 39
    },
    omronTempChart
  );

  omronSpo2Chart = renderOmronLineChart(
    omron?.spo2,
    {
      canvasId: "omron-spo2-chart",
      innerId: "omron-spo2-inner",
      label: "酸素飽和度",
      unit: "%",
      color: "#1a7f5a",
      suggestedMin: 92,
      suggestedMax: 100
    },
    omronSpo2Chart
  );

  omronWeightChart = renderOmronLineChart(
    omron?.weight,
    {
      canvasId: "omron-weight-chart",
      innerId: "omron-weight-inner",
      label: "体重",
      unit: "kg",
      color: "#2b6cb0"
    },
    omronWeightChart
  );

  omronBpChart = renderOmronBloodPressureChart(omron?.bloodPressure, omronBpChart);
}

function renderOmronLineChart(series, config, chartRef) {
  const canvas = document.getElementById(config.canvasId);
  const inner = document.getElementById(config.innerId);
  if (!canvas || !inner) return chartRef;

  if (!series?.records?.length) {
    if (chartRef) chartRef.destroy();
    return null;
  }

  const labels = series.records.map((record) => formatDateTime(record._ts));
  const values = series.records.map((record) => toNumber(record[series.valueKey]));

  setChartWidth(config.innerId, labels.length, OMRON_POINT_WIDTH);

  if (chartRef) chartRef.destroy();
  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: config.label,
          data: values,
          borderColor: config.color,
          backgroundColor: `${config.color}33`,
          tension: 0.3,
          spanGaps: true,
          fill: true
        }
      ]
    },
    options: baseChartOptions({
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              if (!Number.isFinite(value)) {
                return `${config.label}: -`;
              }
              return `${config.label}: ${formatValueWithUnit(value, config.unit)}`;
            }
          }
        }
      },
      scales: {
        y: {
          suggestedMin: config.suggestedMin,
          suggestedMax: config.suggestedMax,
          ticks: {
            callback: (value) => formatValueWithUnit(value, config.unit)
          }
        }
      }
    })
  });
}

function renderOmronBloodPressureChart(series, chartRef) {
  const canvas = document.getElementById("omron-bp-chart");
  const inner = document.getElementById("omron-bp-inner");
  if (!canvas || !inner) return chartRef;

  if (!series?.records?.length) {
    if (chartRef) chartRef.destroy();
    return null;
  }

  const labels = series.records.map((record) => formatDateTime(record._ts));
  const ranges = [];
  const meta = [];

  series.records.forEach((record) => {
    const systolic = toNumber(record["最高血圧(mmHg)"]);
    const diastolic = toNumber(record["最低血圧(mmHg)"]);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
      ranges.push(null);
      meta.push(null);
      return;
    }
    const low = Math.min(systolic, diastolic);
    const high = Math.max(systolic, diastolic);
    ranges.push([low, high]);
    meta.push({
      systolic,
      diastolic,
      pulse: toNumber(record["脈拍(bpm)"])
    });
  });

  setChartWidth("omron-bp-inner", labels.length, OMRON_POINT_WIDTH);

  if (chartRef) chartRef.destroy();
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "血圧",
          data: ranges,
          backgroundColor: "rgba(15, 118, 110, 0.25)",
          borderColor: "#0f766e",
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
              const lines = [`血圧: ${item.systolic}/${item.diastolic} mmHg`];
              if (Number.isFinite(item.pulse)) {
                lines.push(`脈拍: ${item.pulse.toFixed(0)} bpm`);
              }
              return lines;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `${value} mmHg`
          }
        }
      }
    })
  });
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
  const bodyMetricSelect = document.getElementById("body-metric");
  const bodyPrev = document.getElementById("body-prev-record");
  const bodyNext = document.getElementById("body-next-record");
  const bodyCalendarBtn = document.getElementById("body-calendar");
  const bodyTrendRangeSelect = document.getElementById("body-trend-range");
  const bodyTrendFilterSelect = document.getElementById("body-trend-filter");

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

  if (bodyMetricSelect && bodyMetricSelect.options.length === 0) {
    BODY_METRICS.forEach((metric) => {
      const option = document.createElement("option");
      option.value = metric.key;
      option.textContent = metric.label;
      bodyMetricSelect.appendChild(option);
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

  [bodyTrendRangeSelect].forEach((select) => {
    if (!select || select.options.length) return;
    Object.entries(RANGE_CONFIG).forEach(([key, config]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = config.label;
      select.appendChild(option);
    });
  });

  [bodyTrendFilterSelect].forEach((select) => {
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

    if (bodyMetricSelect) {
      bodyMetricSelect.addEventListener("change", () => {
        bodyMetricKey = bodyMetricSelect.value;
        if (!currentData) return;
        renderBodyComposition(currentData.bodyComposition);
      });
    }


    if (bodyTrendRangeSelect) {
      bodyTrendRangeSelect.addEventListener("change", () => {
        bodyTrendRangeKey = bodyTrendRangeSelect.value;
        if (!currentData) return;
        renderBodyTrend(currentData.bodyComposition);
      });
    }

    if (bodyTrendFilterSelect) {
      bodyTrendFilterSelect.addEventListener("change", () => {
        bodyTrendFilterKey = bodyTrendFilterSelect.value;
        if (!currentData) return;
        renderBodyTrend(currentData.bodyComposition);
      });
    }

    if (bodyPrev) {
      bodyPrev.addEventListener("click", () => {
        moveBodyRecord(-1);
      });
    }

    if (bodyNext) {
      bodyNext.addEventListener("click", () => {
        moveBodyRecord(1);
      });
    }

    if (bodyCalendarBtn) {
      bodyCalendarBtn.addEventListener("click", () => {
        toggleBodyCalendar();
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
  if (bodyMetricSelect) {
    bodyMetricSelect.value = bodyMetricKey;
  }
  if (bodyTrendRangeSelect) {
    bodyTrendRangeSelect.value = bodyTrendRangeKey;
  }
  if (bodyTrendFilterSelect) {
    bodyTrendFilterSelect.value = bodyTrendFilterKey;
  }
  if (activityMonthSelect) {
    activityMonthSelect.value = currentActivityMonth || "";
  }
  updateActivityMonthButtons();
}

function renderAll(data) {
  renderBodyComposition(data.bodyComposition);
  renderBodyTrend(data.bodyComposition);
  renderOmronSection(data.omron);
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

function renderBodyComposition(body) {
  const card = document.getElementById("body-card");
  const note = document.getElementById("body-note");
  const latestEl = document.getElementById("body-latest");
  const prevEl = document.getElementById("body-prev");
  const recordLabel = document.getElementById("body-record-label");

  if (!card || !note) return;

  if (!body) {
    latestEl.textContent = "-";
    prevEl.textContent = "-";
    note.textContent = "体組成データがありません。";
    updateBodyLabels([]);
    renderBodySummary(null);
    if (recordLabel) recordLabel.textContent = "-";
    return;
  }

  if (bodyRecordIndex === null || bodyRecordIndex >= body.records.length) {
    bodyRecordIndex = body.records.length - 1;
  }
  const current = body.records[bodyRecordIndex];
  const previous = bodyRecordIndex > 0 ? body.records[bodyRecordIndex - 1] : null;

  latestEl.textContent = formatDateSafe(current?._measured) || "-";
  prevEl.textContent = previous ? formatDateSafe(previous._measured) : "-";
  if (recordLabel) {
    recordLabel.textContent = formatDateSafe(current?._measured);
  }

  const metric = BODY_METRICS.find((item) => item.key === bodyMetricKey) || BODY_METRICS[0];
  note.textContent = "";
  updateBodyLabels(buildBodyParts(current, previous, metric));
  renderBodySummary(current, previous, metric);
  updateBodyRecordButtons(body);
}

function updateBodyLabels(parts) {
  const positions = {
    "core": document.getElementById("body-core"),
    "left-arm": document.getElementById("body-left-arm"),
    "right-arm": document.getElementById("body-right-arm"),
    "left-leg": document.getElementById("body-left-leg"),
    "right-leg": document.getElementById("body-right-leg")
  };

  const layoutParts = BODY_METRICS[0].parts;

  layoutParts.forEach((part) => {
    const el = positions[part.position];
    if (!el) return;
    const data = parts.find((item) => item.position === part.position);
    if (!data || !Number.isFinite(data.value)) {
      el.innerHTML = `
        <div class="label-name">${part.label}</div>
        <div class="label-value">-</div>
        <div class="label-delta flat">前回比 -</div>
      `;
      return;
    }
    const valueText = data.unit ? `${data.value.toFixed(1)}${data.unit}` : `${data.value.toFixed(1)}`;
    let deltaText = "前回比 -";
    let deltaClass = "flat";
    if (data.delta) {
      if (data.delta.direction === "down") {
        deltaText = `前回比 ↓ ${data.delta.value.toFixed(1)}%`;
        deltaClass = "down";
      } else if (data.delta.direction === "up") {
        deltaText = `前回比 ↑ ${data.delta.value.toFixed(1)}%`;
        deltaClass = "up";
      } else {
        deltaText = "前回比 ±0.0%";
        deltaClass = "flat";
      }
    }
    el.innerHTML = `
      <div class="label-name">${part.label}</div>
      <div class="label-value">${valueText}</div>
      <div class="label-delta ${deltaClass}">${deltaText}</div>
    `;
  });
}

function buildBodyParts(current, previous, metric) {
  if (!current) return [];
  return metric.parts.map((part) => {
    const currentValue = toNumber(current[part.key]);
    const prevValue = previous ? toNumber(previous[part.key]) : null;
    const delta = computeDelta(currentValue, prevValue);
    return {
      ...part,
      value: currentValue,
      delta,
      unit: metric.unit
    };
  });
}

function renderBodySummary(current, previous, metric) {
  const summary = document.getElementById("body-summary");
  const note = document.getElementById("body-note");
  if (!summary) return;
  summary.innerHTML = "";

  if (!current) {
    if (note) note.textContent = "体組成データがありません。";
    return;
  }

  const weight = toNumber(current["体重"]);
  const fatMass = toNumber(current["体脂肪量"]);
  const fatRate = computeFatRate(weight, fatMass);
  const muscle = toNumber(current["筋肉量"]);
  const water = toNumber(current["体水分量"]);
  const bone = toNumber(current["推定骨量"]);
  const bmr = toNumber(current["基礎代謝量"]);
  const visceral = toNumber(current["内臓脂肪レベル"]);
  const athlete = toNumber(current["アスリート指数"]);
  const bmi = computeBmi(weight, USER_HEIGHT_CM, current["BMI"]);

  const prevWeight = previous ? toNumber(previous["体重"]) : null;
  const prevFatMass = previous ? toNumber(previous["体脂肪量"]) : null;
  const prevFatRate = computeFatRate(prevWeight, prevFatMass);
  const prevMuscle = previous ? toNumber(previous["筋肉量"]) : null;
  const prevWater = previous ? toNumber(previous["体水分量"]) : null;
  const prevBone = previous ? toNumber(previous["推定骨量"]) : null;
  const prevBmr = previous ? toNumber(previous["基礎代謝量"]) : null;
  const prevVisceral = previous ? toNumber(previous["内臓脂肪レベル"]) : null;
  const prevAthlete = previous ? toNumber(previous["アスリート指数"]) : null;
  const prevBmi = computeBmi(prevWeight, USER_HEIGHT_CM, previous ? previous["BMI"] : null);

  const items = [
    {
      metricKey: "weight",
      label: "体重",
      value: formatValue(weight, "kg"),
      delta: computeDelta(weight, prevWeight)
    },
    {
      metricKey: "fat_mass",
      label: "体脂肪量（体脂肪率）",
      value: formatFatMassRate(fatMass, fatRate),
      delta: computeDelta(fatMass, prevFatMass) || computeDelta(fatRate, prevFatRate)
    },
    {
      metricKey: "muscle",
      label: "筋肉量",
      value: formatValue(muscle, "kg"),
      delta: computeDelta(muscle, prevMuscle)
    },
    {
      metricKey: "water",
      label: "体水分量",
      value: formatValue(water, "kg"),
      delta: computeDelta(water, prevWater)
    },
    {
      metricKey: "bone",
      label: "推定骨量",
      value: formatValue(bone, "kg"),
      delta: computeDelta(bone, prevBone)
    },
    {
      metricKey: "bmr",
      label: "基礎代謝量",
      value: formatValue(bmr, "kcal"),
      delta: computeDelta(bmr, prevBmr)
    },
    {
      metricKey: "visceral",
      label: "内臓脂肪レベル",
      value: formatValue(visceral, ""),
      delta: computeDelta(visceral, prevVisceral)
    },
    {
      metricKey: "athlete",
      label: "アスリート指数",
      value: formatValue(athlete, ""),
      delta: computeDelta(athlete, prevAthlete)
    },
    {
      metricKey: "bmi",
      label: "BMI",
      value: formatValue(bmi, ""),
      delta: computeDelta(bmi, prevBmi)
    }
  ];

  items.forEach((item) => {
    const card = document.createElement("div");
    const isActive = bodyTrendMetricKey === item.metricKey;
    card.className = `body-summary-item${isActive ? " active" : ""}`;
    const deltaInfo = formatDeltaText(item.delta);
    card.innerHTML = `
      <div class="body-summary-label">${item.label}</div>
      <div class="body-summary-value">${item.value}</div>
      <div class="body-summary-delta ${deltaInfo.className}">${deltaInfo.text}</div>
    `;
    card.addEventListener("click", () => {
      bodyTrendMetricKey = item.metricKey;
      if (currentData?.bodyComposition) {
        renderBodyTrend(currentData.bodyComposition);
        renderBodyComposition(currentData.bodyComposition);
      }
    });
    summary.appendChild(card);
  });

  if (note && !USER_HEIGHT_CM) {
    note.textContent = "BMIは身長未設定のため未表示です。";
  }
}

function renderBodyTrend(body) {
  const canvas = document.getElementById("body-trend-chart");
  const inner = document.getElementById("body-trend-inner");
  if (!canvas || !inner) return;

  if (!body?.records?.length) {
    if (bodyTrendChart) bodyTrendChart.destroy();
    return;
  }

  const metric = BODY_TREND_METRICS.find((item) => item.key === bodyTrendMetricKey) || BODY_TREND_METRICS[0];
  const records = body.records;
  const values = records.map((record) => getBodyMetricValue(record, metric.key));
  const filtered = filterRecordsByRange(records, values, bodyTrendFilterKey);
  const aggregated = aggregateByRange(filtered.records, filtered.values, bodyTrendRangeKey);
  const range = RANGE_CONFIG[bodyTrendRangeKey] || RANGE_CONFIG.day;
  const moving = movingAverage(aggregated.values, range.maWindow);

  setChartWidth("body-trend-inner", aggregated.labels.length, range.pointWidth);

  if (bodyTrendChart) bodyTrendChart.destroy();
  bodyTrendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: aggregated.labels,
      datasets: [
        {
          label: metric.label,
          data: aggregated.values,
          borderColor: "#2b6cb0",
          backgroundColor: "rgba(43, 108, 176, 0.18)",
          tension: 0.3,
          spanGaps: true,
          fill: true
        },
        {
          label: `${metric.label} ${range.maLabel}`,
          data: moving,
          borderColor: getMovingAverageColor("#2b6cb0"),
          borderDash: [6, 4],
          tension: 0.3,
          spanGaps: true
        }
      ]
    },
    options: baseChartOptions({
      scales: {
        y: {
          ticks: {
            callback: (value) => formatValueWithUnit(value, metric.unit)
          }
        }
      }
    })
  });
}

function getBodyMetricValue(record, key) {
  const weight = toNumber(record["体重"]);
  const fatMass = toNumber(record["体脂肪量"]);
  switch (key) {
    case "weight":
      return weight;
    case "fat_mass":
      return fatMass;
    case "fat_rate":
      return computeFatRate(weight, fatMass);
    case "muscle":
      return toNumber(record["筋肉量"]);
    case "water":
      return toNumber(record["体水分量"]);
    case "bone":
      return toNumber(record["推定骨量"]);
    case "bmr":
      return toNumber(record["基礎代謝量"]);
    case "visceral":
      return toNumber(record["内臓脂肪レベル"]);
    case "athlete":
      return toNumber(record["アスリート指数"]);
    case "bmi":
      return computeBmi(weight, USER_HEIGHT_CM, record["BMI"]);
    default:
      return null;
  }
}

function formatValueWithUnit(value, unit) {
  if (!Number.isFinite(value)) return "";
  if (!unit) return value.toString();
  return `${value}${unit}`;
}

function moveBodyRecord(delta) {
  if (!currentData?.bodyComposition?.records?.length) return;
  const records = currentData.bodyComposition.records;
  if (bodyRecordIndex === null) {
    bodyRecordIndex = records.length - 1;
  }
  const nextIndex = bodyRecordIndex + delta;
  if (nextIndex < 0 || nextIndex >= records.length) return;
  bodyRecordIndex = nextIndex;
  renderBodyComposition(currentData.bodyComposition);
}

function updateBodyRecordButtons(body) {
  const prev = document.getElementById("body-prev-record");
  const next = document.getElementById("body-next-record");
  if (!prev || !next || !body?.records?.length) return;
  prev.disabled = bodyRecordIndex <= 0;
  next.disabled = bodyRecordIndex >= body.records.length - 1;
}

function toggleBodyCalendar() {
  const panel = document.getElementById("body-calendar-panel");
  if (!panel || !currentData?.bodyComposition?.records?.length) return;
  panel.classList.toggle("visible");
  if (panel.classList.contains("visible")) {
    renderBodyCalendar(currentData.bodyComposition);
  }
}

function renderBodyCalendar(body) {
  const panel = document.getElementById("body-calendar-panel");
  if (!panel || !body?.records?.length) return;
  panel.innerHTML = "";

  const recordsByDate = new Map(
    body.records.map((record, index) => [formatDateSafe(record._measured), index])
  );

  const currentRecord = body.records[bodyRecordIndex ?? body.records.length - 1];
  const baseDate = currentRecord?._measured || body.records[body.records.length - 1]._measured;
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  weekdays.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "calendar-header";
    cell.textContent = label;
    panel.appendChild(cell);
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startIndex = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startIndex + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (i < startIndex || i >= startIndex + daysInMonth) {
      cell.classList.add("empty");
      panel.appendChild(cell);
      continue;
    }

    const day = i - startIndex + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const index = recordsByDate.get(dateKey);
    const dayEl = document.createElement("div");
    dayEl.className = "day";
    dayEl.textContent = day.toString();
    cell.appendChild(dayEl);

    if (index !== undefined) {
      cell.classList.add("active");
      cell.title = "記録あり";
      if (index === bodyRecordIndex) {
        cell.classList.add("selected");
      }
      cell.addEventListener("click", () => {
        bodyRecordIndex = index;
        renderBodyComposition(currentData.bodyComposition);
        renderBodyCalendar(currentData.bodyComposition);
        const panel = document.getElementById("body-calendar-panel");
        if (panel) panel.classList.remove("visible");
      });
    } else {
      cell.classList.add("no-data");
      cell.title = "記録なし";
    }
    panel.appendChild(cell);
  }
}

function computeFatRate(weight, fatMass) {
  if (!Number.isFinite(weight) || !Number.isFinite(fatMass) || weight === 0) return null;
  return (fatMass / weight) * 100;
}

function computeBmi(weight, heightCm, bmiFallback) {
  if (Number.isFinite(heightCm) && Number.isFinite(weight) && heightCm > 0) {
    const heightM = heightCm / 100;
    return weight / (heightM * heightM);
  }
  const fallback = toNumber(bmiFallback);
  return Number.isFinite(fallback) ? fallback : null;
}

function formatValue(value, unit) {
  if (!Number.isFinite(value)) return "-";
  const rounded = unit === "%" ? value.toFixed(1) : value.toFixed(1);
  return unit ? `${rounded}${unit}` : rounded;
}

function formatFatMassRate(fatMass, fatRate) {
  if (!Number.isFinite(fatMass) && !Number.isFinite(fatRate)) return "-";
  const massText = Number.isFinite(fatMass) ? `${fatMass.toFixed(1)}kg` : "-";
  const rateText = Number.isFinite(fatRate) ? `${fatRate.toFixed(1)}%` : "-";
  return `${massText} (${rateText})`;
}

function formatDeltaText(delta) {
  if (!delta) {
    return { text: "前回比 -", className: "flat" };
  }
  if (delta.direction === "down") {
    return { text: `前回比 ↓ ${delta.value.toFixed(1)}%`, className: "down" };
  }
  if (delta.direction === "up") {
    return { text: `前回比 ↑ ${delta.value.toFixed(1)}%`, className: "up" };
  }
  return { text: "前回比 ±0.0%", className: "flat" };
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

function setLoadingState(isLoading, triggerButton = null) {
  const refreshButtons = document.querySelectorAll("[data-refresh]");
  refreshButtons.forEach((button) => {
    const isTrigger = button === triggerButton;
    button.disabled = isLoading && !isTrigger;
    button.textContent = "⟳";
    button.classList.toggle("is-loading", isLoading && isTrigger);
    if (isTrigger) {
      button.setAttribute("aria-busy", isLoading ? "true" : "false");
    } else {
      button.removeAttribute("aria-busy");
    }
  });
}

function setOmronLoading(isLoading) {
  const card = document.getElementById("omron-card");
  const overlays = document.querySelectorAll("#omron-card .chart-loading");
  if (card) {
    card.classList.toggle("is-loading", isLoading);
  }
  overlays.forEach((overlay) => {
    overlay.hidden = !isLoading;
  });
}

function finalizeOmronFetch(version, omron, error) {
  if (loadVersion !== version) return;
  try {
    if (error) {
      console.warn("OMRON data fetch timed out or failed", error);
    } else if (currentData) {
      currentData.omron = omron;
    }
    renderOmronSection(currentData?.omron ?? omron ?? null);
  } catch (renderError) {
    console.error("OMRON render failed", renderError);
  } finally {
    setOmronLoading(false);
  }
}
