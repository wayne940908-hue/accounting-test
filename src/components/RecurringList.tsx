/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Play, 
  Utensils, 
  Car, 
  Gamepad2, 
  Home, 
  HeartPulse, 
  Cloud, 
  Tag, 
  TrendingUp,
  HelpCircle,
  CalendarCheck
} from 'lucide-react';
import { RecurringRule } from '../types';

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

interface RecurringListProps {
  rules: RecurringRule[];
  onToggleRuleActive: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onTriggerRuleManually: (rule: RecurringRule) => void;
}

export default function RecurringList({
  rules,
  onToggleRuleActive,
  onDeleteRule,
  onTriggerRuleManually,
}: RecurringListProps) {
  return (
    <div className="space-y-4">
      
      {/* Title block */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase">
            🗓️ 每月固定扣款與存入清單 ({rules.length} 項)
          </h3>
        </div>
      </div>

      {/* Guide text */}
      <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-805 text-xs text-zinc-400 leading-relaxed font-mono">
        📌 <b>自動認列運算：</b>當您開啟軟體時，系統檢測到目前日期大於扣款日，且本月尚未扣過時，將會<b>自動生成該月交易明細</b>（不重複扣薪）。您也可以隨時點按下方 <b>「立即扣款/存入 (Play)」</b> 進行手動預扣或強行補入！
      </div>

      {rules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const IconComponent = ICON_MAP[rule.category] || HelpCircle;
            const isExpense = rule.type === 'expense';
            return (
              <div 
                key={rule.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  rule.isActive 
                    ? 'border-zinc-800 bg-zinc-900/55 text-zinc-100 shadow-sm' 
                    : 'border-zinc-850 bg-zinc-950/20 text-zinc-500 opacity-55'
                }`}
              >
                {/* Header row */}
                <div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        isExpense 
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-400' 
                          : 'bg-white border-white text-black font-semibold shadow-sm'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono truncate max-w-[120px]">
                          {rule.name}
                        </h4>
                        <span className="text-[9px] font-mono text-zinc-400">
                          {rule.category} • {rule.subcategory}
                        </span>
                      </div>
                    </div>

                    {/* Cost trigger values */}
                    <div className="text-right font-mono">
                      <div className={`text-xs font-bold ${isExpense ? 'text-zinc-300' : 'text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/5'}`}>
                        {isExpense ? '-' : '+'}${rule.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </div>
                      <span className="text-[9px] text-zinc-450 block pt-0.5">每月 {rule.dayOfMonth} 號</span>
                    </div>
                  </div>
                  
                  {rule.note && (
                    <p className="text-[10px] text-zinc-400 italic mt-2.5 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                      備註: {rule.note}
                    </p>
                  )}
                </div>

                {/* Automation actions footer */}
                <div className="flex items-center justify-between pt-3.5 border-t border-zinc-800 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <span className="text-[9px]">
                      上次認列: {rule.lastTriggeredMonth ? `${rule.lastTriggeredMonth} 月` : '無'}
                    </span>
                  </div>

                  {/* Actions Grid */}
                  <div className="flex items-center gap-2">
                    {/* Run manual trigger */}
                    {rule.isActive && (
                      <button
                        onClick={() => onTriggerRuleManually(rule)}
                        className="p-1 px-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="立即預執行本月記帳，無視日期"
                        id={`trigger-manual-rule-${rule.id}`}
                      >
                        <Play className="w-2.5 h-2.5 shrink-0" />
                        <span>認列</span>
                      </button>
                    )}

                    {/* Toggle activation status active/inactive */}
                    <button
                      onClick={() => onToggleRuleActive(rule.id)}
                      className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={rule.isActive ? "暫停排程" : "重啟排程"}
                      id={`toggle-active-rule-${rule.id}`}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-5 h-5 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-zinc-500" />
                      )}
                    </button>

                    {/* Delete template rule */}
                    <button
                      onClick={() => {
                        if (confirm(`確定要刪除固定排程 [${rule.name}] 嗎？`)) {
                           onDeleteRule(rule.id);
                        }
                      }}
                      className="p-1 rounded text-zinc-450 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="永久刪除固定規章"
                      id={`delete-rule-${rule.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
          <p className="text-xs font-semibold text-zinc-400 font-mono">目前尚無固定代扣排程項目</p>
          <span className="text-[10px] text-zinc-650 font-mono">Add streaming subscriptions or paycheck templates above</span>
        </div>
      )}

    </div>
  );
}
