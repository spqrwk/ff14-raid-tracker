<template>
  <div class="home-page">
    <div class="page-header">
      <el-icon><Aim /></el-icon>
      <span>开荒面板</span><router-link to="/help#record" class="help-link">📖</router-link>
      <div class="team-switcher">
        <el-select
          v-if="currentTeam?.duties?.length"
          v-model="currentDuty"
          placeholder="当前副本"
          style="width: 180px"
          size="small"
        >
          <el-option v-for="d in currentTeam.duties" :key="d" :label="d" :value="d" />
        </el-select>
      </div>
    </div>

    <!-- 当前状态卡片 -->
    <el-card class="status-card" shadow="never">
      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">日期</span>
          <span class="status-value">{{ today }}</span>
        </div>
        <div class="status-divider" />
        <div class="status-item">
          <span class="status-label">当前</span>
          <span class="status-value pull-num">第 {{ currentPull }} 把</span>
        </div>
        <div class="status-divider" />
        <div class="status-item">
          <span class="status-label">今日总把数</span>
          <span class="status-value">{{ totalPullsToday }}</span>
        </div>
        <div class="status-divider" />
        <div class="status-item">
          <span class="status-label">今日犯错</span>
          <span class="status-value mistake-count">{{ totalMistakesToday }}</span>
        </div>
        <el-button
          type="success"
          plain
          size="small"
          @click="handleClearPull"
        >
          <el-icon><Trophy /></el-icon>
          本把通关
        </el-button>
        <el-button
          type="warning"
          plain
          size="small"
          style="margin-left: auto"
          @click="handleEndPull"
        >
          <el-icon><SwitchButton /></el-icon>
          手动结束本把
        </el-button>
      </div>
    </el-card>

    <!-- 两个操作 Tab -->
    <el-card class="action-card" shadow="never">
      <el-tabs v-model="activeTab" class="action-tabs">
        <!-- ========== 记录犯错 ========== -->
        <el-tab-pane label="记录犯错" name="mistake">
          <el-form
            ref="mistakeFormRef"
            :model="mistakeForm"
            :rules="mistakeRules"
            label-width="80px"
            label-position="top"
            class="record-form"
          >
            <!-- 多选队员（按角色分组） -->
            <el-form-item label="犯错队员" prop="playerIds">
              <div class="player-check-grid">
                <div
                  v-for="role in ROLES"
                  :key="role"
                  class="player-check-group"
                  :class="{ 'has-players': rolePlayerCount[role] > 0 }"
                >
                  <span class="player-check-role" :style="{ background: roleColor(role) }">{{ role }}</span>
                  <template v-if="rolePlayerCount[role] > 0">
                    <el-checkbox
                      v-for="p in playerStore.activePlayersByRole[role]"
                      :key="p.id"
                      :model-value="mistakeForm.playerIds"
                      :label="p.id"
                      @change="(checked) => togglePlayer(p.id, checked)"
                    >
                      {{ p.name }}
                    </el-checkbox>
                  </template>
                  <span v-else class="no-player-inline">-</span>
                </div>
              </div>
              <div class="player-check-actions">
                <el-button link size="small" @click="checkAllPlayers">全选</el-button>
                <el-button link size="small" @click="uncheckAllPlayers">清空</el-button>
                <span class="selected-count">{{ mistakeForm.playerIds.length }} 人已选</span>
              </div>
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="P几" prop="phase">
                  <el-select
                    v-model="mistakeForm.phase"
                    placeholder="选择或输入阶段"
                    filterable
                    allow-create
                    style="width: 100%"
                  >
                    <el-option
                      v-for="p in selectablePhases"
                      :key="p"
                      :label="p"
                      :value="p"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="犯错内容" prop="description">
              <el-input
                v-model="mistakeForm.description"
                type="textarea"
                :rows="2"
                placeholder="描述具体犯了什么错（选填）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="犯错等级" prop="level">
              <el-radio-group v-model="mistakeForm.level" class="level-radio-group">
                <el-radio-button value="death">
                  <span class="level-label">
                    <el-tag type="warning" size="small" effect="dark">减员</el-tag>
                    <span class="level-desc">仅造成减员，不影响继续打</span>
                  </span>
                </el-radio-button>
                <el-radio-button value="wipe">
                  <span class="level-label">
                    <el-tag type="danger" size="small" effect="dark">团灭</el-tag>
                    <span class="level-desc">导致团灭，本把结束</span>
                  </span>
                </el-radio-button>
                <el-radio-button value="enrage">
                  <span class="level-label">
                    <el-tag type="danger" size="small" effect="dark" color="#8b0045">狂暴</el-tag>
                    <span class="level-desc">导致狂暴 / 输出不足</span>
                  </span>
                </el-radio-button>
                <el-radio-button value="unforgivable">
                  <span class="level-label">
                    <el-tag size="small" effect="dark" color="#9b0033">罪无可恕</el-tag>
                    <span class="level-desc">极其低级的重大失误</span>
                  </span>
                </el-radio-button>
                <el-radio-button value="equipment">
                  <span class="level-label">
                    <el-tag size="small" effect="dark" color="#666">设备故障</el-tag>
                    <span class="level-desc">电脑/网络/外设问题</span>
                  </span>
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" @click="submitMistake" :loading="submitting">
                <el-icon><Check /></el-icon>
                提交犯错记录
              </el-button>
              <span v-if="mistakeForm.level === 'wipe' || mistakeForm.level === 'enrage' || mistakeForm.level === 'unforgivable'" class="pull-end-hint">
                ⚠ 提交后将自动结束本把 (第 {{ currentPull }} 把)，下一把为第 {{ currentPull + 1 }} 把
              </span>
              <span v-if="mistakeForm.level === 'equipment'" class="pull-end-hint">
                ⚠ 提交后将弹窗选择继续还是结束本把
              </span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ========== 记录进度 ========== -->
        <el-tab-pane label="记录进度" name="progress">
          <el-form ref="progressFormRef" :model="progressForm" :rules="progressRules" label-width="80px" label-position="top" class="record-form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="到达P几" prop="phase">
                  <el-select
                    v-model="progressForm.phase"
                    placeholder="选择或输入阶段"
                    filterable
                    allow-create
                    style="width: 100%"
                  >
                    <el-option
                      v-for="p in selectablePhases"
                      :key="p"
                      :label="p"
                      :value="p"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="备注">
                  <el-input
                    v-model="progressForm.notes"
                    placeholder="如：顺利处理了某某机制"
                    maxlength="100"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item>
              <el-checkbox v-model="progressForm.endPull">
                记录后结束本把 (下一把 +1)
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button type="success" size="large" @click="submitProgress" :loading="submitting">
                <el-icon><Check /></el-icon>
                记录进度
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 今日记录摘要 -->
    <el-card class="today-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><List /></el-icon>
          <span>今日记录 ({{ today }})</span>
        </div>
      </template>

      <div v-if="dailyPulls.length === 0" class="empty-today">
        <el-empty description="今天还没有记录" :image-size="80" />
      </div>

      <div v-else class="pull-list">
        <div
          v-for="pull in dailyPulls"
          :key="pull.pullNumber"
          class="pull-group"
        >
          <div class="pull-header">
            <span class="pull-title">
              <el-tag :type="pull.ended ? 'danger' : 'success'" size="small" effect="dark">
                第 {{ pull.pullNumber }} 把
              </el-tag>
              <span v-if="pull.maxPhase" class="pull-phase">
                最远到 <strong>{{ pull.maxPhase }}</strong>
                <el-button v-if="!hasFatal(pull)" type="primary" link size="small" style="margin-left:4px" @click="editPullPhase(pull)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </span>
              <span v-if="pull.ended" class="pull-ended-tag">已结束</span>
              <span v-else class="pull-active-tag">进行中</span>
            </span>
            <el-popconfirm
              title="确定删除这一把的所有记录？"
              @confirm="recordStore.deletePull(today, pull.pullNumber)"
            >
              <template #reference>
                <el-button type="danger" link size="small">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>

          <div class="pull-records">
            <div
              v-for="rec in pull.records"
              :key="rec.id"
              class="record-item"
            >
              <template v-if="rec.type === 'mistake'">
                <span v-if="rec.duty" class="rec-duty">{{ rec.duty }}</span>
                <span class="rec-player">{{ rec.playerName }}</span>
                <span class="rec-phase">{{ rec.phase }}</span>
                <el-tag
                  :type="levelTagType(rec.level)"
                  size="small"
                  effect="dark"
                >{{ levelLabel(rec.level) }}</el-tag>
                <span v-if="rec.description" class="rec-desc">{{ rec.description }}</span>
                <el-button type="warning" link size="small" class="rec-edit-btn" @click="openEditDialog(rec)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </template>
              <template v-else-if="rec.type === 'progress'">
                <span v-if="rec.duty" class="rec-duty">{{ rec.duty }}</span>
                <span class="rec-progress-tag">
                  <el-icon><Top /></el-icon>
                  到达 {{ rec.phase }}
                </span>
                <span v-if="rec.notes" class="rec-desc">{{ rec.notes }}</span>
                <el-button type="primary" link size="small" class="rec-edit-btn" @click="openEditDialog(rec)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 修改记录弹窗 -->
    <el-dialog v-model="editVisible" :title="editForm.type==='progress'?'修改进度':'修改记录'" width="420px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" label-position="top" v-if="editForm.id">
        <!-- 犯错记录 -->
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
                  <el-option v-for="p in selectablePhases" :key="p" :label="p" :value="p"/>
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
        <!-- 进度记录 -->
        <template v-else>
          <el-form-item label="到达阶段">
            <el-select v-model="editForm.phase" filterable allow-create style="width:100%">
              <el-option v-for="p in selectablePhases" :key="p" :label="p" :value="p"/>
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="editForm.notes" type="textarea" :rows="2" maxlength="200" placeholder="修改到达的进度阶段"/>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 手动结束弹窗 -->
    <el-dialog v-model="endPullVisible" title="手动结束第 {{ currentPull }} 把" width="380px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="本把到达了哪个阶段（选填）">
          <el-select v-model="endPullPhase" filterable allow-create style="width:100%" placeholder="不填仅结束本把">
            <el-option v-for="p in selectablePhases" :key="p" :label="p" :value="p"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="endPullVisible = false">取消</el-button>
        <el-button type="warning" @click="confirmEndPull">结束本把</el-button>
      </template>
    </el-dialog>

    <!-- 修改进度弹窗 -->
    <el-dialog v-model="editPhaseVisible" title="修改第 {{ editPhasePullNum }} 把进度" width="380px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="到达阶段">
          <el-select v-model="editPhaseVal" filterable allow-create style="width:100%">
            <el-option v-for="p in selectablePhases" :key="p" :label="p" :value="p"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPhaseVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEditPhase">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePlayerStore, ROLES, ROLE_LABELS } from '../stores/players'
