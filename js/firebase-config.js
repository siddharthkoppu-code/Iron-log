// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEtY4ktwlhPq7sV5CIkg56HC_W59t9UKA",
  authDomain: "iron-log-c8b33.firebaseapp.com",
  projectId: "iron-log-c8b33",
  storageBucket: "iron-log-c8b33.firebasestorage.app",
  messagingSenderId: "164681992807",
  appId: "1:164681992807:web:086778f133b2cd0c1ae2c2",
  measurementId: "G-P0YD5TDH6Z"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence safely (only works on http/https)
if (window.location.protocol.startsWith('http')) {
  db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    console.warn('Firestore offline persistence notice:', err.message || err.code);
  });
}
