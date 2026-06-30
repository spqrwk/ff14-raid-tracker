import { reactive, ref, computed, watch } from 'vue'
import { useFflogsAuth } from './useFflogsAuth'

const REPORTS_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!, $encounterID: Int!, $limit: Int!, $page: Int!) {
  characterData { character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) {
    id name server { name slug }
    recentReports(limit: $limit, page: $page) {
      data {
        code title startTime endTime
        masterData { actors { id name server type subType } }
        phases { encounterID separatesWipes phases { id name isIntermission } }
        fights(encounterID: $encounterID) { id name encounterID kill startTime endTime fightPercentage lastPhase lastPhaseAsAbsoluteIndex lastPhaseIsIntermission friendlyPlayers phaseTransitions { id startTime } }
      }
    }
  }}
}`

const HEALTH_EVENTS_QUERY = `
query($code: String!, $fightIDs: [Int], $startTime: Float!, $endTime: Float!, $limit: Int!) {
  reportData { report(code: $code) {
    events(dataType: DamageDone, fightIDs: $fightIDs, startTime: $startTime, endTime: $endTime, limit: $limit, includeResources: true, useActorIDs: true) { data nextPageTimestamp }
  }}
}`

const MASTER_DATA_QUERY = `
query($code: String!) { reportData { report(code: $code) { masterData { actors { id name type subType gameID } } } } }`

function formatTime(ms) {
  return new Date(ms).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtPct(v) { return v == null || isNaN(v) ? '-' : `${Number(v).toFixed(2)}%` }
function formatDuration(ms) {
  if (!ms || ms <= 0) return ''
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

function cstYesterdayMidnight() {
  const cst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  return Date.UTC(cst.getFullYear(), cst.getMonth(), cst.getDate() - 1) - 8 * 3600 * 1000
}

export function useProgressQuery(auth) {
  const yesterday = new Date(Date.now() - 86400000)
  yesterday.setHours(0, 0, 0, 0)

  const prog = reactive({
    playerAtServer: '洛辰辰@海猫茶屋', characterName: '洛辰辰', serverSlug: '海猫茶屋', serverRegion: 'CN',
    encounterId: 1085, limit: 20, afterMs: cstYesterdayMidnight(), afterDate: yesterday,
    dedupeMs: 5000, healthWindow: 60000, healthMode: 'best',
    running: false, hasData: false, progressPct: 0, progressMsg: '',
    fights: [], filteredFights: [], pagedFights: [],
    summary: null, bestPercent: '-', bestPhase: '-', bestDuration: '', bestHp: '-',
    bestFightDetail: null,
    stageChartOption: {}, passChartOption: {}, progressChartOption: {},
    stageOptions: [],
    tableSearch: '', statusFilter: 'all', stageFilter: 'all', sortKey: 'attemptNo', sortDir: 'asc',
    log: ''
  })

  function progLog(msg) { const t = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); prog.log += `[${t}] ${msg}\n` }
  function progClearLog() { prog.log = '' }

  let abortCtrl = null

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  async function graphQL(query, variables) {
    return auth.graphQL(query, variables, abortCtrl?.signal)
  }

  function buildPhaseMap(report, encounterId) {
    for (const g of report.phases || []) {
      if (g.encounterID !== encounterId) continue
      const map = new Map()
      for (const p of g.phases || []) map.set(p.id, p.name)
      return map
    }
    return new Map()
  }

  function phaseNameFor(id, phaseMap) { return id == null ? '' : (phaseMap.get(id) || `Phase ${id}`) }

  function targetActorIds(report, character) {
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
      encounterID: fight.encounterID, kill: fight.kill, fightPercentage: fight.fightPercentage,
      lastPhase: fight.lastPhase, lastPhaseName: phaseNameFor(fight.lastPhase, phaseMap),
      realStartTime: realStart, realStartISO: formatTime(realStart),
      relativeStartMs: Number(fight.startTime), relativeEndMs: Number(fight.endTime),
      durationMs: Number(fight.endTime) - Number(fight.startTime),
      reportStartTime: reportStart, reportEndTime: Number(report.endTime),
      reportHasPhaseDefinitions: phaseMap.size > 0, reportTitle: report.title,
      phaseTransitions: (fight.phaseTransitions || []).map(t => ({ id: t.id, name: phaseNameFor(t.id, phaseMap), reportStartMs: Number(t.startTime) })),
      duplicateCount: 1, finalPhaseHPPercent: null, finalPhaseHPDetail: '', healthSource: 'skipped',
      isBestFightPercentage: false,
      spec: [...targetIds].map(id => (report.masterData?.actors || []).find(a => a.id === id)?.subType).filter(Boolean)[0] || '',
      friendlyPlayers: fight.friendlyPlayers || [], targetActorIDs: [...targetIds]
    }
  }

  function dedupeByRealStart(fights, windowMs) {
    if (!fights.length) return []
    const sorted = [...fights].sort((a, b) => a.realStartTime - b.realStartTime)
    const groups = []; let cur = [sorted[0]], gs = sorted[0].realStartTime
    for (const f of sorted.slice(1)) {
      if (f.realStartTime - gs <= windowMs) cur.push(f)
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
    const hw = prog.healthWindow; const eventLimit = 1000; const maxPages = 3
    const phaseStart = lastPhaseStartMs(fight); const fightEnd = fight.relativeEndMs
    let nextStart = Math.max(phaseStart, fightEnd - hw)
    const actorsData = await graphQL(MASTER_DATA_QUERY, { code: fight.reportCode })
    const actors = new Map()
    for (const a of actorsData.reportData.report.masterData.actors || []) actors.set(a.id, a)
    const lastByTarget = new Map()
    for (let page = 0; page < maxPages && nextStart < fightEnd; page++) {
      const events = await graphQL(HEALTH_EVENTS_QUERY, { code: fight.reportCode, fightIDs: [fight.fightID], startTime: nextStart, endTime: fightEnd, limit: eventLimit })
      for (const ev of (events.reportData?.report?.events?.data || [])) {
        if (!ev.targetResources || ev.targetID == null) continue
        const actor = actors.get(ev.targetID) || {}
        if (actor.type !== 'NPC' || actor.subType !== 'Boss') continue
        const hp = ev.targetResources.hitPoints, maxHp = ev.targetResources.maxHitPoints
        if (hp == null || !maxHp) continue
        lastByTarget.set(ev.targetID, { hitPoints: hp, maxHitPoints: maxHp, percent: hp / maxHp * 100, name: actor.name })
      }
      if (!events.reportData?.report?.events?.nextPageTimestamp) break
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

  function updateCharts() {
    const fights = prog.fights
    if (!fights.length) return
    const stuckCounts = new Map()
    for (const f of fights) stuckCounts.set(f.stuckStage || '?', (stuckCounts.get(f.stuckStage) || 0) + 1)
    const stageLabels = [...stuckCounts.keys()]; const stageValues = [...stuckCounts.values()]
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
      series: [
        { type: 'scatter', data: pts.filter(p => best && fights[p[0]] !== best).map(p => p), itemStyle: { color: '#409eff' }, symbolSize: 6 },
        { type: 'scatter', data: best ? [[fights.indexOf(best), best.fightPercentage]] : [], itemStyle: { color: '#f56c6c' }, symbolSize: 12 }
      ],
      grid: { top: 20, right: 20, bottom: 40, left: 60 }
    }
    prog.stageOptions = stageLabels
  }

  function applyFilters() {
    let result = prog.fights
    const s = prog.tableSearch.toLowerCase()
    const { statusFilter, stageFilter, sortKey, sortDir } = prog
    if (statusFilter === 'kill') result = result.filter(f => f.kill)
    if (statusFilter === 'wipe') result = result.filter(f => !f.kill)
    if (statusFilter === 'best') result = result.filter(f => f.isBestFightPercentage)
    if (stageFilter !== 'all') result = result.filter(f => (f.stuckStage || '') === stageFilter)
    if (s) result = result.filter(f => [f.reportCode, f.fightID, f.lastPhaseName, f.fightName, f.realStartISO, f.finalPhaseHPDetail].join(' ').toLowerCase().includes(s))
    const dir = sortDir === 'asc' ? 1 : -1
    result = [...result].sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    prog.filteredFights = result
    prog.pagedFights = result
  }

  function onSortChange({ prop, order }) {
    if (!prop) return
    prog.sortKey = prop
    prog.sortDir = order === 'ascending' ? 'asc' : 'desc'
    applyFilters()
  }

  watch(() => [prog.tableSearch, prog.statusFilter, prog.stageFilter], applyFilters)

  function resetFilters() {
    prog.tableSearch = ''; prog.statusFilter = 'all'; prog.stageFilter = 'all'
    prog.sortKey = 'attemptNo'; prog.sortDir = 'asc'
    applyFilters()
  }

  async function run() {
    progClearLog()
    abortCtrl = new AbortController()
    prog.running = true; prog.hasData = false; prog.progressPct = 0; prog.progressMsg = '获取令牌...'
    try {
      await auth.getToken()
      prog.progressPct = 5; prog.progressMsg = '令牌已就绪，查询额度...'
      progLog('令牌已就绪')
      await auth.refreshRateLimit()
      const vbase = { characterName: prog.characterName, serverSlug: prog.serverSlug, serverRegion: prog.serverRegion, encounterID: Number(prog.encounterId), limit: prog.limit }
      let page = 1, emptyPages = 0; const rawFights = []
      prog.progressPct = 10; prog.progressMsg = '正在分页查询报告...'
      while (true) {
        const data = await graphQL(REPORTS_QUERY, { ...vbase, page })
        const character = data.characterData.character
        if (!character) throw new Error('没有找到角色')
        const reports = character.recentReports.data || []
        if (!reports.length) { progLog(`page ${page}: 没有数据，停止`); break }
        const beforeCount = rawFights.length
        for (const report of reports) {
          const tids = targetActorIds(report, character)
          for (const fight of report.fights || []) {
            const nf = normalizeFight(report, fight, character, prog.encounterId, prog.afterMs, tids)
            if (nf) rawFights.push(nf)
          }
        }
        emptyPages = rawFights.length > beforeCount ? 0 : emptyPages + 1
        prog.progressPct = Math.min(70, 10 + page * 5)
        prog.progressMsg = `page ${page}: 报告 ${reports.length}，累计战斗 ${rawFights.length}`
        progLog(`page ${page}: 报告 ${reports.length}，累计战斗 ${rawFights.length}`)
        if (reports.length < prog.limit || emptyPages >= 1) break
        page++; await sleep(0)
      }
      prog.progressPct = 75; prog.progressMsg = '去重处理中...'
      progLog(`原始战斗数：${rawFights.length}`)
      const fights = dedupeByRealStart(rawFights, prog.dedupeMs)
      prog.progressPct = 80; prog.progressMsg = `去重后 ${fights.length} 场`
      progLog(`去重后战斗数：${fights.length}`)
      fights.forEach((f, i) => { f.attemptNo = i + 1; f.stuckStage = f.kill ? 'Clear' : f.lastPhaseName })
      const best = fights.reduce((cur, f) => {
        if (!cur) return f
        return (f.fightPercentage ?? 9999) < (cur.fightPercentage ?? 9999) ? f : cur
      }, null)
      if (best) best.isBestFightPercentage = true
      if (prog.healthMode !== 'none' && best) {
        prog.progressPct = 85; prog.progressMsg = '查询最低进度血量...'
        progLog(`查询最低进度血量：${best.reportCode}#${best.fightID}`)
        await fetchHealthForFight(best)
      }
      prog.progressPct = 92; prog.progressMsg = '生成图表与表格...'
      const summary = {
        battleCount: fights.length, killCount: fights.filter(f => f.kill).length,
        p1PassCount: fights.filter(f => f.kill || f.lastPhase > 1).length,
        p2PassCount: fights.filter(f => f.kill || f.lastPhase > 2).length
      }
      prog.fights = fights; prog.summary = summary
      prog.bestPercent = best ? fmtPct(best.fightPercentage) : '-'
      prog.bestPhase = best ? (best.stuckStage || best.lastPhaseName || '-') : '-'
      prog.bestDuration = best ? formatDuration(best.durationMs) : ''
      prog.bestHp = best ? fmtPct(best.finalPhaseHPPercent) : '-'
      if (best) {
        try {
          const detailData = await graphQL(MASTER_DATA_QUERY, { code: best.reportCode })
          const actors = detailData?.reportData?.report?.masterData?.actors || []
          const actorMap = {}; for (const a of actors) actorMap[a.id] = a
          const mates = (best.friendlyPlayers || []).map(id => {
            const a = actorMap[id]
            if (!a || a.type !== 'Player' || a.subType === 'LimitBreak') return null
            return { name: a.name, job: a.subType }
          }).filter(Boolean)
          prog.bestFightDetail = { reportCode: best.reportCode, fightID: best.fightID, teammates: mates }
        } catch { prog.bestFightDetail = null }
      } else prog.bestFightDetail = null
      prog.hasData = true
      updateCharts(); applyFilters()
      prog.progressPct = 100; prog.progressMsg = '完成'
      progLog('完成')
    } catch (e) {
      prog.progressPct = 0
      if (e.name === 'AbortError') { prog.progressMsg = '已停止'; progLog('已停止') }
      else { prog.progressMsg = '查询失败'; progLog(`错误：${e.message}`) }
    } finally {
      if (prog.progressPct > 0 && prog.progressPct < 100) prog.progressPct = 100
      setTimeout(() => { if (!prog.running) { prog.progressPct = 0; prog.progressMsg = '' } }, 1500)
      prog.running = false; abortCtrl = null
    }
  }

  function stop() { if (abortCtrl) abortCtrl.abort() }

  function downloadJson() {
    const data = JSON.stringify({ characterName: prog.characterName, summary: prog.summary, fights: prog.filteredFights }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_进度数据.json'; a.click()
  }

  function downloadCsv() {
    const headers = ['序号', '开始时间', '报告ID', '战斗ID', '职业', '通关', '进度%', '卡点阶段', '最远进度', '剩余血量%', '血量明细']
    const lines = [headers.join(',')]
    for (const f of prog.filteredFights) {
      const jobCN = f.spec || ''
      lines.push([f.attemptNo, f.realStartISO, f.reportCode, f.fightID, jobCN, f.kill ? '是' : '否', fmtPct(f.fightPercentage), f.stuckStage || '', f.isBestFightPercentage ? '是' : '', fmtPct(f.finalPhaseHPPercent), (f.finalPhaseHPDetail || '').replace(/,/g, '，')].join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_战斗明细.csv'; a.click()
  }

  return { prog, run, stop, downloadJson, downloadCsv, onSortChange, resetFilters, applyFilters }
}
