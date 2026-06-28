import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadRecords, saveRecords, generateId } from '../utils/storage'
import { useTeamStore } from './teams'

export const useRecordStore = defineStore('records', () => {
  const records = ref(loadRecords())

  function persist() {
    saveRecords(records.value)
  }

  // 阶段顺序从当前队伍读取（每个副本独立配置）
  const phaseOrder = computed(() => {
    const teamStore = useTeamStore()
    return teamStore.currentPhaseOrder
  })

  // ---- 数据迁移：旧数据没有 teamId ----
  function migrateIfNeeded() {
    const teamStore = useTeamStore()
    const team = teamStore.currentTeam
    if (!team) return
    let changed = false
    for (const r of records.value) {
      if (!r.teamId) {
        r.teamId = team.id
        changed = true
      }
    }
    if (changed) persist()
  }

  // 获取当前队伍的所有记录
  const teamRecords = computed(() => {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    if (!tid) return records.value
    return records.value.filter(r => r.teamId === tid)
  })

  // --- 阶段数值转换 ---
  function getPhaseValue(phase) {
    if (!phase) return 0
    const idx = phaseOrder.value.indexOf(phase)
    if (idx !== -1) return idx + 1
    const match = String(phase).match(/^P(\d+(?:\.\d+)?)$/i)
    if (match) return parseFloat(match[1])
    return phaseOrder.value.length + 100
  }

  function getPhaseLabel(value) {
    if (value <= phaseOrder.value.length && value > 0) {
      return phaseOrder.value[Math.floor(value) - 1]
    }
    return `P${value}`
  }

  function getPhaseNameByValue(value) {
    if (value >= 1 && value <= phaseOrder.value.length) {
      const idx = Math.round(value) - 1
      if (idx >= 0 && idx < phaseOrder.value.length) {
        return phaseOrder.value[idx]
      }
    }
    return `P${value}`
  }

  // --- 当前 Pull 号（仅当前队伍） ---
  function getCurrentPullNumber(date) {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const todayRecords = records.value.filter(r => r.date === date && r.teamId === tid)
    if (todayRecords.length === 0) return 1

    const pullNumbers = [...new Set(todayRecords.map(r => r.pullNumber))]
    const maxPull = Math.max(...pullNumbers)
    const maxPullRecords = todayRecords.filter(r => r.pullNumber === maxPull)

    const hasEnded = maxPullRecords.some(r =>
      (r.type === 'mistake' && (r.level === 'wipe' || r.level === 'enrage' || r.level === 'unforgivable')) ||
      r.type === 'pull_end'
    )
    return hasEnded ? maxPull + 1 : maxPull
  }

  function isPullEnded(date, pullNumber) {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const pullRecords = records.value.filter(
      r => r.date === date && r.pullNumber === pullNumber && r.teamId === tid
    )
    return pullRecords.some(r =>
      (r.type === 'mistake' && (r.level === 'wipe' || r.level === 'enrage' || r.level === 'unforgivable')) ||
      r.type === 'pull_end'
    )
  }

  // --- 批量添加犯错记录（同一把内多人） ---
  function addMistakes(entries) {
    if (!entries || entries.length === 0) return []
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const recordDate = entries[0].date || new Date().toISOString().split('T')[0]
    const pullNumber = getCurrentPullNumber(recordDate)
    const level = entries[0].level

    const created = []
    for (const e of entries) {
      if (!e.playerId || !e.phase || !e.level) continue
      const record = {
        id: generateId(),
        type: 'mistake',
        teamId: tid,
        date: recordDate,
        pullNumber,
        phase: e.phase,
        playerId: e.playerId,
        playerName: e.playerName,
        description: e.description || '',
        level: e.level,
        timestamp: new Date().toISOString()
      }
      records.value.push(record)
      created.push(record)
    }
    // 如果包含团灭/狂暴/罪无可恕，结束本把
    if (level === 'wipe' || level === 'enrage' || level === 'unforgivable') {
      records.value.push({
        id: generateId(),
        type: 'pull_end',
        teamId: tid,
        date: recordDate,
        pullNumber,
        phase: '',
        timestamp: new Date().toISOString()
      })
    }
    persist()
    return created
  }

  // --- 添加犯错记录（单人） ---
  function addMistake({ playerId, playerName, phase, description, level, date }) {
    if (!playerId || !phase || !level) {
      throw new Error('请填写完整的犯错信息（队员、阶段、等级）')
    }
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const recordDate = date || new Date().toISOString().split('T')[0]
    const pullNumber = getCurrentPullNumber(recordDate)

    const record = {
      id: generateId(),
      type: 'mistake',
      teamId: tid,
      date: recordDate,
      pullNumber,
      phase,
      playerId,
      playerName,
      description: description || '',
      level,
      timestamp: new Date().toISOString()
    }
    records.value.push(record)
    persist()
    return record
  }

  // --- 添加进度记录 ---
  function addProgress({ phase, notes, date, endPull }) {
    if (!phase) throw new Error('请填写到达的阶段')
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const recordDate = date || new Date().toISOString().split('T')[0]
    const pullNumber = getCurrentPullNumber(recordDate)

    const record = {
      id: generateId(),
      type: 'progress',
      teamId: tid,
      date: recordDate,
      pullNumber,
      phase,
      notes: notes || '',
      timestamp: new Date().toISOString()
    }
    records.value.push(record)

    if (endPull) {
      records.value.push({
        id: generateId(),
        type: 'pull_end',
        teamId: tid,
        date: recordDate,
        pullNumber,
        phase: '',
        timestamp: new Date().toISOString()
      })
    }
    persist()
    return record
  }

  // --- 标记当前 Pull 通关 ---
  function markPullCleared(date) {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const recordDate = date || new Date().toISOString().split('T')[0]
    const pullNumber = getCurrentPullNumber(recordDate)

    // 添加通关进度记录（无论是否有犯错，无犯通关也可以记录）
    const progressRecord = {
      id: generateId(),
      type: 'progress',
      teamId: tid,
      date: recordDate,
      pullNumber,
      phase: '已完成',
      notes: '本把通关！',
      timestamp: new Date().toISOString()
    }
    records.value.push(progressRecord)

    // 结束本把
    records.value.push({
      id: generateId(),
      type: 'pull_end',
      teamId: tid,
      date: recordDate,
      pullNumber,
      phase: '',
      timestamp: new Date().toISOString()
    })
    persist()
    return { pullNumber }
  }

  // --- 手动结束当前 Pull ---
  function endCurrentPull(date) {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    const recordDate = date || new Date().toISOString().split('T')[0]
    const pullNumber = getCurrentPullNumber(recordDate)

    const todayRecords = records.value.filter(
      r => r.date === recordDate && r.pullNumber === pullNumber && r.teamId === tid
    )
    if (todayRecords.length === 0) return null

    const record = {
      id: generateId(),
      type: 'pull_end',
      teamId: tid,
      date: recordDate,
      pullNumber,
      phase: '',
      timestamp: new Date().toISOString()
    }
    records.value.push(record)
    persist()
    return record
  }

  // --- 查询（仅当前队伍） ---
  function getRecordsByDate(date) {
    const tid = useTeamStore().currentTeamId
    return records.value
      .filter(r => r.date === date && r.teamId === tid)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  function getRecordsByDateRange(startDate, endDate) {
    const tid = useTeamStore().currentTeamId
    return records.value
      .filter(r => r.date >= startDate && r.date <= endDate && r.teamId === tid)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.pullNumber - b.pullNumber || a.timestamp.localeCompare(b.timestamp)
      })
  }

  function getDailyPullSummary(date) {
    const dayRecords = getRecordsByDate(date)
    const pullMap = new Map()
    for (const r of dayRecords) {
      if (r.type === 'pull_end') continue
      if (!pullMap.has(r.pullNumber)) {
        pullMap.set(r.pullNumber, {
          pullNumber: r.pullNumber,
          records: [],
          maxPhase: '',
          maxPhaseValue: 0,
          ended: false
        })
      }
      const pull = pullMap.get(r.pullNumber)
      pull.records.push(r)
      const pv = getPhaseValue(r.phase)
      if (pv > pull.maxPhaseValue) {
        pull.maxPhaseValue = pv
        pull.maxPhase = r.phase
      }
    }
    for (const [num, pull] of pullMap) {
      pull.ended = isPullEnded(date, num)
    }
    const result = Array.from(pullMap.values())
    result.sort((a, b) => b.pullNumber - a.pullNumber)
    return result
  }

  // --- 开荒进度数据（当前队伍） ---
  function getProgressionData(startDate, endDate) {
    const tid = useTeamStore().currentTeamId
    const filtered = records.value.filter(r => {
      if (r.type === 'pull_end') return false
      if (r.teamId !== tid) return false
      if (startDate && r.date < startDate) return false
      if (endDate && r.date > endDate) return false
      return true
    })
    const pullMap = new Map()
    for (const r of filtered) {
      const key = `${r.date}||${r.pullNumber}`
      if (!pullMap.has(key)) {
        pullMap.set(key, {
          date: r.date, pullNumber: r.pullNumber,
          maxPhaseValue: 0, maxPhase: '', mistakeCount: 0
        })
      }
      const pull = pullMap.get(key)
      const pv = getPhaseValue(r.phase)
      if (pv > pull.maxPhaseValue) { pull.maxPhaseValue = pv; pull.maxPhase = r.phase }
      if (r.type === 'mistake') pull.mistakeCount++
    }
    const result = Array.from(pullMap.values())
    result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.pullNumber - b.pullNumber
    })
    return result
  }

  // --- 队员犯错统计（当前队伍） ---
  function getPlayerMistakeStats(startDate, endDate) {
    const tid = useTeamStore().currentTeamId
    const mistakeRecords = records.value.filter(r =>
      r.type === 'mistake' && r.teamId === tid &&
      r.date >= startDate && r.date <= endDate
    )
    const statsMap = {}
    for (const r of mistakeRecords) {
      if (!r.playerId) continue
      if (!statsMap[r.playerId]) {
        statsMap[r.playerId] = {
          playerId: r.playerId, playerName: r.playerName,
          total: 0, byDate: {}, byLevel: { death: 0, wipe: 0, enrage: 0, unforgivable: 0 }
        }
      }
      const stat = statsMap[r.playerId]
      stat.total++
      stat.byDate[r.date] = (stat.byDate[r.date] || 0) + 1
      if (r.level) stat.byLevel[r.level]++
    }
    return Object.values(statsMap).sort((a, b) => b.total - a.total)
  }

  function getDateRangeForStats(startDate, endDate) {
    const tid = useTeamStore().currentTeamId
    const dates = new Set()
    for (const r of records.value) {
      if (r.type === 'pull_end') continue
      if (r.teamId !== tid) continue
      if (r.date >= startDate && r.date <= endDate) dates.add(r.date)
    }
    return Array.from(dates).sort()
  }

  // --- 删除记录 ---
  function deleteRecord(id) {
    records.value = records.value.filter(r => r.id !== id)
    persist()
  }

  function deletePull(date, pullNumber) {
    const tid = useTeamStore().currentTeamId
    records.value = records.value.filter(
      r => !(r.date === date && r.pullNumber === pullNumber && r.teamId === tid)
    )
    persist()
  }

  const activeDates = computed(() => {
    const tid = useTeamStore().currentTeamId
    const dates = new Set()
    for (const r of records.value) {
      if (r.type !== 'pull_end' && r.teamId === tid) dates.add(r.date)
    }
    return Array.from(dates).sort().reverse()
  })

  function updatePhaseOrder(newOrder) {
    const teamStore = useTeamStore()
    teamStore.currentPhaseOrder = [...newOrder]
  }

  // --- 加精 Pull ---
  const STARRED_KEY = 'ff14_raid_starred_pulls'
  const starredPulls = ref(loadStarred())

  function loadStarred() {
    try { return JSON.parse(localStorage.getItem(STARRED_KEY) || '[]') } catch { return [] }
  }
  function saveStarred() {
    localStorage.setItem(STARRED_KEY, JSON.stringify(starredPulls.value))
  }

  function toggleStar(date, pullNumber) {
    const key = `${date}||${pullNumber}`
    const idx = starredPulls.value.indexOf(key)
    if (idx === -1) {
      starredPulls.value.push(key)
    } else {
      starredPulls.value.splice(idx, 1)
    }
    saveStarred()
  }

  function isStarred(date, pullNumber) {
    return starredPulls.value.includes(`${date}||${pullNumber}`)
  }

  // 获取指定队伍的总 Pull 数
  function getTeamPullCount(teamId) {
    const keys = new Set()
    for (const r of records.value) {
      if (r.teamId === teamId && r.type !== 'pull_end') {
        keys.add(`${r.date}||${r.pullNumber}`)
      }
    }
    return keys.size
  }

  // 获取指定队伍的错误/进度计数
  function getTeamRecordCounts(teamId) {
    let mistakes = 0, progress = 0
    for (const r of records.value) {
      if (r.teamId !== teamId) continue
      if (r.type === 'mistake') mistakes++
      else if (r.type === 'progress') progress++
    }
    return { mistakes, progress }
  }

  return {
    records,
    teamRecords,
    phaseOrder,
    activeDates,
    getPhaseValue,
    getPhaseLabel,
    getPhaseNameByValue,
    getCurrentPullNumber,
    isPullEnded,
    addMistakes,
    addMistake,
    addProgress,
    markPullCleared,
    endCurrentPull,
    getRecordsByDate,
    getRecordsByDateRange,
    getDailyPullSummary,
    getProgressionData,
    getPlayerMistakeStats,
    getDateRangeForStats,
    deleteRecord,
    deletePull,
    updatePhaseOrder,
    starredPulls,
    toggleStar,
    isStarred,
    getTeamPullCount,
    getTeamRecordCounts,
    migrateIfNeeded,
    persist
  }
})
