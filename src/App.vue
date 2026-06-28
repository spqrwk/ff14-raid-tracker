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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentRoute = computed(() => route.path)
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
}

.el-dialog {
  background: #1a1a2e !important;
  border: 1px solid #2a2a4a !important;
}

.el-dialog__title {
  color: #e0e0e0 !important;
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
</style>
