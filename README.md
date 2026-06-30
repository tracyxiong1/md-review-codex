# md-review-server

简体中文 | [日本語](./README-ja.md)

![demo](./assets/demo.gif)

`md-review-server` 是一个本地 Markdown 可视化评审服务。它保留 `md-review` 的 Markdown 预览、选区评论、评论列表和文件树能力，并将评论存储迁移到 sidecar review 文件，同时提供本地 HTTP API，供 Codex、其他 agent 或脚本读取评论并回写处理状态。

## 功能

- 按原始结构预览 Markdown 和 MDX 文件
- 解析并展示 Frontmatter 元数据
- 对选中文本和指定行范围创建评论
- 编辑和删除已有评论
- 将评论持久化到 `.reviews/*.review.json`
- 通过 HTTP API 读取评论和更新处理状态
- 在目录模式中通过文件树选择 Markdown 文件
- 支持深色模式，跟随系统偏好
- 支持可调整、可折叠的评论侧边栏
- 点击评论行号跳转到对应内容
- Markdown 文件变更后通过 SSE 自动刷新

## 安装

```sh
npm install -g md-review-server
```

当前首轮交付以本地使用为主，也可以在仓库中直接运行：

```sh
pnpm install
pnpm build
node bin/md-review.js docs --port 3030
```

## 使用方式

```sh
md-review-server [options]              # 浏览当前目录下的 Markdown 文件
md-review-server <file> [options]       # 预览单个 Markdown 文件
md-review-server <directory> [options]  # 浏览指定目录下的 Markdown 文件
```

### 参数

```sh
-p, --port <port>           服务端口，默认 3030
    --host <host>           监听地址，默认 127.0.0.1
    --review-dir <dir>      review sidecar 目录，默认 .reviews
    --active-file <file>    目录模式下初始选中的文件
    --readonly              禁用评论写入 API
    --no-open               不自动打开浏览器
    skill <command>         安装、更新或检查内置 Codex skills
-h, --help                  显示帮助信息
-v, --version               显示版本号
```

### 示例

```sh
md-review-server
md-review-server docs
md-review-server README.md
md-review-server docs/guide.mdx
md-review-server docs --active-file docs/guide.md --port 8080
md-review-server skill install
md-review-server skill update --force
```

默认只监听 `127.0.0.1`。如果使用 `--host 0.0.0.0`，服务会在启动时输出安全提示；MVP 不包含认证能力。

## 评论数据

评论由服务端写入 Markdown 所在 review 目录：

```text
docs/.reviews/guide.v2.review.json
```

review 文件使用 JSON 存储，核心字段包括：

```json
{
  "schemaVersion": 1,
  "document": "guide.v2.md",
  "comments": [
    {
      "id": "c001",
      "file": "guide.v2.md",
      "startLine": 12,
      "endLine": 12,
      "startOffset": 4,
      "endOffset": 18,
      "selectedText": "selected text",
      "beforeText": "before",
      "afterText": "after",
      "comment": "需要补充说明",
      "status": "open"
    }
  ]
}
```

支持的评论状态：

- `open`：待处理
- `resolved`：已处理
- `partially_resolved`：部分处理
- `unresolved`：无法处理，需记录原因
- `ignored`：明确跳过

## HTTP API

### 获取会话信息

```sh
curl http://127.0.0.1:3030/api/session
```

### 获取待处理评论

```sh
curl 'http://127.0.0.1:3030/api/comments?file=guide.v2.md&status=open'
```

### 创建评论

```sh
curl -X POST 'http://127.0.0.1:3030/api/comments' \
  -H 'Content-Type: application/json' \
  -d '{
    "file": "guide.v2.md",
    "startLine": 12,
    "endLine": 12,
    "selectedText": "selected text",
    "comment": "需要补充说明"
  }'
```

### 批量回写状态

```sh
curl -X PATCH 'http://127.0.0.1:3030/api/comments' \
  -H 'Content-Type: application/json' \
  -d '{
    "updates": [
      {
        "id": "c001",
        "file": "guide.v2.md",
        "status": "resolved",
        "targetFile": "guide.v3.md",
        "resolution": "已补充说明。"
      }
    ]
  }'
```

## Codex 评审循环

推荐使用目录模式启动 review server：

```sh
md-review-server docs --port 3030 --active-file docs/guide.v2.md
```

典型流程：

1. Codex 生成一个版本化 Markdown 文件，例如 `guide.v2.md`
2. 用户在浏览器中选区并创建评论
3. 服务端将评论写入 `.reviews/*.review.json`
4. Codex 通过 `GET /api/comments?status=open` 获取待处理评论
5. Codex 生成下一版 Markdown，例如 `guide.v3.md`
6. Codex 通过批量 `PATCH /api/comments` 回写每条评论的处理状态
7. 用户在同一个 review server 中选择新版本继续评审

### 安装 Codex Skill

包内提供 `markdown-review-loop` skill，用于让 Codex 自动执行启动 review server、读取评论、生成下一版 Markdown 和回写状态的流程。

```sh
npx -y md-review-server@latest skill install
```

如果已经全局安装 `md-review-server`，也可以直接运行 `md-review-server skill install`。

安装后可通过 `$markdown-review-loop` 显式触发，例如：

```text
使用 $markdown-review-loop 帮我启动这份 Markdown 的评审循环。
```

skill 依赖本机可运行 `md-review-server`。本地开发阶段可以先在仓库中执行 `npm link`，或使用发布后的 npm 包。

更新 skill：

```sh
npx -y md-review-server@latest skill update
md-review-server skill doctor
```

## 评论管理

### 添加评论

1. 在 Markdown 预览区域选择文本
2. 点击出现的 `Comment` 按钮
3. 输入评论内容
4. 按 `Cmd/Ctrl+Enter` 或点击 `Submit`

### 编辑评论

1. 点击评论上的编辑按钮
2. 修改文本框中的内容
3. 按 `Cmd/Ctrl+Enter` 或点击 `Save`
4. 按 `Escape` 或点击 `Cancel` 放弃修改

### 快捷键

- `Cmd/Ctrl+Enter`：提交或保存评论
- `Escape`：取消编辑
- `Cmd+K`：目录模式中聚焦搜索框

## 本地开发

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm lint
```

## License

[MIT](./LICENSE)
