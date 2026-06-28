<template>
  <div class="analyze-page">
    <div class="page-header"><el-icon><DataAnalysis /></el-icon><span>FFLogs 导入</span><router-link to="/help#fflogs" class="help-link">📖</router-link></div>

    <el-card class="config-card" shadow="never">
      <template #header><div class="config-header"><span class="section-title">🔑 API 配置</span><a href="https://www.fflogs.com/api/clients/" target="_blank" style="color:#ffd700;font-size:12px;text-decoration:none;margin-left:auto">去 FFLogs 创建 →</a><router-link to="/help#fflogs" style="color:#67c23a;font-size:12px;text-decoration:none;margin-left:12px">📖 使用帮助</router-link></div></template>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="8"><el-input v-model="fflogsId" placeholder="Client ID" show-password size="small"><template #prepend>ID</template></el-input></el-col>
        <el-col :xs="24" :sm="8"><el-input v-model="fflogsSecret" placeholder="Client Secret" show-password size="small"><template #prepend>密钥</template></el-input></el-col>
        <el-col :xs="24" :sm="8"><el-input v-model="manualToken" placeholder="或直接粘贴 Bearer Token" size="small"><template #prepend>Token</template></el-input></el-col>
      </el-row>
    </el-card>

    <el-card class="input-card" shadow="never">
      <template #header><span class="section-title">📎 粘贴 FFLogs 报告链接</span></template>
      <div class="url-row"><el-input v-model="fflogsUrl" placeholder="https://cn.fflogs.com/reports/abc123" size="large" clearable /><el-button type="primary" size="large" @click="fetchFights" :loading="loading"><el-icon><Search /></el-icon> 获取战斗列表</el-button></div>
    </el-card>

    <el-card v-if="loading" class="loading-card" shadow="never">
      <div style="text-align:center;padding:20px">
        <el-progress :percentage="loadingPct" :stroke-width="16" :text-inside="true"/>
        <div style="color:#808090;margin-top:12px;font-size:14px">{{ loadingMsg }}</div>
      </div>
    </el-card>

    <el-card v-if="error" class="error-card" shadow="never"><el-alert :title="error" type="error" show-icon closable @close="error=''" /></el-card>

    <el-card v-if="teammates.length" class="teammate-card" shadow="never">
      <template #header><span class="section-title">👥 队友绑定</span></template>
      <div class="teammate-grid">
        <div v-for="p in teammates" :key="p.id" class="teammate-item">
          <span class="teammate-tag">{{ p.displayName }}</span>
          <el-select v-model="bindMap[p.displayName]" placeholder="绑定" size="small" clearable style="width:130px">
            <el-option v-for="m in playerStore.teamPlayers" :key="m.id" :label="m.name" :value="m.id"/>
          </el-select>
        </div>
      </div>
    </el-card>


    <!-- 每场战斗的死亡列表 -->
    <div v-if="fightDetails.length" class="fights-wrap">
      <el-card v-for="(fight, fi) in fightDetails" :key="fight.id" class="fight-card" shadow="never">
        <template #header>
          <div class="fight-card-hd">
            <span class="fight-label">#{{ fi+1 }} {{ fightList[fi]?.name||'' }}</span>
            <el-tag size="small">{{ fightList[fi]?.duration }}</el-tag>
            <el-tag v-if="fight.ffPhase" size="small" type="success" effect="dark">{{ fight.ffPhase }}</el-tag>
            <el-tag v-if="fightList[fi]?.bossHP!=null" size="small" :type="fightList[fi].bossHP<20?'danger':fightList[fi].bossHP<50?'warning':'info'">HP {{ fightList[fi]?.bossHP }}%</el-tag>
            <span style="color:#808090;font-size:12px;margin-left:8px">阶段:</span>
            <el-select v-model="fight.phase" size="small" filterable allow-create style="width:100px" placeholder="P几">
              <el-option v-for="ph in recordStore.phaseOrder.filter(p=>p!=='已完成')" :key="ph" :label="ph" :value="ph"/>
            </el-select>
          </div>
        </template>
        <div v-if="fight.deaths.length === 0" style="color:#67c23a;font-size:13px;padding:4px 0">✅ 无死亡</div>
        <div v-for="(d, di) in fight.deaths" :key="di" class="death-row-wrap" :class="{ selected: d.level }">
          <span class="d-name">{{ d.targetName }}</span>
          <span class="d-time">{{ d.timeStr }}</span>
          <el-select v-model="d.phase" size="small" filterable allow-create style="width:80px" placeholder="P几">
            <el-option v-for="ph in recordStore.phaseOrder.filter(p=>p!=='已完成')" :key="ph" :label="ph" :value="ph"/>
          </el-select>
          <el-radio-group v-model="d.level" size="small" class="d-levels">
            <el-radio-button value="death" class="lvl-death">减员</el-radio-button>
            <el-radio-button value="wipe" class="lvl-wipe">团灭</el-radio-button>
            <el-radio-button value="enrage" class="lvl-enrage">狂暴</el-radio-button>
            <el-radio-button value="unforgivable" class="lvl-unforgivable">罪无可恕</el-radio-button>
          </el-radio-group>
        </div>
      </el-card>
    </div>

    <!-- 底部批量提交 -->
    <div v-if="allDeaths.length" class="bottom-bar">
      <el-button type="danger" size="large" @click="submitAll" :loading="submitting" :disabled="selectedCount === 0">
        批量添加至犯错记录 ({{ selectedCount }} 条)
      </el-button>
      <span class="bulk-hint" v-if="selectedCount > 0">
        将新增 {{ selectedCount }} 条记录到当前队伍的今日开荒记录中
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { usePlayerStore } from '../stores/players'
import { useRecordStore } from '../stores/records'

