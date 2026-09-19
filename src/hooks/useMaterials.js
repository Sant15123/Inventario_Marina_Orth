import { useCallback, useEffect, useState } from 'react'
import { inventoryApi } from '../services/inventoryApi'
import { initialMaterials, STORAGE_KEY } from '../features/inventory/materials'

export function useMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const persist = (items) => {
    setMaterials(items)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }

  const fallback = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : initialMaterials
    } catch {
      return initialMaterials
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await inventoryApi.getAll()
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        /* ignore */
      }
      setMaterials(data)
    } catch (e) {
      setError(e.message)
      persist(fallback())
    } finally {
      setLoading(false)
    }
  }, [])

  const createMaterial = useCallback(
    async (data) => {
      try {
        const created = await inventoryApi.create(data)
        persist([created, ...materials])
        return created
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [materials],
  )

  const updateMaterial = useCallback(
    async (id, patch) => {
      try {
        const updated = await inventoryApi.update(id, patch)
        persist(materials.map((m) => (m.id === id ? updated : m)))
        return updated
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [materials],
  )

  const removeMaterial = useCallback(
    async (id) => {
      try {
        await inventoryApi.remove(id)
        persist(materials.filter((m) => m.id !== id))
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [materials],
  )

  useEffect(() => {
    load()
  }, [load])

  return {
    materials,
    loading,
    error,
    createMaterial,
    updateMaterial,
    removeMaterial,
    refresh: load,
  }
}
