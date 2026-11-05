const { splitCsvRows, reportSections, SUPPORTED_FORMATS, MIME_TYPES } = require('./reports.format');

describe('Report export formats', () => {
  test('supports CSV, PDF, and DOCX only', () => {
    expect(SUPPORTED_FORMATS).toEqual(['csv', 'pdf', 'docx']);
    expect(MIME_TYPES.pdf).toBe('application/pdf');
    expect(MIME_TYPES.docx).toContain('wordprocessingml.document');
  });

  test('parses quoted commas, double quotes and multiline feedback without altering data', () => {
    const rows = splitCsvRows('"Name","Notes"\n"A, B","He said ""yes""\nand left"\n');
    expect(rows).toEqual([['Name', 'Notes'], ['A, B', 'He said "yes"\nand left']]);
  });

  test('creates student sections from existing CSV payload', () => {
    const csv = '"Student","Email"\n"Test Student","test@example.com"\n\nAttendance records\nattendance_date,status\n"2026-11-05","present"\n\nFeedback\ncontent,flagged_concern\n"Well done",false';
    const sections = reportSections(csv, 'student');
    expect(sections.map((section) => section.title)).toEqual(['Student overview', 'Attendance records', 'Feedback']);
    expect(sections[1].rows[0]).toEqual(['2026-11-05', 'present']);
  });
});
