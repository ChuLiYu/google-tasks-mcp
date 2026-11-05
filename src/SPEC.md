# 應用入口（src）

上層：[project 規格](../SPEC.md)。

下層元件：[domain](domain/SPEC.md)、[storage](storage/SPEC.md)、[google](google/SPEC.md)、[service](service/SPEC.md)、[demo](demo/SPEC.md)、[mcp](mcp/SPEC.md)、[local](local/SPEC.md)。

## 職責與邊界

組合 HTTP demo、互動 CLI、Google OAuth 連線、Google stdio、獨立 Google 維護測試及合成 demo stdio 入口；業務邏輯由子元件提供。

## 契約與不變條件

The private Google HTTP entrypoint enables the non-mutating approval-channel diagnostic. Real Google task tools remain read-only; successful diagnostic responses neither authorize writes nor prove that the owner saw a form. See [MCP contract](mcp/SPEC.md).

Private owner-only Google HTTP entrypoint: loopback port 3002, existing Google connection, one retained process lock, no writes. Token is a private 256-bit local file, never the Tunnel runtime key.

HTTP demo 僅綁定 loopback，檢查 Host／Origin。Google 入口不可把本機使用者身分當成遠端認證；未實作公開部署認證。四個 dist 根入口檔名維持不變。Google stdio 強制只註冊四個讀取工具，可供單一擁有人私人 Tunnel 測試；不提供遠端逐人身分。私人測試計畫見 [ChatGPT 串接](../docs/CHATGPT_CONNECTION.md)。connect 預設要求唯讀；只有明確指定 `--write-test` 才要求 Tasks 讀寫 scope，且仍須互動 CONNECT 及 Google 同意。取得 scope 不解除 MCP 的真實寫入 gate。獨立 google-crud-test 入口僅執行本次人類已授權的固定合成測試，不接受參數，不註冊為 MCP 工具；每次取 token 前後核對 connection。

新增 demo-stdio 合成資料入口：只組合 demoRuntime，啟動時 recoverInterrupted，明確開啟 demoElicitation，依 SDK factory era 為 modern 啟用 demoRoundTrip；不讀 Google 憑證。客戶端不支援確認時拒絕寫入，stdout 僅傳協定。既有 Google stdio 仍只有四個唯讀工具。

`google-conditional-test` is a separate fixed maintenance entrypoint prepared for an explicitly authorized Q05 test batch. It accepts no arguments, validates the existing connection before and after token acquisition, uses a fixed durable run key, and prints only the boolean report or a sanitized error. Do not execute it against real credentials until the owner approves that specific batch. It is not an MCP tool and does not expand the historical CRUD authorization.

## 檔案與定位

- [disconnect.ts](disconnect.ts)：`./setup.sh disconnect` entry; prints outcomes only.
- [google-http.ts](google-http.ts)：共用服務入口；`TASKS_REAL_WRITES=1` 才啟用寫入，預設直接寫入，`TASKS_WRITE_APPROVAL=local` 改為逐筆核准（D041）；`.data/public-url` 存在才啟動連接器端點（D039）。啟動時把殘留 in_flight 轉為 uncertain。
- [claude-desktop-stdio.ts](claude-desktop-stdio.ts)：在服務容器內執行的 Claude Desktop stdio 橋接。

- [src/demo-stdio.ts](demo-stdio.ts)：合成資料表單核准原型，直接執行 node dist/demo-stdio.js。
- [src/cli.ts](cli.ts)
- [src/connect.ts](connect.ts)
- [src/google-stdio.ts](google-stdio.ts)
- [src/google-crud-test.ts](google-crud-test.ts)
- [src/google-conditional-test.ts](google-conditional-test.ts)
- [src/main.ts](main.ts)

依賴元件：[domain](domain/SPEC.md)、[local](local/SPEC.md)、[mcp](mcp/SPEC.md)、[storage](storage/SPEC.md)。

相關案例：[mcp](../tests/mcp.test.ts)、[google-local](../tests/google-local.test.ts)。

## 驗證

`npm run typecheck && npm test && npm run build`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：將業務程式搬到七個責任明確的元件目錄並修正相對匯入；保留四個 dist 根入口避免改變啟動方式。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：明確區分唯讀與已授權測試讀寫的 OAuth scope，保留 MCP 寫入保護並處理 refresh 權限包含關係
- 驗證：typecheck 通過，56 個合成測試通過；Google tokeninfo 僅確認既有 token 為唯讀；真實 CRUD 待重新授權

### 2026-10-27

