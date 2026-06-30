import { reactive, ref, computed, watch } from 'vue'

const RESOLVE_ID_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!) {
  characterData { character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) { id name }
}}`

const ENCOUNTER_RANKINGS_QUERY = `
query($characterID: Int!, $encounterID: Int!) {
  characterData { character(id: $characterID) { id name server { name slug } encounterRankings(encounterID: $encounterID) }}
}`

const CLEAR_REPORTS_BY_NAME_QUERY = `
query($characterName: String!, $serverSlug: String!, $serverRegion: String!, $encounterID: Int!, $limit: Int!, $page: Int!) {
  characterData { character(name: $characterName, serverSlug: $serverSlug, serverRegion: $serverRegion) {
    id name server { name slug }
    recentReports(limit: $limit, page: $page) {
      data { code title startTime endTime masterData { actors { id name server type subType } }
        fights(encounterID: $encounterID, killType: Kills) { id name startTime endTime fightPercentage lastPhase friendlyPlayers } }
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

function formatTime(ms) {
  return new Date(ms).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function useTeammateQuery(auth) {
  const yesterday = new Date(Date.now() - 86400000)
  yesterday.setHours(0, 0, 0, 0)

  const tm = reactive({
    playerAtServer: '洛辰辰@海猫茶屋', characterName: '洛辰辰', serverSlug: '海猫茶屋', serverRegion: 'CN',
    characterId: null, encounterId: 1085, afterMs: 0, afterDate: null,
    limit: 40, maxPages: 50, dedupeMs: 5000, workers: 2,
    running: false, hasData: false, progressPct: 0, progressMsg: '',
    targetName: '-', firstClearTime: '-', firstClearJob: '', targetClearCount: '-',
    targetJobStats: [],
    teammates: [], filteredTeammates: [],
    previousTotal: 0,
    tableSearch: '', onlyErrors: 'all', sortKey: 'order', sortDir: 'asc',
    log: ''
  })

  function tmLog(msg) { const t = new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); tm.log += `[${t}] ${msg}\n` }
  function tmClearLog() { tm.log = '' }

  let abortCtrl = null
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
  async function graphQL(query, variables) { return auth.graphQL(query, variables, abortCtrl?.signal) }

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
    const sn = tmCharServerNames(character); const ids = new Set()
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
    return { reportCode: report.code, reportTitle: report.title, fightID: fight.id, realStartTime: realStart, realStartISO: formatTime(realStart), durationMs: Number(fight.endTime) - Number(fight.startTime), friendlyPlayers: fight.friendlyPlayers || [], targetActorIDs: [...targetIds] }
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

  function rankedKey(name, serverName) { return `${name || ''}\x00${serverName || ''}` }

  function buildRankedMap(report) {
    const m = new Map()
    for (const c of report.rankedCharacters || []) {
      const s = c.server || {}
      m.set(rankedKey(c.name, s.name), c); m.set(rankedKey(c.name, s.slug), c)
    }
    return m
  }

  function isRealPlayer(actor) {
    if (!actor || actor.type !== 'Player' || actor.subType === 'LimitBreak') return false
    return Boolean(actor.server)
  }

  function tmIdentity(p) { return p.characterID ? `id:${p.characterID}` : `name:${p.name}@${p.serverName}` }
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

  async function tmCollectClears(subject) {
    let limit = tm.limit
    while (true) {
      try { return await tmCollectClearsWithLimit(subject, limit) }
      catch (e) {
        if (!e.isComplexity || limit <= 1) throw e
        limit = Math.max(1, Math.floor(limit / 2))
        tmLog(`${tmLabel(subject)} 复杂度超限，调整为 ${limit}`)
      }
    }
  }

  async function tmCollectClearsWithLimit(subject, limit) {
    let character = null
    if (subject.id) {
      const data = await graphQL(ENCOUNTER_RANKINGS_QUERY, { characterID: subject.id, encounterID: Number(tm.encounterId) })
      character = data.characterData.character
      if (!character) throw new Error(`没有找到角色：${tmLabel(subject)}`)
      if (character.id && !tm.characterId) tm.characterId = character.id
      let rankings = character.encounterRankings
      if (!rankings) rankings = { ranks: [] }
      if (!Array.isArray(rankings.ranks)) rankings.ranks = []
      const raw = rankings.ranks.map(r => ({
        reportCode: r.report?.code || '', reportTitle: '',
        fightID: r.report?.fightID || 0, realStartTime: r.startTime || 0,
        realStartISO: r.startTime ? formatTime(r.startTime) : '',
        durationMs: r.duration || 0, spec: r.spec || '', rDPS: r.rDPS || 0,
        aDPS: r.aDPS || 0, cDPS: r.cDPS || 0,
        friendlyPlayers: [], targetActorIDs: [], duplicateCount: 1
      })).filter(f => f.reportCode && f.fightID)
      return { character, raw }
    }
    // 名字查询翻页
    const raw = []; let page = 1
    while (true) {
      const vars = { characterName: subject.name, serverSlug: subject.serverSlug, serverRegion: subject.serverRegion || tm.serverRegion, encounterID: Number(tm.encounterId), limit, page }
      const data = await graphQL(CLEAR_REPORTS_BY_NAME_QUERY, vars)
      character = data.characterData.character
      if (!character) throw new Error(`没有找到角色：${tmLabel(subject)}`)
      if (character.id && !tm.characterId) tm.characterId = character.id
      const reports = character.recentReports?.data || []
      if (!reports.length) { tmLog(`${tmLabel(subject)} page ${page}: 无数据`); break }
      const pageClears = []; let pageEnd = 0
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
      if (reports.length < limit || (tm.afterMs && pageEnd < tm.afterMs) || (tm.maxPages && page >= tm.maxPages)) break
      page++; await sleep(0)
    }
    return { character, raw }
  }

  async function tmCountClears(teammate, targetFirstClearTime) {
    const subject = teammate.characterID ? { id: teammate.characterID } : { name: teammate.name, serverSlug: teammate.serverSlug, serverRegion: tm.serverRegion }
    const { character, raw } = await tmCollectClears(subject)
    const deduped = tmDedupe(raw, tm.dedupeMs)
    const ss = targetFirstClearTime - tm.dedupeMs, se = targetFirstClearTime + tm.dedupeMs
    const previous = deduped.filter(f => f.realStartTime < ss)
    const same = deduped.filter(f => f.realStartTime >= ss && f.realStartTime <= se)
    const after = deduped.filter(f => f.realStartTime > se)
    return { ...teammate, resolvedCharacter: character, rawClearCount: raw.length, clearCount: deduped.length, previousClearCount: previous.length, sameClearWindowCount: same.length, afterTargetFirstClearCount: after.length, currentClearCount: deduped.length, firstClear: deduped[0] || null, latestClear: deduped[deduped.length - 1] || null }
  }

  function applyFilters() {
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

  function onSortChange({ prop, order }) {
    if (!prop) return
    tm.sortKey = prop; tm.sortDir = order === 'ascending' ? 'asc' : 'desc'
    applyFilters()
  }

  watch(() => [tm.tableSearch, tm.onlyErrors], applyFilters)

  function resetFilters() {
    tm.tableSearch = ''; tm.onlyErrors = 'all'; tm.sortKey = 'order'; tm.sortDir = 'asc'
    applyFilters()
  }

  async function run() {
    tmClearLog()
    abortCtrl = new AbortController()
    tm.running = true; tm.hasData = false; tm.progressPct = 0; tm.progressMsg = '获取令牌...'
    try {
      await auth.getToken()
      tm.progressPct = 2; tm.progressMsg = '解析角色 ID...'
      tmLog('令牌已就绪')
      await auth.refreshRateLimit()
      if (!tm.characterId && tm.characterName && tm.serverSlug) {
        try {
          const idData = await graphQL(RESOLVE_ID_QUERY, { characterName: tm.characterName, serverSlug: tm.serverSlug, serverRegion: tm.serverRegion })
          const resolved = idData?.characterData?.character
          if (resolved?.id) { tm.characterId = resolved.id; tmLog(`角色 ID: ${resolved.id}`) }
        } catch { /* fallback to name */ }
      }
      tm.progressPct = 5; tm.progressMsg = '查询过本记录...'
      const subject = tmSubject()
      tmLog(`查询目标初通：${tmLabel(subject)}`)
      const targetResult = await tmCollectClears(subject)
      const targetClears = tmDedupe(targetResult.raw, tm.dedupeMs)
      if (!targetClears.length) throw new Error(`没有找到 ${tmLabel(subject)} 的通关记录`)
      const firstClear = targetClears[0]
      tm.targetName = targetResult.character.name
      tm.firstClearTime = firstClear.realStartISO
      tm.targetClearCount = targetClears.length
      tm.firstClearJob = firstClear.spec || ''
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
      tm.progressPct = 30; tm.progressMsg = `初通队友 ${teammates.length} 人，统计各队友通关次数...`
      tmLog(`初通队友数：${teammates.length}`)
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
      applyFilters()
      tm.progressPct = 100; tm.progressMsg = '完成'
      tmLog('完成')
    } catch (e) {
      tm.progressPct = 0
      if (e.name === 'AbortError') { tm.progressMsg = '已停止'; tmLog('已停止') }
      else { tm.progressMsg = '查询失败'; tmLog(`错误：${e.message}`) }
    } finally {
      if (tm.progressPct > 0 && tm.progressPct < 100) tm.progressPct = 100
      setTimeout(() => { if (!tm.running) { tm.progressPct = 0; tm.progressMsg = '' } }, 1500)
      tm.running = false; abortCtrl = null
    }
  }

  function stop() { if (abortCtrl) abortCtrl.abort() }

  function downloadJson() {
    const data = JSON.stringify({ targetName: tm.targetName, firstClearTime: tm.firstClearTime, teammates: tm.filteredTeammates }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_初通队友对比.json'; a.click()
  }

  function downloadCsv() {
    const headers = ['姓名', '服务器', '职业', '此前', '同场', '此后', '当前', '首次通关', '最近通关', '错误']
    const lines = [headers.join(',')]
    for (const t of tm.filteredTeammates) {
      const fc = t.firstClear || {}, lc = t.latestClear || {}
      lines.push([t.name, t.serverName, t.job || '', t.previousClearCount, t.sameClearWindowCount, t.afterTargetFirstClearCount, t.currentClearCount, fc.realStartISO || '', lc.realStartISO || '', t.error || ''].join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fflogs_初通队友对比.csv'; a.click()
  }

  return { tm, run, stop, downloadJson, downloadCsv, onSortChange, resetFilters, applyFilters }
}
