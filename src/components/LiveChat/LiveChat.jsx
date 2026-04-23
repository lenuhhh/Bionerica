import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLang } from '../../i18n/LangContext.jsx'
import { tgGetUpdates, forwardMessage, notifyNewChat } from '../../services/telegramService.js'
import styles from './LiveChat.module.css'

function genSession() { return 'sess_' + Math.random().toString(36).slice(2,9) + '_' + Date.now() }
function fmt(ts) { return new Date(ts).toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' }) }

function getSmartReply(text, smartReplies, fallback) {
  if (!smartReplies || !text) return fallback
  const lower = text.toLowerCase()
  for (const group of smartReplies) {
    if (group.keywords.some(kw => lower.includes(kw))) {
      const replies = group.replies
      return replies[Math.floor(Math.random() * replies.length)]
    }
  }
  return fallback
}

export default function LiveChat() {
  const { t } = useLang()
  const GREET = { id:0, from:'bot', text: t.chat_greet, ts: Date.now() }

  const [open,      setOpen]      = useState(false)
  const [msgs,      setMsgs]      = useState([GREET])
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [unread,    setUnread]    = useState(0)
  const [sessionId]               = useState(genSession)
  const [firstMsg,  setFirstMsg]  = useState(true)
  const [tgOffset,  setTgOffset]  = useState(0)
  const [polling,   setPolling]   = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const pollRef  = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])
  useEffect(() => { if (open) { setUnread(0); setTimeout(()=>inputRef.current?.focus(), 280) } }, [open])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    setPolling(true)
    pollRef.current = setInterval(async () => {
      const updates = await tgGetUpdates(tgOffset)
      if (!updates.length) return
      let newOffset = tgOffset
      const newMsgs = []
      updates.forEach(upd => {
        newOffset = upd.update_id + 1
        const msg = upd.message
        if (!msg?.text) return
        if (!msg.text.startsWith('💬 ') && !msg.text.includes('[')) {
          newMsgs.push({ id:upd.update_id, from:'bot', text:msg.text, ts:(msg.date||Date.now()/1000)*1000 })
        }
      })
      if (newOffset !== tgOffset) setTgOffset(newOffset)
      if (newMsgs.length) { setMsgs(prev=>[...prev,...newMsgs]); if (!open) setUnread(u=>u+newMsgs.length) }
    }, 3000)
  }, [tgOffset, open])

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current=null }; setPolling(false) }, [])
  useEffect(() => { if (!firstMsg) startPolling(); return ()=>{ if (firstMsg) stopPolling() } }, [firstMsg])
  useEffect(() => () => stopPolling(), [])

  const sendMsg = useCallback(async (text) => {
    if (!text.trim() || sending) return
    setInput(''); setSending(true)
    const userMsg = { id:Date.now(), from:'user', text:text.trim(), ts:Date.now() }
    setMsgs(prev=>[...prev, userMsg])
    if (firstMsg) { setFirstMsg(false); await notifyNewChat({ sessionId, message: text.trim() }) }
    else { await forwardMessage({ message: text.trim(), sessionId }) }
    setSending(false)

    // Show typing indicator
    const typingId = Date.now() + 1
    setMsgs(prev => [...prev, { id: typingId, from: 'bot', text: '...', ts: Date.now(), isTyping: true }])

    const delay = 900 + Math.random() * 600
    setTimeout(() => {
      setMsgs(prev => {
        const withoutTyping = prev.filter(m => m.id !== typingId)
        const hasRealReply = withoutTyping.slice(-3).some(m => m.from === 'bot' && m.id !== 0 && !m.isAuto)
        if (hasRealReply) return withoutTyping
        const smartReply = getSmartReply(text.trim(), t.chat_smart_replies, t.chat_auto)
        return [...withoutTyping, { id: Date.now() + 2, from: 'bot', text: smartReply, ts: Date.now(), isAuto: true }]
      })
    }, delay)
  }, [sending, firstMsg, sessionId, t])

  const handleKey = e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMsg(input) } }

  return (
    <>
      <button className={`${styles.fab} ${open?styles.fabOpen:''}`} onClick={()=>setOpen(o=>!o)} aria-label="Chat">
        {open ? <span className={styles.fabIcon}>✕</span> : <>
          <span className={styles.fabIcon}>💬</span>
          {unread>0 && <span className={styles.badge}>{unread}</span>}
        </>}
        {polling&&!open&&<span className={styles.pollDot}/>}
      </button>

      <div className={`${styles.window} ${open?styles.windowOpen:''}`}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&crop=face" alt="" />
            <span className={`${styles.dot} ${polling?styles.dotActive:''}`}/>
          </div>
          <div className={styles.hInfo}>
            <div className={styles.hName}>{t.chat_support}</div>
            <div className={styles.hSub}>{polling ? t.chat_online : t.chat_away}</div>
          </div>
          <button className={styles.closeBtn} onClick={()=>setOpen(false)}>✕</button>
        </div>

        <div className={styles.body}>
          {msgs.map(msg=>(
            <div key={msg.id} className={`${styles.msgWrap} ${msg.from==='user'?styles.msgUser:styles.msgBot}`}>
              {msg.from==='bot'&&<img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face" className={styles.mAvatar} alt=""/>}
              <div>
                <div className={`${styles.bubble} ${msg.isAuto?styles.bubbleAuto:''} ${msg.isTyping?styles.bubbleTyping:''}`}>
                  {msg.isTyping ? <span className={styles.dots}><span/><span/><span/></span> : msg.text}
                </div>
                {!msg.isTyping && <div className={styles.mTime}>{fmt(msg.ts)}</div>}
              </div>
            </div>
          ))}
          {msgs.length<=1&&(
            <div className={styles.quick}>
              {t.chat_quick.map(q=>(<button key={q} className={styles.qBtn} onClick={()=>sendMsg(q)}>{q}</button>))}
            </div>
          )}
          {sending&&(
            <div className={`${styles.msgWrap} ${styles.msgUser}`}>
              <div className={styles.bubble} style={{opacity:.5}}><span className={styles.dots}><span/><span/><span/></span></div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        <div className={styles.footer}>
          <input ref={inputRef} className={styles.input} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey} placeholder={t.chat_ph} disabled={sending}/>
          <button className={styles.sendBtn} onClick={()=>sendMsg(input)} disabled={!input.trim()||sending}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div className={styles.brand}>{t.chat_brand}</div>
      </div>
    </>
  )
}
