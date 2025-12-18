
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Wallet, Fuel, BarChart3, Settings, 
  Cpu, Smartphone, Layers, AlertCircle, 
  ChevronLeft, ChevronRight, LogOut, RotateCcw,
  Target, TrendingUp, CheckCircle2, Trash2, Plus, HeartOff, User
} from 'lucide-react';

// --- الثوابت ---
const API_URL = "https://script.google.com/macros/s/AKfycbygAwOcqosMpmUokaaZZVrgPRRt__AZO8jVqW4koRAg4VB7fwPvrgOGC8OPSf2UEyLPxQ/exec";
const SYSTEM_KEY = 'stc_pro_v14_system';
const AUTH_KEY = 'stc_pro_v14_auth_user';
const LABELS: Record<string, string> = { 
  jawwy: 'شريحة جوّي', 
  sawa: 'شريحة سوا', 
  multi: 'عميل متعددة', 
  issue: 'لم يتم الاكمال' 
};

const App = () => {
  const [system, setSystem] = useState<any>({
    users: [{ 
      id: 'talal-admin', username: 'talal', password: '00966', role: 'admin', name: 'طلال المندوب',
      db: { tx: [], stock: { jawwy: 0, sawa: 0, multi: 0 }, damaged: { jawwy: 0, sawa: 0, multi: 0 }, stockLog: [], fuelLog: [], settings: { weeklyTarget: 3000 } }
    }]
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeView, setActiveView] = useState('home');
  const [isSyncing, setIsSyncing] = useState(false);
  const [curDate, setCurDate] = useState(new Date());
  const [modalType, setModalType] = useState<string | null>(null);
  const [tempSim, setTempSim] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  useEffect(() => {
    const local = localStorage.getItem(SYSTEM_KEY);
    let currentSystem = system;
    if (local) {
        try { 
          const parsed = JSON.parse(local);
          if (parsed && parsed.users) {
            setSystem(parsed);
            currentSystem = parsed;
          }
        } catch(e) { console.error("Local load error:", e); }
    }
    
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth) {
      const user = currentSystem.users.find((u: any) => u.id === auth);
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
        if (auth) setCurrentUser(data.users.find((u: any) => u.id === auth));
      }
    } catch (e) { console.warn("Offline Mode Active"); }
    finally { setIsSyncing(false); }
  };

  const updateDb = (updater: (db: any) => any) => {
    if (!currentUser) return;
    const nextDb = updater(currentUser.db);
    const nextUsers = system.users.map((u: any) => u.id === currentUser.id ? { ...u, db: nextDb } : u);
    const nextSystem = { ...system, users: nextUsers };
    setSystem(nextSystem);
    setCurrentUser({ ...currentUser, db: nextDb });
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(nextSystem));
    fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(nextSystem) }).catch(() => {});
  };

  const handleSale = (amt: number, sims: number) => {
    if (!tempSim) return;
    updateDb(db => ({
      ...db,
      tx: [{ id: Date.now(), date: curDate.toISOString(), type: tempSim, amt, sims }, ...db.tx],
      stock: { ...db.stock, [tempSim]: tempSim !== 'issue' ? (db.stock[tempSim] || 0) - sims : 0 }
    }));
    setModalType(null);
    setTempSim(null);
  };

  const db = currentUser?.db;
  
  const dayTx = useMemo(() => {
    if (!db?.tx) return [];
    return db.tx.filter((t: any) => new Date(t.date).toDateString() === curDate.toDateString());
  }, [db, curDate]);
  
  const dayTotal = useMemo(() => dayTx.reduce((s: number, t: any) => s + (t.amt || 0), 0), [dayTx]);

  const targetMetrics = useMemo(() => {
    if (!db) return { percent: 0, sales: 0, target: 3000 };
    const d = new Date(curDate);
    const sun = new Date(d.setDate(d.getDate() - d.getDay())); 
    sun.setHours(0,0,0,0);
    const sales = db.tx.filter((t: any) => new Date(t.date) >= sun).reduce((s: number,t: any) => s + (t.amt || 0), 0);
    const target = db.settings?.weeklyTarget || 3000;
    return { sales, target, percent: Math.min(100, Math.round((sales/target)*100)) };
  }, [db, curDate]);

  if (!currentUser) return (
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl text-center border border-zinc-100">
        <div className="bg-stc-purple p-6 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-xl">
          <img src="https://www.stc.com.sa/content/dam/stc/footer-icons/stc-badge-purple.svg" className="brightness-0 invert" alt="STC" />
        </div>
        <h1 className="text-2xl font-black text-stc-purple mb-8 tracking-tighter uppercase">مستر مندوب Pro</h1>
        <div className="space-y-4">
          <input type="text" placeholder="اسم المستخدم" className="w-full bg-zinc-50 p-5 rounded-2xl text-center font-bold outline-none border border-transparent focus:border-stc-purple/20" onChange={e=>setLoginForm({...loginForm, user:e.target.value})} />
          <input type="password" placeholder="كلمة المرور" className="w-full bg-zinc-50 p-5 rounded-2xl text-center font-bold outline-none border border-transparent focus:border-stc-purple/20" onChange={e=>setLoginForm({...loginForm, pass:e.target.value})} />
          <button onClick={() => {
            const u = system.users.find((x: any) => x.username === loginForm.user && x.password === loginForm.pass);
            if (u) { setCurrentUser(u); localStorage.setItem(AUTH_KEY, u.id); }
            else alert('بيانات الدخول غير صحيحة');
          }} className="w-full bg-stc-purple text-white py-5 rounded-2xl font-black shadow-lg shadow-stc-purple/20 active:scale-95 transition-transform">دخول آمن</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FE] pb-32">
      <header className="bg-gradient-to-br from-stc-purple to-stc-dark pt-12 pb-10 px-6 rounded-b-[3.5rem] shadow-2xl sticky top-0 z-50 text-white">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><User size={20}/></div>
            <div className="text-right">
              <span className="block text-[10px] opacity-60 font-bold">مرحباً بك</span>
              <span className="block font-black text-sm leading-none">{String(currentUser.name || 'مستخدم')}</span>
            </div>
          </div>
          <button onClick={sync} className={`p-2 bg-white/10 rounded-xl ${isSyncing ? 'animate-spin' : ''}`}><RotateCcw size={20}/></button>
        </div>
        <div className="flex justify-center items-center gap-6 bg-black/10 p-3 rounded-2xl backdrop-blur-md">
          <button onClick={() => setCurDate(d => {
            const next = new Date(d);
            next.setDate(next.getDate() - 1);
            return next;
          })}><ChevronRight size={20}/></button>
          <div className="text-center min-w-[120px]">
            <span className="block font-black text-xl">{curDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{curDate.toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
          </div>
          <button onClick={() => setCurDate(d => {
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            return next;
          })}><ChevronLeft size={20}/></button>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-lg mx-auto">
        {activeView === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="مبيعات اليوم" value={`${dayTotal} ﷼`} icon={<TrendingUp size={18}/>} color="purple" />
              <StatCard label="إجمالي الطلبات" value={String(dayTx.length)} icon={<CheckCircle2 size={18}/>} color="emerald" />
            </div>

            <div className="bg-stc-purple p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-10"><Target size={150}/></div>
              <div className="relative z-10">
                <h3 className="text-xs font-black opacity-60 mb-3 tracking-widest uppercase">الهدف الأسبوعي</h3>
                <div className="flex justify-between items-end mb-6">
                  <span className="text-5xl font-black">{String(targetMetrics.sales)} <small className="text-sm opacity-40">/ {String(targetMetrics.target)}</small></span>
                  <div className="text-center">
                    <span className="text-2xl font-black block">{String(targetMetrics.percent)}%</span>
                    <span className="text-[8px] opacity-60 font-bold">مكتمل</span>
                  </div>
                </div>
                <div className="h-3 bg-black/20 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${targetMetrics.percent}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ActionBtn label="جوّي" icon={<Cpu className="text-orange-500" />} stock={db?.stock?.jawwy} onClick={() => { setTempSim('jawwy'); setModalType('price'); }} />
              <ActionBtn label="سوا" icon={<Smartphone className="text-stc-purple" />} stock={db?.stock?.sawa} onClick={() => { setTempSim('sawa'); setModalType('price'); }} />
              <ActionBtn label="متعددة" icon={<Layers className="text-amber-500" />} stock={db?.stock?.multi} onClick={() => { setTempSim('multi'); setModalType('multi'); }} />
              <ActionBtn label="تعثر" icon={<AlertCircle className="text-zinc-400" />} onClick={() => { if(confirm('تسجيل طلب لم يكتمل؟')){ setTempSim('issue'); handleSale(10, 0); } }} />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-zinc-400 px-2 tracking-widest uppercase text-right">سجل العمليات</h4>
              {dayTx.map((t: any) => (
                <div key={t.id} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-zinc-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-50 rounded-2xl"><SimIcon type={t.type} size={20}/></div>
                    <div className="text-right">
                      <span className="block font-black text-sm">{String(LABELS[t.type] || t.type)}</span>
                      <span className="text-[10px] font-bold text-zinc-300">{new Date(t.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-stc-purple">{String(t.amt)} ﷼</span>
                    <button onClick={() => updateDb(d => ({ 
                      ...d, 
                      tx: d.tx.filter((x: any) => x.id !== t.id), 
                      stock: { ...d.stock, [t.type]: t.type !== 'issue' ? (d.stock[t.type] || 0) + (t.sims || 0) : 0 } 
                    }))} className="text-zinc-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {dayTx.length === 0 && <div className="p-12 text-center text-zinc-300 font-bold border-2 border-dashed border-zinc-100 rounded-[2rem]">لا توجد عمليات مسجلة اليوم</div>}
            </div>
          </>
        )}

        {activeView === 'inv' && <InventoryView db={db} updateDb={updateDb} />}
        {activeView === 'fuel' && <FuelView db={db} updateDb={updateDb} />}
        {activeView === 'settings' && (
            <div className="space-y-6 text-right">
                <h2 className="text-xl font-black text-stc-purple px-2">الإعدادات</h2>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
                    <button onClick={() => { localStorage.removeItem(AUTH_KEY); window.location.reload(); }} className="w-full flex items-center justify-between text-red-500 font-bold p-2">
                        <span>تسجيل الخروج</span>
                        <LogOut size={20}/>
                    </button>
                </div>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl p-5 pb-10 border-t border-zinc-100 grid grid-cols-5 gap-4 shadow-2xl z-50">
        <NavIcon icon={<Home size={22}/>} active={activeView === 'home'} onClick={()=>setActiveView('home')} />
        <NavIcon icon={<Wallet size={22}/>} active={activeView === 'inv'} onClick={()=>setActiveView('inv')} />
        <NavIcon icon={<Fuel size={22}/>} active={activeView === 'fuel'} onClick={()=>setActiveView('fuel')} />
        <NavIcon icon={<BarChart3 size={22}/>} active={activeView === 'rep'} onClick={()=>setActiveView('rep')} />
        <NavIcon icon={<Settings size={22}/>} active={activeView === 'settings'} onClick={()=>setActiveView('settings')} />
      </nav>

      {modalType === 'price' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end animate-in fade-in slide-in-from-bottom duration-300" onClick={()=>setModalType(null)}>
          <div className="w-full bg-white rounded-t-[3.5rem] p-10 pb-16" onClick={e=>e.stopPropagation()}>
            <div className="w-12 h-1 bg-zinc-100 rounded-full mx-auto mb-8" />
            <h3 className="text-xl font-black mb-8 text-right text-stc-purple">وقت التوصيل؟ ⏱️</h3>
            <div className="space-y-4">
              {(tempSim === 'jawwy' ? [30, 25, 20] : [28, 24, 20]).map((p, i) => (
                <button key={p} onClick={() => handleSale(p, 1)} className="w-full bg-zinc-50 p-6 rounded-2xl flex justify-between items-center hover:bg-stc-purple hover:text-white transition-all active:scale-95 group">
                  <span className="font-black text-zinc-700 group-hover:text-white">{['أقل من ساعتين', '2-3 ساعات', 'أكثر من 3 ساعات'][i]}</span>
                  <span className="bg-stc-purple text-white px-4 py-2 rounded-xl font-black group-hover:bg-white group-hover:text-stc-purple">{p} ﷼</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalType === 'multi' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end animate-in fade-in slide-in-from-bottom duration-300" onClick={()=>setModalType(null)}>
          <div className="w-full bg-white rounded-t-[3.5rem] p-10 pb-16" onClick={e=>e.stopPropagation()}>
            <div className="w-12 h-1 bg-zinc-100 rounded-full mx-auto mb-8" />
            <h3 className="text-xl font-black mb-8 text-right text-stc-purple">عدد الشرائح؟</h3>
            <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(n => (
                    <button key={n} onClick={() => { setModalType('price'); }} className="bg-zinc-50 p-6 rounded-2xl font-black text-lg active:bg-stc-purple active:text-white">{n}</button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600"
  };
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-50 flex items-center justify-between">
      <div className={`p-3 rounded-2xl ${colorMap[color] || 'bg-zinc-50 text-zinc-600'}`}>{icon}</div>
      <div className="text-left">
        <span className="text-[10px] font-black text-zinc-300 block uppercase mb-1">{String(label)}</span>
        <span className="text-xl font-black leading-none tracking-tighter text-zinc-800">{String(value)}</span>
      </div>
    </div>
  );
};

const ActionBtn = ({ label, icon, stock, onClick }: { label: string; icon: React.ReactNode; stock?: number; onClick: () => void }) => (
  <button onClick={onClick} className="bg-white p-6 rounded-[2.5rem] text-center border border-zinc-50 shadow-sm relative group hover:shadow-md transition-all active:scale-95">
    {stock !== undefined && (
        <span className={`absolute top-4 left-4 text-[8px] font-black px-2 py-0.5 rounded-full ${stock <= 2 ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
            {String(stock)}
        </span>
    )}
    <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">{icon}</div>
    <span className="font-black text-xs text-zinc-700 tracking-tight">{String(label)}</span>
  </button>
);

const NavIcon = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex justify-center p-4 rounded-2xl transition-all ${active ? 'bg-stc-purple text-white shadow-xl shadow-stc-purple/20' : 'text-zinc-400 hover:text-zinc-600'}`}>{icon}</button>
);

const SimIcon = ({ type, size }: any) => {
  if (type === 'jawwy') return <Cpu size={size} className="text-orange-500" />;
  if (type === 'sawa') return <Smartphone size={size} className="text-stc-purple" />;
  if (type === 'multi') return <Layers size={size} className="text-amber-500" />;
  return <AlertCircle size={size} className="text-zinc-400" />;
};

const InventoryView = ({ db, updateDb }: any) => (
  <div className="space-y-6 animate-in fade-in duration-500 text-right">
    <h2 className="text-xl font-black text-stc-purple px-2">إدارة المخزون</h2>
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(db?.stock || {}).map(([k, v]) => (
        <div key={k} className="bg-white p-6 rounded-3xl text-center shadow-sm border border-zinc-50">
          <span className="block text-3xl font-black text-stc-purple mb-1 tracking-tighter">{String(v)}</span>
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{String(LABELS[k] || k)}</span>
        </div>
      ))}
    </div>
    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-sm">
      <h3 className="text-rose-600 font-black text-xs mb-4 flex items-center gap-2 justify-end"><HeartOff size={14}/> سلة المرتجعات / التوالف</h3>
      <div className="flex justify-around text-center">
        {Object.entries(db?.damaged || {}).map(([k, v]) => (
          <div key={k}>
            <span className="block font-black text-rose-600 text-lg">{String(v)}</span>
            <span className="text-[9px] font-bold text-rose-300 uppercase">{String(LABELS[k] || k)}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-3">
        <button onClick={() => {
            const type = prompt('النوع؟ (jawwy, sawa, multi)');
            const qty = prompt('الكمية؟');
            if(type && qty) updateDb((d: any) => ({ 
              ...d, 
              stock: { ...d.stock, [type]: (d.stock[type] || 0) + parseInt(qty || '0') } 
            }));
        }} className="w-full bg-emerald-50 text-emerald-600 p-6 rounded-2xl font-black flex justify-between items-center shadow-sm border border-emerald-100">
            <span>إضافة مخزون يدوي</span>
            <Plus size={20}/>
        </button>
    </div>
  </div>
);

const FuelView = ({ db, updateDb }: any) => (
    <div className="space-y-6 animate-in fade-in duration-500 text-right">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-100">
            <h3 className="text-stc-purple font-black mb-6 flex items-center gap-2 justify-end"><Fuel size={20}/> تسجيل وقود</h3>
            <div className="space-y-4">
                <input type="number" placeholder="المبلغ (﷼)" className="w-full bg-zinc-50 p-5 rounded-2xl font-bold outline-none border border-transparent focus:border-stc-purple/20 text-center" id="f-amt" />
                <button onClick={() => {
                    const input = document.getElementById('f-amt') as HTMLInputElement;
                    const amt = input?.value;
                    if(!amt) return;
                    updateDb((d: any) => ({
                        ...d,
                        fuelLog: [{ id: Date.now(), date: new Date().toISOString(), amount: parseFloat(amt), type: '91' }, ...(d.fuelLog || [])]
                    }));
                    if (input) input.value = '';
                }} className="w-full bg-stc-purple text-white py-5 rounded-2xl font-black shadow-lg shadow-stc-purple/20 active:scale-95 transition-transform">حفظ السجل</button>
            </div>
        </div>
        <div className="space-y-3">
            {(db?.fuelLog || []).map((f: any) => (
                <div key={f.id} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-zinc-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-50 p-3 rounded-2xl text-stc-purple"><Fuel size={18}/></div>
                        <div className="text-right">
                            <span className="block font-black text-sm">{String(f.amount)} ﷼</span>
                            <span className="text-[10px] font-bold text-zinc-300 tracking-wider">{new Date(f.date).toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default App;
