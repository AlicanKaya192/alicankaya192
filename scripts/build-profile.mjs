// Builds every image used by the profile README (light + dark variants).
// Live data comes from the GitHub API; static content lives in PROFILE below.
// Run: node scripts/build-profile.mjs   (GITHUB_TOKEN is optional but avoids rate limits)

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const TOKEN = process.env.GITHUB_TOKEN || "";

const PROFILE = {
  login: "AlicanKaya192",
  name: "Alican Kaya",
  eyebrow: "DATA SCIENCE  ·  MACHINE LEARNING  ·  SOFTWARE",
  tagline: [
    "Computer Science student turning messy data into",
    "clear answers, and what I learn into open tools.",
  ],
  footer: "Türkiye  ·  alican-kaya.com  ·  medium.com/@alicankaya268",
  featured: [
    {
      repo: "Odyssey",
      title: "Odyssey",
      blurb: "Offline desktop app for learning data science and machine learning by writing code: lessons, quizzes and auto-checked exercises.",
      tags: ["PySide6", "offline-first"],
    },
    {
      repo: "Data-Science-RoadMap",
      title: "Data Science Roadmap",
      blurb: "22-module, end-to-end path from Python fundamentals to reinforcement learning, with executed notebooks and review questions.",
      tags: ["ML", "statistics"],
    },
    {
      repo: "Deep_Learning_Path",
      title: "Deep Learning Path",
      blurb: "11 modules from scratch to advanced, with side-by-side NumPy, TensorFlow and PyTorch implementations.",
      tags: ["PyTorch", "TensorFlow"],
    },
    {
      repo: "AI-Jobs-Market-2025-2026-Salaries",
      title: "AI Jobs Market 2025–26",
      blurb: "Analysis of global AI and LLM job postings: salary trends, remote-work premiums and the skills that pay the most.",
      tags: ["EDA", "pandas"],
    },
    {
      repo: "The-Tech-Cortex",
      title: "The Tech Cortex",
      blurb: "Obsidian knowledge vault with 220+ notes on ML, MLOps, SQL and NoSQL databases, FastAPI, Docker and cloud.",
      tags: ["MLOps", "notes"],
      language: "Markdown",
    },
    {
      repo: "CS_Complete_Terminology_Guide",
      title: "CS Terminology Guide",
      blurb: "350+ essential computer science terms across 26 chapters, ordered by learning sequence, in Turkish and English.",
      tags: ["CS", "study-guide"],
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
    surface: "#151b23", border: "#2b323b", text: "#e6edf3", muted: "#9198a1",
    faint: "#3d444d", accent: "#2dd4bf", chip: "#0d1117",
    heat: ["#1e252e", "#0e4440", "#116b62", "#15a191", "#2dd4bf"],
  },
  light: {
    surface: "#f6f8fa", border: "#d1d9e0", text: "#1f2328", muted: "#59636e",
    faint: "#c8d1da", accent: "#0f766e", chip: "#ffffff",
    heat: ["#e8ecf0", "#b3e8e0", "#5ccfbf", "#14a08f", "#0f766e"],
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

const ICON = {
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
};

// ---------------------------------------------------------------- helpers

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n) => n.toLocaleString("en-US");

function svg(width, height, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${body}
</svg>
`;
}

function frame(w, h, t, rx = 12) {
  return `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${t.surface}" stroke="${t.border}"/>`;
}

function wrap(text, maxChars) {
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
  return lines;
}

async function api(path, { json = true } = {}) {
  const headers = { "User-Agent": "profile-readme-builder" };
  if (json) headers.Accept = "application/vnd.github+json";
  if (TOKEN && path.startsWith("https://api.github.com")) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(path, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return json ? res.json() : res.text();
}

// ---------------------------------------------------------------- data

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
    repos: new Map(repos.map((r) => [r.name.toLowerCase(), r])),
    languages: Object.entries(bytes).sort((a, b) => b[1] - a[1]),
    contributions: await loadContributions(),
  };
}

// ---------------------------------------------------------------- renderers

function renderHeader(t) {
  const W = 1280, H = 340;

  // Deterministic "noisy observations" around a smooth trend for the chart motif.
  const cx = 800, cy = 64, cw = 412, ch = 212;
  const f = (x) => 0.18 + 0.62 / (1 + Math.exp(-9 * (x - 0.48))) + 0.05 * Math.sin(x * 7);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const points = Array.from({ length: 34 }, (_, i) => {
    const x = 0.03 + (i / 33) * 0.94 + (rand() - 0.5) * 0.02;
    const y = f(x) + (rand() - 0.5) * 0.2;
    return [cx + x * cw, cy + ch - y * ch];
  });
  const curve = Array.from({ length: 61 }, (_, i) => {
    const x = i / 60;
    return `${i ? "L" : "M"}${(cx + x * cw).toFixed(1)} ${(cy + ch - f(x) * ch).toFixed(1)}`;
  }).join(" ");

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const y = cy + (ch * i) / 4;
    grid.push(`<line x1="${cx}" y1="${y}" x2="${cx + cw}" y2="${y}" stroke="${t.faint}" stroke-width="1" stroke-dasharray="2 4"/>`);
  }

  const dots = points.map(([x, y], i) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${t.muted}" opacity="0">` +
    `<animate attributeName="opacity" to="0.55" begin="${(0.2 + i * 0.03).toFixed(2)}s" dur="0.4s" fill="freeze"/></circle>`).join("\n");

  return svg(W, H, `${PROFILE.name}: ${PROFILE.eyebrow.replace(/\s+·\s+/g, ", ").toLowerCase()}`, `
${frame(W, H, t, 16)}
<g font-family="${MONO}" font-size="15" letter-spacing="2" fill="${t.accent}">
  <text x="64" y="98">${esc(PROFILE.eyebrow)}</text>
</g>
<text x="61" y="170" font-family="${SANS}" font-size="68" font-weight="700" letter-spacing="-1.5" fill="${t.text}">${esc(PROFILE.name)}</text>
<g font-family="${SANS}" font-size="23" fill="${t.muted}">
  ${PROFILE.tagline.map((l, i) => `<text x="64" y="${222 + i * 33}">${esc(l)}</text>`).join("\n  ")}
</g>
<text x="64" y="300" font-family="${MONO}" font-size="14" fill="${t.muted}" opacity="0.85">${esc(PROFILE.footer)}</text>

<g>
  ${grid.join("\n  ")}
  <line x1="${cx}" y1="${cy + ch}" x2="${cx + cw}" y2="${cy + ch}" stroke="${t.muted}" stroke-opacity="0.5"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + ch}" stroke="${t.muted}" stroke-opacity="0.5"/>
  ${dots}
  <path d="${curve}" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
        pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">
    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="1.1s" dur="1.8s" fill="freeze"
             calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"/>
  </path>
  <g font-family="${MONO}" font-size="12" fill="${t.muted}">
    <text x="${cx}" y="${cy - 14}">model.fit(X, y)</text>
    <text x="${cx + cw}" y="${cy + ch + 24}" text-anchor="end">raw data → insight</text>
  </g>
</g>`);
}

