const {z} = require('zod');
const {AVATAR_KEYS} = require('../utils/constants')
const userSchemaValidator = z.object({
    usermame : z.string().trim().toLowerCase().min(2, 'Minimum length should be of 2 characters').max('Username should be less then 100 characters'),
    email : z.string().trim().toLowerCase().pipe(z.email('Invalid Email Address')),
    password : z.string().min(8, 'Password should have at least 8 characters').max(72, 'Password should be less then 72 characters'),
    avatar : z.enum(AVATAR_KEYS).optional()
}).strict()

module.exports = userSchemaValidator;