# 產品需求（v0.1）

狀態：使用者已核准本地快速迭代，合成資料測試版本已實作。完整產品驗收仍待遠端 OAuth、人類核准與真實 E2E；以下需求並非全數完成。2026-10-27。

本文件是業務目的、已確認需求與 R01–R10 驗收的權威來源。標示「建議」的段落仍非已確認需求；實作與測試只提供觀察證據。技術輸入參數請讀 [Zod schema](../src/domain/index.ts)，不得再以架構草案的手寫欄位表作契約。

## Approved delivery priorities — 2026-11-04

The owner approved the following order. These product priorities are distinct from the historical P0–P8 execution steps in [RELEASE_PLAN](RELEASE_PLAN.md).

| Priority | Owner outcome | Acceptance boundary |
|---|---|---|
| P0 | Run the MCP service in OrbStack on the owner's local computer and use it from the owner's ChatGPT Web or Mac app. | At least one of those clients completes the existing R01–R10 acceptance applicable to the private connection, including trusted approval and Google read-back for create/update/complete. Verify persistent state across normal container restart and safe refusal/replay behavior. Synthetic acceptance alone is not completion. The local computer, OrbStack and connection process must be running. |
| P1 | Publish an open-source project so other people can run their own local instance for their own use, with the aim of earning GitHub stars. | Select a license; provide a clean-checkout OrbStack setup, each user's own Google authorization and private ChatGPT connection, safe configuration examples, a short demonstration, security/limitations documentation and reproducible checks. Rehearse setup without the maintainer's credentials or private configuration. Track stars as an observed outcome, not a promised acceptance count. Publication follows the applicable explicit authorization and Q07 license decision. |

Oracle hosting is removed from the current delivery sequence by the owner's latest clarification. Public multi-user hosting and official OpenAI directory submission are not prerequisites for these priorities. Open-source users may run their own instances; operating a service for them would require a separate scope decision. The existing v0.1 feature and safety boundaries remain unchanged. Q04 content retention and Q09 approval timing remain unresolved: this priority decision does not adopt the earlier indefinite-content-retention proposal or authorize data deletion.

## Incremental use before full P0 completion — 2026-11-04

