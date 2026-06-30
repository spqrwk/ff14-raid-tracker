<template>
  <div class="onboarding-page">
    <el-container>
      <!-- 左侧导航栏 -->
      <el-aside width="220px" class="onboarding-aside">
        <div class="onboarding-logo-area">
          <el-icon :size="28"><Aim /></el-icon>
          <span>FF14 高难工具箱</span>
        </div>
        <el-menu
          :default-active="activeNav"
          background-color="#1a1a2e"
          text-color="#a0a0b8"
          active-text-color="#ffd700"
          @select="onNavSelect"
        >
          <el-menu-item index="raid">
            <el-icon><Monitor /></el-icon>
            <span>固定队行车记录</span>
          </el-menu-item>
          <el-menu-item index="fflogs">
            <el-icon><Search /></el-icon>
            <span>FFLogs 查询</span>
          </el-menu-item>
        </el-menu>
        <div class="onboarding-sidebar-bottom">
          <div class="menu-divider">数据</div>
          <div class="sidebar-import-link" @click="importVisible = true">
            <el-icon><Upload /></el-icon>
            <span>已有备份？导入数据</span>
          </div>
          <div class="version-text">v1.1.0</div>
        </div>
      </el-aside>

      <!-- 右侧内容区 -->
      <el-main class="onboarding-main">
        <!-- ========== 固定队行车记录 ========== -->
        <div v-if="activeNav === 'raid'" class="nav-content">
          <!-- 步骤指示器 -->
          <div class="onboarding-steps">
            <div class="step" :class="{ active: step === 1, done: step > 1 }" @click="step > 1 && (step = 1)">
              <div class="step-number">
                <el-icon v-if="step > 1"><Check /></el-icon>
                <span v-else>1</span>
              </div>
              <div class="step-label">创建队伍</div>
            </div>
            <div class="step-line" :class="{ done: step > 1 }" />
            <div class="step" :class="{ active: step === 2, done: step > 2 }" @click="step > 2 && (step = 2)">
              <div class="step-number">
                <el-icon v-if="step > 2"><Check /></el-icon>
                <span v-else>2</span>
              </div>
              <div class="step-label">添加队员</div>
            </div>
            <div class="step-line" :class="{ done: step > 2 }" />
            <div class="step" :class="{ active: step === 3 }">
              <div class="step-number">3</div>
              <div class="step-label">准备就绪</div>
            </div>
          </div>

          <!-- Step 1: 创建队伍 -->
          <div v-if="step === 1" class="onboarding-content">
            <el-card shadow="never" class="step-card">
              <template #header>
                <div class="step-card-header">
                  <el-icon><Collection /></el-icon>
                  <span>创建你的第一个队伍</span>
                </div>
              </template>
              <el-form
                ref="teamFormRef"
                :model="teamForm"
                :rules="teamRules"
                label-position="top"
                class="step-form"
              >
                <el-form-item label="队伍名称" prop="name">
                  <el-input
                    v-model="teamForm.name"
                    placeholder="例如：绝巴哈固定队、伊甸休闲队"
                    maxlength="30"
                    show-word-limit
                    size="large"
                    @keyup.enter="goToStep2"
                  />
                </el-form-item>
                <el-form-item label="攻略副本（选填，可多选）" prop="duties">
                  <el-select
                    v-model="teamForm.duties"
                    multiple
                    filterable
                    allow-create
                    placeholder="选择或输入副本名称"
                    style="width: 100%"
                    size="large"
                  >
                    <el-option
                      v-for="d in DUTY_PRESETS"
                      :key="d"
                      :label="d"
                      :value="d"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-card>

            <div class="step-actions">
              <el-button type="primary" size="large" @click="goToStep2" :disabled="!teamForm.name.trim()">
                下一步
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- Step 2: 添加队员 -->
          <div v-if="step === 2" class="onboarding-content">
            <el-card shadow="never" class="step-card">
              <template #header>
                <div class="step-card-header">
                  <el-icon><User /></el-icon>
                  <span>添加队员（选填，可稍后补充）</span>
                </div>
              </template>
              <div class="batch-table-wrap">
                <table class="batch-table">
                  <thead>
                    <tr>
                      <th class="col-role">角色</th>
                      <th class="col-desc">职责</th>
                      <th class="col-name">队员名</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="role in ROLES" :key="role">
                      <td class="col-role">
                        <span class="role-badge" :style="{ background: roleColor(role) }">
                          {{ role }}
                        </span>
                      </td>
                      <td class="col-desc">{{ ROLE_LABELS[role] }}</td>
                      <td class="col-name">
                        <el-input
                          v-model="memberNames[role]"
                          placeholder="输入角色名"
                          size="default"
                          clearable
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </el-card>

            <div class="step-actions">
              <el-button size="large" @click="step = 1">
                <el-icon><ArrowLeft /></el-icon>
                上一步
              </el-button>
              <div class="step-actions-right">
                <el-button size="large" @click="goToStep3(true)">
                  跳过
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
                <el-button type="primary" size="large" @click="goToStep3(false)">
                  下一步
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <!-- Step 3: 准备就绪 -->
          <div v-if="step === 3" class="onboarding-content">
            <el-card shadow="never" class="step-card">
              <template #header>
                <div class="step-card-header">
                  <el-icon><CircleCheck /></el-icon>
                  <span>一切就绪！</span>
                </div>
              </template>
              <div class="summary-block">
                <div class="summary-row">
                  <span class="summary-label">队伍名称</span>
                  <span class="summary-value">{{ teamForm.name }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">攻略副本</span>
                  <span class="summary-value">{{ teamForm.duties.length ? teamForm.duties.join(' · ') : '未设置' }}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">队员</span>
                  <span class="summary-value">
                    <template v-if="filledCount > 0">
                      <el-tag
                        v-for="(name, role) in filledMembers"
                        :key="role"
                        size="small"
                        effect="dark"
                        :color="roleColor(role)"
                        style="margin-right: 6px; margin-bottom: 4px;"
                      >
                        {{ role }} {{ name }}
                      </el-tag>
                    </template>
                    <span v-else class="summary-empty">暂未添加（可稍后在「成员管理」中添加）</span>
                  </span>
                </div>
              </div>
            </el-card>

            <div class="step-actions">
              <el-button size="large" @click="step = 2">
                <el-icon><ArrowLeft /></el-icon>
                上一步
              </el-button>
              <el-button type="primary" size="large" @click="finishOnboarding" :loading="finishing">
                <el-icon><Check /></el-icon>
                开始使用
              </el-button>
            </div>
          </div>
        </div>

        <!-- ========== FFLogs 查询 ========== -->
        <div v-if="activeNav === 'fflogs'" class="nav-content fflogs-content">
          <FflogsQuery />
        </div>
      </el-main>
    </el-container>

    <!-- 导入备份弹窗 -->
    <el-dialog v-model="importVisible" title="导入备份数据" width="480px" destroy-on-close>
      <!-- 完整导入 -->
      <div class="import-section">
        <h4>完整导入</h4>
        <p class="import-desc">从备份文件恢复全部数据。<strong style="color:#f56c6c">会覆盖当前所有数据。</strong></p>
        <input ref="importFileRef" type="file" accept=".json" style="display:none" @change="handleImportSelect" />
        <el-button type="warning" @click="importFileRef?.click()">
          <el-icon><Upload /></el-icon>选择文件
        </el-button>
        <el-button v-if="importData" type="success" style="margin-left:8px" @click="confirmImport" :loading="importing">
          <el-icon><Check /></el-icon>确认 ({{ importMeta?.teams || 0 }}队 {{ importMeta?.players || 0 }}人 {{ importMeta?.records || 0 }}条)
        </el-button>
        <div v-if="importError" style="margin-top:8px;color:#f56c6c;font-size:13px">{{ importError }}</div>
      </div>
      <el-divider />
      <!-- 仅导入队员 -->
      <div class="import-section">
        <h4>仅导入队员</h4>
        <p class="import-desc">只导入队员名单，<strong style="color:#67c23a">不影响已有记录</strong>。同名队员会跳过。</p>
        <input ref="playerFileRef" type="file" accept=".json" style="display:none" @change="handlePlayerSelect" />
        <el-button @click="playerFileRef?.click()">
          <el-icon><Upload /></el-icon>选择队员文件
        </el-button>
        <el-button v-if="playerImportData" type="success" style="margin-left:8px" @click="confirmPlayerImport" :loading="importingPlayers">
          <el-icon><Check /></el-icon>确认 ({{ playerImportMeta?.players || 0 }} 人)
        </el-button>
        <div v-if="playerImportError" style="margin-top:8px;color:#f56c6c;font-size:13px">{{ playerImportError }}</div>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTeamStore, DUTY_PRESETS } from '../stores/teams'
