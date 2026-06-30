<template>
  <div class="stats-page">
    <div class="page-header">
      <el-icon><DataAnalysis /></el-icon>
      <span>数据统计</span><router-link to="/help#stats" class="help-link">📖</router-link>
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
            @change="refreshStats"
            style="width: 260px"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">队员</span>
          <el-select
            v-model="filterPlayerId"
            placeholder="全部队员"
            clearable
            @change="refreshStats"
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
      </div>
    </el-card>

    <!-- Tab 切换统计维度 -->
    <el-tabs v-model="activeStatsTab" type="border-card" class="stats-tabs">
      <!-- ========== 队员犯错统计表 ========== -->
      <el-tab-pane label="队员统计" name="playerStats">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="section-header-row">
              <span class="section-title"><el-icon><User /></el-icon>队员犯错次数统计</span>
              <el-select v-model="filterDuty" placeholder="副本" size="small" style="width:160px" @change="refreshStats">
                <el-option v-for="d in dutyOptions" :key="d" :label="d" :value="d" />
              </el-select>
            </div>
          </template>

          <div v-if="playerStats.length === 0" class="empty-block">
            <el-empty description="暂无犯错记录" :image-size="100" />
          </div>

          <div v-else class="table-wrap">
            <el-table
              :data="playerStats"
              border
              style="width: 100%"
              :summary-method="getSummaries"
              show-summary
            >
              <el-table-column prop="playerName" label="队员" width="120" fixed="left">
                <template #default="{ row }">
                  <span class="stat-player-name">{{ row.playerName }}</span>
                </template>
              </el-table-column>

              <el-table-column
                v-for="date in statDates"
                :key="date"
                :label="formatShortDate(date)"
                width="80"
                align="center"
              >
                <template #default="{ row }">
                  <span
                    class="stat-cell"
                    :class="{ 'has-error': row.byDate[date] > 0 }"
                  >{{ row.byDate[date] || 0 }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="total" label="合计" width="80" align="center" fixed="right">
                <template #default="{ row }">
                  <el-tag type="danger" size="small" effect="dark">{{ row.total }}</el-tag>
                </template>
              </el-table-column>

              <el-table-column label="减员" width="65" align="center">
                <template #default="{ row }">
                  <span class="level-count death">{{ row.byLevel.death }}</span>
                </template>
              </el-table-column>
              <el-table-column label="团灭" width="65" align="center">
                <template #default="{ row }">
                  <span class="level-count wipe">{{ row.byLevel.wipe }}</span>
                </template>
              </el-table-column>
              <el-table-column label="狂暴" width="65" align="center">
                <template #default="{ row }">
                  <span class="level-count enrage">{{ row.byLevel.enrage }}</span>
                </template>
              </el-table-column>
              <el-table-column label="罪无可恕" width="80" align="center">
                <template #default="{ row }">
                  <span class="level-count unforgivable">{{ row.byLevel.unforgivable || 0 }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ========== 开荒进度折线图 ========== -->
      <el-tab-pane label="开荒进度" name="progressChart">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="section-header-row">
              <span class="section-title"><el-icon><TrendCharts /></el-icon>开荒进度趋势（每把到达阶段）</span>
              <el-select v-model="filterDuty" placeholder="副本" size="small" style="width:160px" @change="refreshStats">
                <el-option v-for="d in dutyOptions" :key="d" :label="d" :value="d" />
              </el-select>
            </div>
          </template>

          <div v-if="progressionData.length === 0" class="empty-block">
            <el-empty description="暂无记录" :image-size="100" />
          </div>

          <div v-else>
            <v-chart
              :option="progressionChartOption"
              autoresize
              style="height: 420px"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ========== 犯错分布饼图 ========== -->
      <el-tab-pane label="犯错分布" name="mistakeDist">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <span class="section-title">
              <el-icon><PieChart /></el-icon>
              犯错等级 & 队员分布
            </span>
          </template>

          <div v-if="progressionData.length === 0 && playerStats.length === 0" class="empty-block">
            <el-empty description="暂无犯错记录" :image-size="100" />
          </div>

          <div v-else class="charts-row">
            <div class="chart-half">
              <h4 class="chart-subtitle">犯错等级分布</h4>
              <v-chart
                v-if="levelDistData.length > 0"
                :option="levelPieOption"
                autoresize
                style="height: 320px"
                @click="onLevelPieClick"
              />
              <el-empty v-else description="暂无数据" :image-size="60" />
            </div>
            <div class="chart-half">
              <h4 class="chart-subtitle">队员犯错分布</h4>
              <v-chart
                v-if="playerDistData.length > 0"
                :option="playerPieOption"
                autoresize
                style="height: 320px"
                @click="onPlayerPieClick"
              />
              <el-empty v-else description="暂无数据" :image-size="60" />
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ========== 分队伍统计 ========== -->
      <el-tab-pane label="队伍统计" name="teamStats">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="section-header-row">
              <span class="section-title"><el-icon><PieChart /></el-icon>按职能分组统计</span>
              <el-select v-model="filterDuty" placeholder="副本" size="small" style="width:160px" @change="refreshStats">
                <el-option v-for="d in dutyOptions" :key="d" :label="d" :value="d" />
              </el-select>
            </div>
          </template>

          <div v-if="teamStatsData.length === 0" class="empty-block">
            <el-empty description="暂无犯错记录" :image-size="100" />
          </div>

          <div v-else>
            <!-- 职能分组卡片 -->
            <el-row :gutter="16" class="team-cards-row">
              <el-col
                v-for="group in teamStatsData"
                :key="group.key"
                :span="group.key === 'dps' ? 12 : 6"
              >
                <div class="team-group-card" :class="`team-group-${group.key}`">
                  <div class="team-group-header">
                    <span class="team-group-icon">{{ group.icon }}</span>
                    <span class="team-group-label">{{ group.label }}</span>
                    <el-tag type="danger" size="small" effect="dark">{{ group.total }} 次</el-tag>
                  </div>
                  <div class="team-group-detail">
                    <span>减员 {{ group.death }}</span>
                    <span class="sep">|</span>
                    <span>团灭 {{ group.wipe }}</span>
                    <span class="sep">|</span>
                    <span>狂暴 {{ group.enrage }}</span>
                    <span class="sep">|</span>
                    <span class="unforgivable-text">罪无可恕 {{ group.unforgivable || 0 }}</span>
                  </div>
                  <div class="team-roles">
                    <span
                      v-for="role in group.roles"
                      :key="role.role"
                      class="team-role-item"
                    >
                      <span class="team-role-badge" :style="{ background: roleColor(role.role) }">
                        {{ role.role }}
                      </span>
                      <span class="team-role-count">{{ role.count }}</span>
                    </span>
                  </div>
                </div>
              </el-col>
            </el-row>

            <!-- 按角色位排序的条形图 -->
            <div class="team-chart-wrap" style="margin-top: 20px">
              <h4 class="chart-subtitle">各角色位犯错对比</h4>
              <v-chart
                :option="teamBarOption"
                autoresize
                style="height: 320px"
              />
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 饼图点击详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="detailTitle" width="700px" destroy-on-close>
      <el-table :data="detailRecords" stripe size="small" max-height="400" style="width:100%">
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="duty" label="副本" width="100" />
        <el-table-column prop="playerName" label="队员" width="90" />
        <el-table-column prop="phase" label="阶段" width="70" />
        <el-table-column label="等级" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.level" :type="detailLevelTag(row.level)" size="small" effect="dark">{{ detailLevelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="120">
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import 'echarts'
import { useRecordStore } from '../stores/records'
import { usePlayerStore } from '../stores/players'
import { useTeamStore } from '../stores/teams'

const recordStore = useRecordStore()
const playerStore = usePlayerStore()
const router = useRouter()

// 饼图点击弹窗
const detailVisible = ref(false)
const detailTitle = ref('')
const detailRecords = ref([])
function detailLevelLabel(l) { const m = { death:'减员', wipe:'团灭', enrage:'狂暴', unforgivable:'罪无可恕', equipment:'设备故障' }; return m[l]||l }
function detailLevelTag(l) { const m = { death:'warning', wipe:'danger', enrage:'danger', unforgivable:'danger', equipment:'info' }; return m[l]||'info' }

function onLevelPieClick(params) {
  const levelMap = { death:'减员', wipe:'团灭', enrage:'狂暴', unforgivable:'罪无可恕', equipment:'设备故障' }
  const levelKey = Object.keys(levelMap).find(k => levelMap[k] === params.name)
  if (!levelKey) return
  let recs = recordStore.records.filter(r => r.type==='mistake' && r.level===levelKey && r.date>=startDate.value && r.date<=endDate.value)
  detailTitle.value = `${params.name} · ${recs.length} 条`
  detailRecords.value = recs.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp?.localeCompare(a.timestamp))
  detailVisible.value = true
}
function onPlayerPieClick(params) {
  let recs = recordStore.records.filter(r => r.type==='mistake' && r.playerName===params.name && r.date>=startDate.value && r.date<=endDate.value)
  detailTitle.value = `${params.name} · ${recs.length} 条`
  detailRecords.value = recs.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp?.localeCompare(a.timestamp))
  detailVisible.value = true
}

