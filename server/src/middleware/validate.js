/**
 * Reusable validation middleware
 * Validates req.body, req.query, and/or req.params using provided Zod schemas
 * and assigns the validated/parsed output back to req.
 */
const validate = ({ body, query, params } = {}) => {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = validate;
