// Builds every image used by the profile README (light + dark variants) and
// refreshes the "Latest writing" block of README.md from the Medium feed.
// Live data comes from the GitHub API and Medium; static content lives in PROFILE below.
// Run: node scripts/build-profile.mjs   (GITHUB_TOKEN is optional but avoids rate limits)

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const README = join(ROOT, "README.md");
const TOKEN = process.env.GITHUB_TOKEN || "";

const PROFILE = {
  login: "AlicanKaya192",
  name: "Alican Kaya",
  role: "data science · machine learning · software",
  tagline: [
    "I build learning tools for data science",
    "and safety checks for AI coding agents.",
  ],
  links: "alican-kaya.com   ·   medium.com/@alicankaya268",
  assetBase: "https://raw.githubusercontent.com/AlicanKaya192/alicankaya192/main/assets",
  medium: {
    feed: "https://medium.com/feed/@alicankaya268",
    maxPosts: 5,
  },
  // Every project card shares one layout: a small live chart on the left, text on the right.
  projects: [
    {
      repo: "Odyssey",
      title: "Odyssey",
      blurb: "An offline desktop app that teaches data science and ML through lessons, quizzes and exercises that check your code.",
      facts: ["Runs offline", "Built with PySide6", "Open source"],
      motif: "path",
    },
    {
      repo: "Mindgate",
      title: "Mindgate",
      blurb: "Python hooks stop Claude Code before it runs a dangerous command, writes to a protected file or opens an unapproved site.",
      facts: ["v1.2.1", "MIT license", "English and Turkish"],
      motif: "gate",
    },
    {
      repo: "Data-Science-RoadMap",
      title: "Data Science Roadmap",
      blurb: "A 22-module path from Python basics to reinforcement learning, with executed notebooks and PDF review questions, written in Turkish.",
      facts: ["Python to RL", "PDF review questions", "In Turkish"],
      motif: "modules",
    },
    {
      repo: "Deep_Learning_Path",
      title: "Deep Learning Path",
      blurb: "11 modules from scratch to advanced, with side-by-side NumPy, TensorFlow and PyTorch code.",
      facts: ["11 modules", "Zero to advanced", "NumPy, TF, PyTorch"],
      motif: "layers",
    },
    {
      repo: "AI-Jobs-Market-2025-2026-Salaries",
      title: "AI Jobs Market 2025–26",
      blurb: "An analysis of global AI and LLM job postings: salary trends, the remote premium and top-paying skills.",
      facts: ["Global AI/LLM job ads", "Salary trends", "Remote work premium"],
      motif: "bars",
    },
    {
      owner: "HandlingDataLargeSetLabProject",
      repo: "NYC-Taxi-Spark-Analysis",
      title: "NYC Taxi Spark Analysis",
      blurb: "A team project on about 20M NYC taxi trips, where three Spark optimizations cut run time by 24–42%.",
      facts: ["Team project", "PySpark + Spark SQL", "~20M trips"],
      motif: "zones",
    },
    {
      repo: "CS_Complete_Terminology_Guide",
      title: "CS Terminology Guide",
      blurb: "A Turkish and English glossary of 350+ core CS terms, split into 26 chapters in learning order.",
      facts: ["350+ terms", "Ordered as you learn", "Turkish + English"],
      motif: "glossary",
      language: "Markdown",
    },
  ],
  stack: [
    ["Languages", ["Python", "SQL", "C#", "C++", "Java"]],
    ["Machine learning", ["scikit-learn", "PyTorch", "TensorFlow", "Statsmodels"]],
    ["Data & analysis", ["pandas", "NumPy", "SciPy", "Matplotlib", "Jupyter"]],
    ["Databases", ["PostgreSQL", "MySQL", "SQL Server", "MongoDB"]],
    ["Engineering", [".NET", "FastAPI", "PySide6 / Qt", "Docker", "Git", "Linux"]],
  ],
  // Generated or presentational files that would distort the language mix.
  ignoredLanguages: ["Jupyter Notebook", "HTML", "CSS", "Roff", "Inno Setup"],
};

const THEMES = {
  dark: {
    surface: "#0f1620", inset: "#0a1018", border: "#24303d", text: "#e6edf3", muted: "#8d9aa8",
    faint: "#2a3644", accent: "#22d3ee", chip: "#0a1018",
    series: ["#22d3ee", "#4ade80", "#60a5fa"], warn: "#fbbf24", danger: "#f87171",
    heat: ["#1a232e", "#0c4a57", "#0e7490", "#06b6d4", "#22d3ee"],
  },
  light: {
    surface: "#f7f9fb", inset: "#edf2f6", border: "#d0d9e2", text: "#1f2328", muted: "#57606a",
    faint: "#d5dee7", accent: "#0e7490", chip: "#ffffff",
    series: ["#0891b2", "#16a34a", "#2563eb"], warn: "#b45309", danger: "#dc2626",
    heat: ["#e8edf2", "#a5e8f3", "#4fc8dd", "#0891b2", "#0e7490"],
  },
};

const LANG_COLORS = {
  Python: "#3572A5", "C#": "#178600", "C++": "#f34b7d", Java: "#b07219",
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Shell: "#89e051",
  Dockerfile: "#384d54", Markdown: "#4a7fd6", "Jupyter Notebook": "#DA5B0B",
};

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const MONO_EM = 0.6; // advance width of a monospace glyph, used to size chips
const SANS_EM = { regular: 0.52, bold: 0.57 }; // average advance width of the sans stack
const WORDS_PER_MINUTE = 265; // Medium's own reading-time assumption

const ICON = {
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
};

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n) => n.toLocaleString("en-US");
const px = (n) => n.toFixed(1);

