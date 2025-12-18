import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Wallet, Fuel, BarChart3, Settings, 
  Cpu, Smartphone, Layers, AlertCircle, 
  ChevronLeft, ChevronRight, LogOut, RotateCcw,
  Target, TrendingUp, CheckCircle, Trash2, Plus, ArrowLeftRight, HeartOff, User
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip
} from 'recharts';

// --- الثوابت ---
const API_URL = "https://script.google.com/macros/s/AKfycbygAwOcqosMpmUokaaZZVrgPRRt__AZO8jVqW4koRAg4VB7fwPvrgOGC8OPSf2UEyLPxQ/exec";
const SYSTEM_KEY = 'stc_pro_v14_system';
const AUTH_KEY = 'stc_pro_v14_auth_user';
const LABELS = { jawwy: 'شريحة جوّي', sawa: 'شريحة سوا', multi: 'عميل متعددة', issue: 'لم يتم الاكمال' };
const FUEL_PRICES = { '91': 2.18, '95': 2.33, 'diesel': 1.15 };

const App = () => {
  // --- الحالات (States) ---
  const [system, setSystem] = useState({
    users: [{ 
      id: 'talal-admin', username: 'talal', password: '00966', role: 'admin', name: 'طلال المندوب',
      db: { tx: [], stock: { jawwy: 0, sawa: 0, multi: 0 }, damaged: { jawwy: 0, sawa: 0, multi: 0 }, stockLog: [], fuelLog: [], settings: { weeklyTarget: 3000 } }
    }],
    globalTheme: 'light'
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [isSyncing, setIsSyncing] = useState(false);
  const [curDate, setCurDate] = useState(new Date());
  const [modalType, setModalType] = useState(null);
  const [tempSim, setTempSim] = useState(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  // --- التحميل والمزامنة ---
  useEffect(() => {
    const local = localStorage.getItem(SYSTEM_KEY);
    if (local) setSystem(JSON.parse(local));
    
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth) {
      const user = JSON.parse(local || '{"users":[]}').users.find(u => u.id === auth);
      if (user) setCurrentUser(user);
    }
    sync();
  }, []);

  const sync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data?.users) {
        setSystem(data);
        localStorage.setItem(SYSTEM_KEY, JSON.stringify(data));
        const auth = localStorage.getItem(AUTH_KEY);
        if (auth) setCurrentUser(data.users.find(u => u.id === auth));
      }
    } catch (e) { console.warn("Offline Mode"); }
    finally { setIsSyncing(false); }
  };

  const updateDb = (updater) => {
    if (!currentUser) return;
    const nextDb = updater(currentUser.db);
    const nextUsers = system.users.map(u => u.id === currentUser.id ? { ...u, db: nextDb } : u);
    const nextSystem = { ...system, users: nextUsers };
    setSystem(nextSystem);
    setCurrentUser({ ...currentUser, db: nextDb });
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(nextSystem));
    fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(nextSystem) });
  };

  // --- العمليات ---
  const handleSale = (amt, sims) => {
    updateDb(db => ({
      ...db,
      tx: [{ id: Date.now(), date: curDate.toISOString(), type: tempSim, amt, sims }, ...db.tx],
      stock: { ...db.stock, [tempSim]: tempSim !== 'issue' ? db.stock[tempSim] - sims : 0 }
    }));
    setModalType(null);
  };

  const db = currentUser?.db;
  const dayTx = useMemo(() => db?.tx.filter(t => new Date(t.date).toDateString() === curDate.toDateString()) || [], [db, curDate]);
  const dayTotal = dayTx.reduce((s, t) => s + t.amt, 0);

  const targetMetrics = useMemo(() => {
    if (!db) return { percent: 0, sales: 0, target: 3000 };
    const d = new Date(curDate);
    const sun = new Date(d.setDate(d.getDate() - d.getDay())); sun.setHours(0,0,0,0);
    const sales = db.tx.filter(t => new Date(t.date) >= sun).reduce((s,t) => s + t.amt, 0);
    const target = db.settings.weeklyTarget || 3000;
    return { sales, target, percent: Math.min(100, Math.round((sales/target)*100)) };
  }, [db, curDate]);

  // --- واجهة الدخول ---
  if (!currentUser) return (
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl text-center">
        <div className="bg-stc-purple p-6 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl">
          <img src="https://www.stc.com.sa/content/dam/stc/footer-icons/stc-badge-purple.svg" className="brightness-0 invert" alt="STC" />
        </div>
        <h1 className="text-2xl font-black text-stc-purple mb-8 uppercase tracking-tighter">مستر مندوب Pro</h1>
        <div className="space-y-4">
          <input type="text" placeholder="اسم المستخدم" className="w-full bg-zinc-50 p-5 rounded-2xl text-center font-bold outline-none" onChange={e=>setLoginForm({...loginForm, user:e.target.value})} />
          <input type="password" placeholder="كلمة المرور" className="w-full bg-zinc-50 p-5 rounded-2xl text-center font-bold outline-none" onChange={e=>setLoginForm({...loginForm, pass:e.target.value})} />
          <button onClick={() => {
            const u = system.users.find(x => x.username === loginForm.user && x.password === loginForm.pass);
            if (u) { setCurrentUser(u); localStorage.setItem(AUTH_KEY, u.id); }
            else alert('خطأ في البيانات');
          }} className="w-full bg-stc-purple text-white py-5 rounded-2xl font-black shadow-lg shadow-stc-purple/20">دخول آمن</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FE] pb-32">
      {/* Header */}
      <header className="bg-gradient-to-br from-stc-purple to-stc-dark pt-12 pb-10 px-6 rounded-b-[3.5rem] shadow-2xl sticky top-0 z-50 text-white">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            {/* Fix: Replaced non-existent UserIcon with User */}
            <div className="bg-white/20 p-2 rounded-xl"><User size={20}/></div>
            <div className="text-right">
              <span className="block text-[10px] opacity-60">مرحباً بك</span>
              <span className="block font-black text-sm leading-none">{currentUser.name}</span>
            </div>
          </div>
          <button onClick={sync} className={`p-2 bg-white/10 rounded-xl ${isSyncing ? 'animate-spin' : ''}`}><RotateCcw size={20}/></button>
        </div>
        <div className="flex justify-center items-center gap-6 bg-black/10 p-3 rounded-2xl backdrop-blur-md">
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() - 1)))}><ChevronRight/></button>
          <div className="text-center min-w-[120px]">
            <span className="block font-black text-xl">{curDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{curDate.toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
          </div>
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() + 1)))}><ChevronLeft/></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-8 max-w-lg mx-auto">
        {activeView === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="مبيعات اليوم" value={`${dayTotal} ﷼`} icon={<TrendingUp size={18}/>} color="stc-purple" />
              <StatCard label="إجمالي الطلبات" value={String(dayTx.length)} icon={<CheckCircle size={18}/>} color="emerald-600" />
            </div>

            <div className="bg-stc-purple p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-10"><Target size={150}/></div>
              <div className="relative z-10">
                <h3 className="text-xs font-black opacity-60 mb-3 tracking-widest">الهدف الأسبوعي</h3>
                <div className="flex justify-between items-end mb-6">
                  <span className="text-5xl font-black">{targetMetrics.sales} <small className="text-sm opacity-40">/ {targetMetrics.target}</small></span>
                  <div className="text-center">
                    <span className="text-2xl font-black block">{targetMetrics.percent}%</span>
                    <span className="text-[8px] opacity-60">إنجاز</span>
                  </div>
                </div>
                <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${targetMetrics.percent}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ActionBtn label="جوّي" icon={<Cpu className="text-orange-500" />} stock={db.stock.jawwy} onClick={() => { setTempSim('jawwy'); setModalType('price'); }} />
              <ActionBtn label="سوا" icon={<Smartphone className="text-stc-purple" />} stock={db.stock.sawa} onClick={() => { setTempSim('sawa'); setModalType('price'); }} />
              <ActionBtn label="متعددة" icon={<Layers className="text-amber-500" />} stock={db.stock.multi} onClick={() => setModalType('multi')} />
              {/* Fix: Added explicit stock prop to fulfill component signature */}
              <ActionBtn label="تعثر" stock={undefined} icon={<AlertCircle className="text-zinc-400" />} onClick={() => { if(confirm('تسجيل تعثر؟')){ setTempSim('issue'); handleSale(10, 0); } }} />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-zinc-400 px-2 tracking-widest uppercase">سجل اليوم</h4>
              {dayTx.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-zinc-50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-50 rounded-2xl"><SimIcon type={t.type} size={20}/></div>
                    <div>
                      <span className="block font-black text-sm">{LABELS[t.type]}</span>
                      <span className="text-[10px] font-bold text-zinc-400">{new Date(t.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-stc-purple">{t.amt} ﷼</span>
                    <button onClick={() => updateDb(d => ({ ...d, tx: d.tx.filter(x => x.id !== t.id), stock: { ...d.stock, [t.type]: t.type !== 'issue' ? d.stock[t.type] + t.sims : 0 } }))} className="text-zinc-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {dayTx.length === 0 && <div className="p-12 text-center text-zinc-300 font-bold border-2 border-dashed border-zinc-100 rounded-[2rem]">لا يوجد عمليات اليوم</div>}
            </div>
          </>
        )}

        {/* المكونات الأخرى (المخزون، الوقود، الخ) يمكن إضافتها هنا بنفس النمط */}
        {activeView === 'inv' && <InventoryView db={db} updateDb={updateDb} />}
        {activeView === 'fuel' && <FuelView db={db} updateDb={updateDb} />}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl p-5 pb-10 border-t border-zinc-100 grid grid-cols-5 gap-4 shadow-2xl">
        <NavIcon icon={<Home/>} active={activeView === 'home'} onClick={()=>setActiveView('home')} />
        <NavIcon icon={<Wallet/>} active={activeView === 'inv'} onClick={()=>setActiveView('inv')} />
        <NavIcon icon={<Fuel/>} active={activeView === 'fuel'} onClick={()=>setActiveView('fuel')} />
        <NavIcon icon={<BarChart3/>} active={activeView === 'rep'} onClick={()=>setActiveView('rep')} />
        <NavIcon icon={<Settings/>} active={activeView === 'settings'} onClick={()=>setActiveView('settings')} />
      </nav>

      {/* Modals */}
      {modalType === 'price' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end animate-in fade-in slide-in-from-bottom duration-300">
          <div className="w-full bg-white rounded-t-[3.5rem] p-10 pb-16">
            <div className="w-12 h-1 bg-zinc-100 rounded-full mx-auto mb-8" />
            <h3 className="text-xl font-black mb-8 text-right text-stc-purple">مدة التوصيل؟ ⏱️</h3>
            <div className="space-y-4">
              {(tempSim === 'jawwy' ? [30, 25, 20] : [28, 24, 20]).map((p, i) => (
                <button key={p} onClick={() => handleSale(p, 1)} className="w-full bg-zinc-50 p-6 rounded-2xl flex justify-between items-center hover:bg-stc-purple/5 transition-colors">
                  <span className="font-black text-zinc-700">{['أقل من ساعتين', '2-3 ساعات', 'أكثر من 3 ساعات'][i]}</span>
                  <span className="bg-stc-purple text-white px-4 py-2 rounded-xl font-black">{p} ﷼</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setModalType(null)} className="w-full mt-6 text-zinc-400 font-bold py-4">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- المكونات الفرعية ---
const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-50 flex items-center justify-between">
    <div className={`p-3 rounded-2xl bg-${color}/10 text-${color}`}>{icon}</div>
    <div className="text-left">
      <span className="text-[10px] font-black text-zinc-400 block uppercase mb-1">{label}</span>
      <span className={`text-xl font-black text-${color} leading-none tracking-tighter`}>{value}</span>
    </div>
  </div>
);

const ActionBtn = ({ label, icon, stock, onClick }) => (
  <button onClick={onClick} className="bg-white p-6 rounded-[2.5rem] text-center border border-zinc-50 shadow-sm relative group hover:shadow-md transition-all">
    {stock !== undefined && <span className={`absolute top-4 left-4 text-[8px] font-black px-2 py-0.5 rounded-full ${stock <= 2 ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>{stock}</span>}
    <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">{icon}</div>
    <span className="font-black text-xs text-zinc-800 tracking-tight">{label}</span>
  </button>
);

const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`flex justify-center p-4 rounded-2xl transition-all ${active ? 'bg-stc-purple text-white shadow-xl shadow-stc-purple/20' : 'text-zinc-400 hover:text-zinc-600'}`}>{icon}</button>
);

const SimIcon = ({ type, size }) => {
  if (type === 'jawwy') return <Cpu size={size} className="text-orange-500" />;
  if (type === 'sawa') return <Smartphone size={size} className="text-stc-purple" />;
  if (type === 'multi') return <Layers size={size} className="text-amber-500" />;
  return <AlertCircle size={size} />;
};

// --- واجهات إضافية ---
const InventoryView = ({ db, updateDb }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <h2 className="text-xl font-black text-stc-purple px-2">إدارة المخزون</h2>
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(db.stock).map(([k, v]) => (
        <div key={k} className="bg-white p-6 rounded-3xl text-center shadow-sm">
          {/* Fix: Wrapped unknown value v in String() to ensure it's a valid ReactNode */}
          <span className="block text-3xl font-black text-stc-purple mb-1">{String(v)}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{LABELS[k]}</span>
        </div>
      ))}
    </div>
    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
      <h3 className="text-red-600 font-black text-xs mb-4 flex items-center gap-2"><HeartOff size={14}/> سلة التوالف</h3>
      <div className="flex justify-around text-center">
        {Object.entries(db.damaged).map(([k, v]) => (
          <div key={k}>
            {/* Fix: Wrapped unknown value v in String() to ensure it's a valid ReactNode */}
            <span className="block font-black text-red-600">{String(v)}</span>
            <span className="text-[9px] font-bold text-red-300 uppercase">{LABELS[k]}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-3">
        <button onClick={() => {
            const qty = prompt('الكمية المستلمة؟');
            if(qty) updateDb(d => ({ ...d, stock: { ...d.stock, jawwy: d.stock.jawwy + parseInt(qty) } }));
        }} className="w-full bg-emerald-50 text-emerald-600 p-6 rounded-2xl font-black flex justify-between items-center shadow-sm">
            <span>استلام مخزون جديد (جوّي مثال)</span>
            <Plus size={20}/>
        </button>
    </div>
  </div>
);

const FuelView = ({ db, updateDb }) => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
            <h3 className="text-stc-purple font-black mb-6 flex items-center gap-2"><Fuel size={20}/> تسجيل تعبئة وقود</h3>
            <div className="space-y-4">
                <input type="number" placeholder="المبلغ بالريال" className="w-full bg-zinc-50 p-5 rounded-2xl font-bold outline-none" id="f-amt" />
                <button onClick={() => {
                    {/* Fix: Cast HTMLElement to HTMLInputElement to access .value property */}
                    const amtInput = document.getElementById('f-amt') as HTMLInputElement;
                    const amt = amtInput?.value;
                    if(!amt) return;
                    updateDb(d => ({
                        ...d,
                        fuelLog: [{ id: Date.now(), date: new Date().toISOString(), amount: parseFloat(amt), type: '91' }, ...d.fuelLog]
                    }));
                    if (amtInput) amtInput.value = '';
                }} className="w-full bg-stc-purple text-white py-5 rounded-2xl font-black">حفظ السجل</button>
            </div>
        </div>
        <div className="space-y-3">
            {db.fuelLog.map(f => (
                <div key={f.id} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-50 p-3 rounded-2xl"><Fuel size={18} className="text-stc-purple"/></div>
                        <div>
                            <span className="block font-black text-sm">{f.amount} ﷼</span>
                            <span className="text-[10px] text-zinc-400">{new Date(f.date).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default App;