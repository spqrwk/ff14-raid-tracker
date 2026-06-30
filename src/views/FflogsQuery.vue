<template>
  <div class="fflogs-query">
    <!-- ========== 调试工具条 ========== -->
    <div class="debug-toolbar">
      <span class="rate-badge" :class="{ warning: (rateLimit && rateRemaining <= 500) || rateError, danger: rateLimit && rateRemaining <= 100 }" v-if="hasCredential || rateError">
        <template v-if="rateLimit">额度 {{ rateRemaining }}/{{ rateLimit.limitPerHour }} · {{ rateResetText }}</template>
        <template v-else-if="rateError">{{ rateError }}</template>
        <template v-else>加载额度...</template>
      </span>
      <el-switch v-model="debugEnabled" size="small" active-text="调试" style="--el-switch-on-color:#e6a23c" />
      <el-button v-if="debugLogs.length" size="small" type="warning" plain @click="downloadDebug">下载响应 ({{ debugLogs.length }})</el-button>
    </div>

    <!-- ========== 功能 Tab ========== -->
    <el-tabs v-model="activeTool" class="tool-tabs">
      <!-- ========== 进度统计 ========== -->
      <el-tab-pane label="进度统计" name="progress">
        <!-- 查询参数 -->
        <el-card shadow="never" class="param-card">
          <template #header>
            <div class="card-header-left">
              <el-icon><Search /></el-icon>
              <span>查询参数</span>
            </div>
          </template>
          <el-row :gutter="12">
            <el-col :span="8">
              <label class="field-label">玩家名@服务器</label>
              <el-input v-model="prog.playerAtServer" placeholder="青瓜@拉诺西亚" size="small" @change="splitProgPlayer" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">区域</label>
              <el-input v-model="prog.serverRegion" placeholder="CN" size="small" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">Boss ID</label>
              <el-select v-model="prog.encounterId" filterable allow-create size="small" style="width:100%">
                <el-option v-for="b in BOSS_MAP" :key="b.id" :label="`${b.id} - ${b.name}`" :value="b.id" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <label class="field-label">分页数量</label>
              <el-input-number v-model="prog.limit" :min="1" :max="100" size="small" style="width:100%" />
            </el-col>
          </el-row>
          <el-row :gutter="12" style="margin-top:8px">
            <el-col :span="6">
              <label class="field-label">起始时间</label>
              <el-date-picker v-model="prog.afterDate" type="datetime" placeholder="选择日期时间" size="small" style="width:100%" @change="d => prog.afterMs = d ? d.getTime() : 0" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">去重窗口(ms)</label>
              <el-input-number v-model="prog.dedupeMs" :min="0" size="small" style="width:100%" />
            </el-col>
            <el-col :span="5">
              <label class="field-label">血量窗口(ms)</label>
              <el-input-number v-model="prog.healthWindow" :min="1000" size="small" style="width:100%" />
            </el-col>
            <el-col :span="5">
              <label class="field-label">血量查询</label>
              <el-select v-model="prog.healthMode" size="small" style="width:100%">
                <el-option label="最远进度一场" value="best" />
                <el-option label="不查询血量" value="none" />
                <el-option label="全部战斗" value="all" />
              </el-select>
            </el-col>
          </el-row>
          <div class="action-bar">
            <el-button type="primary" @click="runProgress" :loading="prog.running" :disabled="!canQuery">
              <el-icon><VideoPlay /></el-icon>开始查询
            </el-button>
            <el-button @click="stopProgress" :disabled="!prog.running" type="danger" plain>
              <el-icon><VideoPause /></el-icon>停止
            </el-button>
            <el-button @click="downloadProgJson" :disabled="!prog.hasData" size="small" style="margin-left:auto">下载 JSON</el-button>
            <el-button @click="downloadProgCsv" :disabled="!prog.hasData" size="small">下载 CSV</el-button>
          </div>
          <div v-if="prog.running" class="progress-bar-wrap">
            <el-progress :percentage="prog.progressPct" :stroke-width="14" :text-inside="true" />
            <div class="progress-msg">{{ prog.progressMsg }}</div>
          </div>
        </el-card>

        <!-- 统计卡片 -->
        <el-row :gutter="12" class="metrics-row">
          <el-col :span="4">
            <el-statistic title="战斗次数" :value="prog.summary?.battleCount ?? 0" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="通关次数" :value="prog.summary?.killCount ?? 0" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="P1通过" :value="prog.summary?.p1PassCount ?? 0" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="P2通过" :value="prog.summary?.p2PassCount ?? 0" />
          </el-col>
          <el-col :span="4">
            <div class="metric-card">
              <div class="metric-label">最远进度</div>
              <div class="metric-value">{{ prog.bestPhase }}</div>
              <div class="metric-sub" v-if="prog.bestDuration">该场 {{ prog.bestDuration }}</div>
            </div>
          </el-col>
          <el-col :span="4">
            <el-statistic title="最远进度血量" :value="prog.bestHp" />
          </el-col>
        </el-row>

        <!-- 最远进度详情 -->
        <el-card v-if="prog.bestFightDetail" shadow="never" class="table-card">
          <template #header>
            <span>最远 {{ prog.bestPhase }} · {{ prog.bestDuration }}</span>
          </template>
          <el-table :data="prog.bestFightDetail.teammates" stripe size="small" max-height="300">
            <el-table-column prop="name" label="队友" align="center" />
            <el-table-column label="职业" align="center">
              <template #default="{ row }">
                <span :style="{ color: roleColor(row.job) }">{{ jobCN(row.job) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 图表区 -->
        <el-row :gutter="12" class="charts-row">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>卡点分布</span></template>
              <v-chart :option="prog.stageChartOption" autoresize style="height:280px" v-if="prog.hasData" />
              <el-empty v-else description="暂无数据" :image-size="60" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>阶段通过次数</span></template>
              <v-chart :option="prog.passChartOption" autoresize style="height:280px" v-if="prog.hasData" />
              <el-empty v-else description="暂无数据" :image-size="60" />
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="12" class="charts-row">
          <el-col :span="24">
            <el-card shadow="never">
              <template #header><span>进度趋势</span></template>
              <v-chart :option="prog.progressChartOption" autoresize style="height:280px" v-if="prog.hasData" />
              <el-empty v-else description="暂无数据" :image-size="60" />
            </el-card>
          </el-col>
        </el-row>

        <!-- 数据表格 -->
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header-row">
              <span>战斗明细</span>
              <span class="table-meta">{{ prog.filteredFights.length }} / {{ prog.fights.length }} 行</span>
            </div>
          </template>
          <div class="table-toolbar">
            <el-input v-model="prog.tableSearch" placeholder="搜索报告ID、战斗ID、阶段..." size="small" style="width:220px" clearable />
            <el-select v-model="prog.statusFilter" size="small" style="width:120px">
              <el-option label="全部" value="all" />
              <el-option label="仅通关" value="kill" />
              <el-option label="仅未通关" value="wipe" />
              <el-option label="最远进度" value="best" />
            </el-select>
            <el-select v-model="prog.stageFilter" size="small" style="width:140px">
              <el-option label="全部阶段" value="all" />
              <el-option v-for="s in prog.stageOptions" :key="s" :label="s" :value="s" />
            </el-select>
            <el-button size="small" @click="resetProgFilters">重置</el-button>
          </div>
          <el-table :data="prog.pagedFights" stripe size="small" max-height="400" style="width:100%" @sort-change="prog.onSortChange">
            <el-table-column prop="attemptNo" label="序号" width="60" sortable="custom" />
            <el-table-column prop="realStartISO" label="开始时间" width="160" sortable="custom" />
            <el-table-column prop="reportCode" label="报告ID" width="100" sortable="custom" />
            <el-table-column prop="fightID" label="战斗ID" width="80" sortable="custom" />
            <el-table-column label="职业" width="70">
              <template #default="{ row }">{{ jobCN(row.spec) }}</template>
            </el-table-column>
            <el-table-column label="通关" width="70">
              <template #default="{ row }">
                <el-tag :type="row.kill ? 'success' : 'danger'" size="small" effect="dark">{{ row.kill ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="进度%" width="80" sortable="custom" prop="fightPercentage">
              <template #default="{ row }">{{ fmtPct(row.fightPercentage) }}</template>
            </el-table-column>
            <el-table-column label="最终阶段" width="140" sortable="custom" prop="lastPhaseName">
              <template #default="{ row }">{{ row.lastPhaseName || '' }}</template>
            </el-table-column>
            <el-table-column label="卡点阶段" width="140" sortable="custom" prop="stuckStage">
              <template #default="{ row }">{{ row.stuckStage || '' }}</template>
            </el-table-column>
            <el-table-column label="最远进度" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.isBestFightPercentage" type="primary" size="small" effect="dark">是</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="剩余血量%" width="100" sortable="custom" prop="finalPhaseHPPercent">
              <template #default="{ row }">{{ fmtPct(row.finalPhaseHPPercent) }}</template>
            </el-table-column>
            <el-table-column label="血量明细" min-width="180">
              <template #default="{ row }">{{ row.finalPhaseHPDetail || healthSourceLabel(row.healthSource) }}</template>
            </el-table-column>
            <el-table-column label="重复" width="60" sortable="custom" prop="duplicateCount" />
          </el-table>
        </el-card>

        <!-- 运行日志 -->
        <el-card shadow="never" class="log-card">
          <template #header><span>运行日志</span></template>
          <pre class="log-area">{{ prog.log }}</pre>
        </el-card>
      </el-tab-pane>

      <!-- ========== 初通队友对比 ========== -->
      <el-tab-pane label="初通队友对比" name="teammate">
        <el-card shadow="never" class="param-card">
          <template #header>
            <div class="card-header-left">
              <el-icon><Search /></el-icon>
              <span>查询参数</span>
            </div>
          </template>
          <el-row :gutter="12">
            <el-col :span="6">
              <label class="field-label">玩家名@服务器</label>
              <el-input v-model="tm.playerAtServer" placeholder="不用ID时必填，如 青瓜@拉诺西亚" size="small" @change="splitTmPlayer" />
            </el-col>
            <el-col :span="3">
              <label class="field-label">区域</label>
              <el-input v-model="tm.serverRegion" placeholder="CN" size="small" />
            </el-col>
            <el-col :span="3">
              <label class="field-label">Boss ID</label>
              <el-select v-model="tm.encounterId" filterable allow-create size="small" style="width:100%">
                <el-option v-for="b in BOSS_MAP" :key="b.id" :label="`${b.id} - ${b.name}`" :value="b.id" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <label class="field-label">起始时间</label>
              <el-date-picker v-model="tm.afterDate" type="datetime" placeholder="不限（留空查全部）" size="small" style="width:100%" @change="d => tm.afterMs = d ? d.getTime() : 0" />
            </el-col>
          </el-row>
          <el-row :gutter="12" style="margin-top:8px">
            <el-col :span="4">
              <label class="field-label">分页数量</label>
              <el-input-number v-model="tm.limit" :min="1" :max="100" size="small" style="width:100%" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">最多页数(0不限)</label>
              <el-input-number v-model="tm.maxPages" :min="0" size="small" style="width:100%" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">去重窗口(ms)</label>
              <el-input-number v-model="tm.dedupeMs" :min="0" size="small" style="width:100%" />
            </el-col>
            <el-col :span="4">
              <label class="field-label">并发队友数</label>
              <el-input-number v-model="tm.workers" :min="1" :max="7" size="small" style="width:100%" />
            </el-col>
          </el-row>
          <div class="action-bar">
            <el-button type="primary" @click="runTeammate" :loading="tm.running" :disabled="!canQuery">
              <el-icon><VideoPlay /></el-icon>开始查询
            </el-button>
            <el-button @click="stopTeammate" :disabled="!tm.running" type="danger" plain>
              <el-icon><VideoPause /></el-icon>停止
            </el-button>
            <el-button @click="downloadTmJson" :disabled="!tm.hasData" size="small" style="margin-left:auto">下载 JSON</el-button>
            <el-button @click="downloadTmCsv" :disabled="!tm.hasData" size="small">下载 CSV</el-button>
          </div>
          <div v-if="tm.running" class="progress-bar-wrap">
            <el-progress :percentage="tm.progressPct" :stroke-width="14" :text-inside="true" />
            <div class="progress-msg">{{ tm.progressMsg }}</div>
          </div>
        </el-card>

        <!-- 统计卡片 -->
        <el-row :gutter="12" class="metrics-row">
          <el-col :span="4">
            <el-statistic title="目标玩家" :value="tm.targetName" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="目标初通" :value="tm.firstClearTime" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="初通职业" :value="tm.firstClearJob || '-'" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="目标已过本次数" :value="tm.targetClearCount" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="队友数" :value="tm.teammates.length" />
          </el-col>
          <el-col :span="4">
            <el-statistic title="队友此前通关合计" :value="tm.previousTotal" />
          </el-col>
        </el-row>

        <!-- 目标各职业统计 -->
        <el-card v-if="tm.targetJobStats.length" shadow="never" class="table-card">
          <template #header><span>目标各职业过本统计</span></template>
          <el-table :data="tm.targetJobStats" stripe size="small" max-height="250" style="width:100%">
            <el-table-column label="职业" width="100">
              <template #default="{ row }">{{ jobCN(row.job) }}</template>
            </el-table-column>
            <el-table-column prop="count" label="过本次数" width="90" sortable />
            <el-table-column label="最高 rDPS" width="110" sortable prop="bestRdps">
              <template #default="{ row }">{{ Math.round(row.bestRdps).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="最高 aDPS" width="110" sortable prop="bestAdps">
              <template #default="{ row }">{{ Math.round(row.bestAdps).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="最高 cDPS" width="110" sortable prop="bestCdps">
              <template #default="{ row }">{{ Math.round(row.bestCdps).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 队友表格 -->
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header-row">
              <span>队友对比</span>
              <span class="table-meta">{{ tm.filteredTeammates.length }} / {{ tm.teammates.length }} 行</span>
            </div>
          </template>
          <div class="table-toolbar">
            <el-input v-model="tm.tableSearch" placeholder="搜索姓名、服务器、职业..." size="small" style="width:220px" clearable />
            <el-select v-model="tm.onlyErrors" size="small" style="width:110px">
              <el-option label="全部" value="all" />
              <el-option label="仅错误" value="errors" />
            </el-select>
            <el-button size="small" @click="resetTmFilters">重置</el-button>
          </div>
          <el-table :data="tm.filteredTeammates" stripe size="small" max-height="400" style="width:100%" @sort-change="tm.onSortChange">
            <el-table-column prop="order" label="#" width="50" sortable="custom" />
            <el-table-column prop="name" label="姓名" width="100" sortable="custom" />
            <el-table-column prop="serverName" label="服务器" width="100" sortable="custom" />
            <el-table-column label="职业" width="80">
              <template #default="{ row }">{{ jobCN(row.job) }}</template>
            </el-table-column>
            <el-table-column label="此前" width="60" sortable="custom" prop="previousClearCount" />
            <el-table-column label="同场" width="60" sortable="custom" prop="sameClearWindowCount">
              <template #default="{ row }">
                <el-tag :type="row.sameClearWindowCount > 0 ? 'success' : 'danger'" size="small" effect="dark">
                  {{ row.sameClearWindowCount ?? '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="此后" width="60" sortable="custom" prop="afterTargetFirstClearCount" />
            <el-table-column label="当前通关次数" width="80" sortable="custom" prop="currentClearCount" />
            <el-table-column label="首次通关" width="160">
              <template #default="{ row }">
                <template v-if="row.firstClear">
                  <div>{{ row.firstClear.realStartISO }}</div>
                  <div style="color:#808090;font-size:11px">{{ row.firstClear.reportCode }}#{{ row.firstClear.fightID }}</div>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="最近通关" width="160">
              <template #default="{ row }">
                <template v-if="row.latestClear">
                  <div>{{ row.latestClear.realStartISO }}</div>
                  <div style="color:#808090;font-size:11px">{{ row.latestClear.reportCode }}#{{ row.latestClear.fightID }}</div>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160" prop="error" />
          </el-table>
        </el-card>

        <!-- 运行日志 -->
        <el-card shadow="never" class="log-card">
          <template #header><span>运行日志</span></template>
          <pre class="log-area">{{ tm.log }}</pre>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useFflogsAuth } from '../composables/useFflogsAuth'

use([BarChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const auth = useFflogsAuth()
const { hasCredential, rateLimit, rateRemaining, rateError, rateResetText } = auth

// ====== Boss ID 枚举 ======
const JOB_CN = {
  Paladin:'骑士', Warrior:'战士', DarkKnight:'暗黑骑士', Gunbreaker:'绝枪战士',
  WhiteMage:'白魔法师', Scholar:'学者', Astrologian:'占星术士', Sage:'贤者',
  Monk:'武僧', Dragoon:'龙骑士', Ninja:'忍者', Samurai:'武士', Reaper:'钐镰客', Viper:'蝰蛇剑士',
  Bard:'诗人', Machinist:'机工士', Dancer:'舞者',
  BlackMage:'黑魔法师', Summoner:'召唤师', RedMage:'赤魔法师', Pictomancer:'绘灵法师'
}
function jobCN(job) { return JOB_CN[job] || job || '' }
const JOB_ROLE = {
  Paladin:'T', Warrior:'T', DarkKnight:'T', Gunbreaker:'T',
  WhiteMage:'H', Scholar:'H', Astrologian:'H', Sage:'H',
  Monk:'D', Dragoon:'D', Ninja:'D', Samurai:'D', Reaper:'D', Viper:'D',
  Bard:'D', Machinist:'D', Dancer:'D',
  BlackMage:'D', Summoner:'D', RedMage:'D', Pictomancer:'D'
}
// T/H/D 内部分职业排序
const JOB_SORT = {
  DarkKnight:0, Paladin:1, Gunbreaker:2, Warrior:3,
  Viper:4, Dragoon:5, Samurai:6, Monk:7, Ninja:8, Reaper:9,
  Machinist:10, Dancer:11, Bard:12,
  Summoner:13, Pictomancer:14, RedMage:15, BlackMage:16,
  Astrologian:17, WhiteMage:18, Sage:19, Scholar:20
}
const ROLE_COLOR = { T:'#4a90d9', H:'#67c23a', D:'#f56c6c' }
function roleColor(job) { return ROLE_COLOR[JOB_ROLE[job]] || '#666' }

const BOSS_MAP = [
  { id: 1085, name: '绝妖星' },
  { id: 1079, name: '绝伊甸' },
  { id: 1077, name: '绝欧米茄' },
  { id: 1076, name: '绝龙诗' },
  { id: 1075, name: '绝亚历山大' },
  { id: 1074, name: '绝神兵' },
  { id: 1073, name: '绝巴哈' },
]

const REPORTS_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!, $encounterID: Int!, $limit: Int!, $page: Int!) {
  characterData {
    character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) {
      id name server { name slug }
      recentReports(limit: $limit, page: $page) {
        data {
          code title startTime endTime
          masterData { actors { id name server type subType } }
          phases { encounterID separatesWipes phases { id name isIntermission } }
          fights(encounterID: $encounterID) {
            id name encounterID kill startTime endTime
            fightPercentage lastPhase lastPhaseAsAbsoluteIndex lastPhaseIsIntermission
            friendlyPlayers phaseTransitions { id startTime }
          }
        }
      }
    }
  }
}`

const HEALTH_EVENTS_QUERY = `
query($code: String!, $fightIDs: [Int], $startTime: Float!, $endTime: Float!, $limit: Int!) {
  reportData { report(code: $code) {
    events(dataType: DamageDone, fightIDs: $fightIDs, startTime: $startTime, endTime: $endTime, limit: $limit, includeResources: true, useActorIDs: true) { data nextPageTimestamp }
  }}
}`

const FIGHT_DAMAGE_QUERY = `
query($code: String!, $fightIDs: [Int], $startTime: Float!, $endTime: Float!) {
  reportData { report(code: $code) {
    events(fightIDs: $fightIDs, startTime: $startTime, endTime: $endTime, limit: 5000, dataType: DamageDone, useActorIDs: true) { data nextPageTimestamp }
  }}
}`

const MASTER_DATA_QUERY = `
query($code: String!) {
  reportData { report(code: $code) { masterData { actors { id name type subType gameID } } } }
}`

const RESOLVE_ID_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!) {
  characterData { character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) { id name }
}}`

const ENCOUNTER_RANKINGS_QUERY = `
query($characterID: Int!, $encounterID: Int!) {
  characterData { character(id: $characterID) {
    id name server { name slug }
    encounterRankings(encounterID: $encounterID)
  }}
}`

const CLEAR_REPORTS_BY_ID_QUERY = `
query($characterID: Int!, $encounterID: Int!, $limit: Int!, $page: Int!) {
  characterData { character(id: $characterID) {
    id name server { name slug }
    recentReports(limit: $limit, page: $page) {
      data {
        code title startTime endTime
        masterData { actors { id name server type subType } }
        fights(encounterID: $encounterID, killType: Kills) { id name startTime endTime fightPercentage lastPhase friendlyPlayers }
      }
    }
  }}
}`

const CLEAR_REPORTS_BY_NAME_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!, $encounterID: Int!, $limit: Int!, $page: Int!) {
  characterData { character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) {
    id name server { name slug }
    recentReports(limit: $limit, page: $page) {
      data {
        code title startTime endTime
        masterData { actors { id name server type subType } }
        fights(encounterID: $encounterID, killType: Kills) { id name startTime endTime fightPercentage lastPhase friendlyPlayers }
      }
    }
  }}
}`

const FIRST_CLEAR_DETAIL_QUERY = `
query($code: String!, $encounterID: Int!, $fightIDs: [Int]) {
  reportData { report(code: $code) {
    code title startTime endTime
    masterData { actors { id name server type subType gameID } }
    rankedCharacters { id name server { name slug region { name slug } } }
    fights(encounterID: $encounterID, fightIDs: $fightIDs, killType: Kills) { id name kill startTime endTime fightPercentage lastPhase friendlyPlayers }
  }}
}`

const RATE_LIMIT_QUERY = `query { rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }`

// ====== 共享状态 ======
const abortController = ref(null)
const canQuery = computed(() => auth.hasCredential.value || false)

// 调试：保存原始响应
const debugLogs = ref([])
const debugEnabled = ref(false)

// 包装 graphQL 以支持调试
async function graphQL(query, variables) {
  const data = await auth.graphQL(query, variables, abortController.value?.signal)
  if (debugEnabled.value) {
    debugLogs.value.push({ time: new Date().toISOString(), query: query.slice(0, 200), variables, data })
  }
  return data
}

function downloadDebug() {
  const blob = new Blob([JSON.stringify(debugLogs.value, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fflogs_debug_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  ElMessage.success(`已保存 ${debugLogs.value.length} 条请求记录`)
}
function clearDebug() { debugLogs.value = []; ElMessage.success('调试记录已清除') }

async function refreshRateLimit() {
  await auth.refreshRateLimit()
}

// ====== 通用 API ======
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function formatTime(ms) {
  return new Date(ms).toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return ''
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}分${String(s).padStart(2, '0')}秒`
}
function fmtPct(v) { return v == null || isNaN(v) ? '-' : `${Number(v).toFixed(2)}%` }

function healthSourceLabel(s) {
  const map = { skipped: '未查询', targetResources: '事件血量', kill: '通关', assumed_100_no_events: '无血量事件，按100%', not_found: '未找到' }
  return map[s] || s || ''
}
// ====== 进度统计 ======
const yesterday = new Date(Date.now() - 86400000)
yesterday.setHours(0, 0, 0, 0)
const prog = reactive({
  playerAtServer: '洛辰辰@海猫茶屋', characterName: '洛辰辰', serverSlug: '海猫茶屋', serverRegion: 'CN',
  encounterId: 1085, limit: 20, afterMs: yesterday.getTime(), afterDate: yesterday, dedupeMs: 5000, healthWindow: 60000,
  healthMode: 'best',
  running: false, hasData: false,
  progressPct: 0, progressMsg: '',
  fights: [], filteredFights: [], pagedFights: [],
  summary: null, bestPercent: '-', bestPhase: '-', bestDuration: '', bestHp: '-',
  bestFightDetail: null,
  stageChartOption: {}, passChartOption: {}, progressChartOption: {},
  stageOptions: [],
  tableSearch: '', statusFilter: 'all', stageFilter: 'all',
  sortKey: 'attemptNo', sortDir: 'asc',
  log: ''
})

function splitPlayerAtServer(input) {
  const idx = (input || '').lastIndexOf('@')
  if (idx > 0) return { characterName: input.slice(0, idx).trim(), serverSlug: input.slice(idx + 1).trim() }
  return { characterName: input.trim(), serverSlug: '' }
}
function splitProgPlayer() { const s = splitPlayerAtServer(prog.playerAtServer); prog.characterName = s.characterName; prog.serverSlug = s.serverSlug }
function splitTmPlayer() { const s = splitPlayerAtServer(tm.playerAtServer); tm.characterName = s.characterName; tm.serverSlug = s.serverSlug }

function progLog(msg) { const t = new Date().toLocaleTimeString('zh-CN', { hour12: false }); prog.log += `[${t}] ${msg}\n` }
function progClearLog() { prog.log = '' }

function buildPhaseMap(report, encounterId) {
  const groups = report.phases || []
  for (const g of groups) {
    if (g.encounterID !== encounterId) continue
    const map = new Map()
    for (const p of g.phases || []) map.set(p.id, p.name)
    return map
  }
  return new Map()
}

function phaseNameFor(id, phaseMap) {
  if (id == null) return ''
  return phaseMap.get(id) || `Phase ${id}`
}

function targetActorIdsForReport(report, character) {
  const serverNames = new Set([character.server?.name, character.server?.slug].filter(Boolean))
  const ids = new Set()
  for (const a of report.masterData?.actors || []) {
    if (a.type !== 'Player' || a.subType === 'LimitBreak') continue
    if (a.name !== character.name || !serverNames.has(a.server)) continue
    if (a.id != null) ids.add(a.id)
  }
  return ids
}

function normalizeFight(report, fight, character, encounterId, afterMs, targetIds) {
  const friendly = new Set(fight.friendlyPlayers || [])
  if (![...targetIds].some(id => friendly.has(id))) return null
  const reportStart = Number(report.startTime)
  const realStart = reportStart + Number(fight.startTime)
  if (afterMs && realStart < afterMs) return null
  const phaseMap = buildPhaseMap(report, encounterId)
  return {
    reportCode: report.code, fightID: fight.id, fightName: fight.name,
    encounterID: fight.encounterID, kill: fight.kill,
    fightPercentage: fight.fightPercentage,
    lastPhase: fight.lastPhase,
    lastPhaseName: phaseNameFor(fight.lastPhase, phaseMap),
    realStartTime: realStart,
    realStartISO: formatTime(realStart),
    relativeStartMs: Number(fight.startTime),
    relativeEndMs: Number(fight.endTime),
    durationMs: Number(fight.endTime) - Number(fight.startTime),
    reportStartTime: reportStart,
    reportEndTime: Number(report.endTime),
    reportHasPhaseDefinitions: phaseMap.size > 0,
    reportTitle: report.title,
    phaseTransitions: (fight.phaseTransitions || []).map(t => ({
      id: t.id, name: phaseNameFor(t.id, phaseMap), reportStartMs: Number(t.startTime)
    })),
    duplicateCount: 1,
    finalPhaseHPPercent: null, finalPhaseHPDetail: '', healthSource: 'skipped',
    isBestFightPercentage: false,
    spec: [...targetIds].map(id => (report.masterData?.actors || []).find(a => a.id === id)?.subType).filter(Boolean)[0] || '',
    friendlyPlayers: fight.friendlyPlayers || [],
    targetActorIDs: [...targetIds]
  }
}

function dedupeByRealStart(fights, windowMs) {
  if (!fights.length) return []
  const sorted = [...fights].sort((a, b) => a.realStartTime - b.realStartTime)
  const groups = []
  let cur = [sorted[0]], gs = sorted[0].realStartTime
  for (const f of sorted.slice(1)) {
    if (f.realStartTime - gs <= windowMs) { cur.push(f) }
    else { groups.push(cur); cur = [f]; gs = f.realStartTime }
  }
  groups.push(cur)
  return groups.map(g => {
    const winner = g.slice().sort((a, b) => {
      const sa = [a.reportHasPhaseDefinitions ? 1 : 0, a.reportTitle === 'Dancing Mad' ? 1 : 0, a.durationMs, -a.realStartTime]
      const sb = [b.reportHasPhaseDefinitions ? 1 : 0, b.reportTitle === 'Dancing Mad' ? 1 : 0, b.durationMs, -b.realStartTime]
      for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i]
      return 0
    })[0]
    return { ...winner, duplicateCount: g.length }
  }).sort((a, b) => a.realStartTime - b.realStartTime)
}

function lastPhaseStartMs(fight) {
  const t = fight.phaseTransitions.find(t => t.id === fight.lastPhase)
  return t ? t.reportStartMs : fight.relativeStartMs
}

async function fetchHealthForFight(fight) {
  if (fight.kill) { fight.finalPhaseHPPercent = 0; fight.finalPhaseHPDetail = '通关'; fight.healthSource = 'kill'; return }
  const hw = prog.healthWindow
  const eventLimit = 1000
  const maxPages = 3
  // phaseStart 和 relativeEndMs 都是报告内相对时间戳（相对于 report start）
  const phaseStart = lastPhaseStartMs(fight)
  const fightEnd = fight.relativeEndMs  // Number(fight.endTime)，报告内相对时间
  let nextStart = Math.max(phaseStart, fightEnd - hw)
  const actorsData = await graphQL(MASTER_DATA_QUERY, { code: fight.reportCode })
  const actors = new Map()
  for (const a of actorsData.reportData.report.masterData.actors || []) actors.set(a.id, a)
  const lastByTarget = new Map()
  for (let page = 0; page < maxPages && nextStart < fightEnd; page++) {
    const events = await graphQL(HEALTH_EVENTS_QUERY, { code: fight.reportCode, fightIDs: [fight.fightID], startTime: nextStart, endTime: fightEnd, limit: eventLimit })
    for (const ev of events.reportData.report.events.data || []) {
      const resources = ev.targetResources
      if (!resources || ev.targetID == null) continue
      const actor = actors.get(ev.targetID) || {}
      if (actor.type !== 'NPC' || actor.subType !== 'Boss') continue
      const hp = resources.hitPoints, maxHp = resources.maxHitPoints
      if (hp == null || !maxHp) continue
      lastByTarget.set(ev.targetID, { hitPoints: hp, maxHitPoints: maxHp, percent: hp / maxHp * 100, name: actor.name })
    }
    if (!events.reportData.report.events.nextPageTimestamp) break
    nextStart = events.reportData.report.events.nextPageTimestamp
  }
  const targets = [...lastByTarget.values()]
  if (targets.length) {
    const hp = targets.reduce((s, t) => s + t.hitPoints, 0)
    const maxHp = targets.reduce((s, t) => s + t.maxHitPoints, 0)
    fight.finalPhaseHPPercent = maxHp ? hp / maxHp * 100 : null
    fight.finalPhaseHPDetail = targets.map(t => `${t.name} ${t.percent.toFixed(2)}%`).join('；')
    fight.healthSource = 'targetResources'
  } else {
    fight.finalPhaseHPPercent = 100
    fight.finalPhaseHPDetail = '最终阶段窗口内没有Boss血量事件，按100%'
    fight.healthSource = 'assumed_100_no_events'
  }
}

function updateProgCharts() {
  const fights = prog.fights
  if (!fights.length) return
  const stuckCounts = new Map()
  for (const f of fights) stuckCounts.set(f.stuckStage || '?', (stuckCounts.get(f.stuckStage) || 0) + 1)
  const stageLabels = [...stuckCounts.keys()]
  const stageValues = [...stuckCounts.values()]
  const p1 = fights.filter(f => f.kill || f.lastPhase > 1).length
  const p2 = fights.filter(f => f.kill || f.lastPhase > 2).length
  const p3 = fights.filter(f => f.kill || f.lastPhase > 3).length
  const p4 = fights.filter(f => f.kill || f.lastPhase > 4).length

  prog.stageChartOption = {
    backgroundColor: 'transparent',
    xAxis: { type: 'category', data: stageLabels, axisLabel: { color: '#a0a0b8', rotate: 20 } },
    yAxis: { type: 'value', axisLabel: { color: '#a0a0b8' } },
    series: [{ type: 'bar', data: stageValues, itemStyle: { color: '#ffd700' }, label: { show: true, position: 'top', color: '#a0a0b8' } }],
    grid: { top: 20, right: 20, bottom: 60, left: 50 }
  }
  prog.passChartOption = {
    backgroundColor: 'transparent',
    xAxis: { type: 'category', data: ['P1通过', 'P2通过', 'P3通过', 'P4通过', '通关'], axisLabel: { color: '#a0a0b8' } },
    yAxis: { type: 'value', axisLabel: { color: '#a0a0b8' } },
    series: [{ type: 'bar', data: [p1, p2, p3, p4, prog.summary?.killCount || 0], itemStyle: { color: '#67c23a' }, label: { show: true, position: 'top', color: '#a0a0b8' } }],
    grid: { top: 20, right: 20, bottom: 20, left: 50 }
  }
  const pts = fights.filter(f => f.fightPercentage != null).map((f, i) => [i, Math.max(0, Math.min(100, f.fightPercentage))])
  const best = fights.find(f => f.isBestFightPercentage)
  prog.progressChartOption = {
    backgroundColor: 'transparent',
    xAxis: { type: 'value', name: '尝试顺序', nameTextStyle: { color: '#a0a0b8' } },
    yAxis: { type: 'value', name: '进度%', nameTextStyle: { color: '#a0a0b8' }, max: 100, axisLabel: { color: '#a0a0b8' } },
    series: [{
      type: 'scatter', data: pts.filter(p => best && fights[p[0]] !== best).map(p => p),
      itemStyle: { color: '#409eff' }, symbolSize: 6
    }, {
      type: 'scatter', data: best ? [[fights.indexOf(best), best.fightPercentage]] : [],
      itemStyle: { color: '#f56c6c' }, symbolSize: 12
    }],
    grid: { top: 20, right: 20, bottom: 40, left: 60 }
  }
  prog.stageOptions = stageLabels
}

function applyProgFilters() {
  let result = prog.fights
  const s = prog.tableSearch.toLowerCase()
  const status = prog.statusFilter
  const stage = prog.stageFilter
  if (status === 'kill') result = result.filter(f => f.kill)
  if (status === 'wipe') result = result.filter(f => !f.kill)
  if (status === 'best') result = result.filter(f => f.isBestFightPercentage)
  if (stage !== 'all') result = result.filter(f => (f.stuckStage || '') === stage)
  if (s) result = result.filter(f => [f.reportCode, f.fightID, f.lastPhaseName, f.fightName, f.realStartISO, f.finalPhaseHPDetail].join(' ').toLowerCase().includes(s))
  const key = prog.sortKey, dir = prog.sortDir === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    const va = a[key] ?? '', vb = b[key] ?? ''
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
  prog.filteredFights = result
  prog.pagedFights = result // For now, show all; pagination can be added later
}

prog.onSortChange = ({ prop, order }) => {
  if (!prop) return
  prog.sortKey = prop
  prog.sortDir = order === 'ascending' ? 'asc' : 'desc'
  applyProgFilters()
}

watch(() => [prog.tableSearch, prog.statusFilter, prog.stageFilter], applyProgFilters)

function resetProgFilters() {
  prog.tableSearch = ''; prog.statusFilter = 'all'; prog.stageFilter = 'all'
  prog.sortKey = 'attemptNo'; prog.sortDir = 'asc'
  applyProgFilters()
}

async function runProgress() {
  progClearLog()
  abortController.value = new AbortController()
  prog.running = true; prog.hasData = false; prog.progressPct = 0; prog.progressMsg = '获取令牌...'
  try {
    await auth.getToken()
    prog.progressPct = 5; prog.progressMsg = '令牌已就绪，查询额度...'
    progLog('令牌已就绪')
    await refreshRateLimit()
    progLog(`API额度：${rateRemaining.value}/${rateLimit.value?.limitPerHour}`)
    const variablesBase = { characterName: prog.characterName, serverSlug: prog.serverSlug, serverRegion: prog.serverRegion, encounterID: Number(prog.encounterId), limit: prog.limit }
    let page = 1, emptyPages = 0
    const rawFights = []
    prog.progressPct = 10; prog.progressMsg = '正在分页查询报告...'
    while (true) {
      const data = await graphQL(REPORTS_QUERY, { ...variablesBase, page })
      const character = data.characterData.character
      if (!character) throw new Error('没有找到角色')
      const reports = character.recentReports.data || []
      if (!reports.length) { progLog(`page ${page}: 没有数据，停止`); break }
      for (const report of reports) {
        const targetIds = targetActorIdsForReport(report, character)
        for (const fight of report.fights || []) {
          const nf = normalizeFight(report, fight, character, prog.encounterId, prog.afterMs, targetIds)
          if (nf) rawFights.push(nf)
        }
      }
      const hasFights = rawFights.length > (page === 1 ? 0 : rawFights.length - reports.reduce((s, r) => s + (r.fights?.length || 0), 0))
      emptyPages = hasFights ? 0 : emptyPages + 1
      prog.progressPct = Math.min(70, 10 + page * 5)
      prog.progressMsg = `page ${page}: 报告 ${reports.length}，累计战斗 ${rawFights.length}`
      progLog(`page ${page}: 报告 ${reports.length}，累计战斗 ${rawFights.length}`)
      if (reports.length < prog.limit) break
      if (emptyPages >= 1) break
      page++
      await sleep(0)
    }
    prog.progressPct = 75; prog.progressMsg = `去重处理中... 原始 ${rawFights.length} 场`
    progLog(`原始战斗数：${rawFights.length}`)
    const fights = dedupeByRealStart(rawFights, prog.dedupeMs)
    prog.progressPct = 80; prog.progressMsg = `去重后 ${fights.length} 场，计算进度...`
    progLog(`去重后战斗数：${fights.length}`)
    // Annotate progress
    fights.forEach((f, i) => {
      f.attemptNo = i + 1
      f.stuckStage = f.kill ? 'Clear' : f.lastPhaseName
    })
    const best = fights.reduce((cur, f) => {
      if (!cur) return f
      const a = f.fightPercentage ?? 9999, b = cur.fightPercentage ?? 9999
      return a < b ? f : cur
    }, null)
    if (best) best.isBestFightPercentage = true
    // Health query
    if (prog.healthMode !== 'none' && best) {
      prog.progressPct = 85; prog.progressMsg = '查询最远进度血量...'
      progLog(`查询最远进度血量：${best.reportCode}#${best.fightID}`)
      await fetchHealthForFight(best)
    }
    prog.progressPct = 92; prog.progressMsg = '生成图表与表格...'
    const summary = {
      battleCount: fights.length,
      killCount: fights.filter(f => f.kill).length,
      p1PassCount: fights.filter(f => f.kill || f.lastPhase > 1).length,
      p2PassCount: fights.filter(f => f.kill || f.lastPhase > 2).length
    }
    prog.fights = fights
    prog.summary = summary
    prog.bestPercent = best ? fmtPct(best.fightPercentage) : '-'
    prog.bestPhase = best ? (best.stuckStage || best.lastPhaseName || '-') : '-'
    prog.bestDuration = best ? formatDuration(best.durationMs) : ''
    prog.bestHp = best ? fmtPct(best.finalPhaseHPPercent) : '-'
    // 查询最远进度场的队友
    if (best) {
      try {
        const detailData = await graphQL(MASTER_DATA_QUERY, { code: best.reportCode })
        const actors = detailData?.reportData?.report?.masterData?.actors || []
        const actorMap = {}
        for (const a of actors) actorMap[a.id] = a
        // 查询伤害事件计算 per-player DPS
        const damData = await graphQL(FIGHT_DAMAGE_QUERY, { code: best.reportCode, fightIDs: [best.fightID], startTime: 0, endTime: best.durationMs || 600000 })
        const events = damData?.reportData?.report?.events?.data || []
        const playerDamage = {}  // actorId -> totalDamage
        for (const ev of events) {
          if (ev.sourceID && ev.amount) {
            playerDamage[ev.sourceID] = (playerDamage[ev.sourceID] || 0) + ev.amount
          }
        }
        const durationSec = (best.durationMs || 1) / 1000
        const mates = (best.friendlyPlayers || []).map(id => {
          const a = actorMap[id]
          if (!a || a.type !== 'Player' || a.subType === 'LimitBreak') return null
          const dmg = playerDamage[id] || 0
          return { name: a.name, job: a.subType, rDPS: Math.round(dmg / durationSec) }
        }).filter(Boolean)
        // 按职业排序（T→近战→远敏→法系→H）
        mates.sort((a, b) => {
          const ra = JOB_SORT[a.job] ?? 99
          const rb = JOB_SORT[b.job] ?? 99
          return ra - rb
        })
        prog.bestFightDetail = { reportCode: best.reportCode, fightID: best.fightID, teammates: mates }
      } catch (e) { progLog(`查询队友详情失败：${e.message}`); prog.bestFightDetail = null }
    } else {
      prog.bestFightDetail = null
    }
    prog.hasData = true
    updateProgCharts()
    prog.progressPct = 98; prog.progressMsg = '完成'
    applyProgFilters()
    progLog('完成')
  } catch (e) {
    prog.progressPct = 0
    if (e.name === 'AbortError') { prog.progressMsg = '已停止'; progLog('已停止') }
    else { prog.progressMsg = '查询失败'; progLog(`错误：${e.message}`) }
  } finally {
    if (prog.progressPct > 0 && prog.progressPct < 100) prog.progressPct = 100
    setTimeout(() => { if (!prog.running) { prog.progressPct = 0; prog.progressMsg = '' } }, 1500)
    prog.running = false; abortController.value = null
  }
}

function stopProgress() { if (abortController.value) abortController.value.abort() }

function downloadProgJson() {
  const data = JSON.stringify({ characterName: prog.characterName, summary: prog.summary, fights: prog.filteredFights }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_进度数据.json'; a.click()
}

function downloadProgCsv() {
  const headers = ['序号', '开始时间', '报告ID', '战斗ID', '职业', '通关', '进度%', '卡点阶段', '最远进度', '剩余血量%', '血量明细']
  const lines = [headers.join(',')]
  for (const f of prog.filteredFights) {
    lines.push([f.attemptNo, f.realStartISO, f.reportCode, f.fightID, jobCN(f.spec), f.kill ? '是' : '否', fmtPct(f.fightPercentage), f.stuckStage || '', f.isBestFightPercentage ? '是' : '', fmtPct(f.finalPhaseHPPercent), (f.finalPhaseHPDetail || '').replace(/,/g, '，')].join(','))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_战斗明细.csv'; a.click()
}

// ====== 初通队友对比 ======
const tm = reactive({
  playerAtServer: '洛辰辰@海猫茶屋', characterName: '洛辰辰', serverSlug: '海猫茶屋', serverRegion: 'CN',
  characterId: null, // 首次自动解析
  encounterId: 1085, afterMs: 0, afterDate: null, limit: 40, maxPages: 50, dedupeMs: 5000, workers: 2,
  running: false, hasData: false,
  progressPct: 0, progressMsg: '',
  targetName: '-', firstClearTime: '-', firstClearJob: '', targetClearCount: '-',
  targetJobStats: [], // [{job, count, bestRdps}]
  teammates: [], filteredTeammates: [],
  previousTotal: 0,
  tableSearch: '', onlyErrors: 'all',
  sortKey: 'order', sortDir: 'asc',
  log: ''
})

function tmLog(msg) { const t = new Date().toLocaleTimeString('zh-CN', { hour12: false }); tm.log += `[${t}] ${msg}\n` }
function tmClearLog() { tm.log = '' }

function tmSubject() {
  if (tm.characterId) return { id: tm.characterId }
  if (!tm.characterName || !tm.serverSlug) throw new Error('需要填写玩家名和服务器')
  return { name: tm.characterName, serverSlug: tm.serverSlug, serverRegion: tm.serverRegion }
}

function tmLabel(subject) {
  if (subject.id) return `id=${subject.id}`
  return `${subject.name}@${subject.serverSlug}`
}

function tmCharServerNames(character) {
  return new Set([character.server?.name, character.server?.slug].filter(Boolean))
}

function tmTargetIds(report, character) {
  const sn = tmCharServerNames(character)
  const ids = new Set()
  for (const a of report.masterData?.actors || []) {
    if (a.type !== 'Player' || a.subType === 'LimitBreak') continue
    if (a.name !== character.name || !sn.has(a.server)) continue
    if (a.id != null) ids.add(a.id)
  }
  return ids
}

function tmNormalizeClear(report, fight, character, afterMs, targetIds) {
  const friendly = new Set(fight.friendlyPlayers || [])
  if (![...targetIds].some(id => friendly.has(id))) return null
  const rs = Number(report.startTime), realStart = rs + Number(fight.startTime)
  if (afterMs && realStart < afterMs) return null
  return {
    reportCode: report.code, reportTitle: report.title,
    fightID: fight.id, realStartTime: realStart, realStartISO: formatTime(realStart),
    durationMs: Number(fight.endTime) - Number(fight.startTime),
    friendlyPlayers: fight.friendlyPlayers || [], targetActorIDs: [...targetIds]
  }
}

function tmDedupe(fights, w) {
  if (!fights.length) return []
  const sorted = [...fights].sort((a, b) => a.realStartTime - b.realStartTime)
  const groups = []; let cur = [sorted[0]], gs = sorted[0].realStartTime
  for (const f of sorted.slice(1)) {
    if (f.realStartTime - gs <= w) cur.push(f); else { groups.push(cur); cur = [f]; gs = f.realStartTime }
  }
  groups.push(cur)
  return groups.map(g => {
    const winner = g.slice().sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0]
    return { ...winner, duplicateCount: g.length }
  }).sort((a, b) => a.realStartTime - b.realStartTime)
}

async function tmCollectClears(subject) {
  let limit = tm.limit
  while (true) {
    try {
      return await tmCollectClearsWithLimit(subject, limit)
    } catch (e) {
      if (!e.isComplexity || limit <= 1) throw e
      limit = Math.max(1, Math.floor(limit / 2))
      tmLog(`${tmLabel(subject)} 复杂度超限，调整为 ${limit}`)
    }
  }
}

async function tmCollectClearsWithLimit(subject, limit) {
  let character = null; const raw = []; let page = 1
  while (true) {
    const useId = !!subject.id
    // 有 ID 时用 encounterRankings（一次返回全部过本，不分页不翻空报告）
    if (useId) {
      const data = await graphQL(ENCOUNTER_RANKINGS_QUERY, { characterID: subject.id, encounterID: Number(tm.encounterId) })
      character = data.characterData.character
      if (!character) throw new Error(`没有找到角色：${tmLabel(subject)}`)
      if (character.id && !tm.characterId) tm.characterId = character.id
      // encounterRankings.ranks[]: { report: { code, fightID }, startTime, duration }
      let rankings = character.encounterRankings
      if (!rankings) rankings = { ranks: [] }
      if (!Array.isArray(rankings.ranks)) rankings.ranks = []
      // 转换
      const raw = rankings.ranks.map(r => ({
        reportCode: r.report?.code || '',
        reportTitle: '',
        fightID: r.report?.fightID || 0,
        realStartTime: r.startTime || 0,
        realStartISO: r.startTime ? formatTime(r.startTime) : '',
        durationMs: r.duration || 0,
        spec: r.spec || '',
        rDPS: r.rDPS || 0, aDPS: r.aDPS || 0, cDPS: r.cDPS || 0,
        friendlyPlayers: [],
        targetActorIDs: [],
        duplicateCount: 1
      })).filter(f => f.reportCode && f.fightID)
      return { character, raw }
    }
    // 名字查询：翻页 recentReports
    const query = CLEAR_REPORTS_BY_NAME_QUERY
    const vars = { characterName: subject.name, serverSlug: subject.serverSlug, serverRegion: subject.serverRegion || tm.serverRegion, encounterID: Number(tm.encounterId), limit, page }
    const data = await graphQL(query, vars)
    character = data.characterData.character
    if (!character) throw new Error(`没有找到角色：${tmLabel(subject)}`)
    if (character.id && !tm.characterId) tm.characterId = character.id
    const reports = character.recentReports?.data || []
    if (!reports.length) { tmLog(`${tmLabel(subject)} page ${page}: 无数据`); break }
    const pageClears = []
    let pageEnd = 0
    for (const report of reports) {
      pageEnd = Math.max(pageEnd, Number(report.endTime))
      const tids = tmTargetIds(report, character)
      for (const f of report.fights || []) {
        const n = tmNormalizeClear(report, f, character, tm.afterMs, tids)
        if (n) pageClears.push(n)
      }
    }
    raw.push(...pageClears)
    tmLog(`${tmLabel(subject)} page ${page}: 报告 ${reports.length}，通关 ${pageClears.length}`)
    if (reports.length < limit) break
    if (tm.afterMs && pageEnd < tm.afterMs) break
    if (tm.maxPages && page >= tm.maxPages) break
    page++; await sleep(0)
  }
  return { character, raw }
}

function rankedKey(name, serverName) { return `${name || ''}\x00${serverName || ''}` }

function buildRankedMap(report) {
  const m = new Map()
  for (const c of report.rankedCharacters || []) {
    const s = c.server || {}
    m.set(rankedKey(c.name, s.name), c)
    m.set(rankedKey(c.name, s.slug), c)
  }
  return m
}

function isRealPlayer(actor) {
  if (!actor || actor.type !== 'Player' || actor.subType === 'LimitBreak') return false
  return Boolean(actor.server)
}

function tmIdentity(p) {
  return p.characterID ? `id:${p.characterID}` : `name:${p.name}@${p.serverName}`
}

function sameCharacter(p, tc) {
  if (p.characterID && p.characterID === tc.id) return true
  const ts = tc.server || {}
  return p.name === tc.name && [ts.name, ts.slug].includes(p.serverName)
}

function extractPlayersFromFirstClear(report, fightId, targetChar) {
  const actors = new Map()
  for (const a of report.masterData?.actors || []) { if (a.id != null) actors.set(a.id, a) }
  const rankedMap = buildRankedMap(report)
  const fight = (report.fights || []).find(f => f.id === fightId)
  if (!fight) throw new Error(`报告内没有 fight=${fightId}`)
  const players = []; const seen = new Set()
  for (const aid of fight.friendlyPlayers || []) {
    const actor = actors.get(aid)
    if (!isRealPlayer(actor)) continue
    const ranked = rankedMap.get(rankedKey(actor.name, actor.server))
    const rs = (ranked || {}).server || {}
    const p = { actorID: aid, characterID: (ranked || {}).id || null, name: actor.name, job: actor.subType, serverName: rs.name || actor.server, serverSlug: rs.slug || actor.server }
    const key = tmIdentity(p)
    if (seen.has(key)) continue; seen.add(key); players.push(p)
  }
  const teammates = players.filter(p => !sameCharacter(p, targetChar)).map((p, i) => ({ ...p, order: i + 1 }))
  return { fight, players, teammates }
}

async function tmCountClears(teammate, targetFirstClearTime) {
  const subject = teammate.characterID ? { id: teammate.characterID }
    : { name: teammate.name, serverSlug: teammate.serverSlug, serverRegion: tm.serverRegion }
  const { character, raw } = await tmCollectClears(subject)
  const deduped = tmDedupe(raw, tm.dedupeMs)
  const ss = targetFirstClearTime - tm.dedupeMs, se = targetFirstClearTime + tm.dedupeMs
  const previous = deduped.filter(f => f.realStartTime < ss)
  const same = deduped.filter(f => f.realStartTime >= ss && f.realStartTime <= se)
  const after = deduped.filter(f => f.realStartTime > se)
  return {
    ...teammate, resolvedCharacter: character,
    rawClearCount: raw.length, clearCount: deduped.length,
    previousClearCount: previous.length, sameClearWindowCount: same.length,
    afterTargetFirstClearCount: after.length, currentClearCount: deduped.length,
    firstClear: deduped[0] || null, latestClear: deduped[deduped.length - 1] || null
  }
}

function applyTmFilters() {
  let result = tm.teammates
  const s = tm.tableSearch.toLowerCase()
  if (tm.onlyErrors === 'errors') result = result.filter(t => t.error)
  if (s) result = result.filter(t => [t.name, t.serverName, t.job, t.error].join(' ').toLowerCase().includes(s))
  const key = tm.sortKey, dir = tm.sortDir === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    const va = a[key] ?? '', vb = b[key] ?? ''
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
  tm.filteredTeammates = result
}

tm.onSortChange = ({ prop, order }) => {
  if (!prop) return
  tm.sortKey = prop
  tm.sortDir = order === 'ascending' ? 'asc' : 'desc'
  applyTmFilters()
}

watch(() => [tm.tableSearch, tm.onlyErrors], applyTmFilters)

function resetTmFilters() {
  tm.tableSearch = ''; tm.onlyErrors = 'all'; tm.sortKey = 'order'; tm.sortDir = 'asc'
  applyTmFilters()
}

async function runTeammate() {
  tmClearLog()
  abortController.value = new AbortController()
  tm.running = true; tm.hasData = false; tm.progressPct = 0; tm.progressMsg = '获取令牌...'
  try {
    await auth.getToken()
    tm.progressPct = 2; tm.progressMsg = '解析角色 ID...'
    tmLog('令牌已就绪')
    await refreshRateLimit()
    // 没 ID 时先发轻量请求解析
    if (!tm.characterId && tm.characterName && tm.serverSlug) {
      try {
        const idData = await graphQL(RESOLVE_ID_QUERY, { characterName: tm.characterName, serverSlug: tm.serverSlug, serverRegion: tm.serverRegion })
        const resolved = idData?.characterData?.character
        if (resolved?.id) { tm.characterId = resolved.id; tmLog(`角色 ID: ${resolved.id}`) }
      } catch { /* 解析失败继续用名字查 */ }
    }
    tm.progressPct = 5; tm.progressMsg = '查询过本记录...'
    const subject = tmSubject()
    tm.progressPct = 10; tm.progressMsg = '查询目标初通记录...'
    tmLog(`查询目标初通：${tmLabel(subject)}`)
    const targetResult = await tmCollectClears(subject)
    const targetClears = tmDedupe(targetResult.raw, tm.dedupeMs)
    if (!targetClears.length) throw new Error(`没有找到 ${tmLabel(subject)} 的通关记录`)
    const firstClear = targetClears[0]
    tm.progressPct = 25; tm.progressMsg = '查询初通队友详情...'
    tm.targetName = targetResult.character.name
    tm.firstClearTime = firstClear.realStartISO
    tm.targetClearCount = targetClears.length
    tm.firstClearJob = jobCN(firstClear.spec)
    // 统计目标各职业次数和最高 rDPS
    const jobMap = {}
    for (const c of targetResult.raw) {
      if (!c.spec) continue
      if (!jobMap[c.spec]) jobMap[c.spec] = { job: c.spec, count: 0, bestRdps: 0, bestAdps: 0, bestCdps: 0 }
      jobMap[c.spec].count++
      if (c.rDPS > jobMap[c.spec].bestRdps) jobMap[c.spec].bestRdps = c.rDPS
      if (c.aDPS > jobMap[c.spec].bestAdps) jobMap[c.spec].bestAdps = c.aDPS
      if (c.cDPS > jobMap[c.spec].bestCdps) jobMap[c.spec].bestCdps = c.cDPS
    }
    tm.targetJobStats = Object.values(jobMap).sort((a, b) => b.count - a.count)
    tmLog(`目标初通：${tm.targetName} ${firstClear.realStartISO} ${firstClear.reportCode}#${firstClear.fightID}`)
    tmLog('查询初通队友')
    const reportData = await graphQL(FIRST_CLEAR_DETAIL_QUERY, { code: firstClear.reportCode, encounterID: Number(tm.encounterId), fightIDs: [firstClear.fightID] })
    const report = reportData.reportData.report
    if (!report) throw new Error(`没有找到报告 ${firstClear.reportCode}`)
    const { teammates } = extractPlayersFromFirstClear(report, firstClear.fightID, targetResult.character)
    tm.progressPct = 30; tm.progressMsg = `初通队友 ${teammates.length} 人，解析队友 ID...`
    tmLog(`初通队友数：${teammates.length}`)
    // 对缺少 characterID 的队友，批量解析 ID，避免翻页路径
    const missingId = teammates.filter(t => !t.characterID)
    if (missingId.length) {
      tmLog(`解析 ${missingId.length} 个队友的角色 ID...`)
      for (const t of missingId) {
        try {
          const idData = await graphQL(RESOLVE_ID_QUERY, { characterName: t.name, serverSlug: t.serverSlug, serverRegion: tm.serverRegion })
          const resolved = idData?.characterData?.character
          if (resolved?.id) { t.characterID = resolved.id; tmLog(`  ${t.name}@${t.serverSlug} → id=${resolved.id}`) }
          else { tmLog(`  ${t.name}@${t.serverSlug} 未解析到 ID，回退名字查询`) }
        } catch (e) { tmLog(`  ${t.name}@${t.serverSlug} 解析 ID 失败：${e.message}`) }
      }
    }
    tmLog('统计队友通关次数')
    tm.progressPct = 35; tm.progressMsg = `队友 ID 解析完成，统计各队友通关次数...`
    const results = []
    for (let i = 0; i < teammates.length; i++) {
      const tm8 = teammates[i]
      try {
        const r = await tmCountClears(tm8, firstClear.realStartTime)
        results.push(r)
        tm.progressPct = 30 + Math.floor(65 * (i + 1) / teammates.length)
        tm.progressMsg = `队友 ${i + 1}/${teammates.length}: ${tm8.name}@${tm8.serverName}`
        tmLog(`队友 ${i + 1}/${teammates.length}: ${tm8.name}@${tm8.serverName} 此前${r.previousClearCount} 当前${r.currentClearCount}`)
      } catch (e) {
        results.push({ ...tm8, error: e.message, rawClearCount: 0, clearCount: null, previousClearCount: null, sameClearWindowCount: null, afterTargetFirstClearCount: null, currentClearCount: null, firstClear: null, latestClear: null })
        tmLog(`队友 ${i + 1}/${teammates.length}: ${tm8.name}@${tm8.serverName} 查询失败：${e.message}`)
      }
    }
    tm.progressPct = 95; tm.progressMsg = '整理结果...'
    tm.teammates = results
    tm.previousTotal = results.reduce((s, t) => s + (t.previousClearCount || 0), 0)
    tm.hasData = true
    applyTmFilters()
    tm.progressPct = 100; tm.progressMsg = '完成'
    tmLog('完成')
  } catch (e) {
    tm.progressPct = 0
    if (e.name === 'AbortError') { tm.progressMsg = '已停止'; tmLog('已停止') }
    else { tm.progressMsg = '查询失败'; tmLog(`错误：${e.message}`) }
  } finally {
    if (tm.progressPct > 0 && tm.progressPct < 100) tm.progressPct = 100
    setTimeout(() => { if (!tm.running) { tm.progressPct = 0; tm.progressMsg = '' } }, 1500)
    tm.running = false; abortController.value = null
  }
}

function stopTeammate() { if (abortController.value) abortController.value.abort() }

function downloadTmJson() {
  const data = JSON.stringify({ targetName: tm.targetName, firstClearTime: tm.firstClearTime, teammates: tm.filteredTeammates }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_初通队友对比.json'; a.click()
}

function downloadTmCsv() {
  const headers = ['姓名', '服务器', '职业', '此前', '同场', '此后', '当前', '首次通关', '最近通关', '错误']
  const lines = [headers.join(',')]
  for (const t of tm.filteredTeammates) {
    const fc = t.firstClear || {}, lc = t.latestClear || {}
    lines.push([t.name, t.serverName, jobCN(t.job), t.previousClearCount, t.sameClearWindowCount, t.afterTargetFirstClearCount, t.currentClearCount, fc.realStartISO || '', lc.realStartISO || '', t.error || ''].join(','))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_初通队友对比.csv'; a.click()
}

// ====== Tab state ======
const activeTool = ref('progress')
</script>

<style scoped>
.fflogs-query {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.credential-card {
  margin-bottom: 12px;
  border: 1px solid #ffd70044 !important;
}

.param-card, .table-card, .log-card {
  margin-bottom: 12px;
  border: 1px solid #2a2a4a !important;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-right {
  display: flex;
  gap: 8px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #808090;
  margin-bottom: 4px;
}

.credential-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #606080;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.progress-bar-wrap {
  margin-top: 10px;
}

.progress-msg {
  margin-top: 6px;
  font-size: 13px;
  color: #a0a0b8;
  text-align: center;
}

.rate-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #252540;
  color: #67c23a;
  font-weight: 600;
}

.rate-badge.warning {
  background: #3a3020;
  color: #e6a23c;
}

.rate-badge.danger {
  background: #3a1525;
  color: #f56c6c;
}

.metrics-row {
  margin-bottom: 12px;
}

.metrics-row .el-col {
  margin-bottom: 8px;
}

.charts-row {
  margin-bottom: 12px;
}

.table-meta {
  color: #808090;
  font-size: 13px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.log-area {
  max-height: 180px;
  overflow: auto;
  padding: 10px 12px;
  margin: 0;
  background: #101418;
  color: #d9e2ec;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

:deep(.tool-tabs .el-tabs__item) {
  color: #a0a0b8;
}

:deep(.tool-tabs .el-tabs__item.is-active) {
  color: #ffd700;
}

:deep(.el-statistic__head) { color: #808090 !important; }
:deep(.el-statistic__number) { color: #e0e0e0 !important; font-size: 20px !important; }

.metric-card {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  padding: 13px;
  min-height: 78px;
}

.metric-label {
  color: #808090;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #ffd700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-sub {
  color: #808090;
  font-size: 12px;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .fflogs-query { max-width: 100%; padding: 0 4px; }
  .table-toolbar { flex-direction: column; align-items: stretch; }
}
</style>
