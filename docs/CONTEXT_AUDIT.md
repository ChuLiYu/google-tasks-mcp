# SSOT Context 稽核與交付

入口：[Context Router](INDEX.md)；所屬：[docs 規格](SPEC.md)。日期：2026-10-29。基線：Git `57bcaf3`（首次公開提交）。本次只調整文件與開發檢查，不改產品業務行為、不讀真實憑證、不變更資料、不部署。

## Phase 1：基線稽核

| 項目 | 觀察與證據 | 處理 |
|---|---|---|
| 技術棧與結構 | package.json、src 與 components.json；TypeScript／Zod／SQLite／官方 MCP SDK，已有元件 SPEC | 沿用；無第二套 schema、無新 framework |
| 入口競爭 | README／AGENTS 指向根 SPEC，docs/INDEX 另列導覽 | docs/INDEX 成為主要入口，根 SPEC 保留登錄與父層管理 |
| 重複契約 | ARCHITECTURE 手寫工具欄位與搜尋回傳 `matches`；service 實際回傳 `items` | Code-first，以 domain schemas／service 結果及測試為準；移除活躍的手寫 API 表，以連結取代 |
| 建議混同實作 | ARCHITECTURE 同時寫未完成遠端 OAuth 與已實作能力；大量時間累積的 SPEC／測試歷史 | 現況、目標、建議與歷史分別標示；不把舊建議當需求 |
| 業務知識 | PRD 已有動機、R01–R10、日期語意與範圍；DECISIONS 已有理由／替代方案和 Q01–Q08 | 保留並指定權威；補實作與測試定位，不複製另一份 Domain Spec |
| 程式可推導內容 | Zod 參數、Store DDL、套件版本、實際 import | 直接連結原始來源；只把允許的依賴政策寫入 metadata |
| Agent 設定 | AGENTS 保留元件同步、安全及版本規則；repo 無 .agents／.codex Skills 目錄 | 整合 SSOT 工作原則，不新增無用途 Skills |
| CI | npm run check 與 test:synthetic 已有文件指紋、測試、build 和合成恢復 | 加入 metadata／生成一致性／相依 AST 檢查，沿用同一 job |
| 保留的疑問 | 核准可信性、保存政策、條件更新、正式 OAuth、授權條款仍待決定 | 見 DECISIONS 的 Open Questions；不藉文件重構解決業務決策 |

缺少的是知識的權威範圍與落差處理程序，而不是再寫一套產品規則。程式顯示目前行為，PRD 表達已確認意圖；兩者衝突須明列，不能只選較方便的一方。

## Phase 2–6：實際方案與修改定位

- 權威歸屬／模組角色／允許相依：[components.json](../components.json)。人工決定歸屬；generated Router 只重建其投影。
- 主要入口：[INDEX](INDEX.md)。沿用所有元件 SPEC 作模組入口，沒有新增重複 README 或成套 Skills。
- 工作規則：[AGENTS](../AGENTS.md)、[工程流程](ENGINEERING_WORKFLOW.md)。保留安全與強制同步，改由 Router 定位受影響的權威來源。
- 意圖與驗收：[PRD](PRD.md)。保留 R01–R10，補證據位置與未覆蓋範圍；沒有把測試成功改寫成需求已全實現。
- 約束與理由：[ARCHITECTURE](ARCHITECTURE.md)、[DECISIONS](DECISIONS.md)。不另手寫 API schema；保留先前決策與圖，新增 D033 的 context 取捨。
- 導航與機械檢查：[context-model](../scripts/context-model.mjs)、[context 命令](../scripts/component-context.mjs)、[context 檢查／生成](../scripts/check-context.mjs)。來源存在性與邊界、唯一 ID／父層／角色引用、生成內容及 TypeScript import／export／type import／literal dynamic import 相依；computed imports 拒絕。不是完整 runtime call graph、語意分析或供應鏈稽核。
- 拒絕與漂移測試：[context 測試](../scripts/check-context.test.mjs)、[導航邊界測試](../scripts/component-context.test.mjs)。接入 package scripts，CI 沿用既有 npm run check。
- 同步元件規格：project、docs、scripts、tests、domain、service、storage、mcp、workflows；完整實際改動可用 `git diff --name-only 57bcaf3` 定位。未刪除既有文件，未搬移產品程式。

