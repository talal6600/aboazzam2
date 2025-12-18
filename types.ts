
export type SimType = 'jawwy' | 'sawa' | 'multi' | 'issue';
export type UserRole = 'admin' | 'user';

export interface Transaction {
  id: number;
  date: string;
  type: SimType;
  amt: number;
  sims: number;
}

export interface StockLog {
  date: string;
  type: Exclude<SimType, 'issue'>;
  qty: number;
  action: 'add' | 'return_company' | 'to_damaged' | 'recover' | 'flush';
}

export interface FuelLog {
  id: number;
  date: string;
  type: '91' | '95' | 'diesel';
  amount: number;
  liters: number;
  km: number;
}

export interface UserData {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  db: {
    tx: Transaction[];
    stock: Record<Exclude<SimType, 'issue'>, number>;
    damaged: Record<Exclude<SimType, 'issue'>, number>;
    stockLog: StockLog[];
    fuelLog: FuelLog[];
    settings: {
      weeklyTarget: number;
      showWeeklyTarget: boolean;
      preferredFuel: '91' | '95' | 'diesel';
    };
  };
}

export interface SystemState {
  users: UserData[];
  globalTheme: 'light' | 'dark';
}

export type View = 'home' | 'inv' | 'fuel' | 'rep' | 'settings' | 'admin';
