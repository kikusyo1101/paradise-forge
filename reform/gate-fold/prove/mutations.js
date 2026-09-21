'use strict';
/**
 * prove 相の変異表 (reform/gate-fold)
 *
 * **層**: 1 = build 相の予想した壊し方の再現 / 2 = 偽の緑を狙う自分で発明した変異 /
 *         3 = 門自身の盲点(第62条)/ 4 = 結線(第44条)
 *
 * ⚠️ **`tests/paradise.test.js` は CRLF である。** `'\n'` を含む綴りは一つも当たらない。
 * ゆえにその現物を撃つ変異は `\r\n` で書くか、行内で閉じる置換にする。
 * 走者(`mutate.js`)は**当たらなかった注入を例外にする** —— 当たらない注入で
 * 「鳴らない」と結論するのは第37条違反である。
 */
const B = (s) => Buffer.from(s, 'utf8');
/** 1 度だけ置換する。当たらなければ走者が倒す。 */
const sub = (from, to) => (buf) => {
  const s = buf.toString('utf8');
  let i = s.indexOf(from);
  if (i >= 0) return B(s.slice(0, i) + to + s.slice(i + from.length));
  // **CRLF の現物に LF の綴りは一つも当たらない**(`tests/paradise.test.js` / `graph/census.js` /
  // `graph/atlas.js` / `tribunal.yml` は CRLF)。改行を跨ぐ綴りは CRLF へ直して撃ち直す。
  const crlf = from.replace(/\r?\n/g, '\r\n');
  i = s.indexOf(crlf);
  if (i < 0) return buf;                       // それでも当たらない → 走者が例外にする
  return B(s.slice(0, i) + to.replace(/\r?\n/g, '\r\n') + s.slice(i + crlf.length));
};
const subAll = (from, to) => (buf) => B(buf.toString('utf8').split(from).join(to));

const FOLD = 'graph/fold.js';
const PARADISE = 'tests/paradise.test.js';
const CENSUS = 'graph/census.js';
const ATLAS = 'graph/atlas.js';
const TRIB = '.github/workflows/tribunal.yml';

