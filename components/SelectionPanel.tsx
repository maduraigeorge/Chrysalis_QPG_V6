
console.log("📋 [Component] SelectionPanel.tsx: Loading definitions");
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  Check, 
  CheckSquare, 
  Square, 
  Sparkles, 
  MinusSquare,
  GraduationCap,
  Filter,
  Info
} from 'lucide-react';
import { Lesson, LearningOutcome } from '../types.ts';
import { apiService } from '../apiService.ts';
import { SUBJECTS, GRADES } from '../constants.ts';

interface Props {
  initialFilters: {
    subject: string;
    grade: string;
    lessonIds: number[];
    loIds: number[];
  };
  onScopeChange: (filters: { 
    subject: string; 
    grade: string; 
    lessonIds: number[]; 
    loIds: number[] 
  }) => void;
}

const SelectionPanel: React.FC<Props> = ({ initialFilters, onScopeChange }) => {
  const [selectedSubject, setSelectedSubject] = useState(initialFilters.subject);
  const [selectedGrade, setSelectedGrade] = useState(initialFilters.grade);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<number[]>(initialFilters.lessonIds);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [selectedLoIds, setSelectedLoIds] = useState<number[]>(initialFilters.loIds);
  const [expandedLessonIds, setExpandedLessonIds] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      const fetchInitialData = async () => {
        setIsSearching(true);
        const lessonData = await apiService.getLessons(selectedSubject, selectedGrade);
        setLessons(lessonData);
        if (lessonData.length > 0) {
          const loData = await apiService.getLearningOutcomes(lessonData.map(l => l.id));
          setLearningOutcomes(loData);
        }
        setIsSearching(false);
      }
      fetchInitialData();
    }
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      const fetchLessons = async () => {
        setIsSearching(true);
        const data = await apiService.getLessons(selectedSubject, selectedGrade);
        setLessons(data);
        if (selectedSubject !== initialFilters.subject || selectedGrade !== initialFilters.grade) {
          setSelectedLessonIds([]);
          setSelectedLoIds([]);
          setExpandedLessonIds([]);
        }
        setIsSearching(false);
      }
      fetchLessons();
    }
  }, [selectedSubject, selectedGrade]);

  useEffect(() => {
    if (lessons.length > 0) {
      const fetchLOs = async () => {
        const data = await apiService.getLearningOutcomes(lessons.map(l => l.id));
        setLearningOutcomes(data);
      }
      fetchLOs();
    } else {
      setLearningOutcomes([]);
    }
  }, [lessons]);

  const toggleLessonSelection = (id: number) => {
    const isSelected = selectedLessonIds.includes(id);
    const relatedLoIds = learningOutcomes.filter(lo => lo.lesson_id === id).map(lo => lo.id);
    if (isSelected) {
      setSelectedLessonIds(prev => prev.filter(i => i !== id));
      setSelectedLoIds(prev => prev.filter(loId => !relatedLoIds.includes(loId)));
    } else {
      setSelectedLessonIds(prev => [...prev, id]);
      setSelectedLoIds(prev => Array.from(new Set([...prev, ...relatedLoIds])));
    }
  };

  const toggleLoSelection = (loId: number, lessonId: number) => {
    const isLoSelected = selectedLoIds.includes(loId);
    let nextLoIds = isLoSelected ? selectedLoIds.filter(id => id !== loId) : [...selectedLoIds, loId];
    setSelectedLoIds(nextLoIds);
    const lessonLos = learningOutcomes.filter(lo => lo.lesson_id === lessonId).map(lo => lo.id);
    const anyLoSelectedInLesson = lessonLos.some(id => nextLoIds.includes(id));
    if (anyLoSelectedInLesson) {
      if (!selectedLessonIds.includes(lessonId)) setSelectedLessonIds(prev => [...prev, lessonId]);
    } else {
      setSelectedLessonIds(prev => prev.filter(id => id !== lessonId));
    }
  };

  const toggleExpandLesson = (id: number) => {
    setExpandedLessonIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const allSelected = lessons.length > 0 && selectedLessonIds.length === lessons.length;
  const someSelected = selectedLessonIds.length > 0 && !allSelected;

  const handleBulkToggle = () => {
    if (allSelected) {
      setSelectedLessonIds([]);
      setSelectedLoIds([]);
    } else {
      setSelectedLessonIds(lessons.map(l => l.id));
      setSelectedLoIds(learningOutcomes.map(lo => lo.id));
    }
  };

  const handleSync = () => {
    onScopeChange({ subject: selectedSubject, grade: selectedGrade, lessonIds: selectedLessonIds, loIds: selectedLoIds });
  };

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-4 border-slate-400 overflow-hidden flex flex-col">
      <div className="bg-slate-100 px-5 md:px-8 py-4 border-b-2 border-slate-300 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-400 flex items-center justify-center">
          <Filter className="text-indigo-700" />
        </div>
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Topic Selector</h2>
      </div>
      <div className="p-5 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 py-2 text-[11px] font-black">
              <option value="">Choose Subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Grade</label>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 py-2 text-[11px] font-black">
              <option value="">Choose Grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {isSearching ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching Curriculum...</span>
          </div>
        ) : lessons.length > 0 ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Available Modules ({lessons.length})</h3>
              <button onClick={handleBulkToggle} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 hover:bg-slate-50 transition-colors">
                {allSelected ? <CheckSquare size={13} /> : someSelected ? <MinusSquare size={13} /> : <Square size={13} />}
                {allSelected ? 'Unselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {lessons.map(lesson => (
                <div key={lesson.id} className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${expandedLessonIds.includes(lesson.id) ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-400'}`} onClick={() => toggleExpandLesson(lesson.id)}>
                   <div className="flex items-center justify-between mb-2">
                      <div onClick={e => { e.stopPropagation(); toggleLessonSelection(lesson.id); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedLessonIds.includes(lesson.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-300'}`}>
                         {selectedLessonIds.includes(lesson.id) && <Check size={12} strokeWidth={4} />}
                      </div>
                      <ChevronDown size={12} className={`transition-transform duration-300 ${expandedLessonIds.includes(lesson.id) ? 'rotate-180' : ''}`} />
                   </div>
                   <span className="text-[11px] font-black block truncate">{lesson.title}</span>
                   {expandedLessonIds.includes(lesson.id) && (
                     <div className="mt-3 space-y-1.5 border-t pt-3 animate-in slide-in-from-top-2 duration-200">
                        {learningOutcomes.filter(lo => lo.lesson_id === lesson.id).length > 0 ? (
                          learningOutcomes.filter(lo => lo.lesson_id === lesson.id).map(lo => (
                            <div key={lo.id} onClick={e => { e.stopPropagation(); toggleLoSelection(lo.id, lesson.id); }} className={`flex items-start gap-2 p-1.5 rounded text-[9px] font-bold transition-colors ${selectedLoIds.includes(lo.id) ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-50'}`}>
                               <div className={`w-3 h-3 mt-0.5 rounded border flex items-center justify-center shrink-0 ${selectedLoIds.includes(lo.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                 {selectedLoIds.includes(lo.id) && <Check size={8} strokeWidth={4} />}
                               </div>
                               {lo.description}
                            </div>
                          ))
                        ) : (
                          <div className="text-[8px] font-bold text-slate-400 italic py-1">No detailed outcomes registered</div>
                        )}
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        ) : selectedSubject && selectedGrade ? (
          <div className="py-12 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center space-y-3">
             <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
                <Info className="text-slate-400" />
             </div>
             <div className="text-center">
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">No Modules Found</h3>
               <p className="text-[9px] font-bold text-slate-500 mt-1">Try switching subjects or grades. Use Mathematics/Grade 10 for testing.</p>
             </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center opacity-30">
             <BookOpen size={48} className="text-slate-300" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Select parameters above</span>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end">
          <button 
            onClick={handleSync} 
            disabled={!selectedSubject || !selectedGrade || selectedLessonIds.length === 0} 
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed hover:bg-indigo-900 transition-all flex items-center gap-3 shadow-xl active:scale-95"
          >
             <Sparkles size={16} /> Sync content
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionPanel;
