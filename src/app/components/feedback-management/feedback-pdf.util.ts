import jsPDF from 'jspdf';

export type FeedbackPdfCategory = 'email_feedback' | 'ask_feedback';

export interface FeedbackPdfRecord {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAtMs: number;
  feedbackCategory: FeedbackPdfCategory;
  opinion?: string;
  levels?: string[];
  levelsDetails?: {
    hsCourses?: string;
    collegeCourses?: string;
    professionalAreas?: string;
    otherText?: string;
  };
  improvements?: string;
  askBuckyUseful?: string;
  concerns?: string;
  resourcesUsed?: string[];
  resourcesOther?: string;
  videoChatUse?: string;
  avatarUse?: string;
  otherAgents?: string;
  prompts?: string;
  courseUse?: string;
  teamBuilding?: string;
  enoughTime?: string;
  additionalCapabilities?: string;
  more?: string;
  howDoing?: string;
  solutionName?: string;
  whatToAdd?: string;
  whichSolution?: string;
  emailFeedback?: string;
}

export interface FeedbackPdfOptions {
  generatedAt?: Date;
  reportTitle?: string;
}

interface PdfSection {
  label: string;
  value: string;
}

const COLORS = {
  ink: [15, 23, 42] as const,
  body: [51, 65, 85] as const,
  muted: [100, 116, 139] as const,
  line: [226, 232, 240] as const,
  soft: [241, 245, 249] as const,
  teal: [15, 118, 110] as const,
  tealDark: [17, 94, 89] as const,
  white: [255, 255, 255] as const,
};

const PAGE_MARGIN = 18;
const PAGE_BOTTOM = 278;
const CONTENT_WIDTH = 174;

function cleanText(value: unknown, fallback = 'Not provided'): string {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ')
    .trim();
  return text || fallback;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Not available';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function feedbackTypeLabel(record: FeedbackPdfRecord): string {
  return record.feedbackCategory === 'email_feedback'
    ? 'Weekly Brief Email Feedback'
    : 'Global Solutions Lab Feedback';
}

function buckyLabel(value?: string): string {
  const labels: Record<string, string> = {
    yes: 'Yes',
    somewhat: 'Somewhat',
    no: 'No',
    not_sure: 'Not sure',
  };
  return value ? labels[value] || cleanText(value) : 'Not provided';
}

function sectionsFor(record: FeedbackPdfRecord): PdfSection[] {
  if (record.feedbackCategory === 'email_feedback') {
    return [
      { label: 'How well are we doing?', value: cleanText(record.howDoing) },
      { label: 'Solution mentioned in the brief', value: cleanText(record.solutionName) },
      { label: 'What should we add?', value: cleanText(record.whatToAdd) },
      {
        label: 'Which solution or support should be featured next?',
        value: cleanText(record.whichSolution),
      },
      { label: 'Additional feedback', value: cleanText(record.emailFeedback) },
    ];
  }

  const sections: PdfSection[] = [
    {
      label: 'A. What do you think of Global Solutions Lab?',
      value: cleanText(record.opinion),
    },
  ];

  const legacyLevels = [
    record.levels?.length ? `Levels: ${record.levels.join(', ')}` : '',
    record.levelsDetails?.hsCourses
      ? `High school courses: ${record.levelsDetails.hsCourses}`
      : '',
    record.levelsDetails?.collegeCourses
      ? `College courses: ${record.levelsDetails.collegeCourses}`
      : '',
    record.levelsDetails?.professionalAreas
      ? `Professional areas: ${record.levelsDetails.professionalAreas}`
      : '',
    record.levelsDetails?.otherText ? `Other: ${record.levelsDetails.otherText}` : '',
  ].filter(Boolean);

  if (legacyLevels.length) {
    sections.push({
      label: 'Legacy educational levels and details',
      value: cleanText(legacyLevels.join('\n')),
    });
  }

  sections.push(
    { label: 'B. Improvements', value: cleanText(record.improvements) },
    { label: 'C. Was Ask Bucky useful?', value: buckyLabel(record.askBuckyUseful) },
    { label: 'D. Problems or concerns', value: cleanText(record.concerns) },
    {
      label: 'D. Global Solutions Lab resources used',
      value: cleanText(record.resourcesUsed?.join(', ')),
    },
    { label: 'D. Other resource notes', value: cleanText(record.resourcesOther) },
    { label: 'D. Team video chat room', value: cleanText(record.videoChatUse) },
    {
      label: 'E. AI avatars used',
      value: cleanText(record.avatarUse || record.otherAgents),
    },
    { label: 'F. Prompts used or created', value: cleanText(record.prompts) }
  );

  if (record.courseUse) {
    sections.push({
      label: 'Legacy course usefulness',
      value: cleanText(record.courseUse),
    });
  }

  sections.push(
    { label: 'G. Team building and functioning', value: cleanText(record.teamBuilding) },
    { label: 'H. Was there enough time?', value: cleanText(record.enoughTime) },
    {
      label: 'H. Additional capabilities or functions',
      value: cleanText(record.additionalCapabilities),
    },
    { label: 'H. Anything else', value: cleanText(record.more) }
  );

  return sections;
}

