import { body, param } from 'express-validator';

export const createClientValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('phone')
    .optional()
    .trim()
    .custom(value => {
      if (!value) return true; // Allow empty string
      return /^[+\d\s-()]+$/.test(value);
    })
    .withMessage('Phone number can only contain numbers, spaces, +, -, and ()'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters')
];

export const updateClientValidator = [
  param('id')
    .isInt()
    .withMessage('Invalid client ID'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('phone')
    .optional()
    .trim()
    .custom(value => {
      if (!value) return true; // Allow empty string
      return /^[+\d\s-()]+$/.test(value);
    })
    .withMessage('Phone number can only contain numbers, spaces, +, -, and ()'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters')
];

export const clientIdValidator = [
  param('id')
    .isInt()
    .withMessage('Invalid client ID')
];
