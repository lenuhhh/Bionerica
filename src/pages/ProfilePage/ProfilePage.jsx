import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLang } from '../../i18n/LangContext.jsx'
import { products as allProducts } from '../../data/products.js'
import Icon from '../../components/Icon/Icon.jsx'
import s from './ProfilePage.module.css'
import { loadProfile, saveProfile } from '../../components/ProfileDrawer/ProfileDrawer.jsx'

const TABS = ['orders', 'favorites', 'reviews', 'settings']
const MANAGER_EMAILS = ['aleksandrsmisko5@gmail.com', 'aleksandrsmisko63@gmail.com']

export default function ProfilePage() {
  const { user, profile, orders, reviews, favorites, logout, updateUserProfile, addReview, toggleFavorite, loading } = useAuth()
  const { t, currency } = useLang()
  const navigate = useNavigate()

  const [tab,           setTab]          = useState('orders')
  const [editMode,      setEditMode]     = useState(false)
  const [profileForm,   setProfileForm]  = useState({ name: '', phone: '', address: '' })
  const [savingProfile, setSavingProfile]= useState(false)
  const [profileSaved,  setProfileSaved] = useState(false)

  const [reviewRating,  setReviewRating] = useState(5)
  const [reviewText,    setReviewText]   = useState('')
  const [reviewRole,    setReviewRole]   = useState('')
  const [reviewSending, setReviewSending]= useState(false)
  const [reviewSent,    setReviewSent]   = useState(false)
  const [reviewError,   setReviewError]  = useState('')

  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => { if (!loading && !user) navigate('/') }, [user, loading, navigate])
  useEffect(() => { if (profile) setProfileForm({ name: profile.name || '', phone: profile.phone || '', address: profile.address || '' }) }, [profile])
  useEffect(() => { if (user && MANAGER_EMAILS.includes(user.email)) setTab('dashboard') }, [user?.email])

  if (loading) return <div className={s.loadingWrap}><div className={s.spinner}/></div>
  if (!user)   return null

  const isManagerAcc = MANAGER_EMAILS.includes(user.email)
  const displayTabs  = isManagerAcc ? ['dashboard', 'settings'] : TABS

  const initials = (profile?.name || user.displayName || user.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  const fmtDate = ts => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('ru', { day:'2-digit', month:'long', year:'numeric' })
  }

  const statusColor = { new:'#c47a3a', processing:'#4a7c59', done:'#2d6e3a', cancelled:'#999' }
  const statusLabel = {
    new:        t.order_status_new        || 'Новый',
    processing: t.order_status_processing || 'В обработке',
    done:       t.order_status_done       || 'Выполнен',
    cancelled:  t.order_status_cancelled  || 'Отменён',
  }

  const favProducts = allProducts.filter(p => favorites.includes(p.id))

  async function handleSaveProfile() {
    setSavingProfile(true)
    await updateUserProfile(profileForm)
    const lsProf = loadProfile()
    if (lsProf) saveProfile({ ...lsProf, address: profileForm.address })
    setSavingProfile(false); setEditMode(false)
    setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500)
  }

  async function handleAddReview() {
    if (!reviewText.trim()) { setReviewError(t.review_err_empty || 'Напишите отзыв'); return }
    setReviewSending(true); setReviewError('')
    try {
      await addReview({ rating: reviewRating, text: reviewText, role: reviewRole })
      setReviewSent(true); setReviewText(''); setReviewRole(''); setReviewRating(5)
    } catch (e) { setReviewError(e.message) }
    setReviewSending(false)
  }

  return (
    <div className={s.page}>
      <div className="container">

        {/* ── Hero ── */}
        <div className={s.hero}>
          <div className={s.avatarWrap}>
            {profile?.photo || user.photoURL
              ? <img src={profile?.photo || user.photoURL} className={s.avatarImg} alt="" referrerPolicy="no-referrer"/>
              : <div className={s.avatar}>{initials}</div>
            }
            <div className={s.avatarOnline}/>
          </div>
          <div className={s.heroInfo}>
            <h1 className={s.heroName}>{profile?.name || user.displayName || 'Пользователь'}</h1>
            <div className={s.heroEmail}>{user.email}</div>
            {profile?.createdAt && (
              <div className={s.heroJoined}>
                <Icon name="clock" size={13} strokeWidth={1.8}/>
                {t.profile_joined || 'Клиент с'} {fmtDate(profile.createdAt)}
              </div>
            )}
          </div>
          <button className={s.logoutBtn} onClick={logout}>
            <Icon name="close" size={14} strokeWidth={2}/>
            {t.profile_logout || 'Выйти'}
          </button>
        </div>

        {/* ── Stats ── */}
        {!isManagerAcc && (
          <div className={s.stats}>
            {[
              [orders.length,   t.profile_orders          || 'Заказов'],
              [favProducts.length, t.profile_fav_count    || 'Избранных'],
              [reviews.length,  t.profile_reviews_count   || 'Отзывов'],
              [orders.filter(o=>o.status==='done').length, t.profile_completed || 'Выполнено'],
            ].map(([num, lbl], i, arr) => (
              <React.Fragment key={lbl}>
                <div className={s.stat}>
                  <div className={s.statNum}>{num}</div>
                  <div className={s.statLbl}>{lbl}</div>
                </div>
                {i < arr.length - 1 && <div className={s.statDiv}/>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className={s.tabsRow}>
          {displayTabs.map(tb => (
            <button key={tb} className={`${s.tabBtn} ${tab===tb ? s.tabActive : ''}`} onClick={() => setTab(tb)}>
              {tb==='dashboard' && <Icon name="catalog" size={15} strokeWidth={1.8}/>}
              {tb==='orders'    && <Icon name="order"   size={15} strokeWidth={1.8}/>}
              {tb==='favorites' && <Icon name="star"    size={15} strokeWidth={1.8}/>}
              {tb==='reviews'   && <Icon name="comment" size={15} strokeWidth={1.8}/>}
              {tb==='settings'  && <Icon name="user"    size={15} strokeWidth={1.8}/>}
              <span>
                {tb==='dashboard' && (t.profile_tab_dashboard || 'Дашборд')}
                {tb==='orders'    && (t.profile_tab_orders    || 'Заказы')}
                {tb==='favorites' && (t.profile_tab_favorites || 'Избранное')}
                {tb==='reviews'   && (t.profile_tab_reviews   || 'Отзывы')}
                {tb==='settings'  && (t.profile_tab_settings  || 'Профіль')}
              </span>
              {tb==='favorites' && favProducts.length > 0 && <span className={s.tabBadge}>{favProducts.length}</span>}
            </button>
          ))}
        </div>

        {/* ════ MANAGER DASHBOARD ════ */}
        {tab === 'dashboard' && isManagerAcc && (
          <div className={s.section}>
            <div className={s.settingsCard}>
              <div className={s.settingsHeader}>
                <h3 style={{display:'flex',alignItems:'center',gap:8}}>
                  <Icon name="catalog" size={18} strokeWidth={1.8} color="var(--green-accent)"/>
                  {t.profile_manager_title || 'Панель менеджера'}
                </h3>
              </div>

              <div style={{marginTop:20}}>
                <h4 style={{fontFamily:'var(--font-serif,Cormorant)',fontSize:17,color:'var(--dark)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  <Icon name="globe" size={16} strokeWidth={1.8} color="var(--green-accent)"/>
                  {t.profile_market_info || 'Ринкова інформація'}
                </h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
                  {[
                    ['🌿','Зелені рослини','$2.50–8.00 / шт','↑ +3%'],
                    ['🌸','Квіти','$3.00–12.00 / шт','→ Сезон'],
                    ['🌴','Екзотика','$5.00–25.00 / шт','→ Стабільно'],
                    ['🍃','Дерева','$15.00–80.00 / шт','→ Попит'],
                    ['🫚','Олії','$8.00–35.00 / л','↑ +7%'],
                    ['🌾','Злаки','$1.50–4.00 / кг','↓ -2%'],
                  ].map(([ico,name,range,trend]) => (
                    <div key={name} style={{background:'var(--bg-card,#f8f6f0)',borderRadius:12,padding:'12px 14px',transition:'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s cubic-bezier(.4,0,.2,1)'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                      <div style={{fontSize:22,marginBottom:4}}>{ico}</div>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--dark)'}}>{name}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)',margin:'2px 0'}}>{range}</div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--green-accent,#4a7c59)'}}>{trend}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{marginTop:24}}>
                <h4 style={{fontFamily:'var(--font-serif,Cormorant)',fontSize:17,color:'var(--dark)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  <Icon name="folder" size={16} strokeWidth={1.8} color="var(--green-accent)"/>
                  {t.profile_data_info || 'Інформація про дані'}
                </h4>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    ['order',   '📦','Таблиця замовлень',    'Замовлення клієнтів зі статусом, товарами та сумою'],
                    ['user',    '👤','Профілі клієнтів',     'Імена, контакти, адреси і рівні лояльності'],
                    ['comment', '💬','Чат-сесії',            'Переписка з клієнтами та повідомлення менеджерів'],
                    ['leaf',    '🌿','Каталог товарів',      'Ціни, наявність, категорії та опис'],
                  ].map(([ico,emoji,name,desc]) => (
                    <div key={ico} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:'var(--bg-card,#f8f6f0)',borderRadius:12,transition:'background .2s'}} onMouseEnter={e=>e.currentTarget.style.background='#eeeade'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-card,#f8f6f0)'}>
                      <div style={{width:36,height:36,background:'var(--dark,#1a2e1a)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>{emoji}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--dark)'}}>{name}</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <a href="/" onClick={e=>{e.preventDefault();window.location.href='/';}} style={{display:'inline-flex',alignItems:'center',gap:10,marginTop:20,padding:'12px 20px',background:'var(--dark,#1a2e1a)',color:'#f4efe4',borderRadius:12,textDecoration:'none',fontWeight:600,fontSize:13,fontFamily:'var(--font-sans,Jost)',transition:'background .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1)'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--moss,#3a6b3b)';e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.background='var(--dark,#1a2e1a)';e.currentTarget.style.transform='none'}}>
                <Icon name="catalog" size={15} strokeWidth={2} color="#8fba8f"/>
                {t.profile_open_manager || 'Відкрити менеджер-панель'}
                <span style={{marginLeft:'auto',opacity:.5}}>→</span>
              </a>
            </div>
          </div>
        )}

        {/* ════ ORDERS ════ */}
        {tab === 'orders' && (
          <div className={s.section}>
            {orders.length === 0 ? (
              <div className={s.empty}>
                <Icon name="order" size={52} color="#ccc" strokeWidth={1.2}/>
                <p>{t.profile_no_orders || 'Заказов пока нет'}</p>
                <Link to="/order" className="btn-primary" style={{display:'inline-block',marginTop:14}}>
                  {t.profile_make_order || 'Сделать заказ →'}
                </Link>
              </div>
            ) : (
              <div className={s.orderList}>
                {orders.map(order => (
                  <div key={order.id} className={s.orderCard}>
                    <div className={s.orderHead} onClick={() => setExpandedOrder(expandedOrder===order.id ? null : order.id)}>
                      <div>
                        <div className={s.orderId}>#{order.id.slice(-6).toUpperCase()}</div>
                        <div className={s.orderDate}>{fmtDate(order.createdAt)}</div>
                      </div>
                      <div className={s.orderRight}>
                        <span className={s.orderStatus} style={{color: statusColor[order.status]||'#999'}}>
                          ● {statusLabel[order.status] || order.status}
                        </span>
                        <span className={s.orderTotal}>{order.total}</span>
                        <Icon name="chevronDown" size={16} style={{transform: expandedOrder===order.id?'rotate(180deg)':'none',transition:'.2s'}}/>
                      </div>
                    </div>
                    {expandedOrder === order.id && (
                      <div className={s.orderBody}>
                        <div className={s.orderItems}>
                          {(order.items||[]).map((item,i) => (
                            <div key={i} className={s.orderItem}>
                              {item.img && <img src={item.img} className={s.orderItemImg} alt=""/>}
                              <div className={s.orderItemName}>{item.name}</div>
                              <div className={s.orderItemQty}>× {item.qty}</div>
                              <div className={s.orderItemPrice}>
                                {currency.symbol}{Math.round(item.price * currency.rate * item.qty).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                        {order.client && (
                          <div className={s.orderMeta}>
                            {order.client.name    && <span>👤 {order.client.name}</span>}
                            {order.client.phone   && <span>📞 {order.client.phone}</span>}
                            {order.client.address && <span>📍 {order.client.address}</span>}
                          </div>
                        )}
                        <button className={s.receiptBtn} onClick={() => printReceipt(order, currency)}>
                          <Icon name="externalLink" size={13} strokeWidth={2}/>
                          {t.profile_print_receipt || 'Распечатать чек'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ FAVORITES ════ */}
        {tab === 'favorites' && (
          <div className={s.section}>
            {favProducts.length === 0 ? (
              <div className={s.empty}>
                <Icon name="star" size={52} color="#ccc" strokeWidth={1.2}/>
                <p>{t.profile_no_favorites || 'Нет избранных товаров'}</p>
                <Link to="/catalog" className="btn-primary" style={{display:'inline-block',marginTop:14}}>
                  {t.profile_browse_catalog || 'Перейти в каталог →'}
                </Link>
              </div>
            ) : (
              <>
                <p className={s.favHint}>{t.profile_fav_hint || 'Нажмите ★ на товаре чтобы добавить/убрать из избранного'}</p>
                <div className={s.favGrid}>
                  {favProducts.map(p => (
                    <div key={p.id} className={s.favCard}>
                      <div className={s.favImgWrap}>
                        <img src={p.img} alt={p.name} className={s.favImg}/>
                        <button
                          className={s.favRemoveBtn}
                          onClick={() => toggleFavorite(p.id)}
                          title={t.profile_fav_remove || 'Убрать из избранного'}
                        >✕</button>
                      </div>
                      <div className={s.favInfo}>
                        <div className={s.favName}>{p.name}</div>
                        <div className={s.favOrigin}>{p.origin}</div>
                        <div className={s.favPrice}>
                          {currency.symbol}{Math.round(p.price * currency.rate).toLocaleString()}
                        </div>
                      </div>
                      <Link to="/order" className={s.favOrderBtn}>
                        {t.products_add || '+ Заказать'}
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ REVIEWS ════ */}
        {tab === 'reviews' && (
          <div className={s.section}>
            {!reviewSent ? (
              <div className={s.reviewForm}>
                <h3 className={s.reviewFormTitle}>
                  <Icon name="star" size={18} color="#c47a3a" strokeWidth={1.8}/>
                  {t.review_add_title || 'Оставить отзыв'}
                </h3>
                <p className={s.reviewFormSub}>{t.review_add_sub || 'Ваш отзыв появится после проверки'}</p>
                <div className={s.starsRow}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} className={`${s.starBtn} ${n<=reviewRating?s.starOn:''}`} onClick={() => setReviewRating(n)}>★</button>
                  ))}
                  <span className={s.ratingLabel}>{reviewRating}/5</span>
                </div>
                <div style={{marginBottom:12}}>
                  <label className={s.fieldLabel}>{t.review_role_label || 'Роль / должность'} <span style={{opacity:.5}}>({t.order_optional||'необязательно'})</span></label>
                  <input className={s.reviewInput} value={reviewRole} onChange={e=>setReviewRole(e.target.value)} placeholder={t.review_role_ph||'Шеф-повар, покупатель...'}/>
                </div>
                <div style={{marginBottom:14}}>
                  <label className={s.fieldLabel}>{t.review_text_label || 'Ваш отзыв'} *</label>
                  <textarea className={s.reviewTextarea} value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder={t.review_text_ph||'Расскажите о своём опыте...'} rows={4}/>
                </div>
                {reviewError && <div className={s.reviewError}>⚠️ {reviewError}</div>}
                <button className="btn-primary" onClick={handleAddReview} disabled={reviewSending}>
                  {reviewSending ? '...' : (t.review_submit || 'Отправить отзыв →')}
                </button>
              </div>
            ) : (
              <div className={s.reviewSuccess}>
                <Icon name="checkCircle" size={48} color="#4a7c59" strokeWidth={1.5}/>
                <h3>{t.review_ok_title || 'Спасибо за отзыв!'}</h3>
                <p>{t.review_ok_text || 'Появится на сайте после проверки.'}</p>
                <button className={s.reviewAgainBtn} onClick={() => setReviewSent(false)}>+ {t.review_again || 'Добавить ещё'}</button>
              </div>
            )}
            {reviews.length > 0 && (
              <div className={s.myReviews}>
                <h4 className={s.myReviewsTitle}>{t.profile_my_reviews || 'Мои отзывы'}</h4>
                {reviews.map(r => (
                  <div key={r.id} className={s.myReviewCard}>
                    <div className={s.myReviewHeader}>
                      <span className={s.myReviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                      <span className={s.myReviewDate}>{fmtDate(r.createdAt)}</span>
                      <span className={`${s.myReviewStatus} ${r.approved?s.approved:s.pending}`}>
                        {r.approved ? (t.review_approved||'✓ Опубликован') : (t.review_pending||'⏳ На проверке')}
                      </span>
                    </div>
                    {r.role && <div className={s.myReviewRole}>{r.role}</div>}
                    <p className={s.myReviewText}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === 'settings' && (
          <div className={s.section}>
            <div className={s.settingsCard}>
              <div className={s.settingsHeader}>
                <h3>{t.profile_settings_title || 'Личные данные'}</h3>
                {!editMode && (
                  <button className={s.editBtn} onClick={() => setEditMode(true)}>
                    <Icon name="tag" size={13} strokeWidth={2}/>{t.profile_edit || 'Редактировать'}
                  </button>
                )}
              </div>

              {/* OAuth provider badge */}
              <div className={s.providerBadge}>
                {user.providerData?.[0]?.providerId === 'github.com'
                  ? <><span className={s.providerIcon}>⑂</span> GitHub</>
                  : <><span className={s.providerIcon}>G</span> Google</>
                }
                <span className={s.providerLabel}>{t.auth_connected || 'Подключено'}</span>
              </div>

              {editMode ? (
                <>
                  <div className={s.settingsGrid}>
                    <div>
                      <label className={s.fieldLabel}><Icon name="user" size={12} strokeWidth={2}/>{t.auth_name||'Імʼя'}</label>
                      <input className={s.settingsInput} value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} placeholder={t.auth_name_ph||'Ваше імʼя'}/>
                    </div>
                    <div>
                      <label className={s.fieldLabel}><Icon name="phone" size={12} strokeWidth={2}/>{t.auth_phone||'Телефон'}</label>
                      <input className={s.settingsInput} value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))} placeholder="+380 (___) ___-__-__"/>
                    </div>
                    <div style={{gridColumn:'1/-1'}}>
                      <label className={s.fieldLabel}><Icon name="pin" size={12} strokeWidth={2}/>{t.auth_address||'Адреса доставки'}</label>
                      <input className={s.settingsInput} value={profileForm.address} onChange={e=>setProfileForm(f=>({...f,address:e.target.value}))} placeholder={t.auth_address_ph||'вул. Теплична, 1, м. Київ'}/>
                    </div>
                  </div>
                  <div className={s.settingsActions}>
                    <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile?'...':(t.profile_save||'Зберегти')}</button>
                    <button className={s.cancelBtn} onClick={()=>{setEditMode(false);setProfileForm({name:profile?.name||'',phone:profile?.phone||'',address:profile?.address||''})}}>{t.profile_cancel||'Скасувати'}</button>
                  </div>
                </>
              ) : (
                <div className={s.settingsView}>
                  {[
                    ['user',  t.auth_name||'Імʼя',               profile?.name  || user.displayName || '—'],
                    ['mail',  'Email',                            user.email],
                    ['phone', t.auth_phone||'Телефон',            profile?.phone || '—'],
                    ['pin',   t.auth_address||'Адреса доставки',  profile?.address || '—'],
                  ].map(([icon, label, val]) => (
                    <div key={label} className={s.settingsRow}>
                      <Icon name={icon} size={16} color="var(--green-accent)" strokeWidth={1.8}/>
                      <div>
                        <div className={s.settingsRowLabel}>{label}</div>
                        <div className={s.settingsRowVal}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {profileSaved && <div className={s.savedMsg}>✅ {t.profile_saved||'Сохранено!'}</div>}
            </div>

            <div className={s.dangerZone}>
              <span>{t.profile_logout_label||'Выход из аккаунта'}</span>
              <button className={s.logoutDangerBtn} onClick={logout}>
                <Icon name="close" size={13} strokeWidth={2}/>{t.profile_logout||'Выйти'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function printReceipt(order, currency) {
  const rows = (order.items||[]).map(item =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ece3">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ece3;text-align:center">×${item.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ece3;text-align:right;font-weight:700">
        ${currency.symbol}${Math.round(item.price*currency.rate*item.qty).toLocaleString()}
      </td>
    </tr>`).join('')
  const w = window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Чек #${order.id.slice(-6).toUpperCase()}</title>
    <style>body{font-family:Arial,sans-serif;max-width:480px;margin:32px auto;color:#1a2e1a}h1{font-size:20px;margin:0 0 4px}.meta{font-size:12px;color:#888;margin-bottom:24px}table{width:100%;border-collapse:collapse}.total{background:#1a2e1a;color:#fff;padding:14px 12px;text-align:right;font-size:18px;font-weight:700;border-radius:0 0 8px 8px}</style>
    </head><body><h1>🌿 Bionerika Agency</h1><p class="meta">Чек #${order.id.slice(-6).toUpperCase()} · ${new Date().toLocaleDateString('ru')}</p>
    <table><thead><tr style="background:#f5f2ec"><th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase">Товар</th><th style="padding:8px 12px;font-size:11px;text-transform:uppercase">Кол.</th><th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase">Сумма</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total">Итого: ${order.total}</div></body></html>`)
  w.document.close(); w.print()
}
