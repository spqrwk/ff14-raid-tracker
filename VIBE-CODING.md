# Vibe Coding 导航 — FF14 开荒记录

> 本文件用于快速了解项目结构，方便 AI 辅助开发时快速定位。

---

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Vue 3 (`<script setup>`) |
| 构建 | Vite 5 |
| UI | Element Plus 2.x |
| 状态 | Pinia |
| 图表 | ECharts 5 + vue-echarts 6 |
| 路由 | Vue Router 4 (hash 模式) |
| 存储 | localStorage |
| 部署 | GitHub Pages |

---

## 文件导航

```
ff14-raid-tracker/
├── src/
│   ├── main.js              # 入口，挂载 Pinia/Router/ElementPlus
│   ├── App.vue              # 根组件：侧边栏+主内容+全局CSS+更新日志
│   ├── router/index.js      # 路由表 (hash 模式)
│   ├── utils/storage.js     # localStorage 读写封装
│   ├── stores/
│   │   ├── teams.js         # 队伍管理 (CRUD + 副本预设分P)
│   │   ├── players.js       # 队员管理 (上下场 + 按队伍筛选)
│   │   └── records.js       # 记录管理 (犯错/进度/加精/pull逻辑)
│   └── views/
│       ├── Home.vue         # 开荒面板 (记录犯错/进度/今日摘要)
│       ├── Sessions.vue     # 历史记录 (按日期/按把次 + 加精)
│       ├── Stats.vue        # 数据统计 (表格+折线图+饼图+条形图)
│       ├── Players.vue      # 成员管理 (批量添加表格 + 上下场)
│       ├── Teams.vue        # 队伍管理 (副本预设列表)
│       ├── Settings.vue     # 数据管理 (导入导出/阶段配置/清空)
│       ├── Help.vue         # 使用帮助 (锚点跳转)
│       └── Analyze.vue      # FFLogs 导入 (GraphQL + 批量导入)
```

---

## 核心数据模型

### Record（`stores/records.js`）

```js
{
  id, type: 'mistake'|'progress'|'pull_end',
  teamId, date, pullNumber, phase,
  // mistake 专属:
  playerId, playerName, description, level: 'death'|'wipe'|'enrage'|'unforgivable',
  // progress 专属:
  notes,
  timestamp
}
```

### Player（`stores/players.js`）

```js
{
  id, teamId, name, role: 'MT'|'ST'|'H1'|'H2'|'D1'|'D2'|'D3'|'D4',
  jobs: [], active: true, createdAt
}
```

### Team（`stores/teams.js`）

```js
{
  id, name, duty, phaseOrder: [], createdAt
}
```

---

## 关键业务逻辑

### Pull 号自动推进（`records.js`）

- `getCurrentPullNumber(date)` 计算当前日期最新 Pull 号
- 如果上一把有 `wipe`/`enrage`/`unforgivable` 或 `pull_end`，号 +1
- `addMistakes()` 批量添加同一把的多人犯错，只结束一次

### 阶段系统

- 默认 P1~P8 + 已完成，可在「数据管理」编辑
- 三个绝境战有专属分 P（`teams.js` 的 `DUTY_PHASES`）
- 编辑阶段顺序时自动检测孤儿阶段并提示映射

### FFLogs 导入（`Analyze.vue`）

- OAuth：`www.fflogs.com/oauth/token`（需翻墙）
- API：`cn.fflogs.com/api/v2/client`（GraphQL）
- 手动 Token 模式绕过 OAuth
- 绑定关系按 `name@server` 匹配

### 数据导出导入

- 完整导出包含所有 `ff14_` 开头的 localStorage key
- 导入后需刷新页面

---

## 修改指南

### 添加新的犯错等级

1. `Home.vue` — 加 radio-button，更新 `levelLabel`/`levelTagType`
2. `records.js` — 更新 `pull_end` 判断（如果是致命等级）
3. `Stats.vue` — 加表格列 + 饼图/条形图数据
4. `Sessions.vue` — 更新 `levelLabel`/`levelTagType`

### 添加新页面

1. `views/` 新建 `.vue`
2. `router/index.js` 加路由
3. `App.vue` 侧边栏加 `<el-menu-item>`

### 修改版本号

`App.vue` 中的 `CURRENT_VERSION` + `CHANGELOG` + 侧边栏版本文字

### 添加副本默认分 P

`stores/teams.js` 中 `DUTY_PHASES` 对象，key 为副本名称

---

## 移动端适配

- 断点 768px
- 侧边栏变汉堡菜单 (`App.vue` 的 `mobile-toggle` + `sidebarOpen`)
- 全局 `@media` 在 `App.vue` 末尾
- 各 view 有自己的 `@media` 调整

---

## 部署

- `npm run build` → `dist/`
- GitHub Actions 自动部署 (`.github/workflows/deploy.yml`)
- 本地双击 `start.bat` 用 Python HTTP 服务器
