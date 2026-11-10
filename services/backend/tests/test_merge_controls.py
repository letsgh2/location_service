"""Tymczasowy test używany wyłącznie do weryfikacji blokady merge przez ruleset."""


def test_ruleset_blocks_failed_ci():
    assert False, "Intentional failure: verify required ci-ok blocks merge"
