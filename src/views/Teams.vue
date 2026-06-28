<template>
  <div class="teams-page">
    <div class="page-header">
      <el-icon><Collection /></el-icon>
      <span>队伍管理</span>
    </div>

    <!-- 操作栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          新建队伍
        </el-button>
        <span class="hint">共 {{ teamStore.teams.length }} 个队伍</span>
      </div>
    </el-card>

    <!-- 队伍列表 -->
    <div class="team-list">
      <el-card
        v-for="team in teamStore.teams"
        :key="team.id"
        shadow="never"
        class="team-card"
        :class="{ 'is-current': team.id === teamStore.currentTeamId }"
      >
        <div class="team-card-body">
          <div class="team-info">
            <div class="team-name-row">
              <h3 class="team-name">{{ team.name }}</h3>
              <el-tag v-if="team.id === teamStore.currentTeamId" type="success" size="small" effect="dark">
                当前队伍
              </el-tag>
            </div>
            <div class="team-meta">
              <span class="team-duty">
                <el-icon><Location /></el-icon>
                {{ team.duty || '未设置副本' }}
              </span>
              <span class="team-stats">
                <el-icon><User /></el-icon>
                {{ getTeamPlayerCount(team.id) }} 人
                ·
                <el-icon><List /></el-icon>
                {{ getTeamRecordCount(team.id) }} 条记录
              </span>
            </div>
          </div>
          <div class="team-actions">
            <el-button
              v-if="team.id !== teamStore.currentTeamId"
              type="primary"
              plain
              size="small"
              @click="handleSelectTeam(team.id)"
            >
              <el-icon><Check /></el-icon>
              切换到此队伍
            </el-button>
            <el-button
              v-else
              type="success"
              plain
              size="small"
              disabled
            >
              使用中
            </el-button>
            <el-button type="primary" link size="small" @click="openEditDialog(team)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-popconfirm
              v-if="teamStore.teams.length > 1"
              title="删除队伍将同时删除该队伍下的所有队员和记录！确定删除？"
              confirm-button-text="确认删除"
              cancel-button-text="取消"
              @confirm="handleDelete(team.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑队伍' : '新建队伍'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
        label-position="top"
      >
        <el-form-item label="队伍名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="例如：绝巴哈固定队、伊甸休闲队"
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="攻略副本" prop="duty">
          <el-select
            v-model="form.duty"
            filterable
            allow-create
            placeholder="选择或输入副本名称"
            style="width: 100%"
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
import { useTeamStore, DUTY_PRESETS } from '../stores/teams'
import { usePlayerStore } from '../stores/players'
import { useRecordStore } from '../stores/records'

const teamStore = useTeamStore()
const playerStore = usePlayerStore()
const recordStore = useRecordStore()

function getTeamPlayerCount(teamId) {
  return playerStore.players.filter(p => p.teamId === teamId).length
}

function getTeamRecordCount(teamId) {
  const { mistakes, progress } = recordStore.getTeamRecordCounts(teamId)
  return mistakes + progress
}

// 弹窗
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const form = reactive({
  name: '',
  duty: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入队伍名称', trigger: 'blur' },
    { min: 2, max: 30, message: '名称 2~30 个字符', trigger: 'blur' }
  ]
}

function openAddDialog() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.duty = ''
  dialogVisible.value = true
}

function openEditDialog(team) {
  isEditing.value = true
  editingId.value = team.id
  form.name = team.name
  form.duty = team.duty || ''
  dialogVisible.value = true
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (!valid) return
    if (isEditing.value) {
      teamStore.updateTeam(editingId.value, {
        name: form.name.trim(),
        duty: form.duty
      })
      ElMessage.success('队伍信息已更新')
    } else {
      const team = teamStore.addTeam(form.name.trim(), form.duty)
      if (team) {
        // 新建队伍自动切换
        teamStore.setCurrentTeam(team.id)
        ElMessage.success('队伍已创建并切换')
      }
    }
    dialogVisible.value = false
  })
}

function handleSelectTeam(id) {
  teamStore.setCurrentTeam(id)
  ElMessage.success('已切换队伍')
}

function handleDelete(id) {
  const ok = teamStore.removeTeam(id)
  if (ok) {
    ElMessage.success('队伍已删除')
  } else {
    ElMessage.error('至少保留一个队伍')
  }
}
</script>

<style scoped>
.teams-page {
  max-width: 800px;
  margin: 0 auto;
}

.toolbar-card {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint {
  color: #808090;
  font-size: 13px;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.team-card {
  border: 1px solid #2a2a4a;
  transition: border-color 0.2s;
}

.team-card.is-current {
  border-color: #67c23a;
  box-shadow: 0 0 12px rgba(103, 194, 58, 0.1);
}

.team-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.team-info {
  flex: 1;
  min-width: 0;
}

.team-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.team-name {
  font-size: 17px;
  font-weight: 700;
  color: #e0e0e0;
  margin: 0;
}

.team-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #808090;
  align-items: center;
}

.team-duty {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ffd700;
}

.team-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.team-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
