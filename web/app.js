const $ = (s) => document.querySelector(s);
const COLORS = {
  forward: [0.19, 0.76, 0.72, 0.35],
  reverse: [0.67, 0.49, 0.94, 0.35],
  selected: [1, 0.72, 0.35, 0.87],
  chromosome: [
    [0.2, 0.78, 0.73, 0.5],
    [0.66, 0.49, 0.94, 0.5],
    [0.93, 0.62, 0.32, 0.5],
  ],
};
let db,
  strand = "all",
  selected = null,
  zoom = 1,
  center = 0.5,
  currentView = "ribbon",
  hovered = null,
  gl,
  program,
  buffer,
  vertexCount = 0,
  totalAlignments = 0;
let chromosomes = [
  { name: "Chr 1", start: 0, end: 42000000 },
  { name: "Chr 2", start: 0, end: 47000000 },
  { name: "Chr 3", start: 0, end: 31000000 },
];
let targets = [
  { name: "Scf 1", start: 0, end: 36000000 },
  { name: "Scf 2", start: 0, end: 42000000 },
  { name: "Scf 3", start: 0, end: 27000000 },
];
const esc = (v) =>
  String(v).replace(
    /[&<>\"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const fmt = (n) =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)} Gb`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)} Mb`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)} kb`
        : `${n} bp`;
function genomicX(pos, genome = "a", chromosomeName = "") {
  const rows = genome === "a" ? chromosomes : targets,
    denom = rows.reduce((sum, c) => sum + c.end - c.start, 0),
    index = rows.findIndex((c) => c.name === chromosomeName),
    offset = rows
      .slice(0, Math.max(0, index))
      .reduce((sum, c) => sum + c.end - c.start, 0),
    width = $("#ribbonCanvas")?.getBoundingClientRect().width || 800,
    available = width - 126;
  let v = (offset + pos) / denom,
    span = 1 / zoom;
  v = (v - (center - span / 2)) / span;
  return Math.max(0, Math.min(width, 116 + v * available));
}
function visible(a) {
  return (
    (strand === "all" || a.orientation === strand) &&
    a.identity * 100 >= Number($("#identityFilter").value)
  );
}
function renderChroms(container, rows, genome) {
  container.innerHTML = "";
  rows.forEach((c, i) => {
    let el = document.createElement("button");
    el.className = "chromosome";
    el.style.flex = `${c.end - c.start} 1 0%`;
    el.innerHTML = `<span class="chrom-name">${esc(c.name)}</span><span class="chrom-bar"><i style="width:100%"></i>${
      genome === "a"
        ? db.genomes[0].genes
            .filter((g) => g.chromosome === c.name)
            .map(
              (g) =>
                `<b title="${g.name}" style="left:${((g.start - c.start) / (c.end - c.start)) * 100}%"></b>`,
            )
            .join("")
        : ""
    }</span><span class="chrom-size">${fmt(c.end - c.start)}</span>`;
    el.title = `${esc(c.name)} · ${fmt(c.end - c.start)}. Click to select a region.`;
    el.addEventListener("click", (e) => {
      let r = el.querySelector(".chrom-bar").getBoundingClientRect();
      let p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      let start = Math.floor(c.start + p * (c.end - c.start));
      selectRegion(
        genome,
        c,
        start,
        Math.min(c.end, start + Math.max(100000, (c.end - c.start) * 0.035)),
      );
    });
    container.appendChild(el);
  });
}
function shader(type, source) {
  let s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(s));
  return s;
}
function initGL() {
  let canvas = $("#ribbonCanvas");
  gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return false;
  program = gl.createProgram();
  gl.attachShader(
    program,
    shader(
      gl.VERTEX_SHADER,
      `#version 300 es\nin vec2 p; in vec4 c; out vec4 col; uniform vec2 size; void main(){vec2 q=p/size*2.0-1.0;gl_Position=vec4(q.x,-q.y,0,1);col=c;}`,
    ),
  );
  gl.attachShader(
    program,
    shader(
      gl.FRAGMENT_SHADER,
      `#version 300 es\nprecision highp float; in vec4 col; out vec4 outColor; void main(){outColor=col;}`,
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program));
  buffer = gl.createBuffer();
  return true;
}
function ribbonGeometry(a, width = 2.0) {
  let x0 = genomicX(a.source_start, "a", a.source_chromosome),
    x1 = genomicX(a.source_end, "a", a.source_chromosome),
    x2 = genomicX(a.target_start, "b", a.target_chromosome),
    x3 = genomicX(a.target_end, "b", a.target_chromosome);
  if (a.orientation === "-") [x2, x3] = [x3, x2];
  const top = 38,
    bottom = 275,
    n = 24,
    points = [];
  let related = selected?.region
    ? selected.region.genome === "a"
      ? a.source_chromosome === selected.region.chromosome &&
        a.source_start < selected.region.end &&
        a.source_end > selected.region.start
      : a.target_chromosome === selected.region.chromosome &&
        a.target_start < selected.region.end &&
        a.target_end > selected.region.start
    : false;
  let color =
    selected && (selected.alignment === a.id || related)
      ? COLORS.selected
      : $("#colorMode").value === "chromosome"
        ? COLORS.chromosome[
            chromosomes.findIndex((c) => c.name === a.source_chromosome)
          ] || COLORS.forward
        : $("#colorMode").value === "identity"
          ? [1 - a.identity, a.identity, 0.25, 0.62]
          : a.orientation === "+"
            ? COLORS.forward
            : COLORS.reverse;
  if (selected && !related && selected.alignment !== a.id)
    color = [...color.slice(0, 3), color[3] * 0.12];
  const curve = (p0, p1, p2, p3, t) =>
    Math.pow(1 - t, 3) * p0 +
    3 * Math.pow(1 - t, 2) * t * p1 +
    3 * (1 - t) * t * t * p2 +
    t * t * t * p3;
  const add = (x, y, c) => points.push(x, y, ...c);
  for (let i = 0; i < n; i++) {
    let t = i / (n - 1),
      u = (i + 1) / (n - 1);
    let ax = curve(x0, x0, x2, x2, t),
      bx = curve(x1, x1, x3, x3, t),
      ay = curve(top, top + 72, bottom - 72, bottom, t);
    let au = curve(x0, x0, x2, x2, u),
      bu = curve(x1, x1, x3, x3, u),
      by = curve(top, top + 72, bottom - 72, bottom, u);
    add(ax, ay, color);
    add(bx, ay, color);
    add(au, by, color);
    add(au, by, color);
    add(bx, ay, color);
    add(bu, by, color);
  }
  return points;
}
function dotGeometry(a) {
  let rows = targets,
    index = rows.findIndex((c) => c.name === a.target_chromosome),
    offset = rows
      .slice(0, Math.max(0, index))
      .reduce((s, c) => s + c.end - c.start, 0),
    total = rows.reduce((s, c) => s + c.end - c.start, 0),
    y0 =
      38 +
      ((offset + (a.orientation === "-" ? a.target_end : a.target_start)) /
        total) *
        237,
    y1 =
      38 +
      ((offset + (a.orientation === "-" ? a.target_start : a.target_end)) /
        total) *
        237,
    x0 = genomicX(a.source_start, "a", a.source_chromosome),
    x1 = genomicX(a.source_end, "a", a.source_chromosome),
    dx = x1 - x0,
    dy = y1 - y0,
    len = Math.hypot(dx, dy) || 1,
    thick = 1.35,
    nx = (-dy / len) * thick,
    ny = (dx / len) * thick,
    color = a.orientation === "+" ? COLORS.forward : COLORS.reverse;
  if (selected?.alignment === a.id) color = COLORS.selected;
  if (selected?.region) {
    const hit =
      selected.region.genome === "a"
        ? a.source_chromosome === selected.region.chromosome &&
          a.source_start < selected.region.end &&
          a.source_end > selected.region.start
        : a.target_chromosome === selected.region.chromosome &&
          a.target_start < selected.region.end &&
          a.target_end > selected.region.start;
    if (hit) color = COLORS.selected;
    else color = [...color.slice(0, 3), 0.08];
  }
  return [
    x0 + nx,
    y0 + ny,
    ...color,
    x0 - nx,
    y0 - ny,
    ...color,
    x1 + nx,
    y1 + ny,
    ...color,
    x1 + nx,
    y1 + ny,
    ...color,
    x0 - nx,
    y0 - ny,
    ...color,
    x1 - nx,
    y1 - ny,
    ...color,
  ];
}
function draw() {
  const canvas = $("#ribbonCanvas"),
    rect = canvas.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  if (!gl) {
    drawFallback();
    return;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, "size"), rect.width, rect.height);
  const all = db.alignments.filter(visible);
  let raw = [];
  all.forEach((a) =>
    raw.push(...(currentView === "dot" ? dotGeometry(a) : ribbonGeometry(a))),
  );
  vertexCount = raw.length / 6;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(raw), gl.DYNAMIC_DRAW);
  let p = gl.getAttribLocation(program, "p"),
    c = gl.getAttribLocation(program, "c");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(c);
  gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 24, 8);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  $("#visibleCount").textContent = all.length;
  $("#statBlocks").textContent = String(totalAlignments).padStart(2, "0");
  $("#panelBlockCount").textContent = `${all.length} BLOCKS`;
  if ($("#colorMode").value === "identity") {
    $("#legendHeading").textContent = "SEQUENCE IDENTITY";
    $("#legendItems").innerHTML =
      '<i class="identity-gradient"></i><span>lower</span><span>higher</span>';
  } else {
    $("#legendHeading").textContent =
      $("#colorMode").value === "chromosome" ? "SOURCE CHROM." : "ORIENTATION";
    $("#legendItems").innerHTML =
      $("#colorMode").value === "chromosome"
        ? '<span><i class="legend-line forward"></i>Chr 1</span><span><i class="legend-line reverse"></i>Chr 2</span><span><i class="legend-line selected-line"></i>Chr 3</span>'
        : '<span><i class="legend-line forward"></i>Forward</span><span><i class="legend-line reverse"></i>Reverse</span>';
  }
  $("#scaleReadout").textContent =
    currentView === "dot"
      ? "SOURCE POSITION × TARGET POSITION"
      : currentView === "order"
        ? "FIXTURE GENE MARKS · NO ORTHOLOGY INFERENCE"
        : zoom === 1
          ? "WHOLE ASSEMBLY VIEW"
          : `${zoom.toFixed(1)}× DETAIL`;
  let visibleCanvas = $("#showRibbons").checked && currentView !== "order";
  $("#canvasEmpty").hidden = visibleCanvas || currentView === "order";
  $("#ribbonCanvas").style.opacity = visibleCanvas ? "1" : "0";
  $("#geneOrder").hidden = currentView !== "order";
}
function drawFallback() {
  const c = $("#ribbonCanvas"),
    ctx = c.getContext("2d"),
    r = c.getBoundingClientRect(),
    d = devicePixelRatio || 1;
  c.width = r.width * d;
  c.height = r.height * d;
  ctx.scale(d, d);
  ctx.clearRect(0, 0, r.width, r.height);
  for (const a of db.alignments.filter(visible)) {
    let x = genomicX(a.source_start, "a", a.source_chromosome),
      x1 = genomicX(a.source_end, "a", a.source_chromosome),
      y = 38,
      x2 = genomicX(a.target_start, "b", a.target_chromosome),
      x3 = genomicX(a.target_end, "b", a.target_chromosome);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x, y + 55, x2, 140, x2, 194);
    ctx.lineTo(x3, 194);
    ctx.bezierCurveTo(x3, 140, x1, y + 55, x1, y);
    ctx.closePath();
    ctx.fillStyle =
      a.orientation === "+" ? "rgba(45,196,187,.26)" : "rgba(169,124,240,.27)";
    ctx.fill();
  }
}
function renderEvidence() {
  let rows = db.alignments.filter(visible);
  $("#evidenceCount").textContent = `${rows.length} RECORDS`;
  $("#evidenceRows").innerHTML = rows
    .map(
      (a) =>
        `<tr data-id="${a.id}" class="${selected?.alignment === a.id ? "row-selected" : ""}"><td><b class="block-id">${esc(a.synteny_block)}</b></td><td>${esc(a.source_chromosome)} <code>${fmt(a.source_start)}–${fmt(a.source_end)}</code></td><td>${esc(a.target_chromosome)} <code>${fmt(a.target_start)}–${fmt(a.target_end)}</code></td><td><span class="orientation ${a.orientation === "+" ? "fwd" : "rev"}">${a.orientation === "+" ? "↗ forward" : "↙ reverse"}</span></td><td>${(a.identity * 100).toFixed(1)}%</td><td>${a.mapq}</td></tr>`,
    )
    .join("");
  document
    .querySelectorAll("#evidenceRows tr")
    .forEach(
      (tr) =>
        (tr.onclick = () =>
          selectAlignment(db.alignments.find((a) => a.id === tr.dataset.id))),
    );
}
function selectAlignment(a) {
  selected = { alignment: a.id };
  draw();
  renderEvidence();
  const source = `${esc(a.source_chromosome)} · ${a.source_start.toLocaleString()}–${a.source_end.toLocaleString()} bp`,
    target = `${esc(a.target_chromosome)} · ${a.target_start.toLocaleString()}–${a.target_end.toLocaleString()} bp`;
  $("#selectionSummary").innerHTML = `${source}<span>→ ${target}</span>`;
  $("#inspectorContent").innerHTML =
    `<div class="inspect-kicker">ALIGNMENT BLOCK · ${a.id}</div><h2>${esc(a.synteny_block)}</h2><p class="inspect-sub">${esc(a.source_chromosome)} ↔ ${esc(a.target_chromosome)}</p><div class="orientation-card ${a.orientation === "-" ? "reverse" : ""}"><span>${a.orientation === "+" ? "FORWARD ORIENTATION" : "REVERSE ORIENTATION"}</span><b>${a.orientation === "+" ? "↗" : "↙"}</b></div><div class="inspect-section"><div class="inspect-label">SOURCE INTERVAL <span>0-based · half-open</span></div><b class="coord">${a.source_start.toLocaleString()} — ${a.source_end.toLocaleString()}</b><small>${esc(a.source_chromosome)} · ${fmt(a.block_length)} aligned</small></div><div class="inspect-section"><div class="inspect-label">TARGET INTERVAL <span>0-based · half-open</span></div><b class="coord">${a.target_start.toLocaleString()} — ${a.target_end.toLocaleString()}</b><small>${esc(a.target_chromosome)} · mapped block interval</small></div><div class="stat-pair"><div><span>IDENTITY</span><b>${(a.identity * 100).toFixed(1)}%</b></div><div><span>MAPQ</span><b>${a.mapq}</b></div></div><div class="evidence-callout"><b>Evidence provenance</b><p>${esc(a.evidence)}${a.classification === "user-provided" ? ". Imported alignment; inspect source provenance and parameters." : ". Fixture relationship; not empirical sequence alignment."}</p></div><div class="scientific-note">Orientation alone does not prove an evolutionary inversion.</div>`;
}
async function selectRegion(genome, c, start, end) {
  const relevant = db.alignments.filter((a) =>
    genome === "a"
      ? a.source_chromosome === c.name &&
        a.source_start < end &&
        a.source_end > start
      : a.target_chromosome === c.name &&
        a.target_start < end &&
        a.target_end > start,
  );
  selected = { region: { genome, chromosome: c.name, start, end } };
  draw();
  $("#selectionSummary").innerHTML =
    `${esc(c.name)} · ${fmt(start)}–${fmt(end)}<span>${relevant.length ? `${relevant.length} evidence block${relevant.length === 1 ? "" : "s"} intersect` : "No alignment evidence intersects this interval"}</span>`;
  $("#inspectorContent").innerHTML =
    `<div class="inspect-kicker">REGION SELECTION</div><h2>${esc(c.name)}</h2><p class="inspect-sub">${genome === "a" ? "PAF query / reference" : "PAF target"} · ${genome === "a" ? "source" : "target"} assembly</p><div class="inspect-section"><div class="inspect-label">SELECTED INTERVAL</div><b class="coord">${start.toLocaleString()} — ${end.toLocaleString()}</b><small>0-based · half-open · ${fmt(end - start)}</small></div><div class="inspect-section"><div class="inspect-label">SUPPORTED CORRESPONDENCES</div><div class="mapped-locus">Calculating interval projections…</div></div>`;
  const projections = await Promise.all(
    relevant.map(async (a) => {
      if (a.paf) {
        try {
          const r = await fetch("/api/project-region", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alignment: a.paf,
              start: Math.max(
                start,
                genome === "a" ? a.source_start : a.target_start,
              ),
              end: Math.min(end, genome === "a" ? a.source_end : a.target_end),
              source: genome === "a" ? "query" : "target",
            }),
          });
          const mapped = await r.json();
          if (!r.ok) throw Error(mapped.error);
          return mapped.intervals.map((iv) => {
            const chromosome =
              genome === "a" ? a.target_chromosome : a.source_chromosome;
            return `${esc(chromosome)} · ${fmt(iv[0])}–${fmt(iv[1])} · ${a.orientation === "+" ? "forward" : "reverse"} · ${esc(mapped.precision)}`;
          });
        } catch (e) {
          const chromosome =
            genome === "a" ? a.target_chromosome : a.source_chromosome;
          return [`${esc(chromosome)} · projection error: ${esc(e.message)}`];
        }
      }
      return [
        genome === "a"
          ? `${esc(a.target_chromosome)} · ${fmt(a.target_start)}–${fmt(a.target_end)} · ${a.orientation === "+" ? "forward" : "reverse"} · approximate block mapping`
          : `${esc(a.source_chromosome)} · ${fmt(a.source_start)}–${fmt(a.source_end)} · ${a.orientation === "+" ? "forward" : "reverse"} · approximate block mapping`,
      ];
    }),
  );
  const mapping = projections.flat();
  $("#inspectorContent").innerHTML =
    `<div class="inspect-kicker">REGION SELECTION</div><h2>${esc(c.name)}</h2><p class="inspect-sub">${esc(genome === "a" ? "source assembly" : "target assembly")}</p><div class="inspect-section"><div class="inspect-label">SELECTED INTERVAL</div><b class="coord">${start.toLocaleString()} — ${end.toLocaleString()}</b><small>0-based · half-open · ${fmt(end - start)}</small></div><div class="inspect-section"><div class="inspect-label">SUPPORTED CORRESPONDENCES</div>${mapping.length ? mapping.map((m) => `<div class="mapped-locus">↳ ${m}</div>`).join("") : '<div class="no-map">No alignment evidence overlaps this interval. No correspondence is reported for this region.</div>'}</div><div class="evidence-callout"><b>Mapping limits</b><p>Exact CIGAR projection preserves gap-separated mappings in either direction; alignments without CIGAR are approximate. Multiple mappings are retained.</p></div>`;
}
function tooltipAt(e) {
  const c = $("#ribbonCanvas").getBoundingClientRect(),
    x = e.clientX - c.left,
    y = e.clientY - c.top;
  let a = db.alignments
    .filter(visible)
    .map((a) => ({
      a,
      d: Math.abs(
        genomicX(
          (a.source_start + a.source_end) / 2,
          "a",
          a.source_chromosome,
        ) - x,
      ),
    }))
    .sort((u, v) => u.d - v.d)[0];
  if (a && a.d < 32 && y > 35 && y < 215) {
    hovered = a.a;
    let t = $("#tooltip");
    t.hidden = false;
    t.style.left = `${Math.min(e.clientX - c.left + 12, c.width - 220)}px`;
    t.style.top = `${Math.max(5, y - 25)}px`;
    t.innerHTML = `<b>${esc(a.a.synteny_block)}</b><span>${esc(a.a.source_chromosome)} → ${esc(a.a.target_chromosome)} · ${a.a.orientation === "+" ? "forward" : "reverse"}</span><span>${(a.a.identity * 100).toFixed(1)}% identity · MAPQ ${a.a.mapq}</span>`;
  } else $("#tooltip").hidden = true;
}
function setZoom(z) {
  zoom = Math.min(8, Math.max(1, z));
  draw();
}
async function importPaf(file) {
  const status = $("#importStatus");
  status.className = "import-status";
  status.textContent = "Validating PAF…";
  try {
    const response = await fetch("/api/import/paf", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "X-Filename": file.name },
      body: await file.text(),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || `Import failed (${response.status})`);
    if (!result.alignment_count)
      throw Error("No alignment rows were found in this PAF.");
    totalAlignments = result.alignment_count;
    db.alignments = result.alignments.map((p, i) => ({
      id: `paf-${i + 1}`,
      source_genome: "paf-query",
      target_genome: "paf-target",
      source_chromosome: p.query,
      target_chromosome: p.target,
      source_start: p.query_start,
      source_end: p.query_end,
      target_start: p.target_start,
      target_end: p.target_end,
      orientation: p.strand,
      identity: p.identity,
      mapq: p.mapq,
      block_length: p.block_length,
      synteny_block: `PAF-${i + 1}`,
      evidence: `Imported PAF · ${file.name}`,
      classification: "user-provided",
      paf: p,
    }));
    const sourceLengths = new Map(),
      targetLengths = new Map();
    for (const p of result.alignments) {
      sourceLengths.set(
        p.query,
        Math.max(sourceLengths.get(p.query) || 0, p.query_length),
      );
      targetLengths.set(
        p.target,
        Math.max(targetLengths.get(p.target) || 0, p.target_length),
      );
    }
    chromosomes = [...sourceLengths].map(([name, length]) => ({
      name,
      start: 0,
      end: length,
    }));
    targets = [...targetLengths].map(([name, length]) => ({
      name,
      start: 0,
      end: length,
    }));
    $("#genomeA").innerHTML =
      `<span class="species-icon teal">Q</span><span><b>PAF query sequences</b><small>${esc(file.name)}</small></span><span class="chevron">⌄</span>`;
    $("#genomeB").innerHTML =
      `<span class="species-icon violet">T</span><span><b>PAF target sequences</b><small>${targets.length} sequences · ${fmt([...targetLengths.values()].reduce((a, b) => a + b, 0))}</small></span><span class="chevron">⌄</span>`;
    $(".row-a .organism-label").innerHTML =
      `<span class="species-icon teal">Q</span><span><b>PAF query</b><small>${fmt([...sourceLengths.values()].reduce((a, b) => a + b, 0))} total</small></span>`;
    $(".row-b .organism-label").innerHTML =
      `<span class="species-icon violet">T</span><span><b>PAF target</b><small>${fmt([...targetLengths.values()].reduce((a, b) => a + b, 0))} total</small></span>`;
    renderChroms($("#chromsA"), chromosomes, "a");
    renderChroms($("#chromsB"), targets, "b");
    $("#provenanceTitle").textContent = "USER-PROVIDED ALIGNMENT DATA";
    $("#vizHeading").firstChild.textContent = "ALIGNMENT RECORDS · ";
    $("#vizRecordLabel").textContent = "PAF ROWS";
    $("#summaryProvenance").textContent = "User-provided PAF";
    $("#summarySourceNote").textContent = "not independently validated";
    $("#provenanceBody").textContent =
      `${file.name} · PAF query and target assemblies as supplied; coordinates are 0-based, half-open.`;
    $("#metricAssemblies").textContent = "02";
    $("#metricAssembliesNote").textContent = "PAF query and target";
    $("#metricGenes").textContent = "—";
    $("#metricGenesNote").textContent = "not included in PAF";
    $("#metricBlocksNote").textContent = "user-provided PAF rows";
    $("#geneTrack").innerHTML = "";
    $("#geneOrder").innerHTML =
      '<div class="gene-order-note">PAF contains alignment records, not gene annotations. No gene-order view is available for this import.</div>';
    $("#geneOrder").hidden = false;
    currentView = "ribbon";
    document
      .querySelectorAll("[data-view]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.view === "ribbon"),
      );
    selected = null;
    renderEvidence();
    draw();
    status.className = "import-status success";
    status.textContent = `Loaded ${result.alignment_count} PAF alignments${result.truncated ? " (first 5,000 shown)" : ""}. User-provided evidence; not independently validated.`;
  } catch (e) {
    status.className = "import-status error";
    status.textContent = e.message || "Unable to import PAF.";
  }
}
async function boot() {
  try {
    let r = await fetch("/api/catalog");
    if (!r.ok) throw Error("API unavailable");
    db = await r.json();
    totalAlignments = db.alignments.length;
  } catch (e) {
    document.body.innerHTML = `<main style="padding:4rem;color:#eee">Cannot reach the local API. Start the app with <code>python3 server.py</code>.</main>`;
    return;
  }
  renderChroms($("#chromsA"), chromosomes, "a");
  renderChroms($("#chromsB"), targets, "b");
  $("#geneTrack").innerHTML = db.genomes[0].genes
    .map((g) => {
      let i = chromosomes.findIndex((c) => c.name === g.chromosome),
        offset = chromosomes
          .slice(0, i)
          .reduce((v, c) => v + c.end - c.start, 0);
      return `<span class="gene-mark" title="${g.name} · ${g.chromosome} · ${fmt(g.start)}" style="left:${((offset + g.start) / 120e6) * 100}%">${g.name}</span>`;
    })
    .join("");
  const orderRow = (label, genes, rows, total, klass) =>
    `<div class="gene-order-row ${klass}"><span>${label}</span>${genes
      .map((g) => {
        let i = rows.findIndex((c) => c.name === g.chromosome),
          offset = rows.slice(0, i).reduce((v, c) => v + c.end - c.start, 0);
        return `<b class="gene-order-mark" style="left:${((offset + (g.start + g.end) / 2) / total) * 100}%" title="${g.description}">${g.name}</b>`;
      })
      .join("")}</div>`;
  $("#geneOrder").innerHTML =
    orderRow("A. lucida", db.genomes[0].genes, chromosomes, 120e6, "source") +
    orderRow("N. caerulea", db.genomes[1].genes, targets, 105e6, "target") +
    '<div class="gene-order-note">FIXTURE LABELS ARE DISPLAYED IN ORDER · NO HOMOLOGY OR ORTHOLOGY IS IMPLIED</div>';
  renderEvidence();
  if (!initGL()) console.info("WebGL2 unavailable; using Canvas 2D renderer.");
  draw();
  $("#importPafButton").onclick = () => $("#pafFile").click();
  $("#pafFile").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (f) await importPaf(f);
    e.target.value = "";
  };
  $("#identityFilter").oninput = () => {
    $("#identityValue").textContent = `${$("#identityFilter").value}%`;
    renderEvidence();
    draw();
  };
  document.querySelectorAll("[data-strand]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-strand]")
          .forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        strand = b.dataset.strand;
        renderEvidence();
        draw();
      }),
  );
  ["colorMode", "showRibbons", "showGenes"].forEach(
    (id) =>
      ($("#" + id).onchange = () => {
        $("#geneTrack").style.display = $("#showGenes").checked
          ? "flex"
          : "none";
        draw();
      }),
  );
  $("#ribbonCanvas").addEventListener("mousemove", tooltipAt);
  $("#ribbonCanvas").addEventListener(
    "mouseleave",
    () => ($("#tooltip").hidden = true),
  );
  $("#ribbonCanvas").addEventListener("click", (e) => {
    const c = $("#ribbonCanvas").getBoundingClientRect(),
      x = e.clientX - c.left;
    const a = db.alignments
      .filter(visible)
      .sort(
        (a, b) =>
          Math.abs(
            genomicX(
              (a.source_start + a.source_end) / 2,
              "a",
              a.source_chromosome,
            ) - x,
          ) -
          Math.abs(
            genomicX(
              (b.source_start + b.source_end) / 2,
              "a",
              b.source_chromosome,
            ) - x,
          ),
      )[0];
    if (a) selectAlignment(a);
  });
  $("#zoomIn").onclick = () => setZoom(zoom * 1.35);
  $("#zoomOut").onclick = () => setZoom(zoom / 1.35);
  $("#resetZoom").onclick = $("#fitBtn").onclick = () => {
    center = 0.5;
    setZoom(1);
  };
  $("#clearSelection").onclick = () => {
    selected = null;
    $("#selectionSummary").innerHTML =
      "No interval selected<span>Click a chromosome ruler to select a region</span>";
    $("#inspectorContent").innerHTML =
      '<div class="inspect-empty"><div class="empty-glyph">⌖</div><b>Choose an alignment</b><p>Select a ribbon or drag across a chromosome ruler to inspect mapped intervals and supporting evidence.</p><div class="empty-hint">YOUR SELECTION WILL APPEAR HERE</div></div>';
    draw();
    renderEvidence();
  };
  $("#exportBtn").onclick = () => {
    draw();
    let link = document.createElement("a");
    link.download = "cgo-comparison-fixture.png";
    link.href = $("#ribbonCanvas").toDataURL("image/png");
    link.click();
  };
  $("#fullBtn").onclick = () => $("#vizStage").requestFullscreen?.();
  $("#themeButton").onclick = () => document.body.classList.toggle("light");
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-view]")
          .forEach((x) => x.classList.toggle("active", x === b));
        currentView = b.dataset.view;
        $("#chartWrap").dataset.view = currentView;
        $("#scaleReadout").textContent =
          currentView === "ribbon"
            ? "WHOLE ASSEMBLY VIEW"
            : currentView === "dot"
              ? "SOURCE POSITION × TARGET POSITION"
              : "FIXTURE GENE ORDER · NO ORTHOLOGY INFERENCE";
        draw();
      }),
  );
  window.addEventListener("resize", draw);
}
boot();
