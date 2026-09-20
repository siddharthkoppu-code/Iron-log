// Main App Controller — Auth, Guest Mode, Tab Navigation, Initialization
const App = (() => {
  function init() {
    setupAuth();
    setupNavigation();
    setupExport();
  }

  // ---- Authentication & Guest Mode ----

  function setupAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const signInBtn = document.getElementById('google-sign-in');
    const guestBtn = document.getElementById('guest-sign-in');
    const signOutBtn = document.getElementById('sign-out-btn');

    // Google Sign-In
    signInBtn.addEventListener('click', async () => {
      // If on file:/// protocol, inform the user
      if (window.location.protocol === 'file:') {
        Gamification.showToast('ℹ️ Google Sign-In requires http:// or GitHub Pages. Using Guest Mode for local file view.', 'default', 5000);
        enterGuestMode();
        return;
      }

      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch (err) {
        console.error('Sign-in error:', err);
        if (err.code === 'auth/popup-blocked') {
          Gamification.showToast('Popup blocked by browser. Please allow popups for this site.');
        } else if (err.code === 'auth/unauthorized-domain') {
          Gamification.showToast('Domain not authorized in Firebase Console. Using guest mode.');
          enterGuestMode();
        } else if (err.code !== 'auth/popup-closed-by-user') {
          Gamification.showToast(`Sign-in note: ${err.message || 'Error connecting to Google'}`);
        }
      }
    });

    // Guest Mode Button
    guestBtn.addEventListener('click', () => {
      enterGuestMode();
    });

    // Sign Out
    signOutBtn.addEventListener('click', async () => {
      Store.setGuestMode(false);
      try {
        if (auth.currentUser) await auth.signOut();
      } catch (e) {
        console.warn('Sign-out note:', e);
      }
      authScreen.classList.add('active');
      appScreen.classList.remove('active');
    });

    // Firebase Auth State Listener
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        Store.setGuestMode(false);
        authScreen.classList.remove('active');
        appScreen.classList.add('active');
        await Store.syncLocalToFirestore();
        await onAppLoaded();
      } else {
        // If guest mode was previously chosen in this browser session
        if (Store.isGuestMode()) {
          authScreen.classList.remove('active');
          appScreen.classList.add('active');
          await onAppLoaded();
        } else {
          authScreen.classList.add('active');
          appScreen.classList.remove('active');
        }
      }
    });
  }

  async function enterGuestMode() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    Store.setGuestMode(true);
    authScreen.classList.remove('active');
    appScreen.classList.add('active');
    await onAppLoaded();
    Gamification.showToast('⚡ Running in Local Mode — data saved to this device', 'default');
  }

  async function onAppLoaded() {
    await Gamification.loadPRs();
    await Gamification.updateStreakDisplay();
    await WorkoutTab.init();
    await ProgressTab.init();
  }

  // ---- Tab Navigation ----

  function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.tab-panel');

    navBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const tabId = btn.dataset.tab;

        // Update nav
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update panels
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');

        // Lazy-load / refresh content for specific tabs
        if (tabId === 'progress') {
          await ProgressTab.onTabActivated();
        } else if (tabId === 'bodyweight') {
          await ProgressTab.onBWTabActivated();
        } else if (tabId === 'history') {
          await HistoryTab.init();
        }
      });
    });
  }

  // ---- Export ----

  function setupExport() {
    document.getElementById('export-btn').addEventListener('click', () => {
      Gamification.exportData();
    });
  }

  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
