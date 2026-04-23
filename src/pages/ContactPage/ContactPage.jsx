import React, { useState } from 'react'
import { useLang } from '../../i18n/LangContext.jsx'
import Icon from '../../components/Icon/Icon.jsx'
import { sendContact } from '../../services/emailService.js'
import styles from './ContactPage.module.css'

const INFO_ICONS = { '📍':'pin', '📞':'phone', '✉️':'mail', '🕐':'clock' }

export default function ContactPage() {
  const { t, phonePh } = useLang()
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', subject:'', message:'' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handle = async () => {
    if (!form.name || !form.email || !form.message) return
    setSending(true); setError('')
    const result = await sendContact(form)
    setSending(false)
    if (result.ok) setSent(true)
    else setError(t.contact_error)
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.inner}>

          <div className={styles.top}>
            <span className="eyebrow">{t.contact_eyebrow}</span>
            <h1 className={styles.title}>
              {t.contact_title.replace(t.contact_italic, '')}
              <span className="serif-italic">{t.contact_italic}</span>
            </h1>
          </div>

          <div className={styles.grid}>

            {/* ── INFO PANEL ── */}
            <div className={styles.info}>
              {t.contact_info.map(({ icon, label, val }) => {
                const iconName = INFO_ICONS[icon] || 'pin'
                return (
                  <div key={label} className={styles.infoRow}>
                    <div className={styles.infoIconWrap}>
                      <Icon name={iconName} size={18} color="#4a7c59" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className={styles.infoLabel}>{label}</div>
                      <div className={styles.infoVal}>{val}</div>
                    </div>
                  </div>
                )
              })}

              {/* Social links */}
              <div className={styles.socials}>
                {[
                  { name:'facebook',  href:'#' },
                  { name:'instagram', href:'#' },
                  { name:'youtube',   href:'#' },
                  { name:'telegram',  href:'#' },
                ].map(({ name, href }) => (
                  <a key={name} href={href} className={styles.socialBtn} aria-label={name}>
                    <Icon name={name} size={17} strokeWidth={1.8} />
                  </a>
                ))}
              </div>
            </div>

            {/* ── FORM ── */}
            <div className={styles.formCard}>
              {sent ? (
                <div className={styles.success}>
                  <div className={styles.successIcon}>
                    <Icon name="checkCircle" size={52} color="#4a7c59" strokeWidth={1.5} />
                  </div>
                  <h3>{t.contact_ok_title}</h3>
                  <p>{t.contact_ok_text} <strong>{form.email}</strong> {t.contact_ok_sub}</p>
                </div>
              ) : (
                <>
                  <h3 className={styles.formTitle}>
                    <Icon name="comment" size={20} color="#4a7c59" strokeWidth={1.8} />
                    {t.contact_form}
                  </h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <Icon name="user" size={13} strokeWidth={2} />
                        {t.order_name}
                      </label>
                      <input value={form.name} onChange={set('name')} placeholder={t.order_name.replace(' *','')} />
                    </div>
                    <div className="form-group">
                      <label>
                        <Icon name="mail" size={13} strokeWidth={2} />
                        {t.order_email}
                      </label>
                      <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        <Icon name="phone" size={13} strokeWidth={2} />
                        {t.order_phone}
                      </label>
                      <input value={form.phone} onChange={set('phone')} placeholder={phonePh} />
                    </div>
                    <div className="form-group">
                      <label>
                        <Icon name="building" size={13} strokeWidth={2} />
                        {t.order_company}
                      </label>
                      <input value={form.company} onChange={set('company')} placeholder={t.order_optional} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      <Icon name="tag" size={13} strokeWidth={2} />
                      {t.contact_subject}
                    </label>
                    <input value={form.subject} onChange={set('subject')} placeholder={t.contact_subj_ph} />
                  </div>

                  <div className="form-group">
                    <label>
                      <Icon name="comment" size={13} strokeWidth={2} />
                      {t.contact_msg}
                    </label>
                    <textarea value={form.message} onChange={set('message')} placeholder={t.contact_msg_ph} />
                  </div>

                  {error && <p style={{ color:'#d93025', fontSize:13, marginBottom:12 }}>{error}</p>}

                  <button
                    className="btn-primary"
                    onClick={handle}
                    disabled={!form.name || !form.email || !form.message || sending}
                  >
                    <Icon name="send" size={15} strokeWidth={2} />
                    {sending ? t.contact_sending : t.contact_send}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
