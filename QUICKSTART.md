# 🚀 Quick Start - Email Verification Setup

Follow these steps on **your local machine** to get email verification working in 15 minutes.

## Prerequisites
- Node.js 18+ installed
- Firebase account (free tier is fine)
- Terminal access

---

## Step 1: Get Firebase Credentials (5 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Click gear icon → **Project settings**
4. Scroll to **"Your apps"** → Click web icon `</>`
5. Register app as "Pattrn Web"
6. Copy the config values

## Step 2: Set Up Environment (2 min)

```bash
# In your project directory
cp .env.example .env
```

Edit `.env` and paste your Firebase credentials:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 3: Enable Email Auth in Firebase (2 min)

1. Firebase Console → **Authentication** → **Sign-in method**
2. Click **Email/Password** → Toggle **Enable** → **Save**
3. Scroll to **Authorized domains** → Add `localhost`

## Step 4: Deploy Database Rules (2 min)

```bash
# Install Firebase CLI (skip if already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Link your project
firebase use --add
# (Select your project, name it "default")

# Deploy database rules
firebase deploy --only database
```

## Step 5: Test It! (4 min)

```bash
# Start dev server
npm run dev
```

1. Open http://localhost:5173
2. Sign up with a **real email address**
3. Check your email inbox (and spam folder!)
4. Click verification link
5. See "Email verified successfully!" message ✅

---

## That's It! 🎉

Email verification is now working. Users will get verification emails when they sign up.

## What's Next?

To enable **actual email notifications** (for achievements, mosaic shares, etc.):

👉 See `SETUP_INSTRUCTIONS.md` for full guide

This includes:
- Setting up SendGrid (100 free emails/day)
- Deploying Cloud Functions
- Creating email templates

**But you don't need this to use email verification!** That already works.

---

## Troubleshooting

**No email received?**
- Check spam/junk folder
- Try a different email (Gmail, Outlook)
- Check Firebase Console → Authentication → Templates (verify it's enabled)

**"Firebase not configured" error?**
- Make sure `.env` file exists
- Restart dev server after creating `.env`

**Database rules error?**
```bash
firebase deploy --only database
```

---

## Quick Commands

```bash
# Start development
npm run dev

# Deploy database rules
firebase deploy --only database

# Check current project
firebase use

# View help
firebase --help
```

Need the detailed guide? → Open `SETUP_INSTRUCTIONS.md`
