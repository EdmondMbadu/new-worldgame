import jsPDF from 'jspdf';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { PolicyBrief } from '../../../functions/src/shared/policy-brief';

const GREEN = '145A4A';
const INK = '203530';
const MUTED = '576862';
const display = (text: string) => text.replace(/\[R(\d+)\]/g, '[$1]')
  .replace(/[\u2010-\u2015]/g, '-').replace(/\u2192/g, ' > ')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
const refs = (ids: string[]) => ids.map((id) => `[${id}]`).join(' ');
const citedFinding = (e: PolicyBrief['evidence'][number]) =>
  `${e.finding} ${refs(e.sourceIds.filter((id) => !e.finding.includes(`[${id}]`)))}`.trim();

/** Selectable text, vector graphics, and native links; no image rasterization or remote assets. */
export function createPolicyBriefPdf(brief: PolicyBrief): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: brief.title, subject: 'Policy brief', author: brief.authors, creator: 'Global Solutions Lab' });
  const margin = 18;
  const width = 174;
  const bottom = 274;
  let y = 20;
  const color = (hex: string) => pdf.setTextColor(`#${hex}`);
  const font = (size: number, bold = false) => { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); };
  const page = () => { pdf.addPage(); y = 20; };
  const ensure = (height: number) => { if (y + height > bottom) page(); };
  const wrap = (text: string, w = width, size = 10.5, bold = false): string[] => {
    font(size, bold);
    return pdf.splitTextToSize(display(text), w) as string[];
  };
  const textHeight = (text: string, size = 10.5, bold = false, gap = 2) =>
    wrap(text, width, size, bold).length * size * 0.42 + gap;
  const linkCitations = (line: string, x: number, baseline: number, size: number) => {
    for (const match of line.matchAll(/\[(\d+)\]/g)) {
      const source = brief.references.find((r) => r.id === `R${match[1]}`);
      if (source) pdf.link(x + pdf.getTextWidth(line.slice(0, match.index)), baseline - size * 0.32,
        pdf.getTextWidth(match[0]), size * 0.42, { url: source.url });
    }
  };
  const paragraph = (text: string, options: { size?: number; bold?: boolean; color?: string; indent?: number; gap?: number; url?: string } = {}) => {
    const size = options.size ?? 10.5;
    const indent = options.indent ?? 0;
    const lines = wrap(text, width - indent, size, options.bold);
    const lineHeight = size * 0.42;
    for (const line of lines) {
      ensure(lineHeight);
      font(size, options.bold); color(options.color || INK);
      pdf.text(line, margin + indent, y);
      linkCitations(line, margin + indent, y, size);
      if (options.url) pdf.link(margin + indent, y - size * 0.32, pdf.getTextWidth(line), lineHeight, { url: options.url });
      y += lineHeight;
    }
    y += options.gap ?? 2;
  };
  const heading = (title: string, followingHeight = 10) => {
    ensure(Math.min(230, 12 + followingHeight)); y += 3;
    paragraph(title, { size: 13, bold: true, color: GREEN, gap: 3 });
  };
  const panel = (label: string, texts: string[]) => {
    const lines = texts.map((text) => wrap(text, width - 12, 10.5));
    const height = 9 + lines.reduce((n, item) => n + item.length * 4.85 + 3, 0);
    if (height > 190) { heading(label); texts.forEach((text) => paragraph(text)); return; }
    ensure(height + 4);
    pdf.setFillColor('#EDF5F1'); pdf.roundedRect(margin, y - 4, width, height, 2, 2, 'F');
    font(9, true); color(GREEN); pdf.text(label.toUpperCase(), margin + 6, y + 3);
    y += 9;
    lines.forEach((item, index) => {
      item.forEach((line) => {
        font(10.5); color(INK); pdf.text(line, margin + 6, y); linkCitations(line, margin + 6, y, 10.5); y += 4.85;
      });
      if (index < lines.length - 1) y += 3;
    });
    y += 7;
  };
  const table = (title: string, headers: string[], rows: string[][], widths: number[]) => {
    const size = 9.5, lineHeight = 4.25, padding = 3;
    const header = () => {
      ensure(13); pdf.setFillColor(`#${GREEN}`); pdf.rect(margin, y - 3.5, width, 10, 'F');
      let x = margin;
      headers.forEach((cell, i) => { font(9, true); color('FFFFFF'); pdf.text(display(cell), x + padding, y + 2); x += widths[i]; });
      y += 10;
    };
    const firstRowHeight = Math.max(...rows[0].map((cell, i) => wrap(cell, widths[i] - 2 * padding, size, i === 0).length)) * lineHeight + 2 * padding;
    heading(title, Math.min(190, firstRowHeight) + 10);
    header();
    rows.forEach((row, rowIndex) => {
      const cells = row.map((cell, i) => wrap(cell, widths[i] - 2 * padding, size, i === 0));
      const count = Math.max(...cells.map((lines) => lines.length));
      let offset = 0;
      while (offset < count) {
        const fullHeight = (count - offset) * lineHeight + 2 * padding;
        if (fullHeight <= 220 && y + fullHeight > bottom) { page(); header(); }
        let fit = Math.floor((bottom - y - 2 * padding) / lineHeight);
        if (fit < 1) { page(); header(); fit = Math.floor((bottom - y - 2 * padding) / lineHeight); }
        const take = Math.min(fit, count - offset);
        const height = take * lineHeight + 2 * padding;
        let x = margin;
        cells.forEach((lines, i) => {
          pdf.setFillColor(rowIndex % 2 ? '#F5F8F6' : '#FFFFFF'); pdf.setDrawColor('#D5E2DB');
          pdf.rect(x, y - 3, widths[i], height, 'FD');
          lines.slice(offset, offset + take).forEach((line, n) => {
            font(size, i === 0); color(INK); const baseline = y + padding + n * lineHeight;
            pdf.text(line, x + padding, baseline); linkCitations(line, x + padding, baseline, size);
          });
          x += widths[i];
        });
        y += height; offset += take;
        if (offset < count) { page(); header(); }
      }
    });
    y += 5;
  };

  font(9, true); color(GREEN); pdf.text('GLOBAL SOLUTIONS LAB  /  POLICY BRIEF', margin, y);
  font(9); color(MUTED); pdf.text(brief.generatedOn, margin + width, y, { align: 'right' });
  y += 10;
  paragraph(brief.title, { size: 24, bold: true, color: GREEN, gap: 1 });
  paragraph(`Prepared by: ${brief.authors}`, { size: 10, bold: true, color: GREEN, gap: 3 });
  paragraph(`For: ${brief.audience}`, { size: 9.5, bold: true, gap: 1 });
  paragraph(`Jurisdiction: ${brief.jurisdiction}`, { size: 9.5, color: MUTED, gap: 4 });
  if (brief.statusNote) paragraph(brief.statusNote, { size: 9.5, color: MUTED, gap: 4 });
  panel('Decision requested', [brief.decision]);
  panel('Key messages', brief.keyMessages.map((m, i) => `${i + 1}. ${m}`));
  heading('Why this decision matters'); paragraph(brief.introduction); paragraph(brief.context);
  const evidenceHeight = (e: PolicyBrief['evidence'][number]) =>
    textHeight(citedFinding(e), 10.5, true, 1) + textHeight(e.implication, 10.5, false, 4);
  heading('Evidence and policy implications', evidenceHeight(brief.evidence[0]));
  brief.evidence.forEach((e) => {
    ensure(evidenceHeight(e));
    paragraph(citedFinding(e), { bold: true, gap: 1 });
    paragraph(e.implication, { color: MUTED, gap: 4 });
  });
  table('Compare the policy options', ['Option and approach', 'Benefits and trade-offs', 'Feasibility'], brief.options.map((o) => [
    `${o.name}\n${o.approach}`, `Benefits: ${o.benefits}\nTrade-offs: ${o.tradeoffs}`, `${o.feasibility}\n${refs(o.sourceIds)}`,
  ]), [48, 76, 50]);
  const actionHeight = (r: PolicyBrief['recommendations'][number], i: number) =>
    textHeight(`${i + 1}. ${r.action}`, 10.5, true, 2) +
    textHeight(`Lead: ${r.lead} | Proposed timing: ${r.timing}`, 9.5, false, 2) +
    textHeight(`Resources: ${r.resources}`, 10, false, 2) +
    textHeight(`Success measure: ${r.measure}`, 10, false, 4);
  heading('Recommended actions', actionHeight(brief.recommendations[0], 0));
  brief.recommendations.forEach((r, i) => {
    ensure(actionHeight(r, i));
    paragraph(`${i + 1}. ${r.action}`, { bold: true, color: GREEN, gap: 2 });
    paragraph(`Lead: ${r.lead} | Proposed timing: ${r.timing}`, { size: 9.5, gap: 2 });
    paragraph(`Resources: ${r.resources}`, { size: 10, gap: 2 });
    paragraph(`Success measure: ${r.measure}`, { size: 10, gap: 4 });
  });
  const labels = brief.pathway.map((text) => wrap(text, 47, 9.5));
  const boxHeight = Math.max(...labels.map((lines) => lines.length)) * 4.3 + 15;
  heading('Proposed pathway to impact', boxHeight + 7);
  labels.forEach((lines, i) => {
    const x = margin + i * 60;
    pdf.setFillColor('#EDF5F1'); pdf.roundedRect(x, y - 3, 54, boxHeight, 2, 2, 'F');
    font(9, true); color(GREEN); pdf.text(`0${i + 1}`, x + 4, y + 3);
    lines.forEach((line, n) => { font(9.5); color(INK); pdf.text(line, x + 4, y + 10 + n * 4.3); });
    if (i < 2) {
      pdf.setDrawColor(`#${GREEN}`); pdf.line(x + 55, y + boxHeight / 2, x + 59, y + boxHeight / 2);
      pdf.line(x + 57.5, y + boxHeight / 2 - 1.5, x + 59, y + boxHeight / 2);
      pdf.line(x + 57.5, y + boxHeight / 2 + 1.5, x + 59, y + boxHeight / 2);
    }
  });
  y += boxHeight + 6;
  heading('Decision and immediate next steps'); paragraph(brief.nextSteps);
  heading('Evidence gaps and conditions'); brief.uncertainties.forEach((u) => paragraph(`- ${u}`, { size: 10 }));
  heading('About the authors', textHeight(brief.aboutAuthors, 9.5)); paragraph(brief.aboutAuthors, { size: 9.5, color: MUTED });
  const referenceHeight = (r: PolicyBrief['references'][number]) =>
    textHeight(`[${r.id}] ${r.title}`, 9, true, 1) + textHeight(r.url, 8.5, false, 3);
  heading('References', referenceHeight(brief.references[0]));
  brief.references.forEach((r) => {
    ensure(referenceHeight(r)); paragraph(`[${r.id}] ${r.title}`, { size: 9, bold: true, gap: 1 });
    paragraph(r.url, { size: 8.5, color: GREEN, url: r.url, gap: 3 });
  });
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i); pdf.setDrawColor('#CCDAD3'); pdf.line(margin, 281, margin + width, 281);
    font(8); color(MUTED); pdf.text(`Global Solutions Lab | Policy Brief | Sources accessed ${brief.generatedOn}`, margin, 287);
    pdf.text(`${i} / ${total}`, margin + width, 287, { align: 'right' });
  }
  return pdf;
}

