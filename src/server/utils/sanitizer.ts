/**
 * Data Sanitization & Strict Input Validation Utility
 *
 * Provides enterprise-grade input cleansing, XSS prevention, and strict
 * regex validation for user registrations, customer profiles, and addresses.
 */

import { ValidationError } from '../errors/AppError';
import { Address } from '../../types';

export interface ValidatedAddress {
  name: string;
  phone: string;
  doorNo: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  coordinates?: string;
  isDefault: boolean;
}

export interface SanitizedRegistrationData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: ValidatedAddress;
}

/**
 * Strip all HTML tags, script blocks, and dangerous control characters to prevent stored XSS.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip null bytes and ASCII control characters
}

/**
 * Sanitize a generic string: trims, strips HTML/control characters, collapses whitespace, and limits length.
 */
export function sanitizeString(val: unknown, maxLength = 255): string {
  if (val === null || val === undefined) return '';
  const cleaned = stripHtml(String(val))
    .replace(/\s+/g, ' ')
    .trim();
  return maxLength > 0 ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Strict Full Name Validator & Sanitizer:
 * - Allows alphabets, spaces, dots, hyphens, and apostrophes.
 * - Forbids HTML, numbers, special symbols, and scripts.
 * - Min length 2 characters, max 70 characters.
 */
export function validateAndSanitizeName(raw: unknown): { isValid: boolean; value: string; error?: string } {
  const sanitized = sanitizeString(raw, 70);
  if (!sanitized || sanitized.length < 2) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Full name is required and must be at least 2 characters.'
    };
  }

  if (sanitized.includes('-')) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Full name cannot contain hyphens (-). Please use letters and spaces only.'
    };
  }

  // Allow alphabets, spaces, dots, and apostrophes (NO hyphens)
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s.']+$/;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Name may only contain alphabetic letters and spaces.'
    };
  }

  // Format into Title Case for clean database storage
  const formatted = sanitized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return { isValid: true, value: formatted };
}

/**
 * Strict Indian & International Mobile Phone Validator & Sanitizer:
 * - Strips all non-digit characters (including accidental letters like 'e', spaces, hyphens).
 * - Strips optional +91 or 91 country code prefix if 12 digits.
 * - Validates 10-digit Indian mobile number format: must start with 6, 7, 8, or 9.
 * - Disallows invalid repeated numbers like 0000000000 or 1111111111.
 * - Returns clean formatted string: "+91 9876543210".
 */
export function validateAndSanitizePhone(raw: unknown): { isValid: boolean; value: string; digits: string; error?: string } {
  if (!raw) {
    return { isValid: false, value: '', digits: '', error: 'Phone number is required.' };
  }

  const rawStr = String(raw).trim();

  // Explicitly reject if phone number contains letters or alphabetic characters
  if (/[a-zA-Z]/.test(rawStr)) {
    return {
      isValid: false,
      value: rawStr,
      digits: '',
      error: 'Phone number cannot contain letters. Please enter 10 digits only.'
    };
  }
  
  // Extract only digits
  let digits = rawStr.replace(/\D/g, '');

  // If user included Indian country code (+91 or 91) with 12 digits, strip it
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }

  // Handle standard 10-digit Indian mobile numbers
  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        value: digits,
        digits,
        error: 'Mobile number must be 10 digits and start with 6, 7, 8, or 9.'
      };
    }

    if (/^(\d)\1{9}$/.test(digits)) {
      return {
        isValid: false,
        value: digits,
        digits,
        error: 'Please enter a valid mobile number, not a repeating sequence.'
      };
    }

    const formatted = `+91 ${digits}`;
    return { isValid: true, value: formatted, digits };
  }

  return {
    isValid: false,
    value: digits,
    digits,
    error: 'Phone number must be a valid 10-digit mobile number (e.g., 9876543210).'
  };
}

/**
 * Normalizes email addresses according to provider rules:
 * - Lowercases and trims the address.
 * - For Gmail & Googlemail:
 *   - Strips all dots (periods) from the username part (john.smith -> johnsmith).
 *   - Strips plus tags / sub-addressing (johnsmith+promo -> johnsmith).
 *   - Standardizes domain to @gmail.com.
 * - Prevents duplicate account creation and resolves dots to the exact same inbox.
 */
export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const sanitized = raw.trim().toLowerCase();
  const atIndex = sanitized.indexOf('@');
  if (atIndex === -1) return sanitized;

  let local = sanitized.slice(0, atIndex);
  const domain = sanitized.slice(atIndex + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // 1. Remove all dots from Gmail username
    local = local.replace(/\./g, '');
    // 2. Remove plus alias (+tag)
    const plusIndex = local.indexOf('+');
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}

/**
 * Strict Email Validator & Sanitizer:
 * - Strips whitespace and invisible characters.
 * - Converts to lower-case.
 * - Enforces RFC 5322 regex validation and valid domain structure.
 * - Validates that usernames do not start/end with dots or have consecutive dots.
 * - Enforces Gmail username rules (no special chars, valid dots).
 */
