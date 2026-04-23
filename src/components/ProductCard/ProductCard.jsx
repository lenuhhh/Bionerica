import React from 'react'
import Icon from '../Icon/Icon.jsx'
import { useLang } from '../../i18n/LangContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import styles from './ProductCard.module.css'

const badgeMap = {
  hit: styles.badgeHit, fresh: styles.badgeFresh,
  top: styles.badgeTop, new:   styles.badgeNew,
}

export default function ProductCard({ product, onAdd, delay = 0, overrideName, overridePrice, overridePriceUah }) {
  const { t, price, currency } = useLang()
  const { user, isFavorite, toggleFavorite } = useAuth()
  const idx = product.id - 1
  const pd = t.products_data?.[idx]
  const displayName   = overrideName  || pd?.name   || product.name
  const displayOrigin = pd?.origin || product.origin
  const displayBadge  = pd?.badge  || product.badge
  // overridePriceUah is a raw UAH number → price() converts to current language/currency
  // overridePrice (legacy string) still works as fallback for backward compat
  const baseUah = overridePriceUah ?? pd?.priceUah ?? product.price
  const displayPrice  = overridePrice || price(baseUah)
  const unit = product.cat === 'flowers' || product.cat === 'exotic' ? t.unit_pc : t.unit_kg
  const fav = user && isFavorite(product.id)

  return (
    <div className={styles.card} style={{ animationDelay: `${delay}s` }}>
      <div className={styles.imgWrap}>
        <span className={`${styles.badge} ${badgeMap[product.badgeType] || ''}`}>{displayBadge}</span>
        <img src={product.img} alt={displayName} loading="lazy" />
        <div className={styles.deliveryBadge}>
          <span className={styles.deliveryLabel}>Delivery</span>
          <span className={styles.deliveryValue}>from 1 day</span>
        </div>
        <div className={styles.ratingBadge}>
          <span className={styles.ratingLabel}>Rating</span>
          <span className={styles.ratingValue}>4.9 / 5.0</span>
        </div>
        {user && (
          <button
            className={`${styles.favBtn} ${fav ? styles.favOn : ''}`}
            onClick={() => toggleFavorite(product.id)}
            title={fav ? (t.fav_remove || 'Убрать из избранного') : (t.fav_add || 'В избранное')}
          >
            ★
          </button>
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{displayName}</div>
        <div className={styles.origin}>{displayOrigin}</div>
        <div className={styles.footer}>
          <div className={styles.price}>{displayPrice}<span style={{fontSize:12,fontFamily:'var(--font-sans)',fontWeight:400,color:'var(--text-muted)',marginLeft:2}}>{unit}</span></div>
          <button className={styles.addBtn} onClick={() => onAdd?.(product)}>
            <Icon name="cart" size={13} strokeWidth={2.2} />
            {t.products_add}
          </button>
        </div>
        <div className={styles.stars}>★★★★★</div>
      </div>
    </div>
  )
}
