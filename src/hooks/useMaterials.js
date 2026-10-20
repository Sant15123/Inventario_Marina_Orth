import { useCallback, useEffect, useState } from 'react'
import { inventoryApi } from '../services/inventoryApi'

export function useMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await inventoryApi.getAll()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createMaterial = useCallback(
    async (data) => {
      try {
        const created = await inventoryApi.create(data)
        setMaterials((prev) => [created, ...prev])
        return created
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [],
  )

  const updateMaterial = useCallback(
    async (id, patch) => {
      try {
        const updated = await inventoryApi.update(id, patch)
        setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)))
        return updated
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [],
  )

  const removeMaterial = useCallback(
    async (id) => {
      try {
        await inventoryApi.remove(id)
        setMaterials((prev) => prev.filter((m) => m.id !== id))
      } catch (e) {
        setError(e.message)
        throw e
      }
    },
    [],
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
