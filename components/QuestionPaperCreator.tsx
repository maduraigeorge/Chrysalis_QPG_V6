import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ClipboardList, 
  Settings2,
  AlertCircle,
  Check, 
  Image as ImageIcon,
  Building2,
  X,
  Edit2,
  Save,
  Clock,
  GripVertical,
  Printer,
  Calculator,
  FileDown,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  Key,
  Eye,
  ArrowLeft,
  Loader2,
  FileDown as PdfIcon,
  Target,
  LayoutDashboard,
  Star
} from 'lucide-react';
import { Question, PaperMetadata, Section } from '../types';
import { apiService } from '../apiService';
import { exportPaperToWord } from '../utils/DocxExporter';
import { exportPaperToRtf } from '../utils/RtfExporter';
import { exportPaperToPdf } from '../utils/PdfExporter';
import saveAs from 'file-saver';

interface Props {
  questions: Question[];
  metadata: PaperMetadata;
  onMetadataChange: (meta: PaperMetadata) => void;
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  onUpdateQuestion?: (question: Question) => void;
  onReturn?: () => void;
  onPreviewDraft?: () => void;
}

const cleanText = (text: string) => {
  return text.replace(/^\[item[_\- ]?\d+\]\s*/i, '').replace(/\s*\[Set \d+\-\d+\]$/i, '').trim();
};

