const STORAGE_KEY = 'cordon-pda-save-v1';

export const DEFAULT_SETTINGS = {
  reducedMotion: false,
  uiScale: 1,
  soundEnabled: true,
  soundVolume: 0.35,
  controlScheme: 'auto'
};

export function createInitialState() {
  return {
    screen: 'menu',
    characters: [],
    activeCharacterId: null,
    pendingCharacter: null,
    settings: { ...DEFAULT_SETTINGS },
    account: { sessions: 0, enemiesDefeated: 0, questsCompleted: 0, artifactsFound: 0, distanceTravelled: 0 },
    draft: { name:'', birthDate:'', height:'', weight:'', personality:'', biography:'', notes:'', faction:'loner', avatar:'' },
    loadout: { selected: {} },
    ui: { tab:'location', modal:null, notification:'', tradeNpcId:null, mapLocationId:null, encyclopediaCategory:'locations', helpTopic:'basics' },
    game: null
  };
}

export function loadState() {
  const fallback = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    const settings={ ...fallback.settings, ...(saved.settings || {}) };
    delete settings.removedPlayerTrackIds;
    delete settings.npcAiEndpoint;
    const ui={ ...fallback.ui, ...(saved.ui || {}) };
    delete ui.music; delete ui.localMusicTracks;
    return {
      ...fallback,
      ...saved,
      settings,
      account: { ...fallback.account, ...(saved.account || {}) },
      draft: { ...fallback.draft, ...(saved.draft || {}) },
      loadout: { selected:{}, ...(saved.loadout || {}) },
      ui
    };
  } catch (error) {
    console.warn('Не удалось прочитать сохранение:', error);
    return fallback;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Не удалось сохранить игру:', error);
    return false;
  }
}

export function exportSave(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cordon-save-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importSave(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.characters) || !parsed.settings) {
    throw new Error('Файл не похож на сохранение проекта.');
  }
  return parsed;
}
