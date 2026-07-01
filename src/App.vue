<template>
  <div id="app-container">
    <!-- 右上角更新日志按钮 -->
    <div class="changelog-btn" @click="showChangelog = true">
      <el-icon :size="18"><Bell /></el-icon>
    </div>

    <!-- ========== 无队伍时：显示初始化引导 ========== -->
    <Onboarding v-if="showOnboarding" @done="onOnboardingDone" />

    <!-- ========== 正常布局 ========== -->
    <template v-else>
      <!-- 移动端汉堡按钮 -->
      <div class="mobile-toggle" @click="sidebarOpen = !sidebarOpen">
        <el-icon :size="24"><component :is="sidebarOpen ? 'Close' : 'Menu'" /></el-icon>
      </div>

      <!-- 遮罩层 -->
      <div v-if="sidebarOpen" class="mobile-overlay" @click="sidebarOpen = false" />

      <el-container>
        <el-aside width="220px" class="app-aside" :class="{ 'sidebar-open': sidebarOpen }">
          <div class="logo">
            <el-icon :size="28"><Aim /></el-icon>
            <span>FF14 高难工具箱</span>
          </div>
          <el-menu
            :default-active="currentRoute"
            router
            background-color="#1a1a2e"
            text-color="#a0a0b8"
            active-text-color="#ffd700"
            @select="sidebarOpen = false"
          >
            <el-menu-item index="/">
              <el-icon><Monitor /></el-icon>
              <span>开荒面板</span>
            </el-menu-item>
            <el-menu-item index="/sessions">
              <el-icon><List /></el-icon>
              <span>历史记录</span>
            </el-menu-item>
            <el-menu-item index="/stats">
              <el-icon><DataAnalysis /></el-icon>
              <span>数据统计</span>
            </el-menu-item>
            <el-menu-item index="/analyze">
              <el-icon><Download /></el-icon>
              <span>FFLogs 导入</span>
            </el-menu-item>
            <el-menu-item index="/fflogs">
              <el-icon><Search /></el-icon>
              <span>FFLogs 查询</span>
            </el-menu-item>
            <el-menu-item index="/help">
              <el-icon><Reading /></el-icon>
              <span>使用帮助</span>
            </el-menu-item>
            <el-menu-item index="/teams">
              <el-icon><Collection /></el-icon>
              <span>队伍管理</span>
            </el-menu-item>
            <el-menu-item index="/players">
              <el-icon><User /></el-icon>
              <span>成员管理</span>
            </el-menu-item>
            <el-menu-item index="/settings">
              <el-icon><Setting /></el-icon>
              <span>数据管理</span>
            </el-menu-item>
          </el-menu>
          <div class="sidebar-bottom">
            <div class="menu-divider">作者</div>
            <div class="author-item"><el-icon><UserFilled /></el-icon><span><a href="https://ifdian.net/a/luochenchen123" target="_blank" style="color:#ffd700;text-decoration:none">洛辰辰@海猫茶屋</a></span></div>
            <div class="menu-divider">特别鸣谢</div>
            <div class="author-item" style="cursor:pointer" @click="showThanks"><el-icon><UserFilled /></el-icon><span style="color:#ffd700">陆小唐@静语庄园</span></div>
            <div class="menu-divider">FFLogs API</div>
            <div class="sidebar-cred-row">
              <el-input v-model="clientId" placeholder="Client ID" size="small" class="sidebar-cred-input" />
            </div>
            <div class="sidebar-cred-row">
              <el-input v-model="clientSecret" placeholder="Client Secret" size="small" type="password" class="sidebar-cred-input" show-password />
            </div>
            <div class="sidebar-cred-row sidebar-cred-rate">
              <span class="rate-badge-side" :class="{ warning: rateLimit && rateRemaining < 500, danger: rateLimit && rateRemaining < 100 }">
                <template v-if="rateLimit">额度 {{ rateRemaining }}/{{ rateLimit.limitPerHour }}</template>
                <template v-else-if="rateError">{{ rateError }}</template>
                <template v-else-if="hasCredential">加载额度...</template>
                <template v-else>未配置</template>
              </span>
            </div>
            <div class="version-text">v1.3.0</div>
          </div>
        </el-aside>

        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </template>

    <!-- 首次访问提示（Onboarding 时也显示） -->
    <el-dialog
      v-model="showWelcome"
      title="📋 数据存储说明"
      :width="isMobile ? '90%' : '480px'"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="welcome-content">
        <p>本站所有数据（队伍、队员、记录）均存储在<strong>浏览器本地</strong>（localStorage），不会上传到任何服务器。</p>
        <ul>
          <li>✅ 数据仅保存在当前浏览器中</li>
          <li>⚠️ 清除浏览器缓存会导致数据丢失</li>
          <li>💾 请定期到「数据管理」页面<strong>导出备份</strong></li>
          <li>🔄 更换浏览器或设备需手动导入备份</li>
        </ul>
      </div>
      <template #footer>
        <el-button type="primary" @click="dismissWelcome">知道了</el-button>
      </template>
    </el-dialog>

    <!-- 更新日志（Onboarding 时也显示） -->
    <el-dialog v-model="showChangelog" :title="'📦 更新日志 v' + CURRENT_VERSION" :width="isMobile ? '90%' : '520px'" :close-on-click-modal="false">
      <div class="changelog-content">
        <div v-for="(items, ver) in CHANGELOG" :key="ver">
          <div class="changelog-ver">v{{ ver }}</div>
          <ul class="changelog-list">
            <li v-for="(item, i) in items" :key="i">{{ item }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="dismissChangelog">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useTeamStore } from './stores/teams'
