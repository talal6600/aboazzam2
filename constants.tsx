
import React from 'react';
import { 
  Home, Wallet, Fuel, BarChart3, Settings, 
  ChevronRight, ChevronLeft, Plus, RotateCcw, 
  AlertTriangle, CloudUpload, Download, Moon, 
  Sun, User, Target, Info, Trash2, HeartOff,
  CheckCircle2, XCircle, Timer, FileDown, Printer,
  Lock, Users, LogOut, ShieldCheck, UserPlus, Key
} from 'lucide-react';

export const LABELS: Record<string, string> = { 
  jawwy: 'شريحة جوّي', 
  sawa: 'شريحة سوا', 
  multi: 'عميل متعددة', 
  issue: 'لم يتم الاكمال' 
};

export const FUEL_PRICES = { '91': 2.18, '95': 2.33, 'diesel': 1.15 };

export const API_URL = "https://script.google.com/macros/s/AKfycbygAwOcqosMpmUokaaZZVrgPRRt__AZO8jVqW4koRAg4VB7fwPvrgOGC8OPSf2UEyLPxQ/exec";

export const ICONS = {
  Home: <Home size={22} />,
  Wallet: <Wallet size={22} />,
  Fuel: <Fuel size={22} />,
  Reports: <BarChart3 size={22} />,
  Settings: <Settings size={22} />,
  Right: <ChevronRight size={20} />,
  Left: <ChevronLeft size={20} />,
  Plus: <Plus size={20} />,
  Return: <RotateCcw size={20} />,
  Warning: <AlertTriangle size={20} />,
  Backup: <CloudUpload size={20} />,
  Download: <Download size={20} />,
  Moon: <Moon size={20} />,
  Sun: <Sun size={20} />,
  User: <User size={20} />,
  Target: <Target size={20} />,
  Info: <Info size={16} />,
  Trash: <Trash2 size={18} />,
  Broken: <HeartOff size={20} />,
  Check: <CheckCircle2 size={16} />,
  Cancel: <XCircle size={16} />,
  Time: <Timer size={16} />,
  Pdf: <FileDown size={20} />,
  Print: <Printer size={20} />,
  Lock: <Lock size={20} />,
  Users: <Users size={22} />,
  LogOut: <LogOut size={20} />,
  Admin: <ShieldCheck size={20} />,
  UserPlus: <UserPlus size={20} />,
  Key: <Key size={18} />
};
