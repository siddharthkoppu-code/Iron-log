// Gamification Layer: PR Detection, Streak Tracking, Toast Notifications & Document Exports
const Gamification = (() => {
  let allTimePRs = {}; // { [exerciseName]: { weight: number, reps: number, date: string } }

  // ---- Toast System ----

  function showToast(message, type = 'default', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showPRNotification(exerciseName, weight, reps) {
    const msg = `🏆 <strong>NEW PERSONAL RECORD!</strong><br>${exerciseName}: <strong>${weight} kg × ${reps} reps</strong>`;
    showToast(msg, 'pr', 4500);
  }

  // ---- PR Tracking ----

  async function loadPRs() {
    allTimePRs = {};
    const workouts = await Store.getAllWorkouts();

    for (const workout of workouts) {
      if (!workout.exercises) continue;
      for (const ex of workout.exercises) {
        if (!ex.sets) continue;
        for (const set of ex.sets) {
          if (!set.completed && set.completed !== undefined) continue;
          const w = parseFloat(set.weight) || 0;
          const r = parseInt(set.reps) || 0;
          if (w <= 0 && r <= 0) continue;

          const curPR = allTimePRs[ex.name];
          if (!curPR || w > curPR.weight || (w === curPR.weight && r > curPR.reps)) {
            allTimePRs[ex.name] = { weight: w, reps: r, date: workout.date };
          }
        }
      }
    }
    return allTimePRs;
  }

  function checkPR(exerciseName, sets, dateStr) {
    let newPRFound = null;
    const curPR = allTimePRs[exerciseName] || { weight: 0, reps: 0 };

    for (const set of sets) {
      if (!set.completed && set.completed !== undefined) continue;
      const w = parseFloat(set.weight) || 0;
      const r = parseInt(set.reps) || 0;
      if (w <= 0 && r <= 0) continue;

      if (w > curPR.weight || (w === curPR.weight && r > curPR.reps)) {
        curPR.weight = w;
        curPR.reps = r;
        curPR.date = dateStr;
        allTimePRs[exerciseName] = curPR;
        newPRFound = { weight: w, reps: r };
      }
    }

    if (newPRFound) {
      showPRNotification(exerciseName, newPRFound.weight, newPRFound.reps);
    }
    return newPRFound;
  }

  function getPR(exerciseName) {
    return allTimePRs[exerciseName] || null;
  }

  function getAllPRs() {
    return allTimePRs;
  }

  // ---- Streak Calculation ----

  function calculateStreak(workouts) {
    if (!workouts || !workouts.length) return 0;

    const workoutDates = new Set(workouts.map(w => w.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    // Target workout days: Mon(1), Wed(3), Fri(5)
    const targetDays = [1, 3, 5];

    let safety = 0;
    while (safety < 120) {
      safety++;
      const dayOfWeek = checkDate.getDay();
      const isTargetDay = targetDays.includes(dayOfWeek);

      if (isTargetDay) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (workoutDates.has(dateStr)) {
          streak++;
        } else {
          // If it's today and not yet completed, check previous target day
          if (checkDate.getTime() === today.getTime()) {
            // Give grace for today
          } else {
            break;
          }
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  async function updateStreakDisplay() {
    const workouts = await Store.getAllWorkouts();
    const streak = calculateStreak(workouts);
    const badge = document.getElementById('streak-badge');
    const count = document.getElementById('streak-count');

    if (badge && count) {
      count.textContent = streak;
      if (streak > 0) {
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ---- Export Modal & Generators ----

  function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.style.display = 'none';
  }

  // Helper: Format Dates
  function formatDatePretty(dateStr) {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  // ---- 1. Export as PDF / Printable Report ----
  async function exportPDF() {
    closeExportModal();
    showToast('📄 Generating Printable Workout Report...', 'default', 2000);

    const data = await Store.exportAll();
    await loadPRs();
    const prs = getAllPRs();
    const workouts = data.workouts || [];
    const bodyweight = data.bodyweight || [];
    const streak = calculateStreak(workouts);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let prRows = '';
    const prEntries = Object.entries(prs);
    if (prEntries.length) {
      prRows = prEntries.map(([name, pr]) => `
        <tr>
          <td style="font-weight: 600; color: #1e1b4b;">${name}</td>
          <td style="font-weight: 700; color: #4338ca;">${pr.weight} kg × ${pr.reps} reps</td>
          <td style="color: #64748b;">${formatDatePretty(pr.date)}</td>
        </tr>
      `).join('');
    } else {
      prRows = `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 12px;">No personal records logged yet</td></tr>`;
    }

    let workoutCards = '';
    if (workouts.length) {
      workoutCards = workouts.map(w => {
        const exercisesList = (w.exercises || []).map(ex => {
          const setsDetails = (ex.sets || []).map((s, idx) => {
            let setStr = '';
            if (ex.type === 'weighted' || !ex.type) {
              setStr = `${s.weight || 0} kg × ${s.reps || 0} reps`;
            } else if (ex.type === 'reps') {
              setStr = `${s.reps || 0} reps`;
            } else if (ex.type === 'timed') {
              setStr = `${s.time || s.reps || 0}s`;
            } else if (ex.type === 'cardio') {
              setStr = `${s.time || 0} mins`;
            }
            const statusIcon = s.completed ? '✓' : '—';
            return `<span style="display:inline-block; margin-right: 12px; margin-bottom: 4px; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 12px;"><strong>Set ${idx + 1}:</strong> ${setStr} <span style="color: #10b981; font-weight: bold;">${statusIcon}</span></span>`;
          }).join('');

          return `
            <div style="margin-top: 8px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0;">
              <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${ex.name}</div>
              <div>${setsDetails || '<span style="color:#94a3b8; font-size: 12px;">No sets recorded</span>'}</div>
            </div>
          `;
        }).join('');

        return `
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
              <div>
                <span style="font-size: 16px; font-weight: 700; color: #1e293b;">Workout ${w.type || 'A'}</span>
                <span style="font-size: 13px; color: #64748b; margin-left: 8px;">(${formatDatePretty(w.date)})</span>
              </div>
              <span style="background: #e0e7ff; color: #3730a3; font-weight: 600; font-size: 12px; padding: 3px 10px; border-radius: 12px;">Logged</span>
            </div>
            ${exercisesList || '<div style="color: #94a3b8;">No exercise data</div>'}
          </div>
        `;
      }).join('');
    } else {
      workoutCards = '<p style="color: #94a3b8; font-style: italic;">No workout sessions recorded yet.</p>';
    }

    let bwRows = '';
    if (bodyweight.length) {
      bwRows = bodyweight.map((b, idx) => {
        let diffStr = '—';
        if (idx < bodyweight.length - 1) {
          const prev = bodyweight[idx + 1].weight;
          const diff = (b.weight - prev).toFixed(1);
          diffStr = diff > 0 ? `+${diff} kg` : `${diff} kg`;
        }
        return `
          <tr>
            <td style="color: #334155;">${formatDatePretty(b.date)}</td>
            <td style="font-weight: 700; color: #0f172a;">${b.weight} kg</td>
            <td style="color: ${diffStr.startsWith('+') ? '#ef4444' : diffStr.startsWith('-') ? '#10b981' : '#64748b'};">${diffStr}</td>
          </tr>
        `;
      }).join('');
    } else {
      bwRows = `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 12px;">No body weight entries recorded</td></tr>`;
    }

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Iron Log — Workout Report (${dateFormatted})</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 14px;
            margin-bottom: 24px;
          }
          .title { font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 28px;
          }
          .stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .stat-box .num { font-size: 20px; font-weight: 800; color: #4f46e5; }
          .stat-box .lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-top: 2px; }
          h2 { font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #6366f1; padding-left: 8px; margin: 24px 0 12px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
          .no-print-bar {
            background: #4f46e5;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-btn {
            background: #ffffff;
            color: #4f46e5;
            font-weight: 700;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
          }
          @media print {
            .no-print-bar { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <span><strong>Iron Log Workout Report</strong> — Ready to print or save as PDF</span>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">🏋️ Iron Log — Workout Progress Report</h1>
            <div class="subtitle">Generated on ${dateFormatted} | Tracking & Progressive Overload Analytics</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="num">${workouts.length}</div>
            <div class="lbl">Total Workouts</div>
          </div>
          <div class="stat-box">
            <div class="num">${prEntries.length}</div>
            <div class="lbl">PRs Set</div>
          </div>
          <div class="stat-box">
            <div class="num">${streak} Days</div>
            <div class="lbl">Current Streak</div>
          </div>
          <div class="stat-box">
            <div class="num">${bodyweight.length ? bodyweight[0].weight + ' kg' : '—'}</div>
            <div class="lbl">Latest Weight</div>
          </div>
        </div>

        <h2>🏆 All-Time Personal Records (PRs)</h2>
        <table>
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Best Lift (Weight × Reps)</th>
              <th>Date Achieved</th>
            </tr>
          </thead>
          <tbody>
            ${prRows}
          </tbody>
        </table>

        <h2>📋 Workout History</h2>
        ${workoutCards}

        <h2>⚖️ Body Weight History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight (kg)</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            ${bwRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Iron Log Workout Tracker — Keep lifting heavy and beating your PRs!
        </div>

        <script>
          // Automatically prompt print dialog on load
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHTML);
      printWindow.document.close();
    } else {
      showToast('⚠️ Popups blocked. Please allow popups to open the PDF report.', 'default', 4000);
    }
  }

  // ---- 2. Export as Word Document (.doc) ----
  async function exportWord() {
    closeExportModal();
    showToast('📝 Generating Word Document (.doc)...', 'default', 2000);

    const data = await Store.exportAll();
    await loadPRs();
    const prs = getAllPRs();
    const workouts = data.workouts || [];
    const bodyweight = data.bodyweight || [];
    const streak = calculateStreak(workouts);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let prRows = '';
    const prEntries = Object.entries(prs);
    if (prEntries.length) {
      prRows = prEntries.map(([name, pr]) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #999; font-weight: bold;">${name}</td>
          <td style="padding: 8px; border: 1px solid #999; color: #333399; font-weight: bold;">${pr.weight} kg × ${pr.reps} reps</td>
          <td style="padding: 8px; border: 1px solid #999;">${formatDatePretty(pr.date)}</td>
        </tr>
      `).join('');
    } else {
      prRows = `<tr><td colspan="3" style="padding: 8px; border: 1px solid #999; text-align: center;">No PRs logged</td></tr>`;
    }

    let workoutSections = '';
    if (workouts.length) {
      workoutSections = workouts.map(w => {
        let exRows = '';
        (w.exercises || []).forEach(ex => {
          const setsSummary = (ex.sets || []).map((s, i) => {
            let str = '';
            if (ex.type === 'weighted' || !ex.type) str = `${s.weight || 0}kg × ${s.reps || 0}`;
            else if (ex.type === 'reps') str = `${s.reps || 0} reps`;
            else if (ex.type === 'timed') str = `${s.time || s.reps || 0}s`;
            else if (ex.type === 'cardio') str = `${s.time || 0}m`;
            return `Set ${i + 1}: ${str} [${s.completed ? 'Completed' : 'Skipped'}]`;
          }).join(', ');

          exRows += `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ccc; font-weight: bold; width: 35%;">${ex.name}</td>
              <td style="padding: 6px 8px; border: 1px solid #ccc;">${setsSummary || 'No sets recorded'}</td>
            </tr>
          `;
        });

        return `
          <h3 style="color: #2b2d42; margin-top: 18px; margin-bottom: 6px; font-family: Calibri, Arial, sans-serif;">
            Workout ${w.type || 'A'} — ${formatDatePretty(w.date)}
          </h3>
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 14px; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
            <thead>
              <tr style="background-color: #e9ecef;">
                <th style="padding: 6px 8px; border: 1px solid #ccc; text-align: left; width: 35%;">Exercise</th>
                <th style="padding: 6px 8px; border: 1px solid #ccc; text-align: left;">Sets & Reps</th>
              </tr>
            </thead>
            <tbody>
              ${exRows}
            </tbody>
          </table>
        `;
      }).join('');
    } else {
      workoutSections = '<p style="font-style: italic;">No workouts recorded.</p>';
    }

    let bwRows = '';
    if (bodyweight.length) {
      bwRows = bodyweight.map((b, idx) => {
        let diffStr = '—';
        if (idx < bodyweight.length - 1) {
          const prev = bodyweight[idx + 1].weight;
          const diff = (b.weight - prev).toFixed(1);
          diffStr = diff > 0 ? `+${diff} kg` : `${diff} kg`;
        }
        return `
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #999;">${formatDatePretty(b.date)}</td>
            <td style="padding: 6px 8px; border: 1px solid #999; font-weight: bold;">${b.weight} kg</td>
            <td style="padding: 6px 8px; border: 1px solid #999;">${diffStr}</td>
          </tr>
        `;
      }).join('');
    } else {
      bwRows = `<tr><td colspan="3" style="padding: 8px; border: 1px solid #999; text-align: center;">No body weight entries</td></tr>`;
    }

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Iron Log Workout Report</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #222; }
          h1 { color: #1a237e; font-size: 20pt; margin-bottom: 2pt; }
          h2 { color: #283593; font-size: 14pt; border-bottom: 2px solid #283593; padding-bottom: 3pt; margin-top: 20pt; }
          .summary-table td { padding: 8px; border: 1px solid #b0bec5; }
        </style>
      </head>
      <body>
        <h1>Iron Log — Workout Progress Report</h1>
        <p style="color: #666; font-size: 10pt; margin-top: 0;">Generated on: ${dateFormatted} | Powered by Iron Log</p>

        <h2>📊 Training Overview</h2>
        <table class="summary-table" width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16pt;">
          <tr style="background-color: #f5f5f5;">
            <td width="25%"><strong>Total Workouts:</strong> ${workouts.length}</td>
            <td width="25%"><strong>Personal Records:</strong> ${prEntries.length}</td>
            <td width="25%"><strong>Active Streak:</strong> ${streak} Days</td>
            <td width="25%"><strong>Latest Weight:</strong> ${bodyweight.length ? bodyweight[0].weight + ' kg' : '—'}</td>
          </tr>
        </table>

        <h2>🏆 All-Time Personal Records (PRs)</h2>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16pt; font-size: 11pt;">
          <thead>
            <tr style="background-color: #e8eaf6;">
              <th style="padding: 8px; border: 1px solid #999; text-align: left;">Exercise</th>
              <th style="padding: 8px; border: 1px solid #999; text-align: left;">Personal Record</th>
              <th style="padding: 8px; border: 1px solid #999; text-align: left;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${prRows}
          </tbody>
        </table>

        <h2>📋 Workout Sessions Log</h2>
        ${workoutSections}

        <h2>⚖️ Body Weight Tracker</h2>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16pt; font-size: 11pt;">
          <thead>
            <tr style="background-color: #e0f2f1;">
              <th style="padding: 6px 8px; border: 1px solid #999; text-align: left;">Date</th>
              <th style="padding: 6px 8px; border: 1px solid #999; text-align: left;">Weight</th>
              <th style="padding: 6px 8px; border: 1px solid #999; text-align: left;">Change</th>
            </tr>
          </thead>
          <tbody>
            ${bwRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['﻿' + docContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iron-log-workout-report-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Word document downloaded successfully!', 'pr', 3000);
  }

  // ---- 3. Export as JSON Backup ----
  async function exportJSON() {
    closeExportModal();
    const data = await Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iron-log-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 JSON backup file downloaded!', 'default', 3000);
  }

  return {
    showToast,
    showPRNotification,
    loadPRs,
    checkPR,
    getPR,
    getAllPRs,
    calculateStreak,
    updateStreakDisplay,
    openExportModal,
    closeExportModal,
    exportPDF,
    exportWord,
    exportJSON
  };
})();
