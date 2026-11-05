# Google Tasks MCP（繁中閱讀版）

英文權威來源：[README](README.md)
類型：完整翻譯
來源版本：4485117e6a44782f89699a1f98093f27604eb705，README.md
同步狀態：已核對（作者自查，未經獨立語意審查）

讓 Claude 幫你管理 Google Tasks。把腦中的事說出來，它就變成有日期的任務。

> **你：** 下週二要換護照，還有 20 號的考試我想開始準備。
>
> **Claude：** 我會把「換護照」排在週二，「做一回模考」排在這週六，可以嗎？

- **資料是你的。** 它跑在你的電腦上，用你自己的 Google client。沒有我們的伺服器，也不用註冊帳號。
- **任務只存在 Google。** 本機資料庫只放 token 和安全紀錄，不放任務內容。唯一例外是嚴格模式下等待核准的寫入：服務運作時 24 小時後清除，服務停止時則在下次啟動時清除。
- **寫入很謹慎。** 沒有刪除工具；結果不明時不會默默重試；任務在讀取後被改過，就拒絕覆寫。

> **早期版本。** 已在 macOS 加 OrbStack 上，以 Claude Desktop 和 Claude Web 測試。Docker Desktop、Linux 和 ChatGPT 尚未確認，歡迎回報。

## 快速開始

你需要 [OrbStack](https://orbstack.dev) 或 Docker、[Claude Desktop](https://claude.ai/download)，以及一個 Google 帳號。

```bash
git clone https://github.com/ChuLiYu/google-tasks-mcp.git
```

```bash
cd google-tasks-mcp && ./setup.sh
```

安裝程式會一步步引導你，包括建立你自己的 Google client，這也是 10 分鐘裡花最多時間的部分。完成後問 Claude：

> 列出我的 Google Tasks 清單。

## 可以做什麼

| 你說 | 結果 |
|---|---|
| 「週五加一個『打給牙醫』」 | 建立任務 |
| 「我的清單裡跟考試有關的有哪些？」 | 搜尋標題和備註 |
| 「改到週一」 | 更新任務 |
| 「換護照做完了」 | 完成任務 |

想要清空腦袋、規劃期限、每日與每週回顧，並搭配 Google Calendar，可以加裝規劃技能。見[規劃指南](docs/PLANNING.zh-TW.md)。

## 使用前須知

- **寫入由你決定。** 安裝時會問，預設唯讀。如果允許寫入，Claude 不會每次詢問，模型若被任務備註或網頁內容誤導，可能改動任務，被覆寫的文字救不回來。要逐筆核准請見[嚴格模式](docs/CLAUDE_CONNECTION.md#how-a-write-works)，但它限制不了 Claude Code 這類有 shell 權限的 agent。
- **Testing 狀態下 Google 授權只有 7 天。** 這是 [Google 的規定](https://developers.google.com/identity/protocols/oauth2)。重新執行 `./setup.sh`，或在主控台選 **Publish app**。
- **只有日期。** 透過這個 API，Google Tasks 沒有時間和提醒。要準時的事請放 Calendar。
- **不要用舊備份還原 `.data`。** 裡面有防止重複寫入的紀錄。這些紀錄只對同一次連線有效，所以重新連線後，若要重試結果不明的寫入，請先到 Google Tasks 確認。
- **移除任務要手動。** 請到 Google Tasks 刪除。

## 其他客戶端

- **Claude Code：** 安裝程式會印出指令。
- **Claude Web：** 需要一條通到你電腦的 tunnel。見[連線指南](docs/CLAUDE_CONNECTION.md)。
- **ChatGPT：** 見 [Tunnel 指南](docs/CHATGPT_CONNECTION.md)。加入直接寫入後尚未重新測試。

## 疑難排解

| 問題 | 解法 |
|---|---|
| Claude 看不到工具 | 完全結束 Claude 再打開。Claude 執行中會覆蓋設定檔，所以執行 `./setup.sh` 時要讓它能結束 Claude。 |
| 「Docker is not running」 | 啟動 OrbStack 或 Docker。Claude 需要時，服務會自己啟動。 |
| 當機後服務起不來 | 確認沒有程序在跑，刪除 `.data/google-http.lock`，再執行 `./setup.sh`。 |
| 一週後連不上 | 執行 `./setup.sh` 重新連線。 |

## 移除

1. 執行 `./setup.sh disconnect`，撤銷 Google 存取權並移除本機憑證。如果它說 Google 沒有確認，請到 [Google 帳號](https://myaccount.google.com/permissions)自行移除。
2. 執行 `docker compose -f containers/google-compose.yaml down`。
3. 從 Claude Desktop 設定移除 `google-tasks`，再刪除這個資料夾。

## 參與貢獻

歡迎回報問題和提出想法，見 [CONTRIBUTING.md](CONTRIBUTING.md)。資安問題請見 [SECURITY.md](SECURITY.md)，不要開公開 issue。

## 授權

[MIT](LICENSE)
