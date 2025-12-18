
import React, { useState, useEffect, useMemo } from 'react';
import { UserData, View, SimType, Transaction, FuelLog, SystemState, UserRole } from './types.ts';
import { LABELS, API_URL, ICONS, FUEL_PRICES } from './constants.tsx';
import { 
  Target, Trash2, Calendar, Droplets, TrendingUp, 
  ArrowLeftRight, Activity, Moon, Sun, Printer, 
  Wallet, Download, CloudUpload, Eye, EyeOff, 
  Fuel, History, Cpu, Layers, AlertCircle, Smartphone,
  Lock, Users, LogOut, ShieldCheck, UserPlus, Key, User as UserIcon,
  Plus, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight, BarChart3,
  Home, Settings, Clock, Gauge, Trash, Info, Zap, PieChart as PieChartIcon,
  Save, CheckCircle, Smartphone as Phone, Fuel as GasIcon,
  LayoutDashboard, Box, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, CartesianGrid,
  PieChart, Pie, Legend, Cell as PieCell
} from 'recharts';

const SYSTEM_KEY = 'stc_pro_v14_system';
const AUTH_KEY = 'stc_pro_v14_auth_user';

// مكون الأيقونات المطور
const SimIcon = ({ type, size = 24 }: { type: SimType | 'all', size?: number }) => {
  if (type === 'jawwy') return <Cpu size={size} className="text-orange-500" />;
  if (type === 'sawa') return <Smartphone size={size} className="text-stc-purple dark:text-purple-400" />;
  if (type === 'multi') return <Layers size={size} className="text-amber-500" />;
  if (type === 'issue') return <AlertCircle size={size} className="text-zinc-500" />;
  return <Box size={size} />;
};

