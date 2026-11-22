/**
 * Print stylesheet for the resume and Master CV print views. Typography and
 * page-break rules follow the reference layout of `curriculum-ai/styles/print.css`.
 * Plain system fonts and a single column keep the PDF text selectable and ATS friendly.
 */
export function printCss(pageSize: "A4" | "Letter"): string {
  return `
@page { size: ${pageSize}; margin: 16mm 18mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; color: #000; background: #fff; margin: 0 auto; max-width: 48rem; padding: 1rem; text-align: justify; hyphens: auto; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
h1 { font-size: 22pt; font-weight: bold; line-height: 1.15; color: #2c3e50; text-align: center; margin: 0 0 5pt; }
header { margin-bottom: 16pt; }
ul.contact { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0 1.25rem; font-size: 10pt; color: #555555; text-align: center; }
h2 { font-size: 12pt; font-weight: bold; line-height: 1.2; color: #2c3e50; text-align: left; text-transform: uppercase; margin: 14pt 0 5pt; }
h3 { font-size: 12pt; font-weight: bold; line-height: 1.2; color: #000; text-align: left; margin: 12pt 0 0; }
h3 + p { font-style: italic; color: #7f8c8d; text-align: left; margin: 1pt 0 5pt; }
p { margin: 0 0 6pt; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 6pt; padding-left: 28pt; }
ul { list-style: disc; }
ol { list-style: decimal; }
li { margin: 0 0 3pt; }
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4, h5, h6 { break-after: avoid; }
h3 + p { break-before: avoid; break-after: avoid; }
p, li, ul, ol, table, tr, blockquote, pre, img { break-inside: avoid; }
img { max-width: 100%; }
.screen-only { font-family: system-ui, sans-serif; text-align: left; hyphens: manual; }
.banner { padding: 0.75rem 1rem; border: 1px solid #c0392b; background: #fdecea; color: #7b241c; margin-bottom: 1rem; }
@media print {
  .screen-only { display: none !important; }
  body { max-width: none; padding: 0; }
}
`;
}
