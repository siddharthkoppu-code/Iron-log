// History Tab — Past workouts, inline editing, deletion
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

    list.innerHTML = '';

    if (!workouts.length) {
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';

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
                      workout.type === 'B' ? 'Workout B' : 'Custom';

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
      if (confirm(`Delete workout from ${dateLabel}?`)) {
        await Store.deleteWorkout(workout.date);
        card.remove();
        await Gamification.updateStreakDisplay();
        Gamification.showToast('Workout deleted');
        // Check if list is now empty
        const list = document.getElementById('history-list');
        if (!list.children.length) {
          document.getElementById('history-empty').style.display = '';
        }
      }
    });

    // Inline editing: debounced save on input change
    card.querySelectorAll('.editable-value').forEach(input => {
      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          const exIdx = parseInt(input.dataset.exIndex);
          const setIdx = parseInt(input.dataset.setIndex);
          const field = input.dataset.field;
          const value = parseFloat(input.value);
          if (isNaN(value)) return;
          await Store.updateWorkoutExercise(workout.date, exIdx, setIdx, field, value);
        }, 600);
      });
    });

    return card;
  }

  function buildHistoryBody(workout) {
    if (!workout.exercises?.length) return '<p style="color:var(--text-muted);font-size:13px">No exercises recorded</p>';

    let html = '';
    workout.exercises.forEach((ex, exIdx) => {
      html += `<div class="history-exercise">
        <div class="history-exercise-name">${ex.name}</div>`;

      ex.sets?.forEach((set, setIdx) => {
        html += `<div class="history-set">
          <span style="min-width:46px">Set ${setIdx + 1}</span>`;

        if (ex.type === 'weighted') {
          html += `
            <input class="editable-value" type="number" value="${set.weight ?? ''}"
              data-ex-index="${exIdx}" data-set-index="${setIdx}" data-field="weight" step="0.5">
            <span>kg ×</span>
            <input class="editable-value" type="number" value="${set.reps ?? ''}"
              data-ex-index="${exIdx}" data-set-index="${setIdx}" data-field="reps">
            <span>reps</span>`;
        } else if (ex.type === 'reps') {
          html += `
            <input class="editable-value" type="number" value="${set.reps ?? ''}"
              data-ex-index="${exIdx}" data-set-index="${setIdx}" data-field="reps">
            <span>reps</span>`;
        } else if (ex.type === 'timed') {
          html += `
            <input class="editable-value" type="number" value="${set.seconds ?? ''}"
              data-ex-index="${exIdx}" data-set-index="${setIdx}" data-field="seconds">
            <span>sec</span>`;
        } else if (ex.type === 'cardio') {
          html += `
            <input class="editable-value" type="number" value="${set.minutes ?? ''}"
              data-ex-index="${exIdx}" data-set-index="${setIdx}" data-field="minutes">
            <span>min</span>`;
        }

        html += `</div>`;
      });

      html += `</div>`;
    });

    return html;
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  return { init, refresh };
})();