import { useRecordStore } from '../stores/records'
import { useTeamStore } from '../stores/teams'

const playerStore = usePlayerStore()
const recordStore = useRecordStore()
const teamStore = useTeamStore()

const currentTeam = computed(() => teamStore.currentTeam)
const currentDuty = computed({
  get: () => teamStore.currentDuty,
  set: v => { teamStore.setCurrentDuty(v) }
})
// 初始化：如果队伍有副本但没选，默认选第一个
if (!currentDuty.value && currentTeam.value?.duties?.length) {
  teamStore.setCurrentDuty(currentTeam.value.duties[0])
}
watch(currentTeam, t => {
  if (!currentDuty.value && t?.duties?.length) {
    teamStore.setCurrentDuty(t.duties[0])
  }
})

// 可选阶段（排除"已完成"，已完成通过通关按钮触发）
const selectablePhases = computed(() =>
  recordStore.phaseOrder.filter(p => p !== '已完成')
)

// 角色颜色
const ROLE_COLORS = {
  MT: '#4a90d9', ST: '#3a7bc8',
  H1: '#67c23a', H2: '#5ab22e',
  D1: '#e6a23c', D2: '#d49520',
  D3: '#f56c6c', D4: '#c4568b'
}
function roleColor(role) { return ROLE_COLORS[role] || '#666' }

