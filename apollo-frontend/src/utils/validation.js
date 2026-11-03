// Shared form validation rules. Keep in sync with the backend
// com.apollo.elevator.common.validation.IndianFormats.

export const PATTERNS = {
  mobile: /^[6-9]\d{9}$/,
  pincode: /^[1-9]\d{5}$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  name: /^[\p{L} .'&()/,-]+$/u,
  hsn: /^\d{4,8}$/,
  invoiceDate: /^\d{2}\/\d{2}\/\d{4}$/,
};

// HTML `pattern` attributes (compiled with the `v` flag, so `/ ( ) -` are escaped inside classes).
export const HTML_PATTERNS = {
  mobile: "[6-9][0-9]{9}",
  pincode: "[1-9][0-9]{5}",
  email: "[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}",
  name: "[\\p{L} .'&\\(\\)\\/,\\-]+",
};

export const HINTS = {
  mobile: "10 digits, starting with 6, 7, 8 or 9",
  pincode: "6-digit Indian pincode",
  email: "e.g. name@example.com",
  gstin: "15 characters, e.g. 29ABCDE1234F1Z5",
  pan: "10 characters, e.g. ABCDE1234F",
  name: "Letters, spaces and . ' & ( ) / , - only",
};

const blank = (v) => v == null || String(v).trim() === "";

/** Strips spaces/dashes and an optional +91 / 91 / 0 prefix. */
export function normalizeMobile(value) {
  if (blank(value)) return "";
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export const normalizePincode = (value) => (blank(value) ? "" : String(value).replace(/\s/g, ""));
export const upper = (value) => (blank(value) ? "" : String(value).trim().toUpperCase());

/* Each validator returns an error message, or "" when valid. Pass {required:true} to reject blanks. */

export function validateMobile(value, { required = false, label = "Mobile number" } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  return PATTERNS.mobile.test(normalizeMobile(value)) ? "" : `${label} must be ${HINTS.mobile}`;
}

export function validatePincode(value, { required = false, label = "Pincode" } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  return PATTERNS.pincode.test(normalizePincode(value)) ? "" : `${label} must be a valid ${HINTS.pincode}`;
}

export function validateEmail(value, { required = false, label = "Email" } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  const v = String(value).trim();
  return v.length <= 150 && PATTERNS.email.test(v) ? "" : `${label} must be a valid email address`;
}

export function validateGstin(value, { required = false, label = "GSTIN" } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  return PATTERNS.gstin.test(upper(value)) ? "" : `${label} must be ${HINTS.gstin}`;
}

export function validatePan(value, { required = false, label = "PAN" } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  return PATTERNS.pan.test(upper(value)) ? "" : `${label} must be ${HINTS.pan}`;
}

export function validateAddress(value, { required = false, label = "Address", min = 5, max = 500 } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  const v = String(value).trim();
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > max) return `${label} must not exceed ${max} characters`;
  if (!/[\p{L}\d]/u.test(v)) return `${label} must contain letters or numbers`;
  return "";
}

export function validateName(value, { required = false, label = "Name", max = 100, strict = true } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  const v = String(value).trim();
  if (v.length < 2) return `${label} must be at least 2 characters`;
  if (v.length > max) return `${label} must not exceed ${max} characters`;
  if (strict && !PATTERNS.name.test(v)) return `${label}: ${HINTS.name}`;
  return "";
}

export function validateRequired(value, label) {
  return blank(value) ? `${label} is required` : "";
}

export function validateAmount(value, { required = false, label = "Amount", min = 0, allowZero = true, max } = {}) {
  if (blank(value)) return required ? `${label} is required` : "";
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (n < min || (!allowZero && n === 0)) return `${label} must be greater than ${allowZero ? "or equal to " : ""}${min}`;
  if (max != null && n > max) return `${label} must not exceed ${max}`;
  return "";
}

/** `end` must be on/after `start` (both yyyy-MM-dd strings). */
export function validateDateRange(start, end, { label = "End date", startLabel = "start date" } = {}) {
  if (blank(start) || blank(end)) return "";
  return end >= start ? "" : `${label} must be on or after the ${startLabel}`;
}

export function validateNotFuture(value, label = "Date") {
  if (blank(value)) return "";
  const today = new Date().toISOString().slice(0, 10);
  return value <= today ? "" : `${label} cannot be in the future`;
}

/** Drops empty messages from an object of {field: message}. */
export function collectErrors(map) {
  return Object.fromEntries(Object.entries(map).filter(([, msg]) => msg));
}
