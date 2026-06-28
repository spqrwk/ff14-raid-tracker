<template>
  <div id="app-container">
    <el-container>
      <!-- 侧边导航 -->
      <el-aside width="220px" class="app-aside">
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
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 首次访问提示 -->
    <el-dialog
      v-model="showWelcome"
      title="📋 数据存储说明"
      width="480px"
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
        <el-button type="primary" @click="dismissWelcome">
          知道了
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentRoute = computed(() => route.path)

// 首次访问提示
const WELCOME_KEY = 'ff14_raid_welcome_seen'
const showWelcome = ref(false)

function dismissWelcome() {
  showWelcome.value = false
  localStorage.setItem(WELCOME_KEY, '1')
}

onMounted(() => {
  if (!localStorage.getItem(WELCOME_KEY)) {
    showWelcome.value = true
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
}

#app-container {
  min-height: 100vh;
}

.app-aside {
  background: #1a1a2e;
  min-height: 100vh;
  border-right: 1px solid #2a2a4a;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #2a2a4a;
}

.el-menu {
  border-right: none !important;
}

.app-main {
  background: #0f0f1a;
  padding: 24px;
  min-height: 100vh;
}

/* Element Plus 暗色主题覆盖 */
.el-card {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
  color: #e0e0e0 !important;
}

.el-card__header {
  border-bottom: 1px solid #2a2a4a !important;
}

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

.el-popper .el-popconfirm__action {
  justify-content: flex-end;
}

.el-tooltip__content {
  background: #252540 !important;
  color: #e0e0e0 !important;
}

.el-dialog {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}

.el-dialog__title {
  color: #e0e0e0 !important;
}

.el-select-dropdown {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}

.el-select-dropdown__item {
  color: #c0c0d0 !important;
}

.el-select-dropdown__item.hover,
.el-select-dropdown__item:hover {
  background: #252540 !important;
}

.el-select-dropdown__item.selected {
  color: #ffd700 !important;
}

.el-date-picker {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
  color: #e0e0e0 !important;
}

.el-picker-panel {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}

.el-picker-panel__body {
  background: #1a1a2e !important;
}

.el-date-table th {
  color: #808090 !important;
}

.el-date-table td {
  color: #c0c0d0 !important;
}

.el-date-table td.current:not(.disabled) .el-date-table-cell__text {
  background: #ffd700 !important;
  color: #1a1a2e !important;
}

.el-statistic__head {
  color: #a0a0b8 !important;
}

.el-statistic__number {
  color: #e0e0e0 !important;
}

.el-tabs--border-card > .el-tabs__header {
  background: #1a1a2e !important;
  border-bottom: 1px solid #2a2a4a !important;
}

.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active {
  background: #252540 !important;
  color: #ffd700 !important;
}

.el-tabs--border-card > .el-tabs__header .el-tabs__item {
  color: #a0a0b8 !important;
}

.el-empty__description {
  color: #808090 !important;
}

.el-form-item__label {
  color: #c0c0d0 !important;
}

.el-input__wrapper {
  background: #252540 !important;
  box-shadow: 0 0 0 1px #3a3a5a inset !important;
}

.el-input__inner {
  color: #e0e0e0 !important;
}

.el-select .el-input__wrapper {
  background: #252540 !important;
}

.el-statistic__head {
  color: #a0a0b8 !important;
}

.el-statistic__number {
  color: #e0e0e0 !important;
}

.page-header {
  margin-bottom: 20px;
  color: #ffd700;
  font-size: 22px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome-content {
  line-height: 1.8;
  color: #c0c0d0;
}

.welcome-content p {
  margin-bottom: 12px;
}

.welcome-content ul {
  padding-left: 16px;
}

.welcome-content li {
  margin-bottom: 6px;
  font-size: 14px;
}

.welcome-content strong {
  color: #ffd700;
}
</style>