// --- 筛选条件 ---
const dateRange = ref([
  new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])
const dutyOptions = computed(() => {
  const teamStore = useTeamStore()
  return teamStore.currentTeam?.duties || []
})
const filterDuty = ref(dutyOptions.value[0] || '')
const filterPlayerId = ref('')
watch(dutyOptions, v => { if (!filterDuty.value && v.length) filterDuty.value = v[0] })
const activeStatsTab = ref('playerStats')

const startDate = computed(() => dateRange.value?.[0] || '2000-01-01')
const endDate = computed(() => dateRange.value?.[1] || '2099-12-31')

// --- 队员统计 ---
const playerStats = computed(() => {
  let stats = recordStore.getPlayerMistakeStats(startDate.value, endDate.value, filterDuty.value || undefined)
  // 仅显示上场队员
  const activeIds = new Set(playerStore.activeTeamPlayers.map(p => p.id))
  stats = stats.filter(s => activeIds.has(s.playerId))
  if (filterPlayerId.value) {
    stats = stats.filter(s => s.playerId === filterPlayerId.value)
  }
  return stats
})

const statDates = computed(() => {
  return recordStore.getDateRangeForStats(startDate.value, endDate.value)
})

function getSummaries({ columns, data }) {
  const sums = []
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    // 按 property 匹配
    if (col.property === 'total') {
      sums[index] = data.reduce((acc, row) => acc + row.total, 0)
      return
    }
    if (col.property === 'playerName') {
      sums[index] = ''
      return
    }
    // 按 label 匹配：日期列、等级列
    const label = col.label || ''
    if (label === '减员') {
      sums[index] = data.reduce((acc, row) => acc + row.byLevel.death, 0)
    } else if (label === '团灭') {
      sums[index] = data.reduce((acc, row) => acc + row.byLevel.wipe, 0)
    } else if (label === '狂暴') {
      sums[index] = data.reduce((acc, row) => acc + row.byLevel.enrage, 0)
    } else if (label === '罪无可恕') {
      sums[index] = data.reduce((acc, row) => acc + (row.byLevel.unforgivable || 0), 0)
    } else if (label && label.includes('-')) {
      // MM-DD 格式的日期列
      const date = statDates.value.find(d => formatShortDate(d) === label)
      sums[index] = date
        ? data.reduce((acc, row) => acc + (row.byDate[date] || 0), 0)
        : ''
    } else {
      sums[index] = ''
    }
  })
  return sums
}

