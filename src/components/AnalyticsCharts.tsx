/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area 
} from 'recharts';
import { Transaction } from '../types';
import { Calendar, Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

interface AnalyticsChartsProps {
  transactions: Transaction[];
  selectedMonth: string; // "YYYY-MM"
}

/// Vibrant distinct colors for pie chart categories so they stand out clearly
const DISTINCT_COLORS = [
  '#38bdf8', // Sky blue
  '#fb923c', // Sunset orange
  '#34d399', // Emerald green
  '#f43f5e', // Vibrant rose
  '#818cf8', // Indigo blue
  '#fbbf24', // Amber gold
  '#c084fc', // Bright violet
  '#f472b6', // Soft pink
];

export default function AnalyticsCharts({ transactions, selectedMonth }: AnalyticsChartsProps) {
  
  // 1. Filter transactions for the selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txMonth = tx.datetime.substring(0, 7); // "YYYY-MM"
      return txMonth === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // 2. High-level aggregates
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    monthTransactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });
    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [monthTransactions]);

  // 3. Build data for Pie Chart (Expenses categorized by Main Category)
  const pieData = useMemo(() => {
    const expenseGroups: Record<string, number> = {};
    
    monthTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      expenseGroups[tx.category] = (expenseGroups[tx.category] || 0) + tx.amount;
    });

    return Object.entries(expenseGroups).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    })).sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // 4. Build day-by-day cash outlays curve (花費曲線圖)
  // X-axis: Day of the month
  const curveData = useMemo(() => {
    const year = parseInt(selectedMonth.substring(0, 4));
    const month = parseInt(selectedMonth.substring(5, 7));
    
    const totalDays = new Date(year, month, 0).getDate();
    
    const dailyExpenses = new Array(totalDays).fill(0);
    const dailyIncomes = new Array(totalDays).fill(0);

    monthTransactions.forEach(tx => {
      const day = new Date(tx.datetime).getDate(); // 1-31
      if (day >= 1 && day <= totalDays) {
        if (tx.type === 'expense') {
          dailyExpenses[day - 1] += tx.amount;
        } else {
          dailyIncomes[day - 1] += tx.amount;
        }
      }
    });

    let cumulativeExpense = 0;
    return Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      cumulativeExpense += dailyExpenses[i];
      return {
        day: `${dayNum}日`,
        '單日支出': parseFloat(dailyExpenses[i].toFixed(1)),
        '累積支出': parseFloat(cumulativeExpense.toFixed(1)),
        '單日收入': parseFloat(dailyIncomes[i].toFixed(1)),
      };
    });
  }, [monthTransactions, selectedMonth]);

  // Safe Tooltip Formatter
  const currencyFormatter = (value: any) => [`$${parseFloat(value).toLocaleString()}`, ''];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Income Panel */}
        <div className="bg-zinc-900/40 backdrop-blur-md p-3.5 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-zinc-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">月總收入</span>
            <TrendingUp className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold font-mono text-white truncate">
              +${stats.income.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Total Revenue</span>
          </div>
        </div>

        {/* Expense Panel */}
        <div className="bg-zinc-900/40 backdrop-blur-md p-3.5 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-zinc-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">月總支出</span>
            <TrendingDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold font-mono text-zinc-300 truncate">
              -${stats.expense.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Total Expenses</span>
          </div>
        </div>

        {/* Net Savings (Stunning solid white-black monochrome high contrast accent) */}
        <div className="bg-white p-3.5 rounded-xl border border-white text-black shadow-lg flex flex-col justify-between transition-all duration-300 hover:bg-zinc-50 hover:shadow-[0_0_18px_rgba(255,255,255,0.15)] hover:scale-[1.01]">
          <div className="flex items-center justify-between text-zinc-700 mb-1">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase">本月損益</span>
            <Landmark className="w-3.5 h-3.5 text-black" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-extrabold font-mono truncate text-black">
              {stats.balance >= 0 ? '+' : ''}${stats.balance.toLocaleString()}
            </div>
            <span className="text-[9px] text-zinc-650 font-mono font-bold">Net Balance</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="flex flex-col">
        
        {/* Category Pie Chart */}
        <div className="bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 flex flex-col h-[360px] text-white transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span>● 每月支出結構圓餅圖</span>
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono">Distribution of expenses by category</p>
          </div>

          <div className="grow relative min-h-0 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DISTINCT_COLORS[index % DISTINCT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={currencyFormatter}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#3f3f46',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#ffffff',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', pt: 10, fontFamily: 'sans-serif', color: '#e4e4e7' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-zinc-400 font-mono">本月尚無支出數據</p>
                <span className="text-[10px] text-zinc-500">No Expense Data recorded</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
