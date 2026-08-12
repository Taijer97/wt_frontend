import React from 'react';
import { CheckCircle } from 'lucide-react';

interface DocumentUploadProps {
  label: string;
  file: string | null;
  onChange: (s: string) => void;
  onChangeFile?: (f: File) => void;
  icon: React.ReactNode;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  label,
  file,
  onChange,
  onChangeFile,
  icon,
}) => (
  <label
    className={`block p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
      file
        ? 'bg-emerald-50 border-emerald-500 shadow-inner'
        : 'bg-slate-50 border-slate-200 hover:border-orange-500 hover:bg-slate-100/50'
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`p-2.5 rounded-xl ${
          file ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200 shadow-xs'
        }`}
      >
        {file ? <CheckCircle className="w-5 h-5" /> : icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <span className={`block text-xs font-bold uppercase ${file ? 'text-emerald-800' : 'text-slate-600'}`}>
          {label}
        </span>
        {file && <span className="text-[10px] font-mono text-emerald-600 font-bold block truncate">{file}</span>}
      </div>
      {!file && <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Adjuntar</span>}
    </div>
    <input
      type="file"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          onChange(f.name);
          onChangeFile?.(f);
        }
      }}
      accept=".pdf,image/*"
    />
  </label>
);
