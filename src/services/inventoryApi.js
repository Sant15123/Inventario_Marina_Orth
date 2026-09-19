const API_BASE = import.meta.env.VITE_API_URL || '/api/inventory'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = json.message || `Error ${res.status}`
    const error = new Error(message)
    error.status = res.status
    throw error
  }
  return json
}

export const inventoryApi = {
  getAll: async () => {
    const json = await request('/')
    return Array.isArray(json.data) ? json.data : []
  },
  get: async (id) => {
    const json = await request(`/${id}`)
    return json.data
  },
  create: async (data) => {
    const json = await request('/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return json.data
  },
  update: async (id, data) => {
    const json = await request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return json.data
  },
  remove: async (id) => {
    await request(`/${id}`, { method: 'DELETE' })
    return true
  },
}

export default inventoryApi
