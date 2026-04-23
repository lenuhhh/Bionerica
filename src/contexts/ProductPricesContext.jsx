import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

const Ctx = createContext({ prices: {}, loading: false, updatePrice: () => {}, refresh: () => {} })

export function ProductPricesProvider({ children }) {
  const [prices, setPrices]   = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    supabase.from('product_prices').select('*')
      .then(({ data }) => {
        const map = {}
        if (data) data.forEach(r => { map[String(r.product_id)] = r })
        setPrices(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    // Realtime — на случай если изменения пришли из другой вкладки/сессии
    const ch = supabase.channel('product_prices_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, payload => {
        if (payload.new) {
          setPrices(prev => ({ ...prev, [String(payload.new.product_id)]: payload.new }))
        }
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [refresh])

  // Вызывается менеджером сразу после сохранения — обновляет состояние мгновенно
  const updatePrice = useCallback((productId, data) => {
    setPrices(prev => ({
      ...prev,
      [String(productId)]: { ...prev[String(productId)], product_id: String(productId), ...data }
    }))
  }, [])

  return (
    <Ctx.Provider value={{ prices, loading, updatePrice, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useProductPricesCtx() {
  return useContext(Ctx)
}
