"""Local API and static server for Comparative Genome Observatory."""
from __future__ import annotations

import json
import mimetypes
import os
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from cgo.bio import parse_paf, project_interval

ROOT = Path(__file__).parent
STATIC = ROOT / "dist" if (ROOT / "dist" / "index.html").is_file() else ROOT / "web"
DATA = ROOT / "data"
MAX_UPLOAD = 50 * 1024 * 1024


def catalog() -> dict:
    # This dataset is a teaching fixture; these are explicitly not biological references.
    return json.loads((DATA / "demo.json").read_text())


class Handler(BaseHTTPRequestHandler):
    server_version = "GenomeObservatory/0.1"

    def _json(self, value: object, status: int = 200) -> None:
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._json({"status": "ok", "service": "comparative-genome-observatory"})
        if path == "/api/catalog":
            return self._json(catalog())
        if path == "/api/alignments":
            return self._json({"alignments": catalog()["alignments"], "evidence": "synthetic teaching fixture"})
        if path == "/api/stats":
            d = catalog()
            return self._json({"assemblies": len(d["genomes"]), "alignments": len(d["alignments"]), "genes": sum(len(g["genes"]) for g in d["genomes"])})
        if path.startswith("/api/"):
            return self._json({"error": "Not found"}, 404)
        target = (STATIC / ("index.html" if path == "/" else path.lstrip("/"))).resolve()
        if STATIC.resolve() not in target.parents and target != STATIC.resolve():
            return self._json({"error": "Not found"}, 404)
        if not target.is_file():
            return self._json({"error": "Not found"}, 404)
        raw = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/project-region":
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 1024 * 1024:
                return self._json({"error": "Projection request must be between 1 byte and 1 MiB"}, 413)
            try:
                payload = json.loads(self.rfile.read(length))
                alignment = payload["alignment"]
                result = project_interval(alignment, payload["start"], payload["end"], payload.get("source", "query"))
            except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                return self._json({"error": str(exc)}, 400)
            return self._json(result)
        if path != "/api/import/paf":
            return self._json({"error": "Not found"}, 404)
        length = int(self.headers.get("Content-Length", "0"))
        if length < 1 or length > MAX_UPLOAD:
            return self._json({"error": "Upload must be between 1 byte and 50 MiB"}, 413)
        name = self.headers.get("X-Filename", "alignment.paf")
        if not name.lower().endswith(".paf"):
            return self._json({"error": "Only PAF alignment files are accepted by this endpoint"}, 415)
        try:
            text = self.rfile.read(length).decode("utf-8")
            alignments = parse_paf(text)
        except (UnicodeDecodeError, ValueError) as exc:
            return self._json({"error": str(exc)}, 400)
        return self._json({"import_id": str(uuid.uuid4()), "filename": Path(name).name, "alignment_count": len(alignments), "alignments": alignments[:5000], "truncated": len(alignments) > 5000, "provenance": "User-provided PAF; coordinates retain PAF's 0-based half-open convention."}, 201)

    def log_message(self, fmt: str, *args: object) -> None:
        if os.getenv("CGO_ACCESS_LOG") == "1":
            super().log_message(fmt, *args)


def main() -> None:
    host = os.getenv("CGO_HOST", "127.0.0.1")
    port = int(os.getenv("CGO_PORT", "8000"))
    print(f"Comparative Genome Observatory: http://{host}:{port}")
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
