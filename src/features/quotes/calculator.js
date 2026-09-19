export const QUOTE_TAX_RATE = 0.16

export function calculateQuote(items, taxRate = QUOTE_TAX_RATE) {
  const subtotal = (items || []).reduce(
    (sum, item) => {
      const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || 0)
      return sum + lineTotal
    },
    0,
  )

  const tax = subtotal * taxRate
  const total = subtotal + tax

  return {
    items: items || [],
    subtotal: round(subtotal),
    tax: round(tax),
    total: round(total),
  }
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
