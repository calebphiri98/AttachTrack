const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle } = require('docx');

const SUPPORTED_FORMATS = Object.freeze(['csv', 'pdf', 'docx']);

const MIME_TYPES = Object.freeze({
  csv: 'text/csv; charset=utf-8',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

function splitCsvRows(csv) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  const input = String(csv || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      if (char === '\r' && input[i + 1] === '\n') i += 1;
    } else {
      value += char;
    }
  }
  if (row.length || value.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function reportSections(csv, kind) {
  const rows = splitCsvRows(csv);
  if (kind === 'cohort') {
    return [{ title: 'Student cohort', headers: rows[0] || [], rows: rows.slice(1).filter((row) => row.some(Boolean)) }];
  }

  const sections = [{ title: 'Student overview', headers: rows[0] || [], rows: rows[1] ? [rows[1]] : [] }];
  let index = 2;
  while (index < rows.length) {
    if (!rows[index].some(Boolean)) {
      index += 1;
      continue;
    }
    const title = String(rows[index][0] || '').trim();
    index += 1;
    if (!title || index >= rows.length) break;
    const headers = rows[index];
    index += 1;
    const body = [];
    while (index < rows.length && rows[index].some(Boolean)) {
      body.push(rows[index]);
      index += 1;
    }
    sections.push({ title, headers, rows: body });
  }
  return sections;
}

function shorten(value, maxLength = 1600) {
  const text = value === null || value === undefined ? '' : String(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function createPdf(sections, kind) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: kind === 'cohort' ? 'landscape' : 'portrait', margin: 43, bufferPages: true, info: { Title: `AttachTrack ${kind} report`, Author: 'AttachTrack' } });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    const pageWidth = doc.page.width - 86;
    const dark = '#20324C';
    const blue = '#147AC1';
    const muted = '#596779';
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(11).text('MUBAS  /  ATTACHTRACK', { continued: false });
    doc.moveDown(0.5);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(19).text(kind === 'cohort' ? 'Student cohort report' : 'Student attachment report');
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1);

    for (const section of sections) {
      if (doc.y > doc.page.height - 100) doc.addPage();
      doc.fillColor(blue).font('Helvetica-Bold').fontSize(13).text(shorten(section.title, 120));
      doc.moveDown(0.3);
      const headers = section.headers || [];
      const rows = section.rows || [];
      if (!headers.length) continue;

      if (kind === 'cohort') {
        rows.forEach((row, i) => {
          if (doc.y > doc.page.height - 115) doc.addPage();
          doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text(`Student ${i + 1}: ${shorten(row[0] || '', 90)}`);
          headers.forEach((header, j) => {
            const label = shorten(header, 80);
            const value = shorten(row[j], 500);
            doc.font('Helvetica-Bold').fillColor(muted).fontSize(8.5).text(`${label}: `, { continued: true });
            doc.font('Helvetica').fillColor(dark).text(value || '-');
          });
          doc.moveDown(0.65);
        });
      } else if (section.title === 'Student overview') {
        headers.forEach((header, i) => {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text(`${shorten(header, 90)}: `, { continued: true });
          doc.font('Helvetica').fillColor(dark).text(shorten(rows[0]?.[i], 400) || '-');
        });
      } else {
        if (!rows.length) {
          doc.font('Helvetica').fontSize(9).fillColor(muted).text('No records');
        }
        rows.forEach((row, rowIndex) => {
          if (doc.y > doc.page.height - 100) doc.addPage();
          doc.fillColor(dark).font('Helvetica-Bold').fontSize(9).text(`Record ${rowIndex + 1}`);
          headers.forEach((header, j) => {
            doc.font('Helvetica-Bold').fillColor(muted).fontSize(8.5).text(`${shorten(header, 80)}: `, { continued: true });
            doc.font('Helvetica').fillColor(dark).text(shorten(row[j], 500) || '-');
          });
          doc.moveDown(0.45);
        });
      }
      doc.moveDown(0.75);
      doc.moveTo(43, doc.y).lineTo(43 + pageWidth, doc.y).strokeColor('#DAE3EE').stroke();
      doc.moveDown(0.5);
    }
    const pageCount = doc.bufferedPageRange().count;
    for (let page = 0; page < pageCount; page += 1) {
      doc.switchToPage(page);
      const bottom = doc.page.height - 28;
      doc.font('Helvetica').fontSize(8).fillColor(muted).text(`AttachTrack  |  ${page + 1} / ${pageCount}`, 43, bottom, { width: pageWidth, align: 'right' });
    }
    doc.end();
  });
}

const cellBorders = { top: { style: BorderStyle.SINGLE, color: 'DDE6F0', size: 1 }, bottom: { style: BorderStyle.SINGLE, color: 'DDE6F0', size: 1 }, left: { style: BorderStyle.SINGLE, color: 'DDE6F0', size: 1 }, right: { style: BorderStyle.SINGLE, color: 'DDE6F0', size: 1 } };

function cell(value, bold = false) {
  return new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: shorten(value, 3000), bold, size: 18 })] })] });
}

async function createDocx(sections, kind) {
  const children = [
    new Paragraph({ text: 'MUBAS  /  ATTACHTRACK', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: kind === 'cohort' ? 'Student cohort report' : 'Student attachment report', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Generated: ${new Date().toISOString().slice(0, 10)}` }),
  ];

  for (const section of sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 } }));
    if (!section.headers.length) continue;
    if (kind === 'cohort') {
      for (let rowIndex = 0; rowIndex < section.rows.length; rowIndex += 1) {
        const row = section.rows[rowIndex];
        children.push(new Paragraph({ text: `Student ${rowIndex + 1}: ${shorten(row[0] || '', 90)}`, heading: HeadingLevel.HEADING_3 }));
        children.push(new Table({
          rows: section.headers.map((header, index) => new TableRow({ children: [cell(header, true), cell(row[index] || '')] })),
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
      }
      if (!section.rows.length) children.push(new Paragraph('No records'));
      continue;
    }
    const tableRows = [new TableRow({ children: section.headers.map((header) => cell(header, true)), tableHeader: true })];
    for (const row of section.rows) {
      tableRows.push(new TableRow({ children: section.headers.map((_, i) => cell(row[i] || '')) }));
    }
    if (tableRows.length === 1) {
      tableRows.push(new TableRow({ children: section.headers.map(() => cell('No records')) }));
    }
    children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}

async function renderReport(csv, kind, format) {
  if (!SUPPORTED_FORMATS.includes(format)) throw new Error('Unsupported report format');
  if (format === 'csv') return csv;
  const sections = reportSections(csv, kind);
  if (format === 'pdf') return createPdf(sections, kind);
  return createDocx(sections, kind);
}

module.exports = { SUPPORTED_FORMATS, MIME_TYPES, splitCsvRows, reportSections, renderReport };
