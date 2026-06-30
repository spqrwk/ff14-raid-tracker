<template>
  <div class="settings-page">
    <div class="page-header">
      <el-icon><Setting /></el-icon>
      <span>数据管理</span><router-link to="/help#data" class="help-link">📖</router-link>
    </div>

    <!-- 数据概览 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-title">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据概览</span>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="5">
          <el-statistic title="队伍数" :value="teamStore.teams.length" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="队员数" :value="playerStore.players.length" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="犯错记录" :value="mistakeCount" />
        </el-col>
        <el-col :span="5">
          <el-statistic title="进度记录" :value="progressCount" />
        </el-col>
        <el-col :span="4">
          <el-statistic title="总Pull数" :value="totalPulls" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 数据备份 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-title">
          <el-icon><Download /></el-icon>
          <span>数据备份与恢复</span>
        </div>
      </template>

      <p class="desc" style="margin-bottom:12px">
        记录数 {{ recordStore.records.length }} · 队员 {{ playerStore.players.length }} ·
        存储占用 {{ storageUsage }}
        <span v-if="storageBytes > 3*1024*1024" style="color:#e6a23c">⚠ 建议导出备份</span>
      </p>
      <div class="backup-grid">
        <!-- 导出全部 -->
        <div class="backup-item">
          <h4>完整导出</h4>
          <p class="desc">导出全部数据（队伍、队员、记录），用于完整备份或迁移。</p>
          <el-button type="primary" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出全部
          </el-button>
        </div>

        <!-- 仅导出队员 -->
        <div class="backup-item">
          <h4>仅导出队员</h4>
          <p class="desc">只导出队员名单（含队伍归属、角色、职业），不包括犯错记录。</p>
          <el-button @click="handleExportPlayersOnly">
            <el-icon><Download /></el-icon>
            导出队员
          </el-button>
        </div>

        <!-- 导入全部 -->
        <div class="backup-item">
          <h4>完整导入</h4>
          <p class="desc">从备份文件恢复全部数据。<strong style="color:#f56c6c">会覆盖当前所有数据。</strong></p>
          <input ref="fileInputRef" type="file" accept=".json" style="display:none" @change="handleFileChange" />
          <el-button type="warning" @click="fileInputRef?.click()">
            <el-icon><Upload /></el-icon>
            选择文件
          </el-button>
          <el-button v-if="importData" type="success" style="margin-left:8px" @click="handleImport" :loading="importing">
            <el-icon><Check /></el-icon>
            确认 ({{ importData.teams?.length || 0 }}队 {{ importData.players?.length || 0 }}人 {{ importData.records?.length || 0 }}条)
          </el-button>
        </div>

        <!-- 仅导入队员 -->
        <div class="backup-item">
          <h4>仅导入队员</h4>
          <p class="desc">只导入队员名单，<strong style="color:#67c23a">不影响已有记录</strong>。同名队员会跳过。</p>
          <input ref="playerFileRef" type="file" accept=".json" style="display:none" @change="handlePlayerFileChange" />
          <el-button @click="playerFileRef?.click()">
            <el-icon><Upload /></el-icon>
            选择队员文件
          </el-button>
          <el-button v-if="importPlayersData" type="success" style="margin-left:8px" @click="handleImportPlayers" :loading="importingPlayers">
            <el-icon><Check /></el-icon>
            确认 ({{ importPlayersData.players.length }} 人)
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 阶段顺序配置 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="section-title">
          <el-icon><Rank /></el-icon>
          <span>阶段顺序配置</span>
        </div>
      </template>
      <p class="desc">用逗号分隔，顺序决定折线图 Y 轴排列。</p>
      <div class="phase-input-row" style="margin-bottom:8px">
        <el-select v-model="phaseEditDuty" placeholder="选择副本（可选）" clearable size="small" style="width:200px" @change="onPhaseEditDutyChange">
          <el-option v-for="d in (currentTeam?.duties || [])" :key="d" :label="d" :value="d" />
        </el-select>
      </div>
      <div class="phase-input-row">
        <el-input v-model="phaseInput" placeholder="P1,P1.5,P2,P2.5,..." style="flex:1"/>
        <el-button type="primary" @click="savePhaseOrder">保存</el-button>
        <el-button @click="resetPhaseOrder">重置默认</el-button>
      </div>

      <!-- 孤儿阶段映射 -->
      <div v-if="orphanPhases.length > 0" style="margin-top:16px">
        <div class="desc" style="color:#e6a23c">⚠️ 以下阶段在记录中存在，但不在新的阶段顺序中。请手动映射：</div>
        <div v-for="op in orphanPhases" :key="op" style="display:flex;align-items:center;gap:10px;margin:8px 0">
          <span style="color:#e6a23c;min-width:100px">{{ op }}</span>
          <span style="color:#808090">→</span>
          <el-select v-model="phaseMap[op]" placeholder="映射到..." size="small" style="width:200px">
            <el-option v-for="p in newPhaseList" :key="p" :label="p" :value="p"/>
            <el-option label="-- 删除这些记录 --" value="__delete__"/>
          </el-select>
          <span style="color:#808090;font-size:12px">{{ phaseUsage[op] }} 条记录</span>
        </div>
        <el-button type="warning" size="small" @click="applyPhaseMap" style="margin-top:8px">应用映射</el-button>
      </div>
    </el-card>

    <!-- 危险区域 -->
    <el-card class="section-card danger-card" shadow="never">
      <template #header>
        <div class="section-title danger-title">
          <el-icon><WarningFilled /></el-icon>
          <span>危险区域</span>
        </div>
      </template>

      <div class="danger-content">
        <h4>清空全部数据</h4>
        <p class="desc">永久删除所有队伍、队员、犯错记录、进度记录。此操作不可撤销！</p>

        <div v-if="clearStep === 0">
          <el-button type="danger" @click="clearStep = 1">
            <el-icon><Delete /></el-icon>
            清空全部数据
          </el-button>
        </div>

        <div v-else-if="clearStep === 1" class="confirm-area">
          <p class="confirm-hint">
            请在输入框中输入 <strong class="confirm-text">确认清空全部数据</strong> 以确认操作：
          </p>
          <div class="confirm-input-row">
            <el-input
              v-model="clearConfirmText"
              placeholder="输入「确认清空全部数据」"
              style="width:320px"
              @keyup.enter="executeClear"
            />
            <el-button
              type="danger"
              :disabled="clearConfirmText !== '确认清空全部数据'"
              @click="executeClear"
            >
              确认清空
            </el-button>
            <el-button @click="clearStep = 0; clearConfirmText = ''">取消</el-button>
          </div>
        </div>
      </div>
    </el-card>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePlayerStore } from '../stores/players'
