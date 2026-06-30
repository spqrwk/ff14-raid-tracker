# Vibe Coding 导航 — FF14 高难工具箱

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

---

## 文件导航

```
ff14-raid-tracker/
├── index.html
├── src/
│   ├── main.js              # 入口，挂载 Pinia/Router/ElementPlus
│   ├── App.vue              # 根组件：侧边栏(含API凭证)+主内容+更新日志+ onboarding 切换
│   ├── router/index.js      # 路由表 (hash 模式)
│   ├── utils/storage.js     # localStorage 读写封装
│   ├── composables/         # 可复用逻辑
│   │   ├── useFflogsAuth.js       # FFLogs API 凭证管理（单例，与 Analyze 共享）
│   │   ├── useProgressQuery.js    # 进度统计查询逻辑
│   │   └── useTeammateQuery.js    # 初通队友对比查询逻辑
│   ├── stores/
│   │   ├── teams.js         # 队伍管理 (多副本 duties[], 分P per-duty)
│   │   ├── players.js       # 队员管理 (8 角色，上下场)
│   │   └── records.js       # 记录管理 (含 duty 字段，设备故障等级)
│   └── views/
│       ├── Home.vue         # 开荒面板 (当前副本选择器，5 级犯错)
│       ├── Sessions.vue     # 历史记录 (按把次，加精，副本标签)
│       ├── Stats.vue        # 数据统计 (分 tab 副本筛选，饼图点击弹窗)
│       ├── Players.vue      # 成员管理
│       ├── Teams.vue        # 队伍管理 (多副本多选)
│       ├── Settings.vue     # 数据管理 (导入导出/阶段配置 per-duty)
│       ├── Help.vue         # 使用帮助
│       ├── Analyze.vue      # FFLogs 导入 (死亡事件批量导入)
│       ├── FflogsQuery.vue  # FFLogs 查询 (进度统计 + 初通队友对比)
│       └── Onboarding.vue   # 初始化引导 (创建队伍→队员→完成，侧边栏含FFLogs查询)
```

---

## 核心数据模型

### Record（`stores/records.js`）

```js
{
  id, type: 'mistake'|'progress'|'pull_end',
  teamId, duty, date, pullNumber, phase,
  // mistake 专属:
  playerId, playerName, description,
  level: 'death'|'wipe'|'enrage'|'unforgivable'|'equipment',
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
  id, name, duties: [], phaseOrder: [], createdAt
}
```

---

## 关键业务逻辑

### Pull 号自动推进（`records.js`）

- `getCurrentPullNumber(date)` 计算当前日期最新 Pull 号
- 如果上一把有 fatal 等级或 `pull_end`，号 +1
- Fatal: wipe / enrage / unforgivable / equipment(endPull)
- `addMistakes()` 支持 `endPull` 标记

### 阶段系统

- 默认 P1~P8 + 已完成，可在「数据管理」编辑
- 多个绝境战有专属分 P（`teams.js` 的 `DUTY_PHASES`）
- 选「当前副本」后分 P 自动切换
- 阶段顺序支持 per-duty 编辑

### 副本系统

- 队伍 `duties: []` 支持多副本
- 旧 `duty` 字段自动迁移
- 记录 `duty` 字段标记归属副本
- Home 页右上角「当前副本」选择器

### FFLogs 查询（`FflogsQuery.vue` + composables）

- 凭证与「FFLogs 导入」共享（`ff14_fflogs_id/secret/token`）
- 进度统计：`recentReports` 翻页 → 去重 → 血量查询 → ECharts 图表
- 队友对比：解析目标 ID → `encounterRankings` 拿全部过本 → 初通场详情 → 队友 ID 预解析（无 ID 时用 `RESOLVE_ID_QUERY`）→ 逐队友 `encounterRankings` 统计
- `el-select` 的 `allow-create` 模式下手动输入会返回字符串，所有 `encounterID` 传参处用 `Number()` 转换
- 队友缺失数据时不留空白，显示 `-` 占位
- API 额度自动刷新，429 不再重试

### 数据导出导入

- 完整导出包含所有 `ff14_` 开头的 localStorage key
- 支持完整导入和仅导入队员

---

## 修改指南

### 添加新的犯错等级

1. `Home.vue` — 加 radio-button，更新 `levelLabel`/`levelTagType`
2. `records.js` — 更新 fatal 判断
3. `Stats.vue` — 更新饼图数据
4. `Sessions.vue` — 更新 `levelLabel`/`levelTagType`

### 添加新页面

1. `views/` 新建 `.vue`
2. `router/index.js` 加路由
3. `App.vue` 侧边栏加 `<el-menu-item>`

### 修改版本号

`App.vue` 中的 `CURRENT_VERSION` + `CHANGELOG` + 侧边栏版本文字

### 添加副本默认分 P

`stores/teams.js` 中 `DUTY_PHASES` 对象，key 为副本名称

### 添加 FFLogs Boss ID

`FflogsQuery.vue` 中 `BOSS_MAP` 数组

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
