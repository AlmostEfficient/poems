import fs from 'fs';
import path from 'path';

type Language = 'en' | 'ur';
type PoemSource = 'bundled' | 'local' | 'hybrid' | 'api' | 'user';
type PoemLengthBucket = 'short' | 'medium' | 'long';

interface RawPoem {
  id?: unknown;
  title?: unknown;
  author?: unknown;
  content?: unknown;
  language?: unknown;
  source?: unknown;
  metadata?: unknown;
}

interface CheckOptions {
  inputPath: string;
  quiet: boolean;
}

interface CheckResult {
  errors: string[];
  warnings: string[];
}

function parseArgs(): CheckOptions {
  const args = process.argv.slice(2);
  const options: CheckOptions = {
    inputPath: path.resolve(__dirname, '..', 'poems.json'),
    quiet: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--input':
      case '-i':
        options.inputPath = path.resolve(process.cwd(), args[++i]);
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
        break;
    }
  }

  return options;
}

function expectString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value;
}

function sanitizeLanguage(value: unknown): Language | null {
  if (value === 'en' || value === 'ur') {
    return value;
  }
  return null;
}

function sanitizeSource(value: unknown): PoemSource | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'bundled' || normalized === 'local' || normalized === 'hybrid' || normalized === 'api' || normalized === 'user') {
    return normalized;
  }
  return null;
}

function sanitizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return items.length ? items : [];
}

function sanitizeLength(value: unknown): PoemLengthBucket | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'short' || normalized === 'medium' || normalized === 'long') {
    return normalized;
  }
  return null;
}

function validateMetadata(metadata: unknown, context: string): CheckResult {
  const result: CheckResult = { errors: [], warnings: [] };

  if (metadata === null || metadata === undefined) {
    return result;
  }

  if (typeof metadata !== 'object') {
    result.errors.push(`${context}: metadata must be an object if present.`);
    return result;
  }

  const record = metadata as Record<string, unknown>;

  const tags = sanitizeStringArray(record.tags);
  if (record.tags !== undefined && tags === null) {
    result.errors.push(`${context}: metadata.tags must be an array of strings.`);
  }

  const themes = sanitizeStringArray(record.themes);
  if (record.themes !== undefined && themes === null) {
    result.errors.push(`${context}: metadata.themes must be an array of strings.`);
  }

  const moods = sanitizeStringArray(record.moods);
  if (record.moods !== undefined && moods === null) {
    result.errors.push(`${context}: metadata.moods must be an array of strings.`);
  }

  const form = record.form;
  if (form !== undefined && form !== null && typeof form !== 'string') {
    result.errors.push(`${context}: metadata.form must be a string when provided.`);
  }

  const era = record.era;
  if (era !== undefined && era !== null && typeof era !== 'string') {
    result.errors.push(`${context}: metadata.era must be a string when provided.`);
  }

  const length = record.length;
  if (length !== undefined && length !== null && sanitizeLength(length) === null) {
    result.errors.push(`${context}: metadata.length must be "short", "medium", or "long" when provided.`);
  }

  return result;
}

function checkPoems(poems: unknown[]): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const idMap = new Map<string, number>();
  const signatureMap = new Map<string, number>();

  poems.forEach((entry, index) => {
    const context = `poems[${index}]`;

    if (!entry || typeof entry !== 'object') {
      errors.push(`${context}: entry must be an object.`);
      return;
    }

    const poem = entry as RawPoem;

    const idRaw = expectString(poem.id);
    const id = idRaw ? idRaw.trim() : '';
    if (!id) {
      errors.push(`${context}: missing "id" (must be a non-empty string).`);
    } else {
      if (id !== idRaw) {
        warnings.push(`${context}: id has leading/trailing whitespace; consider trimming.`);
      }
      const prevIndex = idMap.get(id);
      if (prevIndex !== undefined) {
        errors.push(`${context}: duplicate id "${id}" also seen at poems[${prevIndex}].`);
      } else {
        idMap.set(id, index);
      }
    }

    const titleRaw = expectString(poem.title);
    const title = titleRaw ? titleRaw.trim() : '';
    if (!title) {
      errors.push(`${context}: missing "title" (must be a non-empty string).`);
    } else if (title !== titleRaw) {
      errors.push(`${context}: title contains leading/trailing whitespace.`);
    }

    const authorRaw = expectString(poem.author);
    const author = authorRaw ? authorRaw.trim() : '';
    if (!author) {
      errors.push(`${context}: missing "author" (must be a non-empty string).`);
    } else if (author !== authorRaw) {
      errors.push(`${context}: author contains leading/trailing whitespace.`);
    }

    const contentRaw = expectString(poem.content);
    const content = contentRaw ? contentRaw.replace(/\r\n/g, '\n').trim() : '';
    if (!content) {
      errors.push(`${context}: missing "content" (must be a non-empty string).`);
    } else {
      if (contentRaw && contentRaw.indexOf('\r') !== -1) {
        warnings.push(`${context}: content contains CR characters; consider normalising to LF.`);
      }
      if (content !== contentRaw) {
        errors.push(`${context}: content has leading/trailing whitespace.`);
      }
    }

    const language = sanitizeLanguage(poem.language);
    if (!language) {
      errors.push(`${context}: language must be "en" or "ur".`);
    }

    if (poem.source !== undefined && sanitizeSource(poem.source) === null) {
      errors.push(`${context}: source must be one of bundled, local, hybrid, api, user when provided.`);
    }

    const metadataResult = validateMetadata(poem.metadata, context);
    errors.push(...metadataResult.errors);
    warnings.push(...metadataResult.warnings);

    if (title && author && content) {
      const signature = `${title.toLowerCase()}::${author.toLowerCase()}::${content}`;
      const duplicateIndex = signatureMap.get(signature);
      if (duplicateIndex !== undefined) {
        warnings.push(`${context}: duplicate poem content/title/author also seen at poems[${duplicateIndex}].`);
      } else {
        signatureMap.set(signature, index);
      }
    }
  });

  return { errors, warnings };
}

function loadPoemsFile(inputPath: string): unknown {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }
  const raw = fs.readFileSync(inputPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${inputPath}: ${(error as Error).message}`);
  }
}

function main() {
  const options = parseArgs();
  const relativePath = path.relative(process.cwd(), options.inputPath);

  if (!options.quiet) {
    console.log(`🔎 Checking poems in ${relativePath}`);
  }

  const data = loadPoemsFile(options.inputPath);
  if (!Array.isArray(data)) {
    throw new Error(`Expected an array of poems in ${relativePath}`);
  }

  const { errors, warnings } = checkPoems(data);

  if (warnings.length && !options.quiet) {
    console.log(`⚠️  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
    warnings.slice(0, 20).forEach((warning) => console.log(`  • ${warning}`));
    if (warnings.length > 20) {
      console.log(`  • ...and ${warnings.length - 20} more`);
    }
  }

  if (errors.length) {
    console.error(`❌ Format check failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
    errors.slice(0, 50).forEach((error) => console.error(`  • ${error}`));
    if (errors.length > 50 && !options.quiet) {
      console.error(`  • ...and ${errors.length - 50} more`);
    }
    process.exitCode = 1;
    return;
  }

  if (!options.quiet) {
    console.log('✅ All poems look good!');
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Poem format check failed unexpectedly.');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