import { usePlayerStore, ROLES, ROLE_LABELS } from '../stores/players'
import FflogsQuery from './FflogsQuery.vue'

const emit = defineEmits(['done'])

const teamStore = useTeamStore()
const playerStore = usePlayerStore()
const importFileRef = ref(null)
const playerFileRef = ref(null)
const importData = ref(null)
const playerImportData = ref(null)
const playerImportMeta = ref(null)
const playerImportError = ref('')
const importingPlayers = ref(false)

// ---- 导航 ----
const activeNav = ref('raid')

function onNavSelect(index) {
  activeNav.value = index
}

// 角色颜色
const ROLE_COLORS = {
  MT: '#4a90d9', ST: '#3a7bc8',
  H1: '#67c23a', H2: '#5ab22e',
  D1: '#e6a23c', D2: '#d49520',
  D3: '#f56c6c', D4: '#c4568b'
}
function roleColor(role) { return ROLE_COLORS[role] || '#666' }

// 步骤
const step = ref(1)

// --- Step 1: 队伍表单 ---
const teamFormRef = ref(null)
const teamForm = reactive({
  name: '',
  duties: []
})

const teamRules = {
  name: [
    { required: true, message: '请输入队伍名称', trigger: 'blur' },
    { min: 2, max: 30, message: '名称 2~30 个字符', trigger: 'blur' }
  ]
}

