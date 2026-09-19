// src/features/quotes/quotes.js

export const STORAGE_KEY = 'marina-orth:quotes'

export const quoteSchema = {
  id: 'string',
  cliente: 'string',
  items: 'array', // [{ id, nombre, precio, quantity }]
  subtotal: 'number',
  tax: 'number',
  total: 'number',
  createdAt: 'string',
  updatedAt: 'string',
}

export function blankQuoteDraft() {
  return {
    cliente: '',
    items: [],
  }
}