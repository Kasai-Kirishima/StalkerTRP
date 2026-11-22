const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac']);
const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac'
};
const MAX_TRACK_BYTES = 128 * 1024 * 1024;
const MAX_TOTAL_AUDIO_BYTES = 768 * 1024 * 1024;

function decodeName(bytes, flags) {
  if (flags & 0x0800) return new TextDecoder('utf-8').decode(bytes);
  // The user's archive stores legacy Russian ZIP names in CP866.
  try { return new TextDecoder('ibm866').decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}

function mimeFor(name) {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[extension] || 'application/octet-stream';
}

function safeBasename(name) {
  const basename = name.replace(/\\/g, '/').split('/').pop() || 'audio-track';
  return basename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'audio-track';
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Этот браузер не умеет распаковывать ZIP. Обнови браузер или выбери папку Music после распаковки архива.');
  }
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).arrayBuffer();
  } catch {
    throw new Error('Не удалось распаковать ZIP. Проверь архив или выбери папку Music после распаковки.');
  }
}

/** Extracts supported audio files from a ZIP locally in the browser. No data is uploaded. */
export async function extractAudioFilesFromZip(zipFile) {
  if (!zipFile || !/\.zip$/i.test(zipFile.name || '')) throw new Error('Выбери ZIP-архив с музыкой.');
  if (zipFile.size < 22) throw new Error('Архив слишком маленький или повреждён.');

  const tailStart = Math.max(0, zipFile.size - 65_557);
  const tail = new DataView(await zipFile.slice(tailStart).arrayBuffer());
  let eocd = -1;
  for (let offset = tail.byteLength - 22; offset >= 0; offset--) {
    if (tail.getUint32(offset, true) === 0x06054b50) {
      const commentLength = tail.getUint16(offset + 20, true);
      if (offset + 22 + commentLength === tail.byteLength) { eocd = offset; break; }
    }
  }
  if (eocd < 0) throw new Error('Не найден каталог ZIP. Архив может быть повреждён или разбит на части.');

  const diskNumber = tail.getUint16(eocd + 4, true);
  const directoryDisk = tail.getUint16(eocd + 6, true);
  const entriesOnDisk = tail.getUint16(eocd + 8, true);
  const entryCount = tail.getUint16(eocd + 10, true);
  const directorySize = tail.getUint32(eocd + 12, true);
  const directoryOffset = tail.getUint32(eocd + 16, true);
  if (diskNumber || directoryDisk || entriesOnDisk !== entryCount || entryCount === 0xffff || directoryOffset === 0xffffffff) {
    throw new Error('Многотомные ZIP-архивы не поддерживаются.');
  }
  if (directoryOffset + directorySize > zipFile.size) throw new Error('Каталог ZIP выходит за пределы файла.');

  const directory = new DataView(await zipFile.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer());
  const jobs = [];
  let offset = 0;
  let totalBytes = 0;

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > directory.byteLength || directory.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Повреждён список файлов внутри ZIP.');
    }
    const flags = directory.getUint16(offset + 8, true);
    const method = directory.getUint16(offset + 10, true);
    const compressedSize = directory.getUint32(offset + 20, true);
    const uncompressedSize = directory.getUint32(offset + 24, true);
    const nameLength = directory.getUint16(offset + 28, true);
    const extraLength = directory.getUint16(offset + 30, true);
    const commentLength = directory.getUint16(offset + 32, true);
    const localHeaderOffset = directory.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const nextOffset = nameStart + nameLength + extraLength + commentLength;
    if (nextOffset > directory.byteLength) throw new Error('Повреждённое имя файла в ZIP.');

    const nameBytes = new Uint8Array(directory.buffer, directory.byteOffset + nameStart, nameLength);
    const entryName = decodeName(nameBytes, flags);
    const extension = entryName.slice(entryName.lastIndexOf('.')).toLowerCase();
    const isAudio = AUDIO_EXTENSIONS.has(extension) && !entryName.endsWith('/');
    offset = nextOffset;
    if (!isAudio) continue;
    if (flags & 0x0001) throw new Error(`Файл «${safeBasename(entryName)}» зашифрован паролем.`);
    if (![0, 8].includes(method)) continue;
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error('ZIP64 архивы пока не поддерживаются.');
    }
    if (uncompressedSize > MAX_TRACK_BYTES) throw new Error(`Трек «${safeBasename(entryName)}» слишком большой.`);
    totalBytes += uncompressedSize;
    if (totalBytes > MAX_TOTAL_AUDIO_BYTES) throw new Error('Общий размер музыки в архиве слишком большой для импорта в браузере.');
    jobs.push({ entryName, method, compressedSize, uncompressedSize, localHeaderOffset });
  }

  if (!jobs.length) throw new Error('В архиве не найдены MP3, M4A, OGG, WAV, FLAC или AAC файлы.');

  const files = [];
  for (const job of jobs) {
    const headerEnd = job.localHeaderOffset + 30;
    if (headerEnd > zipFile.size) throw new Error(`Не найден заголовок трека «${safeBasename(job.entryName)}».`);
    const header = new DataView(await zipFile.slice(job.localHeaderOffset, headerEnd).arrayBuffer());
    if (header.getUint32(0, true) !== 0x04034b50) throw new Error(`Повреждён трек «${safeBasename(job.entryName)}».`);
    const localNameLength = header.getUint16(26, true);
    const localExtraLength = header.getUint16(28, true);
    const dataStart = headerEnd + localNameLength + localExtraLength;
    const dataEnd = dataStart + job.compressedSize;
    if (dataEnd > zipFile.size) throw new Error(`Данные трека «${safeBasename(job.entryName)}» обрезаны.`);
    const compressed = await zipFile.slice(dataStart, dataEnd).arrayBuffer();
    const content = job.method === 0 ? compressed : await inflateRaw(compressed);
    if (content.byteLength !== job.uncompressedSize) throw new Error(`Размер трека «${safeBasename(job.entryName)}» не совпадает с каталогом ZIP.`);
    files.push(new File([content], safeBasename(job.entryName), { type: mimeFor(job.entryName), lastModified: Date.now() }));
  }
  return files;
}
