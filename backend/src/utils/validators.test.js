const {
  requireString,
  requireEmail,
  requirePassword,
  requireUuid,
  requireDate,
  optionalString,
} = require('./validators');

describe('requireString', () => {
  test('accepts a normal string and trims it', () => {
    expect(requireString('  hello  ', 'name')).toBe('hello');
  });

  test('rejects an empty string', () => {
    expect(() => requireString('', 'name')).toThrow('name is required');
  });

  test('rejects a string shorter than min', () => {
    expect(() => requireString('a', 'name', { min: 2 })).toThrow('name is required');
  });

  test('rejects a string longer than max', () => {
    expect(() => requireString('a'.repeat(200), 'name', { max: 150 })).toThrow(
      'name must be 150 characters or fewer'
    );
  });

  test('rejects non-string values', () => {
    expect(() => requireString(123, 'name')).toThrow('name is required');
    expect(() => requireString(null, 'name')).toThrow('name is required');
    expect(() => requireString(undefined, 'name')).toThrow('name is required');
  });
});

describe('requireEmail', () => {
  test('accepts a valid email and lowercases it', () => {
    expect(requireEmail('Alice@Example.com')).toBe('alice@example.com');
  });

  test('trims whitespace', () => {
    expect(requireEmail('  bob@example.com  ')).toBe('bob@example.com');
  });

  test('rejects a string with no @', () => {
    expect(() => requireEmail('notanemail')).toThrow('Please provide a valid email address');
  });

  test('rejects a string with no domain', () => {
    expect(() => requireEmail('alice@')).toThrow('Please provide a valid email address');
  });

  test('rejects an empty string', () => {
    expect(() => requireEmail('')).toThrow('email is required');
  });
});

describe('requirePassword', () => {
  test('accepts a password of valid length', () => {
    expect(requirePassword('password123')).toBe('password123');
  });

  test('rejects a password shorter than 8 characters', () => {
    expect(() => requirePassword('short')).toThrow('Password must be at least 8 characters');
  });

  test('rejects a password longer than 128 characters', () => {
    expect(() => requirePassword('a'.repeat(129))).toThrow(
      'Password must be 128 characters or fewer'
    );
  });

  test('rejects a non-string value', () => {
    expect(() => requirePassword(12345678)).toThrow('password is required');
  });
});

describe('requireUuid', () => {
  test('accepts a valid UUID', () => {
    const validUuid = '942cda2e-3641-4b2b-9052-deb27b9f5505';
    expect(requireUuid(validUuid)).toBe(validUuid);
  });

  test('rejects a malformed UUID', () => {
    expect(() => requireUuid('not-a-real-id')).toThrow('Invalid id');
  });

  test('rejects an empty string', () => {
    expect(() => requireUuid('')).toThrow('Invalid id');
  });

  test('uses the custom field name in the error message', () => {
    expect(() => requireUuid('bad', 'studentId')).toThrow('Invalid studentId');
  });
});

describe('requireDate', () => {
  test('accepts a valid ISO date string', () => {
    expect(requireDate('2026-07-22', 'weekStartDate')).toBe('2026-07-22');
  });

  test('rejects an invalid date string', () => {
    expect(() => requireDate('not-a-date', 'weekStartDate')).toThrow(
      'weekStartDate must be a valid date'
    );
  });

  test('rejects a non-string value', () => {
    expect(() => requireDate(12345, 'weekStartDate')).toThrow(
      'weekStartDate must be a valid date'
    );
  });
});

describe('optionalString', () => {
  test('returns null for undefined', () => {
    expect(optionalString(undefined)).toBeNull();
  });

  test('returns null for null', () => {
    expect(optionalString(null)).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(optionalString('')).toBeNull();
  });

  test('trims and returns a valid string', () => {
    expect(optionalString('  notes here  ')).toBe('notes here');
  });

  test('rejects a string longer than max', () => {
    expect(() => optionalString('a'.repeat(3000), { max: 2000 })).toThrow(
      'Text must be 2000 characters or fewer'
    );
  });
});