The owner explicitly prioritizes early real use and small releases. P0 is delivered in usable slices: read-only use first, then create, update and complete as each capability satisfies its own safety conditions. A read-only slice may be used before the complete R01–R10 suite and all write-specific decisions are closed; label its limitations and do not declare full P0 complete. Synthetic approval experiments are supporting evidence, not the first usable product. Release criteria and evidence are maintained in [RELEASE_PLAN](RELEASE_PLAN.md#small-usable-releases--2026-11-04).

## 已確認需求

協助使用者將想法轉成行動，以較少規劃摩擦完成有意義的成果。Google Tasks 保存可執行任務；Google Calendar 保存固定承諾。任務沒完成不應被描述為個人失敗。

v0.1 提供清單列表、任務列表與搜尋（支援分頁）、依 ID 取得、新增、更新及完成任務。ChatGPT 負責語意理解與建議，確定性程式負責日期、權限、驗證與寫入安全。工具可在沒有 Calendar plugin 時獨立使用。

所有 consequential writes 均須得到使用者核准；本計畫採保守定義，將新增、更新與完成均納入。不得默默修改資料，不得在 Google 確認前宣稱完成。

## 使用流程與可量測驗收

| ID | 使用者意圖 | 驗收標準 |
|---|---|---|
| R01 | 查看我的清單 | 正確顯示 fixture 的所有分頁清單；空清單不報錯 |
| R02 | 查看／搜尋任務 | 支援續頁；三頁資料中只在第三頁的匹配仍可找到；未掃完明確標記 partial |
| R03 | 查看指定任務 | 只用 taskListId + taskId；另一帳號無法取得資料 |
| R04 | 建立「11 月 2 日交報告」 | 只新增一筆（寫入授權依 D041），保存 taskDate=2026-11-02；不建立 Calendar 事件，不聲稱提供硬性 deadline |
| R05 | 再次送出相同建立請求 | 相同帳號、連結、key 與 payload 回傳原結果；上游 POST 次數仍為 1 |
| R06 | 更新／完成選定任務 | 同名任務不受影響；ID 不明、帳號不符、未設定寫入模式或（嚴格模式）無核准時上游寫入次數為 0 |
| R07 | 寫入時網路逾時 | 回傳結果不明；再次相同請求不發第二個建立 POST；不回報假成功 |
| R08 | token 過期／撤銷 | 可更新的 Google token 最多受控 refresh；invalid_grant 要求重連；無效 MCP token 在存取資料前拒絕 |
| R09 | 使用溫哥華／台北日期 | 日期往返不變；跨午夜與 2026 年 11 月測試符合實際時區規則 |
| R10 | 未支援功能或提示注入 | 不建立循環／定時提醒／Calendar 事件；任務備註中的命令不得觸發寫入 |

「完全沒有重複」只適用於正確重用同一 operation key 的驗證案例；不能保證跨新 key、外部 UI 操作或 Google 非原子故障的全域 exactly-once。這項限制必須向使用者誠實揭露。

## 不在 v0.1 範圍

獨立網站／任務 UI、LLM agent、自動每日規劃、Calendar 排程、循環建立、提醒、刪除或破壞性批次操作、金融自動化、市集送審。Google 支援的其他 API 不代表本產品必須暴露。

## 建議的預設行為

列表預設未完成、未刪除、非 assigned 任務；可選已完成，並正確處理 hidden。搜尋單一已選清單的標題與備註，不跨帳號搜尋。缺年份、日期語意或目標任務不明時先釐清。

「明天下午三點」不能直接變成日期並宣稱三點提醒；須說明 API 只能保存日期並取得使用者對日期形式的同意。硬性截止與建議行動日期需區分，不能偷偷建立 Calendar 事件。

搜尋的既有設計建議採 Unicode NFC 正規化及大小寫不敏感子字串比對，不承諾語意搜尋；具體預算由實作定義。Google 列表不是 snapshot，多頁期間外部變更可能影響結果，不能把掃完分頁解讀為同一時點的一致快照。這些限制從原架構草案移入此處保留語意，不改變其建議狀態。

## 成功指標與蒐集方式（建議）

- 建立固定的 20 個繁體中文對話案例，涵蓋 R01–R10；一般意圖成功率目標 ≥95%，所有安全案例必須 100% 通過。
- 冪等測試重複數、錯誤／未授權寫入數目標均為 0。
- 人工記錄每案例操作時間與修正次數，與同一測試清單的 Google Tasks UI 基準比較；測試前不捏造改善比例。
- 以 1–5 分記錄規劃摩擦與壓力；少量測試僅作探索，不作統計成效宣稱。
- 預設不收集真實任務內容或完整對話；人工評估紀錄須取得同意並去識別化。

待決事項及限制分別見 [DECISIONS](DECISIONS.md) 與 [API_CONSTRAINTS](API_CONSTRAINTS.md)。

## 驗收的實作與測試定位（非完成宣告）

下表只連結證據位置，不複製上方驗收條件。測試通過與實際 Google／ChatGPT 驗收分別記錄於 [TEST_PLAN](TEST_PLAN.md)。

| R ID | 實作／測試定位 | 尚不能據此宣稱 |
|---|---|---|
| R01–R03 | [service](../src/service/index.ts)、[service tests](../tests/service.test.ts)、[Google adapter tests](../tests/google.test.ts) | 真實帳號完整驗收；所有遠端身分已隔離 |
| R04–R07 | [service](../src/service/index.ts)、[Store](../src/storage/index.ts)、[service tests](../tests/service.test.ts)、[MCP tests](../tests/mcp.test.ts) | 真人核准、正式 Google 寫入已放行 |
| R08 | [OAuth adapter](../src/google/index.ts)、[Google tests](../tests/google.test.ts) | 正式 MCP token verifier 已實作 |
| R09 | [date／timezone](../src/domain/index.ts)、[domain tests](../tests/domain.test.ts) | 過舊 runtime 可安全推導相對日期 |
| R10 | [strict schemas](../src/domain/index.ts)、[MCP](../src/mcp/index.ts)、[service tests](../tests/service.test.ts) 的 R10 備註零副作用案例、[Google tests](../tests/google.test.ts) 的 no Calendar calls | 外部 LLM 能抵禦提示注入；已以真人對話完整驗證語意拒絕 |

## 歧義處理

需求、程式與外部 API 有差異時，先記錄現況與缺少的決策，集中到 [DECISIONS](DECISIONS.md) 的 Open Questions；確認前保持安全拒絕，不將程式推測當作已確認業務規則。

## Claude clients and local write approval — 2026-11-04

The owner also requires use from Claude Web and Claude Desktop (Mac), and approved a local approval page for human write approval ([D039](DECISIONS.md)). P0 acceptance for these clients follows the same R01–R10 boundary as ChatGPT. The loopback approval page is the one exception to the v0.1 "no separate UI" exclusion: it presents one pending decision and offers no task management. Calendar writes remain outside this product.

## Direct writes after one authorization — 2026-11-04

The owner confirmed the product is operated mainly by the LLM and supplies an MCP tool between the LLM and Google Tasks, so writes proceed directly after one authorization ([D041](DECISIONS.md)). Where earlier sections here require trusted per-write approval for the private connection, D041 replaces that with the connection grant; those statements remain as history. Conversation text alone is never proof of authorization.
