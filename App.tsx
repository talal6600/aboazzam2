
import React, { useState, useEffect, useMemo } from 'react';
import { UserData, View, SimType, Transaction, FuelLog, SystemState, UserRole } from './types';
import { LABELS, API_URL, ICONS, FUEL_PRICES } from './constants';
import { 
  Target, Trash2, Calendar, Droplets, TrendingUp, 
  ArrowLeftRight, Activity, Moon, Sun, Printer, 
  Wallet, Download, CloudUpload, Eye, EyeOff, 
  Fuel, History, Cpu, Layers, AlertCircle, Smartphone,
  Lock, Users, LogOut, ShieldCheck, UserPlus, Key, User as UserIcon,
  Plus, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight, BarChart3,
  Home, Settings, Clock, Gauge, Trash, Info, Zap, PieChart as PieChartIcon,
  Save, CheckCircle, Smartphone as Phone, Fuel as GasIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, CartesianGrid,
  PieChart, Pie, Legend, Cell as PieCell
} from 'recharts';

const SYSTEM_KEY = 'stc_pro_v14_system';
const AUTH_KEY = 'stc_pro_v14_auth_user';

const SimIcon = ({ type, size = 24 }: { type: SimType | 'all', size?: number }) => {
  if (type === 'jawwy') return <Cpu size={size} className="text-orange-500" />;
  if (type === 'sawa') return <Smartphone size={size} className="text-stc-purple" />;
  if (type === 'multi') return <Layers size={size} className="text-amber-500" />;
  if (type === 'issue') return <AlertCircle size={size} className="text-zinc-500" />;
  return <Cpu size={size} />;
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
  const [newUserForm, setNewUserForm] = useState({ name: '', user: '', pass: '' });

  // --- Core Sync ---
  useEffect(() => {
    const localSystem = localStorage.getItem(SYSTEM_KEY);
    const localAuth = localStorage.getItem(AUTH_KEY);
    let currentSystem = system;

    if (localSystem) {
      try {
        const parsed = JSON.parse(localSystem);
        currentSystem = parsed;
        setSystem(parsed);
        if (parsed.globalTheme === 'dark') document.documentElement.classList.add('dark');
      } catch (e) { console.error(e); }
    }

    if (localAuth) {
      const user = currentSystem.users.find(u => u.id === localAuth);
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
    } catch (e) { console.warn("Cloud offline"); }
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
    } catch (e) { console.error("Sync Error"); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = system.users.find(u => u.username === loginForm.user && u.password === loginForm.pass);
    if (user) {
      setCurrentUser(user);
      if (loginForm.remember) {
        localStorage.setItem(AUTH_KEY, user.id);
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
      setLoginError('');
      setActiveView('home');
    } else {
      setLoginError('بيانات الدخول غير صحيحة');
    }
  };

  const handleLogout = () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
    setLoginForm({ user: '', pass: '', remember: true });
  };

  const updateCurrentUserDb = (updater: (oldDb: UserData['db']) => UserData['db']) => {
    if (!currentUser) return;
    const nextUsers = system.users.map(u => {
      if (u.id === currentUser.id) return { ...u, db: updater(u.db) };
      return u;
    });
    const nextSystem = { ...system, users: nextUsers };
    saveSystem(nextSystem);
    setCurrentUser(prev => prev ? { ...prev, db: updater(prev.db) } : null);
  };

  const confirmSale = (amt: number, sims: number) => {
    if (!tempSim || !currentUser) return;
    if (tempSim !== 'issue' && currentUser.db.stock[tempSim] < sims) {
      alert('⚠️ المخزون غير كافي لهذا النوع!');
      return;
    }

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
    setTempSim(null);
    setTempQty(1);
  };

  const deleteTx = (id: number) => {
    if(!confirm('حذف العملية نهائياً؟')) return;
    updateCurrentUserDb(oldDb => {
      const tx = oldDb.tx.find(t => t.id === id);
      if (!tx) return oldDb;
      const newStock = { ...oldDb.stock };
      if (tx.type !== 'issue') newStock[tx.type] += tx.sims;
      return { ...oldDb, tx: oldDb.tx.filter(t => t.id !== id), stock: newStock };
    });
  };

  // --- Memos & Stats ---
  const db = currentUser?.db;
  const dayTx = useMemo(() => db?.tx.filter(t => new Date(t.date).toDateString() === curDate.toDateString()) || [], [db?.tx, curDate]);
  const dayTotal = useMemo(() => dayTx.reduce((sum, t) => sum + t.amt, 0), [dayTx]);

  const weeklyTargetProgress = useMemo(() => {
    if (!db) return null;
    const d = new Date(curDate);
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay()); 
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6); 
    saturday.setHours(23, 59, 59, 999);
    
    const weekSales = db.tx.filter(t => {
      const txD = new Date(t.date);
      return txD >= sunday && txD <= saturday;
    }).reduce((s, t) => s + t.amt, 0);

    const target = db.settings.weeklyTarget || 3000;
    const percent = Math.min(100, Math.round((weekSales / target) * 100));
    return { weekSales, target, percent, remain: Math.max(0, target - weekSales) };
  }, [db?.tx, db?.settings.weeklyTarget, curDate]);

  const fuelMetrics = useMemo(() => {
    if(!db) return { cost: 0, liters: 0, avg: 0, lastWeek: 0, curWeek: 0, nextWeekEst: 0 };
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    const prevSunday = new Date(sunday);
    prevSunday.setDate(sunday.getDate() - 7);
    const prevSaturday = new Date(prevSunday);
    prevSaturday.setDate(prevSunday.getDate() + 6);

    const monthLogs = db.fuelLog.filter(l => {
      const ld = new Date(l.date);
      return ld.getMonth() === curDate.getMonth() && ld.getFullYear() === curDate.getFullYear();
    });

    const curWeekSpend = db.fuelLog.filter(l => {
      const ld = new Date(l.date);
      return ld >= sunday && ld <= saturday;
    }).reduce((s, l) => s + l.amount, 0);

    const lastWeekSpend = db.fuelLog.filter(l => {
      const ld = new Date(l.date);
      return ld >= prevSunday && ld <= prevSaturday;
    }).reduce((s, l) => s + l.amount, 0);

    const cost = monthLogs.reduce((s, l) => s + l.amount, 0);
    const liters = monthLogs.reduce((s, l) => s + l.liters, 0);
    const km = monthLogs.reduce((s, l) => s + l.km, 0);
    const avg = liters > 0 ? (km / liters).toFixed(1) : '0';
    const nextWeekEst = lastWeekSpend > 0 ? (curWeekSpend + lastWeekSpend) / 2 : (curWeekSpend > 0 ? curWeekSpend : 150);

    return { cost, liters, avg: Number(avg), lastWeek: lastWeekSpend, curWeek: curWeekSpend, nextWeekEst };
  }, [db?.fuelLog, curDate]);

  // --- Views ---
  const HomeView = () => (
    <div className="px-5 pt-8 space-y-8 pb-44 animate-in fade-in duration-500 text-right">
      <div className="grid grid-cols-4 gap-3">
        {['jawwy', 'sawa', 'multi', 'issue'].map(type => {
          const count = type === 'issue' 
            ? dayTx.filter(t => t.type === 'issue').length
            : dayTx.filter(t => t.type === type).reduce((s,t) => s + t.sims, 0);
          return (
            <div key={type} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-center flex flex-col items-center tap-bounce transition-all">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded-2xl mb-2"><SimIcon type={type as any} size={18} /></div>
              <span className="text-lg font-black dark:text-zinc-100 tracking-tighter">{count}</span>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter leading-tight">{LABELS[type]}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-[#4F008C] to-[#7B00D9] p-7 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-[-30px] right-[-30px] opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700"><Target size={160} /></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest opacity-90 underline decoration-green-400 decoration-2 underline-offset-4">الهدف الأسبوعي</div>
          <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-black">{weeklyTargetProgress?.percent}%</span>
        </div>
        <div className="flex items-baseline gap-2 mb-6 relative z-10">
          <span className="text-6xl font-black tracking-tighter leading-none">{weeklyTargetProgress?.weekSales}</span>
          <span className="text-md font-bold opacity-70">/ {weeklyTargetProgress?.target} ﷼</span>
        </div>
        <div className="h-3 bg-black/20 rounded-full overflow-hidden mb-4 relative z-10">
          <div className="h-full bg-gradient-to-r from-green-300 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${weeklyTargetProgress?.percent}%` }} />
        </div>
        <p className="text-[11px] font-bold opacity-80 relative z-10">متبقي: {weeklyTargetProgress?.remain} ﷼</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <ServiceCard label="شريحة جوّي" sub="متغير (30-25-20)" icon={<SimIcon type="jawwy" size={40} />} stock={db?.stock.jawwy} onClick={() => { setTempSim('jawwy'); setModalType('price'); }} />
        <ServiceCard label="شريحة سوا" sub="متغير (28-24-20)" icon={<SimIcon type="sawa" size={40} />} stock={db?.stock.sawa} onClick={() => { setTempSim('sawa'); setModalType('price'); }} />
        <ServiceCard label="عميل متعددة" sub="حسب الوقت" icon={<SimIcon type="multi" size={40} />} stock={db?.stock.multi} onClick={() => setModalType('multi')} />
        <ServiceCard label="تعثر طلب" sub="10 ﷼" icon={<SimIcon type="issue" size={40} />} onClick={() => { if(confirm('تسجيل تعثر طلب؟')){setTempSim('issue'); confirmSale(10, 0);} }} />
      </div>

      <div className="space-y-4">
        <h3 className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em] px-2 flex justify-between items-center">
          <span>العمليات اليومية (Timeline)</span>
          <span className="bg-stc-purple/10 px-3 py-1 rounded-full text-stc-purple text-[10px] font-black">{dayTotal} ﷼</span>
        </h3>
        <div className="space-y-3">
          {dayTx.map(t => (
            <div key={t.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] flex justify-between items-center shadow-sm border border-zinc-50 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl"><SimIcon type={t.type} size={20} /></div>
                <div>
                  <div className="font-black text-sm dark:text-zinc-200">{LABELS[t.type]} {t.sims > 0 && `(${t.sims})`}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(t.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-black text-stc-purple dark:text-purple-400 text-lg tracking-tighter">{t.amt} ﷼</span>
                <button onClick={() => deleteTx(t.id)} className="text-zinc-200 hover:text-red-500 p-2 transition-all"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {dayTx.length === 0 && <div className="p-10 text-center text-zinc-300 font-bold italic border-2 border-dashed rounded-3xl">لا توجد عمليات مسجلة لليوم</div>}
        </div>
      </div>
    </div>
  );

  const InventoryView = () => (
    <div className="px-5 pt-8 space-y-8 pb-44 animate-in fade-in duration-500 text-right">
      <div className="grid grid-cols-2 gap-5">
        {['jawwy', 'sawa', 'multi'].map(k => (
          <div key={k} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm text-center border border-zinc-50 dark:border-zinc-800">
            <div className="text-4xl font-black text-stc-purple dark:text-purple-400 mb-2 leading-none">{db?.stock[k as keyof typeof db.stock]}</div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">رصيد {LABELS[k]}</div>
          </div>
        ))}
        <div className="bg-stc-purple p-8 rounded-[2.5rem] shadow-xl text-center text-white relative overflow-hidden col-span-2">
          <div className="text-4xl font-black mb-1 leading-none">{Object.values(db?.stock || {}).reduce((a,b)=>a+b,0)}</div>
          <div className="text-[10px] font-black opacity-60 uppercase tracking-widest">إجمالي الرصيد الحالي للعهدة</div>
        </div>
      </div>
      
      <div className="space-y-4">
        <InventoryControl title="استلام من الشركة (جديد)" desc="إضافة رصيد جديد للمخزون" icon={<Plus/>} color="bg-emerald-500" onClick={() => { setStockMode('add'); setModalType('stock'); }} />
        <InventoryControl title="إرجاع للشركة (سليم)" desc="إعادة شرائح سليمة وخصمها" icon={<RotateCcw/>} color="bg-sky-500" onClick={() => { setStockMode('return'); setModalType('stock'); }} />
        <InventoryControl title="نقل إلى المتعطل" desc="خصم من الرصيد وإضافة لسلة التالفة" icon={<AlertTriangle/>} color="bg-rose-500" onClick={() => { setStockMode('to_damaged'); setModalType('stock'); }} />
        
        <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-[2.5rem] flex justify-between items-center cursor-pointer border border-rose-100 dark:border-rose-900/20 shadow-sm" onClick={() => setModalType('manage_damaged')}>
          <div className="flex items-center gap-5">
            <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg"><Activity size={20}/></div>
            <div>
              <span className="block font-black text-rose-600 text-md leading-tight">سلة الشرائح المتعطلة</span>
              <div className="flex gap-2 text-[9px] font-black text-rose-400 uppercase tracking-tight">
                 <span>جوّي: {db?.damaged.jawwy}</span>
                 <span>سوا: {db?.damaged.sawa}</span>
                 <span>متعددة: {db?.damaged.multi}</span>
              </div>
            </div>
          </div>
          <ChevronLeft className="text-rose-300"/>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-zinc-50 dark:border-zinc-800">
        <h4 className="font-black text-stc-purple dark:text-purple-400 mb-4 flex items-center gap-2 px-2"><History size={18}/> سجل حركات المخزون</h4>
        <div className="overflow-hidden rounded-2xl border border-zinc-50 dark:border-zinc-800">
          <table className="w-full text-right text-[11px]">
             <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-400 font-black">
                   <th className="py-3 px-3">التاريخ</th>
                   <th className="py-3 px-3">النوع</th>
                   <th className="py-3 px-3">الحركة</th>
                   <th className="py-3 px-3">الكمية</th>
                </tr>
             </thead>
             <tbody className="font-bold">
                {db?.stockLog.slice(0, 15).map((l, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800 last:border-0 dark:text-zinc-300">
                    <td className="py-3 px-3">{new Date(l.date).toLocaleDateString('ar-SA')}</td>
                    <td className="px-3">{LABELS[l.type]}</td>
                    <td className="px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] text-white ${l.action==='add'?'bg-emerald-500':l.action==='return_company'?'bg-sky-500':'bg-rose-500'}`}>
                        {l.action==='add'?'استلام':l.action==='return_company'?'إرجاع':l.action==='recover'?'استعادة':'إتلاف'}
                      </span>
                    </td>
                    <td className="px-3 font-black text-stc-purple dark:text-purple-400">{l.qty}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const FuelView = () => {
    const [fAmount, setFAmount] = useState('');
    const [fKm, setFKm] = useState('');
    const [fType, setFType] = useState<'91'|'95'|'diesel'>(db?.settings.preferredFuel || '91');
    const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);

    const addFuel = () => {
        if(!fAmount) return alert('يرجى إدخال المبلغ');
        const amt = Number(fAmount);
        const liters = amt / FUEL_PRICES[fType];
        updateCurrentUserDb(old => ({
          ...old,
          fuelLog: [{ id: Date.now(), date: new Date(fDate).toISOString(), type: fType, amount: amt, liters: liters, km: Number(fKm) || 0 }, ...old.fuelLog]
        }));
        setFAmount(''); setFKm('');
        alert(`تم حفظ فاتورة الوقود: ${liters.toFixed(2)} لتر`);
    };

    return (
      <div className="px-5 pt-8 space-y-8 pb-44 animate-in fade-in duration-500 text-right">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-sm border border-zinc-50 dark:border-zinc-800 space-y-6">
           <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest px-2 underline decoration-stc-purple/10 flex justify-between">
              <span>تقديرات استهلاك الوقود الأسبوعية</span>
              <Zap size={12} className="text-amber-500" />
           </h3>
           <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-center">
                 <span className="block text-[7px] font-black text-zinc-400 mb-1 uppercase leading-tight">الأسبوع الماضي</span>
                 <span className="text-md font-black text-zinc-600 dark:text-zinc-300 tracking-tighter">{fuelMetrics.lastWeek} <small className="text-[8px]">﷼</small></span>
              </div>
              <div className="p-3 bg-stc-purple text-white rounded-2xl text-center shadow-lg">
                 <span className="block text-[7px] font-black opacity-60 mb-1 uppercase leading-tight">الأسبوع الحالي</span>
                 <span className="text-md font-black tracking-tighter">{fuelMetrics.curWeek} <small className="text-[8px]">﷼</small></span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl text-center">
                 <span className="block text-[7px] font-black text-amber-600 dark:text-amber-400 mb-1 uppercase leading-tight">تقدير القادم</span>
                 <span className="text-md font-black text-amber-600 dark:text-amber-400 tracking-tighter">{fuelMetrics.nextWeekEst.toFixed(0)} <small className="text-[8px]">﷼</small></span>
              </div>
           </div>
           <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-md"><Gauge size={16}/></div>
                 <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">كفاءة الاستهلاك</span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg tracking-tighter leading-none">{fuelMetrics.avg} <small className="text-[10px]">كم/لتر</small></span>
           </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><Droplets size={120}/></div>
          <h3 className="text-xl font-black text-stc-purple dark:text-purple-400 flex items-center gap-3 relative z-10"><Droplets/> تسجيل تعبئة وقود</h3>
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
               <label className="text-[10px] font-black text-zinc-400 uppercase w-16 text-left">التاريخ:</label>
               <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} className="bg-transparent border-0 outline-none font-black text-sm flex-1 text-center dark:text-zinc-100" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['91', '95', 'diesel'].map(t => (
                <button key={t} onClick={() => setFType(t as any)} className={`py-3 rounded-2xl font-black text-xs transition-all ${fType === t ? 'bg-stc-purple text-white shadow-lg scale-105 active:scale-95' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>{t === 'diesel' ? 'ديزل' : t}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-zinc-400 px-2 uppercase tracking-tighter">المبلغ (﷼)</label>
                 <input type="number" value={fAmount} onChange={e=>setFAmount(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 p-5 rounded-2xl outline-none font-black text-center shadow-inner dark:text-zinc-100 placeholder-zinc-200" placeholder="0" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-zinc-400 px-2 uppercase tracking-tighter">العداد (كم)</label>
                 <input type="number" value={fKm} onChange={e=>setFKm(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 p-5 rounded-2xl outline-none font-black text-center shadow-inner dark:text-zinc-100 placeholder-zinc-200" placeholder="0" />
              </div>
            </div>
            <button onClick={addFuel} className="w-full bg-stc-purple text-white py-5 rounded-2xl font-black shadow-xl tap-bounce active:bg-stc-dark tracking-widest text-xs transition-all">حفظ الفاتورة</button>
          </div>
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const weeks = useMemo(() => {
      const w = [];
      let date = new Date(repYear, repMonth, 1);
      let current = new Date(date);
      current.setDate(current.getDate() - current.getDay()); 
      let n = 1;
      while(current.getMonth() <= repMonth || current.getFullYear() < repYear) {
         if (current.getFullYear() > repYear || (current.getFullYear() === repYear && current.getMonth() > repMonth)) break;
         const s = new Date(current); 
         const e = new Date(current); e.setDate(s.getDate() + 6); 
         if (s.getMonth() === repMonth || e.getMonth() === repMonth) {
            w.push({ start: s, end: e, label: `الأسبوع ${n++}` });
         }
         current.setDate(current.getDate() + 7);
      }
      return w;
    }, [repMonth, repYear]);

    const reportData = useMemo(() => {
      if(!db || !weeks[repWeekIndex]) return { total: 0, days: [], pie: [] };
      const { start, end } = weeks[repWeekIndex];
      const txs = db.tx.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
      const daysArr = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((name, i) => {
        const val = txs.filter(t => new Date(t.date).getDay() === i).reduce((s,t)=>s+t.amt, 0);
        return { name, val };
      });
      const pieData = [
        { name: 'جوي', value: txs.filter(t => t.type === 'jawwy').reduce((s,t)=>s+t.amt,0), color: '#FF375E' },
        { name: 'سوا', value: txs.filter(t => t.type === 'sawa').reduce((s,t)=>s+t.amt,0), color: '#4F008C' },
        { name: 'متعددة', value: txs.filter(t => t.type === 'multi').reduce((s,t)=>s+t.amt,0), color: '#F59E0B' },
      ].filter(d => d.value > 0);
      return { total: txs.reduce((s,t)=>s+t.amt,0), days: daysArr, pie: pieData };
    }, [db, weeks, repWeekIndex]);

    return (
      <div className="px-5 pt-8 space-y-8 pb-44 animate-in fade-in duration-500 text-right">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-lg space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <select value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))} className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl font-black outline-none border-0 shadow-inner text-center dark:text-zinc-100 transition-all">
              {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <select value={repWeekIndex} onChange={e=>setRepWeekIndex(Number(e.target.value))} className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl font-black outline-none border-0 shadow-inner text-center dark:text-zinc-100 transition-all">
              {weeks.map((w,i)=><option key={i} value={i}>{w.label}</option>)}
            </select>
          </div>
          <div className="text-center py-6">
            <span className="text-[10px] font-black text-zinc-400 uppercase block mb-1">صافي عمولة الأسبوع</span>
            <div className="text-7xl font-black text-stc-purple dark:text-purple-400 tracking-tighter leading-none">{reportData.total}</div>
            <span className="text-xs font-bold text-zinc-300">﷼ سعودي</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: '900', fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{fill: 'rgba(79,0,140,0.02)'}} />
                <Bar dataKey="val" radius={[10, 10, 10, 10]} barSize={20}>
                  {reportData.days.map((e, i) => (
                    <Cell key={i} fill={e.val > 0 ? "#4F008C" : "#f1f5f9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {reportData.pie.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] shadow-lg space-y-4">
             <h4 className="font-black text-sm text-zinc-400 flex items-center gap-2 mb-4 px-2"><PieChartIcon size={18}/> توزيع المبيعات (حسب النوع)</h4>
             <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={reportData.pie} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                         {reportData.pie.map((entry, index) => (
                            <PieCell key={`cell-${index}`} fill={entry.color} />
                         ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        )}
      </div>
    );
  };

  const SettingsView = () => (
    <div className="px-5 pt-8 space-y-8 pb-44 animate-in fade-in duration-500 text-right">
      <div className="bg-white dark:bg-zinc-900 p-10 rounded-[4rem] shadow-2xl space-y-10 border border-zinc-50 dark:border-zinc-800">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-stc-purple dark:text-purple-400 tracking-tight leading-tight">الإعدادات والتحكم</h2>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest opacity-60 italic underline decoration-stc-purple/10 underline-offset-4">تخصيص كامل للنظام والمندوب</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2 group">
            <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-[0.2em] group-focus-within:text-stc-purple transition-colors">اسم المندوب</label>
            <div className="relative">
              <input type="text" value={currentUser?.name} onChange={e => {
                const val = e.target.value;
                setCurrentUser(prev => prev ? {...prev, name: val} : null);
                const nextUsers = system.users.map(u => u.id === currentUser?.id ? {...u, name: val} : u);
                saveSystem({...system, users: nextUsers});
              }} className="w-full bg-zinc-50 dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-transparent focus:border-stc-purple/20 outline-none font-black shadow-inner dark:text-zinc-100 text-center transition-all" />
              <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-[0.2em] group-focus-within:text-stc-purple transition-colors">الهدف الأسبوعي (🎯)</label>
            <div className="relative">
              <input type="number" value={db?.settings.weeklyTarget} onChange={e => updateCurrentUserDb(old => ({...old, settings: {...old.settings, weeklyTarget: Number(e.target.value)}}))} className="w-full bg-zinc-50 dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-transparent focus:border-stc-purple/20 outline-none font-black text-center text-4xl shadow-inner text-stc-purple dark:text-purple-400 tracking-tighter transition-all leading-none" />
              <Target className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-[0.2em] group-focus-within:text-stc-purple transition-colors">نوع الوقود المفضل</label>
            <div className="relative">
              <select value={db?.settings.preferredFuel} onChange={e => updateCurrentUserDb(old => ({...old, settings: {...old.settings, preferredFuel: e.target.value as any}}))} className="w-full bg-zinc-50 dark:bg-zinc-800 p-6 rounded-[2rem] border-2 border-transparent focus:border-stc-purple/20 outline-none font-black shadow-inner dark:text-zinc-100 text-center transition-all appearance-none">
                <option value="91">بنزين 91 🟢</option>
                <option value="95">بنزين 95 🔴</option>
                <option value="diesel">ديزل 🔘</option>
              </select>
              <GasIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" size={18} />
            </div>
          </div>

          <button onClick={() => {
            const nextTheme = system.globalTheme === 'light' ? 'dark' : 'light';
            saveSystem({...system, globalTheme: nextTheme});
            document.documentElement.classList.toggle('dark');
          }} className="w-full p-6 bg-zinc-50 dark:bg-zinc-800 rounded-[2.5rem] font-black flex justify-between items-center shadow-inner transition-all dark:text-zinc-200 tap-bounce group">
            <span className="flex items-center gap-3"><Moon className="group-hover:rotate-12 transition-transform" size={18}/> الوضع الليلي</span>
            <div className={`w-12 h-6 rounded-full relative transition-all ${system.globalTheme === 'dark' ? 'bg-stc-purple shadow-lg' : 'bg-zinc-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${system.globalTheme === 'dark' ? 'left-7 shadow-md' : 'left-1'}`} />
            </div>
          </button>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => {
                   const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(system));
                   const a = document.createElement('a'); a.href = dataStr; a.download = `backup_stc_pro_${new Date().toISOString().slice(0,10)}.json`; a.click();
                }} className="bg-emerald-500 text-white p-5 rounded-[2.2rem] font-black flex items-center justify-center gap-2 text-[10px] shadow-lg tap-bounce transition-all"><Download size={16}/> تحميل 📥</button>
                <button onClick={() => {
                   const i = document.createElement('input'); i.type = 'file'; i.onchange = (e:any) => {
                     const r = new FileReader(); r.onload = (ev:any) => { 
                       try { const imported = JSON.parse(ev.target.result); saveSystem(imported); alert('تمت استعادة البيانات بنجاح!'); } catch(e) { alert('خطأ في تنسيق ملف النسخة الاحتياطية'); }
                     }; r.readAsText(e.target.files[0]);
                   }; i.click();
                }} className="bg-sky-500 text-white p-5 rounded-[2.2rem] font-black flex items-center justify-center gap-2 text-[10px] shadow-lg tap-bounce transition-all"><CloudUpload size={16}/> استعادة 📤</button>
             </div>
          </div>
        </div>

        <div className="text-center space-y-1 opacity-60">
           <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">تم التصميم والتطوير بواسطة</p>
           <h3 className="text-lg font-black text-stc-purple dark:text-purple-400 tracking-tight">أبو عزام</h3>
           <p className="text-[11px] font-black text-zinc-500 tracking-tighter">0565966728</p>
           <div className="text-[8px] font-bold text-zinc-300 mt-2 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 inline-block px-3 py-1 rounded-full">Edition 14.2 Premium</div>
        </div>
      </div>
    </div>
  );

  // --- Auth & Main Render ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-6 font-tajawal animate-in zoom-in duration-500">
        <div className="w-full max-w-md bg-white rounded-[4rem] p-10 shadow-2xl border border-zinc-100 relative overflow-hidden text-center">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-stc-purple p-6 rounded-[2.5rem] shadow-xl mb-5 scale-in duration-500 transition-all hover:rotate-6">
              <img src="https://www.stc.com.sa/content/dam/stc/footer-icons/stc-badge-purple.svg" className="h-10 w-10 brightness-0 invert" alt="STC" />
            </div>
            <h1 className="text-3xl font-black text-stc-purple tracking-tight leading-tight">مستر مندوب Pro</h1>
            <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3 underline decoration-stc-purple/20 decoration-2 underline-offset-4">نظام إدارة العهدة والمناديب</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-[0.2em]">اسم المستخدم (المعرف)</label>
              <div className="relative group">
                <input type="text" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} className="w-full bg-zinc-50 p-6 rounded-2xl outline-none font-bold shadow-inner pr-14 text-left focus:ring-2 focus:ring-stc-purple/10 transition-all" placeholder="username" />
                <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-stc-purple transition-colors" size={20} />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-[0.2em]">كلمة المرور</label>
              <div className="relative group">
                <input type="password" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} className="w-full bg-zinc-50 p-6 rounded-2xl outline-none font-bold shadow-inner pr-14 text-left focus:ring-2 focus:ring-stc-purple/10 transition-all" placeholder="••••" />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-stc-purple transition-colors" size={20} />
              </div>
            </div>
            
            {/* Save Login Toggle Button */}
            <div 
              className="flex items-center justify-center gap-3 pt-2 cursor-pointer tap-bounce select-none" 
              onClick={() => setLoginForm({...loginForm, remember: !loginForm.remember})}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${loginForm.remember ? 'bg-stc-purple text-white shadow-lg shadow-stc-purple/20' : 'bg-zinc-100 text-zinc-400 shadow-inner'}`}>
                <Save size={20} className={loginForm.remember ? 'animate-pulse' : ''} />
              </div>
              <div className="text-right">
                <span className="text-[12px] font-black text-zinc-600 block leading-none">حفظ الدخول</span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{loginForm.remember ? 'مفعل' : 'غير مفعل'}</span>
              </div>
              {loginForm.remember && <CheckCircle size={14} className="text-green-500 animate-in zoom-in" />}
            </div>

            {loginError && <p className="text-rose-500 text-[11px] font-black text-center animate-bounce">{loginError}</p>}
            <button className="w-full bg-stc-purple text-white py-6 rounded-2xl font-black shadow-xl shadow-stc-purple/20 tap-bounce active:scale-95 transition-all text-sm uppercase tracking-widest">تسجيل الدخول</button>
          </form>
          <div className="mt-8 text-center opacity-30">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cloud Encrypted Protection</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${system.globalTheme === 'dark' ? 'dark' : ''} bg-[#F8F9FE] dark:bg-zinc-950 font-tajawal transition-colors duration-500`}>
      <header className="bg-gradient-to-br from-stc-purple to-stc-dark pt-6 pb-6 px-6 rounded-b-[3.5rem] shadow-2xl sticky top-0 z-50 transition-all border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg animate-in zoom-in duration-700 hover:rotate-6 transition-transform"><img src="https://www.stc.com.sa/content/dam/stc/footer-icons/stc-badge-purple.svg" className="h-6 w-6" alt="STC" /></div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-[14px] tracking-tight leading-none mb-1">{currentUser.name}</span>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-300 uppercase tracking-tighter">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                سحابي • متصل
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 glass text-white rounded-xl active:scale-90 transition-all shadow-lg"><LogOut size={20} /></button>
        </div>
        <div className="flex justify-center items-center gap-4 animate-in slide-in-from-top duration-700">
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() - 1)))} className="p-3 glass text-white rounded-full active:bg-white/20 transition-all"><ChevronRight size={20} /></button>
          <div className="relative text-center min-w-[190px] bg-white/10 py-2.5 px-6 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner group transition-all">
            <span className="block text-md font-black text-white group-hover:scale-105 transition-transform">{curDate.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <input type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" value={curDate.toISOString().split('T')[0]} onChange={(e) => setCurDate(new Date(e.target.value))} />
          </div>
          <button onClick={() => setCurDate(d => new Date(d.setDate(d.getDate() + 1)))} className="p-3 glass text-white rounded-full active:bg-white/20 transition-all"><ChevronLeft size={20} /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {activeView === 'home' && <HomeView />}
        {activeView === 'inv' && <InventoryView />}
        {activeView === 'fuel' && <FuelView />}
        {activeView === 'rep' && <ReportsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-t border-zinc-100 dark:border-zinc-800 shadow-2xl pt-5 px-5 pb-8 min-h-[105px]">
        <div className="max-w-md mx-auto grid grid-cols-5 items-center">
          <NavItem label="الرئيسية" icon={<Home size={22}/>} active={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavItem label="المخزون" icon={<Wallet size={22}/>} active={activeView === 'inv'} onClick={() => setActiveView('inv')} />
          <NavItem label="الوقود" icon={<Fuel size={22}/>} active={activeView === 'fuel'} onClick={() => setActiveView('fuel')} />
          <NavItem label="التقارير" icon={<BarChart3 size={22}/>} active={activeView === 'rep'} onClick={() => setActiveView('rep')} />
          <NavItem label="الإعدادات" icon={<Settings size={22}/>} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>
      </nav>

      {/* Modals with RTL support */}
      {modalType === 'price' && (
        <Modal title="كم استغرق التوصيل؟ ⏱️" onClose={() => setModalType(null)}>
          <div className="grid gap-4">
            {(tempSim === 'jawwy' ? [{l:'أقل من ساعتين',v:30},{l:'2-3 ساعات',v:25},{l:'أكثر من 3 ساعات',v:20}] : [{l:'أقل من ساعتين',v:28},{l:'2-3 ساعات',v:24},{l:'أكثر من 3 ساعات',v:20}]).map(opt => (
              <button key={opt.l} onClick={() => confirmSale(opt.v, tempQty)} className="w-full bg-zinc-50 dark:bg-zinc-800 p-8 rounded-[2.5rem] flex justify-between items-center border-2 border-transparent hover:border-stc-purple transition-all group shadow-sm tap-bounce active:bg-zinc-100 dark:active:bg-zinc-700">
                <div className="text-right">
                    <span className="text-[11px] font-black text-zinc-400 uppercase mb-1 block">المدة المقدرة</span>
                    <span className="text-md font-black text-zinc-800 dark:text-zinc-100 group-hover:text-stc-purple dark:group-hover:text-purple-400 transition-colors leading-tight">{opt.l}</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
                    <span className="text-stc-purple dark:text-purple-400 font-black text-2xl tracking-tighter leading-none">{opt.v} <small className="text-[10px]">﷼</small></span>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalType === 'multi' && (
        <Modal title="عدد الشرائح الموصلة؟" onClose={() => setModalType(null)}>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(q => (
              <button key={q} onClick={() => { setTempSim('multi'); setTempQty(q); setModalType('price'); }} className="aspect-square bg-zinc-50 dark:bg-zinc-800 rounded-2xl font-black text-2xl hover:bg-stc-purple hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90 tap-bounce dark:text-zinc-100 leading-none">
                {q}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modalType === 'stock' && (
        <Modal title={stockMode === 'add' ? 'استلام من الشركة' : 'تعديل مخزون العهدة'} onClose={() => setModalType(null)}>
          <div className="space-y-8">
            <div className="space-y-2">
               <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-widest text-right block">نوع الشريحة</label>
               <select id="stk-type" className="w-full bg-zinc-50 dark:bg-zinc-800 p-7 rounded-[2rem] font-black outline-none border-0 appearance-none shadow-inner text-lg dark:text-zinc-100 transition-all text-right leading-tight">
                 <option value="jawwy">شريحة جوّي 🔴</option><option value="sawa">شريحة سوا 🟣</option><option value="multi">متعددة 🟠</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-widest text-right block">الكمية</label>
               <input id="stk-qty" type="number" placeholder="0" className="w-full bg-zinc-50 dark:bg-zinc-800 p-10 rounded-[2.5rem] font-black text-center outline-none shadow-inner text-6xl tracking-tighter text-stc-purple dark:text-purple-400 placeholder-zinc-200 transition-all leading-none" />
            </div>
            <button onClick={() => {
              const typeElement = document.getElementById('stk-type') as HTMLSelectElement;
              const qtyElement = document.getElementById('stk-qty') as HTMLInputElement;
              const type = typeElement.value as keyof UserData['db']['stock'];
              const qty = Number(qtyElement.value);
              if(qty > 0) {
                updateCurrentUserDb(old => {
                  const s = {...old.stock}; const d = {...old.damaged};
                  if(stockMode==='add') s[type]+=qty;
                  else if(s[type]>=qty) {
                    s[type]-=qty;
                    if(stockMode==='to_damaged') d[type]+=qty;
                  } else { alert('عفواً، الرصيد المتاح غير كافي للعملية!'); return old; }
                  return {...old, stock:s, damaged:d, stockLog: [{date: new Date().toISOString(), type, qty, action: stockMode === 'add' ? 'add' : stockMode === 'to_damaged' ? 'to_damaged' : 'return_company'}, ...old.stockLog]};
                });
                setModalType(null);
              }
            }} className="w-full bg-stc-purple text-white py-7 rounded-[2.5rem] font-black shadow-2xl tracking-widest uppercase text-sm tap-bounce active:bg-stc-dark transition-all leading-tight">تأكيد ومتابعة العملية</button>
          </div>
        </Modal>
      )}

      {modalType === 'manage_damaged' && (
        <Modal title="إدارة المتعطلات" onClose={() => setModalType(null)}>
          <div className="space-y-8">
            <div className="space-y-2">
               <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-widest text-right block">نوع الشريحة المتعطلة</label>
               <select id="dmg-type" className="w-full bg-zinc-50 dark:bg-zinc-800 p-7 rounded-[2rem] font-black outline-none appearance-none shadow-inner text-lg dark:text-zinc-100 transition-all text-right leading-tight">
                 <option value="jawwy">جوّي</option><option value="sawa">سوا</option><option value="multi">متعددة</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-zinc-400 px-4 uppercase tracking-widest text-right block">الكمية</label>
               <input id="dmg-qty" type="number" placeholder="0" className="w-full bg-zinc-50 dark:bg-zinc-800 p-10 rounded-[2.5rem] font-black text-center outline-none shadow-inner text-5xl tracking-tighter dark:text-zinc-100 transition-all leading-none" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => {
                const typeElement = document.getElementById('dmg-type') as HTMLSelectElement;
                const qtyElement = document.getElementById('dmg-qty') as HTMLInputElement;
                const type = typeElement.value as keyof UserData['db']['damaged'];
                const qty = Number(qtyElement.value);
                if(qty > 0 && (db?.damaged[type] || 0) >= qty) {
                  updateCurrentUserDb(old => ({...old, damaged: {...old.damaged, [type]: old.damaged[type]-qty}, stock: {...old.stock, [type]: old.stock[type]+qty}, stockLog: [{date: new Date().toISOString(), type, qty, action: 'recover'}, ...old.stockLog]}));
                  setModalType(null);
                } else alert('الكمية المختارة غير متوفرة في المتعطلات');
              }} className="bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest tap-bounce shadow-lg transition-all leading-tight">استعادة للمخزون (سليم)</button>
              <button onClick={() => {
                const typeElement = document.getElementById('dmg-type') as HTMLSelectElement;
                const qtyElement = document.getElementById('dmg-qty') as HTMLInputElement;
                const type = typeElement.value as keyof UserData['db']['damaged'];
                const qty = Number(qtyElement.value);
                if(qty > 0 && (db?.damaged[type] || 0) >= qty) {
                  updateCurrentUserDb(old => ({...old, damaged: {...old.damaged, [type]: old.damaged[type]-qty}, stockLog: [{date: new Date().toISOString(), type, qty, action: 'flush'}, ...old.stockLog]}));
                  setModalType(null);
                } else alert('الكمية المختارة غير متوفرة في المتعطلات');
              }} className="bg-rose-500 text-white py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest tap-bounce shadow-lg transition-all leading-tight">إتلاف / تسليم للشركة</button>
            </div>
          </div>
        </Modal>
      )}

      {isSyncing && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 z-[1000] flex flex-col items-center justify-center animate-in fade-in backdrop-blur-sm">
          <div className="w-16 h-16 border-[5px] border-stc-purple border-t-transparent rounded-full animate-spin shadow-2xl shadow-stc-purple/10" />
          <span className="mt-8 font-black text-stc-purple dark:text-purple-400 text-[11px] tracking-[0.3em] uppercase animate-pulse">جاري المزامنة مع السحابة...</span>
        </div>
      )}
    </div>
  );
};

const ServiceCard = ({ label, sub, icon, stock, onClick }: any) => (
  <button onClick={onClick} className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] text-center relative shadow-sm border border-zinc-100 dark:border-zinc-800 tap-bounce transition-all hover:shadow-md group overflow-hidden">
    {stock !== undefined && (
      <span className={`absolute top-6 left-6 text-[10px] font-black px-3 py-1 rounded-full shadow-sm transition-colors ${stock <= 2 ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500'}`}>{stock}</span>
    )}
    <div className="mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <span className="block font-black text-sm text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">{label}</span>
    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mt-1 block opacity-60 leading-tight">{sub}</span>
  </button>
);

const InventoryControl = ({ title, desc, icon, color, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-zinc-100 dark:border-zinc-800 tap-bounce cursor-pointer group hover:border-stc-purple/10 dark:hover:border-purple-500/10 transition-all">
    <div className="flex items-center gap-5">
      <div className={`${color} p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110`}>{icon}</div>
      <div><span className="block font-black text-md text-zinc-800 dark:text-zinc-200 leading-tight tracking-tight">{title}</span><span className="text-[10px] text-zinc-400 font-bold uppercase opacity-60 tracking-tighter leading-tight">{desc}</span></div>
    </div>
    <ChevronLeft size={20} className="text-zinc-200 dark:text-zinc-700 group-hover:text-stc-purple dark:group-hover:text-purple-400 group-hover:translate-x-[-5px] transition-all"/>
  </div>
);

const NavItem = ({ label, icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 transition-all group ${active ? 'text-stc-purple dark:text-purple-400 scale-105' : 'text-zinc-400'}`}>
    <div className={`p-3.5 rounded-[1.25rem] transition-all duration-500 ${active ? 'bg-stc-purple text-white shadow-xl shadow-stc-purple/20 animate-in zoom-in' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{icon}</div>
    <span className={`text-[10px] font-black tracking-tighter truncate leading-tight ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[300] flex items-end p-5 transition-all duration-300 animate-in fade-in">
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-[4rem] p-10 pb-14 shadow-2xl animate-in slide-in-from-bottom duration-500 relative transition-all text-right no-scrollbar overflow-hidden">
      <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-10 shadow-inner" />
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-2xl font-black text-stc-purple dark:text-purple-400 tracking-tight leading-tight">{title}</h3>
        <button onClick={onClose} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 font-black text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-all hover:rotate-90">×</button>
      </div>
      <div className="no-scrollbar overflow-y-auto max-h-[70vh] pb-4">{children}</div>
    </div>
  </div>
);

export default App;