function refreshStats() {
  // computed 自动响应，无需手动刷新
}

// --- 开荒进度折线图 ---
const progressionData = computed(() => {
  let data = recordStore.getProgressionData(startDate.value, endDate.value)
  if (filterDuty.value) {
    const dutyPullKeys = new Set()
    for (const r of recordStore.records) {
      if (r.duty === filterDuty.value && r.date >= startDate.value && r.date <= endDate.value) {
        dutyPullKeys.add(`${r.date}||${r.pullNumber}`)
      }
    }
    data = data.filter(d => dutyPullKeys.has(`${d.date}||${d.pullNumber}`))
  }
  if (filterPlayerId.value) {
    // 如果筛选了队员，只需要该队员参与的那些 pull
    const playerPullKeys = new Set()
    for (const r of recordStore.records) {
      if (
        r.type === 'mistake' &&
        r.playerId === filterPlayerId.value &&
        r.date >= startDate.value &&
        r.date <= endDate.value
      ) {
        playerPullKeys.add(`${r.date}||${r.pullNumber}`)
      }
    }
    data = data.filter(d => playerPullKeys.has(`${d.date}||${d.pullNumber}`))
  }
  return data
})

const progressionChartOption = computed(() => {
  const data = progressionData.value
  if (data.length === 0) return {}

  const labels = data.map((d, i) => {
    const shortDate = d.date.slice(5) // MM-DD
    return `${shortDate}\n第${d.pullNumber}把`
  })

  const values = data.map(d => d.maxPhaseValue)
  const phaseMax = recordStore.phaseOrder.length
  const yMax = Math.max(phaseMax, Math.max(...values) + 1)

  // 生成 Y 轴标签
  const yLabels = []
  const yMarks = []
  for (let i = 1; i <= yMax; i++) {
    const name = recordStore.getPhaseNameByValue(i)
    yLabels.push(name)
    if (i <= phaseMax) {
      yMarks.push({ yAxis: i, label: { formatter: name, fontSize: 11 } })
    }
  }

  // 标记灭团/狂暴的点
  const markPoints = []
  const allRecords = recordStore.records
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const pullRecords = allRecords.filter(
      r => r.date === d.date && r.pullNumber === d.pullNumber && r.type === 'mistake'
    )
    const hasFatal = pullRecords.some(r => r.level === 'wipe' || r.level === 'enrage' || r.level === 'unforgivable')
    if (hasFatal) {
      markPoints.push({
        coord: [i, d.maxPhaseValue],
        symbol: 'pin',
        symbolSize: 36,
        itemStyle: { color: '#f56c6c' }
      })
    }
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0', fontSize: 13 },
      formatter: (params) => {
        const p = params[0]
        const d = data[p.dataIndex]
        const shortDate = d.date.slice(5)
        let html = `<strong>${d.date} 第${d.pullNumber}把</strong><br/>`
        html += `到达: <span style="color:#ffd700;font-weight:bold">${d.maxPhase || '-'}</span><br/>`
        html += `犯错: ${d.mistakeCount} 次`
        return html
      }
    },
    grid: {
      left: 50,
      right: 30,
      top: 30,
      bottom: 60
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#3a3a5a' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#a0a0b8',
        fontSize: 10,
        interval: 0,
        rotate: data.length > 15 ? 45 : 0
      },
      nameTextStyle: { color: '#a0a0b8' }
    },
    yAxis: {
      type: 'value',
      name: '阶段',
      nameTextStyle: { color: '#808090', fontSize: 12 },
      min: 0,
      max: yMax + 1,
      interval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#1a1a3a' } },
      axisLabel: {
        color: '#808090',
        formatter: (v) => recordStore.getPhaseNameByValue(v) || ''
      }
    },
    series: [
      {
        name: '到达阶段',
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#ffd700',
          width: 2.5
        },
        itemStyle: {
          color: '#ffd700',
          borderColor: '#1a1a2e',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 215, 0, 0.25)' },
              { offset: 1, color: 'rgba(255, 215, 0, 0.02)' }
            ]
          }
        },
        markPoints: {
          data: markPoints,
          label: {
            show: true,
            formatter: '灭',
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold'
          }
        }
      }
    ]
  }
})

