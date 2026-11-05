export function downloadReport(blob, fileName, format) {
  if (!(blob instanceof Blob)) throw new Error('Export returned an invalid file');
  const safeName = String(fileName || 'report').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 90) || 'report';
  const safeFormat = ['csv', 'pdf', 'docx'].includes(format) ? format : 'csv';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.${safeFormat}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