實際檔案清單（不含生成的 dist）：

| 類型 | 新增／修改 |
|---|---|
| 新增 | 本稽核文件；scripts/context-model.mjs、check-context.mjs、check-context.test.mjs |
| 入口與設定 | AGENTS.md、README.md、SPEC.md、components.json、package.json |
| 文件 | docs/INDEX.md、ARCHITECTURE.md、DECISIONS.md、ENGINEERING_WORKFLOW.md、PRD.md、TEST_PLAN.md、SPEC.md |
| 驗證補強 | tests/service.test.ts、tests/SPEC.md（R10 備註零副作用，無產品行為變更） |
| 開發工具 | scripts/component-context.mjs、component-context.test.mjs、SPEC.md |
| 元件同步 | src/domain/SPEC.md、src/storage/SPEC.md、src/service/SPEC.md、src/mcp/SPEC.md、.github/workflows/SPEC.md |

## Phase 7：真實情境示範

情境：修改「寫入逾時後可否自動重送」的處理。這是現有專案的 R07，不在本輪實作新行為。

1. **Locate**：INDEX → `npm run context -- service`，先得到 service SPEC 與 requirements／api／database／decisions 的位置，不先掃全 src。
2. **Load**：讀 PRD R07，再讀 service 的 uncertain 分支、Store 的恢復邏輯及 service 測試；需要協定輸出時才讀 MCP。
3. **Resolve Ambiguity**：PRD 已確認結果不明時不得再送建立。若新要求是「讓使用者確認後再送」，這涉及重複風險與 Q04 保存政策，記入 DECISIONS 待決，不猜測新的安全例外。
4. **Implement**：對已確認且不改業務規則的部分，例如修正錯誤說明，才做局部修改；若要改重送行為，先取得業務決策。
5. **Synchronize**：改輸入契約才改 schemas；改驗收才改 PRD；改理由追加 ADR；更新受影響 SPEC。只有 metadata 改動才重建 Router，不再手改工具參數表。
6. **Validate**：驗證結果不明拒絕、重播不寫、帳號隔離與恢復；跑 check／適用的 test:synthetic，再交獨立審查。不能將 mock 通過寫成真實 Google 成功。

## 新舊差異與量測

| 面向 | 基線 | 本次 |
|---|---|---|
| 定位 | 元件 SPEC 可定位，但文件歸屬靠讀者判斷 | Router 從同一登錄表產生，命令列出指定元件的權威來源 |
| 重複 | 架構手寫 API 欄位、SPEC 再解釋驗證細節 | 以 schema／DDL 及 PRD 連結取代活躍重複契約；保留局部理由與歷史 |
| 更新 | 以指紋要求更新文件 | 另外確認來源引用、生成結果、允許的相依；不宣稱語意一致已被保證 |
| 語意 | 目前程式與原本意圖容易混讀 | PRD 是已確認意圖；source 是觀察行為；疑問與理由保留在 ADR |

未量測 token 節省或品質提升。Benchmark：從同一基線與本輪版本，各用新的對話執行同樣 5–10 個小型任務（搜尋、防重、日期、MCP schema 等），固定模型與預算，記錄修改前讀檔數、實際 token（可取得才填）、定位時間、錯誤權威引用、返工與文件維護時間；交錯順序減少熟悉度影響。代理審查成本也算入，無資料記 unknown，不從文字長度假造 token。

## 未解問題與驗證證據

正式業務疑問以 [DECISIONS](DECISIONS.md) Q01–Q09 為準；本文件不維護第二份待決清單。驗證結果與限制追加於 [TEST_PLAN](TEST_PLAN.md)，並在本次交付報告列明。跨帳號／真人核准／Google 條件更新仍不可由文件工具證明。
