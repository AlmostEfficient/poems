#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { createPoemId, ensureUniquePoemId } from '../lib/utils/poemId';
import type { PoemMetadata, PoemLengthBucket } from '../lib/types';

type Provider = 'openai' | 'anthropic';

interface CLIOptions {
  inputPath?: string;
  text?: string;
  title?: string;
  author?: string;
  language?: string;
  id?: string;
  provider: Provider;
  model?: string;
  outputPath: string;
  dryRun: boolean;
  temperature: number;
}

interface Poem {
  id: string;
  title: string;
  author: string;
  content: string;
  language: 'en' | 'ur';
  metadata: PoemMetadata;
}

interface LLMResponse {
  raw: string;
  parsed: Poem;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    provider: 'openai',
    outputPath: path.resolve(__dirname, '..', 'poems.json'),
    dryRun: false,
    temperature: 0.2,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--input':
      case '-i':
        options.inputPath = path.resolve(process.cwd(), args[++i]);
        break;
      case '--text':
        options.text = args[++i];
        break;
      case '--title':
        options.title = args[++i];
        break;
      case '--author':
        options.author = args[++i];
        break;
      case '--id':
        options.id = args[++i];
        break;
      case '--language':
        options.language = args[++i];
        break;
      case '--provider':
        {
          const value = args[++i]?.toLowerCase();
          if (value === 'openai' || value === 'anthropic') {
            options.provider = value;
          } else {
            throw new Error(`Unsupported provider: ${value}`);
          }
        }
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputPath = path.resolve(process.cwd(), args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--temperature':
        options.temperature = Number(args[++i]);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.text && !options.inputPath) {
    throw new Error('Provide poem text via --text or --input');
  }

  return options;
}

