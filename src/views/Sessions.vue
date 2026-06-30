<template>
  <div class="sessions-page">
    <div class="page-header">
      <el-icon><List /></el-icon>
      <span>历史记录</span><router-link to="/help#history" class="help-link">📖</router-link>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-bar">
        <div class="filter-item">
          <span class="filter-label">日期范围</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">队员</span>
          <el-select v-model="filterPlayerId" placeholder="全部" clearable style="width: 140px">
            <el-option label="全部队员" value="" />
            <el-option v-for="p in playerStore.players" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">类型</span>
          <el-select v-model="filterType" style="width: 110px">
            <el-option label="全部" value="all" />
            <el-option label="犯错" value="mistake" />
            <el-option label="进度" value="progress" />
          </el-select>
        </div>
        <el-checkbox v-model="showStarredOnly" style="margin-left:auto">
          仅看加精
        </el-checkbox>
      </div>
    </el-card>

    <!-- 按把次列表 -->
        <div v-if="pullList.length === 0" class="empty-state">
          <el-empty description="没有符合条件的记录" :image-size="100" />
        </div>
        <div v-else class="pull-flat-list">
          <div
            v-for="pull in pullList"
            :key="`${pull.date}||${pull.pullNumber}`"
            class="pull-row-card"
            :class="{ starred: recordStore.isStarred(pull.date, pull.pullNumber) }"
          >
            <div class="pull-row-main" @click="togglePullDetail(pull)">
              <div class="pull-row-left">
                <el-button
                  link
                  size="small"
                  @click.stop="recordStore.toggleStar(pull.date, pull.pullNumber)"
                  class="star-btn"
                >
                  <span v-if="recordStore.isStarred(pull.date, pull.pullNumber)" class="star-on">⭐</span>
                  <span v-else class="star-off">☆</span>
                </el-button>
                <span class="pull-row-date">{{ pull.date.slice(5) }}</span>
                <span class="pull-row-num">第{{ pull.pullNumber }}把</span>
                <span v-if="pull.duty" class="pull-row-duty">{{ pull.duty }}</span>
                <span class="pull-row-phase">{{ pull.maxPhase || '-' }}</span>
              </div>
              <div class="pull-row-right">
                <span class="pull-row-mistakes" v-if="pull.mistakeCount > 0">犯错×{{ pull.mistakeCount }}</span>
                <span class="pull-row-players">{{ pull.playerNames }}</span>
                <el-icon class="expand-icon" :class="{ expanded: expandedPulls.has(`${pull.date}||${pull.pullNumber}`) }"><ArrowDown /></el-icon>
              </div>
            </div>
            <!-- 展开详情 -->
            <div
              v-if="expandedPulls.has(`${pull.date}||${pull.pullNumber}`)"
              class="pull-detail"
            >
              <el-table :data="pull.records" size="small" style="width:100%" class="pull-table">
                <el-table-column type="index" width="40" />
                <el-table-column label="类型" width="70">
                  <template #default="{ row: r }">
                    <el-tag v-if="r.type==='mistake'" type="warning" size="small" effect="dark">犯错</el-tag>
                    <el-tag v-else type="primary" size="small" effect="dark">进度</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="副本" width="80">
                  <template #default="{ row: r }"><span class="duty-tag">{{ r.duty || '' }}</span></template>
                </el-table-column>
                <el-table-column prop="phase" label="阶段" width="70">
                  <template #default="{ row: r }"><span class="phase-text">{{ r.phase||'-' }}</span></template>
                </el-table-column>
                <el-table-column prop="playerName" label="队员" width="90">
                  <template #default="{ row: r }"><span v-if="r.type==='mistake'" class="player-text">{{ r.playerName }}</span></template>
                </el-table-column>
                <el-table-column label="详情" min-width="180">
                  <template #default="{ row: r }">
                    <template v-if="r.type==='mistake'">
                      <el-tag :type="levelTagType(r.level)" size="small" effect="dark" class="level-mini-tag">{{ levelLabel(r.level) }}</el-tag>
                      <span v-if="r.description" class="desc-text">{{ r.description }}</span>
                    </template>
                    <template v-else><span class="desc-text">{{ r.notes||'到达 '+r.phase }}</span></template>
                  </template>
                </el-table-column>
                <el-table-column width="50">
                  <template #default="{ row: r }">
                    <el-button v-if="r.type==='mistake'" type="warning" link size="small" @click="openEditDialog(r)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-popconfirm title="删除？" @confirm="handleDeleteRecord(r.id)">
                      <template #reference><el-button type="danger" link size="small"><el-icon><Delete /></el-icon></el-button></template>
                    </el-popconfirm>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
    <!-- 修改记录弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.type==='progress'?'修改进度':'修改记录'" width="420px" destroy-on-close>
      <el-form label-position="top" v-if="editForm.id">
        <template v-if="editForm.type==='mistake'">
          <el-form-item label="队员">
            <el-select v-model="editForm.playerId" filterable style="width:100%">
              <el-option v-for="p in playerStore.teamPlayers" :key="p.id" :label="p.name" :value="p.id"/>
            </el-select>
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="阶段">
                <el-select v-model="editForm.phase" filterable allow-create style="width:100%">
                  <el-option v-for="p in recordStore.phaseOrder.filter(x=>x!=='已完成')" :key="p" :label="p" :value="p"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="等级">
                <el-select v-model="editForm.level" style="width:100%">
                  <el-option label="减员" value="death"/><el-option label="团灭" value="wipe"/><el-option label="狂暴" value="enrage"/><el-option label="罪无可恕" value="unforgivable"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="内容">
            <el-input v-model="editForm.description" type="textarea" :rows="2" maxlength="200"/>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="到达阶段">
            <el-select v-model="editForm.phase" filterable allow-create style="width:100%">
              <el-option v-for="p in recordStore.phaseOrder.filter(x=>x!=='已完成')" :key="p" :label="p" :value="p"/>
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="editForm.notes" type="textarea" :rows="2" maxlength="200"/>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRecordStore } from '../stores/records'
import { usePlayerStore } from '../stores/players'
import { useTeamStore } from '../stores/teams'