// --- 犯错等级分布饼图 ---
// 犯错分布不区分副本，使用全量数据
const allPlayerStats = computed(() => {
  const stats = recordStore.getPlayerMistakeStats(startDate.value, endDate.value)
  const activeIds = new Set(playerStore.activeTeamPlayers.map(p => p.id))
  return stats.filter(s => activeIds.has(s.playerId))
})

const levelDistData = computed(() => {
  const stats = allPlayerStats.value
  let death = 0, wipe = 0, enrage = 0, unforgivable = 0
  for (const s of stats) {
    death += s.byLevel.death
    wipe += s.byLevel.wipe
    enrage += s.byLevel.enrage
    unforgivable += (s.byLevel.unforgivable || 0)
  }
  if (death + wipe + enrage + unforgivable === 0) return []
  return [
    { name: '减员', value: death, itemStyle: { color: '#e6a23c' } },
    { name: '团灭', value: wipe, itemStyle: { color: '#f56c6c' } },
    { name: '狂暴', value: enrage, itemStyle: { color: '#c4568b' } },
    { name: '罪无可恕', value: (() => { let u = 0; for (const s of stats) u += (s.byLevel.unforgivable || 0); return u; })(), itemStyle: { color: '#9b0033' } }
  ]
})

const levelPieOption = computed(() => {
  if (levelDistData.value.length === 0) return {}
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0' },
      formatter: '{b}: {c} 次 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#0f0f1a',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'outside',
        color: '#c0c0d0',
        formatter: '{b}\n{c} 次'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      data: levelDistData.value
    }]
  }
})

// --- 队员犯错分布饼图 ---
const playerDistData = computed(() => {
  return allPlayerStats.value
    .filter(s => s.total > 0)
    .map(s => ({ name: s.playerName, value: s.total }))
})

const PLAYER_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b8d0'
]

