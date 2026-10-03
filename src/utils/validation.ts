/**
 * Client-Side Form Validation & Real-Time Input Sanitization
 *
 * Provides real-time keystroke sanitizers and strict form validators for
 * customer, owner, staff, and delivery partner profile screens.
 */

/**
 * Real-time phone keystroke sanitizer:
 * - Only allows numeric digits (0-9).
 * - Strictly caps length to exactly 10 digits.
 */
export function sanitizeTypingPhone(input: string): string {
  if (!input) return '';
  return input.replace(/\D/g, '').slice(0, 10);
}

/**
 * Real-time pincode keystroke sanitizer:
 * - Allows digits only, max 6 digits.
 */
export function sanitizeTypingPincode(input: string): string {
  if (!input) return '';
  return input.replace(/\D/g, '').slice(0, 6);
}

/**
 * Real-time name input sanitizer:
 * - Disallows hyphen symbol (-) and special characters.
 * - Limits length to 70 chars.
 */
export function sanitizeTypingName(input: string): string {
  if (!input) return '';
  return input.replace(/[-]/g, '').slice(0, 70);
}

/**
 * Strict Full Name Validator:
 * - Min 2 chars, max 70 chars.
 * - Allows alphabetic letters and spaces (NO hyphens allowed).
 * - Disallows numbers, hyphens (-), HTML, or symbols.
 */
export function validateName(raw: string): { isValid: boolean; value: string; error?: string } {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length < 2) {
    return {
      isValid: false,
      value: trimmed,
      error: 'Full name is required and must be at least 2 characters.'
    };
  }

  if (trimmed.includes('-')) {
    return {
      isValid: false,
      value: trimmed,
      error: 'Full name cannot contain hyphens (-). Please use letters and spaces only.'
    };
  }

  if (trimmed.length > 70) {
    return {
      isValid: false,
      value: trimmed.slice(0, 70),
      error: 'Full name cannot exceed 70 characters.'
    };
  }

  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s.']+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      value: trimmed,
      error: 'Name may only contain alphabetic letters, spaces, and dots.'
    };
  }

  // Convert to Title Case
  const formatted = trimmed
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return { isValid: true, value: formatted };
}

/**
 * Strict Phone Validator:
 * - Enforces exactly 10 digits starting with 6, 7, 8, or 9.
 * - Rejects non-digits and letters.
 * - Rejects bogus repeating sequences (e.g., 0000000000).
 */
export function validatePhone(raw: string): { isValid: boolean; value: string; digits: string; error?: string } {
  if (!raw || !raw.trim()) {
    return { isValid: false, value: '', digits: '', error: 'Phone number is required.' };
  }

  const rawStr = raw.trim();

  // Reject letters explicitly
  if (/[a-zA-Z]/.test(rawStr)) {
    return {
      isValid: false,
      value: rawStr,
      digits: '',
      error: 'Phone number cannot contain letters. Please enter 10 digits only.'
    };
  }

  let digits = rawStr.replace(/\D/g, '');

  // Strip 91 prefix if user typed 12-digit Indian number
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      value: digits,
      digits,
      error: `Phone number must be exactly 10 digits (entered ${digits.length} digits).`
    };
  }

  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        isValid: false,
        value: digits,
        digits,
        error: 'Mobile number must be 10 digits starting with 6, 7, 8, or 9.'
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

    return { isValid: true, value: `+91 ${digits}`, digits };
  }

  return {
    isValid: false,
    value: digits,
    digits,
    error: 'Phone number must be a valid 10-digit mobile number (e.g. 9876543210).'
  };
}

/**
 * Strict Gmail Validator:
 * - Must end in @gmail.com
 * - Enforces valid Gmail username rules
 */
export function validateEmail(raw: string): { isValid: boolean; value: string; error?: string } {
  const sanitized = (raw || '').trim().toLowerCase();
  if (!sanitized) {
    return { isValid: false, value: '', error: 'Gmail address is required.' };
  }

  if (!sanitized.endsWith('@gmail.com')) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Email must be a valid Gmail address ending with @gmail.com (e.g. name@gmail.com)'
    };
  }

  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail address ending with @gmail.com'
    };
  }

  const [localPart, domain] = parts;
  if (domain !== 'gmail.com') {
    return {
      isValid: false,
      value: sanitized,
      error: 'Email must end with @gmail.com'
    };
  }

  if (localPart.length < 2 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail username before @gmail.com'
    };
  }

  const gmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/;
  if (!gmailRegex.test(sanitized)) {
    return {
      isValid: false,
      value: sanitized,
      error: 'Please enter a valid Gmail address (e.g. name@gmail.com)'
    };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Address Details Validator:
 */
export function validateAddressDetails(addr: {
  street: string;
  area: string;
  pincode?: string;
  doorNo?: string;
}): { isValid: boolean; error?: string } {
  const street = (addr.street || '').trim();
  const area = (addr.area || '').trim();
  const pincode = (addr.pincode || '').replace(/\D/g, '');

  if (!street || street.length < 3) {
    return { isValid: false, error: 'Street / Road name is required (min 3 characters).' };
  }

  if (!area || area.length < 2) {
    return { isValid: false, error: 'Area / Landmark is required (min 2 characters).' };
  }

  if (pincode && (!/^\d{6}$/.test(pincode) || pincode === '000000')) {
    return { isValid: false, error: 'Pincode must be exactly 6 digits (e.g., 641018).' };
  }

  return { isValid: true };
}

/**
 * Password Validator:
 */
export function validatePassword(password: string, confirmPassword?: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: true };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters.' };
  }

  if (password.trim().length === 0) {
    return { isValid: false, error: 'Password cannot consist solely of spaces.' };
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match. Please verify your confirm password.' };
  }

  return { isValid: true };
}
