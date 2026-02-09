import fs from 'node:fs';
import path from 'node:path';

export interface BasPromptVars {
  event: string;
  today: string;
  resolutionDate?: string;
  resolutionCriteria?: string;
}

function firstExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function loadBasPromptTemplate(): string {
  const envPath = process.env.AI_PROMPT_PATH;
  const cwd = process.cwd();

  const candidates = envPath
    ? [path.resolve(envPath)]
    : [
        // if backend is run from repo root
        path.resolve(cwd, 'prompt.MD'),
        path.resolve(cwd, 'prompt.md'),
        // if backend is run from backend/
        path.resolve(cwd, '../prompt.MD'),
        path.resolve(cwd, '../prompt.md'),
      ];

  const promptPath = firstExistingPath(candidates);
  if (!promptPath) {
    throw new Error('prompt.md not found (set AI_PROMPT_PATH or add prompt.MD to repo root)');
  }

  return fs.readFileSync(promptPath, 'utf-8');
}

export function buildBasPrompt(vars: BasPromptVars): string {
  const template = loadBasPromptTemplate();
  return template
    .replaceAll('{EVENT}', vars.event ?? '')
    .replaceAll('{TODAY}', vars.today ?? '')
    .replaceAll('{RESOLUTION_DATE}', vars.resolutionDate ?? '')
    .replaceAll('{RESOLUTION_CRITERIA}', vars.resolutionCriteria ?? '');
}

export function extractLastJsonCodeBlock(text: string): { jsonText: string; value: unknown } | null {
  const re = /```json\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = re.exec(text)) !== null) last = match;
  if (!last) return null;

  const jsonText = last[1]?.trim() ?? '';
  if (!jsonText) return null;

  try {
    const value = JSON.parse(jsonText) as unknown;
    return { jsonText, value };
  } catch {
    return null;
  }
}