const playerPieOption = computed(() => {
  if (playerDistData.value.length === 0) return {}
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0' },
      formatter: '{b}: {c} 次 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#0f0f1a',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'outside',
        color: '#c0c0d0',
        formatter: '{b}\n{c} 次'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      data: playerDistData.value,
      color: PLAYER_COLORS
    }]
  }
})

// --- 分队伍统计 ---
const ROLE_COLORS = {
  MT: '#4a90d9', ST: '#3a7bc8',
  H1: '#67c23a', H2: '#5ab22e',
  D1: '#e6a23c', D2: '#d49520',
  D3: '#f56c6c', D4: '#c4568b'
}
function roleColor(role) { return ROLE_COLORS[role] || '#666' }

const ROLE_GROUPS = [
  { key: 'tank',  label: '坦克',  icon: '🛡️', roles: ['MT', 'ST'] },
  { key: 'heal',  label: '治疗',  icon: '💚', roles: ['H1', 'H2'] },
  { key: 'dps',   label: 'DPS',   icon: '⚔️', roles: ['D1', 'D2', 'D3', 'D4'] }
]

const teamStatsData = computed(() => {
  let filteredRecs = recordStore.records.filter(r =>
    r.type === 'mistake' &&
    r.date >= startDate.value &&
    r.date <= endDate.value
  )
  if (filterDuty.value) filteredRecs = filteredRecs.filter(r => r.duty === filterDuty.value)
  const mistakeRecords = filteredRecs

  // 建立 playerId → role 映射
  const playerRoleMap = {}
  for (const p of playerStore.players) {
    if (p.role) playerRoleMap[p.id] = p.role
  }

  return ROLE_GROUPS.map(group => {
    let total = 0, death = 0, wipe = 0, enrage = 0, unforgivable = 0
    const roleCounts = {}
    for (const role of group.roles) {
      roleCounts[role] = { role, count: 0, death: 0, wipe: 0, enrage: 0, unforgivable: 0 }
    }

    for (const r of mistakeRecords) {
      const role = playerRoleMap[r.playerId]
      if (!role || !group.roles.includes(role)) continue

      total++
      if (r.level === 'death') death++
      else if (r.level === 'wipe') wipe++
      else if (r.level === 'enrage') enrage++
      else if (r.level === 'unforgivable') unforgivable++

      if (roleCounts[role]) {
        roleCounts[role].count++
        if (r.level === 'death') roleCounts[role].death++
        else if (r.level === 'wipe') roleCounts[role].wipe++
        else if (r.level === 'enrage') roleCounts[role].enrage++
        else if (r.level === 'unforgivable') roleCounts[role].unforgivable++
      }
    }

    return {
      ...group,
      total, death, wipe, enrage, unforgivable,
      roles: Object.values(roleCounts).filter(r => r.count > 0 || group.roles.includes(r.role))
    }
  }).filter(g => g.total > 0)
})

const teamBarOption = computed(() => {
  let filteredRecs = recordStore.records.filter(r =>
    r.type === 'mistake' &&
    r.date >= startDate.value &&
    r.date <= endDate.value
  )
  if (filterDuty.value) filteredRecs = filteredRecs.filter(r => r.duty === filterDuty.value)
  const mistakeRecords = filteredRecs
  const playerRoleMap = {}
  for (const p of playerStore.players) {
    if (p.role) playerRoleMap[p.id] = p.role
  }

  // 按角色位聚合
  const roleStats = {}
  for (const rl of ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4']) {
    roleStats[rl] = { death: 0, wipe: 0, enrage: 0, unforgivable: 0 }
  }
  for (const r of mistakeRecords) {
    const role = playerRoleMap[r.playerId]
    if (!role || !roleStats[role]) continue
    if (r.level && roleStats[role][r.level] !== undefined) roleStats[role][r.level]++
  }

  const roles = ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4']
  const deathData = roles.map(r => roleStats[r].death)
  const wipeData = roles.map(r => roleStats[r].wipe)
  const enrageData = roles.map(r => roleStats[r].enrage)
  const unforgivableData = roles.map(r => roleStats[r].unforgivable || 0)

  // 找出最大值的角色位，高亮颜色
  const maxVal = Math.max(
    ...deathData, ...wipeData, ...enrageData, ...unforgivableData, 1
  )

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0', fontSize: 13 }
    },
    legend: {
      data: ['减员', '团灭', '狂暴', '罪无可恕'],
      textStyle: { color: '#a0a0b8' },
      top: 0
    },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: roles,
      axisLine: { lineStyle: { color: '#3a3a5a' } },
      axisLabel: { color: '#c0c0d0', fontSize: 13, fontWeight: 'bold' },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '犯错次数',
      nameTextStyle: { color: '#808090' },
      minInterval: 1,
      splitLine: { lineStyle: { color: '#1a1a3a' } },
      axisLabel: { color: '#808090' }
    },
    series: [
      {
        name: '减员',
        type: 'bar',
        data: deathData,
        itemStyle: {
          color: '#e6a23c',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: '#f0b84c' } }
      },
      {
        name: '团灭',
        type: 'bar',
        data: wipeData,
        itemStyle: {
          color: '#f56c6c',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: '#ff8080' } }
      },
      {
        name: '狂暴',
        type: 'bar',
        data: enrageData,
        itemStyle: {
          color: '#c4568b',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: '#e070a0' } }
      },
      {
        name: '罪无可恕',
        type: 'bar',
        data: unforgivableData,
        itemStyle: {
          color: '#9b0033',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: '#d42050' } }
      }
    ]
  }
})