function goToStep2() {
  if (!teamForm.name.trim()) return
  step.value = 2
}

// --- Step 2: 队员表单 ---
const memberNames = reactive(
  Object.fromEntries(ROLES.map(r => [r, '']))
)

const filledMembers = computed(() => {
  const result = {}
  for (const role of ROLES) {
    if (memberNames[role]?.trim()) {
      result[role] = memberNames[role].trim()
    }
  }
  return result
})

const filledCount = computed(() => Object.keys(filledMembers.value).length)

function goToStep3(skipped) {
  if (skipped) {
    for (const role of ROLES) {
      memberNames[role] = ''
    }
  }
  step.value = 3
}

// --- Step 3: 完成 ---
const finishing = ref(false)

function finishOnboarding() {
  finishing.value = true

  try {
    const team = teamStore.addTeam(teamForm.name.trim(), teamForm.duties)
    if (!team) {
      ElMessage.error('创建队伍失败')
      finishing.value = false
      return
    }
    teamStore.setCurrentTeam(team.id)

    let playerCount = 0
    for (const role of ROLES) {
      const name = memberNames[role]?.trim()
      if (name) {
        const player = playerStore.addPlayer(name, role)
        if (player) playerCount++
      }
    }

    const parts = [`队伍「${teamForm.name}」已创建`]
    if (playerCount > 0) parts.push(`已添加 ${playerCount} 名队员`)
    ElMessage.success(parts.join('，'))
  } catch (e) {
    ElMessage.error('初始化失败：' + (e.message || '未知错误'))
    finishing.value = false
    return
  }

  finishing.value = false
  emit('done')
}

