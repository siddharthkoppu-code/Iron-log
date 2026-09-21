// History Tab — Past workouts, read-only view with deletion support
const HistoryTab = (() => {
  let initialized = false;

  async function init() {
    initialized = true;
    await refresh();
  }

  async function refresh() {
    if (!initialized) return;
    const workouts = await Store.getAllWorkouts();
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');

    if (!list) return;
    list.innerHTML = '';

    if (!workouts || !workouts.length) {
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    for (const workout of workouts) {
      const card = buildHistoryCard(workout);
      list.appendChild(card);
    }
  }

  function buildHistoryCard(workout) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const dateLabel = formatDateFull(workout.date);
    const typeLabel = workout.type === 'A' ? 'Workout A' :
                      workout.type === 'B' ? 'Workout B' : `Workout ${workout.type || 'A'}`;

    card.innerHTML = `
      <div class="history-card-header">
        <div>
          <span class="history-date">${dateLabel}</span>
          <span class="history-label">${typeLabel}</span>
        </div>
        <div class="history-actions">
          <button class="btn-icon history-delete-btn" title="Delete workout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
          <svg class="exercise-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="history-card-body">
        ${buildHistoryBody(workout)}
      </div>
    `;

    // Toggle expand
    card.querySelector('.history-card-header').addEventListener('click', (e) => {
      // Don't toggle if delete button was clicked
      if (e.target.closest('.history-delete-btn')) return;
      card.classList.toggle('expanded');
    });

    // Delete
    card.querySelector('.history-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the workout from ${dateLabel}?`)) {
        await Store.deleteWorkout(workout.date);
        card.remove();
        await Gamification.updateStreakDisplay();
        Gamification.showToast('Workout deleted', 'default');

        // Check if list is now empty
        const list = document.getElementById('history-list');
        if (list && !list.children.length) {
          const empty = document.getElementById('history-empty');
          if (empty) empty.style.display = 'block';
        }
      }
    });

    return card;
  }

  function buildHistoryBody(workout) {
    if (!workout.exercises || !workout.exercises.length) {
      return '<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">No exercises recorded</p>';
    }

    let html = '';
    workout.exercises.forEach((ex) => {
      html += `<div class="history-exercise">
        <div class="history-exercise-name">${ex.name}</div>
        <div class="history-sets-grid">`;

      (ex.sets || []).forEach((set, setIdx) => {
        let setVal = '';
        if (ex.type === 'weighted' || (!ex.type && set.weight !== undefined)) {
          setVal = `${set.weight ?? 0} kg × ${set.reps ?? 0} reps`;
        } else if (ex.type === 'reps') {
          setVal = `${set.reps ?? 0} reps`;
        } else if (ex.type === 'timed') {
          setVal = `${set.seconds ?? set.time ?? set.reps ?? 0} sec`;
        } else if (ex.type === 'cardio') {
          setVal = `${set.minutes ?? set.time ?? 0} min`;
        } else {
          setVal = `${set.weight ? set.weight + ' kg × ' : ''}${set.reps ? set.reps + ' reps' : ''}`;
        }

        const isDone = set.completed !== false;
        const statusBadge = isDone
          ? '<span class="history-set-status completed" title="Completed">✓</span>'
          : '<span class="history-set-status skipped" title="Skipped">—</span>';

        html += `
          <div class="history-set-row">
            <span class="history-set-num">Set ${setIdx + 1}</span>
            <span class="history-set-value">${setVal}</span>
            ${statusBadge}
          </div>
        `;
      });

      html += `</div></div>`;
    });

    return html;
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  return { init, refresh };
})();
