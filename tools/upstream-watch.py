#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
upstream-watch.py — 借り物の動きを見張る番人 (憲法 第19条)

no_agent cron から呼ばれる。仕事は三つだけ:
  1. 上流を fetch する (merge はしない)
  2. 影響を裁定させる (SAFE / REVIEW / BLOCK)
  3. 報告すべきことがある時だけ喋る

沈黙が既定である。何も変わっていない日に通知が飛ぶと、人は通知を見なくなる。
そして本当に判断が要る日の通知も見逃す。だから SAFE かつ差分ゼロなら何も出さない。

取り込み (adopt) は決して自動で行わない。機械は fetch し、分類し、警告する。
「取れ」と言えるのは人だけである(憲法 第19条 (d))。
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(args, timeout=180):
    """node を叩いて (exit_code, stdout) を返す。落ちても例外にしない。"""
    try:
        p = subprocess.run(
            ["node"] + args, cwd=ROOT, capture_output=True, text=True,
            timeout=timeout, encoding="utf-8", errors="replace",
        )
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:  # noqa: BLE001 — 番人は決して落ちない
        return 1, "watch error: %s" % e


def main():
    # 1. 取りに行く。merge はしない。
    code, out = run([os.path.join("graph", "upstream.js"), "fetch"])
    if code != 0:
        # fetch できないのは異常。黙ってはいけない。
        print("🔴 楽園の番人: 上流の取得に失敗しました\n")
        print(out.strip()[:800])
        return 0

    try:
        fetched = json.loads(out)
    except Exception:
        fetched = {}
    behind = int(fetched.get("behind") or 0)

    # 2. 影響を裁定させる。
    code, raw = run([os.path.join("graph", "upstream.js"), "impact", "--json"])
    try:
        imp = json.loads(raw)
    except Exception:
        imp = {"verdict": "BLOCK", "reasons": ["impact の解析に失敗: " + raw.strip()[:300]]}

    verdict = imp.get("verdict", "BLOCK")
    reasons = imp.get("reasons", [])
    decisions = imp.get("decisions", [])

    # 3. 沈黙が既定。変化が無く健全なら何も言わない。
    if verdict == "SAFE" and behind == 0:
        return 0

    icon = {"SAFE": "🟢", "REVIEW": "🟡", "BLOCK": "🔴"}.get(verdict, "⚪")
    lines = ["%s **上流監視 — %s**" % (icon, verdict), ""]

    if behind:
        lines.append("everything-claude-code に **%d件** の未取り込みコミットがあります。" % behind)
    for c in (imp.get("commits") or [])[:8]:
        lines.append("  · " + c)
    if behind > 8:
        lines.append("  … 他 %d件" % (behind - 8))
    lines.append("")

    for why in reasons[:6]:
        lines.append("- " + why)

    if decisions:
        lines.append("")
        lines.append("**人の判断を要する変更:**")
        for d in decisions[:8]:
            kind = {"D": "上流が削除", "A": "上流に追加", "M": "上流が変更"}.get(d.get("status"), d.get("status"))
            lines.append("  · %s — `%s` (%s)" % (kind, d.get("file"), d.get("relation")))

    lines.append("")
    if verdict == "BLOCK":
        lines.append("**取り込みは拒否されています。** 上記を解消してから再試行してください。")
        lines.append("借り物のワークツリーが汚れているか、楽園のコードが上流本体へ注入されています。")
    elif verdict == "REVIEW":
        lines.append("**自動取り込みはしません。** 判断の上で:")
        lines.append("```")
        lines.append("node graph/upstream.js diff        # 何が変わるか見る")
        lines.append("node graph/upstream.js adopt       # dry-run で計画を見る")
        lines.append("node graph/upstream.js adopt --yes --force   # 承認して取り込む")
        lines.append("node graph/deploy.js --write && node tests/paradise.test.js")
        lines.append("```")
    else:
        lines.append("楽園の overlay に触れない変更のみです。取り込みは安全に行えます:")
        lines.append("```")
        lines.append("node graph/upstream.js adopt --yes && node graph/deploy.js --write")
        lines.append("```")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
