/**
 * Shared input validation & sanitization helpers.
 * Used by signup form (client) and OTP send endpoint (server).
 */

export function sanitizeInput(value: string): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '');
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Expects a 10-digit Indian mobile number, digits only (already stripped of +91/spaces by caller)
  const digitsOnly = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digitsOnly);
}

export function validatePassword(password: string): boolean {
  if (!password) return false;
  // Minimum 8 characters, at least one letter and one number
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export interface SignupFormInput {
  email: string;
  phone: string;
  password: string;
  name: string;
}

export interface SignupFormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateSignupForm(input: SignupFormInput): SignupFormValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Please enter your full name';
  }

  if (!validateEmail(input.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!validatePhoneNumber(input.phone)) {
    errors.phone = 'Please enter a valid 10-digit mobile number';
  }

  if (!validatePassword(input.password)) {
    errors.password = 'Password must be at least 8 characters and include a letter and a number';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
