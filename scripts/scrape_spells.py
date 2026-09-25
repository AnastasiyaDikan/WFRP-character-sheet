#!/usr/bin/env python3
"""Build the offline spell reference from the public WFRP.su spell tables."""
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
    for page in range(1, 6):
        document = html.fromstring(fetch(f"/spell/index?per-page=100&page={page}"))
        for row in document.xpath("//table//tbody/tr"):
            cells = row.xpath("./td")
            if len(cells) < 6:
                continue
            links = cells[1].xpath(".//a/@href")
            if not links:
                continue
            match = re.search(r"/spell/view/(\d+)", links[0])
            if not match:
                continue
            spell_id = int(match.group(1))
            records[spell_id] = {
                "id": spell_id,
                "name": clean(cells[1].text_content()),
                "nameEn": clean(cells[2].text_content()),
                "school": clean(cells[3].text_content()),
                "castingNumber": clean(cells[4].text_content()),
                "source": clean(cells[5].text_content()),
            }
    return records


def detail(record):
    document = html.fromstring(fetch(f"/spell/view/{record['id']}"))
    fields = {}
    for row in document.xpath("//table//tr"):
        cells = row.xpath("./th|./td")
        if len(cells) >= 2:
            fields[clean(cells[0].text_content())] = clean(cells[1].text_content())
    record.update({
        "range": fields.get("Дальность", ""),
        "target": fields.get("Цель", ""),
        "duration": fields.get("Длительность", ""),
        "description": fields.get("Описание", ""),
    })
    return record


def main():
    records = collect_index()
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        spells = list(pool.map(detail, records.values()))
    spells.sort(key=lambda item: item["name"].casefold())
    target = Path(__file__).resolve().parents[1] / "src" / "data" / "spells.json"
    target.write_text(json.dumps(spells, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(spells)} spells from {len(set(x['school'] for x in spells))} schools to {target}")


if __name__ == "__main__":
    main()
