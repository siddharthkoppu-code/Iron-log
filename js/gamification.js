// Gamification — PR Badges, Streak Tracker, Data Export
const Gamification = (() => {
  // ---- Toast System ----

  function showToast(message, type = 'default', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}-toast`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ---- PR Detection ----

  // prMap: { exerciseName: bestValue }
  let prMap = {};

  async function loadPRs() {
    const workouts = await Store.getAllWorkouts();
    prMap = {};
    for (const w of workouts) {
      for (const ex of w.exercises || []) {
        const best = getBestFromSets(ex);
        if (best !== null) {
          if (prMap[ex.name] === undefined || best > prMap[ex.name]) {
            prMap[ex.name] = best;
          }
        }
      }
    }
  }

  function getBestFromSets(exercise) {
    if (!exercise.sets?.length) return null;
    let best = null;
    for (const s of exercise.sets) {
      let val = null;
      if (exercise.type === 'weighted') val = s.weight;
      else if (exercise.type === 'reps') val = s.reps;
      else if (exercise.type === 'timed') val = s.seconds;
      else if (exercise.type === 'cardio') val = s.minutes;
      if (val !== null && val !== undefined && (best === null || val > best)) {
        best = val;
      }
    }
    return best;
  }

  function checkForPRs(exercises) {
    const newPRs = [];
    for (const ex of exercises) {
      const best = getBestFromSets(ex);
      if (best === null) continue;
      const prev = prMap[ex.name];
      if (prev === undefined || best > prev) {
        const unit = ex.type === 'weighted' ? 'kg' :
                     ex.type === 'timed' ? 's' :
                     ex.type === 'cardio' ? 'min' : 'reps';
        newPRs.push({ name: ex.name, value: best, unit });
        prMap[ex.name] = best;
      }
    }
    return newPRs;
  }

  function announcePRs(prs) {
    for (const pr of prs) {
      showToast(`🏆 New PR: ${pr.name} — ${pr.value}${pr.unit}`, 'pr', 4500);
    }
  }

  // ---- Streak Tracking ----

  function getScheduledDates(workouts) {
    // Gym days: Mon=1, Wed=3, Fri=5
    const scheduledDays = [1, 3, 5];
    const loggedDates = new Set(workouts.map(w => w.date));
    return { scheduledDays, loggedDates };
  }

  function calculateStreak(workouts) {
    if (!workouts.length) return 0;

    const { scheduledDays, loggedDates } = getScheduledDates(workouts);

    // Walk backward from today, checking each scheduled day
    let streak = 0;
    const today = new Date();
    const cursor = new Date(today);

    // Go back up to 365 days max
    for (let i = 0; i < 365; i++) {
      const dayOfWeek = cursor.getDay();
      if (scheduledDays.includes(dayOfWeek)) {
        const dateStr = cursor.toISOString().split('T')[0];
        // If today is a scheduled day and we haven't worked out yet, skip it
        if (i === 0 && !loggedDates.has(dateStr)) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        if (loggedDates.has(dateStr)) {
          streak++;
        } else {
          break;
        }
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  async function updateStreakDisplay() {
    const workouts = await Store.getAllWorkouts();
    const streak = calculateStreak(workouts);
    const badge = document.getElementById('streak-badge');
    const count = document.getElementById('streak-count');
    if (streak > 0) {
      badge.style.display = '';
      count.textContent = streak;
    } else {
      badge.style.display = 'none';
    }
  }

  // ---- Data Export ----

  async function exportData() {
    try {
      const data = await Store.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iron-log-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Data exported successfully', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please try again.', 'default');
    }
  }

  return {
    showToast,
    loadPRs,
    checkForPRs,
    announcePRs,
    calculateStreak,
    updateStreakDisplay,
    exportData
  };
})();
