# 工具協調與寫入政策（service）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

協調七個工具、精確 ID、完整性標記、搜尋預算、核准快照、冪等操作與結果確認。

## 契約與不變條件

此元件協調核准、搜尋、防重與結果確認；[PRD](../../docs/PRD.md) 是業務意圖與 R ID 驗收權威，[index.ts](index.ts) 是目前流程與回傳行為。機器輸入來自 [domain schema](../domain/index.ts)，資料結構來自 [Store DDL](../storage/index.ts)。

不得由 handler 繞過 service 寫入；架構相依政策見 [Router](../../docs/INDEX.md)。結果不明不重送的意圖見 PRD R07，持久化取捨見 [DECISIONS](../../docs/DECISIONS.md) D016／Q04；不要把範例核准或程式狀態當成真人授權。目前真實寫入 gate、搜尋預算、核准期限與狀態分支由實作及下方測試呈現，不另維護數值副本。

## Real writes (D039, D041)

Real writes stay `REAL_WRITES_DISABLED` unless a `RealWrites` value is injected at construction. `direct` approves and claims in one synchronous step on the first call, so a concurrent call with the same key cannot write. `local-approval` uses the existing ledger flow: propose, then `claim` only after `approveOperation` bound the connection, operation and digest and confirmed the task still matches its snapshot. `proposalView` and the decision methods read only ledger content and are scoped to this connection. A demo approval callback is ignored for real adapters. The demo list allowlist does not apply to real writes. Under D040 the ledger keeps content only until a decision: it is removed at claim, before the Google call, and success stores only list and task IDs, so replay reads Google and returns `replayed: true`. An expired proposal fails as `OPERATION_FAILED` and needs a new key.

## 檔案與定位

- [src/service/index.ts](index.ts)

依賴元件：[domain](../domain/SPEC.md)、[google](../google/SPEC.md)、[storage](../storage/SPEC.md)。

使用此元件：[mcp](../mcp/SPEC.md)、[local](../local/SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[service](../../tests/service.test.ts)、[mcp](../../tests/mcp.test.ts)。

## 驗證

`npx vitest run tests/service.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：集中工具協調元件並連結依賴與測試，明確保留搜尋完整性、核准及真實寫入拒絕的既有政策。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：依寫入工具分支解析精確型別，移除該路徑的非空斷言而不改授權
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-30

- 決策／原因／取捨：以service來源描述現況並引用PRD驗收與既有決策，刪除活躍重複契約且不推定新業務承諾
- 驗證：79產品測試、兩協定合成CRUD與防重恢復通過；真人及Google本輪未測

### 2026-11-05

- 決策／原因／取捨：Open proposal-first real writes only when RealWrites is injected; reuse ledger, snapshot and claim instead of a second approval path (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Clear ledger content at claim and store only IDs on success; replay reads Google and expiry needs a new key (D040)
- 驗證：pinned-image vitest: 146 tests in 10 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Default real writes to direct after the connection grant: approve and claim synchronously so concurrent same-key calls cannot write; per-write approval stays as a mode (D041)
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

<!-- component-snapshot
{
  "src/service/index.ts": "7d73a48d5c56ecaa530ee89495ef7abd1f30453321b4c605a6cca5e32c1df618",
  "src/service/SPEC.md": "92e7257729654d809b7ff972a888de13561b7b2d85eac94075028fd116dca3ef"
}
-->
