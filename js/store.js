// Firestore CRUD Layer
const Store = (() => {
  function uid() {
    return auth.currentUser?.uid;
  }

  function userDoc() {
    return db.collection('users').doc(uid());
  }

  // ---- Workouts ----

  async function saveWorkout(dateStr, workoutType, exercises) {
    // dateStr is YYYY-MM-DD, workoutType is 'A' or 'B' or 'custom'
    const ref = userDoc().collection('workouts').doc(dateStr);
    const data = {
      date: dateStr,
      type: workoutType,
      exercises,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(data, { merge: true });
    return data;
  }

  async function getWorkout(dateStr) {
    const doc = await userDoc().collection('workouts').doc(dateStr).get();
    return doc.exists ? doc.data() : null;
  }

  async function getAllWorkouts() {
    const snap = await userDoc().collection('workouts')
      .orderBy('date', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function deleteWorkout(dateStr) {
    await userDoc().collection('workouts').doc(dateStr).delete();
  }

  async function updateWorkoutExercise(dateStr, exerciseIndex, setIndex, field, value) {
    const doc = await getWorkout(dateStr);
    if (!doc) return;
    doc.exercises[exerciseIndex].sets[setIndex][field] = value;
    await saveWorkout(dateStr, doc.type, doc.exercises);
  }

  // ---- Last Logged Values (for auto-prefill) ----

  async function getLastValues(exerciseName) {
    const snap = await userDoc().collection('workouts')
      .orderBy('date', 'desc')
      .limit(20)
      .get();

    for (const doc of snap.docs) {
      const workout = doc.data();
      const match = workout.exercises?.find(e => e.name === exerciseName);
      if (match && match.sets?.length) {
        return match.sets;
      }
    }
    return null;
  }

  // ---- Body Weight ----

  async function logBodyWeight(dateStr, weight) {
    await userDoc().collection('bodyweight').doc(dateStr).set({
      date: dateStr,
      weight: parseFloat(weight),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function getAllBodyWeight() {
    const snap = await userDoc().collection('bodyweight')
      .orderBy('date', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function deleteBodyWeight(dateStr) {
    await userDoc().collection('bodyweight').doc(dateStr).delete();
  }

  // ---- Custom Exercises ----

  async function saveCustomExercises(exercises) {
    await userDoc().set({ customExercises: exercises }, { merge: true });
  }

  async function getCustomExercises() {
    const doc = await userDoc().get();
    return doc.exists ? (doc.data().customExercises || []) : [];
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
    exportAll
  };
})();
