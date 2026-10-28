# AI-Town · 艾瑟利亚小镇

**开源 AI 模拟小镇，让虚拟居民在同一个世界里生活、交流，并留下不断变化的关系与记忆。**

AI-Town（应用内名称 Aetheria）是一个以像素小镇为舞台的多智能体社会模拟沙盒。居民拥有不同的职业、性格、需求与目标，会选择行动、前往建筑、参与工作和消费，在相遇时交谈。你可以旁观小镇的日常，也可以调整居民设定、触发事件，观察个人经历如何影响整个社区。

An MIT-licensed AI town and multi-agent social simulation sandbox built with React, TypeScript, and Gemini.

[MIT License](#开源协议) · [功能介绍](#在小镇里可以做什么) · [本地运行](#本地运行)

## 在小镇里可以做什么

| 模块 | 内容 |
| --- | --- |
| 小镇全景 | 观察居民位置、建筑与活动，切换天气、暂停或加快模拟时间。 |
| 居民与决策 | 查看角色档案、需求、目标、行动计划，以及 Utility AI 对候选行动的评分。 |
| 对话与记忆 | 读取居民对话、互动记录、记忆检索与反思内容。 |
| 社会关系 | 观察熟悉度、信任、好感、敬重、竞争等维度及关系阶段的变化。 |
| 小镇经济 | 查看工作收入、商品、商店库存、消费记录和经济事件。 |
| 信息传播 | 查看居民掌握的信息、来源、传播与信念变化。 |
| 居民塑造 | 创建、编辑或删除角色，调整背景、大五人格、MBTI 和外观颜色；也可请求生成角色设定。 |
| 事件与分析 | 触发小镇事件，查看影响与社会动态分析。 |
| 数据观察 | 查看 API 调用记录、回退情况和本地配额估算。 |
| 对话导出 | 将模拟产生的对话导出为 OpenAI Chat、ShareGPT 或 Alpaca 风格的 JSONL。 |

导出功能提供数据转换，不包含模型训练服务；用于具体训练平台前需要自行检查其数据格式与要求。

## 模拟如何运行

居民行为由规则系统与语言模型共同构成：

1. **需求变化**：生理、心理、社交和认知需求随模拟推进而变化。
2. **行动选择**：Utility AI 综合需求、人格、目标、环境、关系与记忆，对候选行动评分。
3. **目标与计划**：将选择转化为目标、行动序列和建筑间的移动。
4. **互动与反馈**：对话、工作、消费和事件改变居民状态、关系与知识。
5. **记忆与反思**：按相关性、时效性与重要性检索记忆，为后续交流提供上下文。

Gemini 通过服务端接口用于对话、反思、小镇分析、事件影响和角色设定生成。未配置模型密钥、请求失败或进入冷却时，相关路径会使用规则生成的回退内容。回退内容不代表真实模型输出；当前配额与 Token 面板包含估算值，不能替代服务提供商的实际用量与账单。

## 技术栈与结构

- **界面**：React、TypeScript、Vite、Tailwind CSS、Motion、Lucide。
- **小镇渲染**：Canvas 与 React 交互面板。
- **服务端**：Node.js、Express、Google Gen AI SDK。
- **状态存储**：浏览器 LocalStorage；Firebase / Firestore 云同步集成。

```text
src/
  App.tsx                 模拟调度与应用状态
  components/             小镇画布、居民、关系、经济、事件等界面
  systems/                需求、效用、目标、计划、行动、经济与信息系统
  services/               AI 请求、记忆检索与 Firebase 访问
  data/                   小镇初始设定
  types/                  居民、建筑、互动等数据类型
server.ts                 AI API 与前端服务入口
firestore.rules           Firestore 规则源文件
bun.lock                  依赖锁文件
```

## 本地运行

### 环境要求

- Node.js 和 Bun。
- 使用 Gemini 生成功能时，需要自己的 Gemini API 密钥及相应的模型访问权限。
- 当前版本在初始化时会读取 Firebase 配置。使用云同步前，需要准备自己的 Firebase Web App 和 Firestore 数据库。

### 安装依赖

```bash
git clone https://github.com/HashBrown-bot/AI-Town.git
cd AI-Town
bun install --frozen-lockfile
cp .env.example .env
```

在 `.env` 中设置 `GEMINI_API_KEY`。如果暂时不使用 Gemini，将其设为空值；未配置密钥时，相应接口会使用规则生成的回退内容。模型名称在 `server.ts` 中配置，请根据自己的模型访问权限检查。

```dotenv
GEMINI_API_KEY=
```

Gemini 密钥仅用于服务端，请勿将密钥写入前端代码、截图、公开日志或 Git 提交。`.env.example` 中的示例值需要替换或清空。

### Firebase 配置

当前代码从 `firebase-applet-config.json` 读取 Firebase Web App 配置，并通过 `firestoreDatabaseId` 选择数据库。请使用自己项目的配置，不要使用或分享他人的云项目配置。该文件目前由 Git 跟踪，填写自己的配置前，应先调整仓库的配置加载和忽略方式，避免误提交。

仓库现有的 Firestore 规则允许未认证用户读取和写入部分集合。使用真实数据或公开部署前，请自行设计并验证认证、授权和数据库安全规则；修改本地规则文件不会自动更新云端配置。

### 启动项目

```bash
bun run dev
```

在浏览器中打开 `http://localhost:3000`。开发环境由 Express 同时提供 API 和 Vite 中间件。

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动开发服务。 |
| `bun run lint` | 执行 TypeScript 类型检查。 |
| `bun run build` | 构建前端到 `dist/`。 |
| `bun run preview` | 预览前端构建产物，不提供 Express AI API。 |
| `NODE_ENV=production bun run start` | 在已构建前端的基础上启动完整服务。 |

## 数据与使用边界

小镇初始角色、场景与模拟内容用于虚构世界体验。浏览器会保存模拟状态；Firebase 连接可用时，居民状态、互动、事件等数据可能写入所配置的 Firestore。启用 Gemini 时，请求所需的角色、对话、记忆或事件上下文会发送到相应模型服务。

请使用虚构资料体验与开发。分享截图、导出对话、提交 Issue 或贡献代码之前，检查其中的个人信息、密钥与云资源标识。

项目适合本地体验、教学与模拟机制探索。模型输出和社会分析是生成或规则模拟的结果，不是对真实个人或社会现象的可靠预测。公开部署前需要自行完善访问控制、调用预算和数据权限。

## 参与项目

欢迎通过 Issue 讨论想法、报告可复现问题，或通过 Pull Request 改进模拟系统、界面、文档与测试。提交时请说明改动的行为与验证方式，使用虚构样例，并保留已有贡献者和第三方依赖的许可说明。

## 开源协议

本项目采用 **MIT License**。以下为完整许可文本；项目中的第三方依赖遵循各自的许可证。为便于 GitHub 自动识别，发布时也可将以下文本保存为仓库根目录下的 `LICENSE` 文件。

```text
MIT License

Copyright (c) 2026 AI-Town contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
