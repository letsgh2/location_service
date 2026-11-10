"""Liczy mutation score z wyników mutmut i sprawdza minimalny próg.

Użycie (po `mutmut run` i `mutmut export-cicd-stats`):
    python scripts/mutation_score.py --min-score 60

Score = (killed + timeout) / (total - skipped) * 100 — ta sama formuła co `mutmut badge`.
Mutanty "no tests" i "survived" obniżają wynik. Gdy ustawione jest GITHUB_STEP_SUMMARY,
dopisuje tabelę z wynikiem do podsumowania joba w GitHub Actions.
Kod wyjścia 1, gdy score < progu albo brak danych.
"""
import argparse
import json
import os
import sys
from pathlib import Path


def mutation_score(stats: dict) -> float:
    tested = int(stats.get("total", 0)) - int(stats.get("skipped", 0))
    if tested <= 0:
        return 0.0
    detected = int(stats.get("killed", 0)) + int(stats.get("timeout", 0))
    return detected / tested * 100


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--stats", type=Path, default=Path("mutants/mutmut-cicd-stats.json"))
    parser.add_argument("--min-score", type=float, default=60.0)
    args = parser.parse_args()

    if not args.stats.exists():
        print(f"::error::Brak pliku {args.stats} — czy uruchomiono `mutmut export-cicd-stats`?")
        return 1

    stats = json.loads(args.stats.read_text())
    score = mutation_score(stats)
    passed = score >= args.min_score

    rows = ["killed", "timeout", "survived", "no_tests", "suspicious", "skipped", "segfault", "total"]
    lines = [
        f"## Mutation testing: {score:.1f}% {'✅' if passed else '❌'} (próg {args.min_score:.0f}%)",
        "",
        "| Status | Liczba |",
        "|---|---:|",
        *(f"| {key} | {stats.get(key, 0)} |" for key in rows),
    ]
    report = "\n".join(lines)
    print(report)

    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write(report + "\n")

    if not passed:
        print(f"::error::Mutation score {score:.1f}% jest poniżej progu {args.min_score:.0f}%")
        return 1
    print(f"Mutation score {score:.1f}% >= {args.min_score:.0f}% — OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
