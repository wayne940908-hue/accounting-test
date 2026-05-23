/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Car, 
  Gamepad2, 
  Home, 
  HeartPulse, 
  Cloud, 
  Tag, 
  TrendingUp, 
  Plus, 
  Check, 
  Calendar, 
  Clock,
  CircleAlert,
  X
} from 'lucide-react';
import { Transaction, MAIN_CATEGORIES } from '../types';

// Map icon name string to Lucide component
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Utensils,
  Car,
  Gamepad2,
  Home,
  HeartPulse,
  Cloud,
  Tag,
  TrendingUp,
};

interface TransactionFormProps {
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  activeTx?: Transaction | null; // For editing if selected
  onUpdateTransaction?: (tx: Transaction) => void;
  onClose?: () => void;
}

export default function TransactionForm({
  onAddTransaction,
  activeTx = null,
  onUpdateTransaction,
  onClose,
}: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('餐飲');
  const [subcategory, setSubcategory] = useState<string>('早餐');
  const [datetime, setDatetime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Auto set current date on mount in local format yyyy-MM-dd
  useEffect(() => {
    if (activeTx) {
      setType(activeTx.type);
      setAmount(String(activeTx.amount));
      setCategory(activeTx.category);
      setSubcategory(activeTx.subcategory);
      setNote(activeTx.note);
      
      // Convert ISO string to local date format for input type="date"
      const date = new Date(activeTx.datetime);
      const val = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      setDatetime(val);
    } else {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      setDatetime(localISO);
      
      // Reset defaults
      setAmount('');
      setType('expense');
      setCategory('餐飲');
      setSubcategory('早餐');
      setNote('');
      setFormError('');
    }
  }, [activeTx]);

  // Adjust categories list based on type
  useEffect(() => {
    if (!activeTx) {
      if (type === 'expense') {
        setCategory('餐飲');
        setSubcategory('早餐');
      } else {
        setCategory('收入項目');
        setSubcategory('薪資');
      }
    }
  }, [type, activeTx]);

  // Sync subcategory default when category changes
  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = MAIN_CATEGORIES.find(c => c.name === catName);
    if (cat && cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0]);
    } else {
      setSubcategory('其他');
    }
  };

  const handleReset = () => {
    setAmount('');
    setNote('');
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    setDatetime(localISO);
    setFormError('');
    if (activeTx && onClose) {
      onClose();
    } else {
      if (type === 'expense') {
        setCategory('餐飲');
        setSubcategory('早餐');
      } else {
        setCategory('收入項目');
        setSubcategory('薪資');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('請輸入大於 0 的正數金額');
      return;
    }

    if (!category) {
      setFormError('請選擇主分類');
      return;
    }

    if (!datetime) {
      setFormError('請選擇日期');
      return;
    }

    // Convert local date back to ISO string
    const isoDatetime = new Date(datetime).toISOString();

    const txData = {
      datetime: isoDatetime,
      amount: parsedAmount,
      type,
      category,
      subcategory: subcategory || '其他',
      note: note.trim(),
    };

    if (activeTx && onUpdateTransaction) {
      onUpdateTransaction({
        ...activeTx,
        ...txData,
      });
      if (onClose) onClose();
    } else {
      onAddTransaction(txData);
      // Reset form save for datetime
      setAmount('');
      setNote('');
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      setDatetime(localISO);
    }
  };

  // Filter categories to show
  const filteredCategories = MAIN_CATEGORIES.filter(cat => {
    if (type === 'income') {
      return cat.name === '收入項目';
    } else {
      return cat.name !== '收入項目';
    }
  });

  const selectedCategoryStruct = MAIN_CATEGORIES.find(c => c.name === category);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-5 rounded-3xl text-zinc-100 shadow-sm transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
        <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase">
          {activeTx ? '⚙️ 編輯記帳明細' : '✍️ 新增一筆記錄'}
        </h3>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-full text-zinc-450 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            id="close-form-btn"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 p-3 rounded-lg text-xs" role="alert">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Transaction Type Toggle */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-2 font-mono">交易屬性 / Type</label>
        <div className="grid grid-cols-2 gap-2 bg-zinc-950/70 p-1 rounded-xl border border-zinc-905">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="toggle-expense-btn"
          >
            支出 (Expense)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="toggle-income-btn"
          >
            收入 (Income)
          </button>
        </div>
      </div>

      {/* 2. Amount and Date Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono" htmlFor="amount-input">
            金額 / Amount ({type === 'expense' ? '-' : '+'})
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm leading-none">$</span>
            <input
              type="number"
              step="any"
              id="amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 text-sm bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-zinc-500 focus:border-white font-mono text-zinc-100 font-bold transition-all duration-300"
              required
            />
          </div>
        </div>

        <div className="min-w-0 w-full">
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono" htmlFor="datetime-input">
            記帳日期 / Date
          </label>
          <div className="relative w-full min-w-0">
            <input
              type="date"
              id="datetime-input"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full max-w-full min-w-0 box-border px-3 py-2 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-zinc-500 focus:border-white font-mono text-zinc-100 transition-all duration-300 appearance-none"
              required
            />
          </div>
        </div>
      </div>

      {/* 3. Main Category Grid Select */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-2 font-mono">
          選擇主分類 / Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filteredCategories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Tag;
            const isSelected = category === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryChange(cat.name)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-white bg-white text-black font-semibold shadow-md ring-2 ring-white/10'
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/30 hover:shadow-[0_0_12px_rgba(255,255,255,0.06)] text-zinc-400'
                }`}
                id={`cat-btn-${cat.name}`}
              >
                <IconComponent className={`w-4 h-4 mb-1 ${isSelected ? 'text-black' : 'text-zinc-400 transition-colors duration-300 group-hover:text-zinc-200'}`} />
                <span className="text-[11px] leading-tight select-none">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Subcategories Pills Selection */}
      {selectedCategoryStruct && (
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2 font-mono">
            選擇子分類 / Sub-category
          </label>
          <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300">
            {selectedCategoryStruct.subcategories.map((subcat) => {
              const isSelected = subcategory === subcat;
              return (
                <button
                  key={subcat}
                  type="button"
                  onClick={() => setSubcategory(subcat)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all duration-300 border cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border-white/20 text-white font-bold shadow-sm'
                      : 'bg-zinc-950/25 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-500'
                  }`}
                  id={`subcat-btn-${subcat}`}
                >
                  {subcat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Notes/Memo Input */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono" htmlFor="note-input">
          備註說明 / Description Memo
        </label>
        <input
          type="text"
          id="note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：捷運月票、超商美式、公司獎金..."
          className="w-full px-3 py-2 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-zinc-500 focus:border-white text-zinc-100 transition-all duration-300"
        />
      </div>

      {/* Submit Action & Reset Cancel buttons split row */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        <button
          type="button"
          onClick={handleReset}
          className="py-2.5 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          id="cancel-tx-btn"
        >
          <X className="w-3.5 h-3.5" />
          <span>{activeTx ? '取消編輯' : '清除重設'}</span>
        </button>

        <button
          type="submit"
          className="py-2.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-white/10"
          id="submit-tx-btn"
        >
          {activeTx ? <Check className="w-3.5 h-3.5 text-black" /> : <Plus className="w-3.5 h-3.5 text-black" />}
          <span>{activeTx ? '確認更新記錄' : '確認送出記帳'}</span>
        </button>
      </div>
    </form>
  );
}
