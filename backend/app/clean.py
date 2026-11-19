import csv
import hashlib
import io
import re
import unicodedata
from html import unescape

FIELDS = {"review_id", "product", "rating", "date", "review_text"}


def clean_csv(contents):
    reader = csv.DictReader(io.StringIO(contents.decode("utf-8-sig")), strict=True)
    if not reader.fieldnames or not FIELDS.issubset(reader.fieldnames):
        raise ValueError("CSV must include review_id, product, rating, date and review_text.")
    rows, seen, skipped = [], set(), {"empty": 0, "duplicate": 0, "malformed": 0}
    while True:
        try:
            row = next(reader)
        except StopIteration:
            break
        except csv.Error:
            skipped["malformed"] += 1
            continue
        if None in row or any(row[field] is None for field in FIELDS):
            skipped["malformed"] += 1
            continue
        text = re.sub(r"<[^>]+>", "", unescape(row["review_text"]))
        text = " ".join(unicodedata.normalize("NFC", text).split())
        if not text:
            skipped["empty"] += 1
            continue
        key = hashlib.sha256(text.encode()).hexdigest()
        if key in seen:
            skipped["duplicate"] += 1
            continue
        seen.add(key)
        rating = row["rating"].strip()
        rows.append(dict(key=key, review_id=row["review_id"].strip(),
                         product=row["product"].strip() or "Unknown product",
                         rating=int(rating) if rating in "12345" and len(rating) == 1 else None,
                         date=row["date"].strip(), review_text=text))
    return rows, skipped

