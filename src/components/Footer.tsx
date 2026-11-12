import React from 'react';
import { BookOpen, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 pb-12 pt-8 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="clay-box p-6 sm:p-8 bg-white/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Project Details */}
            <div>
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-lg text-slate-800 tracking-tight">StudySyncPlus</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  Claymorphic Web App
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Full-featured student resource sharing portal designed to fulfill all course syllabus requirements (CO1 through CO6).
              </p>
            </div>

            {/* Author Team Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                Student Development Team
              </p>
              <div className="text-xs text-slate-700 font-medium space-y-1">
                <p className="flex items-center justify-between">
                  <span><strong>Tanmay Shinde</strong> (Roll 67)</span>
                  <span className="font-mono text-indigo-600 text-[11px]">126BTCM2008</span>
                </p>
                <p className="flex items-center justify-between">
                  <span><strong>Aditya Shah</strong> (Roll 68)</span>
                  <span className="font-mono text-indigo-600 text-[11px]">126BTCM2009</span>
                </p>
              </div>
            </div>

            {/* Academic Accreditation */}
            <div className="text-xs text-slate-500 space-y-1 text-left md:text-right">
              <p className="font-bold text-slate-700">Shah & Anchor Kutchhi Engineering College</p>
              <p>Department of Computer Engineering</p>
              <p className="text-[11px] text-indigo-600 font-medium">Course: Web Computing & Modern Frameworks</p>
              <p className="text-[10px] text-slate-400 mt-2">
                Hosted via GitHub Pages • React 18 • Chart.js • Claymorphic UI
              </p>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};
