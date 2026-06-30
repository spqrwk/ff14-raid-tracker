import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: undefined }) // 默认中文

app.mount('#app')

// 数据迁移：为旧数据（无 teamId）自动创建默认队伍
import { useTeamStore } from './stores/teams'
import { usePlayerStore } from './stores/players'
import { useRecordStore } from './stores/records'

const teamStore = useTeamStore()
teamStore.ensureDefaultTeam()

const playerStore = usePlayerStore()
playerStore.migrateIfNeeded()

const recordStore = useRecordStore()
recordStore.migrateIfNeeded()
