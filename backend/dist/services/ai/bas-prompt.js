"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBasPromptTemplate = loadBasPromptTemplate;
exports.buildBasPrompt = buildBasPrompt;
exports.extractLastJsonCodeBlock = extractLastJsonCodeBlock;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function firstExistingPath(paths) {
    for (const p of paths) {
        try {
            if (node_fs_1.default.existsSync(p))
                return p;
        }
        catch {
            // ignore
        }
    }
    return null;
}
function loadBasPromptTemplate() {
    const envPath = process.env.AI_PROMPT_PATH;
    const cwd = process.cwd();
    const candidates = envPath
        ? [node_path_1.default.resolve(envPath)]
        : [
            // if backend is run from repo root
            node_path_1.default.resolve(cwd, 'prompt.MD'),
            node_path_1.default.resolve(cwd, 'prompt.md'),
            // if backend is run from backend/
            node_path_1.default.resolve(cwd, '../prompt.MD'),
            node_path_1.default.resolve(cwd, '../prompt.md'),
        ];
    const promptPath = firstExistingPath(candidates);
    if (!promptPath) {
        throw new Error('prompt.md not found (set AI_PROMPT_PATH or add prompt.MD to repo root)');
    }
    return node_fs_1.default.readFileSync(promptPath, 'utf-8');
}
function buildBasPrompt(vars) {
    const template = loadBasPromptTemplate();
    return template
        .replaceAll('{EVENT}', vars.event ?? '')
        .replaceAll('{TODAY}', vars.today ?? '')
        .replaceAll('{RESOLUTION_DATE}', vars.resolutionDate ?? '')
        .replaceAll('{RESOLUTION_CRITERIA}', vars.resolutionCriteria ?? '');
}
function extractLastJsonCodeBlock(text) {
    const re = /```json\s*([\s\S]*?)\s*```/gi;
    let match = null;
    let last = null;
    while ((match = re.exec(text)) !== null)
        last = match;
    if (!last)
        return null;
    const jsonText = last[1]?.trim() ?? '';
    if (!jsonText)
        return null;
    try {
        const value = JSON.parse(jsonText);
        return { jsonText, value };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=bas-prompt.js.map