import { useFflogsAuth } from './composables/useFflogsAuth'
import Onboarding from './views/Onboarding.vue'

const auth = useFflogsAuth()
// 别名到顶层 ref，模板 v-model 才能正常双向绑定
const { clientId, clientSecret, rateLimit, rateRemaining, rateError, hasCredential } = auth

const route = useRoute()
const teamStore = useTeamStore()

// ---- 初始化引导 ----
// 无队伍且不是从 onboarding 跳转到导入页时，显示引导
const IMPORT_FLAG_KEY = 'ff14_onboarding_import'
const showOnboarding = ref(false)

function updateShowOnboarding() {
  if (teamStore.teams.length > 0) {
    sessionStorage.removeItem(IMPORT_FLAG_KEY)
    showOnboarding.value = false
    return
  }
  // 用户点了"去导入"并且当前在设置页 → 暂时放行
  if (sessionStorage.getItem(IMPORT_FLAG_KEY)) {
    if (route.path === '/settings') {
      showOnboarding.value = false
      return
    }
    // 离开设置页但队伍仍为空 → 清除标记，重新显示 onboarding
    sessionStorage.removeItem(IMPORT_FLAG_KEY)
  }
  showOnboarding.value = true
}

function onOnboardingDone() {
  sessionStorage.removeItem(IMPORT_FLAG_KEY)
  updateShowOnboarding()
}

// 监听队伍变化和路由变化
watch(() => teamStore.teams.length, updateShowOnboarding)
watch(() => route.path, updateShowOnboarding)

function showThanks() {
  ElMessageBox.alert(
    '感谢 <b>陆小唐@静语庄园</b> 为以下副本贡献了默认分P阶段信息：<br><br>' +
    '🏆 究极神兵绝境战 — 19 个阶段<br>' +
    '🐉 幻想龙诗歼灭战 — 48 个阶段<br>' +
    '<span style="color:#808090">新建对应副本的队伍时将自动使用这些分P信息。</span>',
    '特别鸣谢',
    { confirmButtonText: '知道了', dangerouslyUseHTMLString: true, center: true }
  )
}
const currentRoute = computed(() => route.path)