// --- 当前日期 ---
const today = computed(() => new Date().toISOString().split('T')[0])

// --- 当前 pull 号 ---
const currentPull = computed(() => recordStore.getCurrentPullNumber(today.value))

// --- 今日数据 ---
const dailyPulls = computed(() => recordStore.getDailyPullSummary(today.value))

const totalPullsToday = computed(() => {
  const pulls = new Set()
  recordStore.records
    .filter(r => r.date === today.value && r.type !== 'pull_end')
    .forEach(r => pulls.add(r.pullNumber))
  return pulls.size
})

const totalMistakesToday = computed(() =>
  recordStore.records.filter(r => r.date === today.value && r.type === 'mistake').length
)

// --- 每个角色下的人数 ---
const rolePlayerCount = computed(() => {
  const counts = {}
  for (const r of ROLES) {
    counts[r] = playerStore.activePlayersByRole[r]?.length || 0
  }
  return counts
})

// --- 表单 Tab ---
const activeTab = ref('mistake')

// --- 犯错表单 ---
const mistakeFormRef = ref(null)
const submitting = ref(false)

const mistakeForm = reactive({
  playerIds: [],
  phase: '',
  description: '',
  level: ''
})

function togglePlayer(id, checked) {
  if (checked) {
    if (!mistakeForm.playerIds.includes(id)) mistakeForm.playerIds.push(id)
  } else {
    mistakeForm.playerIds = mistakeForm.playerIds.filter(pid => pid !== id)
  }
}

