# Iron Log — Workout Tracker

A modern, mobile-first workout tracking progressive web app built for progressive overload tracking, personal record detection, streak gamification, and body weight trend analytics.

---

## Features

- **Workout Logging**: Preset routines (Workout A / Workout B) with prefilled starting weights, set completion checkmarks, and auto-progression placeholders from your last session.
- **Custom Exercises**: Track any ad-hoc exercise outside the standard routine (Weighted, Reps-only, Timed, Cardio).
- **Progress Charts**: Exercise-specific progression charts rendered with Chart.js showing top sets, all-time PRs, and net changes over time.
- **Body Weight Tracker**: Log daily check-ins with trend line visualizations and historical entry management.
- **History & Inline Editing**: Full historical session view with live editable set values and single-click session deletion.
- **Gamification**:
  - 🏆 Real-time PR toast notifications when beating previous bests.
  - 🔥 Consecutive workout streak counter based on your scheduled training days (Mon/Wed/Fri).
- **Data Export**: Full JSON export of all workout sessions, body weight logs, and custom exercises.
- **Cloud Sync**: Firebase Authentication (Google Sign-In) + Cloud Firestore with offline persistence enabled.

---

## Setup & Deployment to GitHub Pages

### 1. Firebase Configuration

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** → Sign-in method → **Google**.
3. Enable **Cloud Firestore** in production or test mode.
4. Add the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Copy your web app config from Firebase Project Settings into `js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. In Firebase Authentication → Settings → **Authorized domains**, add your GitHub Pages domain:
   - `<username>.github.io`

---

### 2. Deploy to GitHub Pages

1. Initialize a git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Iron Log Workout Tracker"
   ```

2. Create a repository on GitHub (e.g. `workout-tracker`).

3. Push your code:
   ```bash
   git remote add origin https://github.com/<username>/workout-tracker.git
   git branch -M main
   git push -u origin main
   ```

4. Enable GitHub Pages:
   - Go to your repository on GitHub.
   - Click **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
   - Select branch `main` and folder `/ (root)`.
   - Click **Save**.

Your app will be live at `https://<username>.github.io/workout-tracker/`.