export const buildPolicyBriefPdf = (brief: PolicyBrief): Blob => createPolicyBriefPdf(brief).output('blob');

/** Editable Word version of exactly the same validated content. */
export function buildPolicyBriefDocx(brief: PolicyBrief): Document {
  const inline = (text: string, bold = false) => display(text).split(/(\[\d+\]|\n)/g).map((part) => {
    if (part === '\n') return new TextRun({ break: 1 });
    const id = part.match(/^\[(\d+)\]$/)?.[1];
    const reference = brief.references.find((r) => r.id === `R${id}`);
    const run = new TextRun({ text: part, bold, ...(reference ? { color: GREEN, underline: {} } : {}) });
    return reference ? new ExternalHyperlink({ link: reference.url, children: [run] }) : run;
  });
  const p = (text: string, bold = false, keepNext = false) => new Paragraph({ children: inline(text, bold), spacing: { after: 100 }, widowControl: true, keepNext });
  const h = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, keepNext: true });
  const cell = (text: string, header = false, width = 3200) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: header ? GREEN : 'F5F8F6' },
    margins: { top: 110, bottom: 110, left: 130, right: 130 },
    children: [new Paragraph({ children: header
      ? [new TextRun({ text, color: 'FFFFFF', bold: true, size: 20 })]
      : inline(text), spacing: { after: 0 }, widowControl: true })],
  });
  const children: Array<Paragraph | Table> = [
    new Paragraph({ text: 'GLOBAL SOLUTIONS LAB / POLICY BRIEF', style: 'Kicker' }),
    new Paragraph({ text: display(brief.title), heading: HeadingLevel.TITLE, keepNext: true }),
    p(`Prepared by: ${brief.authors}`, true, true),
    p(`For: ${brief.audience} | ${brief.generatedOn}`, true), p(`Jurisdiction: ${brief.jurisdiction}`),
    ...(brief.statusNote ? [p(brief.statusNote)] : []),
    h('Decision requested'), p(brief.decision, true),
    h('Key messages'), ...brief.keyMessages.map((m) => new Paragraph({
      children: inline(m), bullet: { level: 0 }, spacing: { after: 100 },
    })),
    h('Why this decision matters'), p(brief.introduction), p(brief.context),
    h('Evidence and policy implications'),
    ...brief.evidence.flatMap((e) => [p(citedFinding(e), true, true), p(e.implication)]),
    h('Compare the policy options'),
    new Table({ width: { size: 9600, type: WidthType.DXA }, columnWidths: [2700, 4200, 2700], rows: [
      new TableRow({ tableHeader: true, children: [cell('Option and approach', true, 2700), cell('Benefits and trade-offs', true, 4200), cell('Feasibility', true, 2700)] }),
      ...brief.options.map((o) => new TableRow({ cantSplit: true, children: [
        cell(`${o.name}\n${o.approach}`, false, 2700),
        cell(`Benefits: ${o.benefits}\nTrade-offs: ${o.tradeoffs}`, false, 4200),
        cell(`${o.feasibility}\n${refs(o.sourceIds)}`, false, 2700),
      ] })),
    ] }),
    h('Recommended actions'),
    ...brief.recommendations.flatMap((r, i) => [
      new Paragraph({ children: inline(`${i + 1}. ${r.action}`, true), keepNext: true, spacing: { before: 120, after: 100 } }),
      p(`Lead: ${r.lead} | Proposed timing: ${r.timing}`, false, true), p(`Resources: ${r.resources}`, false, true), p(`Success measure: ${r.measure}`),
    ]),
    h('Proposed pathway to impact'),
    new Table({ width: { size: 9600, type: WidthType.DXA }, columnWidths: [3200, 3200, 3200], rows: [
      new TableRow({ cantSplit: true, children: brief.pathway.map((label, i) => cell(`0${i + 1}\n${label}`)) }),
    ] }),
    h('Decision and immediate next steps'), p(brief.nextSteps),
    h('Evidence gaps and conditions'), ...brief.uncertainties.map((u) => p(`- ${u}`)),
    h('About the authors'), p(brief.aboutAuthors), h('References'),
    ...brief.references.flatMap((r) => [p(`[${r.id}] ${r.title}`, true, true), new Paragraph({
      children: [new ExternalHyperlink({ link: r.url, children: [new TextRun({ text: r.url, color: GREEN, size: 18, underline: {} })] })],
      spacing: { after: 140 },
    })]),
    p(`Sources accessed ${brief.generatedOn}.`),
  ];
  return new Document({
    title: brief.title, subject: 'Policy Brief', creator: brief.authors,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22, color: INK }, paragraph: { spacing: { line: 276, after: 100 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', run: { size: 44, bold: true, color: GREEN }, paragraph: { spacing: { after: 220 } } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { size: 27, bold: true, color: GREEN }, paragraph: { spacing: { before: 220, after: 120 }, keepNext: true } },
        { id: 'Kicker', name: 'Kicker', basedOn: 'Normal', run: { size: 18, bold: true, color: GREEN }, paragraph: { spacing: { after: 160 }, keepNext: true } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1153, bottom: 1000, left: 1153 } } },
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'Global Solutions Lab / Policy Brief', size: 16, color: MUTED })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D5E2DB' } },
        children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: MUTED })],
      })] }) },
      children,
    }],
  });
}
