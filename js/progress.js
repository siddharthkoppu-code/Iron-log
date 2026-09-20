// Progress Tab — Exercise progress charts, body weight tracking
const ProgressTab = (() => {
  let progressChart = null;
  let bwChart = null;
  let initialized = false;

  async function init() {
    setupExerciseSelect();
    setupBodyWeight();
    initialized = true;
  }

  async function refresh() {
    if (!initialized) return;
    const selected = document.getElementById('exercise-select').value;
    if (selected) renderProgressChart(selected);
    await renderBodyWeight();
  }

  // ---- Exercise Progress ----

  function setupExerciseSelect() {
    const select = document.getElementById('exercise-select');

    // Build options from presets + any exercise names in history
    const names = new Set();
    for (const key of Object.keys(PRESETS)) {
      for (const ex of PRESETS[key].exercises) {
        names.add(ex.name);
      }
    }

    select.innerHTML = '<option value="">Select an exercise...</option>';
    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      if (select.value) renderProgressChart(select.value);
    });
  }

  async function populateExerciseSelect() {
    const select = document.getElementById('exercise-select');
    const names = new Set();

    // From presets
    for (const key of Object.keys(PRESETS)) {
      for (const ex of PRESETS[key].exercises) {
        names.add(ex.name);
      }
    }

    // From workout history (captures custom exercises too)
    const workouts = await Store.getAllWorkouts();
    for (const w of workouts) {
      for (const ex of w.exercises || []) {
        names.add(ex.name);
      }
    }

    const currentVal = select.value;
    select.innerHTML = '<option value="">Select an exercise...</option>';
    const sorted = [...names].sort();
    for (const name of sorted) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    if (currentVal && names.has(currentVal)) {
      select.value = currentVal;
    }
  }

  async function renderProgressChart(exerciseName) {
    const workouts = await Store.getAllWorkouts();
    const dataPoints = [];

    // Gather top set per workout for this exercise (chronological order)
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

    for (const w of sorted) {
      const ex = w.exercises?.find(e => e.name === exerciseName);
      if (!ex || !ex.sets?.length) continue;

      let best = null;
      let unit = '';

      for (const s of ex.sets) {
        if (ex.type === 'weighted' && s.weight != null) {
          if (best === null || s.weight > best) best = s.weight;
          unit = 'kg';
        } else if (ex.type === 'reps' && s.reps != null) {
          if (best === null || s.reps > best) best = s.reps;
          unit = 'reps';
        } else if (ex.type === 'timed' && s.seconds != null) {
          if (best === null || s.seconds > best) best = s.seconds;
          unit = 'sec';
        } else if (ex.type === 'cardio' && s.minutes != null) {
          if (best === null || s.minutes > best) best = s.minutes;
          unit = 'min';
        }
      }

      if (best !== null) {
        dataPoints.push({ date: w.date, value: best, unit });
      }
    }

    // Stats
    const statsRow = document.getElementById('progress-stats');
    const chartContainer = document.getElementById('progress-chart-container');

    if (dataPoints.length < 1) {
      statsRow.style.display = 'none';
      chartContainer.style.display = 'none';
      return;
    }

    statsRow.style.display = '';
    chartContainer.style.display = '';

    const latest = dataPoints[dataPoints.length - 1];
    const prVal = Math.max(...dataPoints.map(d => d.value));
    const first = dataPoints[0];
    const change = latest.value - first.value;
    const changePercent = first.value > 0 ? ((change / first.value) * 100).toFixed(0) : 0;

    document.getElementById('stat-latest').textContent = `${latest.value} ${latest.unit}`;
    document.getElementById('stat-pr').textContent = `${prVal} ${latest.unit}`;

    const changeEl = document.getElementById('stat-change');
    const sign = change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${change} ${latest.unit} (${sign}${changePercent}%)`;
    changeEl.className = `stat-value ${change >= 0 ? 'positive' : 'negative'}`;

    // Chart
    if (progressChart) progressChart.destroy();

    const ctx = document.getElementById('progress-chart').getContext('2d');
    progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataPoints.map(d => formatDateShort(d.date)),
        datasets: [{
          label: exerciseName,
          data: dataPoints.map(d => d.value),
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.1)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#6C5CE7',
          pointBorderColor: '#1A1A2E',
          pointBorderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: chartOptions(`Top set (${latest.unit})`)
    });
  }

  // ---- Body Weight ----

  function setupBodyWeight() {
    document.getElementById('bw-log-btn').addEventListener('click', async () => {
      const input = document.getElementById('bw-input');
      const weight = parseFloat(input.value);
      if (!weight || weight <= 0) {
        Gamification.showToast('Enter a valid weight');
        return;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      await Store.logBodyWeight(dateStr, weight);
      input.value = '';
      await renderBodyWeight();
      Gamification.showToast('✅ Weight logged', 'success');
    });
  }

  async function renderBodyWeight() {
    const entries = await Store.getAllBodyWeight();
    const statsRow = document.getElementById('bw-stats');
    const chartContainer = document.getElementById('bw-chart-container');
    const logList = document.getElementById('bw-log-list');

    if (!entries.length) {
      statsRow.style.display = 'none';
      chartContainer.style.display = 'none';
      logList.innerHTML = '';
      return;
    }

    statsRow.style.display = '';
    chartContainer.style.display = '';

    // Stats
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].weight;
    const first = sorted[0].weight;
    const change = (current - first).toFixed(1);
    const sign = change >= 0 ? '+' : '';

    document.getElementById('bw-current').textContent = `${current} kg`;
    const changeEl = document.getElementById('bw-change');
    changeEl.textContent = `${sign}${change} kg`;
    changeEl.className = `stat-value ${change <= 0 ? 'positive' : 'negative'}`;

    // Chart
    if (bwChart) bwChart.destroy();
    const ctx = document.getElementById('bw-chart').getContext('2d');
    bwChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(d => formatDateShort(d.date)),
        datasets: [{
          label: 'Body Weight',
          data: sorted.map(d => d.weight),
          borderColor: '#00CEC9',
          backgroundColor: 'rgba(0, 206, 201, 0.1)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#00CEC9',
          pointBorderColor: '#1A1A2E',
          pointBorderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: chartOptions('Weight (kg)')
    });

    // Log list (most recent first)
    logList.innerHTML = '';
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'bw-log-entry';
      row.innerHTML = `
        <span class="bw-date">${formatDateFull(entry.date)}</span>
        <span class="bw-value">${entry.weight} kg</span>
        <button class="bw-delete" data-date="${entry.date}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      `;
      row.querySelector('.bw-delete').addEventListener('click', async (e) => {
        const date = e.currentTarget.dataset.date;
        await Store.deleteBodyWeight(date);
        await renderBodyWeight();
        Gamification.showToast('Entry removed');
      });
      logList.appendChild(row);
    }
  }

  // ---- Shared Chart Options ----

  function chartOptions(yLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1A2E',
          titleColor: '#F0F0FF',
          bodyColor: '#9D9DB5',
          borderColor: '#2A2A45',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(42, 42, 69, 0.5)', drawBorder: false },
          ticks: { color: '#6B6B85', font: { size: 11 }, maxRotation: 45 }
        },
        y: {
          grid: { color: 'rgba(42, 42, 69, 0.5)', drawBorder: false },
          ticks: { color: '#6B6B85', font: { size: 11 } },
          title: { display: true, text: yLabel, color: '#6B6B85', font: { size: 12 } }
        }
      }
    };
  }

  // ---- Date Formatting ----

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Called when Progress tab becomes active (lazy-load)
  async function onTabActivated() {
    await populateExerciseSelect();
    const select = document.getElementById('exercise-select');
    if (select.value) {
      await renderProgressChart(select.value);
    }
  }

  // Called when Body Weight tab becomes active
  async function onBWTabActivated() {
    await renderBodyWeight();
  }

  return { init, refresh, onTabActivated, onBWTabActivated, renderBodyWeight };
})();
