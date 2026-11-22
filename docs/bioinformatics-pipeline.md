# Current bioinformatics functions

The current implementation validates PAF's mandatory 12 fields and retains sequence identifiers, lengths, intervals, strand, matching bases, block length, MAPQ, and optional tags. Identity is computed as `matches / block_length`. Invalid integer fields, bounds, strand, score relationships, and MAPQ are rejected with line-specific errors.

The region projection function supports exact traversal of PAF `cg:Z` CIGAR operations from either query or target coordinates. Mapped paths are split across CIGAR gaps, and reverse-strand target traversal is handled explicitly. PAF rows without CIGAR are projected proportionally in either direction and marked approximate. The endpoint accepts at most 50 MiB and returns at most 5,000 records in its response. It does not launch an aligner, infer synteny, or assert orthology.