function svg(width, height, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${body}
</svg>
`;
}

function frame(w, h, t, rx = 14) {
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${t.surface}" stroke="${t.border}"/>`;
}

function panel(box, t, rx = 10) {
  return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${rx}" fill="${t.inset}" stroke="${t.border}"/>`;
}

function wrap(text, maxChars, maxLines = Infinity) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1).replace(/[\s,.:;–-]+$/, "")}…`;
  return kept;
}

function truncate(text, maxChars) {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}

function charsFor(width, fontSize, weight = "regular") {
  return Math.floor(width / (fontSize * SANS_EM[weight]));
}

function textBlock(lines, { x, y, size, leading, fill, weight = 400, family = SANS }) {
  return `<g font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">
  ${lines.map((l, i) => `<text x="${x}" y="${y + i * leading}">${esc(l)}</text>`).join("\n  ")}
</g>`;
}

function starCount(t, rightX, y, stars) {
  const label = fmt(stars);
  return `<g font-family="${SANS}" font-size="14" fill="${t.muted}">
  <path transform="translate(${rightX - label.length * 8 - 22} ${y - 12})" d="${ICON.star}" fill="${t.muted}"/>
  <text x="${rightX}" y="${y}" text-anchor="end">${label}</text>
</g>`;
}

function languageTag(t, x, y, language) {
  return `<circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${LANG_COLORS[language] ?? t.muted}"/>
<text x="${x + 18}" y="${y}" font-family="${SANS}" font-size="14" fill="${t.muted}">${esc(language)}</text>`;
}

// Deterministic pseudo-random numbers so every run draws the same picture.
function seededRandom(seed) {
  let state = (Math.abs(seed) % 2147483646) + 1;
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
}

function hashString(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

function gaussian(rand) {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function lerpColor(a, b, k) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

async function api(path, { json = true } = {}) {
  const headers = { "User-Agent": "profile-readme-builder" };
  if (json) headers.Accept = "application/vnd.github+json";
  if (TOKEN && path.startsWith("https://api.github.com")) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(path, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return json ? res.json() : res.text();
}

// ---------------------------------------------------------------- GitHub data

async function loadContributions() {
  // The public calendar matches what visitors see on the profile (it includes
  // private contributions when the owner shows them); GraphQL is the fallback.
  try {
    const html = await api(`https://github.com/users/${PROFILE.login}/contributions`, { json: false });
    const tips = new Map();
    for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
      const n = m[2].match(/^([\d,]+) contribution/);
      tips.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
    }
    const days = [];
    for (const m of html.matchAll(/<td\b[^>]*>/g)) {
      const tag = m[0];
      const date = tag.match(/data-date="([\d-]+)"/)?.[1];
      const level = tag.match(/data-level="(\d)"/)?.[1];
      const id = tag.match(/\bid="([^"]+)"/)?.[1];
      if (date && level !== undefined) days.push({ date, level: Number(level), count: tips.get(id) ?? 0 });
    }
    const total = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
    if (days.length < 300 || !total) throw new Error("unexpected calendar markup");
    days.sort((a, b) => a.date.localeCompare(b.date));
    return { total: Number(total[1].replace(/,/g, "")), days };
  } catch (err) {
    if (!TOKEN) throw err;
    console.warn(`calendar page failed (${err.message}), using GraphQL`);
  }
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-readme-builder" },
    body: JSON.stringify({ query, variables: { login: PROFILE.login } }),
  });
  const body = await res.json();
  const cal = body?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error(`GraphQL: ${JSON.stringify(body.errors ?? body)}`);
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const days = cal.weeks.flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0 }));
  return { total: cal.totalContributions, days };
}

async function loadData() {
  const user = await api(`https://api.github.com/users/${PROFILE.login}`);
  const repos = (await api(`https://api.github.com/users/${PROFILE.login}/repos?per_page=100&type=owner`))
    .filter((r) => !r.fork);

  const bytes = {};
  for (const repo of repos) {
    const langs = await api(repo.languages_url);
    for (const [lang, n] of Object.entries(langs)) {
      if (!PROFILE.ignoredLanguages.includes(lang)) bytes[lang] = (bytes[lang] ?? 0) + n;
    }
  }

  return {
    followers: user.followers,
    publicRepos: user.public_repos,
    stars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
    repos: new Map(repos.map((r) => [r.full_name.toLowerCase(), r])),
    languages: Object.entries(bytes).sort((a, b) => b[1] - a[1]),
    contributions: await loadContributions(),
  };
}

// Featured repos may live in an organisation (team projects), outside the user's own list.
async function findRepo(data, item) {
  const fullName = `${item.owner ?? PROFILE.login}/${item.repo}`;
  const known = data.repos.get(fullName.toLowerCase());
  if (known) return known;
  try {
    return await api(`https://api.github.com/repos/${fullName}`);
  } catch (err) {
    console.warn(`Featured repo not found: ${fullName} (${err.message})`);
    return undefined;
  }
}

// ---------------------------------------------------------------- Medium data

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", lpar: "(", rpar: ")" };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function xmlField(item, tag) {
  const m = item.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1].replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}

function readingMinutes(html) {
  const words = decodeEntities(html.replace(/<[^>]+>/g, " ")).split(/\s+/).filter(Boolean).length;
  const images = (html.match(/<img\b/g) ?? []).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE + images * 12 / 60));
}

function parseFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const title = decodeEntities(xmlField(item, "title"));
    const link = xmlField(item, "link").split("?")[0];
    const guid = xmlField(item, "guid");
    return {
      id: guid.split("/").pop() || String(hashString(link)),
      title,
      url: link,
      date: new Date(xmlField(item, "pubDate")),
      tags: [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)]
        .map(([, c]) => c.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()),
      minutes: readingMinutes(xmlField(item, "content:encoded")),
      language: /[çğıöşüİ]/i.test(title) ? "Türkçe" : "English",
    };
  });
}

