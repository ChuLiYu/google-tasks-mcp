# 持久化與安全狀態（storage）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

The Store uses the pinned stable `better-sqlite3` driver. Switching drivers does not change the DDL, file format, durability pragmas, account isolation or atomic claim. The native Node driver is used only in compatibility rehearsals. D035 adopts the driver for validated Linux arm64/x64 targets; native macOS and remote CI remain unverified. This does not enable real writes or approve production recovery. Driver adoption and remaining release limits are tracked in DECISIONS D034/D035.

SQLite 保存操作、核准、opaque cursor、demo 狀態；EncryptedVault 加密保存 OAuth token。

## 契約與不變條件

資料表結構、索引、期限及原子狀態更新以 [index.ts](index.ts) 的 Store DDL／操作為唯一實作來源；目前沒有獨立 migrations。不手寫另一份 schema 或狀態欄位表。

防止不明結果被再次寫入的業務目的見 [PRD](../../docs/PRD.md) R05／R07；保存與恢復取捨見 [DECISIONS](../../docs/DECISIONS.md) D016／Q04，SQLite 正式放行限制見 D025。持久化紀錄不能當成可信人類核准來源；過期、隔離、損壞與恢復由相關測試驗證。正式資料保存與刪除政策仍未定，不由目前無自動過期反推為永久保存的承諾。

## Decisions and OAuth records (D039)

`operation` reads one row scoped to a connection; `reject` durably moves a pending row to `failed_definitive`, bound to scope and digest. The schema is unchanged. Under D040, `redact`, `expireProposals` and `scrubFinished` remove task content from Google-connection rows while digest, state and IDs remain, and `secure_delete` is on. The entrypoint stores OAuth records in `secrets` under an `oauth:` prefix, containing token digests and expiry only.

## 檔案與定位

- [src/storage/index.ts](index.ts)

依賴元件：[domain](../domain/SPEC.md)。

使用此元件：[src](../SPEC.md)、[service](../service/SPEC.md)、[demo](../demo/SPEC.md)、[local](../local/SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[service](../../tests/service.test.ts)、[google-local](../../tests/google-local.test.ts)。

## 驗證

`npx vitest run tests/service.test.ts tests/google-local.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：將 SQLite 與加密保管元件集中同目錄，明確記錄帳號隔離、原子 claim 與 uncertain 邊界，方便安全修改定位。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：明確揭露內建 SQLite RC 例外，將穩定儲存及相容驗證列正式放行門檻
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-10-30

- 決策／原因／取捨：以Store初始化DDL作唯一結構來源，保留防重意圖與未決保存政策，不藉文件整理調整期限
- 驗證：79產品案例與SIGKILL恢復通過，未修改資料或產品來源

### 2026-11-04

- 決策／原因／取捨：Integrate pinned stable synchronous driver without changing DDL or durability; compatibility and timeout rehearsal required
- 驗證：Candidate isolated runtime checks passed previously; typed integration and full checks pending

### 2026-11-04

- 決策／原因／取捨：Record stable driver adoption for validated Linux targets without changing schema, scopes or approval policy
- 驗證：Fixed arm64/x64 checks and corrected upgrade/concurrency/timeout rehearsals passed; independent P1 review finding fixed and re-reviewed

### 2026-11-05

- 決策／原因／取捨：Add connection-scoped operation read and durable reject for owner decisions; no schema change (D039)
- 驗證：pinned-image vitest: 138 tests in 10 files passed, no network; synthetic only, no Google or Claude E2E yet

### 2026-11-05

- 決策／原因／取捨：Remove task content from Google-connection rows while keeping digest, state and IDs so replay protection survives; secure_delete on; tradeoff is replay depending on Google (D040)
- 驗證：pinned-image vitest: 146 tests in 10 files passed, no network; synthetic only

### 2026-11-05

- 決策／原因／取捨：Fix the re-review findings: remove remaining real fixture names and dates, require an explicit write mode, keep strict mode on rerun, digest operation keys with migration, expire proposals without relying on writes, clear pending content at disconnect, correct failed-disconnect messages, server-side cookie expiry, and documentation errors.
- 驗證：Launcher tests and full image check with new cases; list and get etags matched on one real fixture. Not re-reviewed after this change.

### 2026-11-05

- 決策／原因／取捨：Make the operation key migration idempotent, because a logical restore loses user_version and double hashing would defeat replay protection; synthetic recovery check now uses key digests.
- 驗證：tests/storage-key-digest.test.ts; npm run test:synthetic in the build image; full check.

<!-- component-snapshot
{
  "src/storage/index.ts": "5b47567039cd202856e31cf171f28a9800f69e6a0e10eac211da42efcbe36009",
  "src/storage/SPEC.md": "fab9a9cce4e6a82b77b131f0d5e3709dbf6f87b1710aff13d2f81a7e2d655a8f"
}
-->
