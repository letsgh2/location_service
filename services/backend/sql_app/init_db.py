"""
Skrypt do inicjalizacji bazy danych.

Schemat jest zarządzany przez Alembic (migracje w alembic/versions/),
więc skrypt po prostu wykonuje `alembic upgrade head`.
Bezpieczny do wielokrotnego uruchamiania - migracje, które już zostały
zastosowane, są pomijane.
"""

from pathlib import Path

from alembic.config import Config

from alembic import command

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def init_db() -> None:
    """Stosuje wszystkie migracje Alembic do wersji head."""
    alembic_cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    command.upgrade(alembic_cfg, "head")
    print("✅ Baza danych została zainicjalizowana (alembic upgrade head)!")


if __name__ == "__main__":
    init_db()
