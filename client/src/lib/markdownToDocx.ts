import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer
} from 'docx';

function parseMarkdownToDocx(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }

    if (trimmedLine.startsWith('######')) {
      paragraphs.push(createHeading(trimmedLine.slice(6), 'Heading6' as any));
    } else if (trimmedLine.startsWith('#####')) {
      paragraphs.push(createHeading(trimmedLine.slice(5), 'Heading5' as any));
    } else if (trimmedLine.startsWith('####')) {
      paragraphs.push(createHeading(trimmedLine.slice(4), 'Heading4' as any));
    } else if (trimmedLine.startsWith('###')) {
      paragraphs.push(createHeading(trimmedLine.slice(3), 'Heading3' as any));
    } else if (trimmedLine.startsWith('##')) {
      paragraphs.push(createHeading(trimmedLine.slice(2), 'Heading2' as any));
    } else if (trimmedLine.startsWith('#')) {
      paragraphs.push(createHeading(trimmedLine.slice(1), 'Heading1' as any));
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      paragraphs.push(createBulletPoint(trimmedLine.slice(2)));
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      const text = trimmedLine.replace(/^\d+\.\s/, '');
      paragraphs.push(createNumberedItem(text));
    } else if (trimmedLine.startsWith('>')) {
      paragraphs.push(createBlockquote(trimmedLine.slice(1).trim()));
    } else if (trimmedLine.startsWith('---') || trimmedLine.startsWith('***')) {
      paragraphs.push(createHorizontalRule());
    } else {
      paragraphs.push(createParagraph(trimmedLine));
    }
  }

  return paragraphs;
}

function createHeading(text: string, level: any): Paragraph {
  const runs = parseInlineFormatting(text, true);
  return new Paragraph({
    heading: level,
    children: runs,
    spacing: { before: 240, after: 120 }
  });
}

function createParagraph(text: string): Paragraph {
  const runs = parseInlineFormatting(text);
  return new Paragraph({
    children: runs,
    spacing: { after: 120 }
  });
}

function createBulletPoint(text: string): Paragraph {
  const runs = parseInlineFormatting(text);
  return new Paragraph({
    children: [
      new TextRun({ text: '•  ', bold: false }),
      ...runs
    ],
    indent: { left: 720 },
    spacing: { after: 60 }
  });
}

function createNumberedItem(text: string): Paragraph {
  const runs = parseInlineFormatting(text);
  return new Paragraph({
    children: runs,
    indent: { left: 720 },
    spacing: { after: 60 }
  });
}

function createBlockquote(text: string): Paragraph {
  const runs = parseInlineFormatting(text);
  return new Paragraph({
    children: [
      new TextRun({ text: '    ', color: '888888' }),
      ...runs
    ],
    border: {
      left: { style: 'single' as any, size: 3, color: '1976d2', space: 1 }
    },
    spacing: { after: 120 }
  });
}

function createHorizontalRule(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '────────────────────────────────────────', color: '888888' })
    ],
    spacing: { before: 120, after: 120 }
  });
}

function parseInlineFormatting(text: string, isHeading: boolean = false): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ 
        text: match[2], 
        bold: true, 
        italics: true,
        color: isHeading ? '000000' : undefined,
        size: isHeading ? 22 : undefined,
        underline: isHeading ? {} : undefined,
      }));
    } else if (match[3]) {
      runs.push(new TextRun({ 
        text: match[3], 
        bold: true,
        color: isHeading ? '000000' : undefined,
        size: isHeading ? 22 : undefined,
        underline: isHeading ? {} : undefined,
      }));
    } else if (match[4]) {
      runs.push(new TextRun({ 
        text: match[4], 
        italics: true,
        color: isHeading ? '000000' : undefined,
        size: isHeading ? 22 : undefined,
        underline: isHeading ? {} : undefined,
      }));
    } else if (match[5]) {
      runs.push(new TextRun({ 
        text: match[5], 
        font: 'Courier New',
        color: isHeading ? '000000' : undefined,
        size: isHeading ? 22 : undefined,
        underline: isHeading ? {} : undefined,
      }));
    } else if (match[6]) {
      runs.push(new TextRun({ 
        text: match[6],
        color: isHeading ? '000000' : undefined,
        size: isHeading ? 22 : undefined,
        underline: isHeading ? {} : undefined,
      }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ 
      text,
      color: isHeading ? '000000' : undefined,
      size: isHeading ? 22 : undefined,
      underline: isHeading ? {} : undefined,
    }));
  }

  return runs;
}

export async function convertMarkdownToDocx(markdown: string): Promise<Blob> {
  const paragraphs = parseMarkdownToDocx(markdown);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: paragraphs
    }]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