async function loadPosts() {
  const res = await fetch(PROFILE.medium.feed, { headers: { "User-Agent": "profile-readme-builder" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${PROFILE.medium.feed}`);
  const posts = parseFeed(await res.text()).slice(0, PROFILE.medium.maxPosts);
  if (!posts.length) throw new Error("the feed has no posts");
  return posts;
}

const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// ---------------------------------------------------------------- header

// Fixed "true" clusters for the k-means scene, in unit coordinates.
const CLUSTERS = [
  { center: [0.24, 0.36], spread: [0.085, 0.1], start: [0.12, 0.86] },
  { center: [0.75, 0.3], spread: [0.09, 0.08], start: [0.52, 0.1] },
  { center: [0.53, 0.75], spread: [0.1, 0.075], start: [0.92, 0.72] },
];
const POINTS_PER_CLUSTER = 34;

// Keeps the part of a convex polygon where a*x + b*y <= c (Sutherland–Hodgman).
function clipPolygon(points, a, b, c) {
  const inside = ([x, y]) => a * x + b * y <= c;
  const out = [];
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) {
      const k = (c - a * p[0] - b * p[1]) / (a * (q[0] - p[0]) + b * (q[1] - p[1]));
      out.push([p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])]);
    }
  });
  return out;
}

function voronoiCell(centers, i) {
  const [xi, yi] = centers[i];
  return centers.reduce((cell, [xj, yj], j) => (j === i ? cell : clipPolygon(cell,
    2 * (xj - xi), 2 * (yj - yi), xj * xj + yj * yj - xi * xi - yi * yi)), [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

function samplePoints() {
  const rand = seededRandom(11);
  const centers = CLUSTERS.map((c) => c.center);
  const points = CLUSTERS.flatMap(({ center, spread }) => Array.from({ length: POINTS_PER_CLUSTER }, () => {
    const x = Math.min(0.97, Math.max(0.03, center[0] + gaussian(rand) * spread[0]));
    const y = Math.min(0.97, Math.max(0.03, center[1] + gaussian(rand) * spread[1]));
    const dist = centers.map(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2);
    return { x, y, cluster: dist.indexOf(Math.min(...dist)), order: rand() };
  }));
  return points.sort((a, b) => a.order - b.order);
}

function renderClusterScene(t, box) {
  const pad = 22;
  const X = (u) => box.x + pad + u * (box.w - 2 * pad);
  const Y = (v) => box.y + pad + v * (box.h - 2 * pad - 18);
  const centers = CLUSTERS.map((c) => c.center);
  const reveal = "2.9s";

  const regions = centers.map((_, i) => {
    const pts = voronoiCell(centers, i).map(([u, v]) => `${px(X(u))},${px(Y(v))}`).join(" ");
    return `<polygon points="${pts}" fill="${t.series[i]}" fill-opacity="0" stroke="${t.series[i]}" stroke-opacity="0" stroke-dasharray="3 5">` +
      `<animate attributeName="fill-opacity" to="0.12" begin="${reveal}" dur="0.9s" fill="freeze"/>` +
      `<animate attributeName="stroke-opacity" to="0.45" begin="${reveal}" dur="0.9s" fill="freeze"/></polygon>`;
  }).join("\n");

  const dots = samplePoints().map((p, i) =>
    `<circle cx="${px(X(p.x))}" cy="${px(Y(p.y))}" r="4" fill="${t.muted}" opacity="0">` +
    `<animate attributeName="opacity" to="0.9" begin="${(0.2 + i * 0.012).toFixed(3)}s" dur="0.35s" fill="freeze"/>` +
    `<animate attributeName="fill" to="${t.series[p.cluster]}" begin="${reveal}" dur="0.6s" fill="freeze"/></circle>`).join("\n");

  const centroids = CLUSTERS.map(({ center, start }, i) => {
    const [cx, cy] = [X(center[0]), Y(center[1])];
    const offset = `${px(X(start[0]) - cx)} ${px(Y(start[1]) - cy)}`;
    return `<g transform="translate(${offset})" opacity="0">
  <animate attributeName="opacity" to="1" begin="1.3s" dur="0.3s" fill="freeze"/>
  <animateTransform attributeName="transform" type="translate" from="${offset}" to="0 0" begin="1.6s" dur="1.3s"
                    fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.2 1"/>
  <circle cx="${px(cx)}" cy="${px(cy)}" r="11" fill="${t.inset}" stroke="${t.series[i]}" stroke-width="3"/>
  <path d="M${px(cx - 4.5)} ${px(cy - 4.5)} L${px(cx + 4.5)} ${px(cy + 4.5)} M${px(cx + 4.5)} ${px(cy - 4.5)} L${px(cx - 4.5)} ${px(cy + 4.5)}"
        stroke="${t.series[i]}" stroke-width="2.5" stroke-linecap="round"/>
</g>`;
  }).join("\n");

  return `${panel(box, t, 14)}
<clipPath id="scene"><rect x="${box.x + 1}" y="${box.y + 1}" width="${box.w - 2}" height="${box.h - 2}" rx="13"/></clipPath>
<g clip-path="url(#scene)">
${regions}
${dots}
${centroids}
</g>
<text x="${box.x + box.w - pad}" y="${box.y + box.h - 16}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">k-means · k = ${CLUSTERS.length} · ${CLUSTERS.length * POINTS_PER_CLUSTER} points</text>`;
}

function renderHeader(t) {
  const W = 1280, H = 400;
  return svg(W, H, `${PROFILE.name}: ${PROFILE.role}. ${PROFILE.tagline.join(" ")}`, `
${frame(W, H, t, 18)}
<circle cx="74" cy="106" r="6" fill="${t.accent}"/>
<text x="92" y="113" font-family="${SANS}" font-size="22" font-weight="600" fill="${t.accent}">${esc(PROFILE.role)}</text>
<text x="66" y="208" font-family="${SANS}" font-size="88" font-weight="800" letter-spacing="-2.5" fill="${t.text}">${esc(PROFILE.name)}</text>
${textBlock(PROFILE.tagline, { x: 70, y: 266, size: 27, leading: 38, fill: t.muted })}
<text x="70" y="352" font-family="${MONO}" font-size="17" fill="${t.muted}">${esc(PROFILE.links)}</text>
${renderClusterScene(t, { x: 748, y: 40, w: 492, h: 320 })}`);
}

// ---------------------------------------------------------------- project motifs

// Odyssey: a learning path of lessons, done ones filled, the current one pulsing.
function motifPath(t, box) {
  const n = 9, current = 6;
  const nodes = Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1);
    return [box.x + 26 + k * (box.w - 52), box.y + box.h - 34 - k * (box.h - 78) + Math.sin(i * 1.7) * 14];
  });
  const line = nodes.map(([x, y], i) => `${i ? "L" : "M"}${px(x)} ${px(y)}`).join(" ");
  const done = nodes.slice(0, current + 1).map(([x, y], i) => `${i ? "L" : "M"}${px(x)} ${px(y)}`).join(" ");
  const dots = nodes.map(([x, y], i) => {
    if (i < current) return `<circle cx="${px(x)}" cy="${px(y)}" r="7" fill="${t.series[0]}"/>`;
    if (i > current) return `<circle cx="${px(x)}" cy="${px(y)}" r="6" fill="${t.inset}" stroke="${t.muted}" stroke-width="2"/>`;
    return `<circle cx="${px(x)}" cy="${px(y)}" r="8" fill="${t.series[1]}"/>
<circle cx="${px(x)}" cy="${px(y)}" r="8" fill="none" stroke="${t.series[1]}" stroke-width="2">
  <animate attributeName="r" values="8;17;8" dur="2.4s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite"/>
</circle>`;
  }).join("\n");
  return `<path d="${line}" fill="none" stroke="${t.faint}" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>
<path d="${done}" fill="none" stroke="${t.series[0]}" stroke-width="3" stroke-linecap="round"/>
${dots}`;
}

// Mindgate: requests flow into a gate that allows, asks about or blocks each one.
function motifGate(t, box) {
  const verdicts = [["allow", t.series[1]], ["ask", t.warn], ["deny", t.danger], ["allow", t.series[1]]];
  const gateX = box.x + box.w * 0.6;
  const startX = box.x + 22, endX = box.x + box.w - 62;
  const rowY = (i) => box.y + 32 + i * ((box.h - 64) / (verdicts.length - 1));
  const rows = verdicts.map(([label, color], i) => {
    const y = px(rowY(i));
    const stops = label === "deny" ? `${startX};${gateX - 8};${gateX - 8}` : `${startX};${gateX};${endX}`;
    return `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${t.faint}" stroke-width="2" stroke-dasharray="2 5"/>
<circle cy="${y}" r="5" fill="${color}">
  <animate attributeName="cx" values="${stops}" keyTimes="0;0.55;1" dur="3.2s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite"/>
</circle>
<text x="${endX + 12}" y="${px(rowY(i) + 5)}" font-family="${MONO}" font-size="14" fill="${color}">${label}</text>`;
  }).join("\n");
  return `${rows}
<rect x="${px(gateX - 4)}" y="${box.y + 16}" width="8" height="${box.h - 32}" rx="4" fill="${t.accent}"/>`;
}

// Data Science Roadmap: 22 modules as a snaking track, colour moving along the path.
function motifModules(t, box) {
  const count = 22, perRow = 11, cell = 15;
  const stepX = (box.w - 40 - cell) / (perRow - 1);
  const rows = [box.y + box.h * 0.34, box.y + box.h * 0.66];
  const pos = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = row % 2 ? perRow - 1 - (i % perRow) : i % perRow;
    return [box.x + 20 + col * stepX, rows[row]];
  });
  const track = pos.map(([x, y], i) => `${i ? "L" : "M"}${px(x + cell / 2)} ${px(y)}`).join(" ");
  const cells = pos.map(([x, y], i) =>
    `<rect x="${px(x)}" y="${px(y - cell / 2)}" width="${cell}" height="${cell}" rx="4" fill="${lerpColor(t.series[0], t.series[1], i / (count - 1))}" opacity="0">` +
    `<animate attributeName="opacity" to="1" begin="${(0.2 + i * 0.06).toFixed(2)}s" dur="0.3s" fill="freeze"/></rect>`).join("\n");
  return `<path d="${track}" fill="none" stroke="${t.faint}" stroke-width="3" stroke-linejoin="round"/>
${cells}
<g font-family="${MONO}" font-size="13" fill="${t.muted}">
  <text x="${pos[0][0]}" y="${px(rows[0] - 18)}">01</text>
  <text x="${px(pos[count - 1][0])}" y="${px(rows[1] + 30)}">22</text>
</g>`;
}

// Deep Learning Path: a small network whose layers light up one after another.
function motifLayers(t, box) {
  const layers = [3, 5, 5, 2];
  const colX = (c) => box.x + 34 + c * ((box.w - 68) / (layers.length - 1));
  const nodeY = (n, i) => box.y + box.h / 2 + (i - (n - 1) / 2) * 26;
  const nodes = layers.map((n, c) => Array.from({ length: n }, (_, i) => [colX(c), nodeY(n, i)]));
  const edges = nodes.slice(1).flatMap((col, c) => col.flatMap(([x2, y2]) => nodes[c].map(([x1, y1]) =>
    `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${t.muted}" stroke-opacity="0.3"/>`))).join("");
  const cycle = 3.2;
  const dots = nodes.flatMap((col, c) => col.map(([x, y]) => {
    const color = t.series[Math.min(c, t.series.length - 1)];
    const start = (c / layers.length).toFixed(2);
    const peak = ((c + 0.6) / layers.length).toFixed(2);
    return `<circle cx="${px(x)}" cy="${px(y)}" r="8" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="2">` +
      `<animate attributeName="fill-opacity" values="0.35;0.35;1;0.35;0.35" keyTimes="0;${start};${peak};${Math.min(0.99, Number(peak) + 0.15).toFixed(2)};1" dur="${cycle}s" repeatCount="indefinite"/></circle>`;
  })).join("\n");
  return `${edges}\n${dots}`;
}

// AI Jobs Market: a salary bar chart that grows in, the top bar highlighted.
function motifBars(t, box) {
  const values = [0.34, 0.46, 0.41, 0.58, 0.66, 0.79, 0.93];
  const base = box.y + box.h - 26, top = box.y + 22;
  const slot = (box.w - 44) / values.length;
  const bars = values.map((v, i) => {
    const h = v * (base - top);
    const x = box.x + 22 + i * slot + slot * 0.18;
    const color = i === values.length - 1 ? t.series[1] : t.series[0];
    const begin = (0.2 + i * 0.12).toFixed(2);
    return `<rect x="${px(x)}" y="${px(base)}" width="${px(slot * 0.64)}" height="0" rx="3" fill="${color}" fill-opacity="${i === values.length - 1 ? 1 : 0.55 + i * 0.06}">` +
      `<animate attributeName="height" to="${px(h)}" begin="${begin}s" dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1"/>` +
      `<animate attributeName="y" to="${px(base - h)}" begin="${begin}s" dur="0.6s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.3 0 0.2 1"/></rect>`;
  }).join("\n");
  return `<line x1="${box.x + 18}" y1="${base}" x2="${box.x + box.w - 18}" y2="${base}" stroke="${t.muted}" stroke-opacity="0.6"/>
${bars}`;
}

// NYC Taxi: a heat grid of pickup zones that fills in from the busiest corner.
function motifZones(t, box) {
  const cols = 11, rows = 7, gap = 4;
  const cw = (box.w - 36 - gap * (cols - 1)) / cols, ch = (box.h - 36 - gap * (rows - 1)) / rows;
  const rand = seededRandom(5);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dist = Math.hypot((c - 3) / 4, (r - 2.5) / 2.6);
      const heat = Math.min(1, Math.max(0.1, 1 - dist / 1.9 + (rand() - 0.5) * 0.25));
      cells.push(`<rect x="${px(box.x + 18 + c * (cw + gap))}" y="${px(box.y + 18 + r * (ch + gap))}" width="${px(cw)}" height="${px(ch)}" rx="2.5" fill="${t.series[0]}" opacity="0">` +
        `<animate attributeName="opacity" to="${heat.toFixed(2)}" begin="${(0.2 + dist * 0.6).toFixed(2)}s" dur="0.4s" fill="freeze"/></rect>`);
    }
  }
  return cells.join("\n");
}

// CS Terminology Guide: an A–Z index where a highlight steps through the letters.
function motifGlossary(t, box) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const perRow = 9, rows = Math.ceil(letters.length / perRow);
  const stepX = (box.w - 40) / perRow, stepY = (box.h - 40) / rows;
  const cycle = 7.8;
  return letters.map((ch, i) => {
    const x = box.x + 20 + (i % perRow) * stepX + stepX / 2;
    const y = box.y + 20 + Math.floor(i / perRow) * stepY + stepY / 2;
    const k = i / letters.length;
    const on = (k + 0.5 / letters.length).toFixed(3);
    const off = Math.min(0.999, k + 1.5 / letters.length).toFixed(3);
    return `<rect x="${px(x - 13)}" y="${px(y - 15)}" width="26" height="28" rx="6" fill="${t.series[0]}" fill-opacity="0">` +
      `<animate attributeName="fill-opacity" values="0;0;0.28;0;0" keyTimes="0;${k.toFixed(3)};${on};${off};1" dur="${cycle}s" repeatCount="indefinite"/></rect>` +
      `<text x="${px(x)}" y="${px(y + 6)}" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" fill="${i % 7 === 0 ? t.series[1] : t.muted}">${ch}</text>`;
  }).join("\n");
}

