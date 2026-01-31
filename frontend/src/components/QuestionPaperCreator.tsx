import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, ClipboardList, Settings2, AlertCircle, Check, Image as ImageIcon,
  Building2, X, Edit2, Save, Clock, GripVertical, Calculator, FileDown, Eye, ArrowLeft,
  Loader2, Sparkles, Key, Star, LayoutDashboard, Maximize2, Minimize2, ChevronDown
} from 'lucide-react';
import { Question, PaperMetadata, Section } from '../types';
import { apiService } from '../apiService';
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

const cleanText = (text: string) => text.replace(/^\[item[_\- ]?\d+\]\s*/i, '').trim();

const QuestionPaperCreator: React.FC<Props> = ({ questions, metadata, onMetadataChange, sections, onSectionsChange, onUpdateQuestion, onReturn, onPreviewDraft }) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveQuestion = async () => {
    if (!editingQuestion?.question_text) return;
    setIsSaving(true);
    try {
      // 1. Save to Storage (Local or API)
      const savedQ = await apiService.createQuestion(editingQuestion);
      
      // 2. Critical: Update global session state in App.tsx
      // This ensures that the 'questions' prop being passed into this component is fresh.
      if (onUpdateQuestion) {
        onUpdateQuestion(savedQ);
      }
      
      // 3. If it was a NEW question being created from within a section, auto-select it
      if (activeSectionId && !editingQuestion.id) {
        const section = sections.find(s => s.id === activeSectionId);
        if (section) {
          const needed = section.marksPerQuestion > 0 ? Math.floor(section.sectionMarks / section.marksPerQuestion) : 0;
          if (section.selectedQuestionIds.length < needed) {
            const newSections = sections.map(s => s.id === activeSectionId 
              ? { ...s, selectedQuestionIds: [...s.selectedQuestionIds, savedQ.id] } 
              : s
            );
            onSectionsChange(newSections);
          }
        }
      }
      
      setIsModalOpen(false);
      setEditingQuestion(null);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to commit entry to session memory.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalAllocatedMarks = useMemo(() => sections.reduce((sum, s) => sum + s.sectionMarks, 0), [sections]);
  const isAligned = totalAllocatedMarks === metadata.totalMarks && metadata.totalMarks > 0;

  const handleAutogradeSubmit = () => {
    if (!isAligned) return;
    
    // Use current questions array which includes recent edits
    const globalSelectedIds = sections.flatMap(s => s.selectedQuestionIds);
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
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-2 border-slate-500 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md">
             <LayoutDashboard size={20} strokeWidth={3} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Paper Designer</h1>
        </div>
        <button onClick={onReturn} className="flex items-center gap-2 text-indigo-700 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-2 border-slate-300 px-5 py-2.5 rounded-xl hover:bg-white transition-all">
          <ArrowLeft size={16} strokeWidth={3} /> Back to Bank
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-slate-500 p-8 space-y-6 shadow-2xl">
        <h2 className="text-lg font-black flex items-center gap-3 border-b-2 border-slate-100 pb-4"><ClipboardList className="text-indigo-600" /> Global Config</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Exam Title</label>
              <input type="text" value={metadata.title} onChange={e => onMetadataChange({...metadata, title: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="Annual Exam 2025" />
           </div>
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Marks Target</label>
              <input type="number" value={metadata.totalMarks || ''} onChange={e => onMetadataChange({...metadata, totalMarks: Number(e.target.value)})} className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="e.g. 100" />
           </div>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => {
          const isActive = activeSectionId === section.id;
          const eligible = questions.filter(q => q.question_type === section.questionType && q.marks === section.marksPerQuestion);
          const allocated = section.selectedQuestionIds.length * section.marksPerQuestion;
          const needed = section.marksPerQuestion > 0 ? Math.floor(section.sectionMarks / section.marksPerQuestion) : 0;
          const isFull = section.sectionMarks > 0 && allocated >= section.sectionMarks;

          return (
            <div key={section.id} className={`bg-white border-4 rounded-2xl overflow-hidden shadow-lg transition-all ${isActive ? 'border-indigo-600 ring-8 ring-indigo-50' : 'border-slate-300'}`}>
               <div onClick={() => setActiveSectionId(isActive ? null : section.id)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                     <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">{idx + 1}</span>
                     <div>
                       <span className="font-black text-sm block">{section.name}</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isFull ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                         {allocated} / {section.sectionMarks} Marks
                       </span>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={e => { e.stopPropagation(); onSectionsChange(sections.filter(s => s.id !== section.id)); }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                    <ChevronDown className={`transition-transform duration-300 text-slate-400 ${isActive ? 'rotate-180' : ''}`} />
                  </div>
               </div>
               
               {isActive && (
                 <div className="p-6 border-t-2 border-slate-100 bg-slate-50/20 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-xl border-2 border-slate-200 shadow-inner">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                          <select value={section.questionType} onChange={e => onSectionsChange(sections.map(s => s.id === section.id ? { ...s, questionType: e.target.value, selectedQuestionIds: [] } : s))} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-xs">
                             <option>MCQ</option>
                             <option>Short Answer</option>
                             <option>Long Answer</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Weight/Item</label>
                          <input type="number" value={section.marksPerQuestion} onChange={e => onSectionsChange(sections.map(s => s.id === section.id ? { ...s, marksPerQuestion: Number(e.target.value), selectedQuestionIds: [] } : s))} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-xs" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target Marks</label>
                          <input type="number" value={section.sectionMarks} onChange={e => onSectionsChange(sections.map(s => s.id === section.id ? { ...s, sectionMarks: Number(e.target.value), selectedQuestionIds: [] } : s))} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-xs" />
                       </div>
                       <div className="flex items-end">
                          <button onClick={() => { setEditingQuestion({ subject: metadata.subject, grade: metadata.grade, question_type: section.questionType, marks: section.marksPerQuestion, lesson_id: questions[0]?.lesson_id || 1 }); setIsModalOpen(true); }} className="w-full h-10 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all">
                             New Custom Question
                          </button>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <div className="w-1.5 h-3 bg-indigo-600 rounded-full"></div> Available Items ({eligible.length})
                       </h5>
                       <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                         {eligible.map(q => {
                           const isSelected = section.selectedQuestionIds.includes(q.id);
                           return (
                             <div key={q.id} className={`group flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200'}`}>
                                <input type="checkbox" checked={isSelected} onChange={() => {
                                   const newIds = isSelected ? section.selectedQuestionIds.filter(id => id !== q.id) : [...section.selectedQuestionIds, q.id];
                                   if (!isSelected && section.selectedQuestionIds.length >= needed) return;
                                   onSectionsChange(sections.map(s => s.id === section.id ? { ...s, selectedQuestionIds: newIds } : s));
                                }} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex-1 flex flex-col gap-1">
                                   <span className="text-xs font-bold text-slate-900">{cleanText(q.question_text)}</span>
                                   <div className="flex items-center gap-3">
                                      {q.answer_key && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Key: {q.answer_key.substring(0, 30)}...</span>}
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID: #{q.id}</span>
                                   </div>
                                </div>
                                <button onClick={() => { setEditingQuestion(q); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16} /></button>
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

        <button onClick={() => onSectionsChange([...sections, { id: Math.random().toString(36).substr(2, 9), name: 'New Section', questionType: 'MCQ', marksPerQuestion: 1, sectionMarks: 5, selectedQuestionIds: [] }])} className="w-full py-4 border-4 border-dashed border-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-[0.99] flex items-center justify-center gap-3">
           <Plus size={20} /> Add New Structural Section
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-slate-500 py-3 z-[100] flex justify-center shadow-2xl">
         <div className="max-w-[1600px] w-full flex items-center justify-between px-12 h-14">
            <div className="flex items-center gap-8">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Weight Audit</span>
                  <span className={`text-sm font-black tabular-nums ${isAligned ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {totalAllocatedMarks} / {metadata.totalMarks} Marks
                  </span>
               </div>
               <div className="w-48 h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                  <div className={`h-full transition-all duration-500 ${isAligned ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, (totalAllocatedMarks/metadata.totalMarks)*100)}%` }}></div>
               </div>
            </div>

            <div className="flex items-center gap-4">
               {isAligned ? (
                 <>
                   <button onClick={onPreviewDraft} className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"><Eye size={16} /> Print Preview</button>
                   <button onClick={handleAutogradeSubmit} className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl border-2 border-slate-700 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                     <Sparkles size={16} className="text-indigo-400 animate-pulse" /> Push to Autograde
                   </button>
                 </>
               ) : (
                 <div className="flex items-center gap-3 text-amber-600 font-black text-[10px] uppercase tracking-widest bg-amber-50 px-6 py-3 rounded-xl border-2 border-amber-200">
                    <AlertCircle size={16} /> Match weight target to unlock exports
                 </div>
               )}
            </div>
         </div>
      </div>

      {isModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-lg border-4 border-slate-500 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                 <h3 className="font-black text-lg tracking-tight">{editingQuestion.id ? 'Refine Entry' : 'New Registry Item'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Prompt</label>
                    <textarea value={editingQuestion?.question_text || ''} onChange={e => setEditingQuestion({...editingQuestion!, question_text: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-4 font-bold text-slate-800 h-32 focus:border-indigo-600 outline-none shadow-inner" placeholder="Enter question text..." />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Validation Key</label>
                    <input value={editingQuestion?.answer_key || ''} onChange={e => setEditingQuestion({...editingQuestion!, answer_key: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-4 font-bold text-emerald-700 focus:border-indigo-600 outline-none shadow-inner" placeholder="Enter answer key..." />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition-all">Discard</button>
                    <button onClick={handleSaveQuestion} disabled={isSaving} className="flex-[2] bg-indigo-600 text-white py-4 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg border-2 border-indigo-400 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Commit to Session
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