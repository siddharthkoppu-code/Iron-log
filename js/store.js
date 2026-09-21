// Dual-Engine Store Layer: Cloud Firestore (Authenticated) + LocalStorage (Guest/Offline)
const Store = (() => {
  let isGuest = false;

  function setGuestMode(val) {
    isGuest = val;
    if (val) {
      localStorage.setItem('iron_log_guest_mode', 'true');
    } else {
      localStorage.removeItem('iron_log_guest_mode');
    }
  }

  function isGuestMode() {
    return isGuest || localStorage.getItem('iron_log_guest_mode') === 'true';
  }

  function uid() {
    return (typeof auth !== 'undefined' && auth.currentUser?.uid) || null;
  }

  function userDoc() {
    const currentUid = uid();
    if (!currentUid || typeof db === 'undefined') return null;
    return db.collection('users').doc(currentUid);
  }

  // ---- LocalStorage Helpers ----

  function getLocal(key, fallback = []) {
    try {
      const data = localStorage.getItem(`iron_log_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  function setLocal(key, data) {
    try {
      localStorage.setItem(`iron_log_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  // ---- Workouts ----

  async function saveWorkout(dateStr, workoutType, exercises) {
    const payload = {
      date: dateStr,
      type: workoutType,
      exercises,
      updatedAt: new Date().toISOString()
    };

    // Always update local cache
    const localWorkouts = getLocal('workouts', []);
    const existingIdx = localWorkouts.findIndex(w => w.date === dateStr);
    if (existingIdx >= 0) {
      localWorkouts[existingIdx] = { ...localWorkouts[existingIdx], ...payload };
    } else {
      localWorkouts.unshift(payload);
    }
    setLocal('workouts', localWorkouts);

    // Save to Firestore if signed in
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          const ref = uDoc.collection('workouts').doc(dateStr);
          await ref.set({
            ...payload,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Firestore workout save notice, cached locally:', err);
      }
    }

    return payload;
  }

  async function getWorkout(dateStr) {
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          const doc = await uDoc.collection('workouts').doc(dateStr).get();
          if (doc.exists) return doc.data();
        }
      } catch (e) {
        console.warn('Firestore getWorkout notice, using local:', e);
      }
    }
    const localWorkouts = getLocal('workouts', []);
    return localWorkouts.find(w => w.date === dateStr) || null;
  }

  async function getAllWorkouts() {
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          const snap = await uDoc.collection('workouts')
            .orderBy('date', 'desc')
            .get();
          const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (remote.length) {
            setLocal('workouts', remote);
            return remote;
          }
        }
      } catch (e) {
        console.warn('Firestore getAllWorkouts notice, using local:', e);
      }
    }
    return getLocal('workouts', []).sort((a, b) => b.date.localeCompare(a.date));
  }

  async function deleteWorkout(dateStr) {
    const localWorkouts = getLocal('workouts', []).filter(w => w.date !== dateStr);
    setLocal('workouts', localWorkouts);

    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          await uDoc.collection('workouts').doc(dateStr).delete();
        }
      } catch (e) {
        console.warn('Firestore deleteWorkout notice:', e);
      }
    }
  }

  async function updateWorkoutExercise(dateStr, exerciseIndex, setIndex, field, value) {
    const doc = await getWorkout(dateStr);
    if (!doc || !doc.exercises?.[exerciseIndex]?.sets?.[setIndex]) return;
    doc.exercises[exerciseIndex].sets[setIndex][field] = value;
    await saveWorkout(dateStr, doc.type, doc.exercises);
  }

  // ---- Last Logged Values (for auto-prefill) ----

  async function getLastValues(exerciseName) {
    const workouts = await getAllWorkouts();
    for (const workout of workouts) {
      const match = workout.exercises?.find(e => e.name === exerciseName);
      if (match && match.sets?.length) {
        return match.sets;
      }
    }
    return null;
  }

  // ---- Body Weight ----

  async function logBodyWeight(dateStr, weight) {
    const entry = {
      id: dateStr,
      date: dateStr,
      weight: parseFloat(weight),
      timestamp: new Date().toISOString()
    };

    const localBW = getLocal('bodyweight', []);
    const existingIdx = localBW.findIndex(b => b.date === dateStr);
    if (existingIdx >= 0) {
      localBW[existingIdx] = entry;
    } else {
      localBW.unshift(entry);
    }
    setLocal('bodyweight', localBW);

    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          await uDoc.collection('bodyweight').doc(dateStr).set({
            date: dateStr,
            weight: parseFloat(weight),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Firestore logBodyWeight notice:', e);
      }
    }
  }

  async function getAllBodyWeight() {
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          const snap = await uDoc.collection('bodyweight')
            .orderBy('date', 'desc')
            .get();
          const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (remote.length) {
            setLocal('bodyweight', remote);
            return remote;
          }
        }
      } catch (e) {
        console.warn('Firestore getAllBodyWeight notice, using local:', e);
      }
    }
    return getLocal('bodyweight', []).sort((a, b) => b.date.localeCompare(a.date));
  }

  async function deleteBodyWeight(dateStr) {
    const localBW = getLocal('bodyweight', []).filter(b => b.date !== dateStr);
    setLocal('bodyweight', localBW);

    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          await uDoc.collection('bodyweight').doc(dateStr).delete();
        }
      } catch (e) {
        console.warn('Firestore deleteBodyWeight notice:', e);
      }
    }
  }

  // ---- Custom Exercises ----

  async function saveCustomExercises(exercises) {
    setLocal('custom_exercises', exercises);
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          await uDoc.set({ customExercises: exercises }, { merge: true });
        }
      } catch (e) {
        console.warn('Firestore saveCustomExercises notice:', e);
      }
    }
  }

  async function getCustomExercises() {
    if (!isGuestMode() && uid()) {
      try {
        const uDoc = userDoc();
        if (uDoc) {
          const doc = await uDoc.get();
          if (doc.exists && doc.data().customExercises) {
            setLocal('custom_exercises', doc.data().customExercises);
            return doc.data().customExercises;
          }
        }
      } catch (e) {
        console.warn('Firestore getCustomExercises notice, using local:', e);
      }
    }
    return getLocal('custom_exercises', []);
  }

  // ---- Migrate Local Data to Cloud ----

  async function syncLocalToFirestore() {
    if (isGuestMode() || !uid()) return;
    const uDoc = userDoc();
    if (!uDoc) return;

    const localWorkouts = getLocal('workouts', []);
    const localBW = getLocal('bodyweight', []);
    const localCustom = getLocal('custom_exercises', []);

    try {
      for (const w of localWorkouts) {
        await uDoc.collection('workouts').doc(w.date).set({
          date: w.date,
          type: w.type || 'A',
          exercises: w.exercises || [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      for (const b of localBW) {
        await uDoc.collection('bodyweight').doc(b.date).set({
          date: b.date,
          weight: b.weight,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      if (localCustom.length) {
        await uDoc.set({ customExercises: localCustom }, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore sync notice:', e);
    }
  }

  // ---- Data Export ----

  async function exportAll() {
    const [workouts, bodyweight, customExercises] = await Promise.all([
      getAllWorkouts(),
      getAllBodyWeight(),
      getCustomExercises()
    ]);
    return { workouts, bodyweight, customExercises, exportedAt: new Date().toISOString() };
  }

  return {
    setGuestMode,
    isGuestMode,
    saveWorkout,
    getWorkout,
    getAllWorkouts,
    deleteWorkout,
    updateWorkoutExercise,
    getLastValues,
    logBodyWeight,
    getAllBodyWeight,
    deleteBodyWeight,
    saveCustomExercises,
    getCustomExercises,
    syncLocalToFirestore,
    exportAll
  };
})();