const MOTIFS = {
  path: motifPath, gate: motifGate, modules: motifModules,
  layers: motifLayers, bars: motifBars, zones: motifZones, glossary: motifGlossary,
};

// ---------------------------------------------------------------- cards

// One card layout for the whole profile: visual panel on the left, text on the right.
const CARD = { W: 1000, H: 196, textX: 300, visual: { x: 16, y: 16, w: 256, h: 164 } };

function cardShell(t, title, visual) {
  return `${frame(CARD.W, CARD.H, t)}
${panel(CARD.visual, t)}
${visual}
<text x="${CARD.textX}" y="56" font-family="${SANS}" font-size="28" font-weight="700" letter-spacing="-0.4" fill="${t.text}">${esc(title)}</text>`;
}

function renderProject(t, item, repo) {
  const { W, H, textX } = CARD;
  const language = item.language ?? repo?.language ?? "Markdown";
  const blurb = wrap(item.blurb, charsFor(W - textX - 40, 17), 2);
  const fullName = repo?.full_name ?? `${item.owner ?? PROFILE.login}/${item.repo}`;
  return svg(W, H, `${item.title}: ${item.blurb}`, `
${cardShell(t, item.title, MOTIFS[item.motif](t, CARD.visual))}
${starCount(t, W - 28, 50, repo?.stargazers_count ?? 0)}
${textBlock(blurb, { x: textX, y: 90, size: 17, leading: 25, fill: t.muted })}
<text x="${textX}" y="146" font-family="${SANS}" font-size="16" font-weight="600" fill="${t.accent}">${esc(item.facts.join("   ·   "))}</text>
${languageTag(t, textX, H - 22, language)}
<text x="${W - 28}" y="${H - 22}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${t.muted}">${esc(truncate(fullName, 60))}</text>`);
}

