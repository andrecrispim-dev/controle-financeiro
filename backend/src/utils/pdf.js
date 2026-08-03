function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildPage(lines) {
  const content = ['BT', '/F1 10 Tf', '50 790 Td', '14 TL'];
  lines.forEach((line) => {
    content.push(`(${escapePdfText(line).slice(0, 115)}) Tj`, 'T*');
  });
  content.push('ET');
  return content.join('\n');
}

export function createTextPdf(lines) {
  const pageSize = 48;
  const pages = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(buildPage(lines.slice(index, index + pageSize)));
  }

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(page, 'latin1')} >>\nstream\n${page}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
