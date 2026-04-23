import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../../../i18n/LangContext.jsx'
import ProductCard from '../../../components/ProductCard/ProductCard.jsx'
import { products } from '../../../data/products.js'
import { useProductPrices } from '../../../hooks/useProductPrices.js'
import s from './ProductsSection.module.css'
export default function ProductsSection() {
  const nav = useNavigate()
  const { t } = useLang()
  const { prices: dbPrices } = useProductPrices()
  return (
    <section><div className="container">
      <div className={s.top}>
        <div><span className="eyebrow reveal">{t.products_eyebrow}</span><h2 className={`${s.title} reveal`}>{t.products_title.replace(t.products_italic,'')}<span className="serif-italic">{t.products_italic}</span></h2></div>
        <Link to="/catalog" className="btn-outline reveal">{t.products_link}</Link>
      </div>
      <div className={s.grid}>
        {products.slice(0,6).map((p,i)=>{
          const ov = dbPrices[String(p.id)]
          return <ProductCard key={p.id} product={p} delay={i*0.07} onAdd={()=>nav('/order')}
            overrideName={ov?.product_name || undefined}
            overridePriceUah={ov?.price_uah ?? undefined}
          />
        })}
      </div>
    </div></section>
  )
}
