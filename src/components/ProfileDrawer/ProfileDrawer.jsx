/**
 * ProfileDrawer — sidebar login + personal cabinet
 * Extracted from App.jsx so the main file stays lean.
 * Uses Supabase for auth + data, localStorage for offline cache.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  supabase,
  signInWithGoogle as sbSignInWithGoogle,
  signOut          as sbSignOut,
  getSession       as sbGetSession,
  getProfile       as sbGetProfile,
  upsertProfile    as sbUpsertProfile,
  getOrders        as sbGetOrders,
  getAllOrders      as sbGetAllOrders,
  subscribeAllOrders as sbSubscribeOrders,
} from '../../services/supabase.js';

/* ── Supabase helpers bundle ── */
const sb = {
  signInWithGoogle: sbSignInWithGoogle,
  signOut:          sbSignOut,
  getSession:       sbGetSession,
  getProfile:       sbGetProfile,
  upsertProfile:    sbUpsertProfile,
  getOrders:        sbGetOrders,
  getAllOrders:      sbGetAllOrders,
  subscribeOrders:  sbSubscribeOrders,
};

/* ── localStorage helpers ── */
const STORAGE_KEY = 'gr_user_v1';
export function loadProfile()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } }
export function saveProfile(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
export function clearProfile() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* ── Product → category map (used in PersonalChart) ── */
const CATS_KEY = ['vegetables','vegetables','flowers','fruits','vegetables','greens','exotic','flowers','vegetables','fruits','flowers','greens','fruits','fruits','fruits','flowers','flowers','greens','greens','greens','exotic','exotic','exotic','exotic','exotic'];
const PROD_CAT_MAP = (() => {
  const m = {};
  [
    ['cherry tomato','томат черрі'],['dutch cucumber','огірок голландський'],
    ['red rose holland','троянда червона'],['sochi strawberry','полуниця сочинська'],
    ['sweet pepper','перець солодкий'],['fresh basil','базилік свіжий'],
    ['lemon tree','лимонне дерево'],['white orchid','орхідея біла'],
    ['fresh broccoli','броколі свіжа'],['isabella grape','виноград ізабелла'],
    ['sunflower bouquet','букет соняшників'],['arugula mix','мікс руколи'],
    ['garden raspberry','малина садова'],['large blueberry','чорниця велика'],
    ['nectarine peach','нектарин персик'],['tulip mix','тюльпан мікс'],
    ['bush chrysanthemum','хризантема кущова'],['baby spinach','шпинат бейбі'],
    ['fresh cilantro','кінза свіжа'],['peppermint',"м'ята перцева"],
    ['passionfruit','маракуя'],['golden physalis','фізаліс золотий'],
    ['carambola','карамбола'],['dragon fruit','пітахая'],['hass avocado','авокадо хасс'],
  ].forEach(([en, ua], i) => { m[en] = CATS_KEY[i]; m[ua] = CATS_KEY[i]; });
  return m;
})();

/* ── Price lookup table (name → base UAH price) ── */
const PRICE_LOOKUP = {
  'cherry tomato':48,'томат черрі':48,'dutch cucumber':28,'огірок голландський':28,
  'red rose holland':65,'троянда червона':65,'sochi strawberry':90,'полуниця сочинська':90,
  'sweet pepper':42,'перець солодкий':42,'fresh basil':35,'базилік свіжий':35,
  'lemon tree':320,'лимонне дерево':320,'white orchid':280,'орхідея біла':280,
  'fresh broccoli':55,'броколі свіжа':55,'isabella grape':75,'виноград ізабелла':75,
  'sunflower bouquet':120,'букет соняшників':120,'arugula mix':38,'мікс руколи':38,
  'garden raspberry':110,'малина садова':110,'large blueberry':130,'чорниця велика':130,
  'nectarine peach':95,'нектарин персик':95,'tulip mix':85,'тюльпан мікс':85,
  'bush chrysanthemum':95,'хризантема кущова':95,'baby spinach':42,'шпинат бейбі':42,
  'fresh cilantro':28,'кінза свіжа':28,"peppermint":30,"м'ята перцева":30,
  'passionfruit':160,'маракуя':160,'golden physalis':145,'фізаліс золотий':145,
  'carambola':140,'карамбола':140,'dragon fruit':190,'пітахая':190,'hass avocado':95,'авокадо хасс':95,
};

/* ══════════════════════════════════════════════════════════════════════
   GLOBAL MARKET MINI — compact live terminal, works with/without login
══════════════════════════════════════════════════════════════════════ */
function GlobalMarketMini({ lang, cur }) {
  const [stats, setStats]         = useState(null);
  const [recent, setRecent]       = useState([]);
  const [sparkData, setSparkData] = useState([]);
  const [flash, setFlash]         = useState(0);

  const buildSpark = (orders) => {
    const DAYS = 14;
    const byDay = {};
    orders.forEach(o => {
      if (!o.created_at) return;
      const key = o.created_at.split('T')[0];
      byDay[key] = (byDay[key] || 0) + (o.total || 0);
    });
    const today = new Date(); today.setHours(0,0,0,0);
    const data = Array.from({ length: DAYS }, (_, idx) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (DAYS - 1 - idx));
      return byDay[d.toISOString().split('T')[0]] || 0;
    });
    setSparkData(data);
  };

  useEffect(() => {
    (async () => {
      let orders = [];
      try { orders = await sb.getAllOrders(); } catch {}
      const total   = orders.length;
      const revenue = orders.reduce((s, o) => s + (o.total||0), 0);
      const uids    = new Set(orders.map(o => o.uid).filter(Boolean));
      const avg     = total > 0 ? Math.round(revenue / total) : 0;
      setStats({ total, revenue, buyers: uids.size, avg });
      const sorted  = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
      setRecent(sorted);
      buildSpark(orders);
    })();
  }, []);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = sb.subscribeOrders(order => {
        setStats(prev => {
          if (!prev) return prev;
          const nr = prev.revenue + (order.total||0);
          const nt = prev.total + 1;
          return { ...prev, total: nt, revenue: nr, avg: Math.round(nr / nt) };
        });
        setRecent(prev => [order, ...prev].slice(0, 4));
        setSparkData(prev => {
          if (!prev.length) return prev;
          const next = [...prev];
          next[next.length - 1] = (next[next.length - 1] || 0) + (order.total || 0);
          return next;
        });
        setFlash(g => g + 1);
      });
    } catch {}
    return () => unsub();
  }, []);

  const sym  = cur?.symbol || '$';
  const fmtM = n => typeof n === 'number'
    ? (n >= 1000 ? sym + (n/1000).toFixed(1) + 'k' : sym + n)
    : '…';
  const gs = stats || { total:'…', revenue:'…', buyers:'…', avg:'…' };
  const SW = 300, SH = 44;
  const maxSpark = Math.max(...sparkData, 1);

  return (
    <div style={{ background:'var(--parchment,#ebe4d4)', borderRadius:16, border:'1px solid rgba(58,107,59,0.15)', marginBottom:16, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px 11px', borderBottom:'1px solid rgba(58,107,59,0.1)' }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'var(--forest,#1e3d1f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🌱</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', lineHeight:1 }}>
            {lang==='ua'?'Ринок Bionerika':lang==='ru'?'Рынок Bionerika':'Bionerika Market'}
          </div>
          <div style={{ fontSize:10, color:'var(--muted,#7a8c7a)', fontFamily:'var(--sans,Jost)', marginTop:2 }}>
            {lang==='ua'?'оновлення в реальному часі':lang==='ru'?'обновление в реальном времени':'live updates'}
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'block', animation:'termPulse 2s ease-in-out infinite' }}/>
          <span style={{ fontSize:9, color:'var(--lime,#7aaa40)', fontWeight:700, fontFamily:'var(--sans,Jost)', letterSpacing:'.06em' }}>LIVE</span>
        </div>
      </div>
      {/* 3 stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'12px 12px 10px', borderBottom:'1px solid rgba(58,107,59,0.1)' }}>
        {[
          { ico:'📦', l: lang==='ua'?'Замовлень':lang==='ru'?'Заказов':'Orders',    v: gs.total ?? '—' },
          { ico:'👥', l: lang==='ua'?'Покупців':lang==='ru'?'Покупателей':'Buyers', v: gs.buyers ?? '—' },
          { ico:'💰', l: lang==='ua'?'Сер.чек':lang==='ru'?'Ср.чек':'Avg',         v: fmtM(gs.avg) },
        ].map((s, i) => (
          <div key={i} style={{ background:'var(--white,#fdfcf8)', borderRadius:11, padding:'10px 8px', textAlign:'center', border:'1px solid rgba(58,107,59,0.1)' }}>
            <div style={{ fontSize:20, lineHeight:1, marginBottom:5 }}>{s.ico}</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontFamily:'var(--sans,Jost)', marginTop:4, lineHeight:1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Activity sparkline */}
      {sparkData.length > 0 && (
        <div style={{ padding:'10px 12px', borderBottom: recent.length>0 ? '1px solid rgba(58,107,59,0.1)' : 'none' }}>
          <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'var(--sans,Jost)', marginBottom:8 }}>
            {lang==='ua'?'Активність · 14 днів':lang==='ru'?'Активность · 14 дней':'Activity · 14 days'}
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32 }}>
            {sparkData.map((v, i) => {
              const h = v > 0 ? Math.max(4, (v / maxSpark) * 28) : 3;
              const isLast = i === sparkData.length - 1;
              return (
                <div key={i} style={{ flex:1, height:`${h}px`, borderRadius:2,
                  background: isLast ? 'var(--moss,#3a6b3b)' : 'rgba(58,107,59,0.22)',
                  alignSelf:'flex-end', transition:'background .2s' }}/>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {recent.length > 0 && (
        <div style={{ padding:'10px 12px 12px' }}>
          <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'var(--sans,Jost)', marginBottom:7 }}>
            {lang==='ua'?'Останні':lang==='ru'?'Последние':'Recent'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {recent.map((o, i) => (
              <div key={o.order_number||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'var(--white,#fdfcf8)', borderRadius:9, border:'1px solid rgba(58,107,59,0.09)' }}>
                <span style={{ fontSize:12, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)' }}>{o.order_number||'#—'}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)' }}>{o.currency_symbol||sym}{(o.total||0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PERSONAL ORDERS CHART — mini dark terminal inside profile drawer
══════════════════════════════════════════════════════════════════════ */
function PersonalChart({ orders, cur, lang }) {
  const [hov, setHov]         = useState(null);
  const [prodHov, setProdHov] = useState(null);

  const priceMap = useMemo(() => PRICE_LOOKUP, []);

  const prodSpend = useMemo(() => {
    const acc = {};
    orders.forEach(o => {
      if (!o.items_text) return;
      o.items_text.split(',').forEach(part => {
        const m = part.trim().match(/^(.+?)\s×(\d+)$/);
        if (!m) return;
        const name = m[1].trim(), qty = parseInt(m[2]);
        const pr   = priceMap[name.toLowerCase()] || 0;
        const line = Math.round(pr * cur.rate) * qty;
        if (!acc[name]) acc[name] = { total:0, qty:0 };
        acc[name].total += line;
        acc[name].qty   += qty;
      });
    });
    return Object.entries(acc)
      .map(([name, { total, qty }]) => ({ name, total, qty }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [orders, cur.rate, priceMap]);

  const calcOrdTotal = (o) => {
    if (o.items_text) {
      return o.items_text.split(',').reduce((s, part) => {
        const m = part.trim().match(/^(.+?)\s×(\d+)$/);
        if (!m) return s;
        const pr = priceMap[m[1].trim().toLowerCase()] || 0;
        return s + Math.round(pr * cur.rate) * parseInt(m[2]);
      }, 0);
    }
    return o.total || 0;
  };

  const byDay = useMemo(() => {
    const d = {};
    orders.forEach(o => {
      if (!o.created_at) return;
      const key = o.created_at.split('T')[0];
      if (!d[key]) d[key] = { total:0, count:0 };
      d[key].total += calcOrdTotal(o);
      d[key].count++;
    });
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, cur.rate]);

  const chartBars = useMemo(() =>
    Object.keys(byDay).filter(k => byDay[k].count > 0).sort().map(key => ({
      date:  new Date(key).toLocaleDateString(lang==='ua'||lang==='ru'?'ru-RU':'en-US', { day:'numeric', month:'short' }),
      total: byDay[key].total,
      count: byDay[key].count,
    }))
  , [byDay, lang]);

  const totalSpent = useMemo(() => orders.reduce((s, o) => s + calcOrdTotal(o), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, cur.rate]);
  const totalCount = orders.length;
  const avgOrder   = totalCount > 0 ? Math.round(totalSpent / totalCount) : 0;
  const isEmpty    = totalCount === 0;
  const maxTotal   = Math.max(...chartBars.map(d => d.total), 1);
  const maxProd    = prodSpend[0]?.total || 1;
  const nBars      = Math.max(chartBars.length, 1);
  const W=440, H=130, MB=20, MT=10, plotH=H-MB-MT;
  const CAT_COL = { vegetables:'#4ade80', fruits:'#fb923c', flowers:'#f472b6', greens:'#86efac', exotic:'#a78bfa', other:'#94a3b8' };

  if (isEmpty) return (
    <div style={{ background:'var(--parchment,#ebe4d4)', borderRadius:16, border:'1px solid rgba(58,107,59,0.13)', padding:'20px 16px', marginBottom:16, textAlign:'center' }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🌿</div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', marginBottom:6 }}>
        {lang==='ua'?'Ваша статистика':lang==='ru'?'Ваша статистика':'Your Statistics'}
      </div>
      <div style={{ fontSize:12, color:'var(--muted,#7a8c7a)', fontFamily:'var(--sans,Jost)', lineHeight:1.6 }}>
        {lang==='ua'?'Після першого замовлення тут’являться ваші покупки та аналітика':lang==='ru'?'После первого заказа здесь появится ваша аналитика':'After your first order, your purchases and analytics will appear here'}
      </div>
    </div>
  );

  return (
    <div style={{ background:'var(--parchment,#ebe4d4)', borderRadius:16, border:'1px solid rgba(58,107,59,0.13)', marginBottom:16, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px 10px', borderBottom:'1px solid rgba(58,107,59,0.1)' }}>
        <span style={{ fontSize:16 }}>📈</span>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)' }}>
          {lang==='ua'?'Ваша активність':lang==='ru'?'Ваша активность':'Your Activity'}
        </span>
      </div>

      {/* 3 stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'12px 12px 10px', borderBottom: chartBars.length > 0 || prodSpend.length > 0 ? '1px solid rgba(58,107,59,0.1)' : 'none' }}>
        {[
          { ico:'📦', l: lang==='ua'?'Замовлень':lang==='ru'?'Заказов':'Orders',        v: totalCount },
          { ico:'💳', l: lang==='ua'?'Витрачено':lang==='ru'?'Потрачено':'Spent',       v: cur.symbol+(totalSpent||0).toLocaleString() },
          { ico:'🧮', l: lang==='ua'?'Сер.чек':lang==='ru'?'Средний чек':'Avg',        v: cur.symbol+avgOrder },
        ].map((s, i) => (
          <div key={i} style={{ background:'var(--white,#fdfcf8)', borderRadius:11, padding:'10px 8px', textAlign:'center', border:'1px solid rgba(58,107,59,0.1)' }}>
            <div style={{ fontSize:18, lineHeight:1, marginBottom:5 }}>{s.ico}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', lineHeight:1 }}>{s.v}</div>
            <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontFamily:'var(--sans,Jost)', marginTop:4, lineHeight:1 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Order activity bars */}
      {chartBars.length > 0 && (
        <div style={{ padding:'12px 12px 10px', borderBottom: prodSpend.length > 0 ? '1px solid rgba(58,107,59,0.1)' : 'none' }}
          onMouseLeave={() => setHov(null)}>
          <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'var(--sans,Jost)', marginBottom:9 }}>
            {lang==='ua'?'Замовлення':lang==='ru'?'Заказы':'Orders'}
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:38 }}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const i = Math.min(chartBars.length-1, Math.max(0, Math.floor((e.clientX - rect.left) / rect.width * chartBars.length)));
              setHov(i);
            }}>
            {chartBars.map((d, i) => {
              const h = Math.max(4, (d.total / maxTotal) * 34);
              return (
                <div key={i} title={`${d.date}: ${cur.symbol}${d.total.toLocaleString()} · ${d.count}×`}
                  style={{ flex:1, height:`${h}px`, borderRadius:2, alignSelf:'flex-end', cursor:'default', transition:'background .12s',
                    background: hov===i ? 'var(--forest,#1e3d1f)' : 'rgba(58,107,59,0.3)' }}/>
              );
            })}
          </div>
          {hov !== null && chartBars[hov] && (
            <div style={{ marginTop:7, padding:'6px 10px', background:'var(--white,#fdfcf8)', borderRadius:9, border:'1px solid rgba(58,107,59,0.12)', display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'var(--sans,Jost)' }}>
              <span style={{ color:'var(--muted,#7a8c7a)' }}>{chartBars[hov].date}</span>
              <span style={{ fontWeight:700, color:'var(--dark,#141a14)' }}>{cur.symbol}{chartBars[hov].total.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
      {/* Top products */}
      {prodSpend.length > 0 && (
        <div style={{ padding:'12px 12px 14px' }}>
          <div style={{ fontSize:9, color:'var(--muted,#7a8c7a)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'var(--sans,Jost)', marginBottom:10 }}>
            {lang==='ua'?'Топ товарів':lang==='ru'?'Топ товаров':'Top products'}
          </div>
          {prodSpend.slice(0, 4).map((p, i) => {
            const pct = Math.round(p.total / maxProd * 100);
            return (
              <div key={i} style={{ marginBottom: i < Math.min(prodSpend.length,4)-1 ? 9 : 0 }}
                onMouseEnter={() => setProdHov(i)} onMouseLeave={() => setProdHov(null)}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', fontWeight: prodHov===i ? 600 : 400, transition:'font-weight .15s' }}>{p.name}</span>
                  <span style={{ fontSize:11, color: prodHov===i ? 'var(--dark,#141a14)' : 'var(--dark,#141a14)', fontFamily:'var(--sans,Jost)', fontWeight:600, transition:'color .15s', flexShrink:0, marginLeft:8 }}>
                    {cur.symbol}{p.total.toLocaleString()}
                  </span>
                </div>
                <div style={{ height:5, borderRadius:3, background:'rgba(58,107,59,0.1)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'var(--moss,#3a6b3b)', borderRadius:3, transition:'width .5s ease, background .15s',
                    background: prodHov===i ? 'var(--forest,#1e3d1f)' : 'var(--moss,#3a6b3b)' }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PROFILE DRAWER — Supabase + Google OAuth sidebar panel
══════════════════════════════════════════════════════════════════════ */
export default function ProfileDrawer({ open, onClose, lang, t, cur, onPage }) {
  const [profile, setProfile]   = useState(() => loadProfile());
  const [sbUser,  setSbUser]    = useState(null);
  const [orders,  setOrders]    = useState([]);
  const [tab,     setTab]       = useState('overview');
  const [loading, setLoading]   = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newAddr,  setNewAddr]  = useState('');
  const [saveMsg,  setSaveMsg]  = useState('');

  const isConfigured = true; // supabaseUrl is real in supabase.js

  useEffect(() => {
    setLoading(true);
    async function applySession(session) {
      if (!session) {
        setSbUser(null); setProfile(null); clearProfile(); setOrders([]);
        setLoading(false); return;
      }
      setSbUser(session.user);
      const meta = session.user.user_metadata || {};
      let dbProfile = await sb.getProfile(session.user.id);
      const merged = {
        uid:    session.user.id,
        name:   dbProfile?.name   || meta.full_name  || meta.name  || 'User',
        email:  session.user.email,
        avatar: dbProfile?.avatar || meta.avatar_url || meta.picture || null,
        level:  dbProfile?.level  || 'Bronze',
        points: dbProfile?.points || 0,
        createdAt: session.user.created_at,
        addresses: dbProfile?.addresses || [],
        transactions: dbProfile?.transactions || [],
      };
      saveProfile(merged);
      setProfile(merged);
      const dbOrders = await sb.getOrders(session.user.id);
      setOrders(Array.isArray(dbOrders) ? dbOrders : []);
      setLoading(false);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    sb.getSession().then(sess => {
      if (!sess) return;
      sb.getOrders(sess.user.id).then(dbOrders => {
        setOrders(Array.isArray(dbOrders) ? dbOrders : []);
      });
    });
  }, [open]);

  const lbl = lang==='ua' ? {
    title:'Мій кабінет', login:'Увійти через Google', logout:'Вийти',
    overview:'Огляд', orders:'Замовлення', addr:'Адреси', settings:'Налаштування',
    noOrders:'Замовлень ще немає',
    addAddr:'+ Додати адресу', save:'Зберегти', cancel:'Скасувати', edit:'Редагувати',
    welcome:'Ласкаво просимо!', welcomeSub:'Увійдіть через Google — швидко та безпечно.',
    googleBtn:'Продовжити з Google',
    name:'Ім\'я', email:'Email', points:'балів',
    totalOrders:'Замовлень', totalSpent:'Витрачено', bonusPoints:'Бонуси',
    member:'Учасник з', saved:'Збережено!',
    openAccount: 'Повний кабінет →',
  } : lang==='ru' ? {
    title:'Мой кабинет', login:'Войти через Google', logout:'Выйти',
    overview:'Обзор', orders:'Заказы', addr:'Адреса', settings:'Настройки',
    noOrders:'Заказов пока нет',
    addAddr:'+ Добавить адрес', save:'Сохранить', cancel:'Отмена', edit:'Редактировать',
    welcome:'Добро пожаловать!', welcomeSub:'Войдите через Google — быстро и безопасно.',
    googleBtn:'Продолжить с Google',
    name:'Имя', email:'Email', points:'баллов',
    totalOrders:'Заказов', totalSpent:'Потрачено', bonusPoints:'Бонусы',
    member:'Участник с', saved:'Сохранено!',
    openAccount: 'Открыть кабинет →',
  } : {
    title:'My Account', login:'Sign in with Google', logout:'Sign Out',
    overview:'Overview', orders:'Orders', addr:'Addresses', settings:'Settings',
    noOrders:'No orders yet',
    addAddr:'+ Add address', save:'Save', cancel:'Cancel', edit:'Edit',
    welcome:'Welcome!', welcomeSub:'Sign in with Google — fast and secure.',
    googleBtn:'Continue with Google',
    name:'Name', email:'Email', points:'points',
    totalOrders:'Orders', totalSpent:'Spent', bonusPoints:'Bonus pts',
    member:'Member since', saved:'Saved!',
    openAccount: 'Full account →',
  };

  const tabs = [
    { k:'overview', l: lbl.overview, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { k:'orders',   l: lbl.orders,   svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
    { k:'addr',     l: lbl.addr,     svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
    { k:'settings', l: lbl.settings, svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];

  const doGoogleLogin = () => { sb.signInWithGoogle(); };

  const doLogout = async () => {
    setLoading(true);
    await sb.signOut();
    clearProfile();
    setProfile(null); setSbUser(null); setOrders([]); setTab('overview');
    setLoading(false);
  };

  const doSaveEdit = async () => {
    const updated = { ...profile, ...editForm };
    saveProfile(updated); setProfile(updated);
    if (sbUser) await sb.upsertProfile(sbUser.id, { name: updated.name });
    setEditMode(false); setSaveMsg(lbl.saved);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const doAddAddress = async () => {
    if (!newAddr.trim()) return;
    const addr = { id: Date.now(), label: lang==='ua'?'Дім':lang==='ru'?'Дом':'Home', address: newAddr, isDefault: false };
    const updated = { ...profile, addresses: [...(profile.addresses||[]), addr] };
    saveProfile(updated); setProfile(updated);
    if (sbUser) await sb.upsertProfile(sbUser.id, { addresses: updated.addresses });
    setNewAddr('');
  };

  const levelColor = { Bronze:'#cd7f32', Silver:'#aaa', Gold:'#f5c518' };
  const allOrders  = orders.length ? orders : (profile?.orders || []);

  const GoogleBtn = () => (
    <button onClick={doGoogleLogin} style={{
      width:'100%', padding:'13px 16px', borderRadius:12,
      border:'1.5px solid #dadce0', background:'#fff',
      display:'flex', alignItems:'center', gap:12, cursor:'pointer',
      fontFamily:'var(--sans)', fontSize:15, fontWeight:500, color:'#3c4043',
      boxShadow:'0 1px 3px rgba(0,0,0,.1)', transition:'box-shadow .2s,background .2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,.15)';e.currentTarget.style.background='#f8f9fa';}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.1)';e.currentTarget.style.background='#fff';}}>
      <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {lbl.googleBtn}
      <span style={{marginLeft:'auto',fontSize:12,color:'#80868b'}}>🔒 OAuth 2.0</span>
    </button>
  );

  return (
    <>
      <div className={`prof-ov${open?' on':''}`} onClick={onClose}/>
      <div className={`prof-dr${open?' on':''}`}>
        <div className="prof-head">
          <button className="prof-x" onClick={onClose}>✕</button>
          {profile ? (
            <>
              <div className="prof-av" style={profile.avatar?{padding:0,overflow:'hidden'}:{}}>
                {profile.avatar
                  ? <img src={profile.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                  : <span style={{fontSize:28}}>{(profile.name||'?')[0].toUpperCase()}</span>
                }
              </div>
              <div className="prof-nm">{profile.name}</div>
              <div className="prof-em">{profile.email}</div>
              <div className="prof-badges">
                <span className="prof-badge" style={{color:levelColor[profile.level]||levelColor.Bronze}}>
                  {profile.level==='Gold'
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5.5"/><path d="M9 13.5L7.5 21l4.5-2.5L16.5 21 15 13.5"/></svg>
                  } {profile.level}
                </span>
                <span className="prof-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {profile.points} {lbl.points}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="prof-av">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--forest,#1e3d1f)'}}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
              <div className="prof-nm">Bionerika Agency</div>
              <div className="prof-em">
                {lang==='ru'?'Войдите через Google — быстро и безопасно.':lang==='ua'?'Увійдіть через Google — швидко і безпечно.':'Sign in with Google — fast and secure.'}
              </div>
            </>
          )}
        </div>

        {/* Button to open full AccountPage */}
        {profile && onPage && (
          <div style={{ padding:'8px 14px' }}>
            <button onClick={() => { onClose(); onPage('account'); }}
              style={{ width:'100%', padding:'13px 16px', borderRadius:13, border:'none', background:'var(--forest,#1e3d1f)', color:'var(--cream,#f4efe4)', fontSize:13, fontWeight:600, fontFamily:'var(--sans,Jost)', cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'background .2s, transform .15s', boxSizing:'border-box' }}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--moss,#3a6b3b)';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='var(--forest,#1e3d1f)';e.currentTarget.style.transform='none';}}>
              <span style={{ flex:1, color:'#fff' }}>{lbl.openAccount}</span>
              <span style={{ color:'#fff', fontSize:17, lineHeight:1 }}>→</span>
            </button>
          </div>
        )}

        {profile && (
          <div className="prof-tabs">
            {tabs.map(tb => (
              <button key={tb.k} className={`prof-tab${tab===tb.k?' on':''}`} onClick={()=>setTab(tb.k)}>
                <span className="prof-tab-ico">{tb.svg}</span>
                <span>{tb.l}</span>
              </button>
            ))}
          </div>
        )}

        <div className="prof-body">
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:48,gap:16}}>
              <div className="loading-spin" style={{width:36,height:36,borderWidth:3}}/>
            </div>
          ) : !profile ? (
            <div className="prof-login-box">
              <div style={{fontSize:56,marginBottom:16}}>👤</div>
              <div className="prof-login-title">
                {lang==='ru'?'Добро пожаловать!':lang==='ua'?'Ласкаво просимо!':'Welcome!'}
              </div>
              <div className="prof-login-sub">
                {lang==='ru'?'Войдите через Google — быстро и безопасно.':lang==='ua'?'Увійдіть через Google — швидко і безпечно.':'Sign in with Google — fast and secure.'}
              </div>
              <div style={{width:'100%',background:'var(--parchment,#ebe4d4)',borderRadius:14,padding:'14px 16px',marginBottom:16,border:'1px solid rgba(58,107,59,0.12)'}}>
                {[
                  {ico:'📦', t: lang==='ru'?'История заказов и статусы':lang==='ua'?'Історія замовлень і статуси':'Order history & statuses'},
                  {ico:'⭐', t: lang==='ru'?'Бонусные баллы и уровень':lang==='ua'?'Бонусні бали та рівень':'Bonus points & level'},
                  {ico:'📍', t: lang==='ru'?'Сохранённые адреса доставки':lang==='ua'?'Збережені адреси доставки':'Saved delivery addresses'},
                  {ico:'📊', t: lang==='ru'?'Личная аналитика покупок':lang==='ua'?'Особиста аналітика покупок':'Personal purchase analytics'},
                ].map(({ico,t},i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<3?'1px solid rgba(58,107,59,0.08)':'none'}}>
                    <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                    <span style={{fontSize:12,color:'var(--dark,#141a14)',fontFamily:'var(--sans,Jost)'}}>{t}</span>
                  </div>
                ))}
              </div>
              <GoogleBtn/>
              <div style={{marginTop:12,fontSize:11,color:'var(--muted)',textAlign:'center'}}>
                {lang==='ru'?'Входя, вы принимаете условия сервиса.':
                 lang==='ua'?'Увійшовши, ви погоджуєтесь з умовами.':
                 'By signing in you agree to Terms of Service.'}
              </div>
            </div>
          ) : tab==='overview' ? (
            <>
              <GlobalMarketMini lang={lang} cur={cur}/>
              <PersonalChart orders={allOrders} cur={cur} lang={lang}/>
              <div className="prof-stat-grid">
                {[[allOrders.length,lbl.totalOrders],[profile.points,lbl.bonusPoints],[cur.symbol+allOrders.reduce((s,o)=>s+(o.total||0),0).toLocaleString(),lbl.totalSpent],[(profile.addresses||[]).length,lbl.addr]].map(([n,l],i)=>(
                  <div key={i} className="prof-stat"><div className="prof-stat-n">{n}</div><div className="prof-stat-l">{l}</div></div>
                ))}
              </div>
              {allOrders.slice(0,2).map((o,i)=>(
                <div key={o.id||i} className="prof-card">
                  <div className="prof-order-head">
                    <div><div className="prof-order-id">{o.order_number||o.id||'#…'}</div><div className="prof-order-date">{o.created_at?new Date(o.created_at).toLocaleDateString():o.date}</div></div>
                    <span className={`prof-order-status status-${o.status||'pending'}`}>{o.status==='done'?'✅':o.status==='process'?'🔄':'⏳'} {o.status||'pending'}</span>
                  </div>
                  <div className="prof-order-items">{o.items_text||o.items}</div>
                  <div className="prof-order-total">{o.currency_symbol||cur.symbol}{(o.total||0).toLocaleString()}</div>
                </div>
              ))}
              <button style={{width:'100%',padding:12,borderRadius:12,border:'1.5px solid #fca5a5',background:'transparent',color:'#dc2626',fontFamily:'var(--sans)',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:16}}
                onClick={doLogout}>🚪 {lbl.logout}</button>
            </>
          ) : tab==='orders' ? (
            <div className="prof-sect">
              <div className="prof-sect-title">📦 {lbl.orders}</div>
              <PersonalChart orders={allOrders} cur={cur} lang={lang}/>
              {allOrders.length===0 ? (
                <div style={{textAlign:'center',padding:'8px 0 12px'}}>
                  <button className="btn" style={{display:'inline-flex'}} onClick={()=>{onClose();onPage('catalog');}}>
                    {lang==='ru'?'В каталог':lang==='ua'?'До каталогу':'Browse Catalog'}
                  </button>
                </div>
              ) : allOrders.map((o,i)=>(
                <div key={o.id||i} className="prof-card">
                  <div className="prof-order-head">
                    <div><div className="prof-order-id">{o.order_number||o.id}</div><div className="prof-order-date">{o.created_at?new Date(o.created_at).toLocaleDateString():o.date}</div></div>
                    <span className={`prof-order-status status-${o.status||'pending'}`}>{o.status==='done'?'✅':o.status==='process'?'🔄':'⏳'} {o.status||'pending'}</span>
                  </div>
                  <div className="prof-order-items">{o.items_text||o.items}</div>
                  <div className="prof-order-total">{o.currency_symbol||cur.symbol}{(o.total||0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : tab==='addr' ? (
            <div className="prof-sect">
              <div className="prof-sect-title">📍 {lbl.addr}</div>
              {(profile.addresses||[]).map(a=>(
                <div key={a.id} className={`prof-addr-card${a.isDefault?' def':''}`}>
                  <div className="prof-addr-ico">📍</div>
                  <div className="prof-addr-text"><div className="prof-addr-main">{a.label}</div><div className="prof-addr-sub">{a.address}</div></div>
                  {a.isDefault&&<span style={{fontSize:10,background:'var(--forest)',color:'#fff',padding:'2px 8px',borderRadius:100,whiteSpace:'nowrap'}}>✓ Default</span>}
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <input className="inp" style={{flex:1}} placeholder={lbl.addAddr.replace('+ ','')}
                  value={newAddr} onChange={e=>setNewAddr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doAddAddress()}/>
                <button className="btn" style={{padding:'0 14px',flexShrink:0}} onClick={doAddAddress}>+</button>
              </div>
            </div>
          ) : tab==='settings' ? (
            <div className="prof-sect">
              <div className="prof-sect-title">⚙️ {lbl.settings}</div>
              {saveMsg&&<div style={{background:'#dcfce7',border:'1px solid #4ade80',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#16a34a',marginBottom:12}}>✅ {saveMsg}</div>}
              <div style={{background:'var(--cream)',borderRadius:12,padding:'12px 14px',marginBottom:14,border:'1px solid var(--border)',fontSize:12}}>
                <div style={{color:'var(--muted)',marginBottom:3,fontWeight:600}}>🔑 Supabase UID</div>
                <div style={{fontFamily:'monospace',color:'var(--dark)',wordBreak:'break-all',fontSize:11}}>{profile.uid||'local-only'}</div>
              </div>
              {!editMode ? (
                <>
                  {[['👤',lbl.name,profile.name],['📧',lbl.email,profile.email]].map(([ico,label,val])=>(
                    <div key={label} className="prof-addr-card">
                      <div className="prof-addr-ico" style={{background:'var(--cream)',color:'var(--forest)'}}>{ico}</div>
                      <div className="prof-addr-text"><div className="prof-addr-sub">{label}</div><div className="prof-addr-main">{val}</div></div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:10,marginTop:14}}>
                    <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={()=>{setEditForm({name:profile.name});setEditMode(true);}}>✏️ {lbl.edit}</button>
                    <button style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #fca5a5',background:'transparent',color:'#dc2626',fontFamily:'var(--sans)',fontSize:14,fontWeight:600,cursor:'pointer'}} onClick={doLogout}>🚪 {lbl.logout}</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--muted)',marginBottom:5}}>{lbl.name}</div>
                    <input className="inp" value={editForm.name||''} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={doSaveEdit}>💾 {lbl.save}</button>
                    <button className="btn-o" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditMode(false)}>{lbl.cancel}</button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
