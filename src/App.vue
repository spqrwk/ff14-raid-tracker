<template>
  <div id="app-container">
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
          <span>FF14 开荒记录</span>
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
          <div class="version-text">v1.0.1 (beta)</div>
        </div>
      </el-aside>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 首次访问提示 -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
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
onMounted(() => {
  if (!localStorage.getItem(WELCOME_KEY)) showWelcome.value = true
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
