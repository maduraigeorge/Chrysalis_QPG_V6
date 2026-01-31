
import saveAs from 'file-saver';
import { Question, PaperMetadata, Section } from '../types';

// Helper to clean item tags from question text
const cleanText = (text: string) => {
  return text.replace(/^\[item[-_ ]?\d+\]\s*/i, '').replace(/ \[Set \d+-\d+\]$/i, '').trim();
};

// RTF standard header with basic color table
const rtfHeader = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Times New Roman;}}{\\colortbl;\\red0\\green0\\blue0;\\red128\\green128\\blue128;\\red64\\green64\\blue64;\\red0\\green0\\blue255;\\red0\\green128\\blue0;}';

/**
 * Exports a list of questions from the bank to an RTF file.
 */
export const exportBankToRtf = (questions: Question[], metadata: PaperMetadata) => {
  let content = rtfHeader;

  // Footer for page numbers
  content += '{\\footer\\qc\\fs12 Page {\\field{\\*\\fldinst PAGE}} of {\\field{\\*\\fldinst NUMPAGES}}\\par}';

  // Repository Header
  if (metadata.schoolName) {
    content += `\\qc\\fs32\\b ${metadata.schoolName}\\b0\\par`;
  }
  content += `\\qc\\fs28\\b Question Repository\\b0\\par`;
  content += `\\qc\\fs20 Subject: ${metadata.subject}    |    Grade: ${metadata.grade}\\par\\par`;

  const groupedByLesson: Record<string, Record<string, Question[]>> = {};

  questions.forEach(q => {
    const lesson = q.lesson_title || 'Uncategorized Lessons';
    const lo = q.lo_description || 'General Learning Outcomes';
    if (!groupedByLesson[lesson]) groupedByLesson[lesson] = {};
    if (!groupedByLesson[lesson][lo]) groupedByLesson[lesson][lo] = [];
    groupedByLesson[lesson][lo].push(q);
  });

  for (const [lessonTitle, loGroups] of Object.entries(groupedByLesson)) {
    content += `\\ql\\fs24\\b ${lessonTitle.toUpperCase()}\\b0\\par`;
    content += `\\brdrb\\brdrs\\brdrw10\\par`; 

    for (const [loDescription, qs] of Object.entries(loGroups)) {
      content += `\\ql\\fs20\\i Outcome: ${loDescription}\\i0\\par\\par`;

      qs.forEach((q, i) => {
        content += `\\ql\\fs20\\b ${i + 1}. \\b0 ${cleanText(q.question_text)} {\\b [${q.marks}M]}\\par`;
        if (q.answer_key) {
          content += `\\ql\\fs16\\i Key: ${q.answer_key}\\i0\\par`;
        }
        content += `\\par`;
      });
    }
  }

  content += '}';
  const blob = new Blob([content], { type: 'application/rtf' });
  saveAs(blob, `Question_Bank_${metadata.subject}_${metadata.grade}.rtf`);
};

/**
 * Exports a structured question paper to an RTF file.
 * Implementation fixed to resolve missing export error in QuestionPaperCreator.
 */
export const exportPaperToRtf = (metadata: PaperMetadata, sections: Section[], questions: Question[]) => {
  let content = rtfHeader;
  const displayTitle = metadata.title.trim() || "Examination";

  // Footer
  content += '{\\footer\\qc\\fs12 Page {\\field{\\*\\fldinst PAGE}} of {\\field{\\*\\fldinst NUMPAGES}}\\par}';

  // Paper Header
  if (metadata.schoolName) {
    content += `\\qc\\fs36\\b ${metadata.schoolName}\\b0\\par`;
  }
  content += `\\qc\\fs28\\b ${displayTitle}\\b0\\par\\par`;

  // Metadata Information
  content += `\\ql\\fs20 Subject: ${metadata.subject}\\tab\\tab Grade: ${metadata.grade}\\par`;
  if (metadata.duration) {
    content += `\\ql\\fs20 Duration: ${metadata.duration}\\tab\\tab Total Marks: ${metadata.totalMarks}\\par`;
  } else {
    content += `\\ql\\fs20 Total Marks: ${metadata.totalMarks}\\par`;
  }
  content += `\\par`;

  if (metadata.instructions) {
    content += `\\ql\\fs18\\b Instructions:\\b0\\par`;
    content += `\\ql\\fs18 ${metadata.instructions}\\par\\par`;
  }

  // Render Sections and Questions
  sections.forEach((section) => {
    content += `\\ql\\fs24\\b ${section.name.toUpperCase()} (${section.sectionMarks} Marks)\\b0\\par`;
    content += `\\brdrb\\brdrs\\brdrw10\\par`;

    section.selectedQuestionIds.forEach((qid, qIdx) => {
      const q = questions.find(item => item.id === qid);
      if (!q) return;

      content += `\\ql\\fs20\\b ${qIdx + 1}. \\b0 ${cleanText(q.question_text)} \\tab\\tab \\b [${q.marks}]\\b0\\par\\par`;
    });
  });

  // Page Break for Answer Key
  content += `\\page`;
  content += `\\qc\\fs28\\b ANSWER KEY\\b0\\par\\par`;

  sections.forEach((section) => {
    content += `\\ql\\fs22\\b ${section.name.toUpperCase()}\\b0\\par`;
    section.selectedQuestionIds.forEach((qid, qIdx) => {
      const q = questions.find(item => item.id === qid);
      if (!q) return;
      content += `\\ql\\fs20\\b ${qIdx + 1}. \\b0 ${q.answer_key || "No key provided."}\\par`;
    });
    content += `\\par`;
  });

  content += `\\qc\\fs16 --- End of Examination ---\\par`;

  content += '}';
  const blob = new Blob([content], { type: 'application/rtf' });
  saveAs(blob, `Question_Paper_${metadata.subject}_${metadata.grade}.rtf`);
};
