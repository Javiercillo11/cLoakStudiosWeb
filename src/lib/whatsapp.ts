// Enlace de WhatsApp «click to chat»: https://wa.me/<número>?text=<mensaje>

/** Deja solo los dígitos del número (con prefijo de país, sin «+»). Null si no queda un número válido. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** URL de WhatsApp con el mensaje inicial codificado, o null si no hay número. */
export function whatsappUrl(phone: string | null | undefined, message = ''): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  const text = message.trim();
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
