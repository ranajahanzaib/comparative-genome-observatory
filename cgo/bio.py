"""Strict parsers and coordinate projection for PAF alignments.

PAF coordinates and returned intervals are 0-based, half-open. Projection
uses CIGAR operations when supplied; without CIGAR evidence, mapping is marked
approximate and is limited to the aligned block.
"""
from __future__ import annotations

import re

_CIGAR = re.compile(r"(\d+)([MIDNSHP=X])")


def parse_paf(text: str) -> list[dict]:
    rows: list[dict] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        if not line or line.startswith("#"):
            continue
        f = line.split("\t")
        if len(f) < 12:
            raise ValueError(f"Line {line_no}: PAF requires at least 12 tab-separated fields")
        try:
            qlen, qs, qe = map(int, f[1:4])
            tlen, ts, te = map(int, f[6:9])
            matches, block, mapq = map(int, f[9:12])
        except ValueError as exc:
            raise ValueError(f"Line {line_no}: coordinate and score fields must be integers") from exc
        if not f[0] or not f[5]:
            raise ValueError(f"Line {line_no}: query and target sequence names must not be empty")
        if not (0 <= qs < qe <= qlen and 0 <= ts < te <= tlen):
            raise ValueError(f"Line {line_no}: alignment coordinates are outside sequence bounds")
        if f[4] not in ("+", "-") or block <= 0 or matches < 0 or matches > block or not 0 <= mapq <= 255:
            raise ValueError(f"Line {line_no}: invalid strand or alignment scores")
        if matches > min(qe - qs, te - ts) or block < max(qe - qs, te - ts):
            raise ValueError(f"Line {line_no}: alignment scores are inconsistent with query/target spans")
        tags: dict[str, str] = {}
        for tag in f[12:]:
            parts = tag.split(":", 2)
            if len(parts) == 3:
                tags[parts[0]] = parts[2]
        cigar = tags.get("cg")
        if cigar is not None:
            ops = [(int(n), op) for n, op in _CIGAR.findall(cigar)]
            if not ops or any(n <= 0 for n, _ in ops) or "".join(f"{n}{op}" for n, op in ops) != cigar:
                raise ValueError(f"Line {line_no}: malformed cg CIGAR tag")
            q_consumed = sum(n for n, op in ops if op in "MIS=X")
            t_consumed = sum(n for n, op in ops if op in "MDN=X")
            if q_consumed != qe - qs or t_consumed != te - ts:
                raise ValueError(f"Line {line_no}: cg CIGAR spans do not match PAF query/target intervals")
        rows.append({"query": f[0], "query_length": qlen, "query_start": qs, "query_end": qe,
                     "strand": f[4], "target": f[5], "target_length": tlen,
                     "target_start": ts, "target_end": te, "matches": matches,
                     "block_length": block, "mapq": mapq, "identity": matches / block,
                     "cigar": tags.get("cg"), "evidence": "PAF"})
    return rows


def project_interval(alignment: dict, start: int, end: int, source: str = "query") -> dict:
    """Project an interval through one PAF row; CIGAR paths split at gaps.

    ``source`` selects the PAF query or target coordinate space. PAF's strand
    describes target traversal relative to query, so target-side projection
    walks CIGAR operations in reverse coordinate direction for ``-`` rows.
    """
    if not all(isinstance(v, int) and not isinstance(v, bool) for v in (start, end)):
        raise ValueError("Selected interval coordinates must be integers")
    required = {"query_start", "query_end", "query_length", "target_start", "target_end", "target_length", "strand"}
    if not isinstance(alignment, dict) or not required.issubset(alignment):
        raise ValueError("Alignment is missing required PAF fields")
    if source not in ("query", "target"):
        raise ValueError("Projection source must be 'query' or 'target'")
    qs, qe, qlen = alignment["query_start"], alignment["query_end"], alignment["query_length"]
    ts, te, tlen = alignment["target_start"], alignment["target_end"], alignment["target_length"]
    if not (all(isinstance(v, int) and not isinstance(v, bool) for v in (qs, qe, qlen, ts, te, tlen)) and
            0 <= qs < qe <= qlen and 0 <= ts < te <= tlen and alignment["strand"] in ("+", "-")):
        raise ValueError("Alignment coordinates, sequence lengths, or orientation are invalid")
    source_start, source_end = ((qs, qe) if source == "query" else (ts, te))
    source_name = "query" if source == "query" else "target"
    if not (source_start <= start < end <= source_end):
        raise ValueError(f"Selected interval must remain within the aligned {source_name} interval")
    cigar = alignment.get("cigar")
    if not cigar:
        qspan, tspan = qe - qs, te - ts
        if source == "query":
            a, b = start - qs, end - qs
            if alignment["strand"] == "+":
                mapped = [ts + a * tspan // qspan, ts + (b * tspan + qspan - 1) // qspan]
            else:
                mapped = [te - (b * tspan + qspan - 1) // qspan, te - a * tspan // qspan]
        else:
            a, b = start - ts, end - ts
            if alignment["strand"] == "+":
                mapped = [qs + a * qspan // tspan, qs + (b * qspan + tspan - 1) // tspan]
            else:
                mapped = [qs + (tspan - b) * qspan // tspan, qs + (tspan - a) * qspan // tspan]
        return {"intervals": [mapped], "precision": "approximate", "orientation": alignment["strand"], "target_space": "target" if source == "query" else "query"}
    ops = [(int(n), op) for n, op in _CIGAR.findall(cigar)]
    if any(n <= 0 for n, _ in ops) or "".join(f"{n}{op}" for n, op in ops) != cigar:
        raise ValueError("Malformed cg CIGAR tag")
    if (sum(n for n, op in ops if op in "MIS=X") != qe - qs or
            sum(n for n, op in ops if op in "MDN=X") != te - ts):
        raise ValueError("cg CIGAR spans do not match PAF query/target intervals")
    q = qs
    t = ts if alignment["strand"] == "+" else te
    segments: list[list[int]] = []
    for n, op in ops:
        consumes_q = op in "MIS=X"
        consumes_t = op in "MDN=X"
        q0, t0 = q, t
        if op in "M=X":
            if source == "query":
                lo, hi = max(start, q0), min(end, q0 + n)
                if lo < hi:
                    if alignment["strand"] == "+":
                        seg = [t0 + lo - q0, t0 + hi - q0]
                    else:
                        seg = [t0 - (hi - q0), t0 - (lo - q0)]
                    segments.append(seg)
            else:
                tlo, thi = (t0, t0 + n) if alignment["strand"] == "+" else (t0 - n, t0)
                lo, hi = max(start, tlo), min(end, thi)
                if lo < hi:
                    if alignment["strand"] == "+":
                        seg = [q0 + lo - t0, q0 + hi - t0]
                    else:
                        seg = [q0 + t0 - hi, q0 + t0 - lo]
                    segments.append(seg)
        if consumes_q:
            q += n
        if consumes_t:
            t += n if alignment["strand"] == "+" else -n
    if not segments:
        return {"intervals": [], "precision": "exact CIGAR projection", "orientation": alignment["strand"]}
    return {"intervals": segments, "precision": "exact CIGAR projection; gap-separated mappings remain split", "orientation": alignment["strand"], "target_space": "target" if source == "query" else "query"}
