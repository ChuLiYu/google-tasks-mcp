# 合成 Tasks adapter（demo）

上層：[src 規格](../SPEC.md)。

## 職責與邊界

提供持久化的合成清單與 205 項初始任務，供本機試用及跨頁搜尋。

## 契約與不變條件

只操作專用 demo 範圍；不得載入真實 Google 資料。遵守相同 TasksAdapter 契約，測試核准與實際人工核准驗收須分別記錄。

create／patch 採用 domain 的可寫欄位型別，讓編譯器推導 Task，移除回傳物件的 as Task；執行時輸入仍由 service schema 驗證。

patch 使用具體 expectedVersion，以 SQLite 單句 UPDATE 的 id/list/etag 條件原子修改並產生新 etag；0 changes 回 STALE_TASK。20 並發同版本最多一筆成功，讀取與寫入之間的競爭也不能覆蓋他人變更。

## 檔案與定位

- [src/demo/index.ts](index.ts)

依賴元件：[domain](../domain/SPEC.md)、[storage](../storage/SPEC.md)。

使用此元件：[local](../local/SPEC.md)、[tests](../../tests/SPEC.md)。

相關案例：[service](../../tests/service.test.ts)、[mcp](../../tests/mcp.test.ts)。

## 驗證

`npx vitest run tests/service.test.ts tests/mcp.test.ts`。完整提交檢查為 `npm run check`。測試證據與尚未執行範圍見 [測試計畫](../../docs/TEST_PLAN.md)。

## 修改決策紀錄

採追加方式記錄日期、原因／取捨與實際驗證，不覆寫歷史。跨元件決策另見 [全域決策](../../docs/DECISIONS.md)。

### 2026-10-27

- 決策／原因／取捨：依使用者核准建立元件規格與雙向導覽，按責任搬移模組並維持既有公開入口；以同目錄契約及追加紀錄降低搜尋成本。
- 驗證：文件工具 6 項拒絕與同步測試已通過；搬移後的 typecheck、52 項產品測試及 build 執行中，最終證據另記測試計畫。

### 2026-10-27

- 決策／原因／取捨：合成 adapter 獨立成元件，記錄資料範圍及使用者，維持既有持久化試用流程。
- 驗證：分項驗證通過：docs:test 6 項；typecheck；Vitest 5 檔 52 項；build；13 元件文件結構與連結檢查。GitHub CI 與真實 Google／ChatGPT E2E 未執行。

### 2026-10-27

- 決策／原因／取捨：以領域型別取代任意欄位及回傳斷言，維持合成資料行為
- 驗證：typecheck 與 52 個合成測試已通過；完整 check 與固定容器驗證待執行

### 2026-10-28

- 決策／原因／取捨：P3加入具體版本條件更新與獨立合成stdio核准原型，保留真實寫入及客戶端相容性限制；同步契約與定位
- 驗證：typecheck、78產品案例、build、合成stdio與恢復演練通過；完整check及固定容器待驗證

<!-- component-snapshot
{
  "src/demo/index.ts": "e6db635eaccba848329513ffe3dd35fad28dd62915323fd80f869097f8b0950e",
  "src/demo/SPEC.md": "8f9c81a0209da1c224375757fb52b3f5f61fa3a9c7f8199dcda1f3a3f0529446"
}
-->
