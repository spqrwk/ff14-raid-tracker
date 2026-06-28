<template>
  <div class="sessions-page">
    <div class="page-header">
      <el-icon><List /></el-icon>
      <span>历史记录</span>
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
            style="width: 260px"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">队员筛选</span>
          <el-select
            v-model="filterPlayerId"
            placeholder="全部队员"
            clearable
            style="width: 160px"
          >
            <el-option label="全部队员" value="" />
            <el-option
              v-for="p in playerStore.players"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">类型</span>
          <el-select v-model="filterType" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="犯错记录" value="mistake" />
            <el-option label="进度记录" value="progress" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 按日期分组展示 -->
    <div v-if="groupedRecords.length === 0" class="empty-state">
      <el-empty description="没有符合条件的记录" :image-size="120" />
    </div>

    <div v-else class="records-list">
      <div v-for="group in groupedRecords" :key="group.date" class="date-group">
        <div class="date-header">
          <span class="date-label">{{ group.date }}</span>
          <span class="date-stats">
            {{ group.pulls.length }} 把 ·
            犯错 {{ group.mistakeCount }} 次
          </span>
        </div>

        <div v-for="pull in group.pulls" :key="pull.pullNumber" class="pull-block">
          <div class="pull-block-header">
            <el-tag
              :type="pull.ended ? 'danger' : ''"
              size="small"
              effect="dark"
            >
              第 {{ pull.pullNumber }} 把
            </el-tag>
            <span v-if="pull.maxPhase" class="pull-max-phase">
              最远 {{ pull.maxPhase }}
            </span>
            <span v-if="pull.ended" class="pull-end-badge">已结束</span>
            <el-popconfirm
              title="确定删除这一把的所有记录？"
              @confirm="handleDeletePull(group.date, pull.pullNumber)"
            >
              <template #reference>
                <el-button type="danger" link size="small" style="margin-left: auto">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </div>

          <el-table
            :data="pull.records"
            size="small"
            style="width: 100%"
            class="pull-table"
          >
            <el-table-column type="index" width="40" label="#" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.type === 'mistake'" type="warning" size="small" effect="dark">
                  犯错
                </el-tag>
                <el-tag v-else-if="row.type === 'progress'" type="primary" size="small" effect="dark">
                  进度
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="phase" label="阶段" width="80">
              <template #default="{ row }">
                <span class="phase-text">{{ row.phase || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="playerName" label="队员" width="100" v-if="filterType !== 'progress'">
              <template #default="{ row }">
                <span v-if="row.type === 'mistake'" class="player-text">{{ row.playerName }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="详情" min-width="200">
              <template #default="{ row }">
                <template v-if="row.type === 'mistake'">
                  <el-tag
                    :type="levelTagType(row.level)"
                    size="small"
                    effect="dark"
                    class="level-mini-tag"
                  >{{ levelLabel(row.level) }}</el-tag>
                  <span v-if="row.description" class="desc-text">{{ row.description }}</span>
                  <span v-else class="no-desc">-</span>
                </template>
                <template v-else>
                  <span class="desc-text">{{ row.notes || '到达 ' + row.phase }}</span>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="80">
              <template #default="{ row }">
                <span class="time-text">{{ formatTime(row.timestamp) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" fixed="right">
              <template #default="{ row }">
                <el-popconfirm
                  title="确定删除该条记录？"
                  @confirm="handleDeleteRecord(row.id)"
                >
                  <template #reference>
                    <el-button type="danger" link size="small">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRecordStore } from '../stores/records'
import { usePlayerStore } from '../stores/players'

const recordStore = useRecordStore()
const playerStore = usePlayerStore()

// --- 筛选条件 ---
const dateRange = ref([
  new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])
const filterPlayerId = ref('')
const filterType = ref('all')

// --- 筛选后的记录 ---
const filteredRecords = computed(() => {
  const startDate = dateRange.value?.[0] || '2000-01-01'
  const endDate = dateRange.value?.[1] || '2099-12-31'

  let records = recordStore.getRecordsByDateRange(startDate, endDate)

  if (filterPlayerId.value) {
    records = records.filter(r =>
      r.type !== 'mistake' || r.playerId === filterPlayerId.value
    )
  }

  if (filterType.value === 'mistake') {
    records = records.filter(r => r.type === 'mistake')
  } else if (filterType.value === 'progress') {
    records = records.filter(r => r.type === 'progress')
  }

  return records
})

// --- 按日期 -> pull 分组 ---
const groupedRecords = computed(() => {
  const groups = {}
  const records = filteredRecords.value

  for (const r of records) {
    if (r.type === 'pull_end') continue
    if (!groups[r.date]) {
      groups[r.date] = { date: r.date, pulls: {}, mistakeCount: 0 }
    }
    if (!groups[r.date].pulls[r.pullNumber]) {
      groups[r.date].pulls[r.pullNumber] = {
        pullNumber: r.pullNumber,
        records: [],
        maxPhase: '',
        maxPhaseValue: 0,
        ended: false
      }
    }
    const pull = groups[r.date].pulls[r.pullNumber]
    pull.records.push(r)

    const pv = recordStore.getPhaseValue(r.phase)
    if (pv > pull.maxPhaseValue) {
      pull.maxPhaseValue = pv
      pull.maxPhase = r.phase
    }

    if (r.type === 'mistake') {
      groups[r.date].mistakeCount++
    }
  }

  // 标记已结束的 pull 并排序
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

// --- 操作 ---
function handleDeleteRecord(id) {
  recordStore.deleteRecord(id)
}

function handleDeletePull(date, pullNumber) {
  recordStore.deletePull(date, pullNumber)
}

// --- 辅助 ---
function levelLabel(level) {
  const map = { death: '减员', wipe: '团灭', enrage: '狂暴' }
  return map[level] || level
}

function levelTagType(level) {
  const map = { death: 'warning', wipe: 'danger', enrage: 'danger' }
  return map[level] || 'info'
}

function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.sessions-page {
  max-width: 1000px;
  margin: 0 auto;
}

/* 筛选栏 */
.filter-card {
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #808090;
  white-space: nowrap;
}

/* 空状态 */
.empty-state {
  padding: 60px 0;
}

/* 记录列表 */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  /* nothing extra needed */
}

.date-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a2a4a;
}

.date-label {
  font-size: 17px;
  font-weight: 700;
  color: #ffd700;
}

.date-stats {
  font-size: 13px;
  color: #808090;
}

.pull-block {
  margin-bottom: 12px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 10px 14px;
  background: #141428;
}

.pull-block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.pull-max-phase {
  font-size: 13px;
  color: #a0a0b8;
}

.pull-end-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.pull-table {
  border-radius: 4px;
  overflow: hidden;
}

.phase-text {
  color: #ffd700;
  font-weight: 600;
}

.player-text {
  color: #67c23a;
  font-weight: 600;
}

.desc-text {
  color: #c0c0d0;
  font-size: 13px;
}

.no-desc {
  color: #606070;
}

.time-text {
  font-size: 12px;
  color: #808090;
}

.level-mini-tag {
  margin-right: 6px;
}
</style>
