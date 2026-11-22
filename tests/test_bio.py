import unittest
import json
from pathlib import Path

from cgo.bio import parse_paf, project_interval


class PafTests(unittest.TestCase):
    def test_parse_recorded_upload_fixture(self):
        sample = (Path(__file__).parent / "fixtures" / "tiny.paf").read_text()
        rows = parse_paf(sample)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["query"], "q1")
        self.assertEqual(rows[1]["strand"], "-")

    def test_parse_and_identity(self):
        row = parse_paf("q\t100\t10\t60\t+\tt\t200\t30\t80\t45\t50\t60\tcg:Z:50M")[0]
        self.assertEqual((row["query_start"], row["target_start"]), (10, 30))
        self.assertEqual(row["identity"], .9)
        self.assertEqual(project_interval(row, 20, 40)["intervals"], [[40, 60]])

    def test_reverse_projection(self):
        row = parse_paf("q\t100\t10\t60\t-\tt\t200\t30\t80\t50\t50\t60\tcg:Z:50M")[0]
        self.assertEqual(project_interval(row, 20, 40)["intervals"], [[50, 70]])

    def test_cigar_gap_keeps_split_mapping(self):
        row = parse_paf("q\t100\t10\t50\t+\tt\t200\t30\t80\t35\t50\t60\tcg:Z:20M10D20M")[0]
        out = project_interval(row, 15, 45)
        self.assertEqual(out["intervals"], [[35, 50], [60, 75]])
        self.assertIn("exact", out["precision"])

    def test_rejects_bad_bounds(self):
        with self.assertRaises(ValueError):
            parse_paf("q\t10\t0\t11\t+\tt\t20\t0\t10\t8\t10\t60")

    def test_rejects_cigar_span_mismatch(self):
        row = parse_paf("q\t100\t10\t60\t+\tt\t200\t30\t80\t45\t50\t60")[0]
        row["cigar"] = "49M"
        with self.assertRaisesRegex(ValueError, "CIGAR spans"):
            project_interval(row, 10, 20)

    def test_projection_coordinates_must_be_integers(self):
        row = parse_paf("q\t100\t10\t60\t+\tt\t200\t30\t80\t45\t50\t60")[0]
        with self.assertRaisesRegex(ValueError, "must be integers"):
            project_interval(row, 10.5, 20)

    def test_rejects_zero_length_cigar_operations(self):
        with self.assertRaisesRegex(ValueError, "malformed cg CIGAR"):
            parse_paf("q\t100\t10\t60\t+\tt\t200\t30\t80\t45\t50\t60\tcg:Z:0M50M")

    def test_without_cigar_is_marked_approximate(self):
        row = parse_paf("q\t100\t10\t60\t+\tt\t200\t30\t90\t45\t60\t60")[0]
        self.assertEqual(project_interval(row, 10, 30)["precision"], "approximate")

    def test_fixture_loci_fit_declared_chromosomes(self):
        fixture = json.loads((Path(__file__).parents[1] / "data" / "demo.json").read_text())
        lengths = {
            "fixture-aurora": {"Chr 1": 42_000_000, "Chr 2": 47_000_000, "Chr 3": 31_000_000},
            "fixture-noctis": {"Scf 1": 36_000_000, "Scf 2": 42_000_000, "Scf 3": 27_000_000},
        }
        for row in fixture["alignments"]:
            self.assertLessEqual(row["source_end"], lengths[row["source_genome"]][row["source_chromosome"]])
            self.assertLessEqual(row["target_end"], lengths[row["target_genome"]][row["target_chromosome"]])
            self.assertEqual(row["block_length"], row["source_end"] - row["source_start"])
            self.assertEqual(row["block_length"], row["target_end"] - row["target_start"])


if __name__ == "__main__":
    unittest.main()