// 移动端
const sidebarOpen = ref(false)
const isMobile = ref(window.innerWidth < 768)
function onResize() { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// 首次访问提示
const WELCOME_KEY = 'ff14_raid_welcome_seen'
const showWelcome = ref(false)
function dismissWelcome() {
  showWelcome.value = false
  localStorage.setItem(WELCOME_KEY, '1')
}

// 更新日志
const CURRENT_VERSION = '1.3.0'
const CHANGELOG = {
  '1.3.0': [
    '阶段顺序改为 per-duty 独立存储，数据管理改为 Tab 切换编辑',
    '开荒进度 Y 轴改为直接显示阶段名，已完成始终排最高位',
    '数据统计三个维度新增设备故障统计',
    '记录进度与手动结束合并，空把次也能正常结束',
    'FFLogs 查询修复 encounterID 类型错误，队友 ID 预解析减少请求',
    '所有时间格式化显式指定 Asia/Shanghai 时区',
    'Stats 页满宽布局，饼图垂直堆叠，移动端 Onboarding 汉堡菜单',
    '帮助文档新增 FFLogs 查询使用说明'
  ],
  '1.2.1': [
    '数据统计 - 队员统计移除按日期划分的列'
  ],
  '1.2.0': [
    '删除队员自动清理关联记录并补进度+结束标记，备注含阶段等级',
    '记录进度默认结束本把，移除额外勾选',
    '开荒面板移除队伍切换器，统一到队伍管理',
    '修复 localStorage 双重 JSON 编码导致数据损坏',
    '修复加精功能因双重编码点击无反应',
    '存储容量显示 + 凭证去引号 + 导入时补全队伍副本',
    '纯进度记录也能显示所属副本',
    '数据统计仅显示上场队员'
  ],
  '1.1.0': [
    '队伍支持多副本，记录分副本标记，分P信息按副本独立',
    '新增 FFLogs 查询工具（进度统计 + 初通队友对比）',
    '新增初始化引导流程，侧边栏 API 凭证管理',
    '新增设备故障犯错等级，弹窗选择是否结束本把',
    '数据统计增加副本筛选、饼图点击弹窗查看明细',
    '历史记录改为按把次展示，副本名显示在每把标题',
  ],
  '1.0.2': [
    '手动结束本把支持下拉选择到达阶段',
    '无团灭级错误的 Pull 可点击编辑到达进度',
    '进度记录和犯错记录均支持编辑修改'
  ],
  '1.0.1': [
    '新增 FFLogs 导入功能，支持批量拉取死亡事件并导入为犯错记录',
    '新增 绝神兵 / 绝龙诗 / 妖星乱舞 默认分P阶段信息',
    '新增队员上下场功能，请假玩家可在记录中隐藏',
    '新增历史记录「按把次」视图，支持加精与展开详情',
    '新增「使用帮助」页面，每个页面右上角有 📖 帮助链接',
    '新增阶段顺序修改时的孤儿阶段映射迁移功能',
    '新增罪无可恕 犯错等级',
    '新增移动端适配（汉堡菜单+响应式布局）',
    '全站深色主题覆盖更完整',
    '导出导入支持完整 localStorage 数据（含 API Key、绑定关系等）',
    '手动结束本把支持填写到达阶段，进度记录支持编辑',
    '特别鸣谢：陆小唐@静语庄园'
  ]
}
const LAST_VERSION_KEY = 'ff14_raid_last_seen_version'
const showChangelog = ref(false)
function checkChangelog() {
  const lastVer = localStorage.getItem(LAST_VERSION_KEY)
  if (lastVer !== CURRENT_VERSION) showChangelog.value = true
}
provide('checkChangelog', checkChangelog)
provide('updateLastVersion', updateLastVersion)
function dismissChangelog() {
  showChangelog.value = false
  localStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION)
}
// 导入数据后更新版本记录（取最新）
function updateLastVersion(importedVer) {
  const current = localStorage.getItem(LAST_VERSION_KEY)
  if (!current || importedVer > current) localStorage.setItem(LAST_VERSION_KEY, importedVer)
}

