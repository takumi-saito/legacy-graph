/* global Chart */
const REGISTRY_URL = "data/registry.json"; // 例: { "repos": ["takumi-saito/MinimalLauncherApp", ...] }
const BYTES = new Intl.NumberFormat("ja-JP");

let legacyChart, ratioChart, legacyTrendChart;

const $ = (id) => document.getElementById(id);

// DOMContentLoaded を待ってから初期化
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM読み込み完了 - 初期化を開始します");
  
  const repoSelect = $("repoSelect");
  const repoInput = $("repoInput");
  const loadBtn = $("loadBtn");
  const summary = $("summary");
  const rawJson = $("rawJson");
  const metaEl = $("meta");
  
  // DOM要素の存在確認
  if (!repoSelect || !repoInput || !loadBtn) {
    console.error("必要なDOM要素が見つかりません:", {
      repoSelect: !!repoSelect,
      repoInput: !!repoInput, 
      loadBtn: !!loadBtn
    });
    return;
  }
  
  console.log("DOM要素確認OK - 初期化関数を呼び出します");
  
  // グローバルスコープに配置（他の関数から参照するため）
  window.repoSelect = repoSelect;
  window.repoInput = repoInput;
  window.loadBtn = loadBtn;
  window.summary = summary;
  window.rawJson = rawJson;
  window.metaEl = metaEl;
  
  // 初期化
  init();
});

async function init() {
  // レジストリ読み込み（無ければ手入力に切り替え）
  console.log("初期化開始: レジストリを読み込みます...");
  const repos = await loadRegistry();
  console.log("レジストリ読み込み結果:", repos);
  
  if (repos && repos.length) {
    console.log(`${repos.length}個のリポジトリが見つかりました:`, repos);
    const options = repos.map(r => `<option value="${r}">${r}</option>`).join("");
    console.log("作成したオプションHTML:", options);
    repoSelect.innerHTML = options;
    console.log("セレクトボックスの内容:", repoSelect.innerHTML);
    console.log("セレクトボックスのオプション数:", repoSelect.options.length);
  } else {
    console.log("レジストリが空または読み込み失敗 - 手入力モードに切り替えます");
    repoSelect.classList.add("hidden");
    repoInput.classList.remove("hidden");
  }

  loadBtn.addEventListener("click", () => {
    const slug = repoSelect.classList.contains("hidden") ? repoInput.value.trim() : repoSelect.value;
    console.log("読み込みボタンクリック - 選択されたリポジトリ:", slug);
    if (!slug || !slug.includes("/")) {
      alert("org/repo の形式で指定してください");
      return;
    }
    loadRepo(slug);
  });

  // 初回自動読み込み（レジストリがある場合のみ先頭を表示）
  if (repos && repos.length) {
    console.log("初回自動読み込み:", repos[0]);
    await loadRepo(repos[0]);
  }
}

async function loadRegistry() {
  try {
    console.log("レジストリURL:", REGISTRY_URL);
    const res = await fetch(REGISTRY_URL, { cache: "no-store" });
    console.log("レジストリ fetch 結果:", res.ok ? "成功" : `失敗 (${res.status})`);
    
    if (!res.ok) {
      throw new Error(`レジストリ読み込み失敗: HTTP ${res.status}`);
    }
    
    const json = await res.json();
    console.log("レジストリ JSON:", json);
    
    if (!json || !Array.isArray(json.repos)) {
      console.warn("レジストリフォーマットエラー - repos 配列が見つかりません:", json);
      return [];
    }
    
    return json.repos;
  } catch (error) {
    console.error("レジストリ読み込みエラー:", error.message);
    return [];
  }
}

function latestPath(slug) {
  const [org, repo] = slug.split("/");
  return `data/${org}/${repo}/latest.json`;
}

