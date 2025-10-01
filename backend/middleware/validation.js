import { body, validationResult } from 'express-validator';

// Middleware per gestire gli errori di validazione
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        console.log('Request body:', req.body);
        return res.status(400).json({ 
            success: false,
            message: 'Errori di validazione',
            errors: errors.array() 
        });
    }
    next();
};

// Validazioni per la registrazione
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

// Validazioni per il login
export const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email non valida')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password richiesta'),
    handleValidationErrors
];

// Validazioni per creazione post
export const validatePost = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Titolo deve essere tra 5 e 255 caratteri'),
    body('description')
        .trim()
        .isLength({ min: 20 })
        .withMessage('Descrizione deve essere di almeno 20 caratteri'),
    body('category')
        .isIn(['alloggio', 'lavoro', 'formazione', 'servizi', 'eventi', 'altro'])
        .withMessage('Categoria non valida'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 255 }),
    handleValidationErrors
];

// Validazioni per messaggio
export const validateMessage = [
    body('recipient_id')
        .isInt({ min: 1 })
        .withMessage('ID destinatario non valido'),
    body('subject')
        .optional()
        .trim()
        .isLength({ max: 255 }),
    body('content')
        .trim()
        .isLength({ min: 1, max: 5000 })
        .withMessage('Contenuto messaggio richiesto (max 5000 caratteri)'),
    handleValidationErrors
];

// Validazioni per aggiornamento profilo
export const validateProfileUpdate = [
    body('first_name')
        .optional()
        .trim()
        .isLength({ max: 100 }),
    body('last_name')
        .optional()
        .trim()
        .isLength({ max: 100 }),
    body('phone')
        .optional()
        .trim()
        .matches(/^[+]?[\d\s-()]+$/)
        .withMessage('Numero di telefono non valido'),
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 1000 }),
    body('city')
        .optional()
        .trim()
        .isLength({ max: 100 }),
    handleValidationErrors
];

// Validazione per reset password
export const validateResetPassword = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email non valida')
        .normalizeEmail(),
    handleValidationErrors
];

// Validazione per nuova password
export const validateNewPassword = [
    body('token')
        .notEmpty()
        .withMessage('Token richiesto'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password deve essere di almeno 8 caratteri')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password deve contenere almeno una lettera maiuscola, una minuscola e un numero'),
    handleValidationErrors
];
