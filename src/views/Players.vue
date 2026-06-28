<template>
  <div class="players-page">
    <div class="page-header">
      <el-icon><User /></el-icon>
      <span>成员管理</span>
      <div class="team-context">
        <el-tag v-if="currentTeam" type="success" size="small" effect="dark">
          {{ currentTeam.name }}
          <template v-if="currentTeam.duty"> · {{ currentTeam.duty }}</template>
        </el-tag>
        <span v-else class="no-team-hint">请先创建队伍</span>
      </div>
    </div>

    <!-- 批量添加 -->
    <el-card class="batch-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>批量添加队员</span>
          <span class="hint">在各角色位填写队员名，空行跳过，填完点保存</span>
        </div>
      </template>

      <div class="batch-table-wrap">
        <table class="batch-table">
          <thead>
            <tr>
              <th class="col-role">角色</th>
              <th class="col-name">队员名</th>
              <th class="col-act"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="role in ROLES" :key="role">
              <tr
                v-for="(slot, idx) in batchSlots[role]"
                :key="`${role}-${idx}`"
                :class="{ 'first-slot': idx === 0 }"
              >
                <td class="col-role">
                  <span v-if="idx === 0" class="role-badge" :style="{ background: roleColor(role) }">
                    {{ role }}
                  </span>
                </td>
                <td class="col-name">
                  <el-input
                    v-model="slot.name"
                    placeholder="输入角色名"
                    size="small"
                    maxlength="20"
                  />
                </td>
                <td class="col-act">
                  <el-button
                    v-if="idx === batchSlots[role].length - 1"
                    type="primary"
                    link
                    size="small"
                    @click="addSlot(role)"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                  <el-button
                    v-if="batchSlots[role].length > 1"
                    type="danger"
                    link
                    size="small"
                    @click="removeSlot(role, idx)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="batch-actions">
        <el-button @click="resetBatchSlots">清空表格</el-button>
        <el-button type="primary" @click="handleBatchSave" :loading="batchSaving">
          <el-icon><Check /></el-icon>
          批量保存
        </el-button>
      </div>
    </el-card>

    <!-- 已有成员 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>已有队员</span>
          <span class="hint">共 {{ playerStore.teamPlayers.length }} 名</span>
          <el-button type="primary" link size="small" style="margin-left:auto" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            单独添加
          </el-button>
        </div>
      </template>
      <el-table :data="playerStore.teamPlayers" style="width: 100%" empty-text="还没有添加队员">
        <el-table-column label="角色" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.role" class="role-badge" :style="{ background: roleColor(row.role) }">
              {{ row.role }}
            </span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.active !== false" type="success" size="small" effect="dark">上场</el-tag>
            <el-tag v-else type="info" size="small" effect="dark">下场</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="队员名称" min-width="130">
          <template #default="{ row }">
            <span class="player-name" :class="{ offline: row.active === false }">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              :type="row.active !== false ? 'warning' : 'success'"
              link
              size="small"
              @click="playerStore.toggleActive(row.id)"
            >
              <el-icon><component :is="row.active !== false ? 'Remove' : 'Check'" /></el-icon>
              {{ row.active !== false ? '下场' : '上场' }}
            </el-button>
            <el-popconfirm title="确定删除该成员？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button type="danger" link size="small">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑成员' : '添加成员'" width="400px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px" label-position="top">
        <el-form-item label="队员名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入游戏角色名" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="角色位置" prop="role">
          <el-select v-model="form.role" placeholder="选择角色位置" style="width: 100%">
            <el-option v-for="r in ROLES" :key="r" :label="ROLE_LABELS[r]" :value="r" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { usePlayerStore, ROLES, ROLE_LABELS } from '../stores/players'
import { useTeamStore } from '../stores/teams'

const playerStore = usePlayerStore()
const teamStore = useTeamStore()
const currentTeam = computed(() => teamStore.currentTeam)

