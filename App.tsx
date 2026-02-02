
console.log("📦 [Module] App.tsx: Module loading");
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings,
  X,
  Lock,
  ArrowLeft,
  Database,
  FileText,
  Sparkles,
  ChevronDown,
  Download,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  UserCheck,
  ShieldAlert,
  Printer,
  FileWarning,
  Loader2
} from 'lucide-react';
import { AppMode, Question, PaperMetadata, Section, UserRole } from './types.ts';
import SelectionPanel from './components/SelectionPanel.tsx';
import QuestionListing from './components/QuestionListing.tsx';
import QuestionPaperCreator from './components/QuestionPaperCreator.tsx';
import PaperPreview from './components/PaperPreview.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { apiService } from './apiService.ts';
import { exportPaperToPdf } from './utils/PdfExporter.ts';

const App: React.FC = () => {
  console.log("⚛️ [Render] App: Component initializing");
  const [mode, setMode] = useState<AppMode>(AppMode.SELECTION);
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dbInitializing, setDbInitializing] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  
  const [selectionFilters, setSelectionFilters] = useState<{ 
    subject: string; 
    grade: string; 
    lessonIds: number[]; 
    loIds: number[] 
  }>({
    subject: '',
    grade: '',
    lessonIds: [],
    loIds: []
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [paperMetadata, setPaperMetadata] = useState<PaperMetadata>({
    title: '',
    subject: '',
    grade: '',
    totalMarks: 0,
    duration: '',
    instructions: '',
    schoolName: '',
    schoolLogo: ''
  });
  
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    const init = async () => {
      console.log("📡 [Network] App: Requesting DB init from apiService");
      try {
        await apiService.initDatabase();
        console.log("✨ [Network] App: DB init successful");
      } catch (e) {
        console.error("❌ [Network] App: DB Initialization failed", e);
      } finally {
        setDbInitializing(false);
      }
    };
    init();
  }, []);

  const handleScopeChange = async (filters: { subject: string; grade: string; lessonIds: number[]; loIds: number[] }) => {
    setLoading(true);
    setSelectionFilters(filters);
    setMode(AppMode.BANK);
    try {
      const data = await apiService.getQuestions(filters);
      setQuestions(data);
      setSelectedQuestionIds([]); 
      setPaperMetadata(prev => ({ ...prev, subject: filters.subject, grade: filters.grade }));
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error("Failed to fetch questions", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReturnToSelection = () => {
    setMode(AppMode.SELECTION);
  };

  const isPaperAligned = useMemo(() => {
    const isMetadataComplete = 
      paperMetadata.subject.trim().length > 0 &&
      paperMetadata.grade.trim().length > 0 &&
      paperMetadata.totalMarks > 0;

    if (!isMetadataComplete) return false;
    if (sections.length === 0) return false;

    const totalAllocatedMarks = sections.reduce((sum, s) => sum + s.sectionMarks, 0);
    const goalsMatch = totalAllocatedMarks === paperMetadata.totalMarks;

    if (!goalsMatch) return false;

    const allSectionsComplete = sections.every(s => 
      s.sectionMarks > 0 && 
      s.marksPerQuestion > 0 &&
      (s.selectedQuestionIds.length * s.marksPerQuestion === s.sectionMarks)
    );

    return allSectionsComplete;
  }, [sections, paperMetadata]);

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const setBulkQuestionSelection = (ids: number[], select: boolean) => {
    if (select) {
      setSelectedQuestionIds(Array.from(new Set([...selectedQuestionIds, ...ids])));
    } else {
      setSelectedQuestionIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'Admin' && loginForm.password === 'Reset@123') {
      setRole(UserRole.ADMIN);
      setShowAdminLogin(false);
      setMode(AppMode.ADMIN);
      setIsMenuOpen(false);
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Invalid credentials.');
    }
  };

  const logout = () => {
    setRole(UserRole.TEACHER);
    setMode(AppMode.SELECTION);
    setIsMenuOpen(false);
    window.location.reload();
  };

  const handleReturnToBank = () => {
    setMode(AppMode.BANK);
  };

  const handleDownloadPdf = async () => {
    if (!isPaperAligned) return;
    setIsExporting(true);
    await exportPaperToPdf(paperMetadata);
    setIsExporting(false);
  };

  const handleUpdateQuestionInMemory = (updatedQ: Question) => {
    setQuestions(prev => {
      const exists = prev.find(q => q.id === updatedQ.id);
      if (exists) {
        return prev.map(q => q.id === updatedQ.id ? { ...updatedQ } : q);
      }
      return [...prev, { ...updatedQ }];
    });
  };

  if (dbInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-black text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/10 rounded-full blur-[160px] animate-pulse"></div>
        <div className="flex flex-col items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-12 animate-bounce">
            <Database size={48} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl tracking-tight">Awakening Chrysalis...</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Readying Curriculum Infrastructure</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col selection:bg-indigo-100 relative">
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-100 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-50 rounded-full blur-[150px]"></div>
      </div>

      <nav className="bg-white/95 backdrop-blur-md border-b-2 border-slate-300 sticky top-0 z-[60] no-print h-16 md:h-20 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 cursor-pointer group" onClick={() => setMode(AppMode.SELECTION)}>
            <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-tr from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all duration-300">
              <Sparkles className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg md:text-xl font-black tracking-tight text-slate-900 leading-none">Chrysalis</span>
              <span className="text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">SaaS Portal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 border-2 border-slate-200 p-1 rounded-xl md:rounded-2xl">
            <button 
              onClick={() => setMode(AppMode.SELECTION)}
              className={`px-3 md:px-6 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 md:gap-2 ${mode === AppMode.BANK || mode === AppMode.SELECTION ? 'bg-white text-indigo-600 shadow-md scale-105 border border-slate-300' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileText size={12} className="md:w-[14px]" /> <span className="hidden sm:inline">Question Bank</span><span className="sm:hidden">Bank</span>
            </button>
            <button 
              onClick={() => setMode(AppMode.PAPER)}
              className={`px-3 md:px-6 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 md:gap-2 ${mode === AppMode.PAPER || mode === AppMode.PREVIEW ? 'bg-white text-indigo-600 shadow-md scale-105 border border-slate-300' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <LayoutDashboard size={12} className="md:w-[14px]" /> <span className="hidden sm:inline">Paper Designer</span><span className="sm:hidden">Designer</span>
            </button>
            {role === UserRole.ADMIN && (
              <button 
                onClick={() => setMode(AppMode.ADMIN)}
                className={`px-3 md:px-6 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 md:gap-2 ${mode === AppMode.ADMIN ? 'bg-white text-rose-600 shadow-md scale-105 border border-slate-300' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <ShieldAlert size={12} className="md:w-[14px]" /> <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 md:gap-3 bg-white border-2 py-1 md:py-1.5 pl-1 md:pl-1.5 pr-2 md:pr-4 rounded-xl shadow-md transition-all ${isMenuOpen ? 'border-indigo-400' : 'border-slate-300'}`}
            >
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-white font-black text-[10px] md:text-xs shadow-md bg-gradient-to-br ${role === UserRole.ADMIN ? 'from-rose-500 to-rose-700' : 'from-indigo-500 to-indigo-700'}`}>
                {role === UserRole.ADMIN ? 'AD' : 'TR'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] md:text-[11px] font-black text-slate-800 tracking-tight leading-none">{role === UserRole.ADMIN ? 'Admin' : 'Teacher'}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Verified</span>
              </div>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-3 w-48 md:w-56 bg-white rounded-2xl shadow-2xl border-2 border-slate-300 p-2 animate-in fade-in slide-in-from-top-4 duration-200 z-[70]">
                {role === UserRole.TEACHER ? (
                  <button 
                    onClick={() => { setShowAdminLogin(true); setIsMenuOpen(false); }} 
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-black text-[9px] uppercase tracking-widest"
                  >
                    <ShieldCheck size={16} /> Admin Login
                  </button>
                ) : (
                  <button 
                    onClick={() => { setRole(UserRole.TEACHER); handleReturnToBank(); setIsMenuOpen(false); }} 
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-black text-[9px] uppercase tracking-widest"
                  >
                    <UserCheck size={16} /> Teacher Mode
                  </button>
                )}
                <div className="h-0.5 bg-slate-100 my-1 mx-2"></div>
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 font-black text-[9px] uppercase tracking-widest">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-8 py-4 md:py-8 no-print pb-32">
        {mode === AppMode.ADMIN ? (
          <AdminPanel />
        ) : mode === AppMode.PREVIEW ? (
          <div className="max-w-[1100px] mx-auto w-full space-y-8">
             <div className="flex items-center justify-between px-1">
                <button onClick={() => setMode(AppMode.PAPER)} className="bg-white text-slate-900 border-2 border-slate-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95">
                   <ArrowLeft size={16} strokeWidth={3} /> Return to Designer
                </button>
                <div className="flex items-center gap-3">
                  {isPaperAligned ? (
                    <button onClick={handleDownloadPdf} disabled={isExporting} className="bg-rose-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl disabled:opacity-50">
                       {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} strokeWidth={3} />} Download Final PDF
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-800 text-[9px] font-black uppercase tracking-widest">
                      <FileWarning size={14} /> Criteria Incomplete
                    </div>
                  )}
                </div>
             </div>
             <PaperPreview mode={mode} metadata={paperMetadata} sections={sections} questions={questions} selectedBankQuestionIds={selectedQuestionIds} />
          </div>
        ) : mode === AppMode.SELECTION ? (
           <SelectionPanel initialFilters={selectionFilters} onScopeChange={handleScopeChange} />
        ) : mode === AppMode.BANK ? (
          <QuestionListing 
            questions={questions} 
            loading={loading}
            selectedIds={selectedQuestionIds}
            onToggle={toggleQuestionSelection}
            onToggleAll={setBulkQuestionSelection}
            metadata={paperMetadata}
            onDesignPaper={() => setMode(AppMode.PAPER)}
            onReturnToSelection={handleReturnToSelection}
          />
        ) : (
          <QuestionPaperCreator 
            questions={questions}
            metadata={paperMetadata}
            onMetadataChange={setPaperMetadata}
            sections={sections}
            onSectionsChange={setSections}
            onUpdateQuestion={handleUpdateQuestionInMemory}
            onReturn={handleReturnToBank}
            onPreviewDraft={() => setMode(AppMode.PREVIEW)}
          />
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border-4 border-slate-400">
            <div className="bg-slate-900 p-6 md:p-10 text-white text-center">
              <Lock size={32} className="mx-auto mb-4" strokeWidth={2.5} />
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Admin Portal</h2>
            </div>
            <form onSubmit={handleAdminLogin} className="p-6 md:p-10 space-y-6">
              {loginError && <div className="text-rose-600 text-[10px] font-black uppercase text-center">{loginError}</div>}
              <div className="space-y-4">
                <input type="text" autoFocus required value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 font-bold" placeholder="Username" />
                <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 font-bold" placeholder="Password" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl">Authorize</button>
              <button type="button" onClick={() => setShowAdminLogin(false)} className="w-full text-slate-400 font-black text-[10px] uppercase py-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="print-only">
        <PaperPreview mode={mode} metadata={paperMetadata} sections={sections} questions={questions} selectedBankQuestionIds={selectedQuestionIds} />
      </div>
    </div>
  );
};

export default App;
