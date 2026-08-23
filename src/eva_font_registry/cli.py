from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

FONT_EXTENSIONS = {".ttf", ".otf", ".ttc", ".otc", ".woff", ".woff2"}
OPEN_LICENSE_PATTERNS = {
    "OFL-1.1": ("open font license", "scripts.sil.org/ofl"),
    "Apache-2.0": ("apache license", "apache.org/licenses/license-2.0"),
    "Ubuntu-Font-1.0": ("ubuntu font licence", "ubuntu.com/legal/font-licence"),
}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _name(font: TTFont, name_id: int) -> str | None:
    value = font["name"].getDebugName(name_id) if "name" in font else None
    return value.strip() if value else None


def _face(font: TTFont, index: int) -> dict[str, Any]:
    license_text = _name(font, 13)
    license_url = _name(font, 14)
    license_blob = f"{license_text or ''} {license_url or ''}".lower()
    signals = [license_id for license_id, needles in OPEN_LICENSE_PATTERNS.items() if any(n in license_blob for n in needles)]
    os2 = font.get("OS/2")
    return {
        "faceIndex": index,
        "family": _name(font, 1) or _name(font, 16) or "Unknown",
        "subfamily": _name(font, 2) or _name(font, 17),
        "postscriptName": _name(font, 6),
        "weight": int(getattr(os2, "usWeightClass", 400)),
        "style": "italic" if getattr(os2, "fsSelection", 0) & 1 else "normal",
        "embeddingFsType": int(getattr(os2, "fsType", 0)),
        "licenseSignal": signals[0] if signals else "review",
        "licenseText": license_text,
        "licenseUrl": license_url,
    }


def _read_faces(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() in {".ttc", ".otc"}:
        collection = TTCollection(path, lazy=True)
        try:
            return [_face(font, index) for index, font in enumerate(collection.fonts)]
        finally:
            collection.close()
    font = TTFont(path, lazy=True)
    try:
        return [_face(font, 0)]
    finally:
        font.close()


def scan(source: Path, output: Path, raw_prefix: str) -> None:
    assets: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for path in sorted(p for p in source.rglob("*") if p.is_file() and p.suffix.lower() in FONT_EXTENSIONS):
        relative = path.relative_to(source).as_posix()
        try:
            assets.append({
                "sha256": _sha256(path),
                "sourcePath": relative,
                "rawKey": f"{raw_prefix.rstrip('/')}/{relative}",
                "format": path.suffix.lower().lstrip("."),
                "fileSize": path.stat().st_size,
                "faces": _read_faces(path),
            })
        except Exception as error:  # inventory must retain unreadable legacy files
            errors.append({"sourcePath": relative, "error": str(error)})
    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceRoot": source.name,
        "assets": assets,
        "errors": errors,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"inventory: {len(assets)} readable files, {len(errors)} errors -> {output}")


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "font"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build(source: Path, inventory_path: Path, approvals_path: Path, output: Path, base_url: str, text_file: Path | None) -> None:
    inventory = _load_json(inventory_path)
    approvals = {item["sha256"]: item for item in _load_json(approvals_path).get("approvals", [])}
    subset_text = text_file.read_text(encoding="utf-8") if text_file else None
    records: list[dict[str, Any]] = []
    output.mkdir(parents=True, exist_ok=True)
    fonts_output = output / "fonts"
    fonts_output.mkdir(parents=True, exist_ok=True)

    for asset in inventory.get("assets", []):
        approval = approvals.get(asset["sha256"])
        if not approval or approval.get("approved") is not True:
            continue
        if not approval.get("licenseId") or not approval.get("evidence"):
            raise SystemExit(f"approval lacks licenseId/evidence: {asset['sourcePath']}")
        source_path = (source / asset["sourcePath"]).resolve()
        if not source_path.is_relative_to(source.resolve()) or _sha256(source_path) != asset["sha256"]:
            raise SystemExit(f"source/hash mismatch: {asset['sourcePath']}")
        for face in asset["faces"]:
            font = TTFont(source_path, fontNumber=int(face["faceIndex"]), recalcTimestamp=False)
            try:
                if subset_text:
                    options = subset.Options()
                    options.flavor = "woff2"
                    options.layout_features = ["*"]
                    subsetter = subset.Subsetter(options=options)
                    subsetter.populate(text=subset_text)
                    subsetter.subset(font)
                font.flavor = "woff2"
                filename = f"{_slug(face['family'])}-{_slug(face.get('subfamily') or 'regular')}-{asset['sha256'][:10]}.woff2"
                font.save(fonts_output / filename, reorderTables=True)
            finally:
                font.close()
            records.append({
                "family": face["family"], "subfamily": face.get("subfamily"), "weight": face["weight"],
                "style": face["style"], "licenseId": approval["licenseId"], "sha256": asset["sha256"],
                "url": f"{base_url.rstrip('/')}/fonts/{filename}", "file": f"fonts/{filename}",
            })
    write_release_files(records, output, base_url)
    print(f"release: {len(records)} approved faces -> {output}")