import { useRecordStore } from '../stores/records'
import { useTeamStore } from '../stores/teams'
import { generateId } from '../utils/storage'

const playerStore = usePlayerStore()
const recordStore = useRecordStore()
const teamStore = useTeamStore()

const storageBytes = computed(() => {
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('ff14_')) bytes += (localStorage.getItem(k) || '').length
  }
  return bytes
})
const storageUsage = computed(() => {
  const b = storageBytes.value
  if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  if (b > 1024) return (b / 1024).toFixed(0) + ' KB'
  return b + ' B'
})

const mistakeCount = computed(() => recordStore.records.filter(r => r.type === 'mistake').length)
const progressCount = computed(() => recordStore.records.filter(r => r.type === 'progress').length)
const totalPulls = computed(() => {
  const keys = new Set()
  for (const r of recordStore.records) {
    if (r.type !== 'pull_end') keys.add(`${r.date}||${r.pullNumber}`)
  }
  return keys.size
})

// --- 导出 ---
function handleExport() {
  // 收集所有 localStorage 中与项目相关的 key
  const allStorage = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('ff14_')) {
      allStorage[key] = localStorage.getItem(key)
    }
  }
  const data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    currentTeamId: teamStore.currentTeamId,
    teams: teamStore.teams,
    players: playerStore.players,
    records: recordStore.records,
    phaseOrder: recordStore.phaseOrder,
    allStorage
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ff14-raid-tracker-backup-${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据已导出')
}

// --- 仅导出队员 ---
function handleExportPlayersOnly() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    teams: teamStore.teams,
    players: playerStore.players
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ff14-raid-tracker-players-${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`${playerStore.players.length} 名队员已导出`)
}

// --- 导入 ---
const fileInputRef = ref(null)
const importData = ref(null)
const importing = ref(false)

