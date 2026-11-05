# 領域契約（domain）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

定義七項工具輸入 schema、Task／TaskList／Context、TasksAdapter、日期編碼、雜湊與安全錯誤。

## 契約與不變條件

此元件是輸入契約的 Code-first 來源；欄位、上限、預設值及驗證以 [index.ts](index.ts) 的 schemas、dateOnly、requireTaskVersion 為準，adapter 的可寫 payload 型別由既有 Zod 推導。不在規格手抄第二份參數表。

業務日期的意義、未支援範圍與驗收由 [PRD](../../docs/PRD.md) 定義；型別本身不能證明外部資料已驗證。變更時比對已確認意圖與實際行為，不能以既有實作推定新需求。

## 檔案與定位

- [src/domain/index.ts](index.ts)

使用此元件：[src](../SPEC.md)、[storage](../storage/SPEC.md)、[google](../google/SPEC.md)、[service](../service/SPEC.md)、[demo](../demo/SPEC.md)、[mcp](../mcp/SPEC.md)、[local](../local/SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[domain](../../tests/domain.test.ts)、[service](../../tests/service.test.ts)、[google](../../tests/google.test.ts)。

## 驗證

`npx vitest run tests/domain.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：領域型別與日期驗證移入獨立資料夾，記錄共用契約、依賴使用者及對應測試；行為維持既有範圍。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：以既有 Zod 推導可寫欄位型別，避免 adapter 接受任意資料
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-30

- 決策／原因／取捨：初次公開提交前移除既有單行尾端空白，保持型別與執行契約不變
- 驗證：git whitespace檢查定位既有空白，完整check於提交前重跑

### 2026-10-30

- 決策／原因／取捨：輸入契約直接引用既有Zod來源，保留PRD意圖與元件歷史，避免手寫參數複本
- 驗證：typecheck及79產品測試通過，未修改產品來源

### 2026-10-30

- 決策／原因／取捨：語意複核限定Zod推導敘述於可寫payload，避免誤稱整個adapter介面生成
- 驗證：來源型別宣告已核對；前次79產品及完整check通過，本輪只改規格用語

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

<!-- component-snapshot
{
  "src/domain/index.ts": "02ba85e3b1888b8245b862927349ceaaf66c232a42736bf32230730898299bf7",
  "src/domain/SPEC.md": "f6f7d38ab4dcafebd152f85fe8b300435b4d5314b8646ed7e3df2b3d6c434724"
}
-->