// 导入备份
const importVisible = ref(false)
const importError = ref('')
const importMeta = ref(null)
const importing = ref(false)

function handleImportSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  importError.value = ''
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!data.players || !data.records) {
        importError.value = '备份文件格式不正确（缺少 players 或 records）'
        importData.value = null; importMeta.value = null; return
      }
      importData.value = data
      importMeta.value = { teams: data.teams?.length || 0, players: data.players.length, records: data.records.length }
    } catch {
      importError.value = 'JSON 解析失败，请检查文件'
      importData.value = null; importMeta.value = null
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

async function confirmImport() {
  if (!importData.value) return
  importing.value = true
  try {
    const data = importData.value
    const { useRecordStore } = await import('../stores/records')
    const recordStore = useRecordStore()
    if (data.teams?.length) {
      teamStore.teams.splice(0, teamStore.teams.length, ...data.teams)
      teamStore.migrateTeamDuties()
      teamStore.persistTeams()
    }
    playerStore.players.splice(0, playerStore.players.length, ...data.players)
    playerStore.persist()
    recordStore.records.splice(0, recordStore.records.length, ...data.records)
    recordStore.persist()
    if (data.currentTeamId) teamStore.setCurrentTeam(data.currentTeamId)
    if (data.allStorage) {
      for (const [k, v] of Object.entries(data.allStorage)) {
        if (k.startsWith('ff14_')) localStorage.setItem(k, JSON.stringify(v))
      }
    }
    ElMessage.success(`导入完成：${importMeta.value.teams}队 ${importMeta.value.players}人 ${importMeta.value.records}条`)
    importVisible.value = false
    if (teamStore.teams.length > 0) emit('done')
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || '未知错误'))
  }
  importing.value = false
}

// 仅导入队员
function handlePlayerSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  playerImportError.value = ''
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!data.players) {
        playerImportError.value = '文件中没有队员数据'
        playerImportData.value = null; playerImportMeta.value = null; return
      }
      playerImportData.value = data
      playerImportMeta.value = { players: data.players.length }
    } catch {
      playerImportError.value = 'JSON 解析失败'
      playerImportData.value = null; playerImportMeta.value = null
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

async function confirmPlayerImport() {
  if (!playerImportData.value) return
  importingPlayers.value = true
  try {
    const newPlayers = playerImportData.value.players
    let added = 0, updated = 0
    const existingNames = new Set(playerStore.players.map(p => p.name))
    for (const p of newPlayers) {
      const exist = playerStore.players.find(pl => pl.name === p.name)
      if (exist) {
        playerStore.updatePlayer(exist.id, { role: p.role || exist.role, jobs: p.jobs || exist.jobs })
        updated++
      } else {
        playerStore.players.push({ ...p, id: p.id || ('id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)) })
        added++
      }
    }
    playerStore.persist()
    // 如果文件里有队伍数据，也导入
    if (playerImportData.value.teams?.length) {
      teamStore.teams.splice(0, teamStore.teams.length, ...playerImportData.value.teams)
      teamStore.migrateTeamDuties()
      teamStore.persistTeams()
    }
    ElMessage.success(`队员导入完成：新增 ${added} 人，更新 ${updated} 人`)
    playerImportData.value = null; playerImportMeta.value = null
    if (teamStore.teams.length > 0) { importVisible.value = false; emit('done') }
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || '未知错误'))
  }
  importingPlayers.value = false
}
</script>

<style scoped>
.import-section { padding: 8px 0; }
.import-desc { color: #a0a0b8; font-size: 14px; margin-bottom: 12px; }
.onboarding-page {
  min-height: 100vh;
  background: #0f0f1a;
}

/* ====== 左侧导航栏 ====== */
.onboarding-aside {
  background: #1a1a2e;
  min-height: 100vh;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
}

.onboarding-logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  color: #ffd700;
  font-size: 17px;
  font-weight: bold;
  border-bottom: 1px solid #2a2a4a;
}

.onboarding-aside .el-menu {
  border-right: none !important;
  flex: 1;
}

.onboarding-sidebar-bottom {
  padding: 8px 20px 16px;
}

.onboarding-sidebar-bottom .menu-divider {
  font-size: 11px;
  color: #505060;
  letter-spacing: 2px;
  padding: 10px 0 4px;
}

.sidebar-import-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a0a0b8;
  font-size: 14px;
  padding: 8px 0;
  cursor: pointer;
  transition: color 0.15s;
}

.sidebar-import-link:hover {
  color: #ffd700;
}

.onboarding-sidebar-bottom .version-text {
  text-align: center;
  color: #404050;
  font-size: 11px;
  padding-top: 8px;
}

/* ====== 右侧内容区 ====== */
.onboarding-main {
  background: #0f0f1a;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
}

.nav-content {
  width: 100%;
  max-width: 600px;
  padding-top: 20px;
}

.fflogs-content {
  max-width: 100%;
  padding-top: 0;
}

/* ====== 步骤指示器 ====== */
.onboarding-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: default;
  transition: opacity 0.2s;
}

