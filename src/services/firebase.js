/**
 * Firebase config — Green Region
 *
 * ──────────────────────────────────────────────────────
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create project "green-region"
 * 3. Add Web app → copy firebaseConfig below
 * 4. Enable Authentication → Google + GitHub providers
 *    - Google: just enable, no extra config needed
 *    - GitHub: create OAuth App at github.com/settings/developers
 *              Client ID + Secret → paste into Firebase console
 * 5. Add your domain to "Authorized domains" in Auth settings
 * 6. Enable Firestore Database (start in test mode)
 * ──────────────────────────────────────────────────────
 */

import { initializeApp }           from 'firebase/app'
import { getAuth }                  from 'firebase/auth'
import { getFirestore }             from 'firebase/firestore'

// 🔧 REPLACE with your Firebase project config
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app