- 決策／原因／取捨：新增已獲明確人類授權的固定 CRUD 維護測試，保留 MCP 寫入 gate，加入原子紀錄與清理拒絕條件
- 驗證：typecheck 與 62 合成案例通過；真實 token 讀寫 scope 已確認，容器與 CRUD 待執行

### 2026-10-27

- 決策／原因／取捨：準備單一擁有人私人 Tunnel 的唯讀 stdio 路徑，明確註冊四工具、並發寫入拒絕及外部啟用界線
- 驗證：typecheck 與 MCP 兩項 SDK 測試通過；容器重建與協定 smoke 待本輪執行，ChatGPT 待登入

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-28

- 決策／原因／取捨：補記固定版本容器與持久合成資料重跑證據，保留外部核准及真實寫入界線
- 驗證：Node24.22.1及npm11.19.1容器完整check通過78產品與6文件；stdio與恢復演練通過；實際runtime wrapper連續兩次smoke exit0，未測真人ChatGPT核准

### 2026-10-28

- 決策／原因／取捨：依SDK factory era選擇合成stdio確認協定，不改Google入口
- 驗證：typecheck與5個MCP案例通過；容器待重建

### 2026-11-04

- 決策／原因／取捨：Prepare a separately authorized fixed Q05 stale-ETag maintenance batch; require HTTP 412 plus unchanged read-back, isolate its journal from historical CRUD, and stop unknown or unsafe outcomes without cleanup/retry.
- 驗證：Fixed-environment typecheck and initial 13 CRUD harness MSW cases passed; additional unchanged-ETag and guarded-cleanup cases and full check remain pending. No credentials or Google endpoint accessed.

### 2026-11-04

- 決策／原因／取捨：Record completed fixed-environment validation and independent read-only review of the separately authorized conditional-update harness; preserve synthetic-only and real-execution authorization limits.
- 驗證：Fixed container full check passed: 89 product cases including 15 harness cases, 9 developer-tool cases, 14 component checks, typecheck and build. All four synthetic rehearsals passed; invalid CLI arguments refused before credential access. Independent review found no concrete defect; its host test could not load the local dependency. Real Google and human acceptance not run.

### 2026-11-05

- 決策／原因／取捨：Add private Google HTTP entrypoint for shared owner clients
- 驗證：Synthetic transport tests and pinned full check pending

### 2026-11-05

- 決策／原因／取捨：Enable diagnostic in dedicated private Google HTTP entrypoint while retaining read-only task registration and real-write refusal
- 驗證：Pinned focused typecheck passed; full check and actual client form remain pending

### 2026-11-05

- 決策／原因／取捨：Wire approval desk, connector endpoint and Desktop bridge in the shared entrypoint behind explicit switches; recover crashed in_flight rows as uncertain because this process holds the lock (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Scrub and expire ledger content at service startup (D040)
- 驗證：pinned-image vitest: 146 tests in 10 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Select write mode only from environment at startup, default direct, TASKS_WRITE_APPROVAL=local for strict (D041)
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

<!-- component-snapshot
{
  "src/claude-desktop-stdio.ts": "83caeb724f33787ae5ea94485fabdbe8b80f6011d1d32e8e89e33110a29c39c9",
  "src/cli.ts": "80ec6fe21b76b3e0b19a1b3593d2ec536171e457fb8408f54d097668b9a632ba",
  "src/connect.ts": "19f8d2ab70ea3e17beb3860cece6df213a4ca371a47e1293c3dc787341ba1f86",
  "src/demo-stdio.ts": "dab69186aa93bdc2c1476cbe94bea55e9864d5d488076ef66dd244ebaf9d762a",
  "src/disconnect.ts": "2da92cd1375fca45632503c5b8e355a2eb1f62dc4246c4ed4e19fdff970ed1cb",
  "src/google-conditional-test.ts": "6af6db7c87fa0ffe760536f5043049eff7e3acc715300b21225b309d9aebc30f",
  "src/google-crud-test.ts": "5b37a126533221fe551608d8a089426d6dd2ff5de32514e5d7b99907be1ae26c",
  "src/google-http.ts": "ce261797bde3564737aa06aeaff67d899dc37e9ac15e28507bc8021536e7d0ae",
  "src/google-stdio.ts": "07f84ba45e03cb4e9cb179b186b4d400da495273141183e9b5af45a13ee906c0",
  "src/main.ts": "d3400c36a0e9796ecb76d3d58b8f6d58cd43b29f5b772aeda251ae0412c711f2",
  "src/SPEC.md": "8dd98517bfc8625cf7613559ce522a67999d536d7936a503142b440731a5a60b"
}
-->
