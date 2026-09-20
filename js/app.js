// Main App Controller — Auth, Tab Navigation, Initialization
const App = (() => {
  function init() {
    setupAuth();
    setupNavigation();
    setupExport();
  }

  // ---- Authentication ----

  function setupAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const signInBtn = document.getElementById('google-sign-in');
    const signOutBtn = document.getElementById('sign-out-btn');

    signInBtn.addEventListener('click', async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch (err) {
        console.error('Sign-in error:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
          Gamification.showToast('Sign-in failed. Please try again.');
        }
      }
    });

    signOutBtn.addEventListener('click', async () => {
      await auth.signOut();
    });

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        authScreen.classList.remove('active');
        appScreen.classList.add('active');
        await onSignedIn();
      } else {
        authScreen.classList.add('active');
        appScreen.classList.remove('active');
      }
    });
  }

  async function onSignedIn() {
    await Gamification.loadPRs();
    await Gamification.updateStreakDisplay();
    await WorkoutTab.init();
    await ProgressTab.init();
    // History loads lazily when tab is first opened
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
