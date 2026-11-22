# Scientific limitations

- The built-in comparison is synthetic and must not be used for biological inference or publication.
- Reverse orientation is an alignment property, not proof of an evolutionary inversion.
- Identity in real PAF data is derived from matching bases divided by block length and inherits the aligner's interpretation.
- Exact coordinate projection requires a valid CIGAR path. Without it, projection is approximate.
- Ambiguous mappings across multiple PAF rows are returned as multiple mappings; this foundation does not resolve orthology or paralogy.
- No sequence conservation track, gene-family method, synteny algorithm, or structural-event classifier is implemented.
- User uploads are transient and in-memory; there is no persistent data store or background worker.
