import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadPlayers, savePlayers, generateId } from '../utils/storage'
import { useTeamStore } from './teams'

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

  // ---- 数据迁移：旧数据没有 teamId，自动关联到当前队伍 ----
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
      createdAt: new Date().toISOString()
    }
    players.value.push(player)
    persist()
    return player
  }

  // 删除成员
  function removePlayer(id) {
    players.value = players.value.filter(p => p.id !== id)
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

  // 按角色分组（仅当前队伍）
  const playersByRole = computed(() => {
    const map = {}
    for (const role of ROLES) {
      map[role] = teamPlayers.value.filter(p => p.role === role)
    }
    return map
  })

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
    playerNames,
    playersByRole,
    addPlayer,
    removePlayer,
    updatePlayer,
    findByName,
    getPlayersByRole,
    getRoleLabel,
    getPlayerTeam,
    migrateIfNeeded,
    persist
  }
})
