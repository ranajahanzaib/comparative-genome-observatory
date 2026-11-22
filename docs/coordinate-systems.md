# Coordinate systems

The API and browser represent intervals as 0-based, half-open `[start, end)`, matching PAF. Length is `end - start`; adjacent intervals `[a,b)` and `[b,c)` do not overlap. PAF query and target intervals are checked against declared sequence lengths.

Projection with `cg:Z` traverses CIGAR operations and maps matched/substituted bases (`M`, `=`, `X`). Query-only insertions split mapping paths rather than being linearly interpolated. Reverse-strand target coordinates are traversed from target end and returned as increasing half-open intervals. Without `cg:Z`, the result is explicitly approximate and proportional within the PAF alignment span; it cannot recover gap structure or base-exact coordinates.
