const AppError = require('../utils/appError');

const schemaValidator = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if(!result.success) {
        const message = result.error.issues.map((e) => e.message).join(' ,');
        throw new AppError(message, 400);
    }

    req.body = result.data;
    next();
}

module.exports = schemaValidator;