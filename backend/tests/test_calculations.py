from decimal import Decimal as D

from common import calculations as calc


def exp(cat, amt):
    return {"category": cat, "amount": D(str(amt))}


def test_total_and_remaining():
    es = [exp("meals", "100.50"), exp("meals", "49.50"), exp("activities", 300)]
    assert calc.total_spent(es) == D("450.00")
    assert calc.remaining(1000, calc.total_spent(es)) == D("550.00")


def test_total_empty():
    assert calc.total_spent([]) == D("0.00")


def test_percent_and_zero_budget():
    assert calc.percent_used(1000, 250) == D("25.0")
    assert calc.percent_used(0, 250) == D("0.0")


def test_thresholds_boundaries():
    assert calc.threshold_status(1000, "799.99") == "ok"
    assert calc.threshold_status(1000, 800) == "warning"
    assert calc.threshold_status(1000, "999.99") == "warning"
    assert calc.threshold_status(1000, 1000) == "exceeded"
    assert calc.threshold_status(1000, 1500) == "exceeded"
    assert calc.threshold_status(0, 10) == "no_budget"


def test_by_category_includes_all_categories():
    out = calc.by_category([exp("meals", 5), exp("meals", 7)])
    assert out["meals"] == D("12")
    assert out["transportation"] == D("0")
    assert len(out) == 5


def test_crossed_threshold_only_when_worse():
    assert calc.crossed_threshold("ok", "warning") == "warning"
    assert calc.crossed_threshold("warning", "exceeded") == "exceeded"
    assert calc.crossed_threshold("ok", "exceeded") == "exceeded"
    assert calc.crossed_threshold("warning", "warning") is None
    assert calc.crossed_threshold("exceeded", "warning") is None
    assert calc.crossed_threshold("no_budget", "ok") is None


def test_money_has_no_float_error():
    es = [exp("meals", "0.10")] * 3
    assert calc.total_spent(es) == D("0.30")