const recordStore = useRecordStore()
const playerStore = usePlayerStore()

const activeTab = ref('date')
const dateRange = ref([
  new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])
const filterPlayerId = ref('')
const filterType = ref('all')
const showStarredOnly = ref(false)

const startDate = computed(() => dateRange.value?.[0] || '2000-01-01')
const endDate = computed(() => dateRange.value?.[1] || '2099-12-31')

// --- 筛选后的记录 ---
// 自动修复缺少 duty 的旧记录（延迟到组件挂载后执行）
const teamStore = useTeamStore()
onMounted(() => {
  const team = teamStore.currentTeam
  if (!team) return
  const teamDuties = team.duties?.length ? team.duties : (team.duty ? [team.duty] : [])
  if (!teamDuties.length) return
  let changed = false
  for (const r of recordStore.records) {
    if (!r.duty) {
      if (teamDuties.length === 1) {
        r.duty = teamDuties[0]; changed = true
      } else {
        const samePull = recordStore.records.find(sr => sr.date === r.date && sr.pullNumber === r.pullNumber && sr.duty)
        if (samePull) { r.duty = samePull.duty; changed = true }
      }
    }
  }
  if (changed) recordStore.persist()
})

const filteredRecords = computed(() => {
  let records = recordStore.getRecordsByDateRange(startDate.value, endDate.value)
  if (filterPlayerId.value) {
    records = records.filter(r => r.type !== 'mistake' || r.playerId === filterPlayerId.value)
  }
  if (filterType.value === 'mistake') records = records.filter(r => r.type === 'mistake')
  else if (filterType.value === 'progress') records = records.filter(r => r.type === 'progress')
  return records
})