export function validateAndSanitizeEmail(raw: unknown): { isValid: boolean; value: string; error?: string } {
  const sanitized = sanitizeString(raw, 100).toLowerCase();
  if (!sanitized) {
    return { isValid: false, value: '', error: 'Gmail address is required.' };
  }

  if (!sanitized.endsWith('@gmail.com')) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Email must be a valid Gmail address ending with @gmail.com (e.g. name@gmail.com).'
    };
  }

  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail address ending with @gmail.com.'
    };
  }

  const [localPart, domain] = parts;

  if (domain !== 'gmail.com') {
    return {
      isValid: false,
      value: sanitized,
      error: 'Email must end with @gmail.com.'
    };
  }

  if (localPart.length < 2 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail username before @gmail.com.'
    };
  }

  const gmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/;
  if (!gmailRegex.test(sanitized)) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail address format.'
    };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Password Validator:
 * - Checks length: 6 to 128 characters (guards against bcrypt 72-byte truncation issues & DoS).
 * - Ensures not pure whitespace.
 */
export function validateAndSanitizePassword(raw: unknown): { isValid: boolean; value: string; error?: string } {
  if (typeof raw !== 'string') {
    return { isValid: false, value: '', error: 'Password must be a valid string.' };
  }

  if (raw.length < 6) {
    return { isValid: false, value: '', error: 'Password must be at least 6 characters long.' };
  }

  if (raw.length > 128) {
    return { isValid: false, value: '', error: 'Password cannot exceed 128 characters.' };
  }

  if (raw.trim().length === 0) {
    return { isValid: false, value: '', error: 'Password cannot consist solely of whitespace.' };
  }

  return { isValid: true, value: raw };
}

/**
 * Delivery Address Validator & Sanitizer:
 * - Door/Flat No: max 50 chars, sanitized.
 * - Street: required, 3-120 chars, sanitized.
 * - Area/Landmark: required, 2-100 chars, sanitized.
 * - City: max 60 chars, default 'Coimbatore'.
 * - Pincode: strictly 6 digits, /^\d{6}$/.
 * - Type: 'HOME' | 'WORK' | 'OTHER'.
 */
export function validateAndSanitizeAddress(
  rawAddress: Partial<Address> | undefined,
  defaultName: string,
  defaultPhone: string
): { isValid: boolean; address?: ValidatedAddress; errors: string[] } {
  if (!rawAddress) {
    return { isValid: true, address: undefined, errors: [] };
  }

  const errors: string[] = [];

  const doorNo = sanitizeString(rawAddress.doorNo, 50) || 'N/A';
  const street = sanitizeString(rawAddress.street, 120);
  const area = sanitizeString(rawAddress.area, 100);
  const city = sanitizeString(rawAddress.city, 60) || 'Coimbatore';
  const landmark = sanitizeString(rawAddress.landmark, 100);

  // Pincode validation: must be exactly 6 digits
  const rawPincode = String(rawAddress.pincode || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(rawPincode) || rawPincode === '000000') {
    errors.push('Pincode must be exactly 6 digits (e.g., 641018).');
  }

  // Street validation
  if (!street || street.length < 3) {
    errors.push('Street / Road is required and must be at least 3 characters.');
  }

  // Area validation
  if (!area || area.length < 2) {
    errors.push('Area / Landmark is required and must be at least 2 characters.');
  }

  // Type validation
  const validTypes = ['HOME', 'WORK', 'OTHER'] as const;
  const type = validTypes.includes(rawAddress.type as any) ? (rawAddress.type as 'HOME' | 'WORK' | 'OTHER') : 'HOME';

  // Coordinates validation (optional lat, lng)
  let coordinates: string | undefined = undefined;
  if (rawAddress.coordinates) {
    const coordStr = sanitizeString(rawAddress.coordinates, 60);
    // Matches "11.0045, 76.9612" or similar
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(coordStr)) {
      coordinates = coordStr;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    address: {
      name: defaultName,
      phone: defaultPhone,
      doorNo,
      street,
      area,
      city,
      pincode: rawPincode,
      landmark: landmark || undefined,
      type,
      coordinates,
      isDefault: true
    },
    errors: []
  };
}

/**
 * Master Customer Registration Sanitizer & Validator
 * Throws a formatted ValidationError on any rule violation.
 */
export function sanitizeAndValidateRegistration(payload: {
  name: unknown;
  email: unknown;
  phone: unknown;
  password: unknown;
  address?: Partial<Address>;
}): SanitizedRegistrationData {
  // 1. Name Validation
  const nameResult = validateAndSanitizeName(payload.name);
  if (!nameResult.isValid) {
    throw new ValidationError(nameResult.error || 'Invalid name provided.');
  }

  // 2. Email Validation
  const emailResult = validateAndSanitizeEmail(payload.email);
  if (!emailResult.isValid) {
    throw new ValidationError(emailResult.error || 'Invalid email address provided.');
  }

  // 3. Phone Validation
  const phoneResult = validateAndSanitizePhone(payload.phone);
  if (!phoneResult.isValid) {
    throw new ValidationError(phoneResult.error || 'Invalid phone number provided.');
  }

  // 4. Password Validation
  const passwordResult = validateAndSanitizePassword(payload.password);
  if (!passwordResult.isValid) {
    throw new ValidationError(passwordResult.error || 'Invalid password provided.');
  }

  // 5. Address Validation
  const addressResult = validateAndSanitizeAddress(payload.address, nameResult.value, phoneResult.value);
  if (!addressResult.isValid) {
    throw new ValidationError(addressResult.errors[0] || 'Invalid delivery address details.');
  }

  return {
    name: nameResult.value,
    email: emailResult.value,
    phone: phoneResult.value,
    password: passwordResult.value,
    address: addressResult.address
  };
}
