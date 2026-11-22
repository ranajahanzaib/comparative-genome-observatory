export default function Dashboard() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brandmark">◈</span>
          <span>
            GENOME
            <br />
            <b>OBSERVATORY</b>
          </span>
        </a>
        <div className="crumb">
          COMPARATIVE WORKSPACE <span>/</span> <b>EXPLORER</b>
        </div>
        <div className="top-actions">
          <span className="live">
            <i></i> LOCAL WORKSPACE
          </span>
          <button
            className="icon-btn"
            id="themeButton"
            title="Toggle light theme"
            aria-label="Toggle light theme"
          >
            ◐
          </button>
          <button className="avatar">R</button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="rail" aria-label="Primary navigation">
          <a className="rail-item active" title="Explorer" href="#explorer">
            ⌘
          </a>
          <a className="rail-item" title="Genome catalog" href="#catalog">
            ▤
          </a>
          <a className="rail-item" title="Gene explorer" href="#genes">
            ⌕
          </a>
          <a className="rail-item" title="Analyses" href="#analyses">
            ◷
          </a>
          <div className="rail-spacer"></div>
          <a className="rail-item" href="#methods" title="Methods">
            ⓘ
          </a>
          <a className="rail-item" href="#settings" title="Settings">
            ⚙
          </a>
        </aside>
        <main id="explorer">
          <section className="page-head">
            <div>
              <div className="eyebrow">
                <span className="pulse"></span> COMPARATIVE GENOMICS · EXPLORER
              </div>
              <h1>
                Genome relationships,
                <br />
                <em>in living color.</em>
              </h1>
              <p className="intro">
                Inspect alignment blocks across assemblies. Select an interval
                to see whether this fixture includes a corresponding region and
                what evidence is available.
              </p>
            </div>
            <div className="head-tools">
              <button className="quiet-btn" id="fitBtn">
                ⤢ &nbsp;Fit comparison
              </button>
              <button className="primary-btn" id="exportBtn">
                ↧ &nbsp;Export figure
              </button>
            </div>
          </section>
          <section className="provenance">
            <span className="warning-mark">!</span>
            <div>
              <b id="provenanceTitle">
                INTERACTION FIXTURE · NOT BIOLOGICAL DATA
              </b>
              <span id="provenanceBody">
                All organisms, coordinates, genes, and ribbon relationships
                below are synthetic, for interface and workflow demonstration
                only.
              </span>
            </div>
            <a href="#methods">Data & methodology ↗</a>
          </section>
          <section className="workspace-grid">
            <aside className="control-panel panel">
              <div className="panel-title">
                <span>COMPARISON</span>
                <button className="more">···</button>
              </div>
              <div className="field-label">REFERENCE ASSEMBLY</div>
              <button className="assembly-select" id="genomeA">
                <span className="species-icon teal">A</span>
                <span>
                  <b>Asteria lucida</b>
                  <small>CGO-FIXTURE-01</small>
                </span>
                <span className="chevron">⌄</span>
              </button>
              <div className="linkline">
                <span>↕</span>
                <small>PAIRWISE ALIGNMENT</small>
              </div>
              <div className="field-label">COMPARATIVE ASSEMBLY</div>
              <button className="assembly-select" id="genomeB">
                <span className="species-icon violet">N</span>
                <span>
                  <b>Nocturna caerulea</b>
                  <small>CGO-FIXTURE-02</small>
                </span>
                <span className="chevron">⌄</span>
              </button>
              <button className="import-button" id="importPafButton">
                ＋ &nbsp;Import alignment PAF
              </button>
              <input type="file" id="pafFile" accept=".paf,text/plain" hidden />
              <div
                id="importStatus"
                className="import-status"
                role="status"
              ></div>
              <div className="divider"></div>
              <div className="panel-title">
                <span>DISPLAY</span>
                <span className="count" id="panelBlockCount">
                  6 BLOCKS
                </span>
              </div>
              <div className="field-label">COLOR BY</div>
              <select id="colorMode">
                <option value="orientation">Alignment orientation</option>
                <option value="identity">Sequence identity</option>
                <option value="chromosome">Source chromosome</option>
              </select>
              <div className="filter-row">
                <span>Orientation</span>
                <label className="segmented">
                  <button className="selected" data-strand="all">
                    Both
                  </button>
                  <button data-strand="+">+</button>
                  <button data-strand="-">−</button>
                </label>
              </div>
              <div className="filter-row">
                <span>Minimum identity</span>
                <b id="identityValue">0%</b>
              </div>
              <input
                id="identityFilter"
                type="range"
                min="0"
                max="100"
                value="0"
                aria-label="Minimum identity percentage"
              />
              <div className="field-label gap-top">RIBBON DENSITY</div>
              <label className="checkrow">
                <input type="checkbox" checked id="showRibbons" /> Show
                alignment ribbons
              </label>
              <label className="checkrow">
                <input type="checkbox" checked id="showGenes" /> Show gene marks
              </label>
              <div className="divider"></div>
              <div className="selection-label">
                ACTIVE REGION{" "}
                <span className="clear" id="clearSelection">
                  Clear
                </span>
              </div>
              <div className="region-box" id="selectionSummary">
                No interval selected
                <span>Click a chromosome ruler to select a region</span>
              </div>
              <div className="side-foot">
                <span>Coordinate basis</span>
                <b>0-based · half-open</b>
              </div>
            </aside>
            <section className="viz-column">
              <div className="viz-toolbar">
                <div className="view-tabs">
                  <button className="active" data-view="ribbon">
                    Ribbons
                  </button>
                  <button data-view="dot">Dot plot</button>
                  <button data-view="order">Gene order</button>
                </div>
                <div className="viz-actions">
                  <span className="dim-label">VIEW</span>
                  <button
                    className="icon-btn"
                    id="zoomOut"
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <button className="icon-btn" id="zoomIn" aria-label="Zoom in">
                    +
                  </button>
                  <button
                    className="icon-btn"
                    id="resetZoom"
                    aria-label="Reset zoom"
                  >
                    ⌂
                  </button>
                  <span className="vert-sep"></span>
                  <button className="icon-btn" id="fullBtn" title="Fullscreen">
                    ⛶
                  </button>
                </div>
              </div>
              <div className="viz-stage" id="vizStage">
                <div className="viz-overline">
                  <span id="vizHeading">
                    CHROMOSOME CORRESPONDENCE <i>·</i>{" "}
                    <b id="visibleCount">6</b>{" "}
                    <span id="vizRecordLabel">SYNTENY BLOCKS</span>
                  </span>
                  <span className="scale-readout" id="scaleReadout">
                    WHOLE ASSEMBLY VIEW
                  </span>
                </div>
                <div className="ribbon-chart" id="chartWrap">
                  <div className="genome-row row-a">
                    <div className="organism-label">
                      <span className="species-icon teal">A</span>
                      <span>
                        <b>A. lucida</b>
                        <small>120 Mb total</small>
                      </span>
                    </div>
                    <div className="chromosomes" id="chromsA"></div>
                  </div>
                  <div className="ribbons-wrap">
                    <canvas
                      id="ribbonCanvas"
                      aria-label="Interactive comparative genome ribbons"
                    ></canvas>
                    <div className="canvas-empty" id="canvasEmpty" hidden>
                      Ribbons hidden · turn them back on in Display
                    </div>
                  </div>
                  <div className="genome-row row-b">
                    <div className="organism-label">
                      <span className="species-icon violet">N</span>
                      <span>
                        <b>N. caerulea</b>
                        <small>105 Mb total</small>
                      </span>
                    </div>
                    <div className="chromosomes" id="chromsB"></div>
                  </div>
                  <div className="gene-order" id="geneOrder" hidden></div>
                  <div className="gene-track" id="geneTrack"></div>
                </div>
                <div className="legend">
                  <span className="legend-title" id="legendHeading">
                    ORIENTATION
                  </span>
                  <span id="legendItems">
                    <span>
                      <i className="legend-line forward"></i> Forward
                    </span>
                    <span>
                      <i className="legend-line reverse"></i> Reverse
                    </span>
                  </span>
                  <span>
                    <i className="legend-line selected-line"></i> Selected
                  </span>
                  <div className="legend-right">
                    Hover a ribbon for evidence <span>·</span> Click a ruler to
                    map a region
                  </div>
                </div>
                <div className="tooltip" id="tooltip" hidden></div>
              </div>
              <div className="summary-strip">
                <div>
                  <span>ASSEMBLIES</span>
                  <b id="metricAssemblies">02</b>
                  <small id="metricAssembliesNote">synthetic fixture</small>
                </div>
                <div>
                  <span>ALIGNMENT BLOCKS</span>
                  <b id="statBlocks">06</b>
                  <small id="metricBlocksNote">illustrative only</small>
                </div>
                <div>
                  <span>GENE ANNOTATIONS</span>
                  <b id="metricGenes">04</b>
                  <small id="metricGenesNote">fixture marks</small>
                </div>
                <div className="summary-source">
                  <span>PROVENANCE</span>
                  <b id="summaryProvenance">Repository fixture</b>
                  <small id="summarySourceNote">no external data sources</small>
                </div>
              </div>
            </section>
            <aside className="inspector panel">
              <div className="panel-title">
                <span>INSPECTOR</span>
                <span className="inspect-dot"></span>
              </div>
              <div id="inspectorContent">
                <div className="inspect-empty">
                  <div className="empty-glyph">⌖</div>
                  <b>Choose an alignment</b>
                  <p>
                    Select a ribbon or drag across a chromosome ruler to inspect
                    mapped intervals and supporting evidence.
                  </p>
                  <div className="empty-hint">
                    YOUR SELECTION WILL APPEAR HERE
                  </div>
                </div>
              </div>
            </aside>
          </section>
          <section className="lower-grid">
            <div className="panel evidence-panel">
              <div className="panel-title">
                <span>ALIGNMENT EVIDENCE</span>
                <span className="count" id="evidenceCount">
                  6 RECORDS
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>BLOCK</th>
                      <th>SOURCE LOCUS</th>
                      <th>TARGET LOCUS</th>
                      <th>ORIENT.</th>
                      <th>IDENTITY</th>
                      <th>MAPQ</th>
                    </tr>
                  </thead>
                  <tbody id="evidenceRows"></tbody>
                </table>
              </div>
            </div>
            <div className="panel note-panel">
              <div className="panel-title">
                <span>READING THIS VIEW</span>
                <span className="info-icon">i</span>
              </div>
              <p>
                Ribbon width follows aligned span. A reverse strand indicates
                opposite alignment orientation; by itself, it does not establish
                an evolutionary inversion.
              </p>
              <a href="#methods">Methods and coordinate conventions ↗</a>
            </div>
          </section>
          <footer id="methods">
            <span>CGO · LOCAL SCIENTIFIC WORKSPACE</span>
            <span>
              Fixture data · PAF import available via API ·{" "}
              <a href="/api/health">Service status</a>
            </span>
          </footer>
        </main>
      </div>
    </>
  );
}