// --- 按日期分组 ---
const groupedRecords = computed(() => {
  const groups = {}
  for (const r of filteredRecords.value) {
    if (r.type === 'pull_end') continue
    if (!groups[r.date]) groups[r.date] = { date: r.date, pulls: {}, mistakeCount: 0 }
    if (!groups[r.date].pulls[r.pullNumber]) {
      groups[r.date].pulls[r.pullNumber] = { pullNumber: r.pullNumber, records: [], maxPhase: '', maxPhaseValue: 0, ended: false }
    }
    const pull = groups[r.date].pulls[r.pullNumber]
    pull.records.push(r)
    const pv = recordStore.getPhaseValue(r.phase)
    if (pv > pull.maxPhaseValue) { pull.maxPhaseValue = pv; pull.maxPhase = r.phase }
    if (r.type === 'mistake') groups[r.date].mistakeCount++
  }
  const result = []
  for (const date of Object.keys(groups).sort().reverse()) {
    const g = groups[date]
    g.pulls = Object.values(g.pulls).sort((a, b) => b.pullNumber - a.pullNumber)
    for (const pull of g.pulls) {
      pull.records.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      pull.ended = recordStore.isPullEnded(date, pull.pullNumber)
    }
    result.push(g)
  }
  return result
})

// --- 按把次平铺列表 ---
const pullList = computed(() => {
  const data = recordStore.getProgressionData(startDate.value, endDate.value)
  // 获取每条 pull 的玩家名
  const result = data.map(pull => {
    const pullRecords = filteredRecords.value.filter(
      r => r.date === pull.date && r.pullNumber === pull.pullNumber && r.type === 'mistake'
    )
    const playerSet = new Set()
    for (const r of pullRecords) {
      if (r.playerName) playerSet.add(r.playerName)
    }
    const duty = pullRecords.find(r => r.duty)?.duty || ''
    return {
      ...pull,
      duty,
      playerNames: Array.from(playerSet).join('、') || '-',
      records: filteredRecords.value.filter(
        r => r.date === pull.date && r.pullNumber === pull.pullNumber && r.type !== 'pull_end'
      ).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }
  })
  // 筛选：加精
  let filtered = result
  if (showStarredOnly.value) {
    filtered = filtered.filter(p => recordStore.isStarred(p.date, p.pullNumber))
  }
  // 反转：最新的在前
  filtered = [...filtered].reverse()
  return filtered
})

// --- 展开/折叠 ---
const expandedPulls = reactive(new Set())
function togglePullDetail(pull) {
  const key = `${pull.date}||${pull.pullNumber}`
  if (expandedPulls.has(key)) {
    expandedPulls.delete(key)
  } else {
    expandedPulls.add(key)
  }
}

// --- 操作 ---
// --- 修改记录 ---
const editVisible = ref(false)
const editForm = reactive({ id: '', type: 'mistake', playerId: '', playerName: '', phase: '', level: '', description: '', notes: '' })

function openEditDialog(rec) {
  editForm.id = rec.id
  editForm.type = rec.type
  editForm.phase = rec.phase
  if (rec.type === 'mistake') {
    editForm.playerId = rec.playerId || ''
    editForm.playerName = rec.playerName || ''
    editForm.level = rec.level || ''
    editForm.description = rec.description || ''
  } else {
    editForm.notes = rec.notes || ''
  }
  editVisible.value = true
}

function handleEditSave() {
  if (editForm.type === 'mistake') {
    if (!editForm.playerId || !editForm.phase || !editForm.level) { ElMessage.warning('请填写完整信息'); return }
    const player = playerStore.teamPlayers.find(p => p.id === editForm.playerId)
    recordStore.updateRecord(editForm.id, { playerId: editForm.playerId, playerName: player?.name || editForm.playerName, phase: editForm.phase, level: editForm.level, description: editForm.description })
  } else {
    if (!editForm.phase) { ElMessage.warning('请填写阶段'); return }
    recordStore.updateRecord(editForm.id, { phase: editForm.phase, notes: editForm.notes })
  }
  ElMessage.success('记录已修改')
  editVisible.value = false
}

function handleDeleteRecord(id) { recordStore.deleteRecord(id) }
function handleDeletePull(date, pn) { recordStore.deletePull(date, pn) }