// 可能なら履歴の index を読む（無ければ null）
async function loadHistoryIndex(slug) {
  try {
    const [org, repo] = slug.split("/");
    const res = await fetch(`data/${org}/${repo}/index.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const idx = await res.json(); // 例: { "history": ["20250904T060000Z.json", ...] }
    return Array.isArray(idx.history) ? idx.history : null;
  } catch {
    return null;
  }
}

async function loadRepo(slug) {
  const latestUrl = latestPath(slug);
  const metaEl = window.metaEl;
  metaEl.textContent = `読み込み中… ${slug}`;

  try {
    const latest = await (await fetch(latestUrl, { cache: "no-store" })).json();
    renderLatest(slug, latest);

    // 履歴（最大12件）を読み込んで時系列を表示（index.json があれば）
    const historyIndex = await loadHistoryIndex(slug);
    if (historyIndex && historyIndex.length) {
      const [org, repo] = slug.split("/");
      const last = historyIndex.slice(-12); // 直近12件
      const urls = last.map(name => `data/${org}/${repo}/${name}`);
      const items = (await Promise.all(urls.map(u => fetch(u, { cache: "no-store" }).then(r => r.json()).catch(() => null))))
        .filter(Boolean)
        .sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at));

      renderTimeSeries(items);
    } else {
      // index が無い場合は単発のみ
      renderTimeSeries([latest]);
    }

    metaEl.textContent = `Loaded: ${slug} / ${latest.generated_at || "—"}`;
  } catch (e) {
    console.error(e);
    metaEl.textContent = `読み込み失敗: ${slug}`;
    alert(`latest.json が見つかりません: ${latestUrl}`);
  }
}

function renderLatest(slug, m) {
  // サマリー
  const summary = window.summary;
  const rawJson = window.rawJson;
  const javaFiles = num(m?.files?.java);
  const ktFiles = num(m?.files?.kotlin);
  const javaRatio = (m?.language?.java_file_ratio ?? 0) * 100;

  const ui = m.ui || {};
  const events = m.events || {};
  const build = m.buildsys || {};
  const legacy = m.legacy || {};
  const support = m.supportlib || {};

  const cards = [
    { k: "Java比率", v: `${javaRatio.toFixed(1)}%`, s: "言語" },
    { k: "Kotlin/Java", v: `${ktFiles} / ${javaFiles}`, s: "言語" },
    { k: "Compose関数", v: num(ui.composable_functions), s: "UI" },
    { k: "View系ファイル", v: num(ui.kotlin_view_like_files), s: "UI" },
    { k: "XML / DB-XML", v: `${num(ui.xml_layout_files)} / ${num(ui.databinding_layout_files)}`, s: "UI" },
    { k: "Flow / LiveData", v: `${num(events.flow_imports)} / ${num(events.livedata_imports)}`, s: "イベント" },
    { k: "Rx / EventBus", v: `${num(events.rx_imports)} / ${num(events.eventbus_imports)}`, s: "イベント" },
    { k: "kapt / ksp", v: `${num(build.kapt_deps_count)} / ${num(build.ksp_plugins_count)}`, s: "ビルド" },
    { k: "DataBinding有効", v: num(build.dataBinding_enabled_modules), s: "ビルド" },
    { k: "Support参照", v: `${num(support.support_code_refs)} / ${num(support.support_dep_refs)}`, s: "Support" }
  ];

  summary.innerHTML = cards.map(c => `
    <article class="card">
      <div class="card-section">${c.s}</div>
      <div class="card-key">${c.k}</div>
      <div class="card-val">${c.v}</div>
    </article>
  `).join("");

  // 生JSON
  rawJson.textContent = JSON.stringify(m, null, 2);

  // Legacy/Support 棒グラフ
  const legacyData = [
    num(legacy.asyncTask_usages),
    num(legacy.loader_usages),
    num(legacy.frameworkFragment_usages),
    num(legacy.supportFragment_usages),
    num(legacy.fragmentXml_tags),
    num(support.support_code_refs),
    num(support.support_dep_refs)
  ];
  makeOrUpdateBar("legacyChart",
    ["AsyncTask", "Loader", "FW Fragment", "Support Fragment", "<fragment>", "support.*(code)", "com.android.support:(dep)"],
    legacyData,
    (chart) => (legacyChart = chart)
  );
}

function renderTimeSeries(items) {
  // x: generated_at
  const labels = items.map(i => i.generated_at ?? "—");

  // Java 比率（%）
  const ratio = items.map(i => (i?.language?.java_file_ratio ?? 0) * 100);

  // Legacy 合計（legacy + support の単純合算）
  const legacySum = items.map(i => {
    const L = i.legacy || {};
    const S = i.supportlib || {};
    return num(L.asyncTask_usages) + num(L.loader_usages) + num(L.frameworkFragment_usages) +
           num(L.supportFragment_usages) + num(L.fragmentXml_tags) +
           num(S.support_code_refs) + num(S.support_dep_refs);
  });

  makeOrUpdateLine("ratioChart", labels, ratio, "%", (c) => (ratioChart = c));
  makeOrUpdateLine("legacyTrendChart", labels, legacySum, "count", (c) => (legacyTrendChart = c));
}

/* Chart helpers */
function makeOrUpdateBar(canvasId, labels, data, save) {
  const ctx = $(canvasId).getContext("2d");
  const cfg = {
    type: "bar",
    data: { labels, datasets: [{ label: "count", data }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  };
  if (window[canvasId]) { window[canvasId].data.labels = labels; window[canvasId].data.datasets[0].data = data; window[canvasId].update(); }
  const chart = new Chart(ctx, cfg);
  save(chart);
}
function makeOrUpdateLine(canvasId, labels, data, yLabel, save) {
  const ctx = $(canvasId).getContext("2d");
  const cfg = {
    type: "line",
    data: { labels, datasets: [{ label: yLabel, data, tension: 0.25 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  };
  if (window[canvasId]) { window[canvasId].data.labels = labels; window[canvasId].data.datasets[0].data = data; window[canvasId].update(); }
  const chart = new Chart(ctx, cfg);
  save(chart);
}

function num(v) { return typeof v === "number" && isFinite(v) ? v : 0; }