function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!data.players || !data.records) {
        ElMessage.error('备份文件格式不正确（缺少 players 或 records）')
        importData.value = null
        return
      }
      importData.value = data
      const teamCnt = data.teams?.length || 0
      ElMessage.success(`文件加载成功：${teamCnt} 支队伍, ${data.players.length} 队员, ${data.records.length} 条记录`)
    } catch {
      ElMessage.error('JSON 解析失败，请检查文件')
      importData.value = null
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function handleImport() {
  if (!importData.value) return
  importing.value = true
  try {
    // 覆盖队伍
  if (importData.value.teams) {
    teamStore.teams.splice(0, teamStore.teams.length, ...importData.value.teams)
    teamStore.migrateTeamDuties()
    teamStore.persistTeams()
  }
  playerStore.players.splice(0, playerStore.players.length, ...importData.value.players)
  playerStore.persist()
  recordStore.records.splice(0, recordStore.records.length, ...importData.value.records)
  // 从记录中收集所有出现过的副本，补全到队伍的 duties 中
  const recordDuties = new Set()
  for (const r of recordStore.records) { if (r.duty) recordDuties.add(r.duty) }
  const team = teamStore.currentTeam
  if (team) {
    let changed = false
    for (const d of recordDuties) {
      if (!team.duties.includes(d)) { team.duties.push(d); changed = true }
    }
    if (changed) teamStore.persistTeams()
  }
  recordStore.persist()
  // 阶段顺序
  if (importData.value.phaseOrder) {
    recordStore.updatePhaseOrder(importData.value.phaseOrder)
  }
  if (importData.value.currentTeamId) {
    teamStore.setCurrentTeam(importData.value.currentTeamId)
  }
  // 恢复所有 localStorage 配置（API Key、绑定关系、加精等）
  if (importData.value.allStorage) {
    for (const [k, v] of Object.entries(importData.value.allStorage)) {
      localStorage.setItem(k, v)
    }
  }
  ElMessage.success('数据已成功导入，请刷新页面以应用全部配置')
    importData.value = null
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.message || '未知错误'))
  } finally {
    importing.value = false
  }
}

// --- 仅导入队员 ---
const playerFileRef = ref(null)
const importPlayersData = ref(null)
const importingPlayers = ref(false)

function handlePlayerFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      // 兼容两种格式：完整导出文件 或 纯队员文件
      const players = Array.isArray(data) ? data : (data.players || null)
      if (!players || !Array.isArray(players)) {
        ElMessage.error('文件格式不正确（缺少队员数据）')
        importPlayersData.value = null
        return
      }
      importPlayersData.value = { players, teams: data.teams || null }
      ElMessage.success(`队员文件加载成功：${players.length} 人`)
    } catch {
      ElMessage.error('JSON 解析失败')
      importPlayersData.value = null
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function handleImportPlayers() {
  if (!importPlayersData.value) return
  importingPlayers.value = true
  try {
    const { players: newPlayers, teams: fileTeams } = importPlayersData.value

    // 先同步队伍：文件中的队伍如果本地没有则创建
    if (fileTeams) {
      for (const ft of fileTeams) {
        const exists = teamStore.teams.find(t => t.id === ft.id)
        if (!exists) {
          teamStore.teams.push({ ...ft })
        } else {
          // 更新队伍 name/duties（兼容旧 duty 字段）
          const duties = ft.duties || (ft.duty ? [ft.duty] : [])
          Object.assign(exists, { name: ft.name, duties })
        }
      }
      teamStore.persistTeams()
    }

    let added = 0, updated = 0
    for (const p of newPlayers) {
      // 按 (name, teamId) 精确匹配
      let exists = playerStore.players.find(e => e.name === p.name && e.teamId === p.teamId)
      if (!exists) {
        // 同名不同队 → 新增
        exists = playerStore.players.find(e => e.name === p.name)
      }
      if (exists && exists.teamId === p.teamId) {
        // 同一队伍的同一人 → 更新角色和职业
        playerStore.updatePlayer(exists.id, { role: p.role || '', jobs: p.jobs || [] })
        updated++
      } else {
        // 全新队员 → 添加
        playerStore.players.push({ ...p, id: generateId() })
        added++
      }
    }
    playerStore.persist()
    ElMessage.success(`队员导入完成：新增 ${added} 人，更新 ${updated} 人`)
    importPlayersData.value = null
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.message || '未知错误'))
  } finally {
    importingPlayers.value = false
  }
}

// --- 阶段顺序 ---
const phaseEditDuty = ref('')
const phaseInput = ref(recordStore.phaseOrder.join(','))
const currentTeam = computed(() => teamStore.currentTeam)
function onPhaseEditDutyChange(duty) {
  if (duty) {
    phaseInput.value = teamStore.getPhaseOrderForDuty(duty).join(',')
  } else {
    phaseInput.value = recordStore.phaseOrder.join(',')
  }
}
const orphanPhases = ref([])
const phaseMap = ref({})
const phaseUsage = ref({})
const newPhaseList = ref([])

