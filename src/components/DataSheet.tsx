import React, { useRef } from 'react';
import { Download, FileCode2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { WealthState } from '../types/wealth';
import { buildStandaloneHtml } from '../utils/exportSingleHtml';
import { BottomSheet } from './BottomSheet';

interface DataSheetProps {
  open: boolean;
  onClose: () => void;
  state: WealthState;
  onImportState: (next: WealthState) => void;
  onResetSample: () => void;
  onClearBlank: () => void;
}

export const DataSheet: React.FC<DataSheetProps> = ({
  open,
  onClose,
  state,
  onImportState,
  onResetSample,
  onClearBlank,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSingleFileHtml = () => {
    const html = buildStandaloneHtml(state);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJsonBackup = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.banks && parsed.investments) {
          onImportState(parsed as WealthState);
          onClose();
        }
      } catch {
        // Ignore malformed file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Data Backup & GitHub Pages Export"
      subtitle="Export an easy-to-edit single index.html file or JSON backup"
    >
      <div className="space-y-4">
        {/* Single File HTML Export */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileCode2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Single-File HTML (GitHub Pages Ready)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Downloads a complete, unminified <code className="font-mono">index.html</code> with your current balances, categories, goals, and calendar bills pre-loaded. Upload it straight to GitHub Pages for free hosting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadSingleFileHtml}
            className="w-full h-11 rounded-xl bg-slate-900 dark:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Download Single-File index.html
          </button>
        </div>

        {/* JSON Backup / Restore */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={downloadJsonBackup}
            className="h-11 rounded-xl glass-subcard text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:border-sky-500/40"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 rounded-xl glass-subcard text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:border-sky-500/40"
          >
            <Upload className="w-4 h-4" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportJson}
            className="hidden"
          />
        </div>

        {/* Reset Options */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onResetSample();
              onClose();
            }}
            className="h-11 rounded-xl border border-slate-200 dark:border-white/15 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 inline-flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <RotateCcw className="w-4 h-4" />
            Load Sample Data
          </button>
          <button
            type="button"
            onClick={() => {
              onClearBlank();
              onClose();
            }}
            className="h-11 rounded-xl border border-rose-500/30 text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 inline-flex items-center justify-center gap-1.5 hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Start Fresh (₹0)
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