function checkAllPlayers() {
  const all = []
  for (const role of ROLES) {
    for (const p of (playerStore.activePlayersByRole[role] || [])) {
      all.push(p.id)
    }
  }
  mistakeForm.playerIds = all
}

function uncheckAllPlayers() {
  mistakeForm.playerIds = []
}

// 表单规则
const mistakeRules = {
  playerIds: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少勾选一名队员'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  phase: [{ required: true, message: '请选择或输入阶段', trigger: 'change' }],
  level: [{ required: true, message: '请选择犯错等级', trigger: 'change' }]
}

function submitMistake() {
  mistakeFormRef.value?.validate(async (valid) => {
    if (!valid) return
    if (mistakeForm.level === 'equipment') {
      try {
        await ElMessageBox.confirm('⚠ 设备故障已记录，是否结束本把？', '设备故障', {
          confirmButtonText: '结束本把',
          cancelButtonText: '继续',
          distinguishCancelAndClose: true
        })
        mistakeForm._equipEndPull = true
      } catch (action) {
        mistakeForm._equipEndPull = false
      }
    }
    submitting.value = true
    try {
      const levelText = levelLabel(mistakeForm.level)
      const isFatal = mistakeForm.level === 'wipe' || mistakeForm.level === 'enrage' || mistakeForm.level === 'unforgivable' || (mistakeForm.level === 'equipment' && mistakeForm._equipEndPull)

      const entries = mistakeForm.playerIds
        .map(pid => {
          const player = playerStore.players.find(p => p.id === pid)
          if (!player) return null
          return {
            playerId: pid,
            playerName: player.name,
            duty: currentDuty.value,
            phase: mistakeForm.phase,
            description: mistakeForm.description,
            level: mistakeForm.level,
            endPull: isFatal,
            date: today.value
          }
        })
        .filter(Boolean)

      // 先记录把号、阶段等信息（提交后会变）
      const recordedPull = currentPull.value
      const recordedPhase = mistakeForm.phase
      const names = mistakeForm.playerIds
        .map(pid => playerStore.players.find(p => p.id === pid)?.name)
        .filter(Boolean)
        .join(', ')

      recordStore.addMistakes(entries)

      ElMessage.success(
        `第 ${recordedPull} 把 · ${names} ${recordedPhase} ${levelText} 已记录` +
        (isFatal ? '，本把已结束' : '')
      )

      // 重置表单并清除验证状态
      mistakeFormRef.value?.resetFields()
      mistakeForm.playerIds = []
    } catch (e) {
      ElMessage.error(e.message || '记录失败')
    } finally {
      submitting.value = false
    }
  })
}

// --- 进度表单 ---
const progressFormRef = ref(null)

const progressForm = reactive({
  phase: '',
  notes: '',
  endPull: false
})

const progressRules = {
  phase: [{ required: true, message: '请选择或输入阶段', trigger: 'change' }]
}

