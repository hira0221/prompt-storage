'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PROMPT_TEMPLATES, PromptTemplate } from '../utils/templates';
import { SavedPrompt, getSavedPrompts, savePrompt, deletePrompt, incrementUsageCount } from '../utils/storage';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'usage'>('date');
  const [isDark, setIsDark] = useState(false);

  // Active state
  const [activeMode, setActiveMode] = useState<'home' | 'create' | 'view' | 'edit'>('home');
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  
  // Form states
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [promptTitle, setPromptTitle] = useState('');

  // UI States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null); // To show success feedback on copy
  const [isCopyingPreview, setIsCopyingPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  // Initialize client side data and theme
  useEffect(() => {
    setMounted(true);
    setSavedPrompts(getSavedPrompts());

    const theme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToastMessage = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  // Compile categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    PROMPT_TEMPLATES.forEach(t => cats.add(t.category));
    return ['All', ...Array.from(cats)];
  }, []);

  // Filter and Sort saved prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let result = savedPrompts.filter(prompt => {
      const matchesSearch = 
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.compiledPrompt.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategoryFilter === 'All' || 
        PROMPT_TEMPLATES.find(t => t.id === prompt.templateId)?.category === selectedCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === 'usage') {
      result.sort((a, b) => b.usageCount - a.usageCount);
    }

    return result;
  }, [savedPrompts, searchQuery, selectedCategoryFilter, sortBy]);

  // Real-time compilation of current prompt
  const currentCompiledPrompt = useMemo(() => {
    if (!selectedTemplate) return '';
    
    let prompt = selectedTemplate.generatePrompt(formValues);
    if (formValues._absoluteRules && formValues._absoluteRules.trim()) {
      prompt += `\n\n■ 絶対ルール (必ず守るべき制約条件):\n- ${formValues._absoluteRules.trim().split('\n').join('\n- ')}`;
    }
    return prompt;
  }, [selectedTemplate, formValues]);

  // Handle switching to template fill-in
  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setPromptTitle('');
    // Initialize form fields with empty strings
    const initialValues: Record<string, string> = {};
    template.fields.forEach(f => {
      initialValues[f.id] = f.type === 'select' ? f.options?.[0]?.value || '' : '';
    });
    setFormValues(initialValues);
    setActiveMode('create');
    setSelectedPrompt(null);
    setSidebarOpen(false); // Close sidebar on mobile
    setMobileTab('form');
  };

  // Handle prompt save
  const handleSave = () => {
    if (!selectedTemplate) return;
    
    // Auto-generate title if empty
    const finalTitle = promptTitle.trim() || `${selectedTemplate.name} (${new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`;
    
    // Validate required fields
    const missingFields = selectedTemplate.fields.filter(f => f.required && !formValues[f.id]);
    if (missingFields.length > 0) {
      showToastMessage(`「${missingFields[0].label}」を入力してください。`, 'error');
      return;
    }

    const id = activeMode === 'edit' && selectedPrompt ? selectedPrompt.id : Math.random().toString(36).substring(2, 9);
    
    const promptToSave = {
      id,
      title: finalTitle,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      values: formValues,
      compiledPrompt: currentCompiledPrompt
    };

    const updated = savePrompt(promptToSave);
    setSavedPrompts(updated);
    
    // Find the saved prompt to view
    const saved = updated.find(p => p.id === id) || null;
    setSelectedPrompt(saved);
    setActiveMode('view');
    setMobileTab('preview');
    showToastMessage(activeMode === 'edit' ? 'プロンプトを更新しました！' : '倉庫にプロンプトを保存しました！');
  };

  // Handle click saved prompt
  const handleSelectSavedPrompt = (prompt: SavedPrompt) => {
    setSelectedPrompt(prompt);
    setActiveMode('view');
    setSelectedTemplate(null);
    setSidebarOpen(false); // Close sidebar on mobile
    setMobileTab('preview');
  };

  // Handle trigger edit mode
  const handleEditTrigger = (prompt: SavedPrompt) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === prompt.templateId);
    if (!template) {
      showToastMessage('対応するテンプレートが見つかりません。', 'error');
      return;
    }
    setSelectedTemplate(template);
    setFormValues(prompt.values);
    setPromptTitle(prompt.title);
    setActiveMode('edit');
    setSidebarOpen(false);
    setMobileTab('form');
  };

  // Handle delete
  const handleDelete = (id: string) => {
    const updated = deletePrompt(id);
    setSavedPrompts(updated);
    setShowDeleteConfirm(null);
    setActiveMode('home');
    setSelectedPrompt(null);
    setSelectedTemplate(null);
    showToastMessage('プロンプトを削除しました。', 'info');
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string, id?: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      if (id) {
        setCopiedId(id);
        const updated = incrementUsageCount(id);
        setSavedPrompts(updated);
        // Sync selected prompt to show updated count
        if (selectedPrompt && selectedPrompt.id === id) {
          setSelectedPrompt(updated.find(p => p.id === id) || null);
        }
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setIsCopyingPreview(true);
        setTimeout(() => setIsCopyingPreview(false), 2000);
      }
      showToastMessage('クリップボードにコピーしました！', 'success');
    }).catch(err => {
      console.error('Failed to copy', err);
      showToastMessage('コピーに失敗しました。', 'error');
    });
  };

  // Back to home helper
  const handleBackToHome = () => {
    setActiveMode('home');
    setSelectedPrompt(null);
    setSelectedTemplate(null);
  };



  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-[#080b11] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900/50 dark:text-emerald-300' 
            : toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900/50 dark:text-rose-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/80 dark:border-indigo-900/50 dark:text-indigo-300'
        }`}>
          <span>
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">プロンプトの削除</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              このプロンプトを倉庫から削除しますか？この操作は取り消せません。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-950/20"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}



      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-80 flex flex-col glass-sidebar transition-all duration-300 md:static ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToHome}>
            <span className="text-2xl">📦</span>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                万能プロンプト倉庫
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase">Prompt Vault MVP</p>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
            title="テーマ切り替え"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>

        {/* Sidebar Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/50 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="倉庫内のプロンプトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" /></svg>
            </span>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-900/50 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'すべてのカテゴリ' : cat}
                  </option>
                ))}
              </select>
              <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(sortBy === 'date' ? 'usage' : 'date')}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
              title={sortBy === 'date' ? '更新日時順で表示中' : 'よく使う順で表示中'}
            >
              <span>{sortBy === 'date' ? '🕒 新着順' : '🔥 人気順'}</span>
            </button>
          </div>
        </div>

        {/* Saved Prompts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!mounted ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
              ))}
            </div>
          ) : filteredAndSortedPrompts.length > 0 ? (
            filteredAndSortedPrompts.map(prompt => {
              const isActive = selectedPrompt?.id === prompt.id && (activeMode === 'view' || activeMode === 'edit');
              const temp = PROMPT_TEMPLATES.find(t => t.id === prompt.templateId);
              return (
                <div
                  key={prompt.id}
                  onClick={() => handleSelectSavedPrompt(prompt)}
                  className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm'
                      : 'border-slate-150 bg-white hover:bg-slate-50 dark:border-slate-900 dark:bg-slate-950/40 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl mt-0.5">{temp?.emoji || '📄'}</span>
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">
                        {prompt.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>{temp?.name}</span>
                        <span>•</span>
                        <span>{new Date(prompt.updatedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                        {prompt.usageCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-indigo-500 dark:text-indigo-400">📋 {prompt.usageCount}回</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Quick Buttons */}
                  <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(prompt.compiledPrompt, prompt.id);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="コピー"
                    >
                      {copiedId === prompt.id ? (
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(prompt.id);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                      title="削除"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
              <span className="text-3xl text-slate-300 dark:text-slate-700">📂</span>
              <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {searchQuery || selectedCategoryFilter !== 'All' ? '該当するプロンプトがありません' : 'プロンプトが保存されていません'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={() => {
              setActiveMode('home');
              setSelectedPrompt(null);
              setSelectedTemplate(null);
              setSidebarOpen(false);
            }}
            className="w-full py-3 px-4 font-bold text-sm text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            新規プロンプト作成
          </button>
        </div>
      </aside>

      {/* BACKGROUND DECORATION */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Main Content Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-850 px-4 md:px-6 flex items-center justify-between shrink-0 glass-panel">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="プロンプト一覧を開く"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            
            {activeMode !== 'home' && (
              <button
                onClick={handleBackToHome}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="ホームに戻る"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 rounded-full select-none">
              {activeMode === 'home' && '🏠 ホーム'}
              {activeMode === 'create' && '✨ 作成中'}
              {activeMode === 'view' && '📂 閲覧中'}
              {activeMode === 'edit' && '✏️ 編集中'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span>ブラウザ保存 (LocalStorage)</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </header>

        {/* Dynamic Inner Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* MODE: HOME (Welcome and Template Showcase) */}
          {activeMode === 'home' && (
            <div className="max-w-4xl mx-auto space-y-10 py-4">
              
              {/* Hero Banner */}
              <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-violet-950 text-white shadow-xl shadow-indigo-950/20">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                <div className="relative z-10 space-y-4 max-w-xl">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                    プロンプト作成を、<br />
                    もっと直感的に。
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    専門用語は必要ありません。テンプレートを選んで質問に答えるだけで、AIから最高の結果を引き出すプロ仕様のプロンプトが即座に生成されます。
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg text-xs font-medium border border-white/5">
                      <span>✨</span> 専門用語なし
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg text-xs font-medium border border-white/5">
                      <span>📂</span> ローカル保存
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg text-xs font-medium border border-white/5">
                      <span>📋</span> ワンクリックコピー
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates Grid Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg tracking-tight">テンプレートを選択</h3>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">全 5 つのテンプレート</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROMPT_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500/70 dark:hover:border-indigo-500/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-start gap-4"
                    >
                      <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-slate-800 rounded-xl text-2xl group-hover:scale-110 transition-transform">
                        {template.emoji}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {template.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md font-semibold select-none">
                            {template.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-400 leading-normal">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics/Recent Section */}
              {mounted && savedPrompts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-base tracking-tight">最近よく使うプロンプト</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {savedPrompts.slice(0, 3).map(prompt => {
                      const temp = PROMPT_TEMPLATES.find(t => t.id === prompt.templateId);
                      return (
                        <div 
                          key={prompt.id}
                          onClick={() => handleSelectSavedPrompt(prompt)}
                          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-350 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <span className="text-lg">{temp?.emoji || '📄'}</span>
                            <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-250 truncate">{prompt.title}</h4>
                            <p className="text-[10px] text-slate-400">{temp?.name}</p>
                          </div>
                          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                            <span>📋 {prompt.usageCount}回 コピー</span>
                            <span>{new Date(prompt.updatedAt).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* MODE: CREATE or EDIT (Form Filling & Live Preview) */}
          {(activeMode === 'create' || activeMode === 'edit') && selectedTemplate && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Mobile Tabs Header */}
              <div className="lg:hidden flex border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-1 rounded-xl">
                <button
                  onClick={() => setMobileTab('form')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    mobileTab === 'form'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
                  }`}
                >
                  📝 入力フォーム
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    mobileTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
                  }`}
                >
                  👀 完成プレビュー
                  {currentCompiledPrompt && (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Column 1: Fill in forms (Lg: 6/12) */}
                <div className={`lg:col-span-6 space-y-6 ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                
                {/* Form Header info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedTemplate.emoji}</span>
                    <div>
                      <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                        {selectedTemplate.name}
                      </h2>
                      <p className="text-xs text-slate-400">{selectedTemplate.description}</p>
                    </div>
                  </div>
                </div>

                {/* Form Body card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
                  
                  {/* Name field (for catalog) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                      プロンプトの保存名 <span className="text-slate-400 font-normal">(後から一覧で見つける用)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={`例: ${selectedTemplate.name} - 新規プロジェクト用`}
                      value={promptTitle}
                      onChange={(e) => setPromptTitle(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <hr className="border-slate-100 dark:border-slate-800" />

                  {/* Dynamic Fields */}
                  {selectedTemplate.fields.map(field => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-1 font-extrabold">*</span>}
                        </span>
                      </label>

                      {field.type === 'text' && (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          placeholder={field.placeholder}
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-y"
                        />
                      )}

                      {field.type === 'select' && (
                        <div className="relative">
                          <select
                            value={formValues[field.id] || ''}
                            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                            className="w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/40 appearance-none focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium cursor-pointer"
                          >
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Global Common Field: Absolute Rules */}
                  <div className="space-y-1.5 pt-4 border-t border-slate-150 dark:border-slate-850">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                      ⚠️ 絶対ルール・必須の制約条件 <span className="text-slate-400 dark:text-slate-500 font-normal">(全テンプレート共通・任意)</span>
                    </label>
                    <textarea
                      placeholder="例: 「AI」という言葉は使わない、専門用語には必ず補足を付ける、英語での回答は禁止、箇条書きで出力する"
                      value={formValues._absoluteRules || ''}
                      onChange={(e) => setFormValues({ ...formValues, _absoluteRules: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-y"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                      ※ AIが回答を作成する際、最も優先して従わせたい「絶対的な禁止事項やルール」を記述します。
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={handleBackToHome}
                      className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-2 py-3 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-650/15 hover:shadow-indigo-650/30 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      {activeMode === 'edit' ? '変更を上書き保存' : '倉庫に保存する'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Column 2: Live Preview (Lg: 6/12) */}
              <div className={`lg:col-span-6 flex flex-col h-full min-h-[400px] lg:min-h-0 ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    リアルタイムプレビュー
                  </h3>
                  
                  <button
                    onClick={() => handleCopyToClipboard(currentCompiledPrompt)}
                    disabled={!currentCompiledPrompt}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-250 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCopyingPreview ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-emerald-600 dark:text-emerald-400">コピー完了</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        <span>コピーする</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-h-[250px] lg:min-h-0 bg-slate-900 border border-slate-950 text-slate-100 rounded-2xl p-5 font-mono text-xs overflow-auto leading-relaxed shadow-inner shadow-slate-950/20 select-all whitespace-pre-wrap">
                  {currentCompiledPrompt || (
                    <div className="h-full flex items-center justify-center text-slate-500 italic">
                      フォームを入力すると、ここにプロンプトがリアルタイムで作成されます。
                    </div>
                  )}
                </div>
                
                <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-normal text-left">
                  ※ コピーしたプロンプトを ChatGPT、Claude、Gemini などのチャットAIに貼り付けてそのまま送信してください。
                </p>
              </div>

            </div>
          </div>
          )}

          {/* MODE: VIEW (Detail View of Saved Prompt) */}
          {activeMode === 'view' && selectedPrompt && (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Mobile Tabs Header */}
              <div className="lg:hidden flex border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-1 rounded-xl">
                <button
                  onClick={() => setMobileTab('form')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    mobileTab === 'form'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
                  }`}
                >
                  📝 保存された入力値
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    mobileTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
                  }`}
                >
                  👀 完成プロンプト
                </button>
              </div>
              
              {/* Top Meta Details bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="space-y-1">
                  <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {selectedPrompt.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md">
                      {selectedPrompt.templateName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      🕒 更新: {new Date(selectedPrompt.updatedAt).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-bold">
                      📋 コピー: {selectedPrompt.usageCount}回
                    </span>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEditTrigger(selectedPrompt)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                    title="編集する"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-2.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedPrompt.id)}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-950/30 dark:bg-rose-950/20 dark:hover:bg-rose-950/50 transition-colors text-rose-600 dark:text-rose-400"
                    title="削除する"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <button
                    onClick={() => handleCopyToClipboard(selectedPrompt.compiledPrompt, selectedPrompt.id)}
                    className="py-2.5 px-4 rounded-xl text-white bg-indigo-650 hover:bg-indigo-700 transition-all font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-650/30 active:scale-[0.98]"
                  >
                    {copiedId === selectedPrompt.id ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        <span>コピーしました！</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        <span>クリップボードにコピー</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid split parameters / compiled prompt view */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Column 1: Parameters used (Lg: 5/12) */}
                <div className={`lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">保存された入力値</h3>
                    <div className="space-y-4">
                      {PROMPT_TEMPLATES.find(t => t.id === selectedPrompt.templateId)?.fields.map(field => {
                        const val = selectedPrompt.values[field.id];
                        let renderedVal = val;
                        
                        if (field.type === 'select') {
                          renderedVal = field.options?.find(o => o.value === val)?.label || val;
                        }

                        return (
                          <div key={field.id} className="space-y-1 border-l-2 border-slate-200 dark:border-slate-850 pl-3">
                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">{field.label}</span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 block whitespace-pre-wrap">
                              {renderedVal || <span className="text-slate-400 font-normal italic">未入力</span>}
                            </span>
                          </div>
                        );
                      })}

                      {/* Show Absolute Rules if present */}
                      {selectedPrompt.values._absoluteRules && (
                        <div className="space-y-1 border-l-2 border-rose-500 pl-3">
                          <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <span>⚠️</span> 絶対ルール・制約条件
                          </span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 block whitespace-pre-wrap">
                            {selectedPrompt.values._absoluteRules}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-850">
                    <button
                      onClick={() => handleEditTrigger(selectedPrompt)}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-2.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      入力を編集する
                    </button>
                  </div>
                </div>

                {/* Column 2: Prompt View (Lg: 7/12) */}
                <div className={`lg:col-span-7 flex flex-col ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                  <div className="flex-1 bg-slate-900 border border-slate-950 text-slate-100 rounded-2xl p-6 font-mono text-xs leading-relaxed overflow-auto max-h-[500px] shadow-lg shadow-slate-950/10 select-all whitespace-pre-wrap">
                    {selectedPrompt.compiledPrompt}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
