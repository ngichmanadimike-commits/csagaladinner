/**
 * Public-facing masking for personal data shown on the lookup page.
 * Admins always see the unmasked value.
 */
export const maskName = (full?: string | null): string => {
  if (!full) return "—";
  return full
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 2) return part[0] + "*";
      return part[0] + "*".repeat(Math.max(1, part.length - 2)) + part[part.length - 1];
    })
    .join(" ");
};

export const maskEmail = (email?: string | null): string => {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const masked = "*".repeat(Math.max(2, local.length - 2));
  const [domName, ...tldParts] = domain.split(".");
  const domVisible = domName.slice(0, 1) + "*".repeat(Math.max(2, domName.length - 1));
  return `${visible}${masked}@${domVisible}.${tldParts.join(".")}`;
};

export const maskPhone = (phone?: string | null): string => {
  if (!phone) return "—";
  if (phone.length <= 4) return "*".repeat(phone.length);
  return phone.slice(0, 3) + "*".repeat(phone.length - 6) + phone.slice(-3);
};

/**
 * Mask a long secure ticket token for partial-payment users.
 * Shows first 4 + last 4 chars with stars in between.
 */
export const maskTicketToken = (token?: string | null): string => {
  if (!token) return "—";
  if (token.length <= 8) return "•".repeat(token.length);
  return token.slice(0, 4) + "•".repeat(16) + token.slice(-4);
};
