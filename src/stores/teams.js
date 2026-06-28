import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { loadTeams, saveTeams, loadCurrentTeamId, saveCurrentTeamId, generateId } from '../utils/storage'

// FF14 高难副本预设列表
export const DUTY_PRESETS = [
  '究极神兵绝境战',
  '巴哈姆特绝境战',
  '亚历山大绝境战',
  '欧米茄绝境验证战',
  '幻想龙诗歼灭战',
  '妖星乱舞绝境战',
  '当期零式1层',
  '当期零式2层',
  '当期零式3层',
  '当期零式4层'
]

export const useTeamStore = defineStore('teams', () => {
  const teams = ref(loadTeams())
  const currentTeamId = ref(loadCurrentTeamId())

  // 持久化
  function persistTeams() {
    saveTeams(teams.value)
  }

  function persistCurrentId() {
    saveCurrentTeamId(currentTeamId.value)
  }

  // 自动迁移：如果没有队伍但有队员/记录，创建默认队伍
  function ensureDefaultTeam() {
    if (teams.value.length > 0) return
    // 检查是否有遗留数据
    const hasPlayers = localStorage.getItem('ff14_raid_players')
    const hasRecords = localStorage.getItem('ff14_raid_records')
    if (hasPlayers || hasRecords) {
      const team = addTeam('默认队伍', '')
      currentTeamId.value = team.id
      persistCurrentId()
      // 标记现有数据属于该队伍（数据迁移在 store 初始化时处理）
      return team
    }
    return null
  }

  // 默认阶段顺序（新队伍初始值）
  const DEFAULT_PHASE_ORDER = [
    'P1', 'P1.5', 'P2', 'P2.5', 'P3', 'P3.5',
    'P4', 'P4.5', 'P5', 'P5.5', 'P6', 'P7', 'P8',
    '已完成'
  ]

  // 当前队伍的阶段顺序（可读写）
  const currentPhaseOrder = computed({
    get() {
      const t = currentTeam.value
      return t?.phaseOrder || DEFAULT_PHASE_ORDER
    },
    set(val) {
      const t = teams.value.find(t => t.id === currentTeamId.value)
      if (t) {
        t.phaseOrder = val
        persistTeams()
      }
    }
  })

  // CRUD
  function addTeam(name, duty = '') {
    if (!name.trim()) return null
    const team = {
      id: generateId(),
      name: name.trim(),
      duty: duty || '',
      phaseOrder: [...DEFAULT_PHASE_ORDER],
      createdAt: new Date().toISOString()
    }
    teams.value.push(team)
    persistTeams()
    return team
  }

  function removeTeam(id) {
    if (teams.value.length <= 1) return false
    teams.value = teams.value.filter(t => t.id !== id)
    // 如果删除的是当前队伍，切换到第一个
    if (currentTeamId.value === id) {
      currentTeamId.value = teams.value[0]?.id || null
      persistCurrentId()
    }
    persistTeams()
    return true
  }

  function updateTeam(id, data) {
    const idx = teams.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      teams.value[idx] = { ...teams.value[idx], ...data }
      persistTeams()
    }
  }

  function setCurrentTeam(id) {
    currentTeamId.value = id
    persistCurrentId()
  }

  // 当前队伍
  const currentTeam = computed(() =>
    teams.value.find(t => t.id === currentTeamId.value) || teams.value[0] || null
  )

  // 确保 currentTeamId 始终有效
  watch(teams, () => {
    if (!currentTeamId.value && teams.value.length > 0) {
      currentTeamId.value = teams.value[0].id
      persistCurrentId()
    }
    if (currentTeamId.value && !teams.value.find(t => t.id === currentTeamId.value)) {
      currentTeamId.value = teams.value[0]?.id || null
      persistCurrentId()
    }
  }, { immediate: true })

  return {
    teams,
    currentTeamId,
    currentTeam,
    currentPhaseOrder,
    DEFAULT_PHASE_ORDER,
    addTeam,
    removeTeam,
    updateTeam,
    setCurrentTeam,
    ensureDefaultTeam,
    persistTeams
  }
})
