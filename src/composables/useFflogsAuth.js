import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const K_ID = 'ff14_fflogs_id'
const K_SEC = 'ff14_fflogs_secret'
const K_TOKEN = 'ff14_fflogs_manual_token'

const TOKEN_URL = 'https://www.fflogs.com/oauth/token'
const API_URL = 'https://www.fflogs.com/api/v2/client'

const RATE_LIMIT_QUERY = `query { rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }`

// 单例状态，延迟初始化
let _instance = null

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function createAuth() {
  // 处理可能被双重编码的值
  function cleanValue(raw) {
    if (!raw) return ''
    let v = raw.trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    return v
  }
  const clientId = ref(cleanValue(localStorage.getItem(K_ID)))
  const clientSecret = ref(cleanValue(localStorage.getItem(K_SEC)))
  const manualToken = ref(cleanValue(localStorage.getItem(K_TOKEN)))
  const rateLimit = ref(null)
  const rateError = ref('')
  let token = manualToken.value || ''
  let tokExp = token ? Infinity : 0

  watch(clientId, v => localStorage.setItem(K_ID, v))
  watch(clientSecret, v => localStorage.setItem(K_SEC, v))
  watch(manualToken, v => { localStorage.setItem(K_TOKEN, v || ''); token = v || ''; tokExp = v ? Infinity : 0 })

  const hasCredential = computed(() => !!(manualToken.value || (clientId.value && clientSecret.value)))
  const rateRemaining = computed(() => {
    if (!rateLimit.value) return 0
    return Math.max(0, rateLimit.value.limitPerHour - rateLimit.value.pointsSpentThisHour)
  })

  function formatReset(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
    return `${m}分${String(s).padStart(2, '0')}秒`
  }

  const rateResetText = computed(() => {
    if (!rateLimit.value) return ''
    return `${formatReset(rateLimit.value.pointsResetIn)}后重置`
  })

  async function getToken() {
    if (token && Date.now() < tokExp) return token
    if (manualToken.value) { token = manualToken.value; tokExp = Infinity; return token }
    const r = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId.value, client_secret: clientSecret.value })
    })
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error_description || `认证失败 ${r.status}`) }
    const d = await r.json(); token = d.access_token; tokExp = Date.now() + (d.expires_in - 60) * 1000; return token
  }

  async function requestJson(url, options, abortSignal, retries = 3) {
    for (let i = 1; i <= retries; i++) {
      try {
        const resp = await fetch(url, { ...options, signal: abortSignal })
        const text = await resp.text()
        let payload = null
        try { payload = text ? JSON.parse(text) : {} } catch { throw new Error(`响应不是 JSON：${text.slice(0, 180)}`) }
        if (resp.status === 429) throw new Error('429 限流：每小时额度已用完')
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(payload).slice(0, 300)}`)
        return payload
      } catch (e) {
        if (e.name === 'AbortError') throw e
        if (e.message.startsWith('429')) throw e
        if (i < retries) { await sleep(800 * i); continue }
        throw e
      }
    }
  }

  async function graphQL(query, variables, abortSignal) {
    const t = await getToken()
    const payload = await requestJson(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    }, abortSignal)
    if (payload.errors?.length) {
      const msg = payload.errors.map(e => e.message).join('\n')
      const err = new Error(msg)
      err.isComplexity = msg.includes('Max query complexity')
      throw err
    }
    return payload.data
  }

  async function refreshRateLimit() {
    const data = await graphQL(RATE_LIMIT_QUERY, {}, null)
    rateLimit.value = data.rateLimitData
  }

  watch(hasCredential, async (v) => {
    if (v) {
      rateError.value = ''
      try { await refreshRateLimit() } catch (e) {
        rateError.value = e.message.includes('429') ? '被限流，等重置' : '查询失败'
      }
    } else {
      rateError.value = ''
    }
  }, { immediate: true })

  function clearCredentials() {
    clientId.value = ''; clientSecret.value = ''; manualToken.value = ''
    rateLimit.value = null; token = ''; tokExp = 0
    ElMessage.success('凭证已清除')
  }

  return {
    clientId, clientSecret, manualToken, rateLimit, rateError,
    hasCredential, rateRemaining, rateResetText,
    getToken, graphQL, refreshRateLimit, clearCredentials, requestJson,
    API_URL
  }
}

export function useFflogsAuth() {
  if (!_instance) _instance = createAuth()
  return _instance
}
