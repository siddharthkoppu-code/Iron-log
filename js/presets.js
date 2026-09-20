// Preset Workout Definitions
const PRESETS = {
  A: {
    label: 'Workout A',
    days: 'Mon / Fri',
    exercises: [
      { name: 'Leg Press',           type: 'weighted', sets: 3, reps: 10, startWeight: 40 },
      { name: 'Chest Press Machine', type: 'weighted', sets: 3, reps: 10, startWeight: 20 },
      { name: 'Lat Pulldown',        type: 'weighted', sets: 3, reps: 10, startWeight: 22.5 },
      { name: 'Seated Cable Row',    type: 'weighted', sets: 3, reps: 10, startWeight: 20 },
      { name: 'Plank',               type: 'timed',    sets: 3, seconds: 25 },
      { name: 'Treadmill Walk',      type: 'cardio',   sets: 1, minutes: 10 }
    ]
  },
  B: {
    label: 'Workout B',
    days: 'Wed',
    exercises: [
      { name: 'Goblet Squat',         type: 'weighted', sets: 3, reps: 10, startWeight: 8 },
      { name: 'Shoulder Press Machine',type: 'weighted', sets: 3, reps: 10, startWeight: 17.5 },
      { name: 'Lat Pulldown',         type: 'weighted', sets: 3, reps: 10, startWeight: 22.5 },
      { name: 'Leg Curl Machine',     type: 'weighted', sets: 3, reps: 12, startWeight: 17.5 },
      { name: 'Hanging Knee Raises',  type: 'reps',     sets: 3, reps: 10 },
      { name: 'Treadmill Walk',       type: 'cardio',   sets: 1, minutes: 10 }
    ]
  }
};
