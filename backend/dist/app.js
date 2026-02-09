"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const markets_1 = require("./routes/markets");
const analysis_1 = require("./routes/analysis");
const trades_1 = require("./routes/trades");
const snapshots_1 = require("./routes/snapshots");
const health_1 = require("./routes/health");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(request_logger_1.requestLogger);
app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Routes
app.use('/api/v1/markets', markets_1.marketsRouter);
app.use('/api/v1/analysis', analysis_1.analysisRouter);
app.use('/api/v1/trades', trades_1.tradesRouter);
app.use('/api/v1/snapshots', snapshots_1.snapshotsRouter);
app.use('/api/v1/health', health_1.healthRouter);
// Error handling
app.use(error_handler_1.errorHandler);
//# sourceMappingURL=app.js.map