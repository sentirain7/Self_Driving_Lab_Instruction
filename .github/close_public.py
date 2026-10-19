#!/usr/bin/env python3
"""기한부 전체 공개 닫기 — GitHub Actions(.github/workflows/close-public.yml)가 기한 뒤에 실행한다.

1. .github/public_until.json 에서 기한(until)이 지난 항목의 전체 공개 사본(remove)을 지운다.
2. 사이트의 모든 .html 에서 기한이 지난 표식을 정리한다.
   <!-- public-until ISO -->…<!-- /public-until -->      → 통째로 삭제(기한 전 안내 · 전체 보기 단추)
   <!-- public-after ISO … /public-after -->              → 주석을 풀어 내용만 남김(기한 뒤 안내)
3. --commit 이면 커밋 · 푸시하고 Pages 빌드를 요청한다.

시험: python3 .github/close_public.py --dry-run --now 2026-10-31T00:00:01+09:00
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG = ROOT / ".github" / "public_until.json"
UNTIL = re.compile(r"<!-- public-until (\S+) -->.*?<!-- /public-until -->\n?", re.S)
AFTER = re.compile(r"<!-- public-after (\S+) (.*?) /public-after -->", re.S)


def run(*cmd: str) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="바꿀 내용만 출력")
    ap.add_argument("--now", help="시험용 현재 시각(ISO 8601, 시간대 포함)")
    ap.add_argument("--commit", action="store_true", help="바꾼 뒤 커밋 · 푸시 · Pages 빌드 요청(Actions)")
    ap.add_argument("--check-push", action="store_true", help="빈 커밋으로 푸시 권한만 확인(--dry-run 과 함께)")
    a = ap.parse_args()
    now = datetime.fromisoformat(a.now) if a.now else datetime.now(timezone.utc)

    def due(iso: str) -> bool:
        return datetime.fromisoformat(iso) <= now

    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    keep, remove = [], []
    for it in cfg["items"]:
        if due(it["until"]):
            remove += [r for r in it["remove"] if (ROOT / r).exists()]
        else:
            keep.append(it)
    edits = []
    for f in sorted(ROOT.rglob("*.html")):
        if ".git" in f.parts or any(f.is_relative_to(ROOT / r) for r in remove):
            continue
        s = f.read_text(encoding="utf-8")
        if "<!-- public-" not in s:
            continue
        t = UNTIL.sub(lambda m: "" if due(m.group(1)) else m.group(0), s)
        t = AFTER.sub(lambda m: m.group(2) if due(m.group(1)) else m.group(0), t)
        if t != s:
            edits.append((f, t))

    print(f"현재 {now.isoformat()} · 기한 지난 항목 {len(cfg['items']) - len(keep)} · 남은 항목 {len(keep)}")
    for r in remove:
        print("  삭제", r)
    for f, _ in edits:
        print("  정리", f.relative_to(ROOT))
    if a.dry_run:
        if a.check_push:
            run("git", "config", "user.name", "github-actions[bot]")
            run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
            run("git", "commit", "--allow-empty", "-q", "-m", "push permission check (not pushed)")
            run("git", "push", "--dry-run", "origin", "HEAD:refs/heads/main")
            run("git", "reset", "--hard", "-q", "HEAD~1")
            run("gh", "api", "-X", "POST", f"repos/{os.environ['GITHUB_REPOSITORY']}/pages/builds")
        print("(시험 실행 — 아무것도 바꾸지 않음)")
        return
    if not remove and not edits and len(keep) == len(cfg["items"]):
        print("할 일 없음")
        return

    for r in remove:
        p = ROOT / r
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    for f, t in edits:
        f.write_text(t, encoding="utf-8")
    cfg["items"] = keep
    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if a.commit:
        run("git", "config", "user.name", "github-actions[bot]")
        run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
        run("git", "add", "-A")
        run("git", "commit", "-q", "-m", "기한부 전체 공개 종료: 전체 공개 사본 삭제 · 쪽 안내를 기한 뒤 판으로(자동)")
        run("git", "push", "origin", "HEAD:refs/heads/main")
        run("gh", "api", "-X", "POST", f"repos/{os.environ['GITHUB_REPOSITORY']}/pages/builds")


if __name__ == "__main__":
    main()
