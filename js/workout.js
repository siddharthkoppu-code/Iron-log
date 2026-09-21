// Workout Tab — Exercise cards, set inputs, save logic
const WorkoutTab = (() => {
  let currentWorkout = 'A';
  let customExercises = [];
  let initialized = false;
  let renderSeq = 0;

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  async function init() {
    customExercises = await Store.getCustomExercises();
    await renderExercises();

    if (!initialized) {
      setupToggle();
      setupAddExercise();
      setupSave();
      initialized = true;
    }
  }

  function setupToggle() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentWorkout = btn.dataset.workout;

        const dayLabel = document.getElementById('workout-day-label');
        if (dayLabel) {
          dayLabel.textContent = currentWorkout === 'A' ? 'Mon / Fri' : 'Wed';
        }
        await renderExercises();
      });
    });
  }

  async function renderExercises() {
    const list = document.getElementById('exercise-list');
    if (!list) return;

    const currentSeq = ++renderSeq;
    const preset = PRESETS[currentWorkout] || PRESETS['A'];

    // Deduplicate against presets
    const existingNames = new Set((preset.exercises || []).map(e => e.name.toLowerCase()));
    const uniqueCustom = (customExercises || []).filter(e => !existingNames.has(e.name.toLowerCase()));
    const allExercises = [...(preset.exercises || []), ...uniqueCustom];

    const fragment = document.createDocumentFragment();

    for (const ex of allExercises) {
      const lastSets = await Store.getLastValues(ex.name);
      // Abort if another render started in the meantime
      if (currentSeq !== renderSeq) return;
      const card = buildExerciseCard(ex, lastSets);
      fragment.appendChild(card);
    }

    if (currentSeq === renderSeq) {
      list.innerHTML = '';
      list.appendChild(fragment);
    }
  }

  function buildExerciseCard(exercise, lastSets) {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.dataset.exerciseName = exercise.name;
    card.dataset.exerciseType = exercise.type;

    const meta = getExerciseMeta(exercise);

    card.innerHTML = `
      <div class="exercise-card-header">
        <div>
          <div class="exercise-name">${exercise.name}</div>
          <div class="exercise-meta">${meta}</div>
        </div>
        <svg class="exercise-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="exercise-card-body">
        ${buildSetRows(exercise, lastSets)}
      </div>
    `;

    // Toggle expand/collapse
    card.querySelector('.exercise-card-header').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });

    // Set check buttons
    card.querySelectorAll('.set-check').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('checked');
      });
    });

    return card;
  }

  function getExerciseMeta(ex) {
    if (ex.type === 'weighted') return `${ex.sets} sets × ${ex.reps} reps`;
    if (ex.type === 'reps') return `${ex.sets} sets × ${ex.reps} reps`;
    if (ex.type === 'timed') return `${ex.sets} sets × ${ex.seconds}s`;
    if (ex.type === 'cardio') return `${ex.sets || 1} × ${ex.minutes} min`;
    return `${ex.sets} sets`;
  }

  function buildSetRows(exercise, lastSets) {
    const numSets = exercise.sets || 3;
    let rows = '';

    for (let i = 0; i < numSets; i++) {
      const last = lastSets?.[i];
      rows += buildSetRow(exercise, i, last);
    }

    return rows;
  }

  function buildSetRow(exercise, index, lastValues) {
    const setNum = index + 1;
    const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';

    if (exercise.type === 'weighted') {
      const phWeight = lastValues?.weight ?? exercise.startWeight ?? '';
      const phReps = lastValues?.reps ?? exercise.reps ?? '';
      return `
        <div class="set-row" data-set="${index}">
          <span class="set-number">Set ${setNum}</span>
          <div class="set-input">
            <input type="number" class="input-field" data-field="weight" placeholder="${phWeight}" step="0.5" min="0">
            <span class="input-unit">kg</span>
            <input type="number" class="input-field" data-field="reps" placeholder="${phReps}" min="0">
            <span class="input-unit">reps</span>
          </div>
          <button class="set-check">${checkSvg}</button>
        </div>`;
    }

    if (exercise.type === 'reps') {
      const phReps = lastValues?.reps ?? exercise.reps ?? '';
      return `
        <div class="set-row" data-set="${index}">
          <span class="set-number">Set ${setNum}</span>
          <div class="set-input">
            <input type="number" class="input-field" data-field="reps" placeholder="${phReps}" min="0">
            <span class="input-unit">reps</span>
          </div>
          <button class="set-check">${checkSvg}</button>
        </div>`;
    }

    if (exercise.type === 'timed') {
      const phSec = lastValues?.seconds ?? exercise.seconds ?? '';
      return `
        <div class="set-row" data-set="${index}">
          <span class="set-number">Set ${setNum}</span>
          <div class="set-input">
            <input type="number" class="input-field" data-field="seconds" placeholder="${phSec}" min="0">
            <span class="input-unit">sec</span>
          </div>
          <button class="set-check">${checkSvg}</button>
        </div>`;
    }

    if (exercise.type === 'cardio') {
      const phMin = lastValues?.minutes ?? exercise.minutes ?? '';
      return `
        <div class="set-row" data-set="${index}">
          <span class="set-number">Set ${setNum}</span>
          <div class="set-input">
            <input type="number" class="input-field" data-field="minutes" placeholder="${phMin}" min="0">
            <span class="input-unit">min</span>
          </div>
          <button class="set-check">${checkSvg}</button>
        </div>`;
    }

    return '';
  }

  // ---- Add Custom Exercise ----

  function setupAddExercise() {
    const addBtn = document.getElementById('add-exercise-btn');
    const modal = document.getElementById('add-exercise-modal');
    const confirmBtn = document.getElementById('custom-ex-add');

    if (!addBtn || !modal || !confirmBtn) return;

    addBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    modal.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    confirmBtn.addEventListener('click', async () => {
      const name = document.getElementById('custom-ex-name').value.trim();
      const type = document.getElementById('custom-ex-type').value;
      const sets = parseInt(document.getElementById('custom-ex-sets').value) || 3;

      if (!name) {
        Gamification.showToast('Please enter an exercise name');
        return;
      }

      const newEx = { name, type, sets };
      if (type === 'weighted') { newEx.reps = 10; newEx.startWeight = 0; }
      if (type === 'reps') { newEx.reps = 10; }
      if (type === 'timed') { newEx.seconds = 30; }
      if (type === 'cardio') { newEx.minutes = 10; }

      customExercises.push(newEx);
      await Store.saveCustomExercises(customExercises);

      // Reset form
      document.getElementById('custom-ex-name').value = '';
      modal.style.display = 'none';

      await renderExercises();
      Gamification.showToast(`✅ "${name}" added`, 'success');
    });
  }

  // ---- Save Workout ----

  function setupSave() {
    const saveBtn = document.getElementById('save-workout-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveWorkout);
    }
  }

  async function saveWorkout() {
    const cards = document.querySelectorAll('#exercise-list .exercise-card');
    const exercises = [];

    cards.forEach(card => {
      const name = card.dataset.exerciseName;
      const type = card.dataset.exerciseType;
      const sets = [];

      card.querySelectorAll('.set-row').forEach(row => {
        const setData = {};
        const checked = row.querySelector('.set-check')?.classList.contains('checked');

        row.querySelectorAll('input[data-field]').forEach(input => {
          const val = input.value !== '' ? parseFloat(input.value) :
                      input.placeholder !== '' ? parseFloat(input.placeholder) : null;
          if (val !== null && !isNaN(val)) {
            setData[input.dataset.field] = val;
          }
        });

        setData.completed = !!checked;
        if (Object.keys(setData).length > 1) {
          sets.push(setData);
        }
      });

      if (sets.length) {
        exercises.push({ name, type, sets });
      }
    });

    if (!exercises.length) {
      Gamification.showToast('No sets entered. Fill in some numbers first!');
      return;
    }

    const dateStr = todayStr();
    try {
      await Store.saveWorkout(dateStr, currentWorkout, exercises);

      // Check for PRs
      const prs = Gamification.checkForPRs(exercises, dateStr);
      if (prs && prs.length) {
        Gamification.announcePRs(prs);
      } else {
        Gamification.showToast('✅ Workout saved!', 'success');
      }

      // Update streak
      await Gamification.updateStreakDisplay();

      // Re-render progress/history if they're loaded
      if (typeof ProgressTab !== 'undefined' && ProgressTab.refresh) {
        try { await ProgressTab.refresh(); } catch (e) { console.warn(e); }
      }
      if (typeof HistoryTab !== 'undefined' && HistoryTab.refresh) {
        try { await HistoryTab.refresh(); } catch (e) { console.warn(e); }
      }

    } catch (err) {
      console.error('Save failed:', err);
      Gamification.showToast('Save failed. Check your connection.');
    }
  }

  return { init, renderExercises };
})();
