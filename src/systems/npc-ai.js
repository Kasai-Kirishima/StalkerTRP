import { LOCATIONS, FACTIONS } from '../data/catalog.js';

const MAX_REPLY_LENGTH = 900;
const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();

function cleanReply(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\/?(?:script|style|iframe|object|html|body)[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, MAX_REPLY_LENGTH);
}

export function isValidNpcAiEndpoint(value) {
  const raw = normalizeText(value);
  if (!raw) return false;
  try {
    const url = new URL(raw, 'http://localhost');
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function getNpcTone(npc) {
  if (npc?.faction === 'bandit') return 'Разговорный бандитский жаргон с феней, но без карикатурного перебора.';
  if (npc?.faction === 'military') return 'Короткая, дисциплинированная, официальная манера военного.';
  if (npc?.id === 'sidorovich') return 'Хитрый, практичный торговец; оценивает выгоду, любит торговаться.';
  if (npc?.id === 'wolf') return 'Спокойный опытный сталкер, заботится о новичках.';
  return 'Естественная разговорная речь бывалого или начинающего сталкера.';
}

export function buildNpcAiPayload({ game, npc, playerMessage }) {
  const current = LOCATIONS.find(location => location.id === game?.locationId);
  const neighbours = (current?.neighbors || [])
    .map(id => LOCATIONS.find(location => location.id === id))
    .filter(Boolean)
    .map(location => ({ id: location.id, name: location.name, territory: location.territory || 'neutral', hazards: location.hazards || [] }));
  const playerFaction = game?.player?.faction || 'loner';
  const factionName = FACTIONS.find(faction => faction.id === playerFaction)?.name || playerFaction;
  const history = (game?.dialogueHistory || []).filter(line => !line.npcId || line.npcId === npc?.id).slice(-10).map(line => ({
    role: line.role === 'player' ? 'user' : 'assistant',
    content: normalizeText(line.text).slice(0, 700)
  })).filter(line => line.content);
  const activeQuests = (game?.quests || []).filter(quest => ['active', 'ready'].includes(quest.status)).slice(0, 12).map(quest => ({
    title: quest.title,
    status: quest.status,
    text: quest.text
  }));

  const system = [
    `Ты отыгрываешь NPC по имени ${npc?.name || 'сталкер'} в браузерной RP-игре STALKER «Путь по Кордону».`,
    `Роль: ${npc?.role || 'сталкер'}. Фракция: ${npc?.group || npc?.faction || 'одиночки'}.`,
    `Манера речи: ${getNpcTone(npc)}`,
    'Отвечай только по-русски, естественно, как живой персонаж. Не называй себя ИИ, ассистентом или языковой моделью.',
    'Обычно отвечай 1–4 короткими предложениями. Можно шутить, грубить, отказывать, переспрашивать и помнить контекст беседы.',
    'Не повторяй дословно предыдущую реплику. Учитывай характер, занятие, текущую локацию и историю диалога.',
    'Не выдумывай игровые факты, задания, товары, имена, маршруты или события. Используй только переданный контекст. Если не знаешь — скажи, что не знаешь или слышал только слух.',
    'Если игрок спрашивает дорогу, перечисляй только реальные соседние переходы и переданные сведения о карте. Не придумывай короткие пути.',
    'Если игрок просит купить, продать, торговать, принять задание, переместиться или выполнить действие, не утверждай, что действие уже совершено. Скажи, какую кнопку/команду использовать; игровые действия выполняет сама игра.',
    'Не давай реальных инструкций по изготовлению оружия, взрывчатки, наркотиков или причинению вреда. Описывай опасные игровые события только на уровне вымышленной сцены.',
    'Верни только текст реплики NPC без имени, кавычек, Markdown и пояснений.'
  ].join('\n');

  const context = {
    npc: {
      id: npc?.id,
      name: npc?.name,
      role: npc?.role,
      faction: npc?.faction,
      group: npc?.group,
      activity: npc?.activity,
      personalTask: npc?.personalTask,
      greeting: npc?.greeting,
      topics: Array.isArray(npc?.topics) ? npc.topics.slice(0, 12) : [],
      knownDialogue: Object.fromEntries(Object.entries(npc?.lines || {}).slice(0, 10).map(([topic, line]) => [topic, normalizeText(line).slice(0, 260)]))
    },
    player: {
      name: game?.player?.name || 'сталкер',
      faction: factionName,
      rank: game?.player?.rank,
      reputation: game?.player?.reputation,
      currentLocation: current?.name || 'неизвестно'
    },
    currentLocation: current ? { id: current.id, name: current.name, description: current.desc, territory: current.territory || 'neutral', hazards: current.hazards || [] } : null,
    availableExits: neighbours,
    activeQuests,
    worldState: {
      worldMinutes: game?.clock?.worldMinutes ?? null,
      weather: game?.weather?.name || game?.weather || null,
      emissionActive: Boolean(game?.emission?.active),
      money: Number.isFinite(game?.money) ? game.money : null
    },
    npcMemory: game?.dialogueContexts?.[npc?.id] || {},
    recentConversation: history,
    playerMessage: normalizeText(playerMessage).slice(0, 700)
  };

  return {
    system,
    context,
    // OpenAI-compatible proxy implementations can forward this messages array.
    messages: [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: JSON.stringify(context) }
    ],
    npc: context.npc,
    playerMessage: context.playerMessage
  };
}

function extractReply(data) {
  if (!data || typeof data !== 'object') return '';
  if (typeof data.reply === 'string') return data.reply;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.output_text === 'string') return data.output_text;
  const choice = data.choices?.[0]?.message?.content;
  if (typeof choice === 'string') return choice;
  if (Array.isArray(choice)) return choice.map(part => part?.text || '').join('\n');
  const output = data.output?.flatMap(item => item?.content || []).find(part => typeof part?.text === 'string');
  return output?.text || '';
}

/**
 * Optional external generative AI adapter. The browser never stores or sends API keys.
 * The configured endpoint must be a user's own CORS-enabled proxy that accepts the
 * documented JSON payload and returns { reply: "..." } or an OpenAI-compatible response.
 */
export async function requestNpcAiReply({ endpoint, game, npc, playerMessage, fetchImpl = globalThis.fetch, timeoutMs = 18000 }) {
  if (!isValidNpcAiEndpoint(endpoint)) return { ok: false, reason: 'endpoint-invalid' };
  if (typeof fetchImpl !== 'function') return { ok: false, reason: 'fetch-unavailable' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Math.min(30000, timeoutMs)));
  try {
    const payload = buildNpcAiPayload({ game, npc, playerMessage });
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response?.ok) return { ok: false, reason: `http-${response?.status || 'error'}` };
    const data = await response.json();
    const reply = cleanReply(extractReply(data));
    if (!reply) return { ok: false, reason: 'empty-reply' };
    return { ok: true, reply };
  } catch (error) {
    return { ok: false, reason: error?.name === 'AbortError' ? 'timeout' : 'network-error' };
  } finally {
    clearTimeout(timeout);
  }
}