function submitProgress() {
  progressFormRef.value?.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      recordStore.addProgress({
        duty: currentDuty.value,
        phase: progressForm.phase,
        notes: progressForm.notes,
        endPull: progressForm.endPull,
        date: today.value
      })

      const endText = progressForm.endPull ? '，本把已结束' : ''
      ElMessage.success(
        `第 ${currentPull.value} 把 · 到达 ${progressForm.phase} 已记录${endText}`
      )

      progressForm.phase = ''
      progressForm.notes = ''
      progressForm.endPull = false
    } catch (e) {
      ElMessage.error(e.message || '记录失败')
    } finally {
      submitting.value = false
    }
  })
}

// --- 手动结束本把 ---
const endPullVisible = ref(false)
const endPullPhase = ref('')

function handleEndPull() {
  const dayRecords = recordStore.getRecordsByDate(today.value).filter(r => r.pullNumber === currentPull.value && r.type !== 'pull_end')
  endPullPhase.value = dayRecords.length > 0 ? (dayRecords.find(r => r.phase)?.phase || '') : ''
  endPullVisible.value = true
}

function hasFatal(pull) {
  return pull.records.some(r => r.type === 'mistake' && (r.level === 'wipe' || r.level === 'enrage' || r.level === 'unforgivable'))
}

const editPhaseVisible = ref(false)
const editPhasePullNum = ref(0)
const editPhaseVal = ref('')

function editPullPhase(pull) {
  editPhasePullNum.value = pull.pullNumber
  editPhaseVal.value = pull.maxPhase || ''
  editPhaseVisible.value = true
}

function confirmEditPhase() {
  const num = editPhasePullNum.value
  const pull = dailyPulls.value.find(p => p.pullNumber === num)
  if (!pull) return
  const newPhase = editPhaseVal.value
  if (newPhase && newPhase !== pull.maxPhase) {
    const existing = pull.records.find(r => r.type === 'progress')
    if (existing) {
      recordStore.updateRecord(existing.id, { phase: newPhase })
    } else {
      recordStore.addProgress({ phase: newPhase, notes: '手动修改', date: today.value, endPull: false })
    }
    ElMessage.success(`第 ${num} 把进度已更新为 ${newPhase}`)
  }
  editPhaseVisible.value = false
}

function confirmEndPull() {
  const pullNum = currentPull.value
  const phase = endPullPhase.value
  const result = recordStore.endCurrentPull(today.value)
  if (result && phase) {
    recordStore.addProgress({ phase, notes: '手动结束', date: today.value, endPull: false })
  }
  ElMessage.success(phase ? `第 ${pullNum} 把已结束（到达 ${phase}），下一把为第 ${currentPull.value} 把` : `第 ${pullNum} 把已结束，下一把为第 ${currentPull.value} 把`)
  endPullVisible.value = false
}

// --- 本把通关 ---
function handleClearPull() {
  const result = recordStore.markPullCleared(today.value)
  ElMessage.success(`🎉 第 ${result.pullNumber} 把已通关！恭喜！`)
}

// --- 辅助 ---
// --- 修改记录 ---
const editVisible = ref(false)
const editFormRef = ref(null)
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
    if (!editForm.playerId || !editForm.phase || !editForm.level) {
      ElMessage.warning('请填写完整信息')
      return
    }
    const player = playerStore.teamPlayers.find(p => p.id === editForm.playerId)
    recordStore.updateRecord(editForm.id, {
      playerId: editForm.playerId,
      playerName: player?.name || editForm.playerName,
      phase: editForm.phase,
      level: editForm.level,
      description: editForm.description
    })
  } else {
    if (!editForm.phase) { ElMessage.warning('请填写阶段'); return }
    recordStore.updateRecord(editForm.id, {
      phase: editForm.phase,
      notes: editForm.notes
    })
  }
  ElMessage.success('记录已修改')
  editVisible.value = false
}

function levelLabel(level) {
  const map = { death: '减员', wipe: '团灭', enrage: '狂暴', unforgivable: '罪无可恕', equipment: '设备故障' }
  return map[level] || level
}

function levelTagType(level) {
  const map = { death: 'warning', wipe: 'danger', enrage: 'danger', unforgivable: 'danger', equipment: 'info' }
  return map[level] || 'info'
}
</script>

<style scoped>
.home-page {
  max-width: 900px;
  margin: 0 auto;
}