const QuestionPaperCreator: React.FC<Props> = ({ questions, metadata, onMetadataChange, sections, onSectionsChange, onUpdateQuestion, onReturn, onPreviewDraft }) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSection = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newSection: Section = {
      id,
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      questionType: 'MCQ',
      marksPerQuestion: 0, 
      sectionMarks: 0,
      selectedQuestionIds: []
    };
    onSectionsChange([...sections, newSection]);
    setActiveSectionId(id);
  };

  const removeSection = (id: string) => {
    onSectionsChange(sections.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    if (updates.marksPerQuestion !== undefined) updates.marksPerQuestion = Math.max(0, updates.marksPerQuestion);
    if (updates.sectionMarks !== undefined) updates.sectionMarks = Math.max(0, updates.sectionMarks);
    
    onSectionsChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const toggleQuestionInSection = (sectionId: string, questionId: number, maxCount: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const isSelected = section.selectedQuestionIds.includes(questionId);
    if (!isSelected && section.selectedQuestionIds.length >= maxCount) return;
    const newIds = isSelected ? section.selectedQuestionIds.filter(id => id !== questionId) : [...section.selectedQuestionIds, questionId];
    updateSection(sectionId, { selectedQuestionIds: newIds });
  };

  const openQuestionModal = (section: Section, question?: Question) => {
    setEditingQuestion(question || {
      subject: metadata.subject, 
      grade: metadata.grade, 
      question_type: section.questionType,
      marks: section.marksPerQuestion, 
      question_text: '', 
      answer_key: '',
      image_url: null, 
      difficulty: 1,
      lesson_id: questions[0]?.lesson_id || 1,
    });
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion?.question_text) return;
    const finalizedQ = { ...editingQuestion, marks: Math.max(0, Number(editingQuestion.marks || 0)) };
    const savedQ = await apiService.createQuestion(finalizedQ);
    
    // Update global questions state in current session
    if (onUpdateQuestion) {
      onUpdateQuestion(savedQ);
    }
    
    if (activeSectionId && !editingQuestion.id) {
        const section = sections.find(s => s.id === activeSectionId);
        if (section) {
          const needed = section.marksPerQuestion > 0 ? Math.floor(section.sectionMarks / section.marksPerQuestion) : 0;
          if (section.selectedQuestionIds.length < needed) {
            updateSection(activeSectionId, { selectedQuestionIds: [...section.selectedQuestionIds, savedQ.id] });
          }
        }
    }
    setIsModalOpen(false);
    setEditingQuestion(null);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const newSections = [...sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIdx, 0, draggedItem);
    onSectionsChange(newSections);
    setDraggedIndex(null);
  };

  const globalSelectedIds = useMemo(() => sections.reduce((acc, s) => [...acc, ...s.selectedQuestionIds], [] as number[]), [sections]);
  const totalAllocatedMarks = useMemo(() => sections.reduce((sum, s) => sum + s.sectionMarks, 0), [sections]);
  
  const isAligned = useMemo(() => {
    const metaComplete = 
      metadata.subject.trim().length > 0 &&
      metadata.grade.trim().length > 0 &&
      metadata.totalMarks > 0;

    if (!metaComplete) return false;
    if (sections.length === 0) return false;

    const goalsMatch = totalAllocatedMarks === metadata.totalMarks;
    if (!goalsMatch) return false;

    const allSectionsFull = sections.every(s => 
      s.sectionMarks > 0 && 
      s.marksPerQuestion > 0 && 
      (s.selectedQuestionIds.length * s.marksPerQuestion === s.sectionMarks)
    );
    
    return allSectionsFull;
  }, [sections, metadata, totalAllocatedMarks]);

  const handleExportWord = () => {
    if (!isAligned) return;
    exportPaperToWord(metadata, sections, questions);
    setIsExportMenuOpen(false);
  };

  const handleExportRtf = () => {
    if (!isAligned) return;
    exportPaperToRtf(metadata, sections, questions);
    setIsExportMenuOpen(false);
  };

  const handleExportPdf = async () => {
    if (!isAligned) return;
    setIsExportingPdf(true);
    await exportPaperToPdf(metadata);
    setIsExportingPdf(false);
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    if (!isAligned) return;
    const headers = ['Section', 'ID', 'Marks', 'Type', 'Question', 'Answer Key'];
    const rows: (string | number)[][] = sections.flatMap(s => 
      s.selectedQuestionIds.map(qid => {
        const q = questions.find(item => item.id === qid);
        if (!q) return [];
        return [
          s.name,
          q.id,
          q.marks,
          q.question_type,
          `"${cleanText(q.question_text).replace(/"/g, '""')}"`,
          `"${(q.answer_key || '').replace(/"/g, '""')}"`
        ];
      }).filter(r => r.length > 0)
    );
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'application/json' });
    saveAs(blob, `Question_Paper_${metadata.subject}_${metadata.grade}_Structure.csv`);
    setIsExportMenuOpen(false);
  };

  const handleAutogradeSubmit = () => {
    if (!isAligned) return;
    const selectedQuestions = questions.filter(q => globalSelectedIds.includes(q.id));
    const autogradePayload = {
      source: 'Chrysalis QP Designer',
      version: '2.0',
      timestamp: new Date().toISOString(),
      metadata,
      sections: sections.map(s => ({
        id: s.id,
        name: s.name,
        questionType: s.questionType,
        marksPerQuestion: s.marksPerQuestion,
        totalSectionMarks: s.sectionMarks,
        questionIds: s.selectedQuestionIds
      })),
      questionBank: selectedQuestions.map(q => ({
        id: q.id,
        text: cleanText(q.question_text),
        answer_key: q.answer_key || "", 
        marks: q.marks,
        type: q.question_type,
        image: q.image_url,
        subject: q.subject,
        grade: q.grade
      }))
    };
    
    const blob = new Blob([JSON.stringify(autogradePayload, null, 2)], { type: 'application/json' });
    saveAs(blob, `QP_${metadata.subject}_${metadata.grade}_Autograde.json`);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-32 md:pb-24 relative">
      <div className="bg-white px-4 md:px-8 py-2 md:py-3.5 rounded-2xl border-2 border-slate-500 shadow-xl flex items-center justify-between mb-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md border border-indigo-500 shrink-0">
             <LayoutDashboard size={18} className="md:w-5 md:h-5" strokeWidth={3} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight">Paper Designer</h1>
            <p className="hidden xs:flex text-slate-500 font-black text-[7px] md:text-[8px] uppercase tracking-[0.2em] items-center gap-1.5">
              <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
              Structure Exam Layout
            </p>
          </div>
        </div>
        
        <button 
          onClick={onReturn}
          className="text-[8px] md:text-[9px] font-black text-indigo-700 uppercase tracking-widest bg-white border-2 md:border-3 border-slate-300 px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-md active:scale-95"
        >
          <ArrowLeft size={14} className="md:w-4" strokeWidth={3} /> <span className="hidden xs:inline">Return to Bank</span><span className="sm:hidden">Return</span>
        </button>
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-[0_12px_60px_-15px_rgba(0,0,0,0.3)] border-4 border-slate-500 p-4 md:p-8 space-y-4 md:space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 md:w-48 h-32 md:h-48 bg-indigo-50/50 rounded-full blur-3xl opacity-60"></div>
        
        <div className="flex items-center gap-3 md:gap-4 border-b-2 border-slate-200 pb-4 md:pb-6 relative z-10">
           <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-700 flex items-center justify-center text-white shadow-xl border-2 border-indigo-500">
             <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
           </div>
           <div>
             <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">Global Config</h2>
             <p className="text-[7px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 md:mt-1.5 flex items-center gap-2">
               <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
               Identity & Constraints
             </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 relative z-10">
          <div className="md:col-span-3 space-y-2">
             <label className="text-[8px] md:text-[9px] font-black text-indigo-700 uppercase tracking-widest ml-1">Institutional Seal</label>
             <div className="w-full aspect-video md:aspect-square bg-slate-50 border-4 border-dashed border-slate-300 rounded-xl md:rounded-2xl flex flex-col items-center justify-center group hover:bg-white hover:border-indigo-600 transition-all cursor-pointer overflow-hidden relative shadow-inner">
               {metadata.schoolLogo ? (
                 <img src={metadata.schoolLogo} alt="School Logo" className="w-full h-full object-contain p-4" />
               ) : (
                 <>
                   <ImageIcon className="text-slate-400 group-hover:text-indigo-600 transition-colors w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                   <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest text-center px-4 mt-2 leading-relaxed">Identity Branding</span>
                 </>
               )}
               <input type="file" accept="image/*" onChange={e => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onloadend = () => onMetadataChange({...metadata, schoolLogo: reader.result as string});
                   reader.readAsDataURL(file);
                 }
               }} className="absolute inset-0 opacity-0 cursor-pointer" />
             </div>
          </div>

          <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
             <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Examination Title</label>
                <input type="text" value={metadata.title} onChange={e => onMetadataChange({...metadata, title: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm" placeholder="e.g. Annual Summative Exam 2024-25" />
             </div>
             <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">School Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 md:w-4 md:h-4" />
                  <input type="text" value={metadata.schoolName} onChange={e => onMetadataChange({...metadata, schoolName: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-slate-800 focus:border-indigo-600 transition-all shadow-sm" placeholder="Institution Designation" />
                </div>
             </div>
             <div className="md:col-span-1 space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Time Limit</label>
                <div className="relative">
                  <Clock className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={metadata.duration} 
                    onChange={e => onMetadataChange({...metadata, duration: e.target.value})} 
                    className="w-full bg-white border-2 border-slate-400 rounded-xl pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-slate-800 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                    placeholder="e.g. 180 Minutes"
                  />
                </div>
             </div>
             <div className="md:col-span-1 space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Paper Max Marks *</label>
                <div className="relative">
                  <Calculator className={`absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 ${metadata.totalMarks <= 0 ? 'text-rose-500' : 'text-slate-500'}`} />
                  <input 
                    type="number" 
                    min="1" 
                    value={metadata.totalMarks || ''} 
                    onChange={e => onMetadataChange({...metadata, totalMarks: Math.max(0, Number(e.target.value))})} 
                    className={`w-full bg-white border-2 rounded-xl pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm ${metadata.totalMarks <= 0 ? 'border-rose-300 bg-rose-50/20 text-rose-700' : 'border-slate-400 border-indigo-600 text-indigo-700'}`}
                    placeholder="Global limit"
                  />
                </div>
             </div>
             <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Instructions & Guidelines</label>
                <textarea rows={2} value={metadata.instructions} onChange={e => onMetadataChange({...metadata, instructions: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl px-4 py-2 md:py-3 text-[10px] md:text-xs font-medium text-slate-800 focus:border-indigo-600 transition-all shadow-sm resize-none" placeholder="Enter behavioral expectations for examinees..."></textarea>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-4">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white border-2 border-slate-700 shadow-xl">
               <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
             </div>
             <div>
               <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-none">Paper Sections</h3>
               <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Structure Assessment Hierarchy</p>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, idx) => {
            const isActive = activeSectionId === section.id;
            const allocated = section.selectedQuestionIds.length * section.marksPerQuestion;
            const isFull = section.sectionMarks > 0 && allocated === section.sectionMarks;
            const needed = section.marksPerQuestion > 0 ? Math.floor(section.sectionMarks / section.marksPerQuestion) : 0;
            const eligible = questions.filter(q => q.question_type === section.questionType && q.marks === section.marksPerQuestion);

            return (
              <div 
                key={section.id} 
                draggable={!isActive}
                onDragStart={() => handleDragStart(idx)}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className={`bg-white rounded-xl md:rounded-2xl border-4 transition-all overflow-hidden ${isActive ? 'ring-8 ring-indigo-500/10 border-indigo-600 shadow-[0_20px_50px_rgba(0,0,0,0.4)] scale-[1.005]' : 'border-slate-300 shadow-xl hover:border-slate-400'} ${draggedIndex === idx ? 'opacity-40 grayscale border-dashed border-indigo-400' : ''}`}
              >
                <div onClick={() => setActiveSectionId(isActive ? null : section.id)} className="px-3 md:px-5 py-2 md:py-3 flex items-center justify-between cursor-pointer group bg-white">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div 
                      className={`p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${draggedIndex === idx ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-slate-500 hover:text-indigo-600'}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4 md:w-5 md:h-5" />
                    </div>

                    <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-xs md:text-sm font-black transition-all ${isFull ? 'bg-emerald-600 text-white shadow-md border-2 border-emerald-400' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700'}`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs md:text-sm font-black text-slate-900 tracking-tight truncate">{section.name}</h4>
                      <div className="flex items-center gap-2 md:gap-3 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-600 mt-0.5">
                         <span className="text-indigo-700 font-black">{section.questionType}</span>
                         <span className={`px-1.5 md:px-2 py-0.5 rounded-md border-2 ${isFull ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}>{allocated} / {section.sectionMarks}M</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                     {!isFull && <div className="hidden xs:flex items-center gap-1 md:gap-1.5 bg-amber-50 text-amber-900 px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest border-2 border-amber-300 shadow-sm"><AlertCircle className="w-3 h-3 md:w-3.5 md:h-3.5" /> {needed - section.selectedQuestionIds.length} Missing</div>}
                     <button onClick={e => { e.stopPropagation(); removeSection(section.id); }} className="text-slate-500 hover:text-rose-700 transition-colors p-1.5 md:p-2 hover:bg-rose-50 rounded-xl">
                       <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                     </button>
                     <div className="p-1.5 md:p-2 text-slate-500 bg-slate-50 rounded-xl group-hover:text-indigo-700 transition-all border border-slate-200">
                        {isActive ? <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                     </div>
                  </div>
                </div>

                {isActive && (
                  <div className="px-4 md:px-6 pb-4 md:pb-6 border-t-4 border-slate-100 pt-4 md:pt-6 animate-in slide-in-from-top-4 duration-300 bg-slate-50/20">
                    <div className="bg-slate-100/90 rounded-xl p-3 md:p-5 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 border-2 md:border-4 border-slate-300 shadow-inner">
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Section Label</label>
                         <input 
                            type="text" 
                            value={section.name} 
                            onChange={e => updateSection(section.id, { name: e.target.value })} 
                            className="w-full bg-white border-2 border-slate-400 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-black text-slate-900 focus:border-indigo-600 shadow-sm" 
                            placeholder="e.g. MCQ"
                          />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Item Type</label>
                         <select value={section.questionType} onChange={e => updateSection(section.id, { questionType: e.target.value, selectedQuestionIds: [] })} className="w-full bg-white border-2 border-slate-400 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-black text-slate-900 shadow-sm">
                           {Array.from(new Set(questions.map(q => q.question_type))).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Weight / Item</label>
                         <input 
                           type="number" 
                           min="0" 
                           value={section.marksPerQuestion === 0 ? '' : section.marksPerQuestion} 
                           onChange={e => updateSection(section.id, { marksPerQuestion: Math.max(0, Number(e.target.value)), selectedQuestionIds: [] })} 
                           className={`w-full bg-white border-2 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-black focus:border-indigo-600 shadow-sm ${section.marksPerQuestion <= 0 ? 'border-rose-400 text-rose-700 bg-rose-50/50' : 'border-slate-400 text-slate-900'}`} 
                           placeholder="Fill weight"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Section Target Marks</label>
                         <input 
                            type="number" 
                            min="1" 
                            value={section.sectionMarks === 0 ? '' : section.sectionMarks} 
                            onChange={e => updateSection(section.id, { sectionMarks: Math.max(0, Number(e.target.value)), selectedQuestionIds: [] })} 
                            className={`w-full bg-white border-2 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-black focus:border-indigo-600 shadow-sm ${section.sectionMarks <= 0 ? 'border-rose-400 text-rose-700 bg-rose-50/50' : 'border-slate-400 text-slate-900'}`} 
                            placeholder="Fill target"
                          />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-4 flex justify-end mt-2">
                         <button onClick={() => openQuestionModal(section)} className="w-full md:w-auto bg-indigo-700 border-2 border-indigo-500 text-white px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95">
                           New Custom Question
                         </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                         <h5 className="text-[8px] md:text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <div className="w-1 md:w-1.5 h-2 md:h-3 bg-indigo-600 rounded-full"></div>
                           Available Set ({eligible.length})
                         </h5>
                         <button 
                           onClick={() => {
                             const eligibleIds = eligible.map(q => q.id);
                             const alreadySelectedInOther = globalSelectedIds.filter(id => !section.selectedQuestionIds.includes(id));
                             const trulyEligible = eligibleIds.filter(id => !alreadySelectedInOther.includes(id));
                             const countToTake = Math.min(trulyEligible.length, needed);
                             updateSection(section.id, { selectedQuestionIds: trulyEligible.slice(0, countToTake) });
                           }}
                           className="text-[8px] md:text-[9px] font-black text-indigo-800 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg border-2 border-indigo-300 hover:bg-indigo-100 transition-all shadow-sm"
                         >
                           Auto Map
                         </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {eligible.map(q => {
                          const sel = section.selectedQuestionIds.includes(q.id);
                          const other = globalSelectedIds.includes(q.id) && !sel;
                          const capacity = !sel && section.selectedQuestionIds.length >= needed;
                          
                          return (
                            <div key={q.id} className="relative group">
                              <div 
                                onClick={() => { if (!other && (!capacity || sel)) toggleQuestionInSection(section.id, q.id, needed); }} 
                                className={`px-3 py-2.5 md:px-4 md:py-3 rounded-xl border-2 transition-all flex items-center gap-3 md:gap-4 ${sel ? 'bg-indigo-50/50 border-indigo-600 shadow-md' : 'bg-white border-slate-300 hover:border-slate-500'} ${other || (capacity && !sel) ? 'opacity-30 grayscale cursor-not-allowed shadow-none' : 'cursor-pointer shadow-sm'}`}
                              >
                                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all 
                                ${sel ? 'bg-indigo-700 border-indigo-700 text-white shadow-sm' : 'bg-white border-slate-300'}`}>
                                  {sel && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="flex-1 flex flex-col gap-1 md:gap-1.5">
                                   <div className="flex flex-col md:flex-row gap-3 md:items-start">
                                      {q.image_url && (
                                        <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50 shadow-inner group-hover:scale-105 transition-transform">
                                           <img src={q.image_url} alt="Item Preview" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      <p className={`text-[10px] md:text-[11px] font-bold leading-tight ${sel ? 'text-indigo-950' : 'text-slate-900'}`}>{cleanText(q.question_text)}</p>
                                   </div>
                                   <div className="flex flex-wrap items-center gap-1.5 md:gap-2 pt-1">
                                      {q.answer_key && <span className="flex items-center gap-1 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black text-emerald-900 border border-emerald-300 shadow-sm"><Key size={8} /> Key: {q.answer_key.substring(0,30)}...</span>}
                                      <span className="bg-indigo-50 px-1.5 md:px-2 py-0.5 rounded text-[7px] md:text-[8px] font-black text-indigo-900 border border-indigo-300 shadow-sm truncate max-w-[80px] sm:max-w-none">{q.lesson_title}</span>
                                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border shadow-sm ${q.difficulty === 1 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : q.difficulty === 2 ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                                        <Star size={8} fill="currentColor" />
                                        {q.difficulty === 1 ? 'Basic' : q.difficulty === 2 ? 'Medium' : 'Hard'}
                                      </div>
                                   </div>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openQuestionModal(section, q); }} 
                                className="absolute right-2 md:right-3 top-2 md:top-3 p-1 md:p-1.5 bg-white rounded-lg shadow-xl border-2 border-slate-400 text-slate-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110"
                              >
                                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={3} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-2 md:pt-4">
          <button 
            onClick={addSection} 
            className="group relative w-full md:w-auto flex items-center justify-center gap-2 md:gap-3 bg-white border-2 md:border-4 border-dashed border-slate-400 text-slate-700 px-6 md:px-12 py-3 md:py-5 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] hover:border-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 transition-all active:scale-95 shadow-2xl"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={4} />
            Append Structural Section
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-500 py-3 md:py-3 z-[100] flex justify-center no-print shadow-[0_-15px_50px_rgba(0,0,0,0.3)] h-auto md:h-20 items-center">
         <div className="max-w-[1600px] w-full flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8 px-4 md:px-12 h-full py-3 md:py-0">
            <div className="flex items-center gap-4 md:gap-6 shrink-0 w-full md:w-auto">
               <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-end">
                    <span className="text-[8px] md:text-[10px] font-black text-slate-800 uppercase tracking-widest">Weight Distribution Audit</span>
                    <span className={`text-[10px] md:text-xs font-black tabular-nums border-2 px-1.5 md:px-2 py-0.5 rounded-lg shadow-md ${isAligned ? 'text-emerald-900 bg-emerald-100 border-emerald-500' : 'text-indigo-900 bg-indigo-100 border-indigo-500'}`}>
                       {totalAllocatedMarks} <span className="text-slate-500 font-bold mx-0.5">/</span> {metadata.totalMarks} <span className="hidden xs:inline text-[7px] md:text-[8px] uppercase tracking-tighter opacity-70">Marks</span>
                    </span>
                  </div>
                  <div className="bg-slate-300 border-2 border-slate-500 rounded-xl px-1.5 md:px-2 py-1.5 md:py-2 shadow-inner w-full flex items-center gap-2">
                        <div className="flex-1 h-2 md:h-3 bg-slate-400 rounded-full overflow-hidden border border-slate-600/20 shadow-inner">
                           <div className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.4)] ${isAligned ? 'bg-gradient-to-r from-emerald-600 to-emerald-800' : 'bg-gradient-to-r from-indigo-600 to-indigo-800'}`} style={{ width: `${Math.min(100, metadata.totalMarks > 0 ? (totalAllocatedMarks/metadata.totalMarks)*100 : 0)}%` }}></div>
                        </div>
                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-lg border-2 ${isAligned ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-400'}`}>
                          {isAligned ? <Check size={3.5} className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={4} /> : <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={4} />}
                        </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0 w-full md:w-auto">
              {isAligned ? (
                <>
                  <div className="relative flex-1 md:flex-initial" ref={exportMenuRef}>
                    <button 
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      className="w-full flex items-center justify-center gap-2 bg-white text-slate-950 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-2xl hover:bg-slate-50 transition-all border-2 md:border-4 border-slate-400 active:scale-95 whitespace-nowrap"
                    >
                      <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-700" strokeWidth={4} />
                      Export Paper
                      <ChevronDown className={`w-2.5 h-2.5 md:w-3 md:h-3 transition-transform duration-300 ${isExportMenuOpen ? 'rotate-180' : ''}`} strokeWidth={4} />
                    </button>

                    {isExportMenuOpen && (
                      <div className="absolute bottom-full right-0 mb-3 w-56 md:w-64 bg-white rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.5)] border-4 border-slate-500 p-2 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[110]">
                        <div className="px-4 py-2 border-b-2 border-slate-200 mb-2">
                          <span className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest">Production Suite</span>
                        </div>
                        <button onClick={handleExportPdf} disabled={isExportingPdf} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-rose-50 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all group text-left">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-rose-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-rose-200 shadow-sm">
                            {isExportingPdf ? <Loader2 className="animate-spin w-4 h-4 text-rose-700" /> : <PdfIcon className="w-4 h-4 text-rose-700" />}
                          </div> 
                          {isExportingPdf ? 'Generating...' : 'Download as PDF'}
                        </button>
                        <button onClick={handleExportWord} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-indigo-50 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all group text-left">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-blue-200 shadow-sm">
                            <FileText className="w-4 h-4 text-blue-700" />
                          </div> 
                          Microsoft Word (.docx)
                        </button>
                        <button onClick={handleExportRtf} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all group text-left">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-blue-200 shadow-sm">
                            <FileText className="w-4 h-4 text-slate-600" />
                          </div> 
                          Rich Text Format (.rtf)
                        </button>
                        <button onClick={handleExportExcel} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-emerald-50 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all group text-left">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-emerald-700 shadow-sm">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          </div> 
                          Data Spreadsheet (.csv)
                        </button>
                        <div className="h-[2px] bg-slate-200 my-2 mx-2"></div>
                        <button onClick={() => { window.print(); setIsExportMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-900 hover:text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all group text-left">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-slate-300 group-hover:text-white shadow-sm">
                            <Printer className="w-4 h-4" />
                          </div> 
                          Standard Print Menu
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleAutogradeSubmit}
                    className="flex-1 md:flex-initial h-11 md:h-14 px-4 md:px-10 rounded-xl md:rounded-[1.25rem] font-black text-[9px] md:text-[11px] uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-[0_15px_50px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap shrink-0 border-2 md:border-4 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white border-indigo-500 hover:brightness-110 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 md:w-[18px] md:h-[18px] text-white fill-white/20 animate-pulse" strokeWidth={3} /> 
                    <span className="hidden sm:inline">Push to </span>Autograde
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={onPreviewDraft}
                    className="flex-1 md:flex-initial h-11 md:h-14 px-6 md:px-10 rounded-xl md:rounded-[1.25rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap border-2 md:border-4 border-slate-300 bg-white text-slate-500 hover:bg-slate-50 active:scale-95 shadow-sm"
                  >
                    <Eye className="w-4 h-4 md:w-5 md:h-5" />
                    Preview Draft
                  </button>
                  <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-800 text-[8px] font-black uppercase tracking-widest animate-pulse">
                    <AlertCircle size={14} /> Criteria incomplete to unlock exports
                  </div>
                </>
              )}
            </div>
         </div>
      </div>

      {isModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in border-4 md:border-8 border-slate-500">
             <div className="bg-slate-900 p-6 md:p-8 text-white flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-12 md:-mr-16 -mt-12 md:-mt-16"></div>
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-black tracking-tight leading-none">{editingQuestion.id ? 'Refine Item' : 'New Item'}</h3>
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Internal Registry Access</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 md:p-3 rounded-xl transition-all relative z-10 border-2 border-white/10"><X size={24} /></button>
             </div>
             <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                   <div className="space-y-1.5 col-span-1">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Type</label>
                      <div className="bg-slate-100 px-3 md:px-5 py-2 md:py-3 rounded-xl text-xs md:text-sm font-black text-indigo-900 border-2 border-slate-300 shadow-inner truncate">{editingQuestion.question_type}</div>
                   </div>
                   <div className="space-y-1.5 col-span-1">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Weightage</label>
                      <input 
                        type="number" 
                        min="0"
                        value={editingQuestion.marks || 0}
                        onChange={e => setEditingQuestion({...editingQuestion, marks: Math.max(0, Number(e.target.value))})}
                        className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm font-black text-indigo-800 focus:border-indigo-600 shadow-sm"
                      />
                   </div>
                   <div className="space-y-1.5 col-span-1">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Difficulty</label>
                      <select 
                        value={editingQuestion.difficulty || 1}
                        onChange={e => setEditingQuestion({...editingQuestion, difficulty: Number(e.target.value)})}
                        className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm font-black text-indigo-800 focus:border-indigo-600 shadow-sm"
                      >
                        <option value={1}>Basic</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Hard</option>
                      </select>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Academic Prompt</label>
                   <textarea autoFocus rows={3} value={editingQuestion.question_text} onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})} className="w-full bg-slate-100 border-2 border-slate-400 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold text-slate-900 focus:border-indigo-600 focus:bg-white transition-all shadow-inner resize-none"></textarea>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Illustration URL (Optional)</label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={editingQuestion.image_url || ''} 
                        onChange={e => setEditingQuestion({...editingQuestion, image_url: e.target.value})} 
                        className="w-full bg-white border-2 border-slate-400 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-indigo-900 focus:border-indigo-600 shadow-sm" 
                        placeholder="https://images.unsplash.com/..." 
                      />
                    </div>
                    {editingQuestion.image_url && (
                       <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-slate-200 overflow-hidden shrink-0 bg-slate-50 shadow-sm">
                          <img src={editingQuestion.image_url} alt="Live Preview" className="w-full h-full object-cover" />
                       </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] md:text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Solution Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" strokeWidth={3} />
                    <input type="text" value={editingQuestion.answer_key || ''} onChange={e => setEditingQuestion({...editingQuestion, answer_key: e.target.value})} className="w-full bg-white border-2 border-slate-400 rounded-xl pl-9 md:pl-12 pr-4 md:pr-5 py-2.5 md:py-3.5 text-xs md:text-sm font-bold text-slate-900 focus:border-indigo-600 shadow-sm" placeholder="Validation response..." />
                  </div>
                </div>
                <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
                   <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 md:py-4 text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-2 border-slate-300 rounded-xl md:rounded-2xl hover:bg-slate-50 transition-all">Discard</button>
                   <button onClick={handleSaveQuestion} className="flex-[2] bg-indigo-700 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(79,70,229,0.5)] border-2 border-indigo-500 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8">
                     <Save className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /> Commit Entry
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionPaperCreator;