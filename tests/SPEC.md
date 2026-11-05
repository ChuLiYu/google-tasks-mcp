# 合成資料驗證（tests）

上層：[project 規格](../SPEC.md)。

## 職責與邊界

Vitest 單元／整合案例及 MSW network guard；不使用真實 Google 帳號或 credential。

## 契約與不變條件

Approval-channel diagnostic cases verify legacy in-memory support/refusal, stateless legacy HTTP refusal and modern service isolation, single-use 20-way concurrency, expiry, tampering, declines and zero TaskService/Google/operation-ledger access. A separate same-service client can resume a known nonce under the shared owner credential: this bounded diagnostic has no per-client identity binding. SDK-generated accept responses remain synthetic evidence and do not close human acceptance or real CRUD.

Synthetic real-loopback SDK integration covers two simultaneous clients, concurrent reads, all write registrations refused before service dispatch, disconnect/reconnect, bad/missing credentials, forged Host/Origin, oversized body and non-OAuth discovery 404. No real Google data is used.

未宣告網路預設拒絕；測試驗證拒絕路徑、跨帳號、並發與 timeout。模擬核准及 SDK 測試不能宣稱通過真實 Google／ChatGPT E2E。google-local 案例驗證預設唯讀與顯式測試讀寫的 OAuth scope，以及換綁後舊連線拒絕。

MCP 唯讀註冊測試驗證恰好四工具、全部 readonly annotations、20 並發寫入呼叫在 service 前拒絕，並保留三頁搜尋可用。

Readonly MCP error cases use MSW and the Google adapter to verify HTTP 404/401/403 remain distinct sanitized errors, without task results, credential/upstream-body disclosure or retries. These do not prove live Google error behavior or ChatGPT T08 acceptance.

CRUD harness 的 MSW 案例涵蓋完整流程與快取重播、唯讀拒絕、20 並發、結果不明禁止重送、跨帳號隔離、額外資料阻擋清理。

The conditional-update harness cases additionally require an actual stale If-Match request, HTTP 412 and unchanged task read-back. Simulated upstream acceptance of a stale request, corruption despite 412 and network failure must stop before completion/deletion and block replay. Cases also cover missing versions, readonly scope, twenty competing batches, cached success without tokens, and separate account/historical-batch journal namespaces. These are MSW contracts, not evidence that the live Google endpoint enforces If-Match.

新增合成安全案例：If-Match／412／非法版本／寫入不重試；同版本20並發／最後讀後競爭／缺版本；綁定核准跨帳號與期限／20接受只寫一次／拒絕與取消／60秒逾時及遲到接受／確認期間變更／真實 gate 不可繞過。SDK form 測試涵蓋 decline、accept但未勾選、明確勾選、成功重播及 HTTP 不支援時拒絕；不構成人類確認證據。

2026新版 HTTP 多輪確認案例驗證 input_required、跨 service 帳號拒絕、20並發單次消耗、成功重播、拒絕／未勾選／型別不符、內容變更、60秒過期及偽造識別碼；均只用合成資料。

PRD R10 的合成備註案例直接驗證 get／list／search 保留指令式文字，且 create／patch／proposal／approveBound／fetch 均零呼叫；只證明確定性 service 不執行備註，不證明外部 LLM 的提示注入防禦或真人對話驗收。

## 檔案與定位

- [private-http.test.ts](private-http.test.ts)
- [approval-desk.test.ts](approval-desk.test.ts)：本機核准、拒絕路徑、跨連線、併發與逾時。
- [public-http.test.ts](public-http.test.ts)：連接器 OAuth 流程與拒絕路徑。
- [stdio-bridge.test.ts](stdio-bridge.test.ts)：Claude Desktop 橋接。
- [storage-key-digest.test.ts](storage-key-digest.test.ts)：key digest migration and replay protection.
- [disconnect.test.ts](disconnect.test.ts)：revocation, credential removal and ledger retention with synthetic tokens (D048).
- [direct-writes.test.ts](direct-writes.test.ts)：連線授權後直接寫入（D041）。
- [skill.test.ts](skill.test.ts)：技能格式與禁止事項。

- [tests/domain.test.ts](domain.test.ts)
- [tests/crud-test.test.ts](crud-test.test.ts)
- [tests/google-local.test.ts](google-local.test.ts)
- [tests/google.test.ts](google.test.ts)
- [tests/mcp.test.ts](mcp.test.ts)
- [tests/service.test.ts](service.test.ts)
- [tests/setup.ts](setup.ts)

依賴元件：[local](../src/local/SPEC.md)、[demo](../src/demo/SPEC.md)、[domain](../src/domain/SPEC.md)、[google](../src/google/SPEC.md)、[mcp](../src/mcp/SPEC.md)、[service](../src/service/SPEC.md)、[storage](../src/storage/SPEC.md)。

## 驗證

`npm test`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：修正模組搬移後的測試匯入並建立案例索引；Vitest 限定 TypeScript 測試，文件檢查器使用 Node 測試執行。
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

- 決策／原因／取捨：新增新版協定延續識別碼安全案例，避免只測舊版造成相容性盲點
- 驗證：5個MCP案例通過；完整回歸待執行

### 2026-10-30

- 決策／原因／取捨：補上 R10 指令式備註的服務端拒絕副作用證據，明確保留外部 LLM 驗收界線
- 驗證：npm test：6 檔 80 項通過；完整 check 待本輪最後執行

### 2026-11-04

- 決策／原因／取捨：Prepare a separately authorized fixed Q05 stale-ETag maintenance batch; require HTTP 412 plus unchanged read-back, isolate its journal from historical CRUD, and stop unknown or unsafe outcomes without cleanup/retry.
- 驗證：Fixed-environment typecheck and initial 13 CRUD harness MSW cases passed; additional unchanged-ETag and guarded-cleanup cases and full check remain pending. No credentials or Google endpoint accessed.

### 2026-11-04

- 決策／原因／取捨：Record completed fixed-environment validation and independent read-only review of the separately authorized conditional-update harness; preserve synthetic-only and real-execution authorization limits.
- 驗證：Fixed container full check passed: 89 product cases including 15 harness cases, 9 developer-tool cases, 14 component checks, typecheck and build. All four synthetic rehearsals passed; invalid CLI arguments refused before credential access. Independent review found no concrete defect; its host test could not load the local dependency. Real Google and human acceptance not run.

### 2026-11-05

- 決策／原因／取捨：Exercise readonly MCP Google 404, 401 and 403 separately, including no retry, no task and no sensitive error disclosure
- 驗證：New synthetic SDK/MSW cases pending pinned full check; no live Google requests

### 2026-11-05

- 決策／原因／取捨：Record end-to-end synthetic MCP error-envelope verification through the Google adapter
- 驗證：Pinned container npm run check passed: 92 product tests including 404/401/403 MSW SDK cases, 9 docs tests, typecheck and build

### 2026-11-05

- 決策／原因／取捨：Cover two-client HTTP transport and rejection boundaries using synthetic data
- 驗證：Pinned execution pending

### 2026-11-05

- 決策／原因／取捨：Use an explicit loopback regex in MSW passthrough for real TCP integration
- 驗證：Initial pinned run exposed invalid wildcard syntax in test setup; corrected, rerun pending

### 2026-11-05

- 決策／原因／取捨：Use wire-level HTTP request to test forged Host without fetch normalization
- 驗證：Pinned-container full check pending; two-client MCP test already passed

### 2026-11-05

- 決策／原因／取捨：Cover diagnostic replay isolation expiry and zero writes; explicitly test shared-client identity limitation and stateless legacy refusal
- 驗證：Pinned focused tests passed 14 cases before legacy HTTP addition; final rerun pending

### 2026-11-05