.team-switcher {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 状态卡片 */
.status-card {
  margin-bottom: 16px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 12px;
  color: #808090;
}

.status-value {
  font-size: 18px;
  font-weight: 700;
  color: #e0e0e0;
}

.status-value.pull-num {
  color: #ffd700;
  font-size: 22px;
}

.status-value.mistake-count {
  color: #f56c6c;
}

.status-divider {
  width: 1px;
  height: 36px;
  background: #2a2a4a;
}

/* 操作卡片 */
.action-card {
  margin-bottom: 16px;
}

.action-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.action-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  color: #a0a0b8;
}

.action-tabs :deep(.el-tabs__item.is-active) {
  color: #ffd700;
}

.record-form {
  padding: 8px 0;
}

/* 队员勾选网格 */
.player-check-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.player-check-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #141428;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  min-height: 48px;
}

.player-check-group.has-players {
  border-color: #3a3a5a;
}

.player-check-role {
  display: inline-block;
  width: 40px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 3px;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  margin-bottom: 2px;
}

.player-check-group :deep(.el-checkbox) {
  margin-right: 0;
}

.player-check-group :deep(.el-checkbox__label) {
  font-size: 12px;
  color: #c0c0d0;
  padding-left: 4px;
}

.player-check-group :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #67c23a;
}

.no-player-inline {
  color: #505060;
  font-size: 12px;
  padding-left: 4px;
}

.player-check-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-size: 12px;
  color: #67c23a;
  font-weight: 600;
}

/* 犯错等级单选 */
.level-radio-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.level-radio-group :deep(.el-radio-button__inner) {
  height: auto;
  padding: 10px 14px;
  background: #252540;
  border-color: #3a3a5a;
  color: #c0c0d0;
}

.level-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3a3050;
  border-color: #ffd700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.15);
}

.level-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.level-desc {
  font-size: 11px;
  color: #808090;
}

/* 罪无可恕标签特殊样式 */
:deep(.el-radio-button[value="unforgivable"] .el-radio-button__inner) {
  border-color: #ff3366 !important;
}

:deep(.el-radio-button[value="unforgivable"] .el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3a1525 !important;
  border-color: #ff3366 !important;
  box-shadow: 0 0 10px rgba(255, 51, 102, 0.3) !important;
}

:deep(.el-radio-button[value="equipment"] .el-radio-button__inner) {
  border-color: #666 !important;
}

:deep(.el-radio-button[value="equipment"] .el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #222 !important;
  border-color: #888 !important;
  box-shadow: 0 0 8px rgba(150, 150, 150, 0.2) !important;
}

.pull-end-hint {
  margin-left: 16px;
  font-size: 13px;
  color: #e6a23c;
}

/* 今日记录 */
.today-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.empty-today {
  padding: 20px 0;
}

.pull-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pull-group {
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 12px 16px;
  background: #141428;
}

.pull-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pull-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pull-phase {
  font-size: 13px;
  color: #a0a0b8;
}

.pull-phase strong {
  color: #ffd700;
}

.pull-ended-tag,
.pull-active-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.pull-ended-tag {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.pull-active-tag {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pull-records {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: #1a1a2e;
  border-radius: 4px;
  font-size: 13px;
  flex-wrap: wrap;
}

.rec-duty {
  color: #ffd700;
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid #3a3a20;
  border-radius: 4px;
  margin-right: 4px;
}
.rec-player {
  color: #67c23a;
  font-weight: 600;
  min-width: 60px;
}

.rec-phase {
  color: #ffd700;
  font-weight: 600;
}

.rec-edit-btn {
  margin-left: auto;
  flex-shrink: 0;
}

.rec-desc {
  color: #808090;
  font-size: 12px;
  flex: 1;
  min-width: 100px;
}

.rec-progress-tag {
  color: #409eff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
@media (max-width: 768px) {
  .home-page { padding: 0 4px; }
  .status-bar { gap: 8px; }
  .status-value { font-size: 14px !important; }
  .status-value.pull-num { font-size: 16px !important; }
  .player-check-grid { grid-template-columns: repeat(2, 1fr); }
  .pull-group { padding: 8px 10px; }
  .record-item { font-size: 12px; gap: 4px; }
  .rec-player { min-width: auto; }
}
</style>
