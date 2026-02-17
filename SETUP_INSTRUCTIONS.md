# Email Verification & Notifications Setup Instructions

## Prerequisites
- Node.js 18+ installed
- A Firebase account
- A code editor
- Terminal/command line access

---

## Part 1: Firebase Project Setup (5 minutes)

### Step 1: Create/Access Your Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select your existing project
3. Follow the setup wizard (enable Google Analytics if desired)

### Step 2: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** → **Project settings**
2. Scroll down to **"Your apps"**
3. Click the **web icon** `</>` to add a web app
4. Register your app with a nickname (e.g., "Pattrn Web")
5. Copy the Firebase config object - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 3: Create Environment File

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials:
   ```bash
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

---

## Part 2: Enable Authentication (3 minutes)

### Step 1: Enable Email/Password Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Email/Password**
3. Toggle **Enable** switch
4. Click **Save**

### Step 2: Add Authorized Domains

1. Still in **Sign-in method**, scroll to **Authorized domains**
2. Add these domains:
   - `localhost` (already there)
   - Your production domain (e.g., `yourapp.vercel.app`)
3. Click **Add domain** for each

### Step 3: Customize Email Templates (Optional)

1. Go to **Authentication** → **Templates**
2. Click on **Email address verification**
3. Customize:
   - Sender name
   - Subject line
   - Email body
4. Click **Save**

---

## Part 3: Firebase CLI Setup (5 minutes)

### Step 1: Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window to authenticate.

### Step 3: Link Your Project

```bash
# In your project directory
firebase use --add
```

1. Select your Firebase project from the list
2. Give it an alias (e.g., "default" or "production")

### Step 4: Deploy Database Rules

```bash
firebase deploy --only database
```

You should see:
```
✔ Deploy complete!
```

---

## Part 4: Test Email Verification (5 minutes)

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Create Test Account

1. Open your app in browser (usually `http://localhost:5173`)
2. Click to open the radial menu (bottom-right FAB)
3. Navigate to sign-up
4. **Use a REAL email address you can access**
5. Create an account

### Step 3: Check Your Email

1. Check your email inbox (and spam/junk folder)
2. Look for "Verify your email for Pattrn"
3. Click the verification link

### Step 4: Verify in App

1. You should be redirected back to your app
2. Should see: "Email verified successfully!" toast
3. Open Profile → Email Notifications
4. The warning banner should be gone

✅ **Email verification is now working!**

---

## Part 5: Set Up Email Notifications (Optional - 30 minutes)

This enables *actual* email sending for notifications (achievements, mosaic shares, etc.)

### Option A: Using SendGrid (Recommended)

#### 1. Sign up for SendGrid

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for free account (100 emails/day free)
3. Verify your email address

#### 2. Create API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it "Pattrn Functions"
4. Select **Full Access**
5. Copy the API key (you won't see it again!)

#### 3. Set Up Domain Authentication (Optional but Recommended)

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the wizard to add DNS records
4. This prevents emails from going to spam

#### 4. Install Functions Dependencies

```bash
cd functions
npm install
npm install @sendgrid/mail
cd ..
```

#### 5. Configure SendGrid in Functions

Edit `functions/index.js` and add at the top:

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().sendgrid.key);
```

Then replace the TODO comments with actual email sending:

```javascript
// Example: Send welcome email
await sgMail.send({
  to: user.email,
  from: 'noreply@yourdomain.com', // Use your verified domain
  subject: 'Welcome to Pattrn!',
  html: `
    <h1>Welcome to Pattrn!</h1>
    <p>Thanks for joining, ${user.displayName || 'Player'}!</p>
  `,
});
```

#### 6. Set API Key in Firebase Config

```bash
firebase functions:config:set sendgrid.key="YOUR_API_KEY_HERE"
```

#### 7. Deploy Functions

```bash
firebase deploy --only functions
```

### Option B: Using Firebase Email Extension (Easier)

#### 1. Install Extension

```bash
firebase ext:install firebase/firestore-send-email
```

#### 2. Configure During Installation

- **SMTP Connection**: Choose SendGrid, Mailgun, or custom
- **FROM Address**: `noreply@yourdomain.com`
- **Default Reply-To**: Your support email

#### 3. The extension creates a Firestore collection called `mail`

Update `functions/index.js` to use it:

```javascript
// Example: Send welcome email
await admin.firestore().collection('mail').add({
  to: user.email,
  message: {
    subject: 'Welcome to Pattrn!',
    html: '<h1>Welcome!</h1><p>Thanks for joining!</p>',
  }
});
```

---

## Part 6: Test Email Notifications

### Test Locally with Emulators (Recommended)

1. Start emulators:
   ```bash
   firebase emulators:start
   ```

2. Visit Emulator UI at `http://localhost:4000`

3. You can:
   - See function logs in real-time
   - Trigger functions manually
   - Test without deploying

### Test in Production

1. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

2. Trigger events in your app:
   - Share a mosaic with someone
   - Complete a puzzle
   - Have a friend complete a puzzle

3. Check Firebase Console:
   - Go to **Functions** → **Logs**
   - See function execution logs

4. Check email service dashboard:
   - SendGrid: See delivery stats
   - Monitor opens, clicks, bounces

---

## Part 7: Deploy to Production

### Step 1: Build for Production

```bash
npm run build
```

### Step 2: Deploy to Vercel (or your hosting)

```bash
# If using Vercel
vercel --prod

# Or commit and push if auto-deploy is set up
git add .
git commit -m "Set up email verification and notifications"
git push origin main
```

### Step 3: Add Environment Variables to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all `VITE_FIREBASE_*` variables from your `.env` file
3. Redeploy if needed

### Step 4: Update Authorized Domains in Firebase

1. Firebase Console → Authentication → Sign-in method
2. Add your Vercel domain to **Authorized domains**

---

## Troubleshooting

### Emails not arriving?

✅ Check spam/junk folder
✅ Verify email in Firebase Console → Authentication
✅ Check authorized domains include current domain
✅ Try different email provider (Gmail, Outlook)
✅ Check Firebase Functions logs for errors

### "Firebase not configured" error?

✅ Make sure `.env` file exists and has all variables
✅ Restart dev server after adding `.env`
✅ Check for typos in environment variable names

### Database rules error?

```bash
firebase deploy --only database
```

### Functions not deploying?

✅ Make sure you're in the right project: `firebase use`
✅ Check Node version: `node --version` (should be 18+)
✅ Install dependencies: `cd functions && npm install`
✅ Check functions logs: `firebase functions:log`

---

## Quick Reference Commands

```bash
# Start development
npm run dev

# Deploy database rules
firebase deploy --only database

# Deploy functions
firebase deploy --only functions

# Deploy everything
firebase deploy

# View logs
firebase functions:log

# Test locally with emulators
firebase emulators:start

# Check which project you're using
firebase use
```

---

## What You Get

✅ Email verification on sign-up
✅ Verification email with custom link
✅ Email verified status tracking
✅ Resend verification email option
✅ Email notification preferences UI
✅ Toggle for 5 notification types
✅ Preferences saved to Firebase
✅ Ready for email service integration

## Next Steps (Optional)

- [ ] Set up SendGrid or Mailgun account
- [ ] Deploy Firebase Functions
- [ ] Create custom email templates
- [ ] Add more notification triggers
- [ ] Set up email analytics
- [ ] Configure weekly digest schedule

---

Need help? Check the Firebase documentation:
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [SendGrid Node.js](https://docs.sendgrid.com/for-developers/sending-email/nodejs-code-example)
