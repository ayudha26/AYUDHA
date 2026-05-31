const INDIA_COUNTRY_CODE = '+91';

type SupabaseAuthErrorLike = {
  message?: string;
  status?: number;
  code?: string | number;
};

export function normalizePhoneForOtp(rawPhone?: string) {
  const trimmed = rawPhone?.trim() || '';

  if (!trimmed) {
    throw new Error('Please enter your phone number to continue.');
  }

  const compact = trimmed.replace(/\D/g, '');

  if (!compact) {
    throw new Error('Please enter a valid phone number.');
  }

  if (/^91\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^0\d{10}$/.test(compact)) {
    return `${INDIA_COUNTRY_CODE}${compact.slice(1)}`;
  }

  if (/^\d{10}$/.test(compact)) {
    return `${INDIA_COUNTRY_CODE}${compact}`;
  }

  throw new Error('Enter a valid 10-digit Indian mobile number.');
}

export function sanitizeIndianPhoneInput(rawPhone?: string) {
  const digitsOnly = (rawPhone || '').replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (digitsOnly.startsWith('91') && digitsOnly.length > 10) {
    return digitsOnly.slice(2, 12);
  }

  if (digitsOnly.startsWith('0') && digitsOnly.length > 10) {
    return digitsOnly.slice(1, 11);
  }

  return digitsOnly.slice(0, 10);
}

export function formatIndianPhoneInput(rawPhone?: string) {
  const localDigits = sanitizeIndianPhoneInput(rawPhone);

  if (localDigits.length <= 5) {
    return localDigits;
  }

  return `${localDigits.slice(0, 5)} ${localDigits.slice(5)}`;
}

export function getOtpSendErrorMessage(error: SupabaseAuthErrorLike, phone: string) {
  const rawMessage = error?.message?.trim() || 'Unable to send the OTP right now.';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes('21212') ||
    normalizedMessage.includes("invalid from number") ||
    normalizedMessage.includes('(caller id)')
  ) {
    return 'Twilio rejected the OTP sender. If your Supabase Twilio fields are already correct, check that the Twilio Messaging Service has an SMS-capable sender attached, India SMS geo permissions are enabled, and your trial account has verified the destination phone number.';
  }

  if (
    normalizedMessage.includes('signups not allowed') ||
    normalizedMessage.includes('signup is disabled') ||
    normalizedMessage.includes('phone signup is disabled')
  ) {
    return 'Phone OTP sign-up is disabled in Supabase. In the Supabase dashboard, enable Phone auth and allow new user signups, then try again.';
  }

  if (
    normalizedMessage.includes('phone') &&
    (normalizedMessage.includes('invalid') || normalizedMessage.includes('format'))
  ) {
    return `Supabase rejected ${phone}. Use the full mobile number with country code, for example +91 98765 43210.`;
  }

  if (
    normalizedMessage.includes('provider') ||
    normalizedMessage.includes('twilio') ||
    normalizedMessage.includes('sms') ||
    normalizedMessage.includes('message service')
  ) {
    return `${rawMessage} Check the Supabase SMS provider settings and verify that Twilio is enabled for this project.`;
  }

  if (normalizedMessage.includes('rate limit') || error?.status === 429) {
    return 'Too many OTP requests were made. Please wait a minute and try again.';
  }

  return rawMessage;
}
