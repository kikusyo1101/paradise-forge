# 取り込んだ資産の出自 (THIRD-PARTY NOTICES)

楽園は独立して立つ。しかしその土台の一部は他者の仕事であり、
それを自分のものと偽らないことは、独立の条件である。

---

## everything-claude-code

- **出典**: https://github.com/WorldFlowAI/everything-claude-code
  - 同じハーネスは https://github.com/affaan-m/everything-claude-code としても公開されていた
    (README の「ソース」節が指す URL)。後者は現在 `affaan-m/ECC` へ転送される。
    楽園が取り込んだ commit は前者の履歴に在る。
- **取り込んだ版**: `432485ba6b92c14fb357276a98957f348bcff9ee` (2026-01-23)
- **ライセンス**: MIT
  - 上流リポジトリに `LICENSE` ファイルは存在しないが、`README.md` が
    「MIT - Use freely, modify as needed, contribute back if you can.」と明記している。
    バッジも MIT を指す。この事実に基づき MIT として取り扱う。
  - 取り込み時に LICENSE ファイルが不在であったことを、事実としてここに記録する。
- **取り込んだもの**: `overlay/vendor/` 配下（数は `node graph/vendor.js status` が語る）
  - `agents/` — 汎用の専門家定義
  - `commands/` — スラッシュコマンド
  - `skills/` — 手順書
  - `rules/` — コーディング規約
  - `contexts/` — 文脈の雛形
  - `hooks/` — ライフサイクルフックの定義
  - `scripts/` — フックの実体と補助ライブラリ (Node標準ライブラリのみに依存)
- **楽園による改変**: `overlay/overlay.json` が宣言する範囲に限る。
  改変は原則として配備時の変換 (`graph/apply-models.js` / `graph/apply-spawn.js` による
  位階の規則の適用) として行い、取り込んだファイル自体は上流の状態を保つ。
- **配備しないもの (`drop`)**: 楽園で起動が観測されなかった agents / commands / rules は
  vendor に素材として残すが配備しない。一覧と実測の根拠は `overlay/overlay.json` の `drop`。
  上流由来の hooks / scripts はこの機で実効 0 と実測され、`settings.json` へは配備しない
  (`graph/apply-guards.js FORBIDDEN_HOOKS`)。素材としては vendor に残る。

### MIT License (everything-claude-code)

```
MIT License

Copyright (c) WorldFlowAI and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 取り込んだ道具: archify (第47条)

楽園が己の姿を図にするために取り込んだ**描画器**。ハーネス資産とは出自が違う。

| | |
|---|---|
| 出自 | https://github.com/tt-a1i/archify |
| 版 | v2.16.0 (取り込み時 commit `199360cc6687a7857b54dd188d4922b09e466a4b`) |
| ライセンス | MIT (`overlay/vendor/archify/LICENSE` に原本を同梱) |
| 住所 | `overlay/vendor/archify` |
| 使う者 | `graph/atlas.js` — 位階・道・環を JSON IR に写し、これに渡す |

**取り込みに際して削いだもの**: `scripts/check-update.mjs` と
`scripts/update-contract.mjs`。上流の版を問い合わせる仕組みであり、
**電話をかける vendored 資産は供給線である**(第20条)。実行時にも
`ARCHIFY_UPDATE_CHECK_DISABLED=1` を強制し、`vendor.js verify` が
これらの復活を門で捕らえる。

**改造していない**。楽園が渡すのは型付きの JSON IR だけであり、結合面は
コードではなくスキーマにある(第47条(a))。ゆえに上流の版を上げるときは
`overlay/vendor/archify` を差し替え、`node graph/atlas.js check` が
全主題で緑になるかを見ればよい — 赤は上流が schema を変えた証拠であり、
直すのは `graph/atlas.js` の出力器だけである。

```
MIT License

Copyright (c) 2026 tt-a1i (Archify)
```

---

## 上流の更新をどう扱うか

独立したからといって、上流の進歩を捨てるわけではない。
`graph/upstream.js` は上流が手元に在るときだけ働き、差分を四分類して提示する。
**取り込みは常に人の判断による** (憲法 第19条 (d))。

```bash
node graph/upstream.js impact     # 上流が在れば差分を裁定、無ければ黙る
node graph/vendor.js refresh      # 承認の上で vendor/ を更新する
```

上流が手元に無くても楽園は完全に動く。それが独立ということである。
