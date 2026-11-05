# Managing tasks and deadlines with an LLM

繁體中文閱讀版：[PLANNING.zh-TW.md](PLANNING.zh-TW.md).


**Core idea: your head only decides; the system remembers.** Once something is in a trusted place and has a next step, you no longer have to keep holding it in mind.

### One place for each thing

| What | Where | Test | Example |
|---|---|---|---|
| Fixed commitments, hard deadlines | Google Calendar | Missing the time has real consequences | Exam, appointment, `截止：考試準備` |
| The next concrete action | Google Tasks | Starts with a verb, doable in one sitting | `Take one full mock exam` |
| Ideas, information | Nowhere, or elsewhere | No action needed now | "Maybe I could change jobs" |
| Understanding, breaking down, choosing | The LLM | It stores nothing; when the conversation ends it no longer counts | |

- **A Tasks date is a planned work date.** It has no time, sends no reminder and guarantees nothing. Put anything time-critical in Calendar.
- **Hard deadlines use both.** Calendar holds an all-day event `截止：<name>`. Tasks holds actions scheduled backward from it, with the note `期限：<name> YYYY-MM-DD`. If the two disagree, Calendar wins; the LLM reports the mismatch and does not fix it on its own.
- **Calendar holds only real commitments.** Focus blocks are created only when you ask. Otherwise the calendar soon stops being trustworthy.

### Four workflows

After installing the skill below, these phrases trigger them. The skill's trigger phrases are in Traditional Chinese.

| When | You say | What the LLM does |
|---|---|---|
| Head is full | 「清空腦袋：明天要繳費、下週三看牙、想學西班牙文⋯」 (brain dump) | Sorts each item into Calendar, Tasks or no action, shows one table, and writes everything after one confirmation |
| New deadline | 「規劃期限：3/20 前準備好考試」 (plan a deadline) | Checks the calendar, schedules 3–7 actions backward with a buffer, says so plainly if time is short, then creates them after confirmation and reads them back |
| Start of day | 「今天做什麼」 (what today) | Lists fixed commitments and at most 3 suggested tasks; for each overdue task you choose today, a new date, or drop |
| Once a week | 「每週回顧」 (weekly review) | Looks 14 days ahead for at-risk deadlines, deadlines without a next step and overfull days, and asks at most 3 questions |

### Rules that reduce pressure

- **Overdue is information, not failure.** The LLM does not count what you failed to do. Dropping something is a normal outcome.
- **At most 3 suggestions a day.** Ask again when they are done; the list need not be read all at once.
- **There is always a next step.** A deadline with only a name is the risky kind. Planning names the first action and fixes it as "when X happens, I start Y".
- **Only ask questions that change the result.** Few fields; most things need one confirmation.

Basis and limits: research found that writing a concrete plan for an unfinished goal can remove its interference with attention ([Masicampo & Baumeister 2011](https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_miscellaneous_918752704)), and that if-then plans help execution ([Gollwitzer 2015](https://bpb-us-e1.wpmucdn.com/wp.nyu.edu/dist/c/6235/files/2019/02/gollwitzer-2015-setting-ones-mind-on-action.pdf)). These are psychology studies, not measurements of this product. "At most 3" and "a 2-day buffer" are chosen defaults that you can adjust. This project has not measured any effect on productivity or stress.

### Tools you need

| Tool | Purpose | How to get it |
|---|---|---|
| This project's MCP | Read and write Google Tasks | [Claude connection guide](CLAUDE_CONNECTION.md) |
| Google Calendar connector | Read commitments, create events | Claude's Connectors directory; this project provides no Calendar tools |
| [`tasks-calendar-planner` skill](../skills/tasks-calendar-planner/SKILL.md) | The four workflows and safety rules | See below |

Both connectors must use the same Google account, or commitments and tasks will not line up.

To install the skill, run the command below to produce `dist/tasks-calendar-planner.zip`, then upload it in Claude at **Customize > Skills > + > Create skill > Upload a skill** ([official guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills); the actual interface and plan availability take precedence).

```sh
npm run skill:package
```

In Claude Code, copy the folder to `~/.claude/skills/` instead. ChatGPT does not support this skill format; you could paste the content into custom instructions, but that is untested.

**The trade-off:** writes run directly after the connection grant. A model misled by a task note or web page could change tasks directly, and overwritten content cannot be recovered. The skill tells the model to treat such content as data and to confirm before batch operations, but that is guidance to a model, not a security guarantee. Use a dedicated account. For stricter control, switch to per-write approval (see the [Claude connection guide](CLAUDE_CONNECTION.md)).