// --- 辅助 ---
function formatShortDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(5) // MM-DD
}
</script>

<style scoped>
.stats-page {
  max-width: 1100px;
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

/* Tab 卡片 */
.stats-tabs {
  background: transparent;
  border: none;
}

.stats-tabs :deep(.el-tabs__header) {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px 8px 0 0;
  margin-bottom: 0;
}

.stats-tabs :deep(.el-tabs__nav) {
  border: none;
}

.stats-tabs :deep(.el-tabs__item) {
  color: #a0a0b8;
  border: none;
  padding: 0 24px;
}

.stats-tabs :deep(.el-tabs__item.is-active) {
  color: #ffd700;
  background: #252540;
}

.stats-tabs :deep(.el-tabs__content) {
  padding: 0;
}

.inner-card {
  border-radius: 0 0 8px 8px;
  border-top: none;
}

.section-header-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.empty-block {
  padding: 40px 0;
}

/* 统计表格 */
.table-wrap {
  overflow-x: auto;
}

.stat-player-name {
  color: #ffd700;
  font-weight: 600;
}

.stat-cell {
  color: #808090;
  font-weight: 500;
}

.stat-cell.has-error {
  color: #f56c6c;
  font-weight: 700;
}

.level-count {
  font-weight: 600;
  font-size: 13px;
}

.level-count.death {
  color: #e6a23c;
}

.level-count.wipe {
  color: #f56c6c;
}

.level-count.enrage {
  color: #c4568b;
}

.level-count.unforgivable {
  color: #ff3366;
  font-weight: 800;
  text-shadow: 0 0 6px rgba(255, 51, 102, 0.3);
}

/* 图表行 */
.charts-row {
  display: flex;
  gap: 20px;
}

.chart-half {
  flex: 1;
  min-width: 0;
}

.chart-subtitle {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #c0c0d0;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .charts-row {
    flex-direction: column;
  }
  .team-cards-row .el-col {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 12px;
  }
}

/* 队伍统计 */
.team-cards-row {
  margin-bottom: 8px;
}

.team-group-card {
  background: #141428;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  padding: 14px 16px;
  height: 100%;
}

.team-group-card.team-group-tank {
  border-left: 3px solid #4a90d9;
}

.team-group-card.team-group-heal {
  border-left: 3px solid #67c23a;
}

.team-group-card.team-group-dps {
  border-left: 3px solid #e6a23c;
}

.team-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.team-group-icon {
  font-size: 18px;
}

.team-group-label {
  font-weight: 700;
  font-size: 15px;
  color: #e0e0e0;
  flex: 1;
}

.team-group-detail {
  font-size: 12px;
  color: #808090;
  margin-bottom: 8px;
  display: flex;
  gap: 6px;
}

.team-group-detail .sep {
  color: #3a3a5a;
}

.team-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.team-role-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.team-role-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
}

.team-role-count {
  color: #ffd700;
  font-weight: 600;
}

.unforgivable-text {
  color: #ff3366;
  font-weight: 700;
}

.team-chart-wrap {
  margin-top: 16px;
}
@media (max-width: 768px) {
  .stats-page { padding: 0 4px; }
  .stats-tabs :deep(.el-tabs__item) { padding: 0 12px !important; font-size: 12px; }
  .table-wrap { overflow-x: auto; }
  .team-cards-row .el-col { flex: 0 0 100% !important; max-width: 100% !important; margin-bottom: 8px; }
}
</style>
