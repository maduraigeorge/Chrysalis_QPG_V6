import React, { useState, useEffect } from 'react';
import { 
  Search, 
  BookOpen, 
  Layers, 
  Filter, 
  ChevronDown, 
  Check, 
  CheckSquare, 
  Square, 
  Sparkles, 
  MinusSquare,
  GraduationCap
} from 'lucide-react';
import { Lesson, LearningOutcome } from '../types';
import { apiService } from '../apiService';
import { SUBJECTS, GRADES } from '../constants';

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

  // Hydrate outcomes if we already have lesson selections
  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      const fetchInitialData = async () => {
        const lessonData = await apiService.getLessons(selectedSubject, selectedGrade);
        setLessons(lessonData);
        
        if (lessonData.length > 0) {
          const loData = await apiService.getLearningOutcomes(lessonData.map(l => l.id));
          setLearningOutcomes(loData);
        }
      }
      fetchInitialData();
    }
  }, []);

  // Handle dropdown changes
  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      const fetchLessons = async () => {
        const data = await apiService.getLessons(selectedSubject, selectedGrade);
        setLessons(data);
        
        // If the subject/grade changed and it's not the initial load, reset selections
        if (selectedSubject !== initialFilters.subject || selectedGrade !== initialFilters.grade) {
          setSelectedLessonIds([]);
          setSelectedLoIds([]);
          setExpandedLessonIds([]);
        }
      }
      fetchLessons();
    } else {
      setLessons([]);
      setSelectedLessonIds([]);
      setExpandedLessonIds([]);
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
    let nextLoIds: number[];
    
    if (isLoSelected) {
      nextLoIds = selectedLoIds.filter(id => id !== loId);
    } else {
      nextLoIds = [...selectedLoIds, loId];
    }
    
    setSelectedLoIds(nextLoIds);
    
    const lessonLos = learningOutcomes.filter(lo => lo.lesson_id === lessonId).map(lo => lo.id);
    const anyLoSelectedInLesson = lessonLos.some(id => nextLoIds.includes(id));
    
    if (anyLoSelectedInLesson) {
      if (!selectedLessonIds.includes(lessonId)) {
        setSelectedLessonIds(prev => [...prev, lessonId]);
      }
    } else {
      setSelectedLessonIds(prev => prev.filter(id => id !== lessonId));
    }
  };

  const toggleExpandLesson = (id: number) => {
    setExpandedLessonIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allSelected = lessons.length > 0 && selectedLessonIds.length === lessons.length;
  const someSelected = selectedLessonIds.length > 0 && selectedLessonIds.length < lessons.length;

  const handleBulkToggle = () => {
    if (allSelected) {
      setSelectedLessonIds([]);
      setSelectedLoIds([]);
    } else {
      const allLessonIds = lessons.map(l => l.id);
      const allLoIds = learningOutcomes.map(lo => lo.id);
      setSelectedLessonIds(allLessonIds);
      setSelectedLoIds(allLoIds);
    }
  };

  const handleSync = () => {
    onScopeChange({ 
      subject: selectedSubject, 
      grade: selectedGrade, 
      lessonIds: selectedLessonIds, 
      loIds: selectedLoIds 
    });
  };

  const getSubjectColor = (subj: string) => {
    if (subj === 'Mathematics') return 'from-indigo-600 to-indigo-800 shadow-indigo-200';
    if (subj === 'Science') return 'from-emerald-600 to-emerald-800 shadow-emerald-200';
    if (subj === 'English') return 'from-rose-600 to-rose-800 shadow-rose-200';
    if (subj === 'History') return 'from-amber-600 to-amber-800 shadow-amber-200';
    if (subj === 'Physics') return 'from-cyan-600 to-cyan-800 shadow-cyan-200';
    if (subj === 'Chemistry') return 'from-orange-600 to-orange-800 shadow-orange-200';
    if (subj === 'Biology') return 'from-green-600 to-green-800 shadow-green-200';
    if (subj === 'Geography') return 'from-sky-600 to-sky-800 shadow-sky-200';
    return 'from-slate-700 to-slate-900 shadow-slate-200';
  }

  const isSyncEnabled = selectedSubject && selectedGrade && (selectedLessonIds.length > 0 || selectedLoIds.length > 0);

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-4 border-slate-400 overflow-hidden flex flex-col relative">
      <div className="bg-slate-100 px-5 md:px-8 py-4 md:py-5 border-b-2 border-slate-300 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-400 flex items-center justify-center shadow-sm">
            <Filter className="text-indigo-700 w-5 h-5" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">Topic Selector</h2>
            {selectedSubject && (
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                {selectedSubject} &bull; {selectedGrade} ({selectedLessonIds.length} Lessons Selected)
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5 md:p-8 bg-[#fdfdfd] space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
               <BookOpen size={11} className="text-indigo-600" /> Academic Subject
            </label>
            <div className="relative">
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 py-2 text-[11px] font-black text-slate-800 appearance-none focus:border-indigo-600 transition-all cursor-pointer shadow-sm"
              >
                <option value="">Select Subject</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} strokeWidth={3} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
               <GraduationCap size={11} className="text-indigo-600" /> Grade Level
            </label>
            <div className="relative">
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-white border-2 border-slate-400 rounded-xl px-3 py-2 text-[11px] font-black text-slate-800 appearance-none focus:border-indigo-600 transition-all cursor-pointer shadow-sm"
              >
                <option value="">Select Grade</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {lessons.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Select Modules</h3>
                <button 
                  onClick={handleBulkToggle}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-lg border-2 shadow-sm 
                  ${allSelected ? 'bg-indigo-700 text-white border-indigo-700' : someSelected ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
                >
                  {allSelected ? <CheckSquare size={13} strokeWidth={3} /> : someSelected ? <MinusSquare size={13} strokeWidth={3} /> : <Square size={13} strokeWidth={3} />}
                  <span>{allSelected ? 'Unselect All' : 'Select All'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lessons.map(lesson => {
                  const isExpandedLesson = expandedLessonIds.includes(lesson.id);
                  const isSelected = selectedLessonIds.includes(lesson.id);
                  const lessonLOs = learningOutcomes.filter(lo => lo.lesson_id === lesson.id);
                  const selectedCount = lessonLOs.filter(lo => selectedLoIds.includes(lo.id)).length;
                  const allSelectedInLesson = selectedCount === lessonLOs.length && lessonLOs.length > 0;
                  
                  return (
                    <div key={lesson.id} className="h-fit">
                      <div 
                        className={`w-full flex flex-col p-3 rounded-xl transition-all border-2 cursor-pointer ${isExpandedLesson ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                        onClick={() => toggleExpandLesson(lesson.id)}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div 
                            onClick={(e) => { e.stopPropagation(); toggleLessonSelection(lesson.id); }}
                            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all 
                            ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-300 group-hover:border-indigo-500'}`}
                          >
                            {isSelected && (allSelectedInLesson ? <Check size={12} strokeWidth={4} /> : <div className="w-2 h-0.5 bg-white rounded-full" />)}
                          </div>
                          <div className={`p-1 rounded-md border transition-all ${isExpandedLesson ? 'bg-indigo-100 text-indigo-700 rotate-180' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                            <ChevronDown size={12} strokeWidth={3} />
                          </div>
                        </div>
                        
                        <span className={`text-[11px] font-black leading-tight block truncate ${isExpandedLesson ? 'text-indigo-950' : 'text-slate-800'}`}>
                          {lesson.title}
                        </span>
                        
                        {selectedCount > 0 && (
                          <span className="text-[8px] font-black text-indigo-700 uppercase flex items-center gap-1 mt-1 bg-indigo-100 px-1.5 py-0.5 rounded-full w-fit">
                            <Sparkles size={8} className="fill-indigo-600" />
                            {selectedCount} Selected
                          </span>
                        )}

                        {isExpandedLesson && (
                          <div className="mt-3 space-y-1.5 border-t border-indigo-200 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            {lessonLOs.map(lo => {
                              const isLoSelected = selectedLoIds.includes(lo.id);
                              return (
                                <div 
                                  key={lo.id}
                                  onClick={(e) => { e.stopPropagation(); toggleLoSelection(lo.id, lesson.id); }}
                                  className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-all border ${isLoSelected ? 'bg-indigo-100/50 border-indigo-300 text-indigo-950' : 'bg-white/50 border-transparent hover:bg-slate-50 text-slate-700'}`}
                                >
                                   <div className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center mt-0.5 
                                   ${isLoSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                    {isLoSelected && <Check size={10} strokeWidth={4} />}
                                  </div>
                                  <span className="text-[9px] font-bold leading-tight">{lo.description}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-white border-2 border-dashed border-slate-400 rounded-full flex items-center justify-center">
                <Layers size={24} className="text-slate-300" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select subject & grade to reveal mapping</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t-2 border-slate-200 flex justify-end">
          <button 
            onClick={handleSync}
            disabled={!isSyncEnabled}
            className={`bg-gradient-to-tr ${getSubjectColor(selectedSubject)} text-white px-8 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 disabled:grayscale disabled:opacity-30 transition-all shadow-lg flex items-center justify-center gap-3 border-2 border-white/20`}
          >
            <Search size={18} strokeWidth={3} />
            Sync content
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionPanel;