/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, LogIn, LogOut, CheckCircle2, Calendar } from 'lucide-react';

interface HeaderProps {
  user: any;
  isSyncing: boolean;
  isFirebaseActive: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onForceSync: () => void;
}

export default function Header({
  user,
  isSyncing,
  isFirebaseActive,
  onSignIn,
  onSignOut,
  onForceSync,
}: HeaderProps) {
  // Format dynamic today's date Chinese description
  const getTodayString = () => {
    const d = new Date();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[d.getDay()];
    return `${month}月${day}日 (週${weekday})`;
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40 px-4 pt-7 pb-3 sm:px-6 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand & Concept */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-mono font-bold text-lg select-none ring-2 ring-white/10 shadow-sm">
              記
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white select-none">
                記帳
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400 font-mono mt-0.5">
                <span>Zen Accountant • Frosted Glass Dark</span>
                <span className="hidden leading-none sm:inline text-zinc-650">•</span>
                <span className="text-white font-medium bg-white/10 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  今天：{getTodayString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Controls & Auth Setup */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sync status indicator */}
          <div className="grow sm:grow-0">
            {isFirebaseActive ? (
              user ? (
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-300 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-mono">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    已備份 • {user.displayName || user.email}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white/5 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono">
                  <CloudOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                  <span>本地儲存模式</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 bg-white/5 text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono" title="未偵測到 Firebase 設定。可在左側控制台進行「Firebase 設定」。">
                <CloudOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>單機離線模式</span>
              </div>
            )}
          </div>

          {/* Core Sign-In / Data Transfer Actions */}
          <div className="flex items-center gap-1.5">
            {isFirebaseActive ? (
              user ? (
                <>
                  <button
                    onClick={onForceSync}
                    disabled={isSyncing}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="立即同步雲端資料"
                    id="force-sync-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : ''}`} />
                  </button>
                  <button
                    onClick={onSignOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-red-400 transition-colors"
                    id="sign-out-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">登出帳戶</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer shadow-md"
                  id="sign-in-btn"
                >
                  <LogIn className="w-3.5 h-3.5 text-black" />
                  <span>Google 登入備份</span>
                </button>
              )
            ) : (
              // Offline mode instructions triggers or local JSON backup trigger
              <button
                onClick={() => {
                  alert("記帳資料已自動存在您此瀏覽器的 LocalStorage 中。\n\n欲啟用雲端 Google 帳戶同步與備份功能：\n1. 請在 AI Studio 的 Firebase 設定面板進行資料庫及 Auth 綁定。\n2. 綁定成功後，即可使用 Google 登入並同步！");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 transition-colors"
                id="cloud-help-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-405" />
                <span>備份說明</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
