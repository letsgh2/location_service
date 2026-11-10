"""Generuje docs/schema.md (katalog główny repo) na podstawie modeli SQLAlchemy.

Źródłem prawdy jest sql_app/models.py. Plik wynikowy jest w całości generowany,
nie edytuj go ręcznie. Hook Claude Code (.claude/hooks/gen-model-docs.sh) uruchamia
ten skrypt automatycznie po każdym zapisie sql_app/models.py.

Użycie (z katalogu services/backend):
    venv/bin/python scripts/gen_model_docs.py          # zapisuje docs/schema.md
    venv/bin/python scripts/gen_model_docs.py --check  # kod 1, gdy plik jest nieaktualny
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parents[1]
DOCS_PATH = REPO_ROOT / "docs" / "schema.md"
MODELS_REL = "services/backend/sql_app/models.py"

# Import modeli ciągnie config.Settings, które czyta .env z bieżącego katalogu
# i wymaga SECRET_KEY. Generator nie używa sekretów, więc działa też bez .env.
os.chdir(BACKEND_DIR)
os.environ.setdefault("SECRET_KEY", "docs-generator")
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import Column  # noqa: E402
from sqlalchemy.orm import Mapper  # noqa: E402

import sql_app.models  # noqa: E402,F401  (rejestruje modele w Base.metadata)
from sql_app.database import Base  # noqa: E402

HEADER = (
    "<!-- PLIK GENEROWANY AUTOMATYCZNIE przez services/backend/scripts/gen_model_docs.py -->\n"
    "<!-- Nie edytuj ręcznie: zmień sql_app/models.py i uruchom generator "
    "(hook Claude Code robi to sam po zapisie models.py). -->"
)

DIRECTION_PL = {
    "ONETOMANY": "jeden-do-wielu",
    "MANYTOONE": "wiele-do-jednego",
    "MANYTOMANY": "wiele-do-wielu",
}


def _mappers_in_table_order() -> list[Mapper]:
    """Mappery w kolejności zależności FK (tak jak sorted_tables), deterministycznie."""
    by_table = {m.local_table: m for m in Base.registry.mappers}
    return [by_table[t] for t in Base.metadata.sorted_tables if t in by_table]


def _keys(col: Column) -> list[str]:
    keys = []
    if col.primary_key:
        keys.append("PK")
    if col.foreign_keys:
        keys.append("FK")
    if col.unique:
        keys.append("UK")
    return keys


def _default_str(col: Column) -> str:
    if col.default is None:
        return ""
    arg = getattr(col.default, "arg", None)
    if callable(arg):
        return getattr(arg, "__name__", "funkcja")
    return repr(arg)


def _mermaid(mappers: list[Mapper]) -> list[str]:
    lines = ["```mermaid", "erDiagram"]
    for m in mappers:
        t = m.local_table
        lines.append(f"    {t.name} {{")
        for c in t.columns:
            typ = str(c.type).replace(" ", "_")
            key = ", ".join(_keys(c))
            lines.append(f"        {typ} {c.name}{' ' + key if key else ''}")
        lines.append("    }")
    for m in mappers:
        t = m.local_table
        for c in t.columns:
            for fk in c.foreign_keys:
                parent = fk.column.table.name
                left = "|o" if c.nullable else "||"
                lines.append(f'    {parent} {left}--o{{ {t.name} : "{c.name}"')
    lines.append("```")
    return lines


def _model_section(m: Mapper) -> list[str]:
    cls, t = m.class_, m.local_table
    rels = sorted(m.relationships, key=lambda r: r.key)
    lines = [
        f"## {cls.__name__}",
        "",
        f"Tabela `{t.name}`. Kolumn: {len(t.columns)}, relacji: {len(rels)}.",
        "",
        "| Kolumna | Typ | Null | Klucz | Uwagi |",
        "|---|---|---|---|---|",
    ]
    for c in t.columns:
        key_parts = [", ".join(_keys(c))]
        key_parts += [f"→ `{fk.target_fullname}`" for fk in c.foreign_keys]
        notes = []
        if c.index:
            notes.append("indeks")
        if c.unique:
            notes.append("unikat")
        if _default_str(c):
            notes.append(f"domyślnie {_default_str(c)}")
        if c.comment:
            notes.append(c.comment)
        lines.append(
            f"| `{c.name}` | {c.type} | {'tak' if c.nullable else 'nie'} "
            f"| {' '.join(p for p in key_parts if p)} | {', '.join(notes)} |"
        )
    if rels:
        lines += ["", "Relacje:", ""]
        for r in rels:
            direction = DIRECTION_PL.get(r.direction.name, r.direction.name.lower())
            bp = f", `back_populates={r.back_populates}`" if r.back_populates else ""
            lines.append(
                f"- `{r.key}` → **{r.mapper.class_.__name__}** ({direction}{bp})"
            )
    lines.append("")
    return lines


def render() -> str:
    mappers = _mappers_in_table_order()
    lines = [
        HEADER,
        "",
        "# Modele danych (SQLAlchemy)",
        "",
        f"Źródło: `{MODELS_REL}`. Modeli: {len(mappers)}.",
        "",
        "| Model | Tabela | Kolumn | Relacji |",
        "|---|---|---|---|",
    ]
    for m in mappers:
        name = m.class_.__name__
        lines.append(
            f"| [{name}](#{name.lower()}) | `{m.local_table.name}` "
            f"| {len(m.local_table.columns)} | {len(m.relationships)} |"
        )
    lines += ["", "## Diagram ER", ""] + _mermaid(mappers) + [""]
    for m in mappers:
        lines += _model_section(m)
    return "\n".join(lines).rstrip("\n") + "\n"


def main(argv: list[str]) -> int:
    check = "--check" in argv
    new = render()
    old = DOCS_PATH.read_text(encoding="utf-8") if DOCS_PATH.exists() else None
    rel = DOCS_PATH.relative_to(REPO_ROOT)
    n = len(Base.registry.mappers)

    if check:
        if old == new:
            print(f"{rel}: aktualny ({n} modeli)")
            return 0
        print(
            f"{rel}: NIEAKTUALNY. Uruchom: python scripts/gen_model_docs.py",
            file=sys.stderr,
        )
        return 1

    if old == new:
        print(f"{rel}: bez zmian ({n} modeli)")
        return 0
    DOCS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCS_PATH.write_text(new, encoding="utf-8")
    print(f"{rel}: zaktualizowano ({n} modeli)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