// --- 辅助 ---
function levelLabel(l) {
  const m = { death:'减员', wipe:'团灭', enrage:'狂暴', unforgivable:'罪无可恕', equipment:'设备故障' }
  return m[l]||l
}
function levelTagType(l) {
  const m = { death:'warning', wipe:'danger', enrage:'danger', unforgivable:'danger', equipment:'info' }
  return m[l]||'info'
}
function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })
}
</script>

<style scoped>
.sessions-page { max-width: 1100px; margin: 0 auto; }
.duty-tag { color: #ffd700; font-size: 12px; font-weight: 600; }

.filter-card { margin-bottom: 16px; }
.filter-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.filter-item { display: flex; align-items: center; gap: 6px; }
.filter-label { font-size: 13px; color: #808090; white-space: nowrap; }

.sessions-tabs {
  background: transparent;
  border: none;
}
.sessions-tabs :deep(.el-tabs__header) {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px 8px 0 0;
  margin-bottom: 0;
}
.sessions-tabs :deep(.el-tabs__item) { color: #a0a0b8; }
.sessions-tabs :deep(.el-tabs__item.is-active) { color: #ffd700; background: #252540; }
.sessions-tabs :deep(.el-tabs__content) { padding: 0; }

.empty-state { padding: 60px 0; }

/* 按日期 */
.records-list { display: flex; flex-direction: column; gap: 20px; }
.date-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #2a2a4a; }
.date-label { font-size: 17px; font-weight: 700; color: #ffd700; }
.date-stats { font-size: 13px; color: #808090; }
.pull-block { margin-bottom: 12px; border: 1px solid #2a2a4a; border-radius: 6px; padding: 10px 14px; background: #141428; }
.pull-block-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.pull-max-phase { font-size: 13px; color: #a0a0b8; }
.pull-end-badge { font-size: 11px; padding: 2px 6px; border-radius: 3px; background: rgba(245,108,108,.15); color: #f56c6c; }

/* 按把次 */
.pull-flat-list { display: flex; flex-direction: column; gap: 4px; }

.pull-row-card {
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #141428;
  transition: border-color .15s;
}
.pull-row-card:hover { border-color: #3a3a5a; }
.pull-row-card.starred { border-color: #ffd700; box-shadow: 0 0 8px rgba(255,215,0,.08); }

.pull-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.pull-row-left { display: flex; align-items: center; gap: 10px; }
.star-btn { padding: 0; font-size: 16px; }
.star-on { filter: none; }
.star-off { opacity: 0.3; }
.star-btn:hover .star-off { opacity: 0.7; }

.pull-row-date { color: #808090; font-size: 13px; }
.pull-row-num { color: #e0e0e0; font-weight: 600; font-size: 13px; }
.pull-row-duty { color: #e6a23c; font-size: 12px; padding: 1px 8px; border: 1px solid #3a3020; border-radius: 4px; margin-right: 8px; }
.pull-row-phase { color: #ffd700; font-weight: 700; font-size: 13px; }

.pull-row-right { display: flex; align-items: center; gap: 14px; }
.pull-row-mistakes { color: #f56c6c; font-size: 12px; font-weight: 600; }
.pull-row-players { color: #67c23a; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.expand-icon { color: #808090; transition: transform .2s; }
.expand-icon.expanded { transform: rotate(180deg); }

.pull-detail {
  border-top: 1px solid #2a2a4a;
  padding: 10px 14px;
  background: #0f0f1a;
  border-radius: 0 0 6px 6px;
}

/* 共享 */
.pull-table { border-radius: 4px; overflow: hidden; }
.phase-text { color: #ffd700; font-weight: 600; }
.player-text { color: #67c23a; font-weight: 600; }
.desc-text { color: #c0c0d0; font-size: 13px; }
.no-desc { color: #606070; }
.time-text { font-size: 12px; color: #808090; }
.level-mini-tag { margin-right: 6px; }
@media (max-width: 768px) {
  .sessions-page { padding: 0 4px; }
  .pull-row-right { flex-wrap: wrap; gap: 6px; font-size: 11px; }
  .pull-row-players { max-width: 100px; }
  .pull-row-main { padding: 8px 10px; }
}
</style>
