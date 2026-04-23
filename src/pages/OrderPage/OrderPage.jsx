import React, { useState, useMemo } from 'react'
import { useLang } from '../../i18n/LangContext.jsx'
import Icon from '../../components/Icon/Icon.jsx'
import { products } from '../../data/products.js'
import { sendOrder } from '../../services/emailService.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import styles from './OrderPage.module.css'

export default function OrderPage() {
  const { t, price, currency, phonePh, lang } = useLang()
  const { user, saveOrder, loading: authLoading, loginWithGoogle } = useAuth()
  const [step, setStep] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState({})
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', address:'', comment:'' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() =>
    activeCategory === 'all' ? products : products.filter(p => p.cat === activeCategory),
    [activeCategory])

  const cartItems = useMemo(() =>
    Object.entries(cart).filter(([,qty]) => qty > 0)
      .map(([id, qty]) => ({ ...products.find(p => p.id === +id), qty })),
    [cart])

  const totalConverted = cartItems.reduce((s, p) => s + Math.round(p.price * currency.rate) * p.qty, 0)
  const totalStr = `${currency.symbol}${totalConverted.toLocaleString()}`

  const setQty = (id, delta) => setCart(c => {
    const next = (c[id] || 0) + delta
    if (next <= 0) { const { [id]:_, ...rest } = c; return rest }
    return { ...c, [id]: next }
  })

  const handleSubmit = async () => {
    setSending(true); setError('')
    const categories = [...new Set(cartItems.map(p => p.cat))]
    const result = await sendOrder({ categories, products: cartItems, totalPrice: totalStr, client: form })
    if (result.ok) {
      // Save to Firestore if user is logged in
      if (user && saveOrder) {
        try { await saveOrder({ items: cartItems, total: totalStr, client: form }) } catch(e) {}
      }
      setSent(true); setStep(2)
    }
    else setError(t.order_error)
    setSending(false)
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  if (sent) return (
    <div className={styles.page}><div className="container">
      <div className={styles.success}>
        <div className={styles.successIconWrap}>
          <Icon name="checkCircle" size={64} color="#4a7c59" strokeWidth={1.4} />
        </div>
        <h2 className={styles.successTitle}>{t.order_success_title}</h2>
        <p className={styles.successText}>{t.order_success_text} <strong>{form.email}</strong></p>
      </div>
    </div></div>
  )

  // ── Auth loading guard (Firebase restores session async on refresh) ──────
  if (authLoading) return (
    <div className={styles.page}>
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'50vh'}}>
        <div style={{textAlign:'center'}}>
          <div className="loading-spin" style={{width:40,height:40,borderWidth:3,margin:'0 auto 12px'}}/>
          <p style={{color:'var(--muted)',fontSize:14}}>
            {lang==='ua'?'Завантаження...':lang==='ru'?'Загрузка...':'Loading...'}
          </p>
        </div>
      </div>
    </div>
  )

  // ── Login required guard ─────────────────────────────────────────────────
  if (!user) return (
    <div className={styles.page}>
      <div className="container">
        <div style={{textAlign:'center',padding:'60px 0',maxWidth:400,margin:'0 auto'}}>
          <div style={{fontSize:64,marginBottom:16}}>🌿</div>
          <h2 style={{fontFamily:'var(--serif)',fontSize:28,marginBottom:12,color:'var(--dark)'}}>
            {lang==='ua'?'Потрібна авторизація':lang==='ru'?'Нужна авторизация':'Login Required'}
          </h2>
          <p style={{color:'var(--muted)',marginBottom:32,lineHeight:1.7,fontSize:15}}>
            {lang==='ua'?'Увійдіть через Google, щоб оформити замовлення':
             lang==='ru'?'Войдите через Google, чтобы оформить заказ':
             'Sign in with Google to place an order'}
          </p>
          <button onClick={loginWithGoogle} style={{
            width:'100%',padding:'14px 16px',borderRadius:14,
            border:'1.5px solid #dadce0',background:'#fff',
            display:'flex',alignItems:'center',gap:12,cursor:'pointer',
            fontFamily:'var(--sans)',fontSize:15,fontWeight:500,color:'#3c4043',
            boxShadow:'0 1px 4px rgba(0,0,0,.1)',justifyContent:'center',
            transition:'box-shadow .2s,background .2s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 3px 12px rgba(0,0,0,.15)';e.currentTarget.style.background='#f8f9fa';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.1)';e.currentTarget.style.background='#fff';}}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {lang==='ua'?'Увійти через Google':lang==='ru'?'Войти через Google':'Continue with Google'}
            <span style={{marginLeft:'auto',fontSize:12,color:'#80868b'}}>🔒</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}><div className="container"><div className={styles.inner}>

      <div className={styles.top}>
        <span className="eyebrow">{t.order_eyebrow}</span>
        <h1 className={styles.title}>
          {t.order_title.replace(t.order_italic,'')}
          <span className="serif-italic">{t.order_italic}</span>
        </h1>
      </div>

      {/* Steps */}
      <div className={styles.steps}>
        {[
          { label: t.order_step1, icon: 'cart' },
          { label: t.order_step2, icon: 'user' },
          { label: t.order_step3, icon: 'checkCircle' },
        ].map(({ label, icon }, i) => (
          <div key={label} className={`${styles.stepItem} ${i===step?styles.stepActive:''} ${i<step?styles.stepDone:''}`}>
            <div className={styles.stepNum}>
              {i < step
                ? <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
                : <Icon name={icon} size={14} color={i===step?"#fff":"#aaa"} strokeWidth={2} />
              }
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 0 — Product grid */}
      {step === 0 && (
        <div>
          <div className={styles.cats}>
            {t.cat_cats.map(({ key, label }) => (
              <button key={key}
                className={`${styles.catBtn} ${activeCategory===key?styles.active:''}`}
                onClick={() => setActiveCategory(key)}>{label}</button>
            ))}
          </div>
          <div className={styles.grid}>
            {filtered.map(p => {
              const pd = t.products_data?.[p.id-1]
              const name   = pd?.name   || p.name
              const origin = pd?.origin || p.origin
              const badge  = pd?.badge  || p.badge
              const pconv  = `${currency.symbol}${Math.round(p.price * currency.rate)}`
              const unit = p.cat==='flowers'||p.cat==='exotic' ? t.unit_pc : t.unit_kg
              const badgeCls = { hit:styles.badgeHit, fresh:styles.badgeFresh, top:styles.badgeTop, new:styles.badgeNew }[p.badgeType] || ''
              return (
                <div key={p.id} className={styles.card}>
                  <div className={styles.imgWrap}>
                    <span className={`${styles.badge} ${badgeCls}`}>{badge}</span>
                    <img src={p.img} alt={name} loading="lazy" />
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName}>{name}</div>
                    <div className={styles.cardOrigin}>{origin}</div>
                    <div className={styles.cardBottom}>
                      <div className={styles.cardPrice}>{pconv}<span className={styles.unit}>{unit}</span></div>
                      {cart[p.id] ? (
                        <div className={styles.qtyControl}>
                          <button onClick={() => setQty(p.id,-1)}>−</button>
                          <span>{cart[p.id]}</span>
                          <button onClick={() => setQty(p.id,+1)}>+</button>
                        </div>
                      ) : (
                        <button className={styles.addBtn} onClick={() => setQty(p.id,1)}>
                          <Icon name="cart" size={13} strokeWidth={2.2} />
                          {t.products_add}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {cartItems.length > 0 && (
            <div className={styles.cartBar}>
              <div className={styles.cartInfo}>
                <Icon name="cart" size={16} color="#fff" strokeWidth={2} />
                <strong>{cartItems.length}</strong> {t.order_pos} · <strong>{totalStr}</strong>
              </div>
              <button className="btn-primary" onClick={() => setStep(1)}>
                {t.order_next}
                <Icon name="arrowRight" size={15} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 1 — Contact form */}
      {step === 1 && (
        <div className={styles.formWrap}>
          <div className={styles.formGrid}>
            <div className={styles.formLeft}>
              <h3 className={styles.formTitle}>
                <Icon name="user" size={18} color="#4a7c59" strokeWidth={1.8} />
                {t.order_contact}
              </h3>
              <div className="form-group">
                <label><Icon name="user" size={12} strokeWidth={2}/>{t.order_name}</label>
                <input value={form.name} onChange={set('name')} placeholder={t.order_name.replace(' *','')} />
              </div>
              <div className="form-group">
                <label><Icon name="mail" size={12} strokeWidth={2}/>{t.order_email}</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label><Icon name="phone" size={12} strokeWidth={2}/>{t.order_phone}</label>
                <input value={form.phone} onChange={set('phone')} placeholder={phonePh} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label><Icon name="building" size={12} strokeWidth={2}/>{t.order_company}</label>
                  <input value={form.company} onChange={set('company')} placeholder={t.order_optional} />
                </div>
                <div className="form-group">
                  <label><Icon name="pin" size={12} strokeWidth={2}/>{t.order_address}</label>
                  <input value={form.address} onChange={set('address')} placeholder="" />
                </div>
              </div>
              <div className="form-group">
                <label><Icon name="comment" size={12} strokeWidth={2}/>{t.order_comment}</label>
                <textarea value={form.comment} onChange={set('comment')} placeholder={t.order_wish} />
              </div>
              {error && <p style={{color:'#d93025',fontSize:13,marginBottom:12}}>{error}</p>}
              <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
                <button className="btn-outline" onClick={() => setStep(0)} style={{display:'flex',alignItems:'center',gap:6}}>
                  <Icon name="arrowLeft" size={14} strokeWidth={2.2}/>{t.order_back}
                </button>
                <button className="btn-primary" onClick={handleSubmit}
                  disabled={!form.name||!form.email||!form.phone||sending}
                  style={{display:'flex',alignItems:'center',gap:8}}>
                  <Icon name="send" size={14} strokeWidth={2}/>
                  {sending ? t.order_sending : t.order_send}
                </button>
              </div>
            </div>

            <div className={styles.cartSummary}>
              <h3 className={styles.formTitle}>
                <Icon name="order" size={18} color="#4a7c59" strokeWidth={1.8} />
                {t.order_your}
              </h3>
              {cartItems.map(p => {
                const pd = t.products_data?.[p.id-1]
                const name = pd?.name || p.name
                const sub = `${p.qty} × ${currency.symbol}${Math.round(p.price * currency.rate)}`
                const total = `${currency.symbol}${(Math.round(p.price * currency.rate) * p.qty).toLocaleString()}`
                return (
                  <div key={p.id} className={styles.summaryRow}>
                    <img src={p.img} alt={name} />
                    <div className={styles.summaryInfo}>
                      <div className={styles.summaryName}>{name}</div>
                      <div className={styles.summaryQty}>{sub}</div>
                    </div>
                    <div className={styles.summaryPrice}>{total}</div>
                  </div>
                )
              })}
              <div className={styles.summaryTotal}>
                <span>{t.order_total}</span>
                <strong>{totalStr}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div></div></div>
  )
}
