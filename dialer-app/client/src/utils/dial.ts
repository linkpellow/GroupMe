export function dialPhone(phoneDigits: string) {
  // Sanitize to digits only
  const digits = phoneDigits.replace(/[^\d+]/g, '');
  if (!digits) return;

  // Create a temporary anchor element and trigger click synchronously.
  const anchor = document.createElement('a');
  anchor.href = `tel:${digits}`;
  // `rel` for security (though not needed for tel: but prevents linter warnings)
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
} 