/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Calendar, 
  History, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  LineChart,
  Grid,
  Info,
  Database,
  Unlink,
  Link,
  RotateCcw,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  db, 
  auth, 
  googleProvider, 
  isFirebaseEnabled, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Transaction, RecurringRule, Debt, FrequentDebtor } from './types';
import Header from './components/Header';
import TransactionForm from './components/TransactionForm';
import RecurringRuleForm from './components/RecurringRuleForm';
import AnalyticsCharts from './components/AnalyticsCharts';
import RecurringList from './components/RecurringList';
import MonthlyTransactionsList from './components/MonthlyTransactionsList';
import DebtTracker from './components/DebtTracker';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [frequentDebtors, setFrequentDebtors] = useState<FrequentDebtor[]>([]);
  
  // Tab states and visibility filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showRecurringForm, setShowRecurringForm] = useState<boolean>(false);
  const [activeTxForEdit, setActiveTxForEdit] = useState<Transaction | null>(null);

  // Google Access tracking states
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return sessionStorage.getItem('google_access_token');
  });

  // Initialize offline / LocalStorage fallbacks
  useEffect(() => {
    const savedTxs = localStorage.getItem('minimal_txs');
    const savedRules = localStorage.getItem('minimal_rules');
    const savedDebts = localStorage.getItem('minimal_debts');
    const savedDebtors = localStorage.getItem('minimal_frequent_debtors');
    
    if (savedTxs) {
      try { setTransactions(JSON.parse(savedTxs)); } catch(e) { console.error(e); }
    }
    if (savedRules) {
      try { setRecurringRules(JSON.parse(savedRules)); } catch(e) { console.error(e); }
    }
    if (savedDebts) {
      try { setDebts(JSON.parse(savedDebts)); } catch(e) { console.error(e); }
    }
    if (savedDebtors) {
      try { setFrequentDebtors(JSON.parse(savedDebtors)); } catch(e) { console.error(e); }
    }
  }, []);

  const saveTxsToCache = (txsList: Transaction[]) => {
    localStorage.setItem('minimal_txs', JSON.stringify(txsList));
  };

  const saveRulesToCache = (rulesList: RecurringRule[]) => {
    localStorage.setItem('minimal_rules', JSON.stringify(rulesList));
  };

  const saveDebtsToCache = (debtsList: Debt[]) => {
    localStorage.setItem('minimal_debts', JSON.stringify(debtsList));
  };

  const saveFrequentDebtorsToCache = (debtorsList: FrequentDebtor[]) => {
    localStorage.setItem('minimal_frequent_debtors', JSON.stringify(debtorsList));
  };

  // Google User Auth Setup
  useEffect(() => {
    if (!isFirebaseEnabled || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        console.log("Logged user connected to Google Sync:", user.email);
        
        // 1. Set up dynamic real-time listener for Transactions
        const txsPath = `users/${user.uid}/transactions`;
        const txsUnsub = onSnapshot(collection(db, txsPath), (snapshot) => {
          const list: Transaction[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Transaction);
          });
          setTransactions(list);
          saveTxsToCache(list);
          setIsSyncing(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, txsPath);
        });

        // 2. Set up dynamic real-time listener for Recurring Rules
        const rulesPath = `users/${user.uid}/recurringRules`;
        const rulesUnsub = onSnapshot(collection(db, rulesPath), (snapshot) => {
          const list: RecurringRule[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as RecurringRule);
          });
          setRecurringRules(list);
          saveRulesToCache(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, rulesPath);
        });

        // 3. Set up dynamic real-time listener for Debts
        const debtsPath = `users/${user.uid}/debts`;
        const debtsUnsub = onSnapshot(collection(db, debtsPath), (snapshot) => {
          const list: Debt[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Debt);
          });
          setDebts(list);
          saveDebtsToCache(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, debtsPath);
        });

        // 4. Set up dynamic real-time listener for Frequent Debtors
        const debtorsPath = `users/${user.uid}/frequentDebtors`;
        const debtorsUnsub = onSnapshot(collection(db, debtorsPath), (snapshot) => {
          const list: FrequentDebtor[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as FrequentDebtor);
          });
          setFrequentDebtors(list);
          saveFrequentDebtorsToCache(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, debtorsPath);
        });

        return () => {
          txsUnsub();
          rulesUnsub();
          debtsUnsub();
          debtorsUnsub();
        };
      } else {
        // Logged out: fallback instantly to localStorage data
        const savedTxs = localStorage.getItem('minimal_txs');
        const savedRules = localStorage.getItem('minimal_rules');
        const savedDebts = localStorage.getItem('minimal_debts');
        const savedDebtors = localStorage.getItem('minimal_frequent_debtors');
        setTransactions(savedTxs ? JSON.parse(savedTxs) : []);
        setRecurringRules(savedRules ? JSON.parse(savedRules) : []);
        setDebts(savedDebts ? JSON.parse(savedDebts) : []);
        setFrequentDebtors(savedDebtors ? JSON.parse(savedDebtors) : []);
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, [isFirebaseEnabled]);

  // Auth Operations
  const handleSignIn = async () => {
    if (!isFirebaseEnabled || !auth || !googleProvider) {
      alert("未啟用 Firebase，請先確認 Firebase 連線。");
      return;
    }
    try {
      setIsSyncing(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Extract Google OAuth Access Token to access Sheets API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      
      // Merge current offline state with online database if they wish
      if (result.user && (transactions.length > 0 || recurringRules.length > 0 || debts.length > 0 || frequentDebtors.length > 0)) {
        if (confirm("是否將您目前本地端的交易、定期排程、借還款與常用帳號記錄備份，並同步合併到您的 Google 雲端帳戶？")) {
          await mergeLocalToCloud(result.user.uid, transactions, recurringRules, debts, frequentDebtors);
        }
      }
    } catch (e) {
      console.error("Sign-in failure:", e);
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      setIsSyncing(true);
      await signOut(auth);
      setCurrentUser(null);
      setGoogleToken(null);
      sessionStorage.removeItem('google_access_token');
    } catch(e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  // Merge tool (utility helper)
  const mergeLocalToCloud = async (uid: string, localTxs: Transaction[], localRules: RecurringRule[], localDebts: Debt[], localDebtors: FrequentDebtor[]) => {
    try {
      const batch = writeBatch(db);
      
      localTxs.forEach(tx => {
        const txRef = doc(db, `users/${uid}/transactions`, tx.id);
        batch.set(txRef, tx);
      });

      localRules.forEach(rule => {
        const ruleRef = doc(db, `users/${uid}/recurringRules`, rule.id);
        batch.set(ruleRef, rule);
      });

      localDebts.forEach(debt => {
        const debtRef = doc(db, `users/${uid}/debts`, debt.id);
        batch.set(debtRef, debt);
      });

      localDebtors.forEach(debtor => {
        const debtorRef = doc(db, `users/${uid}/frequentDebtors`, debtor.id);
        batch.set(debtorRef, debtor);
      });

      await batch.commit();
      console.log("Merge completed successfully!");
    } catch(e) {
      console.error("Failed to merge databases:", e);
    }
  };

  const handleForceSync = () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("同步成功！雲端與本地資料庫已為最新狀態。");
    }, 600);
  };

  // Centralized CRUD Action proxy
  const triggerTransactionSave = async (updatedTxs: Transaction[]) => {
    setTransactions(updatedTxs);
    saveTxsToCache(updatedTxs);
  };

  const triggerRulesSave = async (updatedRules: RecurringRule[]) => {
    setRecurringRules(updatedRules);
    saveRulesToCache(updatedRules);
  };

  const triggerDebtsSave = async (updatedDebts: Debt[]) => {
    setDebts(updatedDebts);
    saveDebtsToCache(updatedDebts);
  };

  // Add a brand new manually added transaction
  const handleAddTransaction = async (txInput: Omit<Transaction, 'id'>) => {
    const newId = `tx-${String(Date.now())}-${Math.floor(Math.random() * 1000)}`;
    const newTx: Transaction = {
      id: newId,
      ...txInput,
    };

    const nextTxs = [newTx, ...transactions];
    await triggerTransactionSave(nextTxs);

    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${newId}`;
      try {
        await setDoc(doc(db, path), newTx);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  // Update transaction notes or pricing
  const handleUpdateTransaction = async (tx: Transaction) => {
    const nextTxs = transactions.map(t => t.id === tx.id ? tx : t);
    await triggerTransactionSave(nextTxs);

    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${tx.id}`;
      try {
        await setDoc(doc(db, path), tx);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    setActiveTxForEdit(null);
  };



  // Delete ledger entry
  const handleDeleteTransaction = async (id: string) => {
    const nextTxs = transactions.filter(t => t.id !== id);
    await triggerTransactionSave(nextTxs);

    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
    
    // Clear edit state if deleting active edited item
    if (activeTxForEdit?.id === id) {
      setActiveTxForEdit(null);
    }
  };

  // Add subscription template
  const handleAddRecurringRule = async (ruleInput: Omit<RecurringRule, 'id'>) => {
    const rId = `rule-${String(Date.now())}-${Math.floor(Math.random() * 1000)}`;
    const newRule: RecurringRule = {
      id: rId,
      ...ruleInput,
    };

    const nextRules = [newRule, ...recurringRules];
    await triggerRulesSave(nextRules);

    if (currentUser) {
      const path = `users/${currentUser.uid}/recurringRules/${rId}`;
      try {
        await setDoc(doc(db, path), newRule);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    setShowRecurringForm(false);
  };

  // Toggle template active status
  const handleToggleRuleActive = async (id: string) => {
    const nextRules = recurringRules.map(r => {
      if (r.id === id) {
        const updated = { ...r, isActive: !r.isActive };
        if (currentUser) {
          const path = `users/${currentUser.uid}/recurringRules/${id}`;
          setDoc(doc(db, path), updated).catch(e => handleFirestoreError(e, OperationType.WRITE, path));
        }
        return updated;
      }
      return r;
    });
    await triggerRulesSave(nextRules);
  };

  // Delete recurring rule
  const handleDeleteRule = async (id: string) => {
    const nextRules = recurringRules.filter(r => r.id !== id);
    await triggerRulesSave(nextRules);

    if (currentUser) {
      const path = `users/${currentUser.uid}/recurringRules/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Add a new Debt record
  const handleAddDebt = async (debtInput: Omit<Debt, 'id'>) => {
    const newId = `debt-${String(Date.now())}-${Math.floor(Math.random() * 1500)}`;
    const newDebt: Debt = {
      id: newId,
      ...debtInput,
    };

    const nextDebts = [newDebt, ...debts];
    await triggerDebtsSave(nextDebts);

    if (currentUser) {
      const path = `users/${currentUser.uid}/debts/${newId}`;
      try {
        await setDoc(doc(db, path), newDebt);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    return newDebt;
  };

  // Delete a Debt record
  const handleDeleteDebt = async (id: string) => {
    const nextDebts = debts.filter(d => d.id !== id);
    await triggerDebtsSave(nextDebts);

    if (currentUser) {
      const path = `users/${currentUser.uid}/debts/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Update a Debt record (such as marking as paid, or incrementing email reminders)
  const handleUpdateDebt = async (debt: Debt) => {
    const nextDebts = debts.map(d => d.id === debt.id ? debt : d);
    await triggerDebtsSave(nextDebts);

    if (currentUser) {
      const path = `users/${currentUser.uid}/debts/${debt.id}`;
      try {
        await setDoc(doc(db, path), debt);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  // Trigger Frequent Debtor Central CRUD Action proxy
  const triggerFrequentDebtorsSave = async (updatedDebtors: FrequentDebtor[]) => {
    setFrequentDebtors(updatedDebtors);
    saveFrequentDebtorsToCache(updatedDebtors);
  };

  // Add a Frequent Debtor
  const handleAddFrequentDebtor = async (debtorInput: Omit<FrequentDebtor, 'id'>) => {
    const newId = `fd-${String(Date.now())}-${Math.floor(Math.random() * 1000)}`;
    const newDebtor: FrequentDebtor = {
      id: newId,
      ...debtorInput,
    };
    const nextDebtors = [newDebtor, ...frequentDebtors];
    await triggerFrequentDebtorsSave(nextDebtors);

    if (currentUser) {
      const path = `users/${currentUser.uid}/frequentDebtors/${newId}`;
      try {
        await setDoc(doc(db, path), newDebtor);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  // Delete a Frequent Debtor
  const handleDeleteFrequentDebtor = async (id: string) => {
    const nextDebtors = frequentDebtors.filter(fd => fd.id !== id);
    await triggerFrequentDebtorsSave(nextDebtors);

    if (currentUser) {
      const path = `users/${currentUser.uid}/frequentDebtors/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Update a Frequent Debtor details
  const handleUpdateFrequentDebtor = async (fd: FrequentDebtor) => {
    const nextDebtors = frequentDebtors.map(item => item.id === fd.id ? fd : item);
    await triggerFrequentDebtorsSave(nextDebtors);

    if (currentUser) {
      const path = `users/${currentUser.uid}/frequentDebtors/${fd.id}`;
      try {
        await setDoc(doc(db, path), fd);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  // Trigger rule manual execution (認列) - bypasses date/history checks
  const handleTriggerRuleManually = async (rule: RecurringRule) => {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Create actual ledger document mirroring this template rule
    const newId = `tx-rec-${rule.id}-${Date.now()}`;
    
    // Set custom historical datetime on the scheduled day of the current selected month!
    const scheduledDayStr = String(rule.dayOfMonth).padStart(2, '0');
    const customISO = `${selectedMonth}-${scheduledDayStr}T09:00:00.000Z`;

    const newTx: Transaction = {
      id: newId,
      datetime: customISO,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      subcategory: rule.subcategory,
      note: `[自動扣款/存入] ${rule.name}`,
      isRecurring: true,
      recurringRuleId: rule.id,
    };

    // Update transactions list
    const updatedTxs = [newTx, ...transactions];
    await triggerTransactionSave(updatedTxs);

    // Update rule's lastTriggeredMonth to avoid duplicate automatic firing
    const updatedRules = recurringRules.map(r => {
      if (r.id === rule.id) {
        const u = { ...r, lastTriggeredMonth: selectedMonth.substring(0,7) };
        if (currentUser) {
          const rulePath = `users/${currentUser.uid}/recurringRules/${r.id}`;
          setDoc(doc(db, rulePath), u).catch(e => handleFirestoreError(e, OperationType.WRITE, rulePath));
        }
        return u;
      }
      return r;
    });
    await triggerRulesSave(updatedRules);

    if (currentUser) {
      const txPath = `users/${currentUser.uid}/transactions/${newId}`;
      try {
        await setDoc(doc(db, txPath), newTx);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, txPath);
      }
    }

    alert(`已完成認列 [${rule.name}] ${rule.type === 'expense' ? '扣款' : '存入'}：$${rule.amount}！`);
  };

  // AUTOMATIC RECURRING RULES PROCESSING ENGINE
  // Triggers automatically upon month view shifts or startup
  useEffect(() => {
    if (recurringRules.length === 0) return;

    const today = new Date();
    const currentDOM = today.getDate(); // current day: e.g., 22
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let hasMadeChanges = false;
    let tempTxs = [...transactions];
    let tempRules = [...recurringRules];

    tempRules.forEach((rule) => {
      // Verify rule is active, and the current DOM is >= rule's scheduled dayOfMonth
      // and has NOT triggered yet in the current calendar month!
      if (rule.isActive && currentDOM >= rule.dayOfMonth && rule.lastTriggeredMonth !== currentYM) {
        const newId = `tx-rec-${rule.id}-${currentYM}`;
        
        // Verify this specific auto-deduction ID does not already exist to be safe
        const exists = tempTxs.some(t => t.id === newId);
        if (!exists) {
          const scheduledDayStr = String(rule.dayOfMonth).padStart(2, '0');
          // Format precisely on scheduled date at 9 AM local timezone
          const autoISO = `${currentYM}-${scheduledDayStr}T09:00:00.000Z`;

          const autoTx: Transaction = {
            id: newId,
            datetime: autoISO,
            amount: rule.amount,
            type: rule.type,
            category: rule.category,
            subcategory: rule.subcategory,
            note: `[自動定期排程] ${rule.name}`,
            isRecurring: true,
            recurringRuleId: rule.id,
          };

          tempTxs = [autoTx, ...tempTxs];
          rule.lastTriggeredMonth = currentYM;
          hasMadeChanges = true;

          // Propagate writes to database in background
          if (currentUser) {
            const txPath = `users/${currentUser.uid}/transactions/${newId}`;
            const rPath = `users/${currentUser.uid}/recurringRules/${rule.id}`;
            setDoc(doc(db, txPath), autoTx).catch(e => handleFirestoreError(e, OperationType.WRITE, txPath));
            setDoc(doc(db, rPath), rule).catch(e => handleFirestoreError(e, OperationType.WRITE, rPath));
          }
        } else {
          // If transaction was generated but rules tracker is out of sync, sync tracker in state
          rule.lastTriggeredMonth = currentYM;
          hasMadeChanges = true;
        }
      }
    });

    if (hasMadeChanges) {
      console.log("Automated monthly schedule rules processed!");
      triggerTransactionSave(tempTxs);
      triggerRulesSave(tempRules);
    }
  }, [transactions, recurringRules, currentUser]);

  // Quick addition action specifically called from virtual iOS Widget
  const handleQuickAddFromWidget = (category: string, subcategory: string, amount: number, type: 'expense' | 'income') => {
    handleAddTransaction({
      datetime: new Date().toISOString(),
      amount,
      type,
      category,
      subcategory,
      note: '來自 iOS 主畫面小工具捷徑',
    });
  };

  // Import external backup list
  const handleImportBackup = async (validatedTxs: Transaction[]) => {
    // Generate new lists merging inputs
    const existingIds = new Set(transactions.map(t => t.id));
    const mergedTxs = [...transactions];
    let addedCount = 0;

    validatedTxs.forEach(tx => {
      if (!existingIds.has(tx.id)) {
        mergedTxs.push(tx);
        addedCount++;
        
        // Sync to cloud if online
        if (currentUser) {
          const path = `users/${currentUser.uid}/transactions/${tx.id}`;
          setDoc(doc(db, path), tx).catch(e => handleFirestoreError(e, OperationType.WRITE, path));
        }
      }
    });

    if (addedCount > 0) {
      await triggerTransactionSave(mergedTxs);
      alert(`備份匯入完成！成功新增並合併了 ${addedCount} 筆交易明細。`);
    } else {
      alert("匯入完成：檔案內的所有記帳編號皆已存在，無須重複合併。");
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const parts = selectedMonth.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const parts = selectedMonth.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  // Filter transactions belonging to current selected dashboard query month only
  const filteredTxs = transactions.filter(t => t.datetime.substring(0, 7) === selectedMonth);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 selection:bg-white selection:text-black">
      {/* 手機版頂端多預留兩格字體大小（約 2.5 字符高），避免 PWA 載入時頂端被狀態列遮擋 */}
      <div className="h-[2.5rem] block sm:hidden" />

      {/* 1. Header Toolbar */}
      <Header
        user={currentUser}
        isSyncing={isSyncing}
        isFirebaseActive={isFirebaseEnabled}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onForceSync={handleForceSync}
      />

      {/* 2. Main content grids structured inside a gorgeous slide-up motion card */}
      <motion.main 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
      >

        {/* Unpaid debts warning banner */}
        {debts.filter(d => !d.isPaid).length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border-2 border-red-500/25 rounded-3xl p-5 shadow-[0_0_30px_rgba(239,68,68,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shrink-0 text-xl shadow-md">
                ⚠️
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-red-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                  <span>還款逾期警報 / DEBT PAYMENT OVERDUE</span>
                </h4>
                <div className="text-zinc-300 text-xs mt-1.5 leading-relaxed">
                  警告：您目前有 <span className="text-red-400 font-black">{debts.filter(d => !d.isPaid).length} 筆</span> 應收借款尚未歸還，累計催收金額為{' '}
                  <span className="text-red-400 font-mono font-black text-sm">
                    NT$ {debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                  </span>：
                  <div className="mt-2 text-[11px] text-zinc-400 bg-black/40 p-3 rounded-xl border border-red-950/20 space-y-1.5 max-h-[140px] overflow-y-auto">
                    {debts.filter(d => !d.isPaid).map(d => (
                      <div key={d.id} className="flex items-center justify-between gap-2 border-b border-zinc-900/40 pb-1 last:border-0 last:pb-0">
                        <span className="truncate">
                          • <strong className="text-zinc-200">{d.debtorName}</strong>：{d.description}
                        </span>
                        <span className="text-red-400 font-mono font-bold shrink-0">NT$ {d.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <a 
              href="#debt-tracker-section"
              className="px-4 py-2.5 bg-red-500 hover:bg-red-400 text-black font-extrabold text-xs rounded-xl shadow-md transition-all self-stretch md:self-center text-center flex items-center justify-center gap-1 whitespace-nowrap hover:scale-[1.01]"
            >
              立刻去催還 ➔
            </a>
          </motion.div>
        )}
        
        {/* Top Month Scroller Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-sm gap-3 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-4 h-4 text-white" />
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-white leading-none">
                📅 當月份記帳切換
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                今天：{(() => {
                  const d = new Date();
                  const month = d.getMonth() + 1;
                  const day = d.getDate();
                  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                  const weekday = weekdays[d.getDay()];
                  return `${month}月${day}日 (週${weekday})`;
                })()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 px-2 border border-white/10 hover:bg-white/10 bg-white/5 text-zinc-350 rounded-lg transition-colors cursor-pointer"
              title="前一個月"
              id="prev-month-scroll"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold font-mono bg-white text-black px-3.5 py-1 rounded-lg">
              {selectedMonth.substring(0, 4)} 年 {selectedMonth.substring(5, 7)} 月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 px-2 border border-white/10 hover:bg-white/10 bg-white/5 text-zinc-350 rounded-lg transition-colors cursor-pointer"
              title="後一個月"
              id="next-month-scroll"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel block (Forms and schedules) - span 5 */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Dynamic ledger adding block */}
            <div className="space-y-4">
              <TransactionForm
                onAddTransaction={handleAddTransaction}
                activeTx={activeTxForEdit}
                onUpdateTransaction={handleUpdateTransaction}
                onClose={activeTxForEdit ? () => setActiveTxForEdit(null) : undefined}
              />
              
              {activeTxForEdit && (
                <div className="p-3 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-850 text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>您正在編輯 ID 為 {activeTxForEdit.id.substring(0, 8)}... 的交易明細。</span>
                </div>
              )}
            </div>

            {/* Recurring Rule additions triggers drawers */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 text-zinc-200 transition-all duration-300 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold tracking-wider text-white font-mono uppercase">
                    ⏰ 固定定期排程設定
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-mono">Monthly Recurring Subscriptions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecurringForm(!showRecurringForm)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold font-mono transition-colors rounded-lg border cursor-pointer ${
                    showRecurringForm 
                      ? 'bg-white text-black border-white font-extrabold shadow-sm' 
                      : 'bg-white/5 text-zinc-350 border-white/10 hover:bg-white/10'
                  }`}
                  id="toggle-recurring-form-btn"
                >
                  {showRecurringForm ? '隱藏排程表' : '＋ 新增排程'}
                </button>
              </div>

              {showRecurringForm && (
                <div className="animate-in fade-in duration-200">
                  <RecurringRuleForm
                    onAddRule={handleAddRecurringRule}
                    onClose={() => setShowRecurringForm(false)}
                  />
                </div>
              )}

              {/* Recurring schedules summaries */}
              <RecurringList
                rules={recurringRules}
                onToggleRuleActive={handleToggleRuleActive}
                onDeleteRule={handleDeleteRule}
                onTriggerRuleManually={handleTriggerRuleManually}
              />
            </div>

            {/* Debt/borrowing催收 tracking ledger */}
            <DebtTracker
              debts={debts}
              googleToken={googleToken}
              frequentDebtors={frequentDebtors}
              onAddDebt={handleAddDebt}
              onDeleteDebt={handleDeleteDebt}
              onUpdateDebt={handleUpdateDebt}
              onSignIn={handleSignIn}
              onAddFrequentDebtor={handleAddFrequentDebtor}
              onDeleteFrequentDebtor={handleDeleteFrequentDebtor}
              onUpdateFrequentDebtor={handleUpdateFrequentDebtor}
            />

          </div>

          {/* Right panel blocks (Charts and databases history) - span 7 */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visual charting indices */}
            <AnalyticsCharts
              transactions={transactions}
              selectedMonth={selectedMonth}
            />

            {/* Monthly transactions list with inline deleting triggers */}
            <MonthlyTransactionsList
              transactions={transactions}
              selectedMonth={selectedMonth}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={setActiveTxForEdit}
            />

          </div>

        </div>

      </motion.main>

      {/* 3. Footer branding design */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-6 mt-12 text-center text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 text-[10px] space-y-1">
          <p>極簡記帳 • B&W Monochrome Accounting applet</p>
          <p>© 2026 Google AI Studio Build. Standalone PWA Capable.</p>
        </div>
      </footer>
    </div>
  );
}