// 查找记录中使用但不在新顺序中的阶段
function checkOrphans(newOrder) {
  const used = {}
  for (const r of recordStore.teamRecords) {
    const p = r.phase
    if (p && !newOrder.includes(p)) used[p] = (used[p] || 0) + 1
  }
  orphanPhases.value = Object.keys(used)
  phaseUsage.value = used
  phaseMap.value = {}
  newPhaseList.value = newOrder
  for (const p of orphanPhases.value) phaseMap.value[p] = ''
}

function applyPhaseMap() {
  let updated = 0, deleted = 0
  for (const r of recordStore.records) {
    const old = r.phase
    if (!old || !phaseMap.value[old]) continue
    if (phaseMap.value[old] === '__delete__') {
      recordStore.deleteRecord(r.id)
      deleted++
    } else {
      recordStore.updateRecord(r.id, { phase: phaseMap.value[old] })
      updated++
    }
  }
  ElMessage.success(`已更新 ${updated} 条记录，删除 ${deleted} 条`)
  orphanPhases.value = []
}

function savePhaseOrder() {
  const order = phaseInput.value
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
  if (order.length === 0) {
    ElMessage.error('请至少输入一个阶段')
    return
  }
  recordStore.updatePhaseOrder(order)
  checkOrphans(order)
  if (orphanPhases.value.length === 0) ElMessage.success('阶段顺序已更新')
}

function resetPhaseOrder() {
  if (phaseEditDuty.value) {
    phaseInput.value = teamStore.getPhaseOrderForDuty(phaseEditDuty.value).join(',')
  } else {
    phaseInput.value = teamStore.DEFAULT_PHASE_ORDER.join(',')
  }
  ElMessage.success('已恢复默认阶段顺序')
}

// --- 清空数据 ---
const clearStep = ref(0)
const clearConfirmText = ref('')

async function executeClear() {
  if (clearConfirmText.value !== '确认清空全部数据') return
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除所有队伍、队员和记录，不可撤销！确定继续？',
      '最终确认',
      {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch { return }

  teamStore.teams.splice(0, teamStore.teams.length)
  teamStore.persistTeams()
  playerStore.players.splice(0, playerStore.players.length)
  playerStore.persist()
  recordStore.records.splice(0, recordStore.records.length)
  recordStore.persist()
  // 清空 API 凭证
  ;['ff14_fflogs_id', 'ff14_fflogs_secret', 'ff14_fflogs_manual_token', 'ff14_fflogs_bind_map'].forEach(k => localStorage.removeItem(k))

  clearStep.value = 0
  clearConfirmText.value = ''
  ElMessage.success('全部数据已清空')
}
</script>

<style scoped>
.settings-page { max-width: 800px; margin: 0 auto; }
.section-card { margin-bottom: 16px; }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #e0e0e0; }
.danger-title { color: #f56c6c; }
.desc { color: #808090; font-size: 13px; margin-bottom: 12px; line-height: 1.6; }
.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.backup-item h4 { color: #c0c0d0; margin-bottom: 8px; }
.backup-item p.desc { min-height: 36px; }
.phase-input-row { display: flex; gap: 10px; }
.danger-card { border-color: rgba(245, 108, 108, 0.3) !important; }
.danger-card :deep(.el-card__header) { border-bottom-color: rgba(245, 108, 108, 0.2) !important; }
.danger-content h4 { color: #f56c6c; margin-bottom: 8px; }
.confirm-area { margin-top: 12px; }
.confirm-hint { color: #c0c0d0; font-size: 13px; margin-bottom: 10px; }
.confirm-text { color: #f56c6c; background: rgba(245, 108, 108, 0.1); padding: 2px 6px; border-radius: 3px; }
.confirm-input-row { display: flex; gap: 10px; align-items: center; }

.copyright {
  text-align: center; color: #ffd700; font-size: 14px; font-weight: 600;
  padding: 24px 0 8px; margin-top: 24px;
  border-top: 1px solid #2a2a4a;
}
.copyright strong { color: #ffd700; }
@media (max-width: 768px) {
  .settings-page { padding: 0 4px; }
  .backup-grid { grid-template-columns: 1fr; }
  .confirm-input-row { flex-direction: column; }
}
</style>
