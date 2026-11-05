# AI 協作、審查與品質門檻

入口：[文件索引](INDEX.md)；所屬：[docs 規格](SPEC.md)。實際實作定位：[scripts](../scripts/SPEC.md)、[CI](../.github/workflows/SPEC.md)、[測試](../tests/SPEC.md)。

## 最小工作流程

1. 由 [Context Router](INDEX.md) 選元件，執行 `npm run context -- service` 等命令。輸出登錄的權威路徑與指定 SPEC，省略歷史及指紋；權威文件內容按需再讀；再沿契約中的依賴連結載入必要檔案。不把全部程式或全部歷史交給每位代理。
2. 列出本次驗收條件、受影響元件與安全邊界。架構或公開契約變更才讀相關全域文件；輸入契約沿用 [domain schema](../src/domain/SPEC.md)，儲存契約沿用 [storage](../src/storage/SPEC.md)，避免手寫第二套 OpenAPI 與實作漂移。
3. 先定義預期行為與拒絕案例，再實作小範圍變更。同步元件契約、檔案定位及追加決策。程式碼產生速度不作為放行依據。
4. 執行相關測試，再執行 `npm run check`；入口、核准、儲存或放行流程變更再執行 build 後的 `npm run test:synthetic`。CI 兩者均執行。測試不存取 Google、不載入憑證、不代替真實 ChatGPT E2E。
5. 交給獨立審查；修復後只重查受影響範圍，再執行完整門檻。未解的高風險缺陷阻擋整合。正式部署仍依 [放行計畫](RELEASE_PLAN.md)，不由綠燈 CI 自動授權。

## 獨立代理如何分工

小幅文件修正可以單人完成；核准、身分、持久化、公開介面與 CI 變更至少安排一位未實作該變更的唯讀審查者。較大變更才把下列責任拆成不同代理，避免固定四個代理浪費上下文。

| 角色 | 最小輸入 | 必須交付 |
|---|---|---|
| 實作者 | 驗收條件、目標 SPEC、相關檔案 | 修改、原因、已跑與未跑驗證 |
| 程式審查者 | 變更內容、契約、必要呼叫端 | 可重現的正確性／隔離／併發／回歸缺陷 |
| 測試規劃者 | 需求與契約，先於實作細節 | 正向、拒絕、逾時、重送、跨帳號案例與預期 |
| 文件審查者 | 受影響 SPEC、契約、程式與測試 | 語意不符、失效連結、未揭露的驗收限制 |

審查者不可修改程式或自行部署。每個 finding 必須有檔案與行號、具體觸發條件、影響、實際證據或重現方式；沒有證據的疑問放在「待驗證」，不能當成確認缺陷。嚴重度以影響與可達性判定；實作者逐項回覆接受／反駁及證據，不能以代理多數決代替驗證。代理共享相似盲點，安全與業務決策仍由人類負責。

可重用的審查任務：

> 僅讀取指定元件 SPEC 與必要相依。根據驗收條件獨立檢查變更，先驗證實際程式再報告。只列具體可重現缺陷，包含檔案:行號、觸發條件、影響、證據及缺少的測試；分開列待驗證事項。不可把測試通過視為安全證明，不讀秘密、不修改檔案、不呼叫真實服務。

## 測試與放行的界線

| 層級 | 現有入口 | 能證明／限制 |
|---|---|---|
| 靜態契約與文件 | `npm run check` | strict 型別、Zod 行為測試、文件結構與指紋；不證明文件語意或真人核准 |
| 單元與整合 | `npm test`，定位見 [tests](../tests/SPEC.md) | 日期、拒絕、隔離、併發、MSW、實際 SDK handler；不是 Google E2E |
| 啟動腳本（macOS） | `npm run test:launchers` | 假 Docker／Tunnel client 的啟動腳本行為；CI `launchers` job 執行 |
| 容器煙霧測試 | `npm run test:container -- <image>` | 以無網路、唯讀根目錄啟動合成服務並列舉工具；CI `container` job 執行 |
| 合成程序整合 | `npm run test:synthetic`（先 build） | legacy／2026 stdio 核准模擬、CRUD、分頁、防重及 SIGKILL 恢復；不是人類確認 |
| 真實 Google／ChatGPT | [測試計畫](TEST_PLAN.md)、[放行案例](RELEASE_PLAN.md) | 需專用帳號、清單及可信核准證據；保持未測與已失敗狀態 |

目前不引入額外 linter 套件或純格式門檻；strict 型別與現有契約測試優先。若實際發生 lint 可攔截的缺陷，再選定規則與固定版本，避免增加無法解釋效益的工具。沒有獨立網頁介面，故不為套用文章而加入 Playwright 或額外 UI。

## CI 與 GitHub 設定

[CI 設定](../.github/workflows/ci.yml) 在 push／pull_request 使用唯讀權限、固定 Node／npm、鎖檔無安裝腳本、15 分鐘上限，取消同分支過時執行；不注入 Google secrets、不部署。要求 `CI / check` 成功及獨立審查應透過 repository ruleset／branch protection 設定，禁止直接推送與繞過。初次工程流程驗證時沒有 Git metadata；2026-10-29 依使用者要求公開原始碼，已開始初始化 Git 與建立遠端。遠端保護、PR 及 CI 的實際結果須分別記錄，不能因工作流程檔存在就宣稱生效。

合併前記錄：問題與驗收、受影響契約、可重現的測試結果、審查 finding 處置、未測與阻擋、回復方式。程式回復與資料回復分開評估：舊 DB 快照可能遺失冪等 ledger；事故先停寫，不可自動重播結果不明的操作。正式發布的 immutable image、環境核准與演練仍按 RELEASE_PLAN，暫不新增自動部署。

官方依據（2026-10-29 核對）：[GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) 的 permissions、concurrency、timeout-minutes。適用本工作流程；不證明本專案遠端設定已生效。

## 以數據評估，而非預設節省

在 5–10 個同類型任務試行，記錄任務範圍、開始修改前讀檔數、可取得的上下文 token／總 token、理解／實作／審查耗時、finding 數與確認有效數、返工及合併後缺陷、文件維護時間。無使用量資料標為未知，不從檔案大小推算 token。不比較差異過大的任務；額外代理與文件更新也算成本。本輪尚未取得對照樣本，不能宣稱已降低多少 token。

## SSOT 影響審查

先由登錄的 knowledge roles 選來源：需求／驗收改 PRD，輸入改 Zod，資料表改 Store DDL，限制改架構政策與允許相依 metadata，跨元件理由追加 DECISIONS；測試結果只記證據。每次區分「目前實作」與「已確認意圖」。metadata 變更用 context:generate 重建 Router，CI 的 context:check 比對生成區域與 AST 相依。不需每次改所有上層文件或產生另一份 API 表。

機械檢查只涵蓋靜態 import／export／type import／字面量動態 import；computed source imports 拒絕，不承諾分析 runtime call graph。業務規則的語意仍由審查者判斷。完整實例與量測方法見 [本輪稽核](CONTEXT_AUDIT.md)。
