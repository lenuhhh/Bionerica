import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, orderBy, getDocs, addDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { auth, db } from '../services/firebase.js'

const googleProvider = new GoogleAuthProvider()
const githubProvider = new GithubAuthProvider()

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]    = useState(null)
  const [profile,     setProfile] = useState(null)
  const [orders,      setOrders]  = useState([])
  const [reviews,     setReviews] = useState([])
  const [favorites,   setFavorites] = useState([])  // array of product ids
  const [loading,     setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await loadProfile(u)
        await loadOrders(u.uid)
        await loadUserReviews(u.uid)
      } else {
        setProfile(null); setOrders([]); setReviews([]); setFavorites([])
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function loadProfile(u) {
    try {
      const ref  = doc(db, 'users', u.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setProfile(data)
        setFavorites(data.favorites || [])
      } else {
        // First login — create profile from OAuth data
        const data = {
          uid:       u.uid,
          name:      u.displayName || '',
          email:     u.email || '',
          photo:     u.photoURL || '',
          phone:     '',
          favorites: [],
          createdAt: serverTimestamp(),
        }
        await setDoc(ref, data)
        setProfile(data)
        setFavorites([])
      }
    } catch (e) { console.error('loadProfile', e) }
  }

  async function loadOrders(uid) {
    try {
      const q    = query(collection(db, 'orders'), where('uid', '==', uid), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error('loadOrders', e) }
  }

  async function loadUserReviews(uid) {
    try {
      const q    = query(collection(db, 'reviews'), where('uid', '==', uid), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error('loadUserReviews', e) }
  }

  // ── OAuth sign-in ─────────────────────────────────────
  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    return cred.user
  }

  async function loginWithGithub() {
    const cred = await signInWithPopup(auth, githubProvider)
    return cred.user
  }

  async function logout() {
    await signOut(auth)
  }

  // ── Profile update ────────────────────────────────────
  async function updateUserProfile(data) {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid), data)
    setProfile(p => ({ ...p, ...data }))
  }

  // ── Favorites ─────────────────────────────────────────
  async function toggleFavorite(productId) {
    if (!user) return
    const isFav = favorites.includes(productId)
    const ref   = doc(db, 'users', user.uid)
    if (isFav) {
      await updateDoc(ref, { favorites: arrayRemove(productId) })
      setFavorites(f => f.filter(id => id !== productId))
    } else {
      await updateDoc(ref, { favorites: arrayUnion(productId) })
      setFavorites(f => [...f, productId])
    }
  }

  function isFavorite(productId) {
    return favorites.includes(productId)
  }

  // ── Save order ────────────────────────────────────────
  async function saveOrder({ items, total, client }) {
    if (!user) return
    const ref = await addDoc(collection(db, 'orders'), {
      uid:       user.uid,
      items:     items.map(p => ({ id: p.id, name: p.name, qty: p.qty, price: p.price, origin: p.origin || '', img: p.img || '' })),
      total,
      client:    { name: client.name, phone: client.phone, address: client.address },
      status:    'new',
      createdAt: serverTimestamp(),
    })
    await loadOrders(user.uid)
    return ref.id
  }

  // ── Add review ────────────────────────────────────────
  async function addReview({ rating, text, role }) {
    if (!user) return
    await addDoc(collection(db, 'reviews'), {
      uid:       user.uid,
      name:      profile?.name || user.displayName || 'Аноним',
      photo:     profile?.photo || user.photoURL || '',
      role:      role || '',
      rating,
      text,
      approved:  false,
      createdAt: serverTimestamp(),
    })
    await loadUserReviews(user.uid)
  }

  // ── Load approved reviews (for Testimonials) ──────────
  async function loadApprovedReviews() {
    try {
      const q    = query(collection(db, 'reviews'), where('approved', '==', true), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) { return [] }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, orders, reviews, favorites, loading,
      loginWithGoogle, loginWithGithub, logout,
      updateUserProfile, saveOrder, addReview, loadApprovedReviews,
      toggleFavorite, isFavorite,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
