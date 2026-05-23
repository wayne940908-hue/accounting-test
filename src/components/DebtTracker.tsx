/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  Check, 
  Clock, 
  AlertTriangle,
  ChevronDown, 
  ChevronUp, 
  Coins, 
  CornerDownRight, 
  Send,
  Loader2,
  Calendar,
  X,
  Edit,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Debt, FrequentDebtor } from '../types';

interface DebtTrackerProps {
  debts: Debt[];
  googleToken: string | null;
  frequentDebtors: FrequentDebtor[];
  onAddDebt: (debtInput: Omit<Debt, 'id'>) => Promise<any>;
  onDeleteDebt: (id: string) => Promise<void>;
  onUpdateDebt: (debt: Debt) => Promise<void>;
  onSignIn: () => Promise<void>;
  onAddFrequentDebtor: (debtorInput: Omit<FrequentDebtor, 'id'>) => Promise<void>;
  onDeleteFrequentDebtor: (id: string) => Promise<void>;
  onUpdateFrequentDebtor: (fd: FrequentDebtor) => Promise<void>;
}

export default function DebtTracker({
  debts,
  googleToken,
  frequentDebtors = [],
  onAddDebt,
  onDeleteDebt,
  onUpdateDebt,
  onSignIn,
  onAddFrequentDebtor,
  onDeleteFrequentDebtor,
  onUpdateFrequentDebtor,
}: DebtTrackerProps) {
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states for standard manual borrow registry
  const [showAddForm, setShowAddForm] = useState(false);
  const [debtorName, setDebtorName] = useState('');
  const [amount, setAmount] = useState('');
  const [debtorEmail, setDebtorEmail] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState(() => {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  });
  
  // Frequent debtors section managers
  const [showCommonModal, setShowCommonModal] = useState(false);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtorEmail, setNewDebtorEmail] = useState('');
  
  // Row inline edit state for Frequent Debtors list
  const [editingDebtorId, setEditingDebtorId] = useState<string | null>(null);
  const [editDebtorName, setEditDebtorName] = useState('');
  const [editDebtorEmail, setEditDebtorEmail] = useState('');

  // Quick Action dialog states
  const [activeQuickFD, setActiveQuickFD] = useState<FrequentDebtor | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDesc, setQuickDesc] = useState('常用帳號快速登記');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Async states
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  // 1. Filtered checklist
  const filteredDebts = useMemo(() => {
    let list = debts;
    
    if (filter === 'unpaid') {
      list = debts.filter(d => !d.isPaid);
    } else if (filter === 'paid') {
      list = debts.filter(d => d.isPaid);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.debtorName.toLowerCase().includes(q) ||
        (d.debtorEmail && d.debtorEmail.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q)
      );
    }

    // Sort by unpaid first, then date descending
    return [...list].sort((a, b) => {
      if (a.isPaid !== b.isPaid) {
        return a.isPaid ? 1 : -1;
      }
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });
  }, [debts, filter, searchQuery]);

  // Aggregations
  const totals = useMemo(() => {
    let unpaidTotal = 0;
    let paidTotal = 0;
    let unpaidCount = 0;

    debts.forEach(d => {
      if (d.isPaid) {
        paidTotal += d.amount;
      } else {
        unpaidTotal += d.amount;
        unpaidCount++;
      }
    });

    return { unpaidTotal, paidTotal, unpaidCount };
  }, [debts]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName || !amount || parseFloat(amount) <= 0) {
      alert('請填寫正確的姓名與金額！');
      return;
    }

    const targetName = debtorName.trim();
    const targetEmail = debtorEmail.trim();

    try {
      await onAddDebt({
        debtorName: targetName,
        debtorEmail: targetEmail,
        amount: parseFloat(amount),
        description: description.trim() || '未填寫描述/分帳',
        datetime: new Date(datetime).toISOString(),
        isPaid: false,
      });

      // Reset Form fields
      setDebtorName('');
      setAmount('');
      setDebtorEmail('');
      setDescription('');
      setShowAddForm(false);

      // Feature 2: Prompt user if they want to save this borrower to Frequent Contacts list
      const alreadyExists = frequentDebtors.some(
        fd => fd.name.trim().toLowerCase() === targetName.toLowerCase()
      );
      if (!alreadyExists) {
        setTimeout(() => {
          if (confirm(`是否將新借款人「${targetName}」${targetEmail ? `(${targetEmail})` : ''} 儲存加至 [常用帳號] 列表中？\n方便未來下次一鍵極速帶入、省去重打姓名 Email 欄位的功夫！`)) {
            onAddFrequentDebtor({
              name: targetName,
              email: targetEmail,
            });
          }
        }, 150);
      }
    } catch (err) {
      console.error(err);
      alert('新增借貸記錄失敗！');
    }
  };

  // Repayment toggle proxy
  const handleTogglePaid = async (debt: Debt) => {
    const updated: Debt = {
      ...debt,
      isPaid: !debt.isPaid,
      paidDatetime: !debt.isPaid ? new Date().toISOString() : undefined,
    };
    await onUpdateDebt(updated);
  };

  // Gmail sender proxy
  const handleSendGmailReminder = async (debt: Debt, skipConfirm = false) => {
    if (!googleToken) {
      if (!skipConfirm && confirm('需要連結您的 Google Account 才能透過您的 Gmail 發送借款通知郵件。是否要現在進行 Google 登入？')) {
        await onSignIn();
      }
      return;
    }

    if (!debt.debtorEmail) {
      if (!skipConfirm) {
        alert('此借貸項目未填寫欠款人 Email 帳號！請至右下角刪除重新新增、或補填欄位。');
      }
      return;
    }

    if (!skipConfirm && !confirm(`確定要向「${debt.debtorName}」(<${debt.debtorEmail}>) 寄送還款催收信件嗎？\n這將透過您的 ${googleToken ? '授權 Gmail 帳號' : 'Google 帳號'} 寄出真實信件。`)) {
      return;
    }

    setSendingEmailId(debt.id);
    setEmailStatus(null);

    try {
      const subject = `【還款通知】親愛的 ${debt.debtorName}，您好，提醒您有一筆借款尚未結清 💸`;
      const dateString = new Date(debt.datetime).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
      const body = `您好 ${debt.debtorName}：\n\n這是一封來自「極簡記帳」所發送的友好還款提醒信件。\n\n根據記錄，您在 ${dateString} 有一筆向我借出的款項，至今尚未歸還結清，詳細情況如下：\n\n- 借款事由：${debt.description}\n- 欠款金額：NT$ ${debt.amount.toLocaleString()} 元\n\n如果已經匯款或歸還，請聯繫我以進行沖銷登記。如果尚未歸還，請利用方便的時間協助歸還，萬分感謝您的協助！\n\n祝 順心如意！\n(此為透過您的友人極簡記帳系統寄送的通知信件)`;

      // Gmail raw message composition (RFC 2822 format)
      // Custom basic base64 header encoding to support Chinese Subjects cleanly in email clients
      const subjectBase64 = btoa(unescape(encodeURIComponent(subject)));
      const rawMessageParts = [
        `To: ${debt.debtorEmail}`,
        `Subject: =?utf-8?B?${subjectBase64}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        body
      ];
      
      const rawMessage = rawMessageParts.join('\r\n');
      
      // Safe Base64URL transformation
      const encodedRaw = btoa(unescape(encodeURIComponent(rawMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedRaw
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '發送失敗');
      }

      // Update counters successfully in database/state
      const updatedDebt: Debt = {
        ...debt,
        reminderSentCount: (debt.reminderSentCount || 0) + 1,
        lastReminderSentAt: new Date().toISOString(),
      };
      await onUpdateDebt(updatedDebt);

      setEmailStatus({ id: debt.id, success: true, msg: '還款郵件發送成功！' });
    } catch (err: any) {
      console.error('Gmail remind error:', err);
      // Check if unauthorized, meaning the token is expired
      let details = err.message || '';
      if (details.includes('401') || details.includes('451') || details.includes('token')) {
        details = 'Google 驗證權限過期，請於右上角重新登入後再試。';
      }
      setEmailStatus({ id: debt.id, success: false, msg: `寄信失敗：${details}` });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Feature 1: Quick lend submit + automatic email dispatching
  const handleQuickLendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuickFD) return;
    const amountVal = parseFloat(quickAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('請填寫大於 0 的金額！');
      return;
    }

    setIsQuickSubmitting(true);
    try {
      // 1. Add debt and retrieve populated entity
      const newDebt = await onAddDebt({
        debtorName: activeQuickFD.name.trim(),
        debtorEmail: (activeQuickFD.email || '').trim(),
        amount: amountVal,
        description: quickDesc.trim() || '常用帳號快速登記',
        datetime: new Date().toISOString(),
        isPaid: false,
      });

      // 2. Clear input values & close overlay modal
      setQuickAmount('');
      setQuickDesc('常用帳號快速登記');
      setActiveQuickFD(null);

      // 3. Auto send Gmail reminder
      if (googleToken && activeQuickFD.email) {
        // Send mail immediately (skip manual clicks)
        await handleSendGmailReminder(newDebt, true);
        alert(`一鍵極速帳記成功！已自動透過您的 Gmail 帳戶向「${activeQuickFD.name}」發送還款提醒郵件 🚀`);
      } else {
        alert(`已成功為「${activeQuickFD.name}」建立應收明細：NT$ ${amountVal.toLocaleString()}！` + 
          (activeQuickFD.email 
            ? '（尚未偵測到您的 Google Account 登入授權，無法為您自動寄信催款。請點右上角登入後點一鍵催款）' 
            : '（此常用帳號未填寫 Email 信箱，若需自動寄信用功能，請點編輯填入信箱！）'
          )
        );
      }
    } catch (err) {
      console.error('Quick lend submission error:', err);
      alert('一鍵借款快速儲存出錯！');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Add a new Frequent Debtor directly
  const handleAddNewDebtorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = newDebtorName.trim();
    const emailVal = newDebtorEmail.trim();
    if (!nameVal) {
      alert('請填寫借款人姓名！');
      return;
    }

    const alreadyExists = frequentDebtors.some(
      fd => fd.name.trim().toLowerCase() === nameVal.toLowerCase()
    );
    if (alreadyExists) {
      alert(`「${nameVal}」已存在於常用帳號列表中！`);
      return;
    }

    try {
      await onAddFrequentDebtor({
        name: nameVal,
        email: emailVal,
      });
      setNewDebtorName('');
      setNewDebtorEmail('');
    } catch(err) {
      console.error(err);
      alert('新增常用帳號失敗！');
    }
  };

  // Start inline editing of a debtor
  const handleStartEditDebtor = (fd: FrequentDebtor) => {
    setEditingDebtorId(fd.id);
    setEditDebtorName(fd.name);
    setEditDebtorEmail(fd.email || '');
  };

  // Save inline editing debtor
  const handleSaveEditDebtor = async (id: string) => {
    const nameVal = editDebtorName.trim();
    const emailVal = editDebtorEmail.trim();
    if (!nameVal) {
      alert('姓名不能為空！');
      return;
    }

    try {
      await onUpdateFrequentDebtor({
        id,
        name: nameVal,
        email: emailVal,
      });
      setEditingDebtorId(null);
    } catch(err) {
      console.error(err);
      alert('儲存常用帳號變更失敗！');
    }
  };

  return (
    <div 
      className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 text-zinc-200 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
      id="debt-tracker-section"
    >
      {/* Container Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-850">
        <div>
          <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase flex items-center gap-1.5">
            <span>💸 借還款催收明細帳</span>
            <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">
              未還款 {totals.unpaidCount} 筆
            </span>
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Track who owes you money & remind them via Gmail</p>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* [常用] Debtors Management Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setShowCommonModal(!showCommonModal);
              setShowAddForm(false);
              setActiveQuickFD(null);
            }}
            className={`px-3 py-1.5 text-[10px] font-black font-mono transition-all rounded-lg border cursor-pointer flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] ${
              showCommonModal 
                ? 'bg-amber-500 text-black border-amber-500 font-black shadow-sm shadow-amber-500/10' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
            }`}
            id="toggle-frequent-debtors-btn"
          >
            <Users className="w-3 h-3 text-amber-450" />
            <span>[常用]</span>
          </button>

          {/* Core manual borrower registration trigger */}
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowCommonModal(false);
              setActiveQuickFD(null);
            }}
            className={`px-3 py-1.5 text-[10px] uppercase font-bold font-mono transition-all rounded-lg border cursor-pointer flex items-center gap-1 hover:scale-[1.02] active:scale-[0.98] ${
              showAddForm 
                ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-sm' 
                : 'bg-white/5 text-zinc-350 border-white/10 hover:bg-white/10'
            }`}
            id="toggle-debt-form-btn"
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span>{showAddForm ? '關閉視窗' : '登記新借出'}</span>
          </button>
        </div>
      </div>

      {/* Summary indicators */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        <div className="p-3 bg-red-950/20 rounded-xl border border-red-900/15">
          <p className="text-[9px] font-bold text-red-400 font-mono uppercase tracking-wider">應收總額 / Total Owed</p>
          <p className="text-lg font-black font-mono text-zinc-100 mt-1">
            NT$ <span className="text-red-400">{totals.unpaidTotal.toLocaleString()}</span>
          </p>
        </div>
        <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850">
          <p className="text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">已歸還庫 / Settled</p>
          <p className="text-lg font-black font-mono text-zinc-100 mt-1">
            NT$ <span className="text-zinc-300">{totals.paidTotal.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Slide down Add debt form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="overflow-hidden bg-zinc-950/50 p-4 rounded-2xl border border-zinc-850 space-y-3"
          >
            <h4 className="text-xs font-bold text-amber-400 font-mono">＋ 登記一筆借出款項 / Borrow Record</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono">借貸人姓名 *</label>
                <input
                  type="text"
                  placeholder="如：小明、同事阿花"
                  value={debtorName}
                  onChange={e => setDebtorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-200"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono">
                  借出金額 (NT$) *
                </label>
                <input
                  type="number"
                  placeholder="請輸入大於 0 的金額"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-zinc-200"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono flex items-center justify-between">
                  <span>借貸人信箱 / Email</span>
                  <span className="text-[8px] text-zinc-500">（填信箱以便通知）</span>
                </label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={debtorEmail}
                  onChange={e => setDebtorEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono">借出日期 / Date</label>
                <input
                  type="date"
                  value={datetime}
                  onChange={e => setDatetime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-zinc-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono">借款原因 or 明細備註說明</label>
              <textarea
                placeholder="如餐飲代墊、買禮物、預支出、代購"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 text-zinc-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-sm"
            >
              確認送出 - 登記一筆應收款項 ➔
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Slide down Frequent Debtors manager */}
      <AnimatePresence>
        {showCommonModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden bg-zinc-950/50 p-4 rounded-2xl border border-zinc-850 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span>👥 常用借款帳號管理 / Frequents List</span>
              </h4>
              <span className="text-[9px] font-mono text-zinc-500">
                共 {frequentDebtors.length} 個常用聯絡人
              </span>
            </div>

            {/* List of frequent debtors */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {frequentDebtors.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 text-zinc-500 text-[10px] font-mono">
                  目前常用聯絡人為空。請手動登記一筆借出款項，或在下方直接新增！
                </div>
              ) : (
                frequentDebtors.map(fd => {
                  const isEditing = editingDebtorId === fd.id;
                  return (
                    <div 
                      key={fd.id} 
                      className="p-3 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900/80 rounded-xl flex items-center justify-between gap-3 transition-colors text-xs"
                    >
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editDebtorName}
                            onChange={e => setEditDebtorName(e.target.value)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            placeholder="借款人姓名"
                          />
                          <input
                            type="email"
                            value={editDebtorEmail}
                            onChange={e => setEditDebtorEmail(e.target.value)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                            placeholder="Email 信箱"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-zinc-200 truncate flex items-center gap-1.5">
                            <span>{fd.name}</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-normal">
                              {fd.email ? `<${fd.email}>` : '(無 Email)'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEditDebtor(fd.id)}
                              className="p-1 text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded cursor-pointer transition-colors"
                              title="儲存"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDebtorId(null)}
                              className="p-1 text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded cursor-pointer transition-colors"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Feature 1: One-click selection to borrow inputs amount and automatically mail */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveQuickFD(fd);
                                setQuickAmount('');
                                setQuickDesc('常用帳號快速登記');
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase font-mono rounded-lg cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                              title="一鍵極速借款，自動寄信"
                            >
                              <Send className="w-3 h-3" />
                              <span>一鍵借款</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditDebtor(fd)}
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded transition-colors cursor-pointer"
                              title="編修資料"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`確定要刪除常用帳戶「${fd.name}」嗎？`)) {
                                  onDeleteFrequentDebtor(fd.id);
                                }
                              }}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors cursor-pointer"
                              title="刪除帳戶"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form to directly append dry Frequent Contacts */}
            <form onSubmit={handleAddNewDebtorSubmit} className="pt-2 border-t border-zinc-900 space-y-2">
              <span className="block text-[10px] font-extrabold text-zinc-400 font-mono">＋ 快速建立新常用聯絡人細項 / Add New Common</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    required
                    value={newDebtorName}
                    onChange={e => setNewDebtorName(e.target.value)}
                    placeholder="姓名 (必填)*"
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900/70 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="email"
                    value={newDebtorEmail}
                    onChange={e => setNewDebtorEmail(e.target.value)}
                    placeholder="Email 信箱 (選填郵寄通知)"
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900/70 border border-zinc-800 rounded-lg font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-full py-1.5 sm:py-0 bg-zinc-850 hover:bg-zinc-800 hover:text-white border border-zinc-800 text-zinc-300 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-550" />
                    <span>新增</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature 1: Quick Amount and Auto Mail input slide dialog block */}
      <AnimatePresence>
        {activeQuickFD && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
              <h4 className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>一鍵極速借出登記與 Gmail 通知 ➔ 「{activeQuickFD.name}」</span>
              </h4>
              <button 
                type="button" 
                onClick={() => setActiveQuickFD(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleQuickLendSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-amber-500/70 mb-1 font-mono">借出金額 (NT$) *</label>
                  <input
                    type="number"
                    required
                    placeholder="請輸入金額"
                    value={quickAmount}
                    onChange={e => setQuickAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-amber-500/20 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                    min="0.01"
                    step="0.01"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-mono">借貸備註說明 / Cause</label>
                  <input
                    type="text"
                    placeholder="預設：常用帳號快速登記"
                    value={quickDesc}
                    onChange={e => setQuickDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {googleToken && activeQuickFD.email ? (
                <div className="bg-green-950/20 border border-green-905/20 p-2.5 rounded-xl text-[10px] text-green-400 flex items-start gap-1.5 leading-relaxed font-mono">
                  <span>🚀</span>
                  <span>
                    <strong>智慧自動化流程啟動：</strong>系統偵測到您已登入且該聯絡人有電子信箱，當您按下下方確認紐後，系統會一秒內<strong>發送正式 Gmail 提醒信</strong>至 &lt;{activeQuickFD.email}&gt;！
                  </span>
                </div>
              ) : (
                <div className="bg-zinc-950 p-2.5 rounded-xl text-[10px] text-zinc-400 flex items-start gap-1.5 leading-relaxed font-mono">
                  <span>ℹ️</span>
                  <span>
                    提示：{!activeQuickFD.email ? '此常用帳號未填寫 Email！' : '您目前未登入 Google 權限，'}建檔後將無法立即發催繳郵件。若要發信，{!activeQuickFD.email ? '請先關閉此視窗點編輯填入信箱。' : '請您先登入 Google 帳號。'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isQuickSubmitting}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1 hover:scale-[1.01] cursor-pointer"
                >
                  {isQuickSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>正在極速登記並寄信中...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>送出並自動發信 (NT$ {parseFloat(quickAmount || '0').toLocaleString()} 元) ➔</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQuickFD(null)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  取消
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Status filters */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 self-start">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilter('unpaid')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'unpaid'
                ? 'bg-red-500 text-white font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-red-400'
            }`}
          >
            未還款
          </button>
          <button
            type="button"
            onClick={() => setFilter('paid')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'paid'
                ? 'bg-zinc-800 text-zinc-100 font-extrabold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            已歸還
          </button>
        </div>

        {/* Local query search box */}
        <input
          type="text"
          placeholder="搜尋借貸人、備註備忘..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1 bg-zinc-950/40 border border-zinc-850 rounded-xl text-xs placeholder-zinc-550 focus:outline-none focus:border-zinc-500 max-w-full sm:max-w-xs text-zinc-300 w-full"
        />
      </div>

      {/* Debts listing */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredDebts.length === 0 ? (
          <p className="text-zinc-500 font-mono text-[10px] text-center py-6 border border-dashed border-zinc-850 rounded-xl bg-zinc-950/20">
            目前找不到相符的借貸項目。
          </p>
        ) : (
          filteredDebts.map(debt => (
            <div 
              key={debt.id} 
              className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                debt.isPaid 
                  ? 'bg-zinc-950/20 border-zinc-900 hover:border-zinc-850 opacity-60' 
                  : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-2">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border font-bold text-xs ${
                    debt.isPaid 
                      ? 'bg-zinc-900 border-zinc-850 text-zinc-500' 
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {debt.isPaid ? '✓' : '借'}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-zinc-100 flex items-center gap-1.5 flex-wrap">
                      <span>{debt.debtorName}</span>
                      {debt.debtorEmail && (
                        <span className="text-[9px] font-bold text-zinc-500 font-mono">
                          &lt;{debt.debtorEmail}&gt;
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono leading-relaxed">
                      備註：{debt.description}
                    </p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                      建立於：{new Date(debt.datetime).toLocaleDateString('zh-TW')}
                      {debt.isPaid && debt.paidDatetime && ` • 歸還於：${new Date(debt.paidDatetime).toLocaleDateString('zh-TW')}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-black font-mono ${debt.isPaid ? 'text-zinc-500 line-through' : 'text-red-400'}`}>
                    NT$ {debt.amount.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleTogglePaid(debt)}
                    className={`mt-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono transition-all flex items-center gap-1 border ${
                      debt.isPaid
                        ? 'bg-zinc-850 border-zinc-800 text-zinc-450 hover:bg-zinc-800'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {debt.isPaid ? '已標記結清' : '標記還款 / Unpaid'}
                  </button>
                </div>
              </div>

              {/* Status and reminders detail footer block */}
              <div className="pt-2 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!debt.isPaid ? (
                    <span className="text-[9px] text-amber-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      待歸還
                    </span>
                  ) : (
                    <span className="text-[9px] text-green-500 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      已結算
                    </span>
                  )}
                  
                  {debt.reminderSentCount && debt.reminderSentCount > 0 ? (
                    <span className="text-[9px] text-zinc-500 font-mono">
                      • 催款信 x{debt.reminderSentCount} 次 
                      {debt.lastReminderSentAt && ` (上次: ${new Date(debt.lastReminderSentAt).toLocaleDateString('zh-TW')})`}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Remind user through Gmail button */}
                  {!debt.isPaid && (
                    <button
                      type="button"
                      disabled={sendingEmailId === debt.id}
                      onClick={() => handleSendGmailReminder(debt)}
                      className={`px-2.5 py-1 text-[9px] font-black rounded-md flex items-center gap-1 transition-all border ${
                        debt.debtorEmail 
                          ? 'bg-amber-500 text-black border-amber-500 font-extrabold hover:bg-amber-400 cursor-pointer' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                      }`}
                      title={debt.debtorEmail ? '立刻用 Gmail 發催還信' : '需增設 Email 才能一鍵寄催繳信'}
                    >
                      {sendingEmailId === debt.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-black" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      <span>
                        {debt.debtorEmail ? 'Gmail 一鍵催款' : '無 Email 無法催繳'}
                      </span>
                    </button>
                  )}

                  {/* Detonation deletion button */}
                  <button
                    type="button"
                    onClick={() => onDeleteDebt(debt.id)}
                    className="p-1 rounded bg-zinc-950/40 border border-zinc-900 hover:bg-red-950/20 hover:border-red-950 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                    title="刪除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Individual send status msg */}
              {emailStatus && emailStatus.id === debt.id && (
                <div className={`mt-1 p-2 rounded-lg text-[9px] font-mono leading-none ${emailStatus.success ? 'bg-green-950/20 text-green-400' : 'bg-red-950/20 text-red-400'}`}>
                  {emailStatus.success ? '✓' : '✗'} {emailStatus.msg}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Gmail auth helper footer warning of logged status */}
      {!googleToken && (
        <p className="text-[9px] text-zinc-500 font-mono text-center pt-2 leading-relaxed">
          💡 提示：在右上角登入 Google 帳號後，可以在未還款右下角使用「Gmail 一鍵催款」直接發送還款請求信，非常便民！
        </p>
      )}
    </div>
  );
}
