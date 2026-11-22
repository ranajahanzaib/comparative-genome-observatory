# Implementation status

The current code is a local, dependency-free workbench and scientific-computing foundation. Status below describes tested behavior against the project roadmap.

## Workflow acceptance

| Workflow                   | Status          | Evidence / remaining work                                                                                                                                               |
| -------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start a comparison         | Partial         | Opens a labeled fixture or pairwise user PAF. No organism picker, analysis launch, or multi-assembly setup.                                                             |
| Explore synteny            | Partial         | WebGL2 ribbons and evidence inspector work for fixture and imported pairwise PAF. Fixture blocks are synthetic; uploaded PAF rows are alignments, not inferred synteny. |
| Map selected regions       | Partial         | Query-to-target and target-to-query projection now use CIGAR when present and report approximate mappings without CIGAR. Multi-species chaining is not implemented.     |
| Investigate rearrangements | Partial         | Strand direction appears in ribbons and dot plot. No structural-event inference or rearrangement evidence model exists.                                                 |
| Explore genes              | Not implemented | Fixture marks appear in gene-order view, but no gene search, detail route, orthology, or annotation import exists.                                                      |
| Inspect conservation       | Not implemented | PAF identity can be inspected and filtered; there are no conservation tracks or base-level sequence comparison views.                                                   |
| Import data                | Partial         | PAF upload is validated and viewable in memory. FASTA/GFF/GTF/BED, persistent indexing, and import jobs are absent.                                                     |
| Run analysis               | Not implemented | No alignment tools, job queue, cancellation, or durable results.                                                                                                        |
| Export results             | Partial         | Browser PNG export captures the current WebGL canvas. No high-resolution publication layout or scientific-data export.                                                  |
| Restart the application    | Not implemented | Fixture survives because it is a checked-in JSON file. Uploaded PAF is transient and not persisted.                                                                     |

## Infrastructure and science

- Implemented: static browser client, local Python HTTP API, synthetic fixture, strict PAF field/bounds checks, optional CIGAR span validation, bidirectional pairwise query/target projection, source provenance labels, and a small deterministic test suite.
- Not implemented: RefSeq or Ensembl adapters, PostgreSQL, object storage, indexing, durable processing, multi-species coordinate mapping, FASTA/GFF parsers, reproducible aligner runs, authentication, resource-isolated workers, deployment manifests, and production monitoring.
- Frontend: React and Vite managed by pnpm; exact dependency resolutions are recorded in `pnpm-lock.yaml`. The current dashboard is rendered by a React component, while legacy DOM-based interaction handlers are still being migrated. Backend and tests use the Python standard library.

See [scientific limitations](scientific-limitations.md), [architecture](architecture.md), and [data sources](data-sources.md) before interpreting any displayed results.
