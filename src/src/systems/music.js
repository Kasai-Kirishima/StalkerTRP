// Local music engine. Files are read from the player's device and never sent to a server.
export function createMusicEngine(onEnded = () => {}, onError = () => {}) {
  let audio = null;
  let tracks = new Map();
  let currentUrl = null;
  let nextId = 1;

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.id = 'zone-local-audio';
    audio.preload = 'metadata';
    audio.hidden = true;
    audio.addEventListener('ended', () => onEnded());
    audio.addEventListener('error', () => onError('Не удалось воспроизвести выбранный аудиофайл. Проверь формат файла.'));
    document.body.appendChild(audio);
    return audio;
  }

  function addFiles(fileList) {
    const added = [];
    for (const file of Array.from(fileList || [])) {
      if (!file || !((file.type || '').startsWith('audio/') || /\.(mp3|m4a|ogg|wav|flac|aac)$/i.test(file.name))) continue;
      const id = `local-${nextId++}`;
      const url = URL.createObjectURL(file);
      tracks.set(id, { url, file });
      added.push({ id, title: file.name.replace(/\.[^.]+$/, ''), artist: 'Локальный файл', label: file.name, fileName: file.name, size: file.size });
    }
    return added;
  }

  async function play(track) {
    if (!track?.id || !tracks.has(track.id)) return false;
    const entry = tracks.get(track.id);
    const node = ensureAudio();
    if (currentUrl && currentUrl !== entry.url) node.pause();
    currentUrl = entry.url;
    node.src = entry.url;
    node.volume = node.volume ?? 0.78;
    node.load();
    try { await node.play(); return true; }
    catch (error) { onError('Браузер не разрешил запуск. Нажми «Играть» ещё раз.'); return false; }
  }

  return {
    addFiles,
    play,
    pause() { if (audio) audio.pause(); },
    async resume() { if (!audio) return false; try { await audio.play(); return true; } catch { onError('Нажми «Играть», чтобы продолжить воспроизведение.'); return false; } },
    stop() { if (audio) { audio.pause(); audio.currentTime = 0; audio.removeAttribute('src'); audio.load(); } currentUrl = null; },
    setVolume(value) { const normalized = Math.max(0, Math.min(1, Number(value) || 0)); ensureAudio().volume = normalized; },
    clear() { this.stop(); for (const entry of tracks.values()) URL.revokeObjectURL(entry.url); tracks.clear(); },
    get count() { return tracks.size; }
  };
}
