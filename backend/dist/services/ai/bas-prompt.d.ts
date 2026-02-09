export interface BasPromptVars {
    event: string;
    today: string;
    resolutionDate?: string;
    resolutionCriteria?: string;
}
export declare function loadBasPromptTemplate(): string;
export declare function buildBasPrompt(vars: BasPromptVars): string;
export declare function extractLastJsonCodeBlock(text: string): {
    jsonText: string;
    value: unknown;
} | null;
//# sourceMappingURL=bas-prompt.d.ts.map