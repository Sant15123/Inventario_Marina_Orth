// src/hooks/useQuotes.js
import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEY } from '../features/quotes/quotes'

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function useQuotes() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setQuotes(loadFromStorage())
    setLoading(false)
  }, [])

  const createQuote = useCallback((data) => {
    const now = new Date().toISOString()
    const created = {
      id: `quote-${Date.now()}`,
      cliente: data.cliente || 'Sin nombre',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      createdAt: now,
      updatedAt: now,
    }
    setQuotes((prev) => {
      const next = [created, ...prev]
      saveToStorage(next)
      return next
    })
    return created
  }, [])

  const updateQuote = useCallback((id, patch) => {
    setQuotes((prev) => {
      const next = prev.map((q) =>
        q.id === id
          ? { ...q, ...patch, updatedAt: new Date().toISOString() }
          : q,
      )
      saveToStorage(next)
      return next
    })
  }, [])

  const removeQuote = useCallback((id) => {
    setQuotes((prev) => {
      const next = prev.filter((q) => q.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  return {
    quotes,
    loading,
    createQuote,
    updateQuote,
    removeQuote,
  }
}