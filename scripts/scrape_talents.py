#!/usr/bin/env python3
"""Build the complete offline talent reference from WFRP.su."""
import concurrent.futures
import json
import re
import time
import urllib.request
from pathlib import Path
from lxml import html

BASE = "https://wfrp.su"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; WFRP4CharacterSheet/1.0)"}


def fetch(path, attempts=2):
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(BASE + path, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode("utf-8")
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def clean(value):
    return " ".join((value or "").split())


def collect_index():
    records = {}
    for page in range(1, 4):
        document = html.fromstring(fetch(f"/talent/index?per-page=100&page={page}"))
        for row in document.xpath("//table//tbody/tr"):
            cells = row.xpath("./td")
            if len(cells) < 5:
                continue
            links = cells[1].xpath(".//a/@href")
            match = re.search(r"/talent/view/(\d+)", links[0]) if links else None
            if not match:
                continue
            talent_id = int(match.group(1))
            records[talent_id] = {
                "id": talent_id,
                "name": clean(cells[1].text_content()),
                "nameEn": clean(cells[2].text_content()),
                "maximum": clean(cells[3].text_content()),
                "source": clean(cells[4].text_content()),
            }
    return records


def detail(record):
    document = html.fromstring(fetch(f"/talent/view/{record['id']}"))
    fields = {}
    for row in document.xpath("//table//tr"):
        cells = row.xpath("./th|./td")
        if len(cells) >= 2:
            fields[clean(cells[0].text_content())] = clean(cells[1].text_content())
    record.update({
        "requiresSpecialization": fields.get("Требуется уточнение", ""),
        "checks": fields.get("Проверки", ""),
        "description": fields.get("Описание", ""),
    })
    return record


def main():
    records = collect_index()
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        talents = list(pool.map(detail, records.values()))
    talents.sort(key=lambda item: item["name"].casefold())
    target = Path(__file__).resolve().parents[1] / "src" / "data" / "talents.json"
    target.write_text(json.dumps(talents, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(talents)} talents to {target}")


if __name__ == "__main__":
    main()
