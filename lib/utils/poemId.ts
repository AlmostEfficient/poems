export interface CreatePoemIdInput {
  title: string;
  author: string;
  content: string;
  language?: 'en' | 'ur';
}

function normalizeValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function slugify(value: string): string {
  const normalized = normalizeValue(value);
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  hash >>>= 0;
  return hash.toString(16).padStart(8, '0');
}

export function createPoemId({ title, author, content, language = 'en' }: CreatePoemIdInput): string {
  const slugAuthor = slugify(author);
  const slugTitle = slugify(title);
  const lang = language.toLowerCase();
  const contentFingerprint = hashString(
    `${title}\n${author}\n${lang}\n${content}`.replace(/\s+/g, ' ').trim()
  );

  const baseSegments = [slugAuthor, slugTitle, lang].filter(Boolean).join('-');
  const base = baseSegments || `poem-${lang}`;

  return `${base}-${contentFingerprint}`;
}

export function ensureUniquePoemId(
  desiredId: string,
  isTaken: (id: string) => boolean
): string {
  if (!isTaken(desiredId)) {
    return desiredId;
  }

  let counter = 1;
  let candidate = `${desiredId}-${counter}`;
  while (isTaken(candidate)) {
    counter += 1;
    candidate = `${desiredId}-${counter}`;
  }
  return candidate;
}
