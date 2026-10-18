function nameFromEmail(email) {
  const localPart = String(email || '').split('@')[0].trim();
  return (localPart || 'Student').slice(0, 150);
}

module.exports = nameFromEmail;