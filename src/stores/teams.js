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

  // 副本专属阶段
  const DUTY_PHASES = {
    '究极神兵绝境战': [
      'P1风圈前','P1风圈','P1挡枪','P1接线',
      'P2火神柱前','P2火神柱','P2火神AOE后','P2火神冲',
      'P3流沙','P3三连桶','P3石牢','P3运动会',
      'P4转场','P4一运','P4二运','P4三运','P4撞球','P4家长会','P4狂暴',
      '已完成'
    ],
    '幻想龙诗歼灭战': [
      'P1AOE与分摊','P1多维空间斩（黑洞）','P1光芒剑（冲锋）','P1索尼','P1狂暴',
      'P1.5',
      'P2一运','P2远近剑','P2陨石','P2狂暴',
      'P3转场','P3一运','P3二运','P3狂暴',
      'P4撞球','P4幻象冲','P4狂暴',
      'P4.5引导','P4.5战女神之枪',
      'P5一运','P5二运','P5狂暴',
      'P6一冰火线','P6一分摊','P6一远近死刑','P6十字火','P6二分摊','P6二远近','P6二冰火线','P6双龙俯冲','P6狂暴',
      'P7转场','P7一地火','P7一踩塔','P7一陨石','P7二地火','P7二踩塔','P7二陨石','P7三地火','P7三踩塔','P7狂暴',
      '已完成'
    ]
  }

  function getPhaseOrder(duty) {
    if (DUTY_PHASES[duty]) return [...DUTY_PHASES[duty]]
    return [...DEFAULT_PHASE_ORDER]
  }

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
      phaseOrder: getPhaseOrder(duty),
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
