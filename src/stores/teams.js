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

  // 自动迁移：旧 duty 字段 → duties 数组
  function migrateTeamDuties() {
    let changed = false
    for (const t of teams.value) {
      if (t.duty !== undefined) {
        t.duties = t.duty ? [t.duty] : []
        delete t.duty
        changed = true
      }
      if (!t.duties) t.duties = []
    }
    if (changed) persistTeams()
  }
  migrateTeamDuties()

  // 自动迁移：旧 phaseOrder 字段 → phaseOrders 字典
  function migratePhaseOrders() {
    let changed = false
    for (const t of teams.value) {
      if (!t.phaseOrders && t.phaseOrder) {
        t.phaseOrders = {}
        // 把旧的 phaseOrder 归到第一个 duty（或 _default）
        const key = t.duties?.[0] || '_default'
        t.phaseOrders[key] = [...t.phaseOrder]
        delete t.phaseOrder
        changed = true
      }
      if (!t.phaseOrders) {
        t.phaseOrders = {}
        changed = true
      }
    }
    if (changed) persistTeams()
  }
  migratePhaseOrders()

  // 自动迁移：如果没有队伍但有队员/记录，创建默认队伍
  function ensureDefaultTeam() {
    if (teams.value.length > 0) return
    const hasPlayers = localStorage.getItem('ff14_raid_players')
    const hasRecords = localStorage.getItem('ff14_raid_records')
    if (hasPlayers || hasRecords) {
      const team = addTeam('默认队伍', [])
      currentTeamId.value = team.id
      persistCurrentId()
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

  // 当前队伍的"当前副本"
  const currentDuty = ref('')

  function getPhaseOrderForDuty(duty) {
    if (duty && DUTY_PHASES[duty]) return [...DUTY_PHASES[duty]]
    return [...DEFAULT_PHASE_ORDER]
  }

  function ensureCompleted(order) {
    if (!order.includes('已完成')) order.push('已完成')
    return order
  }

  const currentPhaseOrder = computed({
    get() {
      const t = currentTeam.value
      if (!t) return ensureCompleted([...DEFAULT_PHASE_ORDER])
      const duty = currentDuty.value
      // 1. 当前副本已有自定义阶段
      if (duty && t.phaseOrders?.[duty]) {
        return ensureCompleted([...t.phaseOrders[duty]])
      }
      // 2. 当前副本有预定义阶段（尚未自定义）
      if (duty && DUTY_PHASES[duty]) {
        return ensureCompleted([...DUTY_PHASES[duty]])
      }
      // 3. 旧版 phaseOrder 兜底
      if (t.phaseOrder) {
        return ensureCompleted([...t.phaseOrder])
      }
      return ensureCompleted([...DEFAULT_PHASE_ORDER])
    },
    set(val) {
      const t = teams.value.find(t => t.id === currentTeamId.value)
      if (!t) return
      if (!t.phaseOrders) t.phaseOrders = {}
      const duty = currentDuty.value || '_default'
      t.phaseOrders[duty] = [...val]
      persistTeams()
    }
  })

  function setPhaseOrderForDuty(duty, order) {
    const t = teams.value.find(t => t.id === currentTeamId.value)
    if (!t) return
    if (!t.phaseOrders) t.phaseOrders = {}
    const key = duty || '_default'
    t.phaseOrders[key] = [...order]
    persistTeams()
  }

  function setCurrentDuty(duty) {
    currentDuty.value = duty || ''
    if (duty) {
      const t = teams.value.find(t => t.id === currentTeamId.value)
      if (t) {
        if (!t.phaseOrders) t.phaseOrders = {}
        // 该副本没有自定义阶段时，自动用预定义初始化
        if (!t.phaseOrders[duty] && DUTY_PHASES[duty]) {
          t.phaseOrders[duty] = [...DUTY_PHASES[duty]]
          persistTeams()
        } else if (!t.phaseOrders[duty]) {
          t.phaseOrders[duty] = [...DEFAULT_PHASE_ORDER]
          persistTeams()
        }
      }
    }
  }

  function addTeam(name, duties = []) {
    if (!name.trim()) return null
    if (typeof duties === 'string') duties = duties ? [duties] : [] // backward compat
    const phaseOrders = {}
    for (const d of duties) {
      phaseOrders[d] = getPhaseOrderForDuty(d)
    }
    if (duties.length === 0) {
      phaseOrders._default = [...DEFAULT_PHASE_ORDER]
    }
    const team = {
      id: generateId(),
      name: name.trim(),
      duties,
      phaseOrders,
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
      const existing = teams.value[idx]
      const newDuties = data.duties || existing.duties
      // 合并 phaseOrders：保留已有副本的阶段，新增副本用默认值
      const phaseOrders = { ...(existing.phaseOrders || {}) }
      for (const d of newDuties) {
        if (!phaseOrders[d]) {
          phaseOrders[d] = getPhaseOrderForDuty(d)
        }
      }
      teams.value[idx] = { ...existing, ...data, phaseOrders }
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
    currentDuty,
    currentPhaseOrder,
    DEFAULT_PHASE_ORDER,
    addTeam,
    removeTeam,
    updateTeam,
    setCurrentTeam,
    setCurrentDuty,
    setPhaseOrderForDuty,
    getPhaseOrderForDuty,
    migrateTeamDuties,
    ensureDefaultTeam,
    persistTeams
  }
})
