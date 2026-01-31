import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Download, 
  Smartphone, 
  Zap, 
  Table as TableIcon, 
  Edit3, 
  X,
  Type,
  FileText,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Check,
  Settings,
  Key,
  Star
} from 'lucide-react';
import { apiService } from '../apiService';
import { Lesson, LearningOutcome, Question } from '../types';
import { SUBJECTS, GRADES, QUESTION_TYPES } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'questions' | 'curriculum' | 'system'>('questions');
  const [curriculumSubTab, setCurriculumSubTab] = useState<'lesson' | 'lo'>('lesson');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lessons, setLessons] = useState<Lesson[]>([]); 
  const [los, setLos] = useState<LearningOutcome[]>([]); 
  const [curriculumLessons, setCurriculumLessons] = useState<Lesson[]>([]); 
  const [explorerQuestions, setExplorerQuestions] = useState<Question[]>([]);
  
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>({});

  const [questionForm, setQuestionForm] = useState({
    subject: SUBJECTS[0], grade: GRADES[0], lessonId: '', loId: '',
    type: QUESTION_TYPES[0], marks: 1, text: '', answerKey: '', imageUrl: '', difficulty: 1
  });

  const [curriculumForm, setCurriculumForm] = useState({
    lessonTitle: '', lessonSubject: SUBJECTS[0], lessonGrade: GRADES[0],
    loSubject: SUBJECTS[0], loGrade: GRADES[0], loDescription: '', loParentLessonId: ''
  });

  const loadQuestionExplorer = async () => {
    const data = await apiService.getQuestions({
      subject: questionForm.subject, grade: questionForm.grade,
      lessonIds: questionForm.lessonId ? [Number(questionForm.lessonId)] : [],
      loIds: questionForm.loId ? [Number(questionForm.loId)] : []
    });
    setExplorerQuestions(data);
  };

  const loadLessonExplorer = async () => {
    const data = await apiService.getLessons(curriculumForm.lessonSubject, curriculumForm.lessonGrade);
    setCurriculumLessons(data);
  };

  const loadLoExplorer = async () => {
    if (curriculumForm.loParentLessonId) {
      const data = await apiService.getLearningOutcomes([Number(curriculumForm.loParentLessonId)]);
      setLos(data);
    } else { setLos([]); }
  };

  useEffect(() => {
    const fetchQuestionFormData = async () => {
      const l = await apiService.getLessons(questionForm.subject, questionForm.grade);
      setLessons(l);
      if (!l.some(lesson => lesson.id === Number(questionForm.lessonId))) {
        setQuestionForm(prev => ({ ...prev, lessonId: '', loId: '' }));
      }
      if (questionForm.lessonId) {
        const loData = await apiService.getLearningOutcomes([Number(questionForm.lessonId)]);
        setLos(loData);
        if (!loData.some(lo => lo.id === Number(questionForm.loId))) {
          setQuestionForm(prev => ({ ...prev, loId: '' }));
        }
      } else {
        setLos([]);
      }
      loadQuestionExplorer();
    };
    fetchQuestionFormData();
  }, [questionForm.subject, questionForm.grade, questionForm.lessonId, questionForm.loId]);

  useEffect(() => {
    const fetchCurriculumData = async () => {
      if (curriculumSubTab === 'lesson') {
        loadLessonExplorer();
      } else {
        const fetchedLessons = await apiService.getLessons(curriculumForm.loSubject, curriculumForm.loGrade);
        setCurriculumLessons(fetchedLessons);

        const currentParentLessonIdNum = Number(curriculumForm.loParentLessonId);
        const isCurrentParentLessonValid = fetchedLessons.some(l => l.id === currentParentLessonIdNum);
        
        if (!isCurrentParentLessonValid && curriculumForm.loParentLessonId !== '') {
            setCurriculumForm(prev => ({ ...prev, loParentLessonId: '' }));
        } else {
            loadLoExplorer();
        }
      }
    };
    fetchCurriculumData();
  }, [curriculumForm.loSubject, curriculumForm.loGrade, curriculumSubTab, curriculumForm.loParentLessonId]);

  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3000); };

  const startInlineEdit = (id: number, initialData: any) => {
    setEditingRowId(id);
    setEditBuffer(initialData);
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditBuffer({});
  };

  const saveInlineEdit = async (type: 'q' | 'l' | 'lo') => {
    if (!editingRowId) return;
    setIsSubmitting(true);
    try {
      if (type === 'q') await apiService.updateQuestion(editingRowId, editBuffer);
      if (type === 'l') await apiService.updateLesson(editingRowId, editBuffer);
      if (type === 'lo') await apiService.updateLearningOutcome(editingRowId, editBuffer);
      
      showSuccess("Record updated.");
      setEditingRowId(null);
      if (type === 'q') loadQuestionExplorer();
      if (type === 'l') loadLessonExplorer();
      if (type === 'lo') loadLoExplorer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, type: 'q' | 'l' | 'lo') => {
    if (!confirm(`Permanently remove this ${type === 'q' ? 'question' : type === 'l' ? 'lesson' : 'outcome'}?`)) return;
    if (type === 'q') await apiService.deleteQuestion(id);
    if (type === 'l') await apiService.deleteLesson(id);
    if (type === 'lo') await apiService.deleteLearningOutcome(id);
    showSuccess("Record purged.");
    if (type === 'q') loadQuestionExplorer();
    if (type === 'l') loadLessonExplorer();
    if (type === 'lo') loadLoExplorer();
  };

  const getDifficultyClass = (d: number) => {
    if (d === 1) return 'text-emerald-600 font-bold';
    if (d === 2) return 'text-amber-600 font-bold';
    if (d === 3) return 'text-rose-600 font-bold';
    return 'text-slate-600';
  }

  return (
    <div className="max-w-[1500px] mx-auto space-y-16 pb-48">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-2xl"><Settings size={32} /></div>
           <div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Console</h1>
             <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Data Integrity & High-Speed Editing</p>
           </div>
        </div>
        <div className="flex items-center gap-4 bg-emerald-50 px-8 py-4 rounded-2xl border border-emerald-100 shadow-sm">
           <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Storage: Linked</span>
        </div>
      </div>

      <div className="flex bg-slate-100 p-2 rounded-[1.75rem] shadow-inner w-fit">
        <button onClick={() => setActiveTab('questions')} className={`px-10 py-4 rounded-[1.25rem] font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'questions' ? 'bg-white text-indigo-600 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}>Questions</button>
        <button onClick={() => setActiveTab('curriculum')} className={`px-10 py-4 rounded-[1.25rem] font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'curriculum' ? 'bg-white text-indigo-600 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}>Curriculum</button>
        <button onClick={() => setActiveTab('system')} className={`px-10 py-4 rounded-[1.25rem] font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white text-indigo-600 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}>Engine</button>
      </div>

      {activeTab === 'questions' && (
        <div className="space-y-16">
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 p-12 space-y-10">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-5"><div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl shadow-sm"><Plus /></div> New Question</h2>
            <form onSubmit={async (e) => { e.preventDefault(); setIsSubmitting(true); await apiService.createQuestion(questionForm); setIsSubmitting(false); setQuestionForm({...questionForm, text: '', answerKey: '', imageUrl: ''}); loadQuestionExplorer(); showSuccess("Question logged."); }} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {['Subject', 'Grade', 'Lesson', 'Outcome'].map((label, i) => (
                  <div key={label} className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
                    <select className="w-full bg-slate-50 border-transparent rounded-2xl px-6 py-4.5 font-bold text-slate-700 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 border border-slate-100 transition-all shadow-sm" value={i===0?questionForm.subject:i===1?questionForm.grade:i===2?questionForm.lessonId:questionForm.loId} onChange={e => {
                      if(i===0)setQuestionForm({...questionForm, subject:e.target.value});
                      if(i===1)setQuestionForm({...questionForm, grade:e.target.value});
                      if(i===2)setQuestionForm({...questionForm, lessonId:e.target.value});
                      if(i===3)setQuestionForm({...questionForm, loId:e.target.value});
                    }}>
                      {i===0 && SUBJECTS.map(s=><option key={s}>{s}</option>)}
                      {i===1 && GRADES.map(g=><option key={g}>{g}</option>)}
                      {i===2 && [<option key="e" value="">Choose Lesson</option>, ...lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)]}
                      {i===3 && [<option key="e" value="">Choose Outcome</option>, ...los.map(lo=><option key={lo.id} value={lo.id}>{lo.description.substring(0,40)}...</option>)]}
                    </select>
                  </div>
                ))}
              </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Type</label>
                    <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={questionForm.type} onChange={e => setQuestionForm({...questionForm, type: e.target.value})}>{QUESTION_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Marks</label>
                    <input type="number" min="1" className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={questionForm.marks} onChange={e => setQuestionForm({...questionForm, marks: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Difficulty</label>
                    <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: Number(e.target.value)})}>
                      <option value={1}>Basic</option>
                      <option value={2}>Medium</option>
                      <option value={3}>Hard</option>
                    </select>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Question Content</label>
                  <textarea rows={4} className="w-full bg-slate-50 border-transparent rounded-[2.5rem] px-8 py-6 font-bold text-slate-700 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 border border-slate-100 resize-none shadow-sm transition-all shadow-inner" placeholder="Enter academic content text..." value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})} required />
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Answer Key</label>
                    <input type="text" className="w-full bg-slate-50 border-transparent rounded-[1.5rem] px-8 py-5 font-bold text-slate-700 focus:bg-white border-slate-100 shadow-sm transition-all shadow-inner" placeholder="Enter the correct solution..." value={questionForm.answerKey} onChange={e => setQuestionForm({...questionForm, answerKey: e.target.value})} required />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Illustration URL (Optional)</label>
                    <input type="text" className="w-full bg-slate-50 border-transparent rounded-[1.5rem] px-8 py-5 font-bold text-slate-700 focus:bg-white border-slate-100 shadow-sm transition-all shadow-inner" placeholder="https://..." value={questionForm.imageUrl} onChange={e => setQuestionForm({...questionForm, imageUrl: e.target.value})} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-4">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={24} />} Commit question to core
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
             <div className="bg-slate-50/80 px-12 py-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4 text-slate-800 font-black uppercase tracking-widest text-xs">
                   <TableIcon size={24} className="text-indigo-600" /> Excel-Style Repository
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">{explorerQuestions.length} Items Listed</div>
             </div>
             <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
                <table className="w-full text-left text-xs">
                   <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr className="border-b border-slate-100">
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest">Ref#</th>
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest w-1/3">Question Content</th>
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest w-1/4">Answer Key</th>
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest">Weight & Type</th>
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest">Difficulty</th>
                         <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest text-right">Action Bar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {explorerQuestions.map(q => {
                        const isEditing = editingRowId === q.id;
                        return (
                         <tr key={q.id} className={`transition-colors group ${isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                            <td className="px-12 py-8 font-black text-slate-300">#{q.id}</td>
                            <td className="px-12 py-8">
                               {isEditing ? (
                                 <div className="space-y-4">
                                   <textarea 
                                     className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                     value={editBuffer.question_text || ''}
                                     onChange={e => setEditBuffer({...editBuffer, question_text: e.target.value})}
                                   />
                                   <input 
                                     className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2 text-[10px] font-bold text-indigo-500 shadow-sm"
                                     value={editBuffer.image_url || ''}
                                     placeholder="Illustration URL"
                                     onChange={e => setEditBuffer({...editBuffer, image_url: e.target.value})}
                                   />
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-6">
                                   {q.image_url && <img src={q.image_url} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />}
                                   <span className="text-slate-800 font-bold leading-relaxed">{q.question_text}</span>
                                 </div>
                               )}
                            </td>
                            <td className="px-12 py-8">
                               {isEditing ? (
                                 <input 
                                   className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-emerald-600 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                   value={editBuffer.answer_key || ''}
                                   onChange={e => setEditBuffer({...editBuffer, answer_key: e.target.value})}
                                 />
                               ) : (
                                 <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                   <Key size={12} />
                                   <span className="truncate max-w-[200px]">{q.answer_key || 'No key'}</span>
                                 </div>
                               )}
                            </td>
                            <td className="px-12 py-8">
                               <div className="flex flex-col gap-2">
                                  {isEditing ? (
                                    <>
                                      <select className="text-[10px] font-black border border-indigo-200 rounded p-1 bg-white" value={editBuffer.question_type} onChange={e => setEditBuffer({...editBuffer, question_type: e.target.value})}>
                                        {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
                                      </select>
                                      <input type="number" className="text-[10px] font-black border border-indigo-200 rounded p-1 bg-white" value={editBuffer.marks} onChange={e => setEditBuffer({...editBuffer, marks: Number(e.target.value)})} />
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-widest w-fit text-slate-500 shadow-sm">{q.question_type}</span>
                                      <span className="text-[10px] font-black text-indigo-500 ml-1">{q.marks} Mark Weight</span>
                                    </>
                                  )}
                               </div>
                            </td>
                            <td className="px-12 py-8">
                               {isEditing ? (
                                  <select className="text-[10px] font-black border border-indigo-200 rounded p-1 bg-white" value={editBuffer.difficulty} onChange={e => setEditBuffer({...editBuffer, difficulty: Number(e.target.value)})}>
                                    <option value={1}>Basic</option>
                                    <option value={2}>Medium</option>
                                    <option value={3}>Hard</option>
                                  </select>
                               ) : (
                                <span className={getDifficultyClass(q.difficulty)}>{q.difficulty === 1 ? 'Basic' : q.difficulty === 2 ? 'Medium' : 'Hard'}</span>
                               )}
                            </td>
                            <td className="px-12 py-8 text-right">
                               <div className="flex items-center justify-end gap-3 transition-all">
                                  {isEditing ? (
                                    <>
                                      <button onClick={() => saveInlineEdit('q')} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 active:scale-95"><Check size={20} /></button>
                                      <button onClick={cancelInlineEdit} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl active:scale-95 shadow-sm"><X size={20} /></button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => startInlineEdit(q.id, q)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm opacity-0 group-hover:opacity-100"><Edit3 size={18} /></button>
                                      <button onClick={() => handleDelete(q.id, 'q')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                    </>
                                  )}
                               </div>
                            </td>
                         </tr>
                        );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="space-y-16">
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 p-12">
            <div className="flex gap-4 mb-10">
              <button onClick={() => setCurriculumSubTab('lesson')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border transition-all ${curriculumSubTab === 'lesson' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-[1.05]' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}>1. Lessons Registry</button>
              <button onClick={() => setCurriculumSubTab('lo')} className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border transition-all ${curriculumSubTab === 'lo' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-[1.05]' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}>2. Outcomes Registry</button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); setIsSubmitting(true); if (curriculumSubTab === 'lesson') await apiService.createLesson({ subject: curriculumForm.lessonSubject, grade: curriculumForm.lessonGrade, title: curriculumForm.lessonTitle }); else await apiService.createLearningOutcome({ lesson_id: Number(curriculumForm.loParentLessonId), description: curriculumForm.loDescription }); setIsSubmitting(false); setCurriculumForm({...curriculumForm, lessonTitle: '', loDescription: ''}); showSuccess("Saved."); if(curriculumSubTab==='lesson')loadLessonExplorer(); else loadLoExplorer(); }} className="space-y-10">
              {curriculumSubTab === 'lesson' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Subject</label>
                    <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={curriculumForm.lessonSubject} onChange={e => setCurriculumForm({...curriculumForm, lessonSubject: e.target.value})}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Grade</label>
                    <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={curriculumForm.lessonGrade} onChange={e => setCurriculumForm({...curriculumForm, lessonGrade: e.target.value})}>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Heading</label>
                    <input type="text" className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" placeholder="e.g. Thermodynamics" value={curriculumForm.lessonTitle} onChange={e => setCurriculumForm({...curriculumForm, lessonTitle: e.target.value})} required />
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Subject Scope</label>
                      <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={curriculumForm.loSubject} onChange={e => setCurriculumForm({...curriculumForm, loSubject: e.target.value})}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Grade Scope</label>
                      <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={curriculumForm.loGrade} onChange={e => setCurriculumForm({...curriculumForm, loGrade: e.target.value})}>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Parent Lesson</label>
                    <select className="w-full bg-slate-50 rounded-[1.5rem] px-8 py-5 font-bold border-transparent border focus:bg-white shadow-inner" value={curriculumForm.loParentLessonId} onChange={e => setCurriculumForm({...curriculumForm, loParentLessonId: e.target.value})} required>
                      <option value="">Select link to lesson</option>
                      {curriculumLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Competency Description</label>
                    <textarea rows={3} className="w-full bg-slate-50 rounded-[2.5rem] px-10 py-8 font-bold border-transparent border focus:bg-white shadow-inner resize-none" placeholder="Describe the outcome skill..." value={curriculumForm.loDescription} onChange={e => setCurriculumForm({...curriculumForm, loDescription: e.target.value})} required />
                  </div>
                </div>
              )}
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                <Plus size={24} /> Add to registry core
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-50 overflow-hidden">
             <div className="bg-slate-50/80 px-12 py-8 border-b border-slate-100 font-black uppercase tracking-widest text-xs flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><TableIcon size={20} /></div> Excel {curriculumSubTab === 'lesson' ? 'Lesson' : 'Outcome'} Registry
             </div>
             <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                {curriculumSubTab === 'lesson' ? (
                  <table className="w-full text-left text-xs">
                     <thead className="bg-white sticky top-0 shadow-sm border-b border-slate-100">
                        <tr>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest">ID</th>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest w-full">Lesson Designation</th>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {curriculumLessons.map(l => {
                          const isEditing = editingRowId === l.id;
                          return (
                            <tr key={l.id} className={`transition-all group ${isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                                <td className="px-12 py-8 font-black text-slate-300">#{l.id}</td>
                                <td className="px-12 py-8">
                                  {isEditing ? (
                                    <input autoFocus className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-black text-slate-700 shadow-sm" value={editBuffer.title || ''} onChange={e => setEditBuffer({...editBuffer, title: e.target.value})} />
                                  ) : (
                                    <span className="text-sm font-black text-slate-800 tracking-tight">{l.title}</span>
                                  )}
                                </td>
                                <td className="px-12 py-8 text-right">
                                  <div className="flex items-center justify-end gap-3 transition-all">
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveInlineEdit('l')} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95"><Check size={20} /></button>
                                        <button onClick={cancelInlineEdit} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl active:scale-95 shadow-sm"><X size={20} /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => startInlineEdit(l.id, l)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 shadow-sm"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(l.id, 'l')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 shadow-sm"><Trash2 size={18} /></button>
                                      </>
                                    )}
                                  </div>
                                </td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                     <thead className="bg-white sticky top-0 shadow-sm border-b border-slate-100">
                        <tr>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest">ID</th>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest w-full">Skill / Competency Outcome</th>
                           <th className="px-12 py-6 font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {los.map(lo => {
                          const isEditing = editingRowId === lo.id;
                          return (
                            <tr key={lo.id} className={`transition-all group ${isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                                <td className="px-12 py-8 font-black text-slate-300">#{lo.id}</td>
                                <td className="px-12 py-8">
                                  {isEditing ? (
                                    <textarea autoFocus className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 font-bold text-slate-700 shadow-sm" value={editBuffer.description || ''} onChange={e => setEditBuffer({...editBuffer, description: e.target.value})} />
                                  ) : (
                                    <span className="text-slate-800 font-bold leading-relaxed">{lo.description}</span>
                                  )}
                                </td>
                                <td className="px-12 py-8 text-right">
                                  <div className="flex items-center justify-end gap-3 transition-all">
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveInlineEdit('lo')} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95"><Check size={20} /></button>
                                        <button onClick={cancelInlineEdit} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl active:scale-95 shadow-sm"><X size={20} /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => startInlineEdit(lo.id, lo)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 shadow-sm"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(lo.id, 'lo')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 shadow-sm"><Trash2 size={18} /></button>
                                      </>
                                    )}
                                  </div>
                                </td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-700 p-16 rounded-[4rem] text-white space-y-10 shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50/30 group transition-all hover:scale-[1.02]">
            <Zap size={64} className="group-hover:rotate-12 transition-transform duration-500" />
            <div className="space-y-4">
              <h3 className="text-4xl font-black tracking-tight">Initialization</h3>
              <p className="text-indigo-100 font-black text-xs uppercase tracking-[0.3em] opacity-80 leading-loose">Wipe local data and populate with fresh curriculum samples for onboarding.</p>
            </div>
            <button onClick={async () => { if(confirm("Wipe all custom data and re-seed?")) await apiService.seedData(); showSuccess("Engine reset."); window.location.reload(); }} className="w-full bg-white text-indigo-700 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:brightness-95 active:scale-[0.98] transition-all text-sm">Reseed Engine</button>
          </div>
          <div className="bg-slate-900 p-16 rounded-[4rem] text-white space-y-10 shadow-2xl shadow-slate-200 group transition-all hover:scale-[1.02]">
            <Download size={64} className="text-rose-500 group-hover:translate-y-2 transition-transform duration-500" />
            <div className="space-y-4">
              <h3 className="text-4xl font-black tracking-tight">Export Core</h3>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] opacity-80 leading-loose">Generate a persistent JSON backup of every lesson, outcome, and questions.</p>
            </div>
            <button onClick={() => { const d = { l: localStorage.getItem('qpg_lessons'), lo: localStorage.getItem('qpg_los'), q: localStorage.getItem('qpg_questions') }; const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'chrysalis_backup.json'; a.click(); }} className="w-full bg-white/10 hover:bg-white/20 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] border border-white/20 transition-all text-sm">Download Backup</button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-12 right-12 bg-slate-900 text-white px-12 py-8 rounded-[3rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-right duration-500 z-[100] border border-white/10 shadow-rose-500/10">
          <div className="p-2 bg-rose-500 rounded-xl"><CheckCircle2 className="text-white" size={24} /></div>
          <div className="flex flex-col">
            <span className="font-black uppercase tracking-[0.2em] text-[11px] text-rose-500">Operation Success</span>
            <span className="font-bold text-slate-300 text-sm mt-0.5">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;