function readPoemText(options: CLIOptions): string {
  if (options.text) {
    return options.text;
  }

  if (!options.inputPath) {
    throw new Error('No input path provided');
  }

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input file not found: ${options.inputPath}`);
  }

  return fs.readFileSync(options.inputPath, 'utf8');
}

function sanitizeLanguage(language?: string): 'en' | 'ur' {
  if (language === 'ur') {
    return 'ur';
  }
  return 'en';
}

function resolveModel(provider: Provider, override?: string): string {
  if (override) {
    const normalized = override.trim().toLowerCase();
    const openaiAliases: Record<string, string> = {
      flash: 'gpt-4.1-mini',
      '4o': 'gpt-4o',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4.1-mini': 'gpt-4.1-mini',
    };
    const anthropicAliases: Record<string, string> = {
      haiku: 'claude-3-haiku-1',
      'claude-3-haiku': 'claude-3-haiku-1',
      'haiku-1': 'claude-3-haiku-1',
    };
    if (provider === 'openai' && openaiAliases[normalized]) {
      return openaiAliases[normalized];
    }
    if (provider === 'anthropic' && anthropicAliases[normalized]) {
      return anthropicAliases[normalized];
    }
    return override;
  }

  return provider === 'openai' ? 'gpt-4.1-mini' : 'claude-3-haiku-1';
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return items.length ? items : undefined;
}

function inferLengthBucket(content: string): PoemLengthBucket {
  const lineCount = content.split('\n').filter((line) => line.trim().length > 0).length;
  if (lineCount <= 12) {
    return 'short';
  }
  if (lineCount <= 30) {
    return 'medium';
  }
  return 'long';
}

function sanitizeMetadata(raw: unknown, fallbackContent: string): PoemMetadata {
  let payload = raw;
  if (!payload) {
    payload = {};
  } else if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  if (!payload || typeof payload !== 'object') {
    payload = {};
  }

  const metadata: PoemMetadata = {};
  const record = payload as Record<string, unknown>;

  const tags = sanitizeStringArray(record.tags);
  if (tags) {
    metadata.tags = tags.slice(0, 8);
  }

  const themes = sanitizeStringArray(record.themes);
  if (themes) {
    metadata.themes = themes.slice(0, 8);
  }

  const moods = sanitizeStringArray(record.moods);
  if (moods) {
    metadata.moods = moods.slice(0, 6);
  }

  const form = typeof record.form === 'string' ? record.form.trim() : '';
  if (form) {
    metadata.form = form;
  }

  const era = typeof record.era === 'string' ? record.era.trim() : '';
  if (era) {
    metadata.era = era;
  }

  const length = typeof record.length === 'string' ? record.length.trim().toLowerCase() : '';
  if (length === 'short' || length === 'medium' || length === 'long') {
    metadata.length = length;
  } else {
    metadata.length = inferLengthBucket(fallbackContent);
  }

  return metadata;
}

function buildSystemPrompt(): string {
  return [
    'You are a meticulous poetry formatter for the Poems mobile app.',
    'Return *only* a single JSON object with the keys: title, author, content, language, metadata.',
    'Guidelines:',
    '- Preserve original line breaks and stanza spacing (blank line between stanzas).',
    '- Normalise whitespace: no trailing spaces, use "\\n" for line breaks.',
    '- Ensure `content` ends with the poem (no extra commentary).',
    '- Keep `title` and `author` near sentence case unless source specifies otherwise.',
    '- Use language code "en" for English, "ur" for Urdu.',
    '- Always include a `metadata` object with the keys: tags, themes, moods (arrays of 1-5 short lowercase strings), form (string or null), era (string or null), length (short|medium|long).',
    '- Choose descriptive tags/themes that help users filter by topic, mood, and style.',
    '- Set `form` to a common poetic form (e.g. "sonnet", "haiku", "free verse"). If unknown, return null.',
    '- Set `era` to a broad period (e.g. "Renaissance", "19th century", "Harlem Renaissance"). If unknown, return null.',
    '- Estimate `length` from the poem: short (<=12 lines), medium (<=30 lines), otherwise long.',
    'If metadata (title/author/language) is supplied, keep it unless it conflicts with the poem.',
  ].join('\n');
}

function buildUserPrompt(poemText: string, options: CLIOptions): string {
  const parts = [
    'Format the following poem for the app database.',
    'Raw poem text:',
    '```',
    poemText.trim(),
    '```',
  ];

  if (options.title || options.author || options.language) {
    parts.push('Provided metadata:');
    if (options.title) parts.push(`- title: ${options.title}`);
    if (options.author) parts.push(`- author: ${options.author}`);
    if (options.language) parts.push(`- language: ${sanitizeLanguage(options.language)}`);
  } else {
    parts.push('No additional metadata supplied.');
  }

  parts.push(
    'Return JSON only. Example format: {"title":"...","author":"...","content":"...","language":"en","metadata":{"tags":["identity","resilience"],"themes":["perseverance"],"moods":["defiant"],"form":"free verse","era":"20th century","length":"medium"}}'
  );
  return parts.join('\n');
}

async function callOpenAI(prompt: string, system: string, model: string, temperature: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  const url = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI API did not return textual content.');
  }
  return content;
}

async function callAnthropic(prompt: string, system: string, model: string, temperature: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable.');
  }

  const response = await fetch(process.env.ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_output_tokens: 1024,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Anthropic API did not return textual content.');
  }
  return text;
}

function extractJsonObject(text: string): any {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first === -1 || last === -1 || last < first) {
    throw new Error('Failed to locate JSON object in model response.');
  }

  const jsonString = text.slice(first, last + 1);
  return JSON.parse(jsonString);
}

function normalizePoem(raw: any, fallbackLanguage: 'en' | 'ur'): Poem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Parsed payload is not an object.');
  }

  const id = raw.id ? String(raw.id).trim() : '';
  const title = String(raw.title ?? '').trim();
  const author = String(raw.author ?? '').trim();
  const language = sanitizeLanguage(raw.language ?? fallbackLanguage);
  const content = String(raw.content ?? '').replace(/\r\n/g, '\n').trim();
  const metadata = sanitizeMetadata(raw.metadata, content);

  if (!title || !author || !content) {
    throw new Error('Model output missing required fields (title, author, content).');
  }

  return { id, title, author, content, language, metadata };
}

