---
layout:       post
title:        "使用Ollama本地部署DeepSeek大语言模型"
author:       "Jacky"
header-style: text
catalog:      true
tags:
    - 人工智能
    - Ollama
    - DeepSeek
---

> 本文将详细介绍如何使用 Ollama 在本地部署 DeepSeek 大语言模型，并通过 ChatBox 桌面客户端搭建可视化对话界面，实现完全离线、数据私有的 AI 助手。相比 Open WebUI 的 Web 部署方式，ChatBox 作为原生桌面应用，安装更简单、开箱即用，适合追求轻量便捷的用户。

## 一、为什么选择本地部署

在 AI 大模型快速发展的今天，依赖云端服务存在以下问题：

- **隐私安全**：数据上传云端可能泄露隐私，敏感信息无法得到有效保护
- **网络延迟**：依赖网络连接，响应速度受限
- **费用成本**：API 调用按 Token 计费，长期使用成本不低
- **离线可用**：无网络环境下无法使用

本地部署 DeepSeek 大模型能将所有数据运算限制在本机，有效避免数据传输和存储在云端带来的隐私泄露风险，同时提供更快的响应速度和更低的使用成本。

## 二、Ollama 简介

[Ollama](https://ollama.com/) 是一个[开源](https://github.com/ollama/ollama)框架，专为在本地机器上便捷部署和运行大型语言模型（LLM）而设计，具有以下核心特点：

- **本地执行**：将 AI 模型直接运行在用户设备上，确保数据安全，提供更快的处理速度，减少对外部服务器的依赖
- **丰富的模型库**：提供大量预训练 LLM，包括 Llama 3、DeepSeek、Mistral 等热门模型，用户可针对不同任务和硬件配置选择合适的模型
- **无缝集成**：可与 Python、LangChain、LlamaIndex 等工具和框架无缝集成，支持 OpenAI 兼容的 API 接口
- **定制和微调**：支持提示工程、少样本学习和微调，用户可按需塑造模型行为

## 三、DeepSeek 模型选择指南

DeepSeek-R1 系列提供了从 1.5B 到 671B 的多种参数规模模型，需根据硬件配置和使用场景进行选择。

### 3.1 模型版本对比

| 模型版本 | 模型大小 | 建议内存 | 建议显存 | 适用场景 |
|---------|---------|---------|---------|---------|
| 1.5B | ~1.1GB | 4~8GB | 4GB | 轻量文本处理、简单问答 |
| 7B | ~4.7GB | 16GB | 12GB | 日常使用、文案撰写 |
| 8B | ~4.9GB | 16GB | 14GB | 代码生成、逻辑推理 |
| 14B | ~9GB | 32GB | 26GB | 复杂推理、代码生成 |
| 32B | ~20GB | 64GB | 48GB | 专业级高精度任务 |
| 70B | ~43GB | 128GB+ | 140GB+ | 大规模计算、高复杂任务 |
| 671B | 极大 | 256GB+ | 1TB+ | 前沿科学研究（需集群） |

> **注意**：1.5B~70B 版本为基于 DeepSeek-R1 671B 生成数据在开源底座（如 Qwen、LLaMA）上微调的**蒸馏模型**；671B 为采用 MoE（混合专家）架构的**基础模型**，每 token 仅激活约 370 亿参数，兼顾高效与高性能。

### 3.2 选型建议

| 需求 | 推荐版本 | 说明 |
|------|---------|------|
| 低延迟/低成本，入门体验 | 7B/8B | 性价比最高，普通电脑即可运行 |
| 平衡性能与硬件 | 14B | 适合复杂推理和代码生成 |
| 深度推理+高准确度 | 70B | 接近 GPT-4 水平，需高端硬件 |
| 极致性能 | 671B | 需超算集群或 API 调用 |
| 隐私敏感场景 | 32B~70B 蒸馏版 | 私有化部署兼顾性能与隐私 |

## 四、安装 Ollama

### 4.1 在线安装

**Windows / macOS：**

访问 [Ollama 官网](https://ollama.com/) 或 [Ollama 中文站](https://ollama.org.cn/)，根据操作系统下载安装包，双击安装即可。

**Linux：**

```bash
curl -fsSL https://ollama.com/install.sh | bash
```

**包管理器安装（可选）：**

```bash
# Windows
winget install Ollama.Ollama

# macOS
brew install ollama
```

### 4.2 验证安装

```bash
ollama --version
```

显示版本号即安装成功。

### 4.3 修改模型存储位置

默认模型存储在系统盘，如果需要修改存储路径：

**Windows：**

```bash
setx OLLAMA_MODELS "D:\data\ollama\models"
```

**macOS / Linux：**

```bash
echo 'export OLLAMA_MODELS=/data/ollama/models' >> ~/.bashrc
source ~/.bashrc
```

### 4.4 Docker 部署（可选）

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama
    container_name: ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - /data/ollama:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
      - OLLAMA_ORIGINS=*
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

启动：`docker-compose up -d`

## 五、部署 DeepSeek 模型

### 5.1 在线下载模型

```bash
# 下载并运行（首次运行会自动下载）
ollama run deepseek-r1:7b

# 仅下载不运行
ollama pull deepseek-r1:7b
```

下载时间取决于网络速度和模型大小，1.5B 模型约 1.1GB，8B 模型约 4.9GB。

> **提示**：如果下载过程中出现长时间停滞，可以敲击几次回车键。

### 5.2 使用国内源加速下载

如遇下载缓慢，可使用国内镜像源：

```bash
# 魔塔社区
ollama run modelscope.cn/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF:Q4_K_M

# HF 镜像站
ollama run hf-mirror.com/unsloth/DeepSeek-R1-GGUF:deepseek-r1-7b-q4_k_m.gguf
```

### 5.3 离线导入模型

适用于无法联网的环境：

```bash
# 1. 下载 GGUF 模型文件（从魔塔社区或 HF 镜像提前下载）
# 2. 创建 Modelfile
echo "From ./DeepSeek-R1-7B.gguf" > modelfile-deepseek-7b

# 3. 导入模型
ollama create deepseek-r1:7b -f modelfile-deepseek-7b

# 4. 验证导入
ollama list
```

### 5.4 常用模型管理命令

| 命令 | 作用 |
|------|------|
| `ollama list` | 列出所有已下载模型 |
| `ollama run <模型名>` | 启动模型交互 |
| `ollama pull <模型名>` | 下载模型 |
| `ollama show <模型名>` | 显示模型详细信息 |
| `ollama stop <模型名>` | 停止运行中的模型 |
| `ollama rm <模型名>` | 删除模型 |
| `ollama cp <源模型> <新模型>` | 复制模型 |
| `ollama ps` | 查看当前正在运行的模型 |

### 5.5 命令行对话测试

下载完成后，即可在命令行中直接对话：

```bash
ollama run deepseek-r1:7b
```

启动后模型进入交互模式，可直接输入问题获取回答。但命令行对话体验有限，下面介绍如何通过 ChatBox 获得更友好的图形化交互体验。

## 六、安装 ChatBox

[ChatBox](https://chatboxai.app/zh) 是一款开源的跨平台 AI 桌面客户端，支持连接 OpenAI、Claude、Gemini 等主流云端模型，也完美支持 Ollama 本地模型。它界面美观、操作简单，非常适合作为本地大模型的可视化前端。

### 6.1 ChatBox 核心特点

| 特点 | 说明 |
|------|------|
| **全平台支持** | Windows、macOS、Linux、iOS、Android、Web 全覆盖 |
| **多模型兼容** | 支持 Ollama、OpenAI、Claude、Gemini、DeepSeek API 等 |
| **开箱即用** | 安装后无需额外依赖，直接配置即可使用 |
| **本地数据存储** | 所有对话记录保存在本地，保障数据隐私 |
| **Markdown 渲染** | 支持 Markdown、LaTeX 公式、代码高亮 |
| **免费开源** | 社区版完全免费，GitHub 已获 33k+ Star |

### 6.2 下载安装

访问 [ChatBox 官网](https://chatboxai.app/zh#download) 或 [GitHub Release 页面](https://github.com/Bin-Huang/chatbox/releases)，根据操作系统下载对应版本：

| 平台 | 下载方式 |
|------|---------|
| Windows | 下载 `.exe` 安装包，双击安装 |
| macOS | 下载 `.dmg` 安装包，拖入 Applications |
| Linux | 下载 `.AppImage` 或 `.deb` 包；需安装依赖 `sudo apt install libgtk-3-dev libnotify-dev` |
| iOS / Android | 在 App Store / Google Play 搜索「ChatBox AI」 |

> **提示**：如果之前安装过旧版 ChatBox，建议卸载后安装最新版本，以获得最佳性能体验。

### 6.3 首次启动

安装完成后，双击打开 ChatBox。首次启动会出现配置弹窗，选择「**使用自己的 API Key 或本地模型**」。

## 七、ChatBox 配置接入 Ollama + DeepSeek

### 7.1 基础配置步骤

1. 打开 ChatBox，点击右上角**设置**（齿轮图标）
2. 在「模型提供方」中选择 **Ollama API**
3. 填写以下配置信息：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **API 域名** | `http://127.0.0.1:11434` | Ollama 默认服务地址 |
| **模型** | `deepseek-r1:7b` | 从下拉列表中选择已下载的模型 |

4. 点击**保存**完成配置

> **注意**：确保 Ollama 服务正在运行（系统托盘可查看状态），ChatBox 才能正常连接并识别本地模型。

### 7.2 配置界面语言

默认界面可能为英文，可在设置中修改：

1. 进入**设置** → **显示**
2. 选择「简体中文」
3. 根据喜好选择浅色/深色主题

### 7.3 高级参数设置

在 ChatBox 的「高级设置」中，可以对模型参数进行精细调整：

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| **Temperature** | 0.7 | 控制输出随机性，0→保守确定，1→创意多样 |
| **Top P** | 0.9 | 核采样概率阈值 |
| **Max Tokens** | 4096 | 单次回复最大长度 |
| **上下文消息数** | 16 | 保持长对话的上下文窗口 |

> **调参建议**：
> - 需要严谨回答（如技术问题）→ Temperature 设为 0.3~0.5
> - 需要创意输出（如文案写作）→ Temperature 设为 0.8~1.0
> - 内存占用过高时，将 Max Tokens 降低至 2048

### 7.4 接入局域网中的 Ollama 服务

如果 Ollama 运行在局域网中的另一台机器上：

1. 确保 Ollama 服务端已配置局域网访问（参见 [8.2 节](#82-允许局域网访问)）
2. 在 ChatBox 设置中，将 API 域名改为 Ollama 服务器的内网 IP，如 `http://192.168.x.x:11434`
3. 选择对应的模型，保存即可

### 7.5 同时使用云端 API（可选）

ChatBox 支持同时配置多个模型提供方，可以在本地模型和云端模型之间自由切换：

1. 在设置中添加新的模型提供方（如 OpenAI API、DeepSeek API、硅基流动等）
2. 填写对应的 API 地址和密钥
3. 在对话界面顶部的模型选择器中切换不同模型

## 八、Ollama 服务配置

### 8.1 环境变量说明

| 环境变量 | 作用 | 默认值 |
|---------|------|--------|
| `OLLAMA_HOST` | Ollama 监听地址 | `127.0.0.1:11434` |
| `OLLAMA_ORIGINS` | 允许的跨域来源 | 空 |
| `OLLAMA_MODELS` | 模型存储路径 | 系统默认路径 |

### 8.2 允许局域网访问

如需从局域网其他设备（包括手机上的 ChatBox）访问 Ollama 服务：

**Windows：**

```bash
setx OLLAMA_HOST "0.0.0.0:11434"
setx OLLAMA_ORIGINS "*"
```

**macOS：**

```bash
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
launchctl setenv OLLAMA_ORIGINS "*"
```

**Linux：**

```bash
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.bashrc
echo 'export OLLAMA_ORIGINS=*' >> ~/.bashrc
source ~/.bashrc
```

> **重要**：修改环境变量后需**重启电脑**才能生效。

### 8.3 API 调用示例

Ollama 提供 REST API，可集成到自定义应用中：

**单次请求（非流式）：**

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "解释什么是大语言模型",
  "stream": false
}'
```

**流式响应：**

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "写一段 Python 代码实现快速排序",
  "stream": true
}'
```

## 九、ChatBox 核心功能

### 9.1 智能对话

ChatBox 提供类 ChatGPT 的对话体验：

- **多会话管理**：同时开启多个对话窗口，每个窗口可使用不同模型或不同主题
- **Markdown 渲染**：完美支持加粗、列表、表格、引用等格式
- **代码高亮**：基于 highlight.js 实现 Python、Java、Go、C++、JavaScript 等多语言高亮
- **LaTeX 公式**：数学公式渲染，适合学术研究
- **语音输入**：点击麦克风图标，支持语音转文字输入

### 9.2 对话管理

| 功能 | 说明 |
|------|------|
| 历史记录保存 | 自动保存所有对话历史，随时回顾 |
| 对话导出 | 支持 Markdown、HTML、TXT、JSON 等格式导出 |
| 对话导入 | 可导入之前导出的对话，恢复对话场景 |
| 关键词搜索 | 在历史记录中快速查找特定对话（Ctrl+F） |
| 多对话窗口 | 同时开展多主题对话，互不干扰 |

### 9.3 系统提示词

ChatBox 支持设置系统提示词（System Prompt），让 AI 以特定角色或风格回答：

1. 在对话设置中找到「系统提示词」输入框
2. 输入自定义提示词，例如：
   - *「你是一位专业的 Python 开发者，请用简洁的代码回答问题」*
   - *「你是一位中英翻译专家，翻译时保持原文语气和风格」*
3. AI 会根据提示词调整回答风格

也可以为不同的对话设置不同的系统提示词，快速切换 AI 的角色定位。

### 9.4 快捷指令

ChatBox 内置多种快捷指令，一键触发高效回复：

| 指令 | 用途 |
|------|------|
| 生成代码 | 快速获得代码实现 |
| 翻译英文 | 自动翻译为英文 |
| 写邮件 | 生成正式邮件内容 |
| 自定义 | 可自行创建常用指令模板 |

### 9.5 文件解析

ChatBox 支持直接解析上传的文件内容：

- **PDF 文件**：提取文本内容供 AI 分析
- **Word 文档**：读取 .docx 格式内容
- **Excel 表格**：解析表格数据
- **图片**：OCR 识别图片中的文字

在对话中直接拖拽文件到输入框即可上传。

### 9.6 模型参数实时调整

在对话过程中可以随时调整参数，无需重新配置：

- **Temperature**：实时调节输出创意度
- **Max Tokens**：控制回复长度
- **模型切换**：在对话界面顶部一键切换不同模型

### 9.7 其他功能

| 功能 | 说明 |
|------|------|
| AI 绘图 | 通过 `/imagine` 指令用自然语言生成图像 |
| 图表生成 | 将数据转化为可视化图表 |
| 代码审查 | 拖拽代码文件自动分析并给出建议 |
| 夜间模式 | 顶部工具栏快速切换浅色/深色主题 |
| 键盘快捷键 | 支持自定义快捷键映射 |
| 实时联网 | 获取最新资讯（需配置联网搜索） |

## 十、ChatBox vs Open WebUI 对比

| 对比维度 | ChatBox | Open WebUI |
|---------|---------|-----------|
| **安装方式** | 桌面应用，下载即用 | Python pip 或 Docker |
| **依赖环境** | 无需 Python/Docker | 需要 Python 3.11 或 Docker |
| **使用方式** | 原生桌面客户端 | 浏览器访问 Web 页面 |
| **配置难度** | 极低，几步点击完成 | 中等，需配置服务端口 |
| **多用户支持** | 单用户桌面应用 | 支持多用户、角色权限 |
| **RAG 知识库** | 不支持 | 内置 RAG 功能 |
| **联网搜索** | 支持（需配置） | 内置联网搜索 |
| **插件扩展** | 不支持 | 支持 Pipelines 插件 |
| **移动端** | iOS/Android 原生 App | 浏览器/PWA |
| **适用场景** | 个人使用、快速上手 | 团队协作、知识库应用 |
| **离线运行** | 完全离线 | 完全离线 |

> **选择建议**：
> - **个人日常使用、追求简单便捷** → 选 ChatBox，安装即用，零配置门槛
> - **需要知识库、多用户、团队协作** → 选 Open WebUI，功能更全面
> - **两者可同时安装**，共享同一个 Ollama 服务，按需切换

## 十一、常见问题解决

### 11.1 ChatBox 无法连接 Ollama

1. 确认 Ollama 服务正在运行（检查系统托盘或运行 `ollama list`）
2. 确认 API 地址填写正确：`http://127.0.0.1:11434`
3. 确认防火墙未拦截 11434 端口
4. 尝试在浏览器访问 `http://127.0.0.1:11434`，页面返回 "Ollama is running" 说明服务正常

### 11.2 模型列表为空

1. 确认已下载 DeepSeek 模型：在终端运行 `ollama list`
2. 如果列表有模型但 ChatBox 不显示，尝试重启 ChatBox
3. 检查 API 域名地址是否正确（注意不要多加或漏加 `/`）

### 11.3 模型下载慢/失败

**方案一：使用国内源**

```bash
# 魔塔社区
ollama run modelscope.cn/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF:Q4_K_M

# HF 镜像站
ollama run hf-mirror.com/unsloth/DeepSeek-R1-GGUF:deepseek-r1-7b-q4_k_m.gguf
```

**方案二：离线导入**

从魔塔社区或 HF 镜像站提前下载 GGUF 模型文件，再通过 `ollama create` 导入。

**方案三：关闭代理软件**

部分代理软件可能干扰下载，尝试关闭后直接连接网络。

### 11.4 模型运行卡顿

- 降低模型参数版本（如 14B → 8B → 7B）
- 关闭其他占用 CPU/显存的程序
- 确保模型存储在 SSD 中（提升加载速度）
- GPU 用户安装对应驱动（NVIDIA CUDA / AMD ROCm）
- 在 ChatBox 中将 Max Tokens 调低至 2048，减轻内存压力

### 11.5 Ollama API 无法远程访问

1. 确认已设置 `OLLAMA_HOST=0.0.0.0:11434`
2. 确认已设置 `OLLAMA_ORIGINS=*`
3. 确认已**重启电脑**使环境变量生效
4. 检查防火墙是否放行 11434 端口

### 11.6 ChatBox 对话响应异常

- 确认 Ollama 服务未崩溃：运行 `ollama ps` 检查模型运行状态
- 确认模型参数设置合理：Temperature 在 0~1 之间，Max Tokens 不超过模型上下文限制
- 尝试重启 Ollama 服务和 ChatBox

## 十二、快速上手流程总结

```
┌─────────────────────────────────────────────────────────────┐
│              本地部署 DeepSeek + ChatBox 全流程                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: 安装 Ollama                                        │
│    └─ 官网下载 / brew install / curl 安装                    │
│                                                             │
│  Step 2: 下载 DeepSeek 模型                                  │
│    └─ ollama run deepseek-r1:7b                             │
│                                                             │
│  Step 3: 安装 ChatBox                                       │
│    └─ 官网 chatboxai.app 下载对应平台安装包                   │
│                                                             │
│  Step 4: 配置 ChatBox 连接 Ollama                            │
│    ├─ 设置 → 模型提供方 → Ollama API                        │
│    ├─ API 域名: http://127.0.0.1:11434                      │
│    └─ 选择模型: deepseek-r1:7b                              │
│                                                             │
│  Step 5: 开始对话 🎉                                        │
│    └─ 点击「新对话」即可与 DeepSeek 聊天                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 十三、参考资源

| 资源 | 链接 |
|------|------|
| Ollama 官网 | https://ollama.com/ |
| Ollama GitHub | https://github.com/ollama/ollama |
| Ollama 中文站 | https://ollama.org.cn/ |
| Ollama 官方文档 | https://ollama.readthedocs.io |
| DeepSeek R1 模型库 | https://ollama.com/library/deepseek-r1 |
| ChatBox 官网 | https://chatboxai.app/zh |
| ChatBox GitHub | https://github.com/Bin-Huang/chatbox |
| ChatBox 文档 | https://docs.chatboxai.app/ |
| 魔塔社区 | https://modelscope.cn |
| HF 镜像站 | https://hf-mirror.com |
