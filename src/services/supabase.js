// ─────────────────────────────────────────────────────────────
//  GREEN REGION — Supabase client
//  Файл: src/services/supabase.js
//
//  КУДА ВСТАВЛЯТЬ КЛЮЧИ:
//  Замени две строки ниже своими значениями из Supabase Console
//  Supabase Console → Project Settings → API
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://ppodjbzvpfejmbaxawfq.supabase.co'   // ← вставь сюда
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwb2RqYnp2cGZlam1iYXhhd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzk0NTMsImV4cCI6MjA4ODgxNTQ1M30.GnMfvglVxcZKVq4ueJmL_Zqz2YFJ83tMcUKO8tq2ct8'                    // ← вставь сюда

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,   // нужно для OAuth redirect
  },
})

// ─────────────────────────────────────────────────────────────
//  Готовые хелперы — используются в App.jsx
// ─────────────────────────────────────────────────────────────

/** Войти через Google (редирект обратно на сайт) */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

/** Выйти */
export async function signOut() {
  await supabase.auth.signOut()
}

/** Текущая сессия */
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Загрузить профиль пользователя из таблицы profiles */
export async function getProfile(uid) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('uid', uid)
    .single()
  return data
}

/** Создать или обновить профиль */
export async function upsertProfile(uid, fields) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ uid, ...fields }, { onConflict: 'uid' })
  if (error) throw error
}

/** Загрузить заказы пользователя */
export async function getOrders(uid) {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false })
  return data || []
}

/** Сохранить новый заказ */
export async function insertOrder(uid, order) {
  const { error } = await supabase
    .from('orders')
    .insert({ uid, ...order })
  if (error) throw error
}

/** Загрузить ВСЕ заказы всех пользователей (для аналитики)
 *
 * ЕСЛИ ДАННЫЕ НЕ ПОКАЗЫВАЮТСЯ (всё 0) — Supabase RLS блокирует анонимные запросы.
 * Выполни ОДИН РАЗ в Supabase Dashboard → SQL Editor → New query:
 *
 *   -- Вариант 1 (проще): открывает SELECT для всех:
 *   CREATE POLICY "anon_analytics_read" ON public.orders FOR SELECT USING (true);
 *
 *   -- Вариант 2: RPC-функция (работает даже с RLS):
 *   CREATE OR REPLACE FUNCTION public.get_orders_analytics()
 *   RETURNS TABLE(uid text, order_number text, total numeric,
 *                 created_at timestamptz, currency_symbol text, items_text text)
 *   LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 *     SELECT uid::text, order_number, total::numeric, created_at,
 *            currency_symbol, items_text
 *     FROM orders ORDER BY created_at ASC;
 *   $$;
 *   GRANT EXECUTE ON FUNCTION public.get_orders_analytics() TO anon, authenticated;
 */
export async function getAllOrders() {
  // Прямой запрос идёт первым — возвращает все поля включая items_text
  const { data, error } = await supabase
    .from('orders')
    .select('uid, order_number, total, created_at, currency_symbol, items_text')
    .order('created_at', { ascending: true })
    .limit(5000)            // prevent default 1000-row Supabase page cap
  if (!error && Array.isArray(data) && data.length > 0) return data

  // Фолбак: RPC (работает даже если RLS закрыт политикой)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_orders_analytics')
  if (!rpcErr && Array.isArray(rpcData)) return rpcData

  if (error) console.error('[Supabase] getAllOrders blocked:', error.code, '-', error.message,
    '\n→ Run SQL from supabase.js comments to fix RLS access.')
  return []
}

/**
 * Подписка на INSERT в таблицу orders в реальном времени.
 * Требует: Supabase Dashboard → Database → Replication → включить таблицу orders.
 * Возвращает функцию отписки.
 */
export function subscribeAllOrders(onInsert) {
  const channel = supabase
    .channel('global-orders-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      payload => onInsert(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/** Загрузить ВСЕ заказы со всеми полями (для панели менеджера) */
export async function getAllOrdersFull() {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)
  return data || []
}

/** Обновить статус заказа */
export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
