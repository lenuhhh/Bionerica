import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import { products } from '../../data/products.js'
import { useProductPrices } from '../../hooks/useProductPrices.js'
import styles from './CatalogPage.module.css'

export default function CatalogPage() {
  const { t } = useLang()
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const navigate = useNavigate()
  const { prices: dbPrices } = useProductPrices()

  const filtered = useMemo(() => {
    let data = activeCategory === 'all' ? [...products] : products.filter(p => p.cat === activeCategory)
    if (sortBy === 'price-asc')  data = data.sort((a,b) => a.price - b.price)
    if (sortBy === 'price-desc') data = data.sort((a,b) => b.price - a.price)
    if (sortBy === 'name')       data = data.sort((a,b) => a.name.localeCompare(b.name))
    return data
  }, [activeCategory, sortBy])

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.top}>
            <div>
              <span className="eyebrow">{t.cat_eyebrow}</span>
              <h1 className={styles.title}>{t.cat_title.replace(t.cat_italic,'')} <span className="serif-italic">{t.cat_italic}</span></h1>
              <p className={styles.sub}>{t.cat_sub}</p>
            </div>
            <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="default">{t.cat_sort_def}</option>
              <option value="price-asc">{t.cat_sort_asc}</option>
              <option value="price-desc">{t.cat_sort_desc}</option>
              <option value="name">{t.cat_sort_name}</option>
            </select>
          </div>
          <div className={styles.cats}>
            {t.cat_cats.map(({ key, label }) => (
              <button key={key}
                className={`${styles.catBtn} ${activeCategory === key ? styles.active : ''}`}
                onClick={() => setActiveCategory(key)}>{label}</button>
            ))}
          </div>
          <div className={styles.grid}>
            {filtered.map((product, i) => {
              const ov = dbPrices[String(product.id)]
              return <ProductCard key={product.id} product={product} delay={i * 0.05} onAdd={() => navigate('/order')}
                overrideName={ov?.product_name || undefined}
                overridePriceUah={ov?.price_uah ?? undefined}
              />
            }
            ))}
            {filtered.length === 0 && (
              <p style={{ color:'var(--text-muted)', gridColumn:'1/-1', textAlign:'center', padding:'60px 0' }}>
                {t.cat_empty}
              </p>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}
