function maskWithEdges(value: string, startChars: number, endChars: number) {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized) return "";

  if (normalized.length <= startChars + endChars) {
    return "*".repeat(normalized.length);
  }

  const prefix = normalized.slice(0, startChars);
  const suffix = normalized.slice(normalized.length - endChars);
  const hidden = "*".repeat(Math.max(1, normalized.length - startChars - endChars));
  return `${prefix}${hidden}${suffix}`;
}

export function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.trim();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0) return "***";

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!domain) return "***";

  return `${maskWithEdges(local, 1, 1)}@${domain}`;
}

export function maskContact(contact: string | null | undefined) {
  if (!contact) return null;
  const digits = contact.replace(/\D/g, "");
  if (!digits) return "**";
  if (digits.length <= 2) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 2)}${digits.slice(-2)}`;
}

export function maskIdNumber(idNumber: string | null | undefined) {
  if (!idNumber) return null;
  return maskWithEdges(idNumber.trim(), 2, 2);
}
