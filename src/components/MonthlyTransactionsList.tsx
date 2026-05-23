/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Utensils, 
  Car, 
  Gamepad2, 
  Home, 
  HeartPulse, 
  Cloud, 
  Tag, 
  TrendingUp, 
  Trash2, 
  Edit2, 
  Search,
  Calendar,
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction } from '../types';

interface MonthlyTransactionsListProps {
  transactions: Transaction[];
  selectedMonth: string; // "YYYY-MM"
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  '餐飲': Utensils,
  '交通': Car,
  '娛樂': Gamepad2,
  '居家': Home,
  '醫療': HeartPulse,
  '數位服務': Cloud,
  '其他支出': Tag,
  '收入項目': TrendingUp,
};

export default function MonthlyTransactionsList({
  transactions,
  selectedMonth,
  onDeleteTransaction,
  onEditTransaction,
}: MonthlyTransactionsListProps) {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // 1. Filter transactions by month, search query, and type
  const processedTxs = useMemo(() => {
    // Filter by selected month
    let filtered = transactions.filter(t => t.datetime.substring(0, 7) === selectedMonth);

    // Filter by type (income vs expense)
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by search query (note, category, or subcategory)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.note && t.note.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q) ||
        t.subcategory.toLowerCase().includes(q)
      );
    }

    // Sort by datetime descending, then id descending
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.datetime).getTime();
      const dateB = new Date(b.datetime).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
  }, [transactions, selectedMonth, filterType, searchQuery]);

  // 2. Group transactions by date
  const groupedTxs = useMemo(() => {
    const groups: Record<string, { dateStr: string; dayName: string; list: Transaction[]; dailyExpense: number; dailyIncome: number }> = {};
    
    processedTxs.forEach(t => {
      const fullDate = t.datetime.substring(0, 10); // "YYYY-MM-DD"
      
      if (!groups[fullDate]) {
        const dateObj = new Date(fullDate);
        const monthNum = dateObj.getMonth() + 1;
        const dayNum = dateObj.getDate();
        const dateStr = `${monthNum}月${dayNum}日`;
        
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        const dayName = `週${dayNames[dateObj.getDay()]}`;
        
        groups[fullDate] = {
          dateStr,
          dayName,
          list: [],
          dailyExpense: 0,
          dailyIncome: 0
        };
      }
      
      groups[fullDate].list.push(t);
      if (t.type === 'expense') {
        groups[fullDate].dailyExpense += t.amount;
      } else {
        groups[fullDate].dailyIncome += t.amount;
      }
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [processedTxs]);

  return (
    <div 
      className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 text-zinc-200 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
      id="monthly-tx-list-container"
    >
      {/* Header and Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-850">
        <div>
          <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase flex items-center gap-1.5">
            <span>📝 當月記帳明細歷程</span>
            <span className="text-[10px] font-bold bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-450 font-mono">
              {processedTxs.length} 筆
            </span>
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Individual Account Ledger Records</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850 self-start sm:self-center">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'expense'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            僅支出
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'income'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            僅收入
          </button>
        </div>
      </div>

      {/* Dynamic Search queries */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋備註、主分類、或子分類..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:bg-zinc-900/50 focus:outline-none focus:ring-1 focus:ring-white/20 hover:border-zinc-500 focus:border-white text-zinc-100 transition-all duration-300 font-mono"
        />
      </div>

      {groupedTxs.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center text-zinc-500 space-y-2">
          <AlertCircle className="w-6 h-6 text-zinc-600" />
          <div className="text-xs font-mono">找不到符合條件的明細記錄</div>
          <p className="text-[10px] text-zinc-600">請確認選取的月份或更改篩選條件</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {groupedTxs.map(([dateKey, group]) => (
            <div key={dateKey} className="space-y-1.5">
              {/* Day Header with sum */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-bold font-mono tracking-wider text-zinc-400 bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-850/50">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{group.dateStr} ({group.dayName})</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {group.dailyIncome > 0 && (
                    <span className="text-emerald-400">+{group.dailyIncome.toLocaleString()}</span>
                  )}
                  {group.dailyExpense > 0 && (
                    <span className="text-rose-400">-{group.dailyExpense.toLocaleString()}</span>
                  )}
                </span>
              </div>

              {/* Transactions in grouped date */}
              <div className="space-y-1 pl-0.5">
                {group.list.map((tx) => {
                  const IconComp = ICON_MAP[tx.category] || Tag;
                  const displayName = tx.note || tx.subcategory;
                  const isExpense = tx.type === 'expense';
                  
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group flex items-center justify-between p-2.5 bg-zinc-950/25 border border-zinc-850/40 rounded-xl hover:bg-zinc-900/40 hover:border-zinc-700/60 transition-all duration-300"
                    >
                      {/* Left: Category icon and Name details */}
                      <div className="flex items-center gap-2.5 min-w-0 w-full justify-between sm:justify-start">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isExpense 
                              ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' 
                              : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                          }`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs">
                                {displayName}
                              </span>
                              {tx.isRecurring && (
                                <span className="text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 py-0.2 px-1.5 rounded-full font-mono uppercase tracking-wider scale-90 origin-left">
                                  定期
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] font-mono text-zinc-500 tracking-wide mt-0.5">
                              {tx.category} / {tx.subcategory}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Price dynamics and utilities */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-extrabold font-mono ${
                          isExpense ? 'text-zinc-200' : 'text-emerald-400'
                        }`}>
                          {isExpense ? '-' : '+'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>

                        {confirmingId === tx.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in duration-200">
                            <span className="text-[9px] text-rose-400 font-extrabold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-sans shrink-0">
                              刪除?
                            </span>
                            <button
                              onClick={() => {
                                onDeleteTransaction(tx.id);
                                setConfirmingId(null);
                              }}
                              className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
                              title="確認刪除"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                              title="取消"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 transition-all duration-300">
                            {onEditTransaction && (
                              <button
                                onClick={() => onEditTransaction(tx)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer"
                                title="編輯明細"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmingId(tx.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/15 transition-all cursor-pointer"
                              title="刪除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
