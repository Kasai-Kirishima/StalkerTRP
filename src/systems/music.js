// Plays bundled game audio and optional files selected by the player.
// Bundled files stay in assets/music; user-selected files remain local to the browser session.
export function createMusicEngine(onEnded = () => {}, onError = () => {}) {
  let audio = null;
  const tracks = new Map();
  let currentUrl = null;
  let nextId = 1;

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.id = 'zone-local-audio';
    audio.preload = 'metadata';
    audio.hidden = true;
    audio.addEventListener('ended', () => onEnded());
    audio.addEventListener('error', () => onError('Не удалось воспроизвести аудиофайл. Проверь, что формат поддерживается браузером.'));
    document.body.appendChild(audio);
    return audio;
  }

  function addBundledTracks(definitions = []) {
    const added = [];
    for (const definition of definitions) {
      if (!definition?.id || tracks.has(definition.id)) continue;
      const url = typeof definition.url === 'string' && definition.url ? definition.url : null;
      tracks.set(definition.id, { url, objectUrl: false, file: null });
      added.push({
        id: definition.id,
        title: definition.title || definition.fileName || 'Без названия',
        artist: definition.artist || 'Встроенная музыка',
        label: definition.fileName || definition.title || 'Встроенная композиция',
        fileName: definition.fileName || '',
        size: Number(definition.size) || 0,
        source: definition.source || (url ? 'bundled' : 'catalog'),
        hasAudio: !!url,
        stations: Array.isArray(definition.stations) ? [...definition.stations] : []
      });
    }
    return added;
  }

  function addFiles(fileList) {
    const added = [];
    for (const file of Array.from(fileList || [])) {
      if (!file || !((file.type || '').startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac)$/i.test(file.name))) continue;
      const id = `local-${nextId++}`;
      const url = URL.createObjectURL(file);
      tracks.set(id, { url, objectUrl: true, file });
      added.push({ id, title: file.name.replace(/\.[^.]+$/, ''), artist: 'Локальный файл', label: file.name, fileName: file.name, size: file.size, source: 'local', stations: [] });
    }
    return added;
  }

  async function play(track) {
    if (!track?.id || !tracks.has(track.id)) return false;
    const entry = tracks.get(track.id);
    if (!entry.url) return false;
    const node = ensureAudio();
    if (currentUrl && currentUrl !== entry.url) node.pause();
    currentUrl = entry.url;
    node.src = entry.url;
    node.load();
    try { await node.play(); return true; }
    catch {
      onError('Браузер не разрешил запуск. Нажми «Играть» ещё раз.');
      return false;
    }
  }

  function stop() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    currentUrl = null;
  }

  return {
    addFiles,
    addBundledTracks,
    play,
    pause() { if (audio) audio.pause(); },
    async resume() { if (!audio) return false; try { await audio.play(); return true; } catch { onError('Нажми «Играть», чтобы продолжить воспроизведение.'); return false; } },
    stop,
    setVolume(value) { const normalized = Math.max(0, Math.min(1, Number(value) || 0)); ensureAudio().volume = normalized; },
    clear() {
      stop();
      for (const entry of tracks.values()) if (entry.objectUrl) URL.revokeObjectURL(entry.url);
      tracks.clear();
    },
    get count() { return tracks.size; }
  };
}