- 決策／原因／取捨：Add deny-path, cross-connection, concurrency and timeout cases for approval, OAuth and bridge (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Add content-absence, replay, deletion, crash, expiry and scrub cases (D040)
- 驗證：pinned-image vitest: 146 tests in 10 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Assert the desk referrer policy and refuse opaque origins; scripted clients cannot observe the browser behaviour itself
- 驗證：pinned image full check during rebuild

### 2026-11-05

- 決策／原因／取捨：Add direct-write cases: single write, replay, 20 concurrent, stale, unknown outcome, disabled without mode, model fields rejected (D041)
- 驗證：pinned-image vitest: 160 tests in 11 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Pin the Google status mapping observed live
- 驗證：pinned-image full check during rebuild; live statuses observed on the dedicated account

### 2026-11-05

- 決策／原因／取捨：Check skill format, required safety rules and absence of personal data (D042)
- 驗證：Pinned image check; skill format test only, not yet run in a real Claude conversation

### 2026-11-05

- 決策／原因／取捨：Assert the skill keeps the Absence rule so the wording cannot be dropped silently. It checks text, not model behavior.
- 驗證：tests/skill.test.ts 3/3 passed.

### 2026-11-05

- 決策／原因／取捨：Add the guided setup and public-facing documents for the first public release (D046): writes default to off, Docker context is no longer fixed to OrbStack, Desktop bridge starts the service on demand, user-facing tool and connect text is English, README is short with the planning strategy moved to docs/PLANNING.md. Also fix review findings F2-F7 in launchers and google-http.
- 驗證：Launcher tests 7/7 including setup wizard with fake Docker; full image check run below. Clean-machine install and Docker Desktop not tested.

### 2026-11-05

- 決策／原因／取捨：Fix findings from the pre-public security review (D047): owner code on desk decisions, required expectedEtag, fail-closed approval mode, mode-bound and revocable connector tokens, no payload at rest in direct mode, pinned CI actions, sanitized identifying details.
- 驗證：Full image check and launcher tests; new refusal cases for owner code and stale edits. Not re-reviewed yet; no real Web consent run after this change.

### 2026-11-05

- 決策／原因／取捨：Use the current version in tests after the required expectedEtag (D047).
- 驗證：Full image check.

### 2026-11-05

- 決策／原因／取捨：Add MIT license and ./setup.sh disconnect for public users (D048). Disconnect revokes at Google, removes local credentials and keeps the ledger; it reports when Google did not confirm.
- 驗證：tests/disconnect.test.ts with synthetic tokens and fake fetch; launcher tests; full image check. Not run against a real Google connection.

### 2026-11-05

- 決策／原因／取捨：Register the disconnect test (D048).
- 驗證：Full image check.

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Make the operation key migration idempotent, because a logical restore loses user_version and double hashing would defeat replay protection; synthetic recovery check now uses key digests.
- 驗證：tests/storage-key-digest.test.ts; npm run test:synthetic in the build image; full check.

<!-- component-snapshot
{
  "tests/approval-desk.test.ts": "5eb896d0671b70b43c277469adfc68172ac4fbad048bea1b3b03280402872d82",
  "tests/crud-test.test.ts": "8109c7dec1cf5d632d344ee3fcbca9d2d71bf5061c71e9bc37d9a44a827406ad",
  "tests/direct-writes.test.ts": "4bd48723e70c69db15f2c4dededbe3decce3e9381d5e2d11bb6d69c0461ff5a0",
  "tests/disconnect.test.ts": "8715419e7cad709dd003313ad566294651b44c62e861c64439a2093ebd7591ac",
  "tests/domain.test.ts": "5a38e7c00b87f2f4f77c0594bc31232c46ddf7978d68af47a0c4e66ff88df031",
  "tests/google-local.test.ts": "621b7e37cfd0299b80a89a1dea8ae266d3cc6580800832aea311216a2aab17c2",
  "tests/google.test.ts": "29aa639bee7c137d61da5e7c82e1186765a38f41bbc19214a73afbff494488ef",
  "tests/mcp.test.ts": "96da5a2d8ef6bab826c8aa8de79be1d2e36b96da942897f805f04ca46a388583",
  "tests/private-http.test.ts": "0cb1faa3dd4d3340bedeee8b2432e0fd462123cd579f746b3cb8723f2a768773",
  "tests/public-http.test.ts": "7280deddf3a2bfdcff8b59b9e0b7d7964b4c54ae8aaa42dfbf5edc37dfc4c808",
  "tests/service.test.ts": "93c954316ac96bfdeb7623a5601c2d105006983f56262c75e1c8a3e2d3229c79",
  "tests/setup.ts": "53d76be38accf67d5298f5105d71e4bc26ba7bd76ac4aded1588cbdc5f99381a",
  "tests/skill.test.ts": "dbec148aaf7ea212183a464fe5995f43742a4e5b9df14defd3a890d6b83f67f9",
  "tests/stdio-bridge.test.ts": "8563c5b4a0cfad4204bbbf016837478d7a1e72ac2e396f16007de6d293d8f2a9",
  "tests/storage-key-digest.test.ts": "48e278d9534f9f5964e10f1cba8c2ae8175708454f5f34c254fe75a47608345f",
  "tests/SPEC.md": "d93a26a1270d1ca0cc329d4f6873fdd9b713050c09a44029e092b9917f8d1507"
}
-->
