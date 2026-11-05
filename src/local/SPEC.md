# 本機執行環境與 Google 接線（local）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

組合 demo runtime 與 Google 本機只讀 runtime；管理本機金鑰、client JSON、vault 及連線綁定。

## 契約與不變條件

資料位於 TASKS_DATA_DIR 或 .data；金鑰與憑證不可加入 Git。Google identity 由本機可信 context 建立，新連線不可讓舊 stdio 沿用。使用真實憑證與帳號仍需明確授權。`googleLocal(createKey, writeTest)` 的第二參數預設 false；唯讀與測試用讀寫 scope 明確區分，不因已存憑證自行提升權限。

已明確授權的 CRUD 測試只操作當次新建清單與合成任務。批次及每個寫入先保存帳號隔離紀錄，以 pending → in_flight 原子預留；失敗或中斷禁止重送，不依標題尋回。清理前須確認完整清單只剩本次任務且無指派任務；出現額外資料即停止。此維護入口不核准正式 MCP 操作。

固定 CRUD 維護測試的修改與完成使用上一步 Google 回應的 etag 作 If-Match，並將預期版本納入各步持久化 payload；缺少版本拒絕。此變更不新增任何真實批次授權，也不開啟正式 MCP 寫入。

The separate conditional-update batch in `authorizedConditionalUpdateTest` is prepared for Q05; execution requires a new explicit owner authorization. It creates one dedicated list/task, performs a valid versioned update, requires a changed ETag, deliberately submits the old ETag exactly once, requires HTTP 412, and reads back all decoded task fields unchanged before proceeding to completion and guarded cleanup. An accepted stale write, changed read-back, missing version, unknown outcome or unexpected data stops the batch without automatic cleanup/retry. Its batch and step journals use separate tool namespaces from the historically authorized CRUD batch and remain account scoped. A cached successful harness report does not invoke the token callback or Google API. The CLI still opens the local configuration and encrypted connection to select the account-scoped journal. Neither this harness nor its report authorizes MCP writes or proves trusted human confirmation; clearing due is outside this test.

## Real write wiring (D039)

`service()` accepts an optional `RealWrites` value and passes it through. Without one the service stays read-only for Google. OAuth scope selection is unchanged: the runtime tolerates a read/write grant, and only the explicit `--write-test` connection requests it.

## 檔案與定位

- [disconnect.ts](disconnect.ts)：revoke at Google, remove local credentials, keep the ledger (D048).
- [src/local/google-local.ts](google-local.ts)
- [src/local/crud-test.ts](crud-test.ts)
- [src/local/runtime.ts](runtime.ts)

依賴元件：[demo](../demo/SPEC.md)、[domain](../domain/SPEC.md)、[google](../google/SPEC.md)、[service](../service/SPEC.md)、[storage](../storage/SPEC.md)。

使用此元件：[src](../SPEC.md)。

相關案例：[google-local](../../tests/google-local.test.ts)、[crud-test](../../tests/crud-test.test.ts)。Conditional-update invocation and pending real-test authorization are documented in [RELEASE_PLAN](../../docs/RELEASE_PLAN.md).

## 驗證

`npx vitest run tests/google-local.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：集中本機 demo 與 Google 接線，保留既有設定及連線隔離，補齊來源與測試導覽。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：明確區分唯讀與已授權測試讀寫的 OAuth scope，保留 MCP 寫入保護並處理 refresh 權限包含關係
- 驗證：typecheck 通過，56 個合成測試通過；Google tokeninfo 僅確認既有 token 為唯讀；真實 CRUD 待重新授權

### 2026-10-27

- 決策／原因／取捨：新增已獲明確人類授權的固定 CRUD 維護測試，保留 MCP 寫入 gate，加入原子紀錄與清理拒絕條件
- 驗證：typecheck 與 62 合成案例通過；真實 token 讀寫 scope 已確認，容器與 CRUD 待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-11-04

- 決策／原因／取捨：Prepare a separately authorized fixed Q05 stale-ETag maintenance batch; require HTTP 412 plus unchanged read-back, isolate its journal from historical CRUD, and stop unknown or unsafe outcomes without cleanup/retry.
- 驗證：Fixed-environment typecheck and initial 13 CRUD harness MSW cases passed; additional unchanged-ETag and guarded-cleanup cases and full check remain pending. No credentials or Google endpoint accessed.

### 2026-11-04

- 決策／原因／取捨：Record completed fixed-environment validation and independent read-only review of the separately authorized conditional-update harness; preserve synthetic-only and real-execution authorization limits.
- 驗證：Fixed container full check passed: 89 product cases including 15 harness cases, 9 developer-tool cases, 14 component checks, typecheck and build. All four synthetic rehearsals passed; invalid CLI arguments refused before credential access. Independent review found no concrete defect; its host test could not load the local dependency. Real Google and human acceptance not run.

### 2026-11-04

- 決策／原因／取捨：Record production-only conditional-test artifact and smoke evidence; clarify cached harness reports skip token acquisition, while the CLI still reads local configuration and account connection.
- 驗證：Production runtime build and non-root network-disabled in-memory integrity/module smoke exited 0; unexpected CLI argument safely refused with VALIDATION_ERROR. Prior fixed full check passed 89 product and 9 developer-tool cases. No real Google call or credential mount; explicit execution authorization pending.

### 2026-11-05

- 決策／原因／取捨：Pass optional RealWrites through service(); OAuth scope behavior unchanged (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Fix final review findings (D049): consent always needs the owner code, cookie scoped to approvals, truthful disconnect reporting with lock before revoke and a timeout, replay protection documented as per connection, refuse unmountable paths, drop Dependabot version PRs.
- 驗證：Full image check, test:synthetic, launcher tests; new disconnect cases. Not re-reviewed.

<!-- component-snapshot
{
  "src/local/crud-test.ts": "c6183378b4b0a2f7caee0037bf038a10529c41c1555d0244a2695394fe850216",
  "src/local/disconnect.ts": "674ddb9eb8dda64dd44b1ecdd2ea56a086cd3f61db13874ff39a66b917facb77",
  "src/local/google-local.ts": "34ce7bbf4064266aac5f287e7b3fc4259ea88b338efb32995e9142120c51272c",
  "src/local/runtime.ts": "67c8b04432efbd2dd57801a756d059ff0de9984d27617e0c533ddab50738d565",
  "src/local/SPEC.md": "348fe16142723fe3bfc34d9ad753bf2dce6beef8e2e80668f97972f9e5a8d6e7"
}
-->