onMounted(() => {
  if (!localStorage.getItem(WELCOME_KEY)) showWelcome.value = true
  checkChangelog()
  updateShowOnboarding()
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
}

#app-container { min-height: 100vh; }

/* 移动端汉堡按钮 */
.changelog-btn {
  position: fixed; top: 10px; right: 12px; z-index: 1001;
  width: 36px; height: 36px;
  background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #808090; cursor: pointer; transition: color .15s;
}
.changelog-btn:hover { color: #ffd700; }

.mobile-toggle {
  display: none;
  position: fixed; top: 10px; left: 10px; z-index: 1000;
  width: 40px; height: 40px;
  background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 8px;
  align-items: center; justify-content: center;
  color: #ffd700; cursor: pointer;
}

.mobile-overlay {
  display: none;
  position: fixed; inset: 0; z-index: 99;
  background: rgba(0,0,0,.5);
}

.app-aside {
  background: #1a1a2e;
  min-height: 100vh;
  border-right: 1px solid #2a2a4a;
  transition: transform .25s;
}

.logo {
  display: flex; align-items: center; gap: 10px;
  padding: 20px; color: #ffd700; font-size: 18px;
  font-weight: bold; border-bottom: 1px solid #2a2a4a;
}

.el-menu { border-right: none !important; }

.sidebar-author {
  position: absolute; bottom: 20px; left: 0; right: 0;
  text-align: center; color: #ffd700; font-size: 13px; font-weight: 600;
}

.logo-author {
  display: block;
  font-size: 11px;
  color: #ffd700;
  font-weight: 400;
  margin-top: 2px;
}

.sidebar-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  color: #ffd700;
  font-size: 12px;
  font-weight: 600;
}

.app-main {
  background: #0f0f1a;
  padding: 24px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

.global-footer {
  text-align: center;
  color: #c0c0d0;
  font-size: 13px;
  font-weight: 600;
  padding: 20px 0 4px;
  border-top: 1px solid #1a1a3a;
}

.menu-divider {
  padding: 12px 20px 4px;
  font-size: 11px; color: #606080; letter-spacing: 2px;
  text-transform: uppercase;
}

.author-item.el-menu-item.is-disabled {
  color: #ffd700 !important;
  opacity: 1 !important;
  cursor: default;
}
.author-item.el-menu-item.is-disabled .el-icon {
  color: #ffd700 !important;
}

.sidebar-bottom { padding: 8px 20px 16px; }
.sidebar-bottom .menu-divider { font-size: 11px; color: #505060; letter-spacing: 2px; padding: 10px 0 4px; }
.sidebar-bottom .author-item { display: flex; align-items: center; gap: 8px; color: #ffd700; font-size: 14px; padding: 6px 0; }
.sidebar-bottom .version-text { text-align: center; color: #404050; font-size: 11px; padding-top: 8px; }

.sidebar-cred-row { padding: 3px 0; }

.sidebar-cred-input .el-input__wrapper {
  background: #141428 !important;
  box-shadow: 0 0 0 1px #2a2a4a inset !important;
}

.sidebar-cred-rate { padding-top: 6px; text-align: center; }

.rate-badge-side {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #1a2a1a;
  color: #67c23a;
  font-weight: 600;
  display: inline-block;
}
.rate-badge-side.warning { background: #2a2510; color: #e6a23c; }
.rate-badge-side.danger { background: #2a1015; color: #f56c6c; }
.sidebar-bottom .thanks-item { text-align: center; color: #c0a060; font-size: 12px; padding: 4px 0; }

/* ====== Element Plus 暗色主题 ====== */
.el-card {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
  color: #e0e0e0 !important;
}
.el-card__header { border-bottom: 1px solid #2a2a4a !important; }

.el-table {
  background: #1a1a2e !important;
  --el-table-bg-color: #1a1a2e !important;
  --el-table-tr-bg-color: #1a1a2e !important;
  --el-table-header-bg-color: #252540 !important;
  --el-table-border-color: #2a2a4a !important;
  --el-table-text-color: #e0e0e0 !important;
  --el-table-header-text-color: #c0c0d0 !important;
  --el-table-row-hover-bg-color: #252540 !important;
  --el-table-current-row-bg-color: #252540 !important;
  --el-table-expanded-cell-bg-color: #1a1a2e !important;
  --el-fill-color-lighter: #252540 !important;
  --el-fill-color-light: #1a1a2e !important;
  --el-fill-color-blank: #1a1a2e !important;
}

.el-popper {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
  color: #e0e0e0 !important;
}
.el-popconfirm__action { justify-content: flex-end; }
.el-tooltip__content { background: #252540 !important; color: #e0e0e0 !important; }

.el-dialog {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}
.el-dialog__title { color: #e0e0e0 !important; }

.el-select-dropdown {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}
.el-select-dropdown__item { color: #c0c0d0 !important; }
.el-select-dropdown__item.hover,
.el-select-dropdown__item:hover { background: #252540 !important; }
.el-select-dropdown__item.selected { color: #ffd700 !important; }

.el-date-picker {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
  color: #e0e0e0 !important;
}
.el-picker-panel {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}
.el-picker-panel__body { background: #1a1a2e !important; }
.el-date-table th { color: #808090 !important; }
.el-date-table td { color: #c0c0d0 !important; }
.el-date-table td.current:not(.disabled) .el-date-table-cell__text {
  background: #ffd700 !important; color: #1a1a2e !important;
}

.el-statistic__head { color: #a0a0b8 !important; }
.el-statistic__number { color: #e0e0e0 !important; }

.el-tabs--border-card > .el-tabs__header {
  background: #1a1a2e !important;
  border-bottom: 1px solid #2a2a4a !important;
}
.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active {
  background: #252540 !important; color: #ffd700 !important;
}
.el-tabs--border-card > .el-tabs__header .el-tabs__item { color: #a0a0b8 !important; }

.el-empty__description { color: #808090 !important; }
.el-form-item__label { color: #c0c0d0 !important; }

.el-input__wrapper {
  background: #252540 !important;
  box-shadow: 0 0 0 1px #3a3a5a inset !important;
}
.el-input__inner { color: #e0e0e0 !important; }
.el-select .el-input__wrapper { background: #252540 !important; }

.el-statistic__head { color: #a0a0b8 !important; }
.el-statistic__number { color: #e0e0e0 !important; }

.page-header {
  margin-bottom: 20px;
  color: #ffd700;
  font-size: 22px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
}
.help-link {
  color: #606080; font-size: 16px; text-decoration: none; margin-left: auto;
  transition: color .15s;
}
.help-link:hover { color: #ffd700; }

.welcome-content { line-height: 1.8; color: #c0c0d0; }
.welcome-content p { margin-bottom: 12px; }
.welcome-content ul { padding-left: 16px; }
.welcome-content li { margin-bottom: 6px; font-size: 14px; }
.welcome-content strong { color: #ffd700; }

.changelog-content { line-height: 1.8; color: #c0c0d0; }
.changelog-ver { color: #ffd700; font-size: 15px; font-weight: 700; margin-bottom: 8px; }
.changelog-list { padding-left: 18px; margin-bottom: 8px; }
.changelog-list li { margin-bottom: 4px; font-size: 14px; color: #a0a0b8; }

.global-footer strong { color: #ffd700; }

/* ====== 移动端适配 ====== */
@media (max-width: 768px) {
  .mobile-toggle { display: flex; }
  .mobile-overlay { display: block; }

  .app-aside {
    position: fixed; left: 0; top: 0; z-index: 100;
    transform: translateX(-100%);
  }
  .app-aside.sidebar-open { transform: translateX(0); }

  .app-main {
    padding: 56px 12px 12px 12px;
    min-height: 100vh;
  }

  .page-header {
    font-size: 18px;
    margin-bottom: 12px;
  }

  /* 表格横向滚动 */
  .el-table { font-size: 12px !important; }
  .el-table :deep(td), .el-table :deep(th) { padding: 6px 4px !important; }

  /* 弹窗全宽 */
  .el-dialog { width: 92% !important; margin: 10px auto !important; }

  /* 统计卡片 */
  .el-row { flex-wrap: wrap !important; }
  .el-col { flex: 0 0 100% !important; max-width: 100% !important; margin-bottom: 8px; }

  /* 筛选栏竖排 */
  .filter-bar { flex-direction: column !important; align-items: stretch !important; }
  .filter-item { flex-direction: column !important; align-items: stretch !important; }
  .filter-item .filter-label { margin-bottom: 4px; }
  .el-date-picker { width: 100% !important; }

  /* 状态栏 */
  .status-bar { flex-wrap: wrap !important; gap: 8px !important; }
  .status-divider { display: none !important; }

  /* 犯错等级 */
  .level-radio-group { flex-direction: column !important; }
  .level-radio-group .el-radio-button { width: 100% !important; }
}
</style>
