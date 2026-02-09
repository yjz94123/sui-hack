"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildComparisonPrompt = exports.buildMarketAnalysisPrompt = exports.SYSTEM_PROMPT = exports.ogComputeClient = exports.OgComputeClient = exports.aiService = exports.AiService = void 0;
var ai_service_1 = require("./ai-service");
Object.defineProperty(exports, "AiService", { enumerable: true, get: function () { return ai_service_1.AiService; } });
Object.defineProperty(exports, "aiService", { enumerable: true, get: function () { return ai_service_1.aiService; } });
var og_compute_1 = require("./og-compute");
Object.defineProperty(exports, "OgComputeClient", { enumerable: true, get: function () { return og_compute_1.OgComputeClient; } });
Object.defineProperty(exports, "ogComputeClient", { enumerable: true, get: function () { return og_compute_1.ogComputeClient; } });
var prompts_1 = require("./prompts");
Object.defineProperty(exports, "SYSTEM_PROMPT", { enumerable: true, get: function () { return prompts_1.SYSTEM_PROMPT; } });
Object.defineProperty(exports, "buildMarketAnalysisPrompt", { enumerable: true, get: function () { return prompts_1.buildMarketAnalysisPrompt; } });
Object.defineProperty(exports, "buildComparisonPrompt", { enumerable: true, get: function () { return prompts_1.buildComparisonPrompt; } });
//# sourceMappingURL=index.js.map