def write_release_files(records: list[dict[str, Any]], output: Path, base_url: str) -> None:
    css = ["/* Generated by eva-font-registry. Do not edit. */"]
    for record in records:
        css.extend([
            "@font-face {", f"  font-family: {json.dumps(record['family'], ensure_ascii=False)};",
            f"  src: url({json.dumps(record['url'])}) format('woff2');", f"  font-weight: {record['weight']};",
            f"  font-style: {record['style']};", "  font-display: swap;", "}",
        ])
    (output / "fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    manifest = {"schemaVersion": 1, "generatedAt": datetime.now(UTC).isoformat(), "baseUrl": base_url, "fonts": records}
    (output / "font-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def quality(source: Path, inventory_path: Path, approvals_path: Path) -> None:
    inventory = _load_json(inventory_path)
    approvals = {item["sha256"]: item for item in _load_json(approvals_path).get("approvals", []) if item.get("approved") is True}
    paths = [str(source / item["sourcePath"]) for item in inventory.get("assets", []) if item["sha256"] in approvals]
    if not paths:
        print("quality: no approved fonts")
        return
    result = subprocess.run(["fontbakery", "check-universal", "--succinct", *paths], check=False)
    raise SystemExit(result.returncode)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(prog="eva-font", description="Private-in, reviewed-public font pipeline")
    commands = root.add_subparsers(dest="command", required=True)
    scan_cmd = commands.add_parser("scan", help="create a private font inventory")
    scan_cmd.add_argument("source", type=Path); scan_cmd.add_argument("--output", type=Path, required=True)
    scan_cmd.add_argument("--raw-prefix", default="raw/icloud-fonts")
    build_cmd = commands.add_parser("build", help="build WOFF2 for exact approved hashes only")
    build_cmd.add_argument("source", type=Path); build_cmd.add_argument("--inventory", type=Path, required=True)
    build_cmd.add_argument("--approvals", type=Path, required=True); build_cmd.add_argument("--output", type=Path, required=True)
    build_cmd.add_argument("--base-url", required=True, help="public prefix, e.g. https://font.evainc.cn/public")
    build_cmd.add_argument("--text-file", type=Path)
    quality_cmd = commands.add_parser("quality", help="run FontBakery on approved source fonts")
    quality_cmd.add_argument("source", type=Path); quality_cmd.add_argument("--inventory", type=Path, required=True)
    quality_cmd.add_argument("--approvals", type=Path, required=True)
    return root


def main() -> None:
    args = parser().parse_args()
    if args.command == "scan": scan(args.source, args.output, args.raw_prefix)
    elif args.command == "build": build(args.source, args.inventory, args.approvals, args.output, args.base_url, args.text_file)
    elif args.command == "quality": quality(args.source, args.inventory, args.approvals)


if __name__ == "__main__":
    main()
