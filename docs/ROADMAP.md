# 分階段實作計畫

## Current priority order — 2026-11-04

Follow the owner-approved [PRD delivery priorities](PRD.md#approved-delivery-priorities--2026-11-04): P0 OrbStack-hosted local MCP used by the owner through ChatGPT Web or Mac; P1 open-source publication enabling each user to run their own local instance for personal use, aimed at earning stars. Oracle hosting is outside the current delivery sequence. The historical implementation stages below remain evidence/work breakdown, not a competing priority order. Calendar collaboration and official plugin submission remain optional future proposals and do not block these goals. Deployment and publication retain their applicable authorization gates.

狀態：使用者已於 2026-10-27 核准安全範圍快速迭代至可親自測試。第 1 階段本機實作／mock 測試完成；第 2、3 階段的七工具、SQLite、核准 gate 及 loopback HTTP 已實作，但遠端 OAuth、可信遠端核准及正式部署安全未完成。第 4 階段已完成另行授權的 Google REST CRUD 合成資料驗證與清理；ChatGPT 已完成一次真實唯讀清單呼叫，完整任務管理 E2E 尚未完成。CI workflow 已寫入，尚未在 GitHub 執行。

| 階段 | 交付物 | 可量測完成門檻 | 依賴／授權 |
|---|---|---|---|
| 0：官方核對與設計 | README、AGENTS、PRD、ARCHITECTURE、API_CONSTRAINTS、TEST_PLAN、DECISIONS、ROADMAP | 八份文件存在、相對連結有效；外部假設附官方來源；列出差異、待決項與證據限制 | 本次已授權；已完成 |
| 1：OAuth 與 REST adapter | TS／Node 骨架、Zod domain schemas、Google OAuth client／refresh、token-store／principal interfaces、list/get/insert/patch adapter、mock fixtures | typecheck／build／測試通過；三頁讀取、Google refresh 成功／失敗、錯誤分類、日期 round trip 全通過；未授權及跨帳號存取為 0 | 技術計畫核准；先 mock，不需真實憑證；Q01／Q06 於正式接線前定案 |
| 2：MCP tools | 七個工具、Streamable HTTP、OAuth 驗證層、structured errors、cursor、核准 gate | Inspector 可列出／呼叫工具；schema 拒絕非法輸入；第三頁搜尋與 partial continuation 正確；未核准寫入上游 0 次 | 第 1 階段證據；Q02 必須解決才能開放真實寫入，未解可完成唯讀與 mock write 契約 |
| 3：安全與持久化 | SQLite transactions、encrypted token storage 或 vault 接線、冪等 state machine、核准紀錄、CI、限速與資料遮罩 | 同 key 20 並發只有 1 POST；timeout／重啟／DB 故障不新增第二筆；安全案例全通過；CI typecheck/test/build 全綠 | 第 2 階段；Q04／Q05 定案；不使用真實 secrets 的 CI |
| 4：ChatGPT 專用測試 | 獲授權的 HTTPS 或私有測試連線、專用 Google 清單、OAuth 登入、20 案例對話報告 | 一般案例 ≥95%，安全案例 100%；重複與未授權寫入皆 0；Google 最終狀態符合；Vancouver／Taipei 驗證通過 | 另行明確授權真實 credential、專用帳號資料、測試端點與連線；Q01–Q06、Q08 已解決必要項 |
| 5：GitHub 開源 | 核准的 LICENSE、安裝／安全文件、鎖檔、CI、去敏範例與 release notes | 可由乾淨 checkout 重現 build/test；秘密掃描無發現；維護者核對發布內容 | 另行明確授權 GitHub 發布；Q07 定案；不等於市集送審 |
| 6：Calendar 協作 Skill | 可選 plugin 編排原型、固定承諾／彈性任務區分、缺 plugin 降級 | 有／無 Calendar plugin 案例都可預測執行；沒有任務衍生的重複事件 | v0.1 驗收後另核准；必要時研究直接 read-only Calendar scope 的取捨 |
| 7：公開 plugin 評估 | 平台送審需求、隱私與資料保留、Google 驗證評估 | 有明確符合／缺口報告與送審決策；不預先宣稱審核通過 | 另行核准，先完成真實驗證 |

## 第 1 階段的具體工作順序

1. 確認官方 SDK、Zod、Vitest、MSW 的相容版本，建立 package scripts、lockfile、strict TypeScript 與忽略秘密／DB 的 .gitignore。
2. 建立 DateOnly、Google Task、錯誤模型與 principal／connection 隔離型別。
3. 建立 OAuth code exchange、state／redirect 驗證、refresh 與 token-store interfaces；所有外部端點在測試中模擬。
4. 建立 Tasks REST adapter，支援明確 flags、pagination、get、insert、partial patch；寫入方法尚不直接暴露給 MCP client。
5. 執行對應測試與 build，回報觀察到的結果及與設計的差異；更新決策，再決定是否推進第 2 階段。

## 計畫核准的含義

使用者已核准此技術方向及安全本地迭代；已推進至合成資料可測版本。這不包含使用真實憑證、存取任務／行事曆、建立 Google Cloud 專案、購買服務、部署、發布 GitHub 或送審；需要時提供具體可檢視內容再另行取得授權。

人類核准通道與正式 OAuth provider 仍需研究驗證。不能因為這兩項未定案而把無驗證的寫入路徑投入真實帳號，也不能把 mock 成功當作完成整體 MVP。

## 實際執行與放行

各階段改以 [RELEASE_PLAN](RELEASE_PLAN.md) 的 G0–G6 證據門檻追蹤；原階段表保留產品範圍，不能將本機容器測試視為正式部署完成。下一步先完成 OrbStack 合成資料驗收，再解決遠端認證及可信核准阻擋項。

### 2026-10-27 真實 Google 測試進度

使用者已另行授權專用測試帳號連線及本次合成資料 CRUD，且已完成 Google 讀寫同意。固定 OrbStack 容器執行獨立維護測試成功：新增、讀取、搜尋、更新、完成、刪除及清理均通過；專用測試清單已刪除。精確命令與限制見 [TEST_PLAN](TEST_PLAN.md)。本次授權不包含公開部署或發布；正式 MCP 寫入及 ChatGPT E2E 仍待可信核准通道／遠端認證等放行條件，不能將此 REST 成功視為整體 MVP 完成。

### 2026-10-27 ChatGPT 私人唯讀接線

本輪按 [CHATGPT_CONNECTION](CHATGPT_CONNECTION.md) 執行 A／B：四工具註冊、並發拒絕、OrbStack stdio wrapper 與協定 smoke。C／D 等待 Platform 登入與實際私人存取範圍核對；未宣稱 Tunnel 或 ChatGPT 呼叫成功。先做私人唯讀不解除正式 MCP 寫入 gate，完整 G2–G5 仍需逐項完成。


### 2026-10-28 自然語言安全管理驗收

最終交付以本人在 ChatGPT 討論、查詢、提出並核准新增／修改／完成任務為準。完整順序及固定 20 案見 [RELEASE_PLAN](RELEASE_PLAN.md) P0–P8；私人唯讀並非目標完成。下一個已授權動作為完整回歸、固定容器與合成資料 SIGKILL／備份還原，再解決可信核准／儲存阻擋。正式部署與公開發布保留獨立核准。

2026-10-28 執行更新：固定 Node 24.22.1 容器完整 check（63 產品／6 文件）及新加 SIGKILL／快照還原演練通過；本輪依賴漏洞快照為 0。舊快照會遺失後續防重紀錄，正式回復不得直接回退 DB。下一項為 P3 可信逐筆核准與條件更新驗證，接著專用 Google／ChatGPT 20 案；尚未具備 ChatGPT 真實寫入或正式上線資格。詳見 [證據](TEST_PLAN.md) 與 [P3 研究](RELEASE_PLAN.md)。


2026-10-28 P3 增量：78 合成產品案例、stdio 子程序核准／重播／建立修改完成讀回與恢復演練通過；條件更新與綁定核准已本機實作。P3 仍未完成，接著驗證 ChatGPT 的真人表單及真實端點並發；真實 MCP 寫入、正式 auth、D025 穩定儲存與部署 gate 保留。進度細節見 [測試計畫](TEST_PLAN.md)、[D030](DECISIONS.md)、[私人接線下一步](CHATGPT_CONNECTION.md)。

固定版本容器亦通過78產品與6文件案例；獨立合成 runtime wrapper 連續兩次 smoke 通過，保留專用 volume。下一步外部實驗須另外批准私人合成測試連線，既有 Google 唯讀連線維持原範圍。
