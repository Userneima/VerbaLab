/**
 * Fills missing `chinese` on all example sentences in verbData.ts.
 * Inserts a second `daily` example when a collocation only has one daily sentence
 * (asset area / Foundry shows daily-only).
 *
 * Run: node scripts/enrich-verbdata-examples.mjs
 * Uses MyMemory free API + local cache (scripts/.verbdata-translation-cache.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERB_DATA = path.join(__dirname, '../src/app/data/verbData.ts');
const CACHE_PATH = path.join(__dirname, '.verbdata-translation-cache.json');

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(c) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 0), 'utf8');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function translateEnToZh(english, cache) {
  const key = english.trim();
  if (cache[key]) return cache[key];
  const u =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' +
    encodeURIComponent(key.slice(0, 4500));
  let lastErr = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*' } });
    const text = await res.text();
    if (text.startsWith('<') || !text.trim().startsWith('[')) {
      lastErr = text.slice(0, 80);
      await sleep(400 * (attempt + 1) * (attempt + 1));
      continue;
    }
    let j;
    try {
      j = JSON.parse(text);
    } catch (e) {
      lastErr = String(e);
      await sleep(500);
      continue;
    }
    const segs = j[0];
    if (!Array.isArray(segs)) {
      lastErr = 'bad shape';
      await sleep(500);
      continue;
    }
    const zh = segs.map((s) => (Array.isArray(s) ? s[0] : '')).join('').trim();
    if (!zh) {
      lastErr = 'empty';
      await sleep(500);
      continue;
    }
    cache[key] = zh;
    await sleep(95);
    return zh;
  }
  throw new Error('Translate failed after retries: ' + lastErr);
}

function unescapeContent(s) {
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function escapeContent(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parseExampleObjects(exBody) {
  const objs = [];
  let depth = 0,
    start = -1;
  for (let i = 0; i < exBody.length; i++) {
    if (exBody[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (exBody[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objs.push(exBody.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objs.map((raw) => {
    const sc = raw.match(/scenario:\s*'(daily|zju|design)'/);
    const cm = raw.match(/content:\s*'((?:[^'\\]|\\.)*)'/);
    const zh = raw.match(/chinese:\s*'((?:[^'\\]|\\.)*)'/);
    return {
      raw,
      scenario: sc?.[1],
      content: cm ? unescapeContent(cm[1]) : '',
      chinese: zh ? unescapeContent(zh[1]) : null,
    };
  });
}

function stringifyExample(ex) {
  const esc = escapeContent(ex.content);
  const parts = [`{ scenario: '${ex.scenario}', content: '${esc}'`];
  if (ex.chinese != null && ex.chinese !== '') {
    parts.push(`, chinese: '${escapeContent(ex.chinese)}'`);
  }
  parts.push(' }');
  return parts.join('');
}

function secondDailyFromFirst(content) {
  const t = content.trim();
  const hadQ = /\?\s*$/.test(t);
  const noEnd = t.replace(/[.?!]\s*$/, '');
  if (noEnd.includes(', ')) {
    const idx = noEnd.indexOf(', ');
    const a = noEnd.slice(0, idx);
    const b = noEnd.slice(idx + 2).trim();
    const skipSwap = /^(but|and|or|nor|yet|so|although|because|though|while|which|who)\s/i.test(b);
    if (!skipSwap && b.length > 8 && a.length > 8) {
      const s = b.replace(/[.?!]$/, '') + ', ' + a.trim().replace(/[.?!]$/, '');
      return hadQ ? s + '?' : s + '.';
    }
  }
  if (/^I\s/i.test(noEnd)) {
    const s = 'In my daily life, ' + noEnd;
    return hadQ ? s + '?' : s + '.';
  }
  if (/^We\s/i.test(noEnd)) {
    const s = 'At home, ' + noEnd.charAt(0).toLowerCase() + noEnd.slice(1);
    return hadQ ? s + '?' : s + '.';
  }
  if (/^You\s/i.test(noEnd)) {
    const s = 'Honestly, ' + noEnd.charAt(0).toLowerCase() + noEnd.slice(1);
    return hadQ ? s + '?' : s + '.';
  }
  if (/^Let'?s\s/i.test(noEnd)) {
    const s = 'Later on, ' + noEnd.replace(/^Let'?s/i, "let's");
    return hadQ ? s + '?' : s + '.';
  }
  if (/^Could you/i.test(noEnd)) {
    const s = 'Sometimes ' + noEnd.charAt(0).toLowerCase() + noEnd.slice(1);
    return hadQ ? s + '?' : s + '.';
  }
  if (/^([A-Z][a-z]+)\s/.test(noEnd)) {
    const s = 'From my perspective, ' + noEnd.charAt(0).toLowerCase() + noEnd.slice(1);
    return hadQ ? s + '?' : s + '.';
  }
  const s = 'Another habit I have is that ' + noEnd.charAt(0).toLowerCase() + noEnd.slice(1);
  return hadQ ? s + '?' : s + '.';
}

async function main() {
  let text = fs.readFileSync(VERB_DATA, 'utf8');
  const cache = loadCache();
  const colRe =
    /\{ id: '(C\d+)', phrase: '((?:[^'\\]|\\.)*)', meaning: '((?:[^'\\]|\\.)*)', examples: \[([\s\S]*?)\]\s*\}/g;

  let replacements = 0;
  const newText = text.replace(colRe, (full, cid, phraseEsc, meaningEsc, exInner) => {
    let examples = parseExampleObjects(exInner);

    const dailyIdxs = examples
      .map((e, i) => (e.scenario === 'daily' ? i : -1))
      .filter((i) => i >= 0);
    if (dailyIdxs.length === 1) {
      const i = dailyIdxs[0];
      const first = examples[i].content;
      const secondEn = secondDailyFromFirst(first);
      const insertAt = i + 1;
      examples.splice(insertAt, 0, {
        raw: '',
        scenario: 'daily',
        content: secondEn,
        chinese: null,
      });
      replacements++;
    }

    return `{ id: '${cid}', phrase: '${phraseEsc}', meaning: '${meaningEsc}', examples: [\n${examples
      .map((e) => '        ' + stringifyExample(e))
      .join(',\n')}\n      ]}`;
  });

  if (newText === text) {
    console.error('No collocation blocks matched; abort.');
    process.exit(1);
  }

  fs.writeFileSync(VERB_DATA, newText, 'utf8');
  console.log('Inserted second daily for', replacements, 'collocations.');

  // Pass 2: fill all missing chinese (re-read)
  text = fs.readFileSync(VERB_DATA, 'utf8');
  const colRe2 =
    /\{ id: '(C\d+)', phrase: '((?:[^'\\]|\\.)*)', meaning: '((?:[^'\\]|\\.)*)', examples: \[([\s\S]*?)\]\s*\}/g;
  let toTranslate = [];
  text.replace(colRe2, (_m, _cid, _pe, _me, exInner) => {
    const examples = parseExampleObjects(exInner);
    for (const e of examples) {
      if (!e.chinese && e.content) toTranslate.push(e.content);
    }
    return '';
  });
  toTranslate = [...new Set(toTranslate)];
  console.log('Translating', toTranslate.length, 'unique English lines...');
  let done = 0;
  for (const en of toTranslate) {
    await translateEnToZh(en, cache);
    done++;
    if (done % 50 === 0) {
      console.log('  ', done, '/', toTranslate.length);
      saveCache(cache);
    }
  }
  saveCache(cache);

  const filled = text.replace(colRe2, (full, cid, phraseEsc, meaningEsc, exInner) => {
    let examples = parseExampleObjects(exInner);
    examples = examples.map((e) => {
      if (!e.chinese && e.content) {
        const zh = cache[e.content.trim()];
        if (!zh) throw new Error('Missing cache for: ' + e.content.slice(0, 60));
        return { ...e, chinese: zh };
      }
      return e;
    });
    return `{ id: '${cid}', phrase: '${phraseEsc}', meaning: '${meaningEsc}', examples: [\n${examples
      .map((e) => '        ' + stringifyExample(e))
      .join(',\n')}\n      ]}`;
  });

  fs.writeFileSync(VERB_DATA, filled, 'utf8');
  console.log('Done. All examples have chinese. Cache:', CACHE_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
