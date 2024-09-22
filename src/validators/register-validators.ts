import { checkSchema } from 'express-validator';

export default checkSchema({
    email: {
        trim: true,
        errorMessage: 'Email is required!',
        notEmpty: true,
        isEmail: {
            errorMessage: 'Email should be a valid email',
        },
    },
});

// export default [body("email").notEmpty().withMessage("Email is required!")];
