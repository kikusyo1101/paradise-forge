// 削減見込みの算術を機械に解かせる(第38条: 改善は数値で証明する)。
// 入力はすべて実測値。出典を各行に添える。
const CI_TOTAL=2070;                 // findings §1.1
const SELFTEST=427, CENSUS=423, ABODE=841, ATLAS=335;
const ABODE_REPO=Math.round(ABODE*363/(363+364));   // findings §1.2 実測 363s/364s の比で按分
const ABODE_GLOBAL=ABODE-ABODE_REPO;
const SCALES=6, SUBJECTS=6;
const DRAW_PER_SCALE=1.983;          // u5-atlas-split.txt 実測 (standard 6主題)
const ATLAS_DRAW=DRAW_PER_SCALE*SCALES;
const ATLAS_BROWSER=ATLAS-ATLAS_DRAW;
const INSPECTIONS=SCALES*SUBJECTS*2; // 72 (findings §1.6)
const FOLDABLE_SUBJ=4;               // hierarchy/dispatch/run/wiring — IR種=1 かつ HTML種=1 (u2)
const REDUNDANT=FOLDABLE_SUBJ*(SCALES-1)*2;  // 4主題 × 余分な5道 × 2起動
const KEPT=INSPECTIONS-REDUNDANT;
const p=(x)=>`${x.toFixed(1)}s (${(x/CI_TOTAL*100).toFixed(1)}%)`;
console.log(`CI 1回 = ${CI_TOTAL}s`);
console.log(`Abode(両居) ${ABODE}s の内訳(363:364 で按分): repo=${ABODE_REPO}s / global=${ABODE_GLOBAL}s`);
console.log(`同一入力の自己診断 3 本: Self-test ${SELFTEST}s + Census ${CENSUS}s + Abode-repo ${ABODE_REPO}s = ${SELFTEST+CENSUS+ABODE_REPO}s`);
const P1=CENSUS+ABODE_REPO;
console.log(`\nP-1 自己診断の3重撃ちを1本に: 削減 ${p(P1)}   [残す1本=素の全走 ${SELFTEST}s]`);
console.log(`Atlas ${ATLAS}s の内訳: 図の作成 ${ATLAS_DRAW.toFixed(1)}s / ブラウザ検査 ${ATLAS_BROWSER.toFixed(1)}s (u5 実測 1道2.0s より)`);
console.log(`検査回数 ${INSPECTIONS} 回 / うち余剰 ${REDUNDANT} 回 / 残す ${KEPT} 回  (u2: 4主題はHTMLがバイト同一)`);
const P2=ATLAS_BROWSER*REDUNDANT/INSPECTIONS;
console.log(`P-2 成果物ハッシュで同一HTMLの再検査を畳む: 削減 ${p(P2)}`);
const P3=(ATLAS_BROWSER-P2)*0.12;    // u3-probe 実測 12% 減
console.log(`P-3 Chrome を持ち回す (P-2 の後に適用 / 実測12%減): 削減 ${p(P3)}`);
console.log(`\n合計 P-1+P-2 = ${p(P1+P2)}  → 残り ${(CI_TOTAL-P1-P2).toFixed(0)}s`);
console.log(`合計 P-1+P-2+P-3 = ${p(P1+P2+P3)} → 残り ${(CI_TOTAL-P1-P2-P3).toFixed(0)}s`);
console.log(`\n採らないもの: =global の走行 ${ABODE_GLOBAL}s — 宣言外の状態(~/.claude)に依る(揟2 / findings §1.3)`);
