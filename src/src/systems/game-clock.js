const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export function createClock() {
  const now=Date.now();
  return { startedAt: now, lastRealTime: now, timeOffsetMinutes: 0, worldMinutes: 0 };
}


export function syncRealElapsed(game) {
  if (!game?.clock) return 0;
  const now=Date.now();
  const last=game.clock.lastRealTime || now;
  const elapsed=Math.max(0,(now-last)/60000);
  game.clock.lastRealTime=now;
  if (elapsed>0) {
    game.clock.worldMinutes=(game.clock.worldMinutes||0)+elapsed;
    if (typeof game.lastSquadMove === 'number' && game.squads) {
      // The world module performs the actual movement after this elapsed time is added.
      return elapsed;
    }
  }
  return elapsed;
}

export function advanceTime(game, minutes) {
  if (!game?.clock) return;
  const amount = Math.max(0, Number(minutes) || 0);
  game.clock.timeOffsetMinutes += amount;
  game.clock.worldMinutes += amount;
}

export function getGameDateTime(clock) {
  const realNow = new Date();
  const now = new Date(realNow.getTime() + (clock?.timeOffsetMinutes || 0) * 60000);
  const started = new Date(clock?.startedAt || Date.now());
  const startMidnight = new Date(started.getFullYear(), started.getMonth(), started.getDate()).getTime();
  const nowMidnight = new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate()).getTime();
  const realDays = Math.max(0, Math.floor((nowMidnight - startMidnight) / DAY_MS));
  const simulatedDays = Math.floor((clock?.timeOffsetMinutes || 0) / 1440);
  const startDate = new Date(started.getFullYear(), 3, 15);
  startDate.setDate(startDate.getDate() + realDays + simulatedDays);
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  return {
    time: `${hh}:${mm}`,
    date: `${startDate.getDate()} ${MONTHS[startDate.getMonth()]}`,
    full: `${startDate.getDate()} ${MONTHS[startDate.getMonth()]} · ${hh}:${mm}`
  };
}

export function formatElapsed(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h ? `${h} ч ${m} мин` : `${m} мин`;
}