const playerStore = usePlayerStore()
const recordStore = useRecordStore()
const BIND_KEY = 'ff14_fflogs_bind_map'
const bindMap = ref(JSON.parse(localStorage.getItem(BIND_KEY)||'{}'))  // displayName → playerId
watch(bindMap, v => localStorage.setItem(BIND_KEY, JSON.stringify(v||{})), {deep:true})

const K_ID = 'ff14_fflogs_id', K_SEC = 'ff14_fflogs_secret', K_TOKEN = 'ff14_fflogs_manual_token'
const fflogsId = ref(localStorage.getItem(K_ID)||''), fflogsSecret = ref(localStorage.getItem(K_SEC)||'')
const manualToken = ref(localStorage.getItem(K_TOKEN)||'')
watch(fflogsId, v => localStorage.setItem(K_ID, v))
watch(fflogsSecret, v => localStorage.setItem(K_SEC, v))
watch(manualToken, v => localStorage.setItem(K_TOKEN, v||''))

let token = manualToken.value || null, tokExp = token ? Infinity : 0
watch(manualToken, v => { token = v || null; tokExp = v ? Infinity : 0 })

async function getToken() {
  if (token && Date.now() < tokExp) return token
  if (manualToken.value) { token = manualToken.value; tokExp = Infinity; return token }
  const r = await fetch('https://www.fflogs.com/oauth/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ grant_type:'client_credentials', client_id:fflogsId.value, client_secret:fflogsSecret.value })
  })
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error_description||`认证失败 ${r.status}`) }
  const d = await r.json(); token = d.access_token; tokExp = Date.now()+(d.expires_in-60)*1000; return token
}

async function gql(q, v) {
  const t = await getToken()
  const r = await fetch('https://cn.fflogs.com/api/v2/client', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},
    body: JSON.stringify({ query:q, variables:v })
  })
  const b = await r.json()
  if (!r.ok || b.errors) throw new Error(b.errors?.[0]?.message||`HTTP ${r.status}`)
  return b
}

const fflogsUrl = ref(''), loading = ref(false), loadingPct = ref(0), loadingMsg = ref(''), error = ref(''), submitting = ref(false)
const fightInfo = ref(null), fightList = ref([]), teammates = ref([])
const actorNameMap = ref({}), fightDetails = ref([]), playerNameMap = ref({})

