import React from 'react';
import { HardDrive, Lock, ServerOff, ShieldCheck, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="privacy-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Privacy &amp; Local Data Processing Guarantee
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your spreadsheets never leave your device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <ServerOff className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Zero Server Uploads or External APIs
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                CSV Cleaner has no backend server, database, or cloud file processor. Every CSV,
                XLSX, and XLS file is read directly inside your browser using native HTML5{' '}
                <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-700">
                  FileReader
                </code>{' '}
                APIs.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Ephemeral In-Memory Session Only
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Uploaded spreadsheets are held strictly in volatile browser memory while your tab
                is open. Datasets are never written to IndexedDB, cookies, or localStorage. Closing
                or refreshing the tab immediately releases all dataset memory.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Safe for Sensitive &amp; Regulated Data
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Because no network transmission occurs during import, cleaning, or export, you can
                even disconnect from the internet after loading the page and clean files completely
                offline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
