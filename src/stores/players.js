import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadPlayers, savePlayers, generateId } from '../utils/storage'
import { useTeamStore } from './teams'
import { useRecordStore } from './records'

// 固定队 8 个位置
export const ROLES = ['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4']

export const ROLE_LABELS = {
  MT: 'MT 主坦',
  ST: 'ST 副坦',
  H1: 'H1 主奶',
  H2: 'H2 副奶',
  D1: 'D1 近战',
  D2: 'D2 近战',
  D3: 'D3 远敏',
  D4: 'D4 法系'
}

export const usePlayerStore = defineStore('players', () => {
  const players = ref(loadPlayers())

  // 保存到 localStorage
  function persist() {
    savePlayers(players.value)
  }

  // ---- 数据迁移：旧数据没有 teamId / active 字段 ----
  function migrateIfNeeded() {
    const teamStore = useTeamStore()
    const team = teamStore.currentTeam
    if (!team) return
    let changed = false
    for (const p of players.value) {
      if (!p.teamId) {
        p.teamId = team.id
        changed = true
      }
      if (p.active === undefined) {
        p.active = true
        changed = true
      }
    }
    if (changed) persist()
  }

  // 获取当前队伍的队员
  const teamPlayers = computed(() => {
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    if (!tid) return players.value
    return players.value.filter(p => p.teamId === tid)
  })

  // 添加成员
  function addPlayer(name, role = '', jobs = []) {
    if (!name.trim()) return null
    const teamStore = useTeamStore()
    const tid = teamStore.currentTeamId
    if (!tid) return null

    const exists = teamPlayers.value.find(p => p.name === name.trim())
    if (exists) return exists

    const player = {
      id: generateId(),
      teamId: tid,
      name: name.trim(),
      role: role || '',
      jobs: jobs,
      active: true,
      createdAt: new Date().toISOString()
    }
    players.value.push(player)
    persist()
    return player
  }

  // 删除成员
  function removePlayer(id) {
    const player = players.value.find(p => p.id === id)
    const playerName = player?.name || '未知'
    players.value = players.value.filter(p => p.id !== id)
    const recordStore = useRecordStore()
    const pullsToFix = new Map()
    const toRemove = []
    for (const r of recordStore.records) {
      if (r.playerId === id && r.type === 'mistake') {
        const key = `${r.date}||${r.pullNumber}`
        if (!pullsToFix.has(key)) pullsToFix.set(key, { date: r.date, pullNumber: r.pullNumber, records: [] })
        pullsToFix.get(key).records.push(r)
        toRemove.push(r)
      }
    }
    recordStore.records = recordStore.records.filter(r => !toRemove.includes(r))
    for (const [, info] of pullsToFix) {
      const remaining = recordStore.records.filter(r => r.date === info.date && r.pullNumber === info.pullNumber)
      const hasPullEnd = remaining.some(r => r.type === 'pull_end')
      const hasMistake = remaining.some(r => r.type === 'mistake')
      if (!hasPullEnd && !hasMistake) {
        // 该把没有结束标记且没有犯错了 → 补进度 + 结束
        const phase = [...info.records, ...remaining].map(r => r.phase).filter(Boolean).pop() || ''
        const firstRec = info.records[0]
        const levelMap = { death:'减员', wipe:'团灭', enrage:'狂暴', unforgivable:'罪无可恕', equipment:'设备故障' }
        const levelText = levelMap[firstRec?.level] || firstRec?.level || ''
        const duty = info.records.find(r => r.duty)?.duty || remaining.find(r => r.duty)?.duty || ''
        const tid = remaining[0]?.teamId || info.records[0]?.teamId || ''
        recordStore.records.push({
          id: 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
          type: 'progress', teamId: tid, duty,
          date: info.date, pullNumber: info.pullNumber, phase,
          notes: `${playerName} ${phase}-${levelText} 已删除`,
          timestamp: new Date().toISOString()
        })
        recordStore.records.push({
          id: 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
          type: 'pull_end', teamId: tid, duty,
          date: info.date, pullNumber: info.pullNumber, phase: '',
          timestamp: new Date().toISOString()
        })
      } else if (!hasPullEnd && hasMistake) {
        // 还有犯错但没结束标记 → 补进度 + 结束
        const phase = [...info.records, ...remaining].map(r => r.phase).filter(Boolean).pop() || ''
        const duty = remaining.find(r => r.duty)?.duty || info.records.find(r => r.duty)?.duty || ''
        const tid = remaining[0]?.teamId || info.records[0]?.teamId || ''
        recordStore.records.push({
          id: 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
          type: 'progress', teamId: tid, duty,
          date: info.date, pullNumber: info.pullNumber, phase,
          notes: `${playerName} 记录已删除`,
          timestamp: new Date().toISOString()
        })
        recordStore.records.push({
          id: 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
          type: 'pull_end', teamId: tid, duty,
          date: info.date, pullNumber: info.pullNumber, phase: '',
          timestamp: new Date().toISOString()
        })
      }
    }
    recordStore.persist()
    persist()
  }

  // 更新成员
  function updatePlayer(id, data) {
    const idx = players.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      players.value[idx] = { ...players.value[idx], ...data }
      persist()
    }
  }

  // 按名称查找
  function findByName(name) {
    return teamPlayers.value.find(p => p.name === name)
  }

  // 所有成员名称列表
  const playerNames = computed(() =>
    teamPlayers.value.map(p => p.name)
  )

  // 当前队伍上场队员（active=true）
  const activeTeamPlayers = computed(() =>
    teamPlayers.value.filter(p => p.active !== false)
  )

  // 按角色分组（仅当前队伍）
  const playersByRole = computed(() => {
    const map = {}
    for (const role of ROLES) {
      map[role] = teamPlayers.value.filter(p => p.role === role)
    }
    return map
  })

  // 按角色分组（仅上场队员，犯错记录用）
  const activePlayersByRole = computed(() => {
    const map = {}
    for (const role of ROLES) {
      map[role] = activeTeamPlayers.value.filter(p => p.role === role)
    }
    return map
  })

  // 切换上下场
  function toggleActive(id) {
    const player = players.value.find(p => p.id === id)
    if (player) {
      player.active = !(player.active !== false)
      persist()
    }
  }

  // 获取某个角色下的所有队员
  function getPlayersByRole(role) {
    return teamPlayers.value.filter(p => p.role === role)
  }

  // 获取队员的角色显示名
  function getRoleLabel(role) {
    return ROLE_LABELS[role] || role || '未分配'
  }

  // 获取队员所在队伍
  function getPlayerTeam(playerId) {
    const teamStore = useTeamStore()
    const p = players.value.find(pl => pl.id === playerId)
    if (!p || !p.teamId) return null
    return teamStore.teams.find(t => t.id === p.teamId) || null
  }

  return {
    players,
    teamPlayers,
    activeTeamPlayers,
    activePlayersByRole,
    playerNames,
    playersByRole,
    addPlayer,
    removePlayer,
    updatePlayer,
    toggleActive,
    findByName,
    getPlayersByRole,
    getRoleLabel,
    getPlayerTeam,
    migrateIfNeeded,
    persist
  }
})
