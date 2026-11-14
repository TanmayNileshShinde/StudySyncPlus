import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

interface Period {
  time: string;
  subject: string;
  code: string;
  room: string;
  type: 'Theory' | 'Lab' | 'Project' | 'Break';
  batch?: string;
  faculty?: string;
}

const SCHEDULE: Record<string, Period[]> = {
  Monday: [
    { time: '10:00 - 11:00', subject: 'Engineering Career Navigation', code: 'CMLOR2ED201', room: 'CR-606', type: 'Theory', faculty: 'Prof. RD' },
    { time: '11:00 - 12:00', subject: 'Engineering Career Navigation', code: 'CMLOR2ED201', room: 'CR-606', type: 'Theory', faculty: 'Prof. RD' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 03:00', subject: 'MP Lab (Batch A) / OS Lab (Batch B)', code: 'MP / OS LAB', room: 'Lab 620 / 623', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. SB / Prof. VK' },
    { time: '03:00 - 04:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-606', type: 'Theory', faculty: 'Prof. VK' }
  ],
  Tuesday: [
    { time: '10:00 - 11:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-606', type: 'Theory', faculty: 'Prof. SB' },
    { time: '11:00 - 12:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-606', type: 'Theory', faculty: 'Prof. VM' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 03:00', subject: 'OS Lab (Batch A) / MP Lab (Batch B)', code: 'OS / MP LAB', room: 'Lab 623 / 620', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. VK / Prof. SB' },
    { time: '03:00 - 04:00', subject: 'Engineering Career Navigation', code: 'CMLOR2ED201', room: 'CR-606', type: 'Theory', faculty: 'Prof. RD' },
    { time: '04:00 - 05:00', subject: 'Engineering Career Navigation (Tutorial)', code: 'CMLOR2ED201', room: 'CR-606', type: 'Theory', faculty: 'Prof. RD' }
  ],
  Wednesday: [
    { time: '10:00 - 11:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-606', type: 'Theory', faculty: 'Prof. VM' },
    { time: '11:00 - 12:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-606', type: 'Theory', faculty: 'Prof. VM' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 03:00', subject: 'FES Lab (Batch A) / OS Lab (Batch B)', code: 'FES / OS LAB', room: 'Lab 603 / 623', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. VM / Prof. VK' },
    { time: '03:00 - 04:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-606', type: 'Theory', faculty: 'Prof. SB' },
    { time: '04:00 - 05:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-606', type: 'Theory', faculty: 'Prof. VK' }
  ],
  Thursday: [
    { time: '10:00 - 11:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-606', type: 'Theory', faculty: 'Prof. SB' },
    { time: '11:00 - 12:00', subject: 'Microprocessor', code: 'CMCOR2PC204', room: 'CR-606', type: 'Theory', faculty: 'Prof. SB' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 03:00', subject: 'MP Lab (Batch A) / FES Lab (Batch B)', code: 'MP / FES LAB', room: 'Lab 620 / 603', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. SB / Prof. VM' },
    { time: '03:00 - 04:00', subject: 'FES Lab (Batch A) / MP Lab (Batch B)', code: 'FES / MP LAB', room: 'Lab 603 / 620', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. VM / Prof. SB' }
  ],
  Friday: [
    { time: '10:00 - 11:00', subject: 'Foundation of Embedded System', code: 'CMCOR2MD201', room: 'CR-606', type: 'Theory', faculty: 'Prof. VM' },
    { time: '11:00 - 12:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-606', type: 'Theory', faculty: 'Prof. VK' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 03:00', subject: 'OS Lab (Batch A) / FES Lab (Batch B)', code: 'OS / FES LAB', room: 'Lab 623 / 603', type: 'Lab', batch: 'Batches A & B', faculty: 'Prof. VK / Prof. VM' },
    { time: '03:00 - 04:00', subject: 'Operating System', code: 'CMCOR2PC202', room: 'CR-606', type: 'Theory', faculty: 'Prof. VK' }
  ],
  Saturday: [
    { time: '10:00 - 12:00', subject: 'IPS (Batch A) / SCL (Batch B)', code: 'IPS / SCL', room: 'CR-606 / CR-706', type: 'Theory', batch: 'Batches A & B', faculty: 'Prof. DP / Prof. AB' },
    { time: '12:00 - 01:00', subject: 'Recess / Lunch Break', code: 'BREAK', room: 'Campus', type: 'Break' },
    { time: '01:00 - 05:00', subject: 'IPS (Batch A) / SCL (Batch B) Lecture & Seminar', code: 'IPS / SCL', room: 'CR-606 / CR-706', type: 'Theory', batch: 'Batches A & B', faculty: 'Prof. DP / Prof. AB' }
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
                  SYCM1 Weekly Timetable
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
