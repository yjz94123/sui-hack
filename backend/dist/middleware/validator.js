"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema, source = 'query') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PARAMS',
                        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
                    },
                });
                return;
            }
            next(err);
        }
    };
}
//# sourceMappingURL=validator.js.map