function setTextColor(pdf: jsPDF, color: readonly [number, number, number]): void {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(pdf: jsPDF, color: readonly [number, number, number]): void {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(pdf: jsPDF, color: readonly [number, number, number]): void {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

export function buildFeedbackPdf(
  records: FeedbackPdfRecord[],
  options: FeedbackPdfOptions = {}
): jsPDF {
  const generatedAt = options.generatedAt || new Date();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = PAGE_MARGIN;
  let currentRecord = '';
  let currentSection = '';

  pdf.setProperties({
    title: options.reportTitle || 'Global Solutions Lab Feedback',
    subject: `${records.length} feedback submission${records.length === 1 ? '' : 's'}`,
    author: 'Global Solutions Lab',
    creator: 'Global Solutions Lab Feedback Management',
  });

  const drawContinuationHeader = (): void => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setTextColor(pdf, COLORS.tealDark);
    pdf.text('GLOBAL SOLUTIONS LAB', PAGE_MARGIN, 12);
    pdf.setFont('helvetica', 'normal');
    setTextColor(pdf, COLORS.muted);
    pdf.text(`${currentRecord}${currentSection ? ` - ${currentSection} (continued)` : ''}`, 192, 12, {
      align: 'right',
      maxWidth: 112,
    });
    setDrawColor(pdf, COLORS.line);
    pdf.line(PAGE_MARGIN, 15, 192, 15);
    y = 22;
  };

  const addPage = (): void => {
    pdf.addPage();
    drawContinuationHeader();
  };

  const ensureSpace = (neededHeight: number): void => {
    if (y + neededHeight > PAGE_BOTTOM) addPage();
  };

  const drawReportHeader = (): void => {
    setFillColor(pdf, COLORS.tealDark);
    pdf.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 34, 3, 3, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    setTextColor(pdf, [204, 251, 241]);
    pdf.text('GLOBAL SOLUTIONS LAB', PAGE_MARGIN + 7, y + 9);

    pdf.setFontSize(20);
    setTextColor(pdf, COLORS.white);
    pdf.text(options.reportTitle || 'Feedback Report', PAGE_MARGIN + 7, y + 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      `${records.length} submission${records.length === 1 ? '' : 's'}  |  Generated ${generatedAt.toLocaleString()}`,
      PAGE_MARGIN + 7,
      y + 28
    );
    y += 43;
  };

  const drawMetadata = (record: FeedbackPdfRecord): void => {
    const metadata = [
      ['Submitted by', cleanText(record.name, 'Name not provided')],
      ['Email', cleanText(record.email)],
      ['Submitted', formatDate(record.createdAtMs)],
      ['Type', feedbackTypeLabel(record)],
      ['Status', cleanText(record.status).toUpperCase()],
      ['Record ID', cleanText(record.id)],
    ];
    const columnWidth = 82;
    const leftX = PAGE_MARGIN + 5;
    const rightX = PAGE_MARGIN + 92;
    const rowHeights: number[] = [];

    for (let index = 0; index < metadata.length; index += 2) {
      const leftLines = pdf.splitTextToSize(metadata[index][1], columnWidth - 3) as string[];
      const rightLines = pdf.splitTextToSize(metadata[index + 1][1], columnWidth - 3) as string[];
      rowHeights.push(Math.max(leftLines.length, rightLines.length) * 4.2 + 8);
    }

    const boxHeight = rowHeights.reduce((total, height) => total + height, 0) + 4;
    ensureSpace(boxHeight + 5);
    setFillColor(pdf, COLORS.soft);
    pdf.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 2.5, 2.5, 'F');
    let metadataY = y + 7;

    for (let index = 0; index < metadata.length; index += 2) {
      const rowHeight = rowHeights[index / 2];
      [metadata[index], metadata[index + 1]].forEach((entry, column) => {
        const x = column === 0 ? leftX : rightX;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        setTextColor(pdf, COLORS.muted);
        pdf.text(entry[0].toUpperCase(), x, metadataY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.2);
        setTextColor(pdf, COLORS.ink);
        const lines = pdf.splitTextToSize(entry[1], columnWidth - 3) as string[];
        pdf.text(lines, x, metadataY + 4.8);
      });
      metadataY += rowHeight;
    }
    y += boxHeight + 7;
  };

  const drawRecordHeading = (record: FeedbackPdfRecord, index: number): void => {
    currentRecord = `Feedback ${String(index + 1).padStart(2, '0')}`;
    currentSection = '';
    ensureSpace(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    setTextColor(pdf, COLORS.ink);
    pdf.text(currentRecord, PAGE_MARGIN, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    setTextColor(pdf, COLORS.tealDark);
    pdf.text(feedbackTypeLabel(record), 192, y, { align: 'right' });
    y += 7;
  };

  const drawSection = (section: PdfSection): void => {
    ensureSpace(15);
    currentSection = section.label;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.2);
    setTextColor(pdf, COLORS.tealDark);
    const labelLines = pdf.splitTextToSize(section.label, CONTENT_WIDTH) as string[];
    pdf.text(labelLines, PAGE_MARGIN, y);
    y += labelLines.length * 4.3 + 2;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.2);
    setTextColor(pdf, COLORS.body);
    const bodyLines = pdf.splitTextToSize(cleanText(section.value), CONTENT_WIDTH) as string[];
    let lineIndex = 0;

    while (lineIndex < bodyLines.length) {
      if (y + 5 > PAGE_BOTTOM) {
        addPage();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10.2);
        setTextColor(pdf, COLORS.body);
      }

      const availableLines = Math.max(1, Math.floor((PAGE_BOTTOM - y) / 5));
      const chunk = bodyLines.slice(lineIndex, lineIndex + availableLines);
      pdf.text(chunk, PAGE_MARGIN, y);
      y += chunk.length * 5;
      lineIndex += chunk.length;
    }

    ensureSpace(5);
    y += 2;
    setDrawColor(pdf, COLORS.line);
    pdf.line(PAGE_MARGIN, y, 192, y);
    y += 5;
    currentSection = '';
  };

  drawReportHeader();

  records.forEach((record, index) => {
    if (index > 0) {
      currentRecord = `Feedback ${String(index + 1).padStart(2, '0')}`;
      currentSection = '';
      pdf.addPage();
      y = PAGE_MARGIN;
    }

    drawRecordHeading(record, index);
    drawMetadata(record);
    sectionsFor(record).forEach(drawSection);
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    setDrawColor(pdf, COLORS.line);
    pdf.line(PAGE_MARGIN, 284, 192, 284);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    setTextColor(pdf, COLORS.muted);
    pdf.text('Global Solutions Lab - Feedback Management', PAGE_MARGIN, 289);
    pdf.text(`Page ${page} of ${pageCount}`, 192, 289, { align: 'right' });
  }

  return pdf;
}

export function feedbackPdfFilename(record: FeedbackPdfRecord, generatedAt = new Date()): string {
  const identity = record.name || record.email.split('@')[0] || record.id || 'submission';
  const slug = cleanText(identity, 'submission')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `nwg-feedback-${slug || 'submission'}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}

export function allFeedbackPdfFilename(generatedAt = new Date()): string {
  return `nwg-feedback-all-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}
