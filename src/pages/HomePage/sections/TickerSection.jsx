import React from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import s from './TickerSection.module.css'

/* Two rows: top scrolls left, bottom scrolls right */
const ITEMS_TOP = [
  'Organic vegetables',
  'Cut flowers',
  'Exotic fruits',
  'Potted plants',
  'Seedlings and saplings',
  'Herbs and spices',
  'Delivery across the country',
  'Wholesale supplies',
]
const ITEMS_TOP_RU = [
  'Органические овощи',
  'Срезанные цветы',
  'Экзотические фрукты',
  'Горшечные растения',
  'Рассада и саженцы',
  'Зелень и пряности',
  'Доставка по стране',
  'Оптовые поставки',
]
const ITEMS_TOP_UA = [
  'Органічні овочі',
  'Зрізані квіти',
  'Екзотичні фрукти',
  'Горщикові рослини',
  'Розсада і саджанці',
  'Зелень і прянощі',
  'Доставка по країні',
  'Оптові поставки',
]

const MAP = { ru: ITEMS_TOP_RU, en: ITEMS_TOP, ua: ITEMS_TOP_UA }

export default function TickerSection() {
  const { lang } = useLang()
  const items = MAP[lang] || ITEMS_TOP
  const doubled = [...items, ...items, ...items]

  return (
    <div className={s.wrap}>
      {/* Row 1 — scrolls left */}
      <div className={s.row}>
        <div className={`${s.track} ${s.left}`}>
          {doubled.map((item, i) => (
            <span key={i} className={s.item}>
              <span className={s.dot} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
