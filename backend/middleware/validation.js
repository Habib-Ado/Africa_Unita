import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errori di validazione',
            errors: errors.array()
        });
    }
    next();
};

export const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username deve essere tra 3 e 50 caratteri')
        .matches(/^[a-zA-Z0-9_\s]+$/)
        .withMessage('Username può contenere solo lettere, numeri, underscore e spazi'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email non valida')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password deve essere di almeno 8 caratteri')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password deve contenere almeno una lettera maiuscola, una minuscola e un numero'),
    body('first_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Nome troppo lungo'),
    body('last_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Cognome troppo lungo'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[+]?[\d\s-()]+$/)
        .withMessage('Numero di telefono non valido'),
    body('country_of_origin')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Paese di origine troppo lungo'),
    handleValidationErrors
];

export const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Username (email di accesso) non valido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password richiesta'),
    handleValidationErrors
];

export const validateMessage = [
    body('recipient_id')
        .isInt({ min: 1 })
        .withMessage('ID destinatario non valido'),
    body('subject')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Oggetto deve essere tra 1 e 255 caratteri'),
    body('content')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Contenuto deve essere tra 1 e 2000 caratteri'),
    handleValidationErrors
];