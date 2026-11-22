# Comparative Genome Observatory

A local comparative genomics workbench for inspecting alignment evidence, selecting genomic intervals, and exploring chromosome-scale correspondence. The repository currently ships a **synthetic interaction fixture**, not reference genomes or empirical comparative results. Its purpose is to make the user interface, API, and coordinate handling runnable while the full production data pipeline is developed.

## Current capabilities

- WebGL2 genome-to-genome ribbon view with Canvas 2D fallback, strand and identity filters, selection inspector, hover evidence, fixture dot plot, fixture gene-order view, and PNG export.
- Explicit fixture provenance and 0-based, half-open coordinate display.
- Local JSON API for fixture catalog, alignments, counts, and health.
- In-workspace PAF import with bounds and field validation, optional `cg:Z` CIGAR parsing, and exact gap-aware interval projection when CIGAR evidence exists.
- React dashboard built with Vite and a pnpm lockfile; Python API and scientific utilities use the standard library.

The catalog, gene annotations, and relationships are synthetic. NCBI RefSeq/Ensembl integration, FASTA/GFF indexing, a persistent database/job queue, orthology, synteny inference, production data views, and production deployment are not implemented yet. Dot plot and gene-order views only visualize the synthetic fixture and do not claim biological relationships. Other catalog, gene, analysis, and settings navigation items are visual entry points. React currently mounts the dashboard; interaction logic is being migrated from the initial browser script in follow-on work.

## Run locally

Requires Python 3.10 or newer, Node.js, pnpm, and a modern browser. WebGL2 provides the primary renderer; Canvas 2D is used when WebGL2 is unavailable.

Install the frontend dependencies:

```bash
pnpm install --frozen-lockfile
```

For development, start the API in one terminal:

```bash
python3 server.py
```

Then start Vite in another terminal:

```bash
pnpm dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` requests to the local Python service on port 8000. For a production-style local run, use `make run`; this builds the frontend and serves the generated `dist/` files through Python on <http://127.0.0.1:8000>. Set `CGO_HOST` and `CGO_PORT` to change the API bind address. `CGO_ACCESS_LOG=1` enables request logs.

Make targets are `make run`, `make build`, `make test`, and `make check`.

## API

- `GET /api/health` — liveness response
- `GET /api/catalog` — fixture assemblies, annotations, and alignment blocks
- `GET /api/alignments` — fixture evidence
- `GET /api/stats` — counts from the fixture catalog
- `POST /api/import/paf` — raw UTF-8 PAF body, filename supplied in `X-Filename` (50 MiB cap)
- `POST /api/project-region` — JSON `{ "alignment": <parsed PAF row>, "start": n, "end": n, "source": "query" | "target" }`; `source` defaults to `query` and projections are exact with CIGAR or explicitly approximate without it

Example:

```bash
curl -H 'X-Filename: example.paf' --data-binary @example.paf http://127.0.0.1:8000/api/import/paf
```

Coordinates are represented as 0-based, half-open integers. PAF records without a `cg:Z` tag can only be projected approximately across their aligned interval; CIGAR-aware projections work in either direction and report split intervals where gaps intervene. This is coordinate projection, not a claim of homology or orthology.

## Checks

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile server.py cgo/bio.py
pnpm build
```

## Architecture and limitations

See the [implementation status](docs/implementation-status.md), [architecture](docs/architecture.md), [coordinate conventions](docs/coordinate-systems.md), [PAF behavior](docs/bioinformatics-pipeline.md), [data provenance](docs/data-sources.md), and [scientific limitations](docs/scientific-limitations.md). The server has no authentication and is intended for local, loopback use. Uploaded PAF data is parsed in memory and is not persisted.

## License

MIT. Fixture data is synthetic and included under the repository license.