// ---------------------------------------------------------------- post covers

// Each post gets a small chart: the chart type rotates with its position so
// neighbours differ, and the data is seeded by the post id.
function coverHeatmap(t, box, rand) {
  const cols = 14, rows = 6, gap = 4;
  const cw = (box.w - 28 - gap * (cols - 1)) / cols, ch = (box.h - 28 - gap * (rows - 1)) / rows;
  const peak = [rand() * cols, rand() * rows];
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.max(0.08, 1 - Math.hypot((c - peak[0]) / 5, (r - peak[1]) / 2.4) / 1.6 + (rand() - 0.5) * 0.3);
      cells.push(`<rect x="${px(box.x + 14 + c * (cw + gap))}" y="${px(box.y + 14 + r * (ch + gap))}" width="${px(cw)}" height="${px(ch)}" rx="2.5" fill="${t.series[0]}" opacity="${Math.min(1, v).toFixed(2)}"/>`);
    }
  }
  return cells.join("");
}

function coverScatter(t, box, rand) {
  const slope = 0.35 + rand() * 0.4;
  const pts = Array.from({ length: 46 }, () => {
    const u = 0.05 + rand() * 0.9;
    const v = Math.min(0.95, Math.max(0.05, 0.85 - slope * u + gaussian(rand) * 0.08));
    return [box.x + 16 + u * (box.w - 32), box.y + 14 + (1 - v) * (box.h - 28)];
  });
  const fit = [[0.03, 0.85 - slope * 0.03], [0.97, 0.85 - slope * 0.97]]
    .map(([u, v]) => [box.x + 16 + u * (box.w - 32), box.y + 14 + (1 - v) * (box.h - 28)]);
  return pts.map(([x, y], i) => `<circle cx="${px(x)}" cy="${px(y)}" r="3.6" fill="${t.series[i % 3 ? 0 : 2]}" opacity="0.8"/>`).join("") +
    `<line x1="${px(fit[0][0])}" y1="${px(fit[0][1])}" x2="${px(fit[1][0])}" y2="${px(fit[1][1])}" stroke="${t.series[1]}" stroke-width="3" stroke-linecap="round"/>`;
}

