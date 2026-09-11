export const validateBDPhone = (phone: string): { isValid: boolean; message?: string } => {
  if (!phone || !phone.trim()) {
    return { isValid: false, message: 'ফোন নম্বর দেওয়া আবশ্যক' };
  }

  const clean = phone.trim().replace(/[\s\-\(\)]/g, '');

  // Bangladeshi phone regex:
  // Starts with 01[3-9] followed by 8 digits (total 11 digits)
  // OR starts with +8801[3-9] or 8801[3-9] followed by 8 digits
  const isBD = /^(?:\+?8801|01)[3-9]\d{8}$/.test(clean);

  if (!isBD) {
    return {
      isValid: false,
      message: 'শুধুমাত্র সঠিক বাংলাদেশী ফোন নম্বর ব্যবহার করুন (যেমন: 01712345678 বা +8801712345678)'
    };
  }

  return { isValid: true };
};

export const sanitizeBDPhoneInput = (val: string): string => {
  // Allow only digits, leading plus sign, spaces, and hyphens
  return val.replace(/[^0-9+\s\-]/g, '');
};