.step.done {
  cursor: pointer;
}

.step:not(.active):not(.done) {
  opacity: 0.4;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #252540;
  border: 2px solid #3a3a5a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #808090;
  font-size: 17px;
  font-weight: 700;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #ffd700;
  border-color: #ffd700;
  color: #1a1a2e;
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
}

.step.done .step-number {
  background: #67c23a;
  border-color: #67c23a;
  color: #fff;
}

.step-label {
  font-size: 13px;
  color: #a0a0b8;
  font-weight: 600;
}

.step.active .step-label {
  color: #ffd700;
}

.step.done .step-label {
  color: #67c23a;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #2a2a4a;
  margin: 0 8px 28px;
  transition: background 0.3s;
}

.step-line.done {
  background: #67c23a;
}

/* ====== 卡片内容 ====== */
.onboarding-content {
  width: 100%;
}

.step-card {
  border: 1px solid #2a2a4a;
}

.step-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.step-form {
  padding: 8px 0;
}

/* Step 2 表格 */
.batch-table-wrap {
  overflow-x: auto;
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
}

.batch-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  color: #808090;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid #2a2a4a;
}

.batch-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #1a1a3a;
  vertical-align: middle;
}

.col-role {
  width: 70px;
}

.col-desc {
  width: 120px;
  color: #808090;
  font-size: 13px;
}

.col-name {
  flex: 1;
}

.role-badge {
  display: inline-block;
  width: 48px;
  text-align: center;
  padding: 3px 0;
  border-radius: 4px;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
}

/* 按钮区 */
.step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  width: 100%;
}

.step-actions-right {
  display: flex;
  gap: 12px;
}

/* Step 3 摘要 */
.summary-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.summary-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.summary-label {
  min-width: 70px;
  color: #808090;
  font-size: 14px;
}

.summary-value {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 600;
}

.summary-empty {
  color: #606080;
  font-size: 13px;
  font-style: italic;
}

/* ====== 移动端适配 ====== */
@media (max-width: 768px) {
  .onboarding-aside {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 100;
    width: 200px !important;
    transform: translateX(-100%);
    transition: transform 0.25s;
  }

  /* 移动端通过汉堡按钮展开（暂时简化：始终隐藏侧边栏，靠内容区分） */
  .onboarding-main {
    padding: 24px 12px;
  }

  .nav-content {
    max-width: 100%;
    padding-top: 0;
  }

  .step-line {
    width: 36px;
    margin: 0 4px 28px;
  }

  .step-label {
    font-size: 11px;
  }

  .step-actions {
    flex-wrap: wrap;
    gap: 10px;
  }

  .step-actions-right {
    flex-wrap: wrap;
  }

  .col-desc {
    display: none;
  }

  .batch-table th.col-desc {
    display: none;
  }
}
</style>
