# Data sources and provenance

The only built-in dataset is `data/demo.json`, a deterministic, synthetic interaction fixture. It has no NCBI Taxonomy IDs, reference accession, license claim, or biological provenance. Its organism names, gene labels, chromosome-like scaffolds, coordinates, and alignments are invented for UI testing and are clearly labeled in the app.

No live NCBI RefSeq, Ensembl, or OpenGenome2 integration is currently present. User-uploaded PAF records are returned as user-provided evidence and are not saved by the service.