function coverLines(t, box, rand) {
  const steps = 28;
  return t.series.map((color, s) => {
    let v = 0.3 + rand() * 0.4;
    const d = Array.from({ length: steps }, (_, i) => {
      v = Math.min(0.92, Math.max(0.08, v + (rand() - 0.47) * 0.16));
      return `${i ? "L" : "M"}${px(box.x + 14 + (i / (steps - 1)) * (box.w - 28))} ${px(box.y + 12 + (1 - v) * (box.h - 24))}`;
    }).join(" ");
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${s ? 2 : 3}" stroke-opacity="${s ? 0.65 : 1}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join("");
}

const COVERS = [coverHeatmap, coverScatter, coverLines];

function renderCover(t, post, slot, box) {
  const seed = hashString(post.id);
  const draw = COVERS[slot % COVERS.length];
  return `${panel(box, t)}
<clipPath id="cover"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="10"/></clipPath>
<g clip-path="url(#cover)">${draw(t, box, seededRandom(seed))}</g>`;
}

function postMeta(post) {
  return [formatDate(post.date), `${post.minutes} min read`, post.language].join("   ·   ");
}

function postTags(post, maxChars) {
  let line = "";
  for (const tag of post.tags.map((x) => `#${x}`)) {
    if ((line ? `${line}   ${tag}` : tag).length > maxChars) break;
    line = line ? `${line}   ${tag}` : tag;
  }
  return line;
}

function renderPost(t, post, slot) {
  const { W, H, textX } = CARD;
  const title = wrap(post.title, charsFor(W - textX - 40, 24, "bold"), 2);
  const latest = slot === 0 ? `<tspan fill="${t.accent}" font-weight="700">Latest</tspan>   ·   ` : "";
  return svg(W, H, `${post.title} (${formatDate(post.date)})`, `
${frame(W, H, t)}
${renderCover(t, post, slot, CARD.visual)}
<text x="${textX}" y="48" font-family="${SANS}" font-size="15" fill="${t.muted}">${latest}${esc(postMeta(post))}</text>
${textBlock(title, { x: textX, y: 88, size: 24, leading: 32, fill: t.text, weight: 700 })}
<text x="${textX}" y="${H - 22}" font-family="${MONO}" font-size="13" fill="${t.muted}">${esc(postTags(post, 56))}</text>
<text x="${W - 28}" y="${H - 22}" text-anchor="end" font-family="${SANS}" font-size="15" font-weight="600" fill="${t.accent}">Read on Medium →</text>`);
}

// ---------------------------------------------------------------- toolkit + activity

function renderStack(t) {
  const W = 880, rowH = 48, top = 28;
  const H = top * 2 + PROFILE.stack.length * rowH - 12;
  const rows = PROFILE.stack.map(([label, items], r) => {
    const y = top + r * rowH;
    let x = 200;
    const chips = items.map((name) => {
      const w = name.length * 13 * MONO_EM + 26;
      const chip = `<rect x="${px(x)}" y="${y}" width="${px(w)}" height="32" rx="7" fill="${t.chip}" stroke="${t.border}"/>` +
        `<text x="${px(x + w / 2)}" y="${y + 21}" text-anchor="middle">${esc(name)}</text>`;
      x += w + 8;
      return chip;
    });
    const rule = r ? `<line x1="28" y1="${y - 8}" x2="${W - 28}" y2="${y - 8}" stroke="${t.border}" stroke-dasharray="2 4"/>` : "";
    return `${rule}
<circle cx="34" cy="${y + 16}" r="4" fill="${t.series[r % t.series.length]}"/>
<text x="48" y="${y + 21}" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.text}">${esc(label)}</text>
<g font-family="${MONO}" font-size="13" fill="${t.text}">${chips.join("")}</g>`;
  });
  return svg(W, H, `Toolkit: ${PROFILE.stack.map(([l, i]) => `${l}: ${i.join(", ")}`).join("; ")}`,
    `${frame(W, H, t, 12)}\n${rows.join("\n")}`);
}

function renderActivity(t, data) {
  const W = 880, P = 28;
  const { total, days } = data.contributions;
  const kpis = [
    ["CONTRIBUTIONS · 1Y", total],
    ["STARS EARNED", data.stars],
    ["PUBLIC REPOS", data.publicRepos],
    ["FOLLOWERS", data.followers],
  ];
  const colW = (W - 2 * P) / kpis.length;
  const kpiSvg = kpis.map(([label, value], i) => {
    const x = P + i * colW + (i ? 24 : 0);
    const sep = i ? `<line x1="${P + i * colW}" y1="34" x2="${P + i * colW}" y2="92" stroke="${t.border}"/>` : "";
    return `${sep}
<text x="${x}" y="48" font-family="${MONO}" font-size="11" letter-spacing="1.2" fill="${t.muted}">${label}</text>
<text x="${x}" y="86" font-family="${SANS}" font-size="30" font-weight="600" fill="${t.text}">${fmt(value)}</text>`;
  }).join("\n");

  // Contribution calendar: columns are weeks starting on Sunday, like GitHub's own graph.
  const cell = 12, gap = 3, step = cell + gap;
  const gridX = P + 30, gridY = 190;
  const first = new Date(`${days[0].date}T00:00:00Z`);
  const origin = first.getTime() - first.getUTCDay() * 864e5;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const cells = [];
  const monthAt = new Map();
  for (const d of days) {
    const date = new Date(`${d.date}T00:00:00Z`);
    const col = Math.floor((date.getTime() - origin) / (7 * 864e5));
    const row = date.getUTCDay();
    if (date.getUTCDate() <= 7 && row === 0 || (col === 0 && !monthAt.size)) monthAt.set(col, MONTHS[date.getUTCMonth()]);
    const label = `${d.count || "No"} contribution${d.count === 1 ? "" : "s"} on ${d.date}`;
    cells.push(`<rect x="${gridX + col * step}" y="${gridY + row * step}" width="${cell}" height="${cell}" rx="2.5" fill="${t.heat[d.level] ?? t.heat[0]}"><title>${label}</title></rect>`);
  }
  let lastCol = -9;
  const months = [...monthAt].filter(([col]) => {
    const keep = col - lastCol >= 3;
    if (keep) lastCol = col;
    return keep;
  }).map(([col, name]) => `<text x="${gridX + col * step}" y="${gridY - 9}">${name}</text>`).join("");
  const weekdays = [[1, "Mon"], [3, "Wed"], [5, "Fri"]]
    .map(([r, n]) => `<text x="${P}" y="${gridY + r * step + 10}">${n}</text>`).join("");

  const legendX = W - P - 5 * step - 36;
  const legend = t.heat.map((c, i) =>
    `<rect x="${legendX + i * step}" y="${130}" width="${cell}" height="${cell}" rx="2.5" fill="${c}"/>`).join("");

  // Language mix.
  const langTop = gridY + 7 * step + 40;
  const totalBytes = data.languages.reduce((s, [, n]) => s + n, 0) || 1;
  const top = data.languages.slice(0, 5);
  const rest = data.languages.slice(5).reduce((s, [, n]) => s + n, 0);
  if (rest > 0) top.push(["Other", rest]);
  const barW = W - 2 * P;
  let bx = P;
  const segments = top.map(([lang, n], i) => {
    const w = Math.max((n / totalBytes) * barW, 2);
    const seg = `<rect x="${bx.toFixed(1)}" y="${langTop + 16}" width="${(i === top.length - 1 ? P + barW - bx : w).toFixed(1)}" height="8" fill="${LANG_COLORS[lang] ?? t.faint}"/>`;
    bx += w;
    return seg;
  }).join("");
  let lx = P;
  const legendLangs = top.map(([lang, n]) => {
    const text = `${lang} ${((n / totalBytes) * 100).toFixed(1)}%`;
    const item = `<circle cx="${lx + 5}" cy="${langTop + 47}" r="5" fill="${LANG_COLORS[lang] ?? t.faint}"/>` +
      `<text x="${lx + 16}" y="${langTop + 51}">${esc(text)}</text>`;
    lx += 16 + text.length * 7 + 22;
    return item;
  }).join("");
  const H = langTop + 78;

  return svg(W, H, `GitHub activity: ${fmt(total)} contributions in the last year, ${fmt(data.stars)} stars, ${data.publicRepos} public repositories, ${data.followers} followers. Top languages: ${top.map(([l, n]) => `${l} ${((n / totalBytes) * 100).toFixed(0)}%`).join(", ")}.`, `
${frame(W, H, t, 12)}
${kpiSvg}
<line x1="${P}" y1="114" x2="${W - P}" y2="114" stroke="${t.border}"/>
<text x="${P}" y="142" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.text}">Contribution activity</text>
<g font-family="${SANS}" font-size="11" fill="${t.muted}">
  <text x="${legendX - 8}" y="140" text-anchor="end">Less</text>
  ${legend}
  <text x="${legendX + 5 * step + 5}" y="140">More</text>
</g>
<g font-family="${MONO}" font-size="10" fill="${t.muted}">${months}${weekdays}</g>
<g>${cells.join("")}</g>
<line x1="${P}" y1="${langTop - 18}" x2="${W - P}" y2="${langTop - 18}" stroke="${t.border}"/>
<text x="${P}" y="${langTop + 2}" font-family="${SANS}" font-size="14" font-weight="600" fill="${t.text}">Languages</text>
<text x="${W - P}" y="${langTop + 2}" text-anchor="end" font-family="${SANS}" font-size="11" fill="${t.muted}">by code size, notebooks excluded</text>
<clipPath id="bar"><rect x="${P}" y="${langTop + 16}" width="${barW}" height="8" rx="4"/></clipPath>
<g clip-path="url(#bar)">${segments}</g>
<g font-family="${SANS}" font-size="12" fill="${t.muted}">${legendLangs}</g>`);
}

// ---------------------------------------------------------------- README blocks

function pictureLink(href, name, alt) {
  const src = (mode) => `${PROFILE.assetBase}/${name}-${mode}.svg`;
  return `<a href="${href}"><picture><source media="(prefers-color-scheme: dark)" srcset="${src("dark")}">` +
    `<img alt="${esc(alt)}" src="${src("light")}" width="100%"></picture></a>`;
}

function pictureBlock(links) {
  return ["<p>", ...links.map((link) => `  ${link}`), "</p>"].join("\n");
}

function replaceBlock(readme, name, body) {
  const startTag = `<!-- ${name}:START -->`;
  const endTag = `<!-- ${name}:END -->`;
  const start = readme.indexOf(startTag);
  const end = readme.indexOf(endTag);
  if (start < 0 || end < start) throw new Error(`README.md needs the ${startTag} and ${endTag} markers`);
  return `${readme.slice(0, start + startTag.length)}\n${body}\n${readme.slice(end)}`;
}

// GitHub caches README images by URL, so every image URL carries a hash of the
// file's content: when a picture changes, its URL changes and the cache is skipped.
async function stampImageVersions(readme) {
  const pattern = new RegExp(`(${PROFILE.assetBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([\\w.-]+\\.svg))(\\?v=[0-9a-f]+)?`, "g");
  const versions = new Map();
  for (const [, , file] of readme.matchAll(pattern)) {
    if (versions.has(file)) continue;
    const content = await readFile(join(OUT, file)).catch(() => null);
    versions.set(file, content ? createHash("sha1").update(content).digest("hex").slice(0, 10) : null);
  }
  return readme.replace(pattern, (match, url, file) => (versions.get(file) ? `${url}?v=${versions.get(file)}` : match));
}

async function updateReadme(edit) {
  const readme = await readFile(README, "utf8");
  const next = await stampImageVersions(edit(readme));
  if (next !== readme) await writeFile(README, next);
}

const projectsBlock = () => pictureBlock(PROFILE.projects.map((item) =>
  pictureLink(`https://github.com/${item.owner ?? PROFILE.login}/${item.repo}`, `card-${item.repo.toLowerCase()}`, `${item.title}: ${item.blurb}`)));

const writingBlock = (posts) => pictureBlock(posts.map((post, i) =>
  pictureLink(post.url, `post-${i + 1}`, `${post.title} (${formatDate(post.date)})`)));

async function refreshWriting() {
  let posts;
  try {
    posts = await loadPosts();
  } catch (err) {
    // A Medium outage should not block the GitHub cards; yesterday's posts stay up.
    console.warn(`Medium feed unavailable, keeping existing posts: ${err.message}`);
    return null;
  }
  for (const [i, post] of posts.entries()) {
    await emit(`post-${i + 1}`, (t) => renderPost(t, post, i));
  }
  console.log(`Writing: ${posts.length} posts, latest "${posts[0].title}".`);
  return posts;
}

// ---------------------------------------------------------------- main

async function emit(name, render) {
  for (const [mode, theme] of Object.entries(THEMES)) {
    await writeFile(join(OUT, `${name}-${mode}.svg`), render(theme));
  }
}

await mkdir(OUT, { recursive: true });
await emit("header", renderHeader);
await emit("stack", renderStack);
const posts = await refreshWriting();

let data;
try {
  data = await loadData();
} catch (err) {
  // Keep the previously committed cards rather than publishing broken ones.
  console.error(`Live data unavailable, keeping existing cards: ${err.message}`);
  await updateReadme((readme) => (posts ? replaceBlock(readme, "MEDIUM", writingBlock(posts)) : readme));
  process.exit(process.env.CI ? 1 : 0);
}

for (const item of PROFILE.projects) {
  const repo = await findRepo(data, item);
  await emit(`card-${item.repo.toLowerCase()}`, (t) => renderProject(t, item, repo));
}
await emit("activity", (t) => renderActivity(t, data));
await updateReadme((readme) => {
  const withProjects = replaceBlock(readme, "PROJECTS", projectsBlock());
  return posts ? replaceBlock(withProjects, "MEDIUM", writingBlock(posts)) : withProjects;
});

console.log(`Done: ${fmt(data.contributions.total)} contributions, ${data.stars} stars, ${data.repos.size} repos.`);
