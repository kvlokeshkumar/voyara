import datetime as dt
from decimal import Decimal as D

from common import calculations as calc, report_builder as rb

TRIP = {"id": 1, "origin": "A", "destination": "=cmd|' /C calc'!A0", "start_date": dt.date(2026, 1, 1),
        "end_date": dt.date(2026, 1, 3), "travelers": 2}
BUDGET = {"total_budget": D("1000"), "transportation": D("0"), "accommodation": D("0"), "meals": D("0"),
          "activities": D("0"), "miscellaneous": D("0")}
EXP = [{"id": 1, "category": "meals", "description": "=HYPERLINK(\"x\")", "amount": D("10.00"),
        "expense_date": dt.date(2026, 1, 2)}]


def test_csv_blocks_formula_injection():
    s = calc.build_summary(TRIP, BUDGET, EXP, D("0"))
    csv_text = rb.build_csv(TRIP, s, EXP, D("0")).decode()
    assert "'=HYPERLINK" in csv_text
    assert ",=HYPERLINK" not in csv_text
    assert "Trip,A to =cmd" in csv_text            # starts with 'A', so not evaluated as a formula


def test_pdf_is_structurally_valid():
    s = calc.build_summary(TRIP, BUDGET, EXP * 120, D("0"))
    pdf = rb.build_pdf(TRIP, s, EXP * 120, D("0"))
    assert pdf.startswith(b"%PDF-1.4") and pdf.rstrip().endswith(b"%%EOF")
    assert pdf.count(b"/Type /Page ") >= 3          # long report -> multiple pages
    start = int(pdf.split(b"startxref\n")[1].split(b"\n")[0])
    assert pdf[start:start + 4] == b"xref"