module.exports = [
  // ══ 第1層 — build 相の予想した壊し方を、自分で撃ち直す(第27条: 子の自己申告を信じない)══

  { id: 'P-01', layer: 1, invented: false, file: FOLD,
    why: '領収書の追記を消す(`append()` の本体を空にする)',
    expect: 'fold: 全走は領収書を刻む が鳴る (AC-01)',
    edit: sub('  withLock(file, () => fs.appendFileSync(file, line), opts);', '  void line;') },

  { id: 'P-02', layer: 1, invented: false, file: FOLD,
    why: '鍵の材料から内容ハッシュを抜き、ファイル名だけにする',
    expect: 'fold: 鍵は中身から採る が鳴る (AC-03 / Jest #8702)',
    edit: sub("    h.update(f); h.update('\\0'); h.update(Buffer.from(fh, 'hex'));",
      "    h.update(f); h.update('\\0');") },

  { id: 'P-03', layer: 1, invented: false, file: FOLD,
    why: '鍵の材料から住処 (PARADISE_ABODE) を抜く',
    expect: 'fold: 住処の宣言は鍵に効く が鳴る (AC-05)',
    edit: sub("  h.update('PARADISE_ABODE='); h.update(mode); h.update('\\0');", '  void mode;') },

  { id: 'P-04', layer: 1, invented: false, file: FOLD,
    why: '領収書の採用条件から `exit === 0` を外す(Tuist #8570 と同型)',
    expect: 'fold: 緑しか畳まない が鳴る (AC-07)',
    edit: sub('  const green = hits.filter(r => r.exit === 0);', '  const green = hits;') },

  { id: 'P-05', layer: 1, invented: false, file: FOLD,
    why: '=global を畳める経路を通す(`if (mode !== \'repo\')` を殺す)',
    expect: 'fold: 宣言外の状態に依る走行は畳まれない が鳴る (AC-10 / 最重量)',
    edit: sub("  if (mode !== 'repo') {", '  if (false) {') },

  { id: 'P-06', layer: 1, invented: false, file: FOLD,
    why: '鍵の比較を常に真へ潰す(何もかも畳む)',
    expect: 'fold: 何もかも畳む機構は測定ではない が鳴る (AC-21)',
    edit: sub('  const hits = rows.filter(r => r.key === k);',
      "  const hits = rows.length ? rows : [{ key: k, exit: 0, summary: '' }];") },

  { id: 'P-07', layer: 1, invented: false, file: FOLD,
    why: 'bails を人間向けの文字列だけにする(構造を潰す)',
    expect: 'fold: bail は機械可読である が鳴る (AC-17)',
    edit: sub('    bails: d.bail ? [{ code: d.bail, subject }] : [],',
      '    bails: d.bail ? [`${d.bail} (${subject})`] : [],') },

  { id: 'P-08', layer: 1, invented: false, file: FOLD,
    why: '--explain の出力から環境変数の欄を消す',
    expect: 'fold: 鍵の材料は数え直せる が鳴る (AC-06)',
    edit: sub("  return { key: h.digest('hex').slice(0, 16), fileCount: rows.length, bytes, env: envs, files: rows };",
      "  return { key: h.digest('hex').slice(0, 16), fileCount: rows.length, bytes, files: rows };") },

  { id: 'P-09', layer: 1, invented: false, file: FOLD,
    why: '追記を read-modify-write に変える(TOCTOU)',
    expect: 'fold: 台帳は並行追記で壊れない が鳴る (AC-25 / NFR-04)',
    edit: sub('  withLock(file, () => fs.appendFileSync(file, line), opts);',
      "  const cur = (() => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } })();\n" +
      '  fs.writeFileSync(file, cur + line);') },

  { id: 'P-10', layer: 1, invented: false, file: FOLD,
    why: '読めない台帳を不在と同じ扱いにする(ledger-unreadable を no-receipt へ潰す)',
    expect: 'fold: bail は閉じた語彙で名乗る が鳴る (AC-16 / 第62条 b ①)',
    edit: sub("    if (e.code === 'ENOENT') return [];", '    return [];') },

  // ══ 第2層 — 偽の緑を狙う、自分で発明した変異 ══

  { id: 'M-01', layer: 2, invented: true, file: FOLD,
    why: '鍵の材料からファイルを 1 本だけ抜く(最後の 1 本を落とす)',
    expect: '門は「材料が 1 本減った」ことに気づくか。fileCount > 100 しか見ていなければ無音',
    edit: sub('  return out.filter(f => !derived.has(f)).sort();',
      '  return out.filter(f => !derived.has(f)).sort().slice(0, -1);') },

  { id: 'M-02', layer: 2, invented: true, file: FOLD,
    why: '**鍵の覆いを `overlay/vendor/archify` だけへ狭める**(prove 相で見つけた元の姿へ戻す)',
    expect: 'prove 相の硬化で建てた門「鍵は門が読む現物を覆う」が鳴るか',
    edit: sub("  walkAll(root, 'overlay', out);", "  walkAll(root, 'overlay/vendor/archify', out);") },

  { id: 'M-02b', layer: 2, invented: true, file: FOLD,
    why: '**根の文書の名簿を空にする**(README / CLAUDE.md / CONSTITUTION.md / .gitignore を鍵から落とす)',
    expect: '同上。名簿が腐れば門が鳴るか',
    edit: sub("const ROOT_DOCS = Object.freeze(['README.md', 'CLAUDE.md', 'CONSTITUTION.md', '.gitignore']);",
      'const ROOT_DOCS = Object.freeze([]);') },

  { id: 'M-03', layer: 2, invented: true, file: FOLD,
    why: '鍵のハッシュを 16 桁 → 8 桁に削る(衝突確率が 2^32 倍になる)',
    expect: '鍵の桁数を検める門が在るか。無ければ衝突が偽の緑を生む',
    edit: sub("  return { key: h.digest('hex').slice(0, 16), fileCount",
      "  return { key: h.digest('hex').slice(0, 8).padEnd(16, '0'), fileCount") },

  { id: 'M-04', layer: 2, invented: true, file: FOLD,
    why: '**長さを変えずに中身を変える** — 内容ハッシュの代わりにバイト数を鍵に混ぜる',
    expect: '長さ検査に逃げた鍵を門が捕らえるか(これが捕まらなければ鍵は中身を見ていない)',
    edit: sub("    h.update(f); h.update('\\0'); h.update(Buffer.from(fh, 'hex'));",
      "    h.update(f); h.update('\\0'); h.update(String(buf.length));") },

  { id: 'M-05', layer: 2, invented: true, file: FOLD,
    why: '`find()` の緑の条件を `exit == 0`(緩い等号)にする — 文字列 "0" や false を緑と読む',
    expect: '境界の型を検める門が在るか。無ければ偽造された領収書が畳みの根拠になる',
    edit: sub('  const hits = rows.filter(r => r.key === k && r.exit === 0);',
      '  const hits = rows.filter(r => r.key === k && r.exit == 0);') },

  { id: 'M-06', layer: 2, invented: true, file: FOLD,
    why: '`say()` の reused を total から採らず定数 1 にする(恒等式は形だけ残る)',
    expect: '`Executed E out of N` の恒等式 E+reused=N を外から検める門が在るか',
    edit: sub('  const reused = total - executed;', '  const reused = 1;') },

  { id: 'M-07', layer: 2, invented: true, file: FOLD,
    why: '`inspected().closed()` を常に真にする(P-2 の恒等式の錠を殺す)',
    expect: '錠が本当に外に立っているか。呼び手が closed() を見ていなければ無音',
    edit: sub('    closed() { return executed + reused === total; },', '    closed() { return true; },') },

  { id: 'M-07b', layer: 2, invented: true, file: FOLD,
    why: '**硬化後の再撃**: `tally()` の中の恒等式の錠を殺す(数を配る口の上の錠)',
    expect: 'prove 相の硬化で建てた門「P-2 の恒等式の錠は数を配る口の上に立つ」が鳴るか',
    edit: sub('      if (executed + reused !== total) {', '      if (false) {') },

  { id: 'M-08', layer: 2, invented: true, file: FOLD,
    why: '成果物の鍵を **HTML の先頭 1KB だけ**から採る(後ろの差を見逃す)',
    expect: 'AC-11 の「鍵は成果物のバイト列」を門が振る舞いで検めるか',
    edit: sub("  const buf = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);\n  const h = crypto.createHash('sha256');\n  h.update(buf);",
      "  const buf0 = Buffer.isBuffer(fileOrBuffer) ? fileOrBuffer : fs.readFileSync(fileOrBuffer);\n  const buf = buf0.slice(0, 1024);\n  const h = crypto.createHash('sha256');\n  h.update(buf);") },

  { id: 'M-09', layer: 2, invented: true, file: FOLD,
    why: 'BAIL_CODES に語彙外の語 `whatever` を足す(閉じた語彙を開く)',
    expect: 'fold: bail は閉じた語彙で名乗る が 7 語を凍らせているか',
    edit: sub("  'ledger-unreadable',  // 台帳が読めない", "  'whatever',\n  'ledger-unreadable',  // 台帳が読めない") },

  { id: 'M-10', layer: 2, invented: true, file: ATLAS,
    why: '`--no-fold` を受け取るが黙殺する(旗は通るが `folding` は常に真)',
    expect: 'AC-18「三者で同じ意味」を**振る舞いで**検める門が在るか(ソース grep だけなら無音)',
    edit: sub("  const folding = !(opts.noFold || process.env.PARADISE_NO_FOLD === '1');",
      '  const folding = true;') },

  { id: 'M-11', layer: 2, invented: true, file: CENSUS,
    why: 'census の畳みを `--no-fold` でも切らない(領収書を必ず読む)',
    expect: '同上。census 側の出口が振る舞いで検められているか',
    edit: sub("      const receipt = opts.noFold || process.env.PARADISE_NO_FOLD === '1'\n        ? null : fold.find(fold.key());",
      '      const receipt = fold.find(fold.key());') },

  { id: 'M-12', layer: 2, invented: true, file: FOLD,
    why: '台帳の壊れた行を黙って読み飛ばす(broken を数えない)',
    expect: 'AC-16 の「壊れた JSON は ledger-unreadable」が鳴るか',
    edit: sub('    try { out.push(JSON.parse(s)); } catch { broken++; }',
      '    try { out.push(JSON.parse(s)); } catch { /* skip */ }') },

  { id: 'M-13', layer: 2, invented: true, file: FOLD,
    why: '領収書の形の検めを外す(validateReceipt を素通しにする)',
    expect: '壊れた形の領収書が台帳に入る。門は形の契約を検めるか',
    edit: sub('function validateReceipt(r) {\n  if (!r || typeof r !== \'object\') throw new Error(\'fold: 領収書が物ではない\');',
      "function validateReceipt(r) {\n  return r;\n  /* eslint-disable */ if (!r || typeof r !== 'object') throw new Error('fold: 領収書が物ではない');") },

  // ── 第2層(続き)— 走行の名乗りを殺す変異 ──

  { id: 'M-14', layer: 2, invented: true, file: PARADISE,
    why: '**出力行を `process.exit` の後ろへ移す**(死にコード化)。畳んだ走行が写し元を名乗らなくなる',
    expect: 'AC-12「写し元を名指す」が全走の畳みについても検められているか',
    // CRLF。`sub` が CRLF へ直して当てる。**最初の一致だけを置き換える** ——
    // 硬化で建てた門の本文にも同じ綴りが在るので、そちらを壊してはならない。
    edit: (buf) => {
      const s = buf.toString('utf8');
      const from = '    SAY(`Paradise fold: 写し元の領収書 at=${d.receipt.at} exit=${d.receipt.exit} key=${d.key}\\n`);\r\n    process.exit(0);';
      const to = '    process.exit(0);\r\n    SAY(`Paradise fold: 写し元の領収書 at=${d.receipt.at} exit=${d.receipt.exit} key=${d.key}\\n`);';
      const i = s.indexOf(from);
      if (i < 0) return buf;
      return B(s.slice(0, i) + to + s.slice(i + from.length));
    } },

  { id: 'M-15', layer: 2, invented: true, file: PARADISE,
    why: '恒等式の錠の判定を `!==` から `>` へ弱める(境界文字の変異)',
    expect: 'AC-15 の錠が **形** だけでなく **効き** で検められているか',
    edit: sub('if (E + reused !== N) {', 'if (E + reused > N) {') },

  { id: 'M-16', layer: 2, invented: true, file: PARADISE,
    why: '領収書の刻みを `!GATE.active` の枝の**外**へ出す(絞り込み走行が領収書を刻み、部分が全体を騙る)',
    expect: 'AC-02 の門が鳴るか(fold.test.js は `call > guard` の位置関係を静的に読む)',
    edit: (buf) => {
      const s = buf.toString('utf8');
      const guard = 'if (!GATE.active) {\r\n  const summary = `Paradise self-test:';
      const i = s.indexOf(guard);
      if (i < 0) return buf;
      // **枝の条件を常に真へ潰す。** 絞り込み走行も総括を出し、領収書を刻む。
      return B(s.slice(0, i) + 'if (true) {\r\n  const summary = `Paradise self-test:' + s.slice(i + guard.length));
    } },

  // ══ 第3層 — 門自身の盲点(第62条)。**門を空転させる** ══

  { id: 'B-01', layer: 3, invented: true, file: 'tests/fold.test.js',
    why: '撃ちのループを空にする(AC-11 の 72 検査の loop から SCALES を空配列へ)',
    expect: '空転した門が緑を名乗らないか。`f([])` が空転する形の検出(第37条)',
    edit: sub("    const SCALES = ['quick', 'standard', 'full', 'reform', 'counsel', 'cartography'];",
      '    const SCALES = [];'),
    suites: ['fold'] },

  { id: 'B-02', layer: 3, invented: true, file: 'tests/fold.test.js',
    why: '**注入が当たったことの検めを消す** — `withMutant` の `assert.notStrictEqual(broken, src)` を殺す',
    expect: '門が己の空転に気づくか。当たらない注入で「鳴った」と読む形が残っていないか',
    edit: sub("  assert.notStrictEqual(broken, src,\n    '故障注入が当たらなかった", "  void 0 && assert.notStrictEqual(broken, src,\n    '故障注入が当たらなかった"),
    suites: ['fold'] },

  { id: 'B-03', layer: 3, invented: true, file: 'tests/fold.test.js',
    why: '**負の fixture を問う**: AC-16 の「健全な decide が倒れない」assert を消す',
    expect: '門の中の「無罪と宣言した形」が消えても誰も気づかないか',
    edit: sub("    assert.ok(!threw, '健全な decide が倒れた');", '    void threw;'),
    suites: ['fold'] },

  // ══ 第4層 — 結線(第44条)══

  { id: 'W-01', layer: 4, invented: false, file: TRIB,
    why: 'CI の `📒 Fold` 段を黙って消す(tests/fold.test.js を誰も走らせない)',
    expect: 'wiring.js check が「孤児の門」として名指すか (第44条 b)',
    edit: (buf) => {
      const s = buf.toString('utf8');
      // CRLF。段の切れ目は `\r\n      - name: ` である
      const key = '      - name: 📒 Fold';
      const i = s.indexOf(key);
      if (i < 0) return buf;
      const j = s.indexOf('\r\n      - name: ', i + key.length);
      if (j < 0) return buf;
      return B(s.slice(0, i) + s.slice(j + 2));
    },
    suites: ['wiring', 'fold', 'resident'] },

  { id: 'W-02', layer: 4, invented: true, file: TRIB,
    why: 'Self-test 段から `PARADISE_FOLD_LEDGER` の行を**丸ごと消す**(領収書が刻まれなくなる)',
    expect: 'AC-23 の門(`/PARADISE_FOLD_LEDGER/.test(selfTest)`)が鳴るか',
    edit: (buf) => {
      const s = buf.toString('utf8');
      // Self-test 段(先頭に在る方)の 1 本だけを消す
      const line = '          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl\r\n';
      const i = s.indexOf(line);
      if (i < 0) return buf;
      return B(s.slice(0, i) + s.slice(i + line.length));
    },
    suites: ['fold', 'resident'] },

  { id: 'W-04', layer: 4, invented: true, file: TRIB,
    why: 'Self-test 段の `PARADISE_FOLD_LEDGER` を **`..._DISABLED` へ改名**する(綴りは残るが変数は死ぬ)',
    expect: 'AC-23 の門は部分一致で読む。改名を捕らえるか、それとも綴りの影で通すか',
    edit: sub('          PARADISE_FOLD_LEDGER: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl',
      '          PARADISE_FOLD_LEDGER_DISABLED: ${{ github.workspace }}/.claude/paradise-fold-ledger.jsonl'),
    suites: ['fold', 'resident'] },

  { id: 'W-03', layer: 4, invented: true, file: TRIB,
    why: '📒 Fold 段から `PARADISE_NO_FOLD: \'1\'` を抜く(門を見張る段自身が畳まれうる)',
    expect: 'fold: 全走が一本も走らない CI は測定ではない が鳴るか',
    edit: sub("          PARADISE_NO_FOLD: '1'", "          PARADISE_NO_FOLD_X: '1'"),
    suites: ['fold', 'resident'] },
];
