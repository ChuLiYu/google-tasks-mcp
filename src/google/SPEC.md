# Google REST 與 OAuth（google）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

實作 TasksAdapter 的 Google REST 呼叫、分頁與 OAuth state／PKCE／refresh。

## 契約與不變條件

上游主機固定；讀取有界重試，寫入不自動重試。日期保持純日期。OAuth state 單次且限時，refresh single-flight，未回新 refresh token 時保留舊值。外部內容不授予權限。Tasks 讀寫 grant 可滿足讀取需求（包含 refresh 回應）；唯讀 grant 不可滿足寫入需求，拒絕時不保存 token。

create／patch 採用 domain 的 schema 推導型別；上游回應維持既有 Zod 驗證。型別收緊不改重試或授權政策。

patch 在取 token／送網路之前驗證 expectedVersion，將其原樣作 If-Match；412 → STALE_TASK（不可重試），只傳指定可寫欄位。寫入連線失敗仍不重送。MSW 僅證明 header 與拒絕映射；Google Tasks 真實端點的條件更新保證尚待專用清單驗證。

## 檔案與定位

- [src/google/index.ts](index.ts)

依賴元件：[domain](../domain/SPEC.md)。

使用此元件：[service](../service/SPEC.md)、[local](../local/SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[google](../../tests/google.test.ts)、[service](../../tests/service.test.ts)。

## 驗證

`npx vitest run tests/google.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：Google REST 與 OAuth 移入同目錄元件；記錄讀寫重試差異、state 與 refresh 契約，避免與服務政策混淆。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：使用領域可寫欄位型別收緊 adapter 契約，不變更上游驗證政策
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-27

- 決策／原因／取捨：明確區分唯讀與已授權測試讀寫的 OAuth scope，保留 MCP 寫入保護並處理 refresh 權限包含關係
- 驗證：typecheck 通過，56 個合成測試通過；Google tokeninfo 僅確認既有 token 為唯讀；真實 CRUD 待重新授權

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

### 2026-11-05

- 決策／原因／取捨：Map Google 400 to INVALID_REQUEST after live acceptance showed malformed IDs were reported as an upstream outage; drop approval wording from the 412 message
- 驗證：pinned-image full check during rebuild; live statuses observed on the dedicated account

<!-- component-snapshot
{
  "src/google/index.ts": "5d2dd8ce6c56ea016fa1a97b960a51eb93aee26078e55943d69eee20ce91aa7f",
  "src/google/SPEC.md": "c2ab198e83472f0241b90a60dd7749925e8fc9a47271bb941c3f8c2db630b73c"
}
-->
