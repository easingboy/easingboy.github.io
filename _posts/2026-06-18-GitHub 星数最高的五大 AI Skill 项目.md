---
layout:       post
title:        "GitHub 星数最高的五大 AI Skill 项目"
author:       "Jacky"
header-style: text
catalog:      true
tags:
    - 人工智能
    - AI Skill
    - GitHub
---

> 统计了GitHub 仓库公开数据、OpenAgentSkill 排行榜、wind8ai/skills-top-stars 精选列表等至今（2026 年 6 月）最受欢迎的AI Skill 项目，排名基于 GitHub Star 数，反映社区认可度和流行趋势。AI Skill 是一种模块化的 AI 代理行为指令文件（通常为 SKILL.md 或 CLAUDE.md），可被 Claude Code、Cursor、Codex 等 AI 编码工具动态加载，使 AI 在特定领域表现更专业、更可控。

---

## 一、Superpowers — 编码智能体的完整开发方法论

| 项目 | 详情 |
|------|------|
| **仓库** | [obra/superpowers](https://github.com/obra/superpowers) |
| **Star 数** | ~221K ⭐ |
| **Fork 数** | ~20K |
| **许可证** | MIT License |
| **创建者** | Jesse Vincent（Keyboardio 创始人，开源社区资深贡献者） |
| **所属组织** | Prime Radiant |

### 项目简介

Superpowers 是目前 GitHub 上 Star 数最高的 AI Skill 项目，定位为**编码智能体（Coding Agent）的完整软件开发方法论与技能框架**。它的核心理念是：让 AI 在写代码之前，先像资深工程师一样思考、规划和验证，而不是盲目地直接生成代码。

### 核心工作流程

1. **需求澄清**：不盲目写代码，先退一步询问用户真正的意图和约束条件
2. **设计规范**：通过对话提炼出规格说明，分段展示供用户审核确认
3. **实施计划**：设计批准后制定清晰的实施计划，强调 **TDD（测试驱动开发）**、**YAGNI（你不会需要它）** 和 **DRY（不要重复自己）**
4. **子智能体驱动开发**：用户确认后启动子智能体逐任务推进，包含检查和审查环节，可自主工作数小时不偏离计划
5. **自动触发**：技能自动触发，用户无需做任何特殊操作

### 包含技能一览

| 类别 | 技能名称 | 说明 |
|------|---------|------|
| 测试 | test-driven-development | 红绿重构循环（含测试反模式参考） |
| 调试 | systematic-debugging | 4 阶段根因分析流程 |
| 调试 | verification-before-completion | 确保问题真正被修复 |
| 协作 | brainstorming | 苏格拉底式设计精炼 |
| 协作 | writing-plans / executing-plans | 详细实施计划与带检查点的批量执行 |
| 协作 | dispatching-parallel-agents | 并发子智能体工作流 |
| 协作 | subagent-driven-development | 两阶段审查的快速迭代 |
| 协作 | using-git-worktrees | 并行开发分支 |
| 协作 | finishing-a-development-branch | 合并/PR 决策工作流 |
| 元技能 | writing-skills | 按最佳实践创建新技能 |
| 元技能 | using-superpowers | 技能系统入门介绍 |

### 支持平台

支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot CLI、Kimi Code、OpenCode 等 **11 种**主流 AI 编码工具。

### 适用场景

- 需要规范化 AI 辅助开发的团队或个人
- 希望自动执行 TDD 流程的场景
- 大型任务需要 AI 自主长时间执行
- 企业级开发（提供商业支持）

---

## 二、ECC（Everything-Claude-Code）— 代理工具操作系统

| 项目 | 详情 |
|------|------|
| **仓库** | [affaan-m/ECC](https://github.com/affaan-m/ECC)（原 everything-claude-code） |
| **Star 数** | ~205K ⭐ |
| **Fork 数** | ~31K |
| **许可证** | MIT License |
| **创建者** | Affaan Mustafa（Anthropic 黑客松冠军，PMX 创始工程师） |
| **当前版本** | 2.0.0 稳定版 |

### 项目简介

ECC 全称"Extensible Coding Companion"（可扩展编码伴侣），定位为**代理工具操作系统（Agent Harness OS）**，是目前规模最大、覆盖最广的 AI 编码代理增强框架。它围绕五大核心能力构建：技能（Skills）、本能（Instincts）、记忆（Memory）、安全（Security）和研究优先开发（Research-first Development）。

### 核心能力

| 能力维度 | 说明 |
|---------|------|
| **Skills（技能）** | 235+ 个预置编程最佳实践和模式库，覆盖多语言、多框架 |
| **Instincts（本能）** | 代理的默认行为规范和决策逻辑 |
| **Memory（记忆）** | 跨会话的上下文持久化和数据隔离机制 |
| **Security（安全）** | GateGuard、IOC、AgentShield 等多层安全防护 |
| **Research-first（研究优先）** | 优先调研再行动的开发范式 |

### 规模数据

| 指标 | 数值 |
|------|------|
| 代理数 | 67 个（覆盖 TypeScript、React、Vue、Python、Rust、Kotlin、Java、C++ 等） |
| 技能数 | 235+ 个 |
| 斜杠命令 | 91 个（含 GitHub 原生协作命令） |
| 语言本地化 | 12 种（含简体中文、繁体中文、日语、韩语等） |
| CI 测试通过率 | 2836/2836（100%） |
| SLSA 安全等级 | Level 3 |

### 支持平台

支持 Claude Code、Cursor、Codex（OpenAI）、OpenCode、Kiro、Gemini、Qwen、Trae、Zed、CodeBuddy（腾讯）、VS Code/GitHub Copilot 等 **11 种**AI 编码工具。

### 适用场景

- 多代理统一管理——一套技能/规则可同时部署到多个 AI 编码工具
- 团队编码规范统一——通过规则体系和代理审查确保一致性
- 全栈项目开发——覆盖 React、Vue、Django、Spring Boot 等主流框架
- 安全优先的开发流程——GateGuard 防护、prompt defense baselines
- GitHub 原生协作——通过 epic-* 命令实现任务认领、同步、验证、发布

---

## 三、Andrej Karpathy Skills — 65 行约束如何改变 AI 编码

| 项目 | 详情 |
|------|------|
| **仓库** | [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) |
| **Star 数** | ~167K ⭐（含组织镜像合计 ~220K） |
| **Fork 数** | ~17K |
| **许可证** | MIT License |
| **创建者** | Forrest Chang（Multica AI 创始人 & CEO） |
| **内容** | 一个 CLAUDE.md 文件（仅 65 行纯文本） |

### 项目简介

这是 GitHub 历史上罕见的**纯文本文件达到 10 万+ Star**的项目——没有代码、没有演示、没有文档站，只有 65 行行为准则。项目灵感来自 Andrej Karpathy（前 Tesla AI 总监、OpenAI 创始成员）对 LLM 编码四大系统性弱点的公开讨论，由 Forrest Chang 将这些观察提炼为可操作的行为指令。

### Karpathy 指出的 LLM 编码四大缺陷

1. 🧠 **跳过思考，直接编码**：LLM 几乎从不花时间理解领域或需求约束，大部分错误来自假设错误而非能力不足
2. 🏗️ **过度工程化**：LLM 倾向于生产超出需求范围的抽象，一个排序需求可能产出 200 行的泛型排序框架
3. 🔧 **连带修改（Scope Creep）**：修改一处代码时经常"顺手"重写周围注释、重构没坏的部分、删除看起来"多余"的代码，导致 diff 膨胀
4. 🎯 **缺乏目标驱动**：LLM 不擅长自我验证，"修复 bug"→改完就说好，缺少"写测试来验证"的闭环

### 四条铁律

| 原则 | 核心指令 | 对应痛点 |
|------|---------|---------|
| **Think Before Coding** | 写出假设，不确定就问；有多种解释列出来，不要默默选一个；有更简单的方法说出来；困惑时停下来问 | 瞎假设不求证 |
| **Simplicity First** | 用最少的代码解决问题；禁止超出需求的功能、为单次使用设计的抽象、未被请求的"灵活性" | 过度工程化 |
| **Surgical Changes** | 只触碰必须触碰的代码；不"改进"相邻代码；匹配已有风格；发现无关死代码只提及不删除 | 误伤友军 |
| **Goal-Driven Execution** | 定义成功标准，循环直至验证；"修复 bug"→写测试→让测试通过；多步任务每步附带验证检查点 | 模糊指令 |

### 安装方式

```bash
# 方式一：Claude Code 插件（跨项目生效）
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills

# 方式二：直接放全局配置（所有项目生效，推荐）
curl -o ~/.claude/CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
```

### 适用场景

- Claude Code / Cursor 日常用户——减少 LLM 的过度工程化和不必要的代码改动
- 团队工程效能负责人——在团队 CLAUDE.md 中集成统一行为基准
- 追求代码可审查性的开发者——厌倦了 LLM 生成的"超级 diff"，想要干净的 PR

### 项目哲学

andrej-karpathy-skills 用一个 65 行的纯文本文件定义了 AI 编码的新行为基线。它不是新模型、新框架、新语言——只是一份写得很好的约束。**自身就是"简单优先"原则的最好证明**。

---

## 四、Anthropic Skills — 官方 Agent Skills 实现

| 项目 | 详情 |
|------|------|
| **仓库** | [anthropics/skills](https://github.com/anthropics/skills) |
| **Star 数** | ~147K ⭐ |
| **Fork 数** | ~17K |
| **许可证** | Apache 2.0（示例技能）/ Source-available（文档技能） |
| **创建者** | Anthropic 官方团队 |
| **定位** | Agent Skills 标准制定者与官方实现 |

### 项目简介

这是 Anthropic 官方维护的 Agent Skills 仓库，也是 **Agent Skills 规范（spec）**的官方实现。它不仅提供了可直接使用的技能示例，还定义了 Agent Skills 的标准规范，是整个 AI Skill 生态的"宪法级"项目。仓库包含从创意应用到技术任务、再到企业工作流的各类技能，同时公开了驱动 Claude 文档能力的底层技能源码。

### 仓库结构

```
anthropics/skills/
├── skills/          # 技能示例
│   ├── docx/       # Word 文档创建与编辑技能（Source-available）
│   ├── pdf/        # PDF 处理技能（Source-available）
│   ├── pptx/       # PowerPoint 创建与编辑技能（Source-available）
│   ├── xlsx/       # Excel 创建与编辑技能（Source-available）
│   └── ...         # 更多创意、技术、企业类技能
├── spec/            # Agent Skills 规范
└── template/        # 技能模板（创建新技能的起点）
```

### 技能分类

| 分类 | 示例 | 说明 |
|------|------|------|
| **创意与设计** | art、music、design | 艺术创作、音乐生成、UI 设计 |
| **开发与技术** | testing、mcp-server-generation | Web 应用测试、MCP 服务器生成 |
| **企业与沟通** | communications、branding | 企业沟通、品牌规范 |
| **文档处理** | docx、pdf、pptx、xlsx | 驱动 Claude 文档能力的底层技能 |

### 安装与使用

**Claude Code：**

```bash
# 注册官方市场
/plugin marketplace add anthropics/skills

# 安装文档技能或示例技能
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```

**Claude.ai：** 付费用户可直接使用所有示例技能。

**Claude API：** 可通过 Skills API 上传和调用自定义技能。

### 创建自定义 Skill

Skills 的结构极为简洁——只需一个包含 YAML frontmatter 的 SKILL.md 文件：

```yaml
---
name: my-skill-name
description: 描述这个技能的功能和适用场景
---

# My Skill Name

[在这里编写 Claude 执行此技能时将遵循的指令]

## 示例
- 示例用法 1
- 示例用法 2

## 准则
- 准则 1
- 准则 2
```

### 核心价值

- **标准制定者**：定义了 Agent Skills 规范（agentskills.io），是行业的"宪法级"参考
- **生产级验证**：文档技能已在 Claude 产品中大规模使用，经过实战检验
- **开源参考**：即使是 Source-available 的文档技能也公开了源码，供开发者学习复杂技能的编写方式
- **生态枢纽**：Partner Skills（如 Notion Skills for Claude）正在形成围绕 Anthropic Skills 的生态体系

---

## 五、System Prompts and Models of AI Tools — AI 工具内部提示词大全

| 项目 | 详情 |
|------|------|
| **仓库** | [x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools) |
| **Star 数** | ~139K ⭐ |
| **Fork 数** | ~35K |
| **许可证** | 自定义 LICENSE |
| **创建者** | Lucas Valbuena（x1xhlol），16 岁西班牙开发者，ZeroLeaks 组织创始人 |

### 项目简介

这个项目专注于**收集和公开各类主流 AI 工具的系统提示词（System Prompts）、内部工具定义（Internal Tools）以及 AI 模型信息**。它让开发者能够深入了解各 AI 工具的底层行为指令，是提示词工程研究和 AI 安全研究的重要资源。项目持续跟踪各 AI 工具提示词的版本变化，保持高度活跃更新。

### 收录的 AI 工具（28+ 个目录）

#### 编码/开发类

| 工具 | 核心功能 | 最近更新 |
|------|---------|---------|
| **Augment Code** | AI 编程辅助，含 GPT-5 工具定义 | 2025-08 |
| **Cursor** | AI 代码编辑器提示词（含 Agent 2.0） | 2025-11 |
| **Devin AI** | 全自主 AI 软件工程师（含 DeepWiki） | 2025-11 |
| **Windsurf** | AI 代码编辑器（含 Tools Wave 11） | 2025-07 |
| **VSCode Agent** | VS Code 内 AI 代理提示词 | 2025-08 |
| **Replit** | 在线 IDE 的 AI 提示词 | 2025-07 |
| **Kiro / Trae / Junie / Same.dev** | 各类 AI 编码代理提示词 | 2025-05~09 |

#### 设计/UI 生成类

| 工具 | 核心功能 | 最近更新 |
|------|---------|---------|
| **v0** | Vercel v0 UI 生成提示词与工具 | 2026-05 |
| **Lovable / Orchids.app / Leap.new** | AI 应用构建提示词 | 2025-09 |

#### 代理/自动化类

| 工具 | 核心功能 | 最近更新 |
|------|---------|---------|
| **Manus** | 全自主 AI 代理工具与提示词 | 2025-03 |
| **Cluely / Poke / Comet** | 各类 AI 代理工具提示词 | 2025-06~2026-02 |

#### 模型/平台类

| 工具 | 核心功能 | 最近更新 |
|------|---------|---------|
| **Anthropic** | Claude Sonnet 4.6 等模型提示词 | 2026-03 |
| **Google** | AI Studio vibe-coder 提示词 | 2025-12 |

### 核心价值

1. **系统提示词公开**：完整收录各 AI 工具的系统提示词，让用户了解 AI 工具的底层行为指令
2. **工具定义（Tools JSON）**：部分工具还提供了工具调用定义文件，揭示 AI 工具的能力边界
3. **持续追踪更新**：项目持续跟踪各 AI 工具提示词的版本变化（如 Cursor Agent 2.0、Windsurf Tools Wave 11）
4. **模型信息**：收录模型本身的系统提示（如 Anthropic Claude Sonnet 4.6）

### 适用场景

| 场景 | 说明 |
|------|------|
| **提示词工程研究** | 学习各大 AI 厂商如何设计系统提示词 |
| **AI 工具选型** | 通过了解底层提示词来评估工具能力和行为模式 |
| **AI 安全研究** | 分析各工具的安全约束和边界设定 |
| **自定义开发** | 参考主流工具的提示词设计来构建自己的 AI 代理 |
| **行业趋势分析** | 通过提示词变化追踪 AI 工具的功能演进方向 |

---

## 五大项目对比总结

| 维度 | Superpowers | ECC | Karpathy Skills | Anthropic Skills | System Prompts |
|------|------------|-----|----------------|-----------------|----------------|
| **Star 数** | ~221K | ~205K | ~167K | ~147K | ~139K |
| **核心定位** | 开发方法论框架 | 代理工具操作系统 | 行为约束准则 | 官方标准实现 | 提示词研究资源 |
| **内容形式** | 20+ 个技能文件 | 67 代理 + 235 技能 + 91 命令 | 1 个 CLAUDE.md（65 行） | 技能示例 + 规范 + 模板 | 28+ 目录的系统提示词 |
| **复杂度** | 中等 | 高 | 极低（最简） | 低 | 中等 |
| **哲学取向** | 流程驱动（先设计再编码） | 全面武装（技能/本能/记忆/安全） | 克制约束（做减法） | 标准制定（官方参考） | 透明揭示（了解底层） |
| **官方性** | 社区 | 社区 | 社区（源自 Karpathy） | Anthropic 官方 | 社区 |
| **适合人群** | 追求规范流程的团队 | 需要全面增强的开发者 | 追求简洁高效的所有人 | Skill 开发者和 Claude 用户 | 提示词研究者 |

### 选择建议

- 🎯 **追求简洁高效** → 选 **Karpathy Skills**，一个文件即可显著改善 AI 编码行为
- 🏗️ **需要完整的开发方法论** → 选 **Superpowers**，让 AI 像资深工程师一样工作
- 🛡️ **需要全面增强和安全防护** → 选 **ECC**，一套体系覆盖所有编码场景
- 📋 **开发自定义 Skill** → 选 **Anthropic Skills**，官方标准 + 模板是最佳起点
- 🔍 **研究提示词设计** → 选 **System Prompts**，了解各 AI 工具的底层指令

> 💡 **提示**：以上项目并非互斥，可根据场景组合使用。例如：使用 Karpathy Skills 做行为基线 + Superpowers 做流程规范 + Anthropic Skills 做自定义扩展。

---

## 参考资源

| 资源 | 链接 |
|------|------|
| Superpowers 仓库 | https://github.com/obra/superpowers |
| ECC 仓库 | https://github.com/affaan-m/ECC |
| Karpathy Skills 仓库 | https://github.com/forrestchang/andrej-karpathy-skills |
| Anthropic Skills 仓库 | https://github.com/anthropics/skills |
| System Prompts 仓库 | https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools |
| Agent Skills 规范 | https://agentskills.io |
| OpenAgentSkill 排行榜 | https://www.openagentskill.com/rankings/most-starred-agent-skills |
| GitHub 高星 Skills 精选 | https://github.com/wind8ai/skills-top-stars |