function loadPoems(poemsPath: string): Poem[] {
  if (!fs.existsSync(poemsPath)) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(poemsPath, 'utf8'));
  if (!Array.isArray(data)) {
    throw new Error(`Expected poems.json to contain an array, received ${typeof data}`);
  }

  return data.map((entry) => {
    const title = String(entry.title ?? '').trim();
    const author = String(entry.author ?? '').trim();
    const content = String(entry.content ?? '').replace(/\r\n/g, '\n').trim();
    const language = sanitizeLanguage(entry.language);
    const metadata = sanitizeMetadata(entry.metadata, content);
    const id = entry.id ? String(entry.id).trim() : createPoemId({ title, author, content, language });

    return { id, title, author, content, language, metadata };
  });
}

function findDuplicate(poems: Poem[], candidate: Poem): Poem | undefined {
  const normalizedTitle = candidate.title.toLowerCase();
  const normalizedAuthor = candidate.author.toLowerCase();

  return poems.find(
    (poem) =>
      poem.id === candidate.id ||
      (poem.title.toLowerCase() === normalizedTitle &&
        poem.author.toLowerCase() === normalizedAuthor &&
        poem.content.trim() === candidate.content.trim())
  );
}

function writePoems(poemsPath: string, poems: Poem[]): void {
  const tmpPath = `${poemsPath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(poems, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, poemsPath);
}

async function formatPoem(options: CLIOptions): Promise<LLMResponse> {
  const poemText = readPoemText(options);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(poemText, options);

  const temperature = Number.isFinite(options.temperature) ? options.temperature : 0.2;

  const model = resolveModel(options.provider, options.model);

  let rawResponse: string;
  if (options.provider === 'openai') {
    rawResponse = await callOpenAI(userPrompt, systemPrompt, model, temperature);
  } else {
    rawResponse = await callAnthropic(userPrompt, systemPrompt, model, temperature);
  }

  const parsed = normalizePoem(extractJsonObject(rawResponse), sanitizeLanguage(options.language));

  if (options.title) {
    parsed.title = options.title.trim();
  }
  if (options.author) {
    parsed.author = options.author.trim();
  }
  if (options.language) {
    parsed.language = sanitizeLanguage(options.language);
  }
  if (options.id) {
    parsed.id = options.id.trim();
  }

  return { raw: rawResponse, parsed };
}

async function main() {
  try {
    const options = parseArgs();
    const poemsPath = options.outputPath;
    const existing = loadPoems(poemsPath);
    const existingIds = new Set(existing.map((poem) => poem.id));

    const { parsed, raw } = await formatPoem(options);

    const baseId = (parsed.id && parsed.id.trim())
      || options.id?.trim()
      || createPoemId({
        title: parsed.title,
        author: parsed.author,
        content: parsed.content,
        language: parsed.language,
      });

    const duplicateById = existing.find((poem) => poem.id === baseId);
    if (duplicateById) {
      parsed.id = duplicateById.id;

      if (
        duplicateById.title === parsed.title &&
        duplicateById.author === parsed.author &&
        duplicateById.content.trim() === parsed.content.trim()
      ) {
        console.log('⚠️  Duplicate poem detected (same id, title, author, and content). No changes written.');
        return;
      }

      const uniqueId = ensureUniquePoemId(baseId, (candidate) => existingIds.has(candidate));
      parsed.id = uniqueId;
    } else {
      const uniqueId = ensureUniquePoemId(baseId, (candidate) => existingIds.has(candidate));
      parsed.id = uniqueId;
    }

    existingIds.add(parsed.id);

    console.log('Model response:\n', raw);
    console.log('\nParsed poem:\n', parsed);

    const duplicate = findDuplicate(existing, parsed);
    if (duplicate) {
      console.log('⚠️  Duplicate poem detected (same title, author, and content). No changes written.');
      return;
    }

    if (options.dryRun) {
      console.log('Dry run enabled — skipping write to poems.json');
      return;
    }

    const updated = [...existing, parsed];
    writePoems(poemsPath, updated);
    console.log(`✅ Added "${parsed.title}" by ${parsed.author} to ${path.relative(process.cwd(), poemsPath)}`);
  } catch (error) {
    console.error('Failed to format poem.');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

void main();
