"""Builds CSV and PDF reports in memory. No third-party dependencies."""
import csv
import io

from .validation import CATEGORIES


def _safe(cell):
    """Neutralise spreadsheet formula injection (cells starting with = + - @)."""
    s = "" if cell is None else str(cell)
    if s[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + s
    return s


def build_csv(trip, summary, expenses, itinerary_total):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["Voyara trip expense report"])
    w.writerow(["Trip", _safe(f"{trip['origin']} to {trip['destination']}")])
    w.writerow(["Dates", f"{trip['start_date']} to {trip['end_date']}"])
    w.writerow(["Travelers", trip["travelers"]])
    w.writerow([])
    w.writerow(["Total budget (INR)", summary["totalBudget"]])
    w.writerow(["Total spent (INR)", summary["totalSpent"]])
    w.writerow(["Remaining (INR)", summary["remaining"]])
    w.writerow(["Budget used (%)", summary["percentUsed"]])
    w.writerow(["Status", summary["status"]])
    w.writerow(["Planned itinerary cost (INR)", itinerary_total])
    w.writerow([])
    w.writerow(["Category", "Budget (INR)", "Spent (INR)", "Used (%)"])
    for c in CATEGORIES:
        r = summary["byCategory"][c]
        w.writerow([c, r["budget"], r["spent"], r["percentUsed"]])
    w.writerow([])
    w.writerow(["Date", "Category", "Description", "Amount (INR)"])
    for e in sorted(expenses, key=lambda x: (x["expense_date"], x["id"])):
        w.writerow([e["expense_date"], e["category"], _safe(e["description"]), e["amount"]])
    return buf.getvalue().encode("utf-8")


def _pdf_escape(s):
    s = s.encode("latin-1", "replace").decode("latin-1")
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf(trip, summary, expenses, itinerary_total):
    """A small, valid multi-page PDF using the built-in Helvetica font."""
    lines = [
        ("Voyara trip expense report", 16),
        (f"{trip['origin']} to {trip['destination']}", 12),
        (f"{trip['start_date']} to {trip['end_date']}  |  Travelers: {trip['travelers']}", 10),
        ("", 10),
        (f"Total budget: INR {summary['totalBudget']}", 11),
        (f"Total spent:  INR {summary['totalSpent']} ({summary['percentUsed']}%)", 11),
        (f"Remaining:    INR {summary['remaining']}", 11),
        (f"Status: {summary['status']}", 11),
        (f"Planned itinerary cost: INR {itinerary_total}", 11),
        ("", 10),
        ("Category            Budget        Spent       Used", 11),
    ]
    for c in CATEGORIES:
        r = summary["byCategory"][c]
        lines.append((f"{c:<18}{str(r['budget']):>10}{str(r['spent']):>13}{str(r['percentUsed']):>9}%", 10))
    lines += [("", 10), ("Expenses", 12)]
    if not expenses:
        lines.append(("No expenses recorded.", 10))
    for e in sorted(expenses, key=lambda x: (x["expense_date"], x["id"])):
        lines.append((f"{e['expense_date']}  {e['category']:<15} {str(e['amount']):>10}  {e['description'][:60]}", 9))

    per_page = 52
    pages = [lines[i:i + per_page] for i in range(0, len(lines), per_page)] or [[]]
    objs = {}
    n_pages = len(pages)
    font_id = 3 + 2 * n_pages
    kids = []
    for i, page in enumerate(pages):
        page_id, content_id = 3 + 2 * i, 4 + 2 * i
        kids.append(f"{page_id} 0 R")
        y = 800
        parts = ["BT"]
        for text, size in page:
            parts.append(f"/F1 {size} Tf 1 0 0 1 40 {y} Tm ({_pdf_escape(text)}) Tj")
            y -= size + 4
        parts.append("ET")
        stream = "\n".join(parts).encode("latin-1", "replace")
        objs[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()
        objs[content_id] = b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
    objs[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objs[2] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {n_pages} >>".encode()
    objs[font_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"

    out = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for num in sorted(objs):
        offsets[num] = len(out)
        out += f"{num} 0 obj\n".encode() + objs[num] + b"\nendobj\n"
    xref = len(out)
    size = max(objs) + 1
    out += f"xref\n0 {size}\n".encode() + b"0000000000 65535 f \n"
    for num in range(1, size):
        out += f"{offsets[num]:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {size} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)