function renderCard(t, item, repo) {
  const W = 420, H = 172;
  const language = item.language ?? repo?.language ?? "Markdown";
  const stars = repo?.stargazers_count ?? 0;
  const lines = wrap(item.blurb, 54).slice(0, 3);

  const langWidth = language.length * 6.9;
  let x = 38 + langWidth + 14;
  const chips = [];
  for (const tag of item.tags) {
    const w = tag.length * 11 * MONO_EM + 16;
    if (x + w > W - 20) break;
    chips.push(`<rect x="${x}" y="137" width="${w}" height="20" rx="10" fill="${t.chip}" stroke="${t.border}"/>` +
      `<text x="${x + w / 2}" y="151" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.muted}">${esc(tag)}</text>`);
    x += w + 6;
  }

  return svg(W, H, `${item.title}: ${item.blurb}`, `
${frame(W, H, t)}
<path transform="translate(20 21)" d="${ICON.repo}" fill="${t.muted}"/>
<text x="44" y="34" font-family="${SANS}" font-size="16" font-weight="600" fill="${t.text}">${esc(item.title)}</text>
<g font-family="${SANS}" font-size="12" fill="${t.muted}">
  <path transform="translate(${W - 20 - String(stars).length * 7 - 22} 22) scale(0.875)" d="${ICON.star}" fill="${t.muted}"/>
  <text x="${W - 20}" y="34" text-anchor="end">${fmt(stars)}</text>
</g>
<g font-family="${SANS}" font-size="13" fill="${t.muted}">
  ${lines.map((l, i) => `<text x="20" y="${66 + i * 20}">${esc(l)}</text>`).join("\n  ")}
</g>
<circle cx="26" cy="147" r="6" fill="${LANG_COLORS[language] ?? t.muted}"/>
<text x="38" y="151" font-family="${SANS}" font-size="12" fill="${t.muted}">${esc(language)}</text>
${chips.join("\n")}`);
}

function renderStack(t) {
  const W = 880, rowH = 46, top = 26;
  const H = top * 2 + PROFILE.stack.length * rowH - 10;
  const rows = PROFILE.stack.map(([label, items], r) => {
    const y = top + r * rowH;
    let x = 196;
    const chips = items.map((name) => {
      const w = name.length * 13 * MONO_EM + 24;
      const chip = `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="30" rx="7" fill="${t.chip}" stroke="${t.border}"/>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="${y + 20}" text-anchor="middle">${esc(name)}</text>`;
      x += w + 8;
      return chip;
    });
    const rule = r ? `<line x1="28" y1="${y - 8}" x2="${W - 28}" y2="${y - 8}" stroke="${t.border}" stroke-dasharray="2 4"/>` : "";
    return `${rule}
<text x="28" y="${y + 20}" font-family="${MONO}" font-size="11" letter-spacing="1.2" fill="${t.muted}">${esc(label.toUpperCase())}</text>
<g font-family="${MONO}" font-size="13" fill="${t.text}">${chips.join("")}</g>`;
  });
  return svg(W, H, `Toolkit: ${PROFILE.stack.map(([l, i]) => `${l}: ${i.join(", ")}`).join("; ")}`,
    `${frame(W, H, t)}\n${rows.join("\n")}`);
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
${frame(W, H, t)}
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

// ---------------------------------------------------------------- main

async function emit(name, render) {
  for (const [mode, theme] of Object.entries(THEMES)) {
    await writeFile(join(OUT, `${name}-${mode}.svg`), render(theme));
  }
}

await mkdir(OUT, { recursive: true });
await emit("header", renderHeader);
await emit("stack", renderStack);

let data;
try {
  data = await loadData();
} catch (err) {
  // Keep the previously committed images rather than publishing broken ones.
  console.error(`Live data unavailable, keeping existing cards: ${err.message}`);
  process.exit(process.env.CI ? 1 : 0);
}

for (const item of PROFILE.featured) {
  const repo = data.repos.get(item.repo.toLowerCase());
  if (!repo) console.warn(`Featured repo not found: ${item.repo}`);
  await emit(`card-${item.repo.toLowerCase()}`, (t) => renderCard(t, item, repo));
}
await emit("activity", (t) => renderActivity(t, data));

console.log(`Done: ${fmt(data.contributions.total)} contributions, ${data.stars} stars, ${data.repos.size} repos.`);
