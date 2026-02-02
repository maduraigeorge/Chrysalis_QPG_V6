
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ImageRun, Footer, PageNumber, PageBreak } from 'docx';
import saveAs from 'file-saver';
import { Question, PaperMetadata, Section } from '../types.ts';

const cleanText = (text: string) => {
  return text.replace(/^\[item[-_ ]?\d+\]\s*/i, '').replace(/ \[Set \d+-\d+\]$/i, '').trim();
};

const fetchImage = async (url: string): Promise<Uint8Array | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.warn("Could not fetch image for docx:", url);
    return null;
  }
};

export const exportBankToWord = async (questions: Question[], metadata: PaperMetadata) => {
  const groupedByLesson: Record<string, Record<string, Question[]>> = {};

  questions.forEach(q => {
    const lesson = q.lesson_title || 'Uncategorized Lessons';
    const lo = q.lo_description || 'General Learning Outcomes';
    if (!groupedByLesson[lesson]) groupedByLesson[lesson] = {};
    if (!groupedByLesson[lesson][lo]) groupedByLesson[lesson][lo] = [];
    groupedByLesson[lesson][lo].push(q);
  });

  const children: any[] = [];
  
  if (metadata.schoolName) {
    children.push(new Paragraph({
      text: metadata.schoolName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }));
  }

  children.push(new Paragraph({
    text: 'Question Repository',
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 }
  }));

  children.push(new Paragraph({
    children: [
      new TextRun({ text: `Subject: ${metadata.subject}    |    Grade: ${metadata.grade}`, bold: true })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }));

  for (const [lessonTitle, loGroups] of Object.entries(groupedByLesson)) {
    children.push(
      new Paragraph({
        text: lessonTitle.toUpperCase(),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 150, after: 50 },
        border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 4 } }
      })
    );

    for (const [loDescription, qs] of Object.entries(loGroups)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Outcome: ${loDescription}`, bold: true, italics: true, color: '666666', size: 16 })
          ],
          spacing: { before: 80, after: 40 }
        })
      );

      for (const [i, q] of qs.entries()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${i + 1}. `, bold: true, size: 18 }),
              new TextRun({ text: cleanText(q.question_text), size: 18 }),
              new TextRun({ text: ` [${q.marks}M]`, bold: true, color: '888888', size: 18 })
            ],
            spacing: { before: 40, after: 40 }
          })
        );

        if (q.answer_key) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Key: `, bold: true, size: 16 }),
                new TextRun({ text: q.answer_key, size: 16 })
              ],
              spacing: { after: 40 }
            })
          );
        }

        if (q.image_url) {
          const imgData = await fetchImage(q.image_url);
          if (imgData) {
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imgData,
                    transformation: { width: 280, height: 180 },
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 }
              })
            );
          }
        }
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun("Page "),
                new TextRun({ children: [PageNumber.CURRENT] }),
                new TextRun(" of "),
                new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
              ],
            }),
          ],
        }),
      },
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Question_Bank_${metadata.subject}_${metadata.grade}.docx`);
};

export const exportPaperToWord = async (metadata: PaperMetadata, sections: Section[], questions: Question[]) => {
  const children: any[] = [];
  const displayTitle = metadata.title.trim() || "Exam";

  if (metadata.schoolName) {
    children.push(new Paragraph({
      text: metadata.schoolName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 }
    }));
  }

  children.push(new Paragraph({
    text: displayTitle,
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 }
  }));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Subject: ${metadata.subject}`, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Grade: ${metadata.grade}`, size: 18 })], alignment: AlignmentType.RIGHT })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: metadata.duration ? `Duration: ${metadata.duration}` : "", size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Marks: ${metadata.totalMarks}`, size: 18 })], alignment: AlignmentType.RIGHT })] }),
        ],
      }),
    ],
  }));

  children.push(new Paragraph({ text: '', spacing: { after: 150 } }));

  if (metadata.instructions) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Instructions:', bold: true, size: 16 })],
      spacing: { after: 40 }
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: metadata.instructions, size: 16 })],
      spacing: { after: 150 }
    }));
  }

  for (const section of sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${section.name.toUpperCase()} (${section.sectionMarks} Marks)`, bold: true, size: 20 })
        ],
        spacing: { before: 150, after: 50 },
        border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 4 } }
      })
    );

    for (const [qIdx, qid] of section.selectedQuestionIds.entries()) {
      const q = questions.find(item => item.id === qid);
      if (!q) continue;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${qIdx + 1}. `, bold: true, size: 18 }),
            new TextRun({ text: cleanText(q.question_text), size: 18 }),
            new TextRun({ text: `    [${q.marks}]`, bold: true, size: 18 })
          ],
          spacing: { before: 80, after: 40 }
        })
      );

      if (q.image_url) {
        const imgData = await fetchImage(q.image_url);
        if (imgData) {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgData,
                  transformation: { width: 320, height: 220 },
                } as any),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 }
            })
          );
        }
      }
    }
  }

  children.push(new PageBreak());
  children.push(
    new Paragraph({
      text: "ANSWER KEY",
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { before: 150, after: 150 }
    })
  );

  for (const section of sections) {
    children.push(
      new Paragraph({
        text: section.name.toUpperCase(),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 40 }
      })
    );

    for (const [qIdx, qid] of section.selectedQuestionIds.entries()) {
      const q = questions.find(item => item.id === qid);
      if (!q) continue;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${qIdx + 1}. `, bold: true, size: 16 }),
            new TextRun({ text: q.answer_key || "No key provided.", size: 16 })
          ],
          spacing: { before: 40, after: 20 }
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun("Page "),
                new TextRun({ children: [PageNumber.CURRENT] }),
                new TextRun(" of "),
                new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
              ],
            }),
          ],
        }),
      },
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Question_Paper_${metadata.subject}_${metadata.grade}.docx`);
};
