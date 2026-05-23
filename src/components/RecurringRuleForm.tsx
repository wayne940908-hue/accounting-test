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
  CircleAlert,
  X
} from 'lucide-react';
import { RecurringRule, MAIN_CATEGORIES } from '../types';

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

interface RecurringRuleFormProps {
  onAddRule: (rule: Omit<RecurringRule, 'id'>) => void;
  activeRule?: RecurringRule | null;
  onUpdateRule?: (rule: RecurringRule) => void;
  onClose?: () => void;
}

export default function RecurringRuleForm({
  onAddRule,
  activeRule = null,
  onUpdateRule,
  onClose,
}: RecurringRuleFormProps) {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('數位服務');
  const [subcategory, setSubcategory] = useState<string>('串流影音(Netflix/Disney+)');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (activeRule) {
      setName(activeRule.name);
      setType(activeRule.type);
      setAmount(String(activeRule.amount));
      setCategory(activeRule.category);
      setSubcategory(activeRule.subcategory);
      setDayOfMonth(activeRule.dayOfMonth);
      setNote(activeRule.note);
    } else {
      setName('');
      setAmount('');
      setType('expense');
      setCategory('數位服務');
      setSubcategory('串流影音(Netflix/Disney+)');
      setDayOfMonth(1);
      setNote('');
      setFormError('');
    }
  }, [activeRule]);

  // Adjust categories list based on type
  useEffect(() => {
    if (!activeRule) {
      if (type === 'expense') {
        setCategory('數位服務');
        setSubcategory('串流影音(Netflix/Disney+)');
      } else {
        setCategory('收入項目');
        setSubcategory('薪資');
      }
    }
  }, [type, activeRule]);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = MAIN_CATEGORIES.find(c => c.name === catName);
    if (cat && cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0]);
    } else {
      setSubcategory('其他');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('請輸入固定扣款/存入名稱');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('請輸入大於 0 的正數金額');
      return;
    }

    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setFormError('扣除日期必須介於 1 到 31 號之間');
      return;
    }

    const ruleData = {
      name: name.trim(),
      amount: parsedAmount,
      type,
      category,
      subcategory: subcategory || '其他',
      dayOfMonth,
      isActive: true,
      lastTriggeredMonth: activeRule?.lastTriggeredMonth || '',
      note: note.trim(),
    };

    if (activeRule && onUpdateRule) {
      onUpdateRule({
        ...activeRule,
        ...ruleData,
      });
      if (onClose) onClose();
    } else {
      onAddRule(ruleData);
      // Reset
      setName('');
      setAmount('');
      setNote('');
      setDayOfMonth(1);
      if (onClose) onClose();
    }
  };

  const filteredCategories = MAIN_CATEGORIES.filter(cat => {
    if (type === 'income') {
      return cat.name === '收入項目';
    }
    return cat.name !== '收入項目';
  });

  const selectedCategoryStruct = MAIN_CATEGORIES.find(c => c.name === category);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-5 rounded-3xl text-zinc-100 shadow-sm">
      <div className="flex items-center justify-between pb-1 border-b border-zinc-805">
        <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase">
          {activeRule ? '⚙️ 編輯定期排程' : '🗓️ 新增定期扣款/存入'}
        </h3>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-full text-zinc-450 hover:bg-white/10 hover:text-white transition-colors animate-fade-in"
            id="close-rule-form-btn"
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

      {/* Type Toggle */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">排程類型</label>
        <div className="grid grid-cols-2 gap-2 bg-zinc-950/70 p-1 rounded-xl border border-zinc-850">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              type === 'expense'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="rule-toggle-expense"
          >
            固定扣起支出
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              type === 'income'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="rule-toggle-income"
          >
            固定存入收入
          </button>
        </div>
      </div>

      {/* Grid: Name & Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono" htmlFor="rule-name-input">
            項目名稱 / Description
          </label>
          <input
            type="text"
            id="rule-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：Netflix 訂閱、房租、固定薪水..."
            className="w-full px-3 py-2 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 text-zinc-100"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono" htmlFor="rule-amount-input">
            固定金額 / Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-zinc-400 font-mono text-[11px]">$</span>
            <input
              type="number"
              step="any"
              id="rule-amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-6 pr-3 py-2 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-zinc-100 font-bold"
              required
            />
          </div>
        </div>
      </div>

      {/* Row: Day of month selection */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-zinc-400 font-mono">
            每月扣除/存入日期 (Day of Month)
          </label>
          <span className="text-xs font-bold font-mono bg-white/10 text-white px-2.5 py-0.5 rounded-full">
            每月 {dayOfMonth} 號
          </span>
        </div>
        <div className="flex items-center gap-3 bg-zinc-950/40 p-2 border border-zinc-800 rounded-xl">
          <input
            type="range"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
            className="grow accent-white cursor-pointer"
          />
          <span className="text-[10px] text-zinc-400 font-mono">1 - 31日</span>
        </div>
      </div>

      {/* Main Category */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">
          對應主分類
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {filteredCategories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Tag;
            const isSelected = category === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryChange(cat.name)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-white bg-white text-black font-semibold'
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-750 hover:bg-zinc-900/30 text-zinc-400 text-xs'
                }`}
                id={`rule-cat-btn-${cat.name}`}
              >
                <IconComponent className={`w-3.5 h-3.5 mb-0.5 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                <span className="text-[10px] leading-tight select-none">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub Category */}
      {selectedCategoryStruct && (
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-mono">
            對應子分類
          </label>
          <div className="flex flex-wrap gap-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-850">
            {selectedCategoryStruct.subcategories.map((subcat) => {
              const isSelected = subcategory === subcat;
              return (
                <button
                  key={subcat}
                  type="button"
                  onClick={() => setSubcategory(subcat)}
                  className={`px-2.5 py-0.5 text-[11px] rounded transition-all border ${
                    isSelected
                      ? 'bg-white/10 border-white/20 text-white font-bold'
                      : 'bg-zinc-950/25 border-zinc-850 text-zinc-400 hover:text-white'
                  }`}
                  id={`rule-subcat-btn-${subcat}`}
                >
                  {subcat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-1 font-mono">
          特別備註
        </label>
        <input
          type="text"
          id="rule-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：信用卡自動扣繳、發薪日自動認列..."
          className="w-full px-3 py-1.5 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 text-zinc-100"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
        id="rule-submit-btn"
      >
        <Check className="w-3.5 h-3.5 text-black" />
        <span>{activeRule ? '確認更新排程' : '新增每月固定扣款 / 存入'}</span>
      </button>
    </form>
  );
}