const App: React.FC = () => {
  // --- States ---
  const [system, setSystem] = useState<SystemState>({
    users: [
      { 
        id: 'talal-admin', 
        username: 'talal', 
        password: '00966', 
        role: 'admin', 
        name: 'طلال المندوب',
        db: { tx: [], stock: { jawwy: 0, sawa: 0, multi: 0 }, damaged: { jawwy: 0, sawa: 0, multi: 0 }, stockLog: [], fuelLog: [], settings: { weeklyTarget: 3000, showWeeklyTarget: true, preferredFuel: '91' } }
      }
    ],
    globalTheme: 'light'
  });

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeView, setActiveView] = useState<View>('home');
  const [curDate, setCurDate] = useState(new Date());
  const [modalType, setModalType] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [tempSim, setTempSim] = useState<SimType | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [stockMode, setStockMode] = useState<'add' | 'return' | 'to_damaged' | 'manage_damaged'>('add');

  const [repMonth, setRepMonth] = useState(new Date().getMonth());
  const [repYear, setRepYear] = useState(new Date().getFullYear());
  const [repWeekIndex, setRepWeekIndex] = useState(0);

  const [loginForm, setLoginForm] = useState({ user: '', pass: '', remember: true });

  // --- Core Logic ---
  useEffect(() => {
    const localSystem = localStorage.getItem(SYSTEM_KEY);
    const localAuth = localStorage.getItem(AUTH_KEY);
    
    if (localSystem) {
      const parsed = JSON.parse(localSystem);
      setSystem(parsed);
      if (parsed.globalTheme === 'dark') document.documentElement.classList.add('dark');
    }

    if (localAuth) {
      const user = (JSON.parse(localSystem || '{}').users || system.users).find((u: any) => u.id === localAuth);
      if (user) {
        setCurrentUser(user);
        setActiveView('home');
      }
    }
    syncWithCloud();
  }, []);

  const saveSystem = (updatedSystem: SystemState) => {
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(updatedSystem));
    setSystem(updatedSystem);
    triggerCloudSave(updatedSystem);
  };

  const syncWithCloud = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(API_URL);
      const cloudData = await response.json();
      if (cloudData && cloudData.users) {
        setSystem(cloudData);
        localStorage.setItem(SYSTEM_KEY, JSON.stringify(cloudData));
        const localAuth = localStorage.getItem(AUTH_KEY);
        if (localAuth) {
          const user = cloudData.users.find((u: any) => u.id === localAuth);
          if (user) setCurrentUser(user);
        }
      }
    } catch (e) { console.warn("Offline Mode"); }
    finally { setIsSyncing(false); }
  };

  const triggerCloudSave = async (data: SystemState) => {
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Cloud sync failed"); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = system.users.find(u => u.username === loginForm.user && u.password === loginForm.pass);
    if (user) {
      setCurrentUser(user);
      if (loginForm.remember) localStorage.setItem(AUTH_KEY, user.id);
      setLoginError('');
      setActiveView('home');
    } else {
      setLoginError('بيانات الدخول غير صحيحة');
    }
  };

  const updateCurrentUserDb = (updater: (oldDb: UserData['db']) => UserData['db']) => {
    if (!currentUser) return;
    const nextUsers = system.users.map(u => u.id === currentUser.id ? { ...u, db: updater(u.db) } : u);
    saveSystem({ ...system, users: nextUsers });
    setCurrentUser(prev => prev ? { ...prev, db: updater(prev.db) } : null);
  };

  const confirmSale = (amt: number, sims: number) => {
    if (!tempSim || !currentUser) return;
    updateCurrentUserDb(oldDb => {
      const newStock = { ...oldDb.stock };
      if (tempSim !== 'issue') newStock[tempSim] -= sims;
      return {
        ...oldDb,
        tx: [{ id: Date.now(), date: curDate.toISOString(), type: tempSim, amt, sims }, ...oldDb.tx],
        stock: newStock
      };
    });
    setModalType(null);
  };

  // Fix: Added deleteTx function to handle transaction removal and stock restoration
  const deleteTx = (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return;
    updateCurrentUserDb(oldDb => {
      const txToDelete = oldDb.tx.find(t => t.id === id);
      if (!txToDelete) return oldDb;

      const newStock = { ...oldDb.stock };
      if (txToDelete.type !== 'issue') {
        newStock[txToDelete.type as Exclude<SimType, 'issue'>] += txToDelete.sims;
      }

      return {
        ...oldDb,
        tx: oldDb.tx.filter(t => t.id !== id),
        stock: newStock
      };
    });
  };

  const db = currentUser?.db;
  const dayTx = useMemo(() => db?.tx.filter(t => new Date(t.date).toDateString() === curDate.toDateString()) || [], [db?.tx, curDate]);
  const dayTotal = useMemo(() => dayTx.reduce((sum, t) => sum + t.amt, 0), [dayTx]);

  const targetMetrics = useMemo(() => {
    if (!db) return { percent: 0, weekSales: 0, remain: 0, target: 3000 };
    const d = new Date(curDate);
    const sun = new Date(d.setDate(d.getDate() - d.getDay()));
    sun.setHours(0,0,0,0);
    const sales = db.tx.filter(t => new Date(t.date) >= sun).reduce((s,t) => s + t.amt, 0);
    const target = db.settings.weeklyTarget || 3000;
    return { 
      weekSales: sales, 
      target, 
      percent: Math.min(100, Math.round((sales/target)*100)),
      remain: Math.max(0, target - sales)
    };
  }, [db?.tx, db?.settings.weeklyTarget, curDate]);

  // --- Views ---
  const HomeView = () => (
    <div className="px-5 pt-6 space-y-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ملخص سريع علوي */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="bg-stc-purple/10 p-3 rounded-2xl text-stc-purple dark:text-purple-400"><LayoutDashboard size={20}/></div>
            <div className="text-left">
                <span className="text-[10px] font-black text-zinc-400 block uppercase">مبيعات اليوم</span>
                <span className="text-xl font-black text-stc-purple dark:text-purple-400 leading-none">{dayTotal} <small className="text-[10px]">﷼</small></span>
            </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><CheckCircle size={20}/></div>
            <div className="text-left">
                <span className="text-[10px] font-black text-zinc-400 block uppercase">إجمالي الطلبات</span>
                <span className="text-xl font-black text-emerald-600 leading-none">{dayTx.length}</span>
            </div>
        </div>
      </div>

      {/* بطاقة الهدف الأسبوعي المطورة */}
      <div className="bg-gradient-to-br from-[#4F008C] to-[#2d0050] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-1000"><Target size={200}/></div>
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-sm font-black opacity-60 uppercase tracking-widest mb-1">الهدف الأسبوعي</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tighter leading-none">{targetMetrics.weekSales}</span>
                        <span className="text-lg opacity-40">/ {targetMetrics.target} ﷼</span>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl text-center min-w-[70px]">
                    <span className="text-2xl font-black leading-none block mb-1">{targetMetrics.percent}%</span>
                    <span className="text-[8px] font-black opacity-50 uppercase">الإنجاز</span>
                </div>
            </div>
            <div className="h-3 bg-black/20 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all duration-1000" style={{ width: `${targetMetrics.percent}%` }} />
            </div>
            <div className="flex justify-between items-center text-[10px] font-black opacity-70">
                <span>متبقي لتحقيق الهدف: {targetMetrics.remain} ﷼</span>
                <span className="flex items-center gap-1"><TrendingUp size={12}/> {targetMetrics.percent > 50 ? 'أداء ممتاز' : 'استمر بالعمل'}</span>
            </div>
        </div>
      </div>

      {/* أزرار الخدمات السريعة */}
      <div className="grid grid-cols-2 gap-4">
        <QuickAction label="شريحة جوّي" icon={<SimIcon type="jawwy" size={32}/>} stock={db?.stock.jawwy} onClick={() => { setTempSim('jawwy'); setModalType('price'); }} />
        <QuickAction label="شريحة سوا" icon={<SimIcon type="sawa" size={32}/>} stock={db?.stock.sawa} onClick={() => { setTempSim('sawa'); setModalType('price'); }} />
        <QuickAction label="عميل متعددة" icon={<SimIcon type="multi" size={32}/>} onClick={() => setModalType('multi')} stock={db?.stock.multi} />
        <QuickAction label="تعثر طلب" icon={<SimIcon type="issue" size={32}/>} onClick={() => { if(confirm('تسجيل تعثر؟')){setTempSim('issue'); confirmSale(10, 0);} }} />
      </div>

      {/* التايم لاين */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">سجل عمليات اليوم</h3>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-black text-zinc-500">{dayTx.length} عمليات</span>
        </div>
        <div className="space-y-3">
          {dayTx.map(t => (
            <div key={t.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex justify-between items-center tap-bounce group">
                <div className="flex items-center gap-4 text-right">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl group-hover:bg-stc-purple/5 transition-colors"><SimIcon type={t.type} size={20}/></div>
                    <div>
                        <span className="block font-black text-sm dark:text-zinc-200">{LABELS[t.type]} {t.sims > 0 && `(${t.sims})`}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{new Date(t.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-stc-purple dark:text-purple-400 tracking-tighter">{t.amt} ﷼</span>
                    <button onClick={() => deleteTx(t.id)} className="text-zinc-200 hover:text-rose-500 transition-colors p-2"><Trash2 size={16}/></button>
                </div>
            </div>
          ))}
          {dayTx.length === 0 && <div className="p-12 text-center text-zinc-300 font-bold italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem]">لا يوجد سجلات لليوم</div>}
        </div>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border border-zinc-100">
          <div className="bg-stc-purple p-6 rounded-[2.5rem] w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-stc-purple/20">
            <img src="https://www.stc.com.sa/content/dam/stc/footer-icons/stc-badge-purple.svg" className="brightness-0 invert w-10" alt="STC" />
          </div>
          <h1 className="text-2xl font-black text-stc-purple mb-2 tracking-tight">مستر مندوب Pro</h1>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-10">Premium Business Edition</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="اسم المستخدم" value={loginForm.user} onChange={e=>setLoginForm({...loginForm, user:e.target.value})} className="w-full bg-zinc-50 p-6 rounded-2xl outline-none font-bold text-center border-2 border-transparent focus:border-stc-purple/10 transition-all shadow-inner" />
            <input type="password" placeholder="••••" value={loginForm.pass} onChange={e=>setLoginForm({...loginForm, pass:e.target.value})} className="w-full bg-zinc-50 p-6 rounded-2xl outline-none font-bold text-center border-2 border-transparent focus:border-stc-purple/10 transition-all shadow-inner" />
            {loginError && <p className="text-rose-500 text-[10px] font-black animate-bounce">{loginError}</p>}
            <button className="w-full bg-stc-purple text-white py-6 rounded-2xl font-black shadow-xl shadow-stc-purple/20 tap-bounce">دخول آمن</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${system.globalTheme === 'dark' ? 'dark' : ''} bg-[#F8F9FE] dark:bg-zinc-950 font-tajawal transition-colors duration-500`}>
      <header className="bg-gradient-to-br from-stc-purple to-stc-dark pt-12 pb-8 px-6 rounded-b-[4rem] shadow-2xl sticky top-0 z-50 text-white transition-all overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-10" />
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/20"><UserIcon size={20}/></div>
             <div className="text-right">
                <span className="block text-xs font-black leading-tight opacity-60">أهلاً بك</span>
                <span className="block text-md font-black tracking-tight">{currentUser.name}</span>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={syncWithCloud} className={`p-3 glass rounded-2xl ${isSyncing ? 'animate-spin' : ''}`}><RotateCcw size={18}/></button>
            <button onClick={() => {
              if(confirm('تسجيل خروج؟')){
                setCurrentUser(null);
                localStorage.removeItem(AUTH_KEY);
              }
            }} className="p-3 bg-rose-500/20 text-rose-200 border border-rose-500/20 rounded-2xl"><LogOut size={18}/></button>
          </div>
        </div>
        <div className="flex justify-center items-center gap-4 relative z-10 bg-black/10 p-2 rounded-[2rem] border border-white/5 backdrop-blur-sm mx-auto w-fit">
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() - 1)))} className="p-2 hover:bg-white/10 rounded-full transition-all"><ChevronRight size={24}/></button>
          <div className="px-4 text-center min-w-[140px]">
            <span className="text-lg font-black tracking-tight">{curDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
            <span className="block text-[10px] font-black opacity-50 uppercase tracking-widest leading-none">{curDate.toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
          </div>
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() + 1)))} className="p-2 hover:bg-white/10 rounded-full transition-all"><ChevronLeft size={24}/></button>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {activeView === 'home' && <HomeView />}
        {activeView === 'inv' && <div className="p-5 pb-40 text-center text-zinc-400 font-bold">يتم تحميل المخزون...</div>}
        {activeView === 'fuel' && <div className="p-5 pb-40 text-center text-zinc-400 font-bold">يتم تحميل بيانات الوقود...</div>}
        {activeView === 'rep' && <div className="p-5 pb-40 text-center text-zinc-400 font-bold">يتم تحضير التقارير...</div>}
        {activeView === 'settings' && <div className="p-5 pb-40 text-center text-zinc-400 font-bold">فتح الإعدادات...</div>}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-t border-zinc-100 dark:border-zinc-800 p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <NavItem icon={<Home size={22}/>} active={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavItem icon={<Wallet size={22}/>} active={activeView === 'inv'} onClick={() => setActiveView('inv')} />
          <NavItem icon={<Fuel size={22}/>} active={activeView === 'fuel'} onClick={() => setActiveView('fuel')} />
          <NavItem icon={<BarChart3 size={22}/>} active={activeView === 'rep'} onClick={() => setActiveView('rep')} />
          <NavItem icon={<Settings size={22}/>} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>
      </nav>

      {/* Modals */}
      {modalType === 'price' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end animate-in fade-in duration-300">
            <div className="w-full bg-white dark:bg-zinc-900 rounded-t-[4rem] p-10 pb-16 animate-in slide-in-from-bottom duration-500 shadow-2xl">
                <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-10" />
                <h3 className="text-xl font-black text-stc-purple dark:text-purple-400 mb-8 text-right">مدة التوصيل؟ ⏱️</h3>
                <div className="space-y-4">
                    {(tempSim === 'jawwy' ? [30, 25, 20] : [28, 24, 20]).map((price, i) => (
                        <button key={price} onClick={() => confirmSale(price, 1)} className="w-full bg-zinc-50 dark:bg-zinc-800 p-7 rounded-[2.5rem] flex justify-between items-center tap-bounce border-2 border-transparent hover:border-stc-purple/20 transition-all">
                            <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{['أقل من ساعتين', '2-3 ساعات', 'أكثر من 3 ساعات'][i]}</span>
                            <span className="bg-stc-purple text-white px-5 py-2 rounded-2xl font-black">{price} ﷼</span>
                        </button>
                    ))}
                </div>
                <button onClick={()=>setModalType(null)} className="w-full mt-6 text-zinc-400 font-black text-xs uppercase tracking-widest py-4">إلغاء</button>
            </div>
        </div>
      )}
    </div>
  );
};

// مكونات فرعية
const QuickAction = ({ label, icon, stock, onClick }: any) => (
  <button onClick={onClick} className="bg-white dark:bg-zinc-900 p-7 rounded-[2.5rem] text-center border border-zinc-100 dark:border-zinc-800 shadow-sm tap-bounce group transition-all hover:shadow-md relative overflow-hidden">
    {stock !== undefined && (
        <span className={`absolute top-4 left-4 text-[9px] font-black px-2 py-0.5 rounded-full ${stock <= 2 ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>{stock}</span>
    )}
    <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <span className="font-black text-xs text-zinc-800 dark:text-zinc-200 block tracking-tight">{label}</span>
  </button>
);

const NavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-[2rem] transition-all ${active ? 'bg-stc-purple text-white shadow-xl shadow-stc-purple/20 animate-in zoom-in' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
    {icon}
  </button>
);

export default App;