const allDeaths = computed(() => fightDetails.value.flatMap(f => f.deaths))
const selectedCount = computed(() => allDeaths.value.filter(d => d.level).length)

function parseUrl(url) { const m = url.match(/reports\/([a-zA-Z0-9]+)/); return m?{code:m[1]}:null }
function fmt(ms) { const s = Math.round(ms/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }

function resolveName(id) {
  if (!id) return '?'
  const dn = actorNameMap.value[id]
  if (dn) {
    const pid = bindMap.value[dn]
    if (pid) { const p = playerStore.teamPlayers.find(pl=>pl.id===pid); if (p) return p.name }
    return dn
  }
  return `ID:${id}`
}

async function fetchFights() {
  if (!fflogsId.value && !manualToken.value) { error.value='请填写 Client ID 或 Bearer Token'; return }
  const p = parseUrl(fflogsUrl.value)
  if (!p) { error.value='无法解析链接'; return }
  loading.value=true; loadingPct.value=0; loadingMsg.value='正在获取报告信息...'; error.value=''; fightInfo.value=null; fightList.value=[]; teammates.value=[]; fightDetails.value=[]
  try {
    const res = await gql(`query($c:String!){reportData{report(code:$c){title zone{name} fights{id name kill encounterID startTime endTime fightPercentage bossPercentage lastPhase friendlyPlayers} masterData{actors{id name type subType server}}}}}`,{c:p.code})
    const rep = res?.data?.reportData?.report
    if (!rep) throw new Error('未找到报告')
    fightInfo.value = { zone: rep.zone?.name || rep.title || '未知' }
    const allFights = rep.fights||[], fightPlayerIds = new Set()
    for (const f of allFights) { for (const id of (f.friendlyPlayers||[])) fightPlayerIds.add(id) }
    const actors = rep.masterData?.actors||[], playerMap = {}, teamList = []
    for (const a of actors) {
      if (a.type!=='Player') continue
      if (a.subType==='Unknown'||a.subType==='LimitBreak') continue
      if (!a.name||a.name==='Multiple Players') continue
      if (!fightPlayerIds.has(a.id)) continue
      const dn = a.server?`${a.name}@${a.server}`:a.name
      playerMap[a.id] = dn
      if (!teamList.find(t=>t.displayName===dn)) teamList.push({id:a.id,displayName:dn,subType:a.subType})
    }
    actorNameMap.value = playerMap; teammates.value = teamList
    fightList.value = allFights.map(f=>({id:f.id,name:f.name||'',kill:f.kill,duration:fmt((f.endTime||0)-(f.startTime||0)),bossHP:f.bossPercentage!=null?Math.round(f.bossPercentage):(f.fightPercentage!=null?Math.round(f.fightPercentage):null),phase:f.lastPhase!=null?`P${f.lastPhase}`:'',startTime:f.startTime,endTime:f.endTime}))

    // 自动拉取所有 fight 的死亡事件
    const details = []
    const wipes = allFights.filter(f=>!f.kill).slice(0, 20)
    for (let fi=0; fi<wipes.length; fi++) {
      const f = wipes[fi]
      loadingPct.value = Math.round((fi / wipes.length) * 100)
      loadingMsg.value = `正在获取死亡事件 ${fi+1}/${wipes.length}...`
      try {
        const ev = await gql(`query($c:String!,$f:Int!,$s:Float!,$e:Float!){reportData{report(code:$c){deaths:events(fightIDs:[$f],dataType:Deaths,startTime:$s,endTime:$e,limit:100){data}}}}`,{c:p.code,f:f.id,s:Math.floor(f.startTime),e:Math.floor(f.endTime)})
        const raw = ev?.data?.reportData?.report?.deaths?.data||[]
        const ffPhase = fightList.value.find(fl=>fl.id===f.id)?.phase || ''
        const deaths = raw.map(d=>({
          targetName: resolveName(d.targetID),
          timeStr: fmt((d.timestamp||0)-f.startTime),
          timestamp: d.timestamp||0,
          phase: '',
          level: null
        })).sort((a,b)=>a.timestamp-b.timestamp)
        details.push({ id: f.id, phase: '', ffPhase, deaths })
      } catch { details.push({ id: f.id, deaths: [] }) }
    }
    loadingPct.value = 100
    fightDetails.value = details
  } catch(e) { error.value = e.message } finally { loading.value = false }
}

async function submitAll() {
  const today = new Date().toISOString().split('T')[0]
  let mistakeTotal = 0, progressTotal = 0

  // 先手动结束当前 pull（如果存在），确保从新 pull 开始
  recordStore.endCurrentPull(today)

  submitting.value = true
  try {
    for (const fight of fightDetails.value) {
      const entries = []
      for (const d of fight.deaths) {
        if (!d.level || !d.phase) continue
        const targetName = d.targetName.split('@')[0]
        let player = playerStore.teamPlayers.find(pl=>pl.name===targetName || pl.name===d.targetName)
        if (!player) { player = playerStore.addPlayer(targetName) }
        if (player) entries.push({
          playerId: player.id, playerName: player.name,
          phase: d.phase, description: `${d.timeStr} 死亡`,
          level: d.level, date: today
        })
      }
      if (entries.length > 0) {
        recordStore.addMistakes(entries)  // 每场 fight 一把，自动推进 pull 号
        mistakeTotal += entries.length
      } else if (fight.phase) {
        recordStore.addProgress({ phase: fight.phase, notes: '', date: today, endPull: true })
        progressTotal++
      }
    }
    const parts = []
    if (mistakeTotal>0) parts.push(`${mistakeTotal} 条犯错`)
    if (progressTotal>0) parts.push(`${progressTotal} 条进度`)
    ElMessage.success(parts.length ? `已导入 ${parts.join('、')}` : '没有已标记的记录')
  } catch(e) { error.value = e.message } finally { submitting.value = false }
}
</script>

<style scoped>
.analyze-page{max-width:1100px;margin:0 auto}
.config-header{display:flex;align-items:center}
.config-card :deep(.el-row){row-gap:8px}
.section-title{font-size:15px;font-weight:600;color:#e0e0e0}
.config-card,.input-card,.error-card,.loading-card,.teammate-card,.bulk-card{margin-bottom:16px}
.url-row{display:flex;gap:12px}.url-row .el-input{flex:1}

.teammate-grid{display:flex;flex-wrap:wrap;gap:8px}
.teammate-item{display:flex;align-items:center;gap:4px}
.teammate-tag{display:inline-block;padding:4px 12px;background:#252540;border:1px solid #3a3a5a;border-radius:6px;color:#ffd700;font-size:13px;font-weight:600}

.fights-wrap{display:flex;flex-direction:column;gap:12px;margin-bottom:80px}
.fight-card-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fight-label{color:#ffd700;font-weight:700;font-size:14px}

.death-row-wrap{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:13px;border-bottom:1px solid #1a1a3a}
.death-row-wrap.selected{background:rgba(255,215,0,.04);border-radius:3px}
.d-name{color:#e0e0e0;font-weight:600;min-width:70px}
.d-time{color:#808090;font-family:monospace;min-width:45px}
.d-levels :deep(.el-radio-button__inner){padding:2px 8px;font-size:11px}
.lvl-death :deep(.el-radio-button__inner){color:#e6a23c}
.lvl-wipe :deep(.el-radio-button__inner){color:#f56c6c}
.lvl-enrage :deep(.el-radio-button__inner){color:#c4568b}
.lvl-unforgivable :deep(.el-radio-button__inner){color:#ff3366}

.bottom-bar{position:fixed;bottom:0;left:220px;right:0;background:#1a1a2e;border-top:1px solid #2a2a4a;padding:14px 24px;display:flex;align-items:center;gap:16px;z-index:50}
.bulk-hint{color:#808090;font-size:12px}
@media(max-width:768px){.analyze-page{padding:0 4px}.bottom-bar{left:0;padding:10px 12px}}
</style>
