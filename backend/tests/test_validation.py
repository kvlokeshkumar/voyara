from decimal import Decimal as D

import pytest

from common import validation as v
from common.errors import ApiError


def bad(fn, *a, **k):
    with pytest.raises(ApiError) as e:
        fn(*a, **k)
    assert e.value.status == 400
    return e.value


def test_money_ok_and_rounding():
    assert v.money("10.256", "x") == D("10.26")
    assert v.money(5, "x") == D("5.00")


@pytest.mark.parametrize("val", [-1, "abc", "NaN", "Infinity", True, 1e12, None, ""])
def test_money_rejects(val):
    bad(v.money, val, "amount")


def test_text_rules():
    assert v.text("  hi ", "f") == "hi"
    bad(v.text, "", "f")
    bad(v.text, "x" * 11, "f", 10)
    bad(v.text, 5, "f")
    assert v.text(None, "f", required=False) is None


def test_dates():
    assert str(v.to_date("2026-12-10", "d")) == "2026-12-10"
    bad(v.to_date, "10/12/2026", "d")
    bad(v.to_date, "2026-02-30", "d")
    bad(v.to_date, None, "d")


def test_integer_and_choice_and_time_and_id():
    assert v.integer("3", "n", 1, 10) == 3
    bad(v.integer, 0, "n", 1, 10)
    bad(v.integer, "x", "n")
    assert v.choice("meals", "c", v.CATEGORIES) == "meals"
    bad(v.choice, "hax", "c", v.CATEGORIES)
    assert v.clock_time("09:30", "t") == "09:30"
    bad(v.clock_time, "25:00", "t")
    assert v.path_id("7") == 7
    bad(v.path_id, "abc")
    bad(v.path_id, "0")
