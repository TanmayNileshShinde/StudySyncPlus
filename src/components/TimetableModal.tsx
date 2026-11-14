import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

interface Period {
  time: string;
  subject: string;
  code: string;
  room: string;
  type: 'Theory' | 'Lab' | 'Project';
  batch?: string;
}

const SCHEDULE: Record<string, Period[]> = {
  Monday: [
    { time: '09:00 - 10:00', subject: 'Data Structures', code: 'CMCOR2PC203', room: 'CR-401', type: 'Theory' },
    { time: '10:00 - 11:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-401', type: 'Theory' },
    { time: '11:15 - 01:15', subject: 'Web Technology II Lab', code: 'CMLOR2VS201', room: 'Lab 502', type: 'Lab', batch: 'All Batches' },
    { time: '02:00 - 03:00', subject: 'Discrete Structures', code: 'CMCOR2PC201', room: 'CR-401', type: 'Theory' },
    { time: '03:00 - 04:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-401', type: 'Theory' }
  ],
  Tuesday: [
    { time: '09:00 - 10:00', subject: 'Discrete Structures', code: 'CMCOR2PC201', room: 'CR-401', type: 'Theory' },
    { time: '10:00 - 11:00', subject: 'Data Structures', code: 'CMCOR2PC203', room: 'CR-401', type: 'Theory' },
    { time: '11:15 - 01:15', subject: 'Data Structures Lab', code: 'CMCOR2PC203', room: 'Lab 504', type: 'Lab', batch: 'B1 & B2' },
    { time: '02:00 - 03:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-401', type: 'Theory' },
    { time: '03:00 - 04:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-401', type: 'Theory' }
  ],
  Wednesday: [
    { time: '09:00 - 10:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-401', type: 'Theory' },
    { time: '10:00 - 11:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-401', type: 'Theory' },
    { time: '11:15 - 01:15', subject: 'OOP with Java Lab', code: 'CMLOR2VS202', room: 'Lab 501', type: 'Lab', batch: 'All Batches' },
    { time: '02:00 - 04:00', subject: 'Community Engagement Project Lab', code: 'CMLOR2CP201', room: 'Seminar Hall', type: 'Project' }
  ],
  Thursday: [
    { time: '09:00 - 10:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-401', type: 'Theory' },
    { time: '10:00 - 11:00', subject: 'Discrete Structures', code: 'CMCOR2PC201', room: 'CR-401', type: 'Theory' },
    { time: '11:15 - 01:15', subject: 'Operating System Lab', code: 'CMCOR2PC202', room: 'Lab 503', type: 'Lab', batch: 'B1 & B2' },
    { time: '02:00 - 03:00', subject: 'Data Structures', code: 'CMCOR2PC203', room: 'CR-401', type: 'Theory' },
    { time: '03:00 - 04:00', subject: 'Engineering Career Navigation', code: 'CMLOR2ED201', room: 'CR-401', type: 'Theory' }
  ],
  Friday: [
    { time: '09:00 - 10:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-401', type: 'Theory' },
    { time: '10:00 - 11:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-401', type: 'Theory' },
    { time: '11:15 - 01:15', subject: 'Microprocessor & Embedded Lab', code: 'CMCOR2PC204', room: 'Lab 402', type: 'Lab', batch: 'B1 & B2' },
    { time: '02:00 - 03:30', subject: 'Web Technology II Tutorial', code: 'CMLOR2VS201', room: 'CR-401', type: 'Theory' }
  ],
  Saturday: [
    { time: '09:30 - 11:30', subject: 'Remedial & Self Learning (PBL)', code: 'SL-PBL', room: 'Library / Lab 502', type: 'Project' },
    { time: '11:45 - 01:15', subject: 'Club Activities & Coding Practice', code: 'STUDYSYNC+', room: 'T&P Hall', type: 'Project' }
  ]
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimetableModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    if (today !== 'Sunday' && SCHEDULE[today]) {
      setSelectedDay(today);
    }
  }, []);

  if (!isOpen) return null;

  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border-2 border-slate-900 rounded-2xl w-full max-w-3xl shadow-[6px_6px_0px_#0f172a] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-yellow-400 border-b-2 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  SYCM3 Weekly Timetable
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold">
                  ClassPost Live
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                Semester III • Department of Computer Engineering (SAKEC)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Close timetable"
          >
            <X className="w-5 h-5 text-slate-900 stroke-[2.5]" />
          </button>
        </div>

        {/* Day Selector Tabs */}
        <div className="p-3 bg-slate-100 border-b-2 border-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = currentDayName === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 border-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="px-1.5 py-0.2 rounded-md bg-green-500 text-white font-mono text-[9px] uppercase font-bold animate-pulse">
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 bg-[#f8fafc]">
          {SCHEDULE[selectedDay]?.map((period, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0f172a] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 border border-slate-900 flex items-center justify-center font-bold text-xs font-mono text-slate-900 shrink-0">
                  P{idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
                      {period.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] border border-slate-900 ${
                        period.type === 'Lab'
                          ? 'bg-blue-100 text-blue-900'
                          : period.type === 'Project'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-yellow-100 text-yellow-900'
                      }`}
                    >
                      {period.type}
                    </span>
                    {period.batch && (
                      <span className="text-[11px] text-slate-500 font-mono">({period.batch})</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">{period.subject}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 self-end sm:self-center shrink-0">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {period.time}
                </span>
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-300 font-mono text-slate-800">
                  <MapPin className="w-3 h-3 text-red-500" />
                  {period.room}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>CRs: Tanmay Shinde (67) & Aditya Shah (68)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