const ROLE_COLORS = {
  MT: '#4a90d9', ST: '#3a7bc8',
  H1: '#67c23a', H2: '#5ab22e',
  D1: '#e6a23c', D2: '#d49520',
  D3: '#f56c6c', D4: '#c4568b'
}
function roleColor(role) { return ROLE_COLORS[role] || '#666' }

// --- 批量添加表格 ---
const batchSaving = ref(false)

function makeEmptySlot() {
  return { name: '' }
}

function makeBatchSlots() {
  const map = {}
  for (const role of ROLES) {
    map[role] = [makeEmptySlot()]
  }
  return map
}

const batchSlots = reactive(makeBatchSlots())

function resetBatchSlots() {
  for (const role of ROLES) {
    batchSlots[role] = [makeEmptySlot()]
  }
}

function addSlot(role) {
  batchSlots[role].push(makeEmptySlot())
}

function removeSlot(role, idx) {
  if (batchSlots[role].length <= 1) return
  batchSlots[role].splice(idx, 1)
}

function handleBatchSave() {
  let added = 0
  for (const role of ROLES) {
    for (const slot of batchSlots[role]) {
      const name = slot.name.trim()
      if (!name) continue
      const exists = playerStore.teamPlayers.find(
        p => p.name === name && p.role === role
      )
      if (exists) continue
      playerStore.addPlayer(name, role)
      added++
    }
  }
  if (added > 0) {
    ElMessage.success(`已添加 ${added} 名队员`)
  } else {
    ElMessage.info('没有新增队员（空行已跳过，同名已存在）')
  }
  resetBatchSlots()
}

// --- 单独添加/编辑弹窗 ---
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const form = reactive({ name: '', role: '' })

const formRules = {
  name: [
    { required: true, message: '请输入队员名称', trigger: 'blur' },
    { min: 2, max: 20, message: '名称 2~20 个字符', trigger: 'blur' }
  ]
}

function openAddDialog() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.role = ''
  dialogVisible.value = true
}

function openEditDialog(player) {
  isEditing.value = true
  editingId.value = player.id
  form.name = player.name
  form.role = player.role || ''
  dialogVisible.value = true
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (!valid) return
    if (isEditing.value) {
      playerStore.updatePlayer(editingId.value, {
        name: form.name.trim(),
        role: form.role
      })
    } else {
      playerStore.addPlayer(form.name.trim(), form.role)
    }
    dialogVisible.value = false
  })
}

function handleDelete(id) {
  playerStore.removePlayer(id)
}
</script>

<style scoped>
.players-page { max-width: 700px; margin: 0 auto; }

.team-context { margin-left: auto; }
.no-team-hint { color: #f56c6c; font-size: 13px; }

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.hint {
  color: #808090;
  font-size: 12px;
  font-weight: 400;
}

/* 批量表格 */
.batch-card { margin-bottom: 16px; }

.batch-table { width: 100%; border-collapse: collapse; }

.batch-table th {
  text-align: left;
  padding: 8px 10px;
  font-size: 12px;
  color: #808090;
  font-weight: 500;
  border-bottom: 1px solid #2a2a4a;
}

.batch-table td {
  padding: 4px 6px;
  vertical-align: middle;
}

.batch-table .col-role { width: 60px; }
.batch-table .col-name { width: 260px; }
.batch-table .col-act { width: 64px; text-align: right; }

.batch-table tr.first-slot td { padding-top: 10px; }

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.batch-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* 已有成员表格 */
.table-card { margin-bottom: 16px; }

.player-name { color: #ffd700; font-weight: 600; }
.player-name.offline { color: #606070; text-decoration: line-through; }

.no-data { color: #606070; font-size: 13px; }
@media (max-width: 768px) {
  .players-page { padding: 0 4px; }
  .batch-table .col-name { width: 140px; }
  .batch-table .col-role { width: 50px; }
}
</style>
