/**
 * LocalStorage 封装，负责数据的序列化与反序列化
 */

const KEYS = {
  TEAMS: 'ff14_raid_teams',
  PLAYERS: 'ff14_raid_players',
  RECORDS: 'ff14_raid_records',
  PHASE_ORDER: 'ff14_phase_order',
  CURRENT_TEAM_ID: 'ff14_current_team_id',
  CURRENT_SESSION_ID: 'ff14_current_session_id'
}

function read(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch (e) {
    console.error(`读取 ${key} 失败:`, e)
    return defaultValue
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`写入 ${key} 失败:`, e)
  }
}

// --- Teams ---

export function loadTeams() {
  return read(KEYS.TEAMS, [])
}

export function saveTeams(teams) {
  write(KEYS.TEAMS, teams)
}

export function loadCurrentTeamId() {
  return read(KEYS.CURRENT_TEAM_ID, null)
}

export function saveCurrentTeamId(id) {
  write(KEYS.CURRENT_TEAM_ID, id)
}

// --- Players ---

export function loadPlayers() {
  return read(KEYS.PLAYERS, [])
}

export function savePlayers(players) {
  write(KEYS.PLAYERS, players)
}

// --- Records (Mistakes + Progress) ---

export function loadRecords() {
  return read(KEYS.RECORDS, [])
}

export function saveRecords(records) {
  write(KEYS.RECORDS, records)
}

// --- Phase Order ---

export function loadPhaseOrder() {
  return read(KEYS.PHASE_ORDER, null)
}

export function savePhaseOrder(order) {
  write(KEYS.PHASE_ORDER, order)
}

// --- Current Session ID ---

export function loadCurrentSessionId() {
  return read(KEYS.CURRENT_SESSION_ID, null)
}

export function saveCurrentSessionId(id) {
  write(KEYS.CURRENT_SESSION_ID, id)
}

// --- 生成唯一 ID ---
export function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}
