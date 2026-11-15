import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Award,
  BookOpen,
  GraduationCap,
  Users,
  CheckCircle2,
  CalendarDays,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Period {
  time: string;
  subject: string;
  code: string;
  room: string;
  type: 'Theory' | 'Lab' | 'Project' | 'Break';
  batch?: string;
  faculty?: string;
}

// ----------------------------------------------------
// REGULAR (SYCM1) TIMETABLE
// ----------------------------------------------------
const REGULAR_SCHEDULE: Record<string, Period[]> = {
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

const REGULAR_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ----------------------------------------------------
// DSY (DIRECT SECOND YEAR) INTENSIVE MODULE BLOCKS
// Source: Official SAKEC DSY Class Time Table (Version R1:V2)
// ----------------------------------------------------
interface DsyBlock {
  id: string;
  phaseNumber: number;
  subject: string;
  code: string;
  dates: string;
  effectiveFrom: string;
  division: string;
  room: string;
  faculties: Array<{ name: string; abbr: string }>;
  periods: Array<{
    periodNo: string;
    time: string;
    title: string;
    type: 'Lab' | 'Theory' | 'Break';
    room: string;
  }>;
}

const DSY_BLOCKS: DsyBlock[] = [
  {
    id: 'dsy-phase-1',
    phaseNumber: 1,
    subject: 'Skill based lab - Web Technology II',
    code: 'CMLOR2VS201',
    dates: '12th November 2026 – 18th November 2026',
    effectiveFrom: '12/11/2026',
    division: 'Direct SY',
    room: 'Lab 620',
    faculties: [
      { name: 'Ms. Vaishali Kosamkar', abbr: 'VK' },
      { name: 'Ms. Sarika Rane', abbr: 'SPR' },
      { name: 'Ms. Shreyasee Patra', abbr: 'SP' }
    ],
    periods: [
      { periodNo: 'P1 - P2', time: '10:00 AM – 12:00 PM', title: 'Skill based lab - Web Technology II', type: 'Lab', room: 'Lab 620' },
      { periodNo: 'P3', time: '12:00 PM – 01:00 PM', title: 'Recess / Lunch Break', type: 'Break', room: 'Campus' },
      { periodNo: 'P4 - P5', time: '01:00 PM – 03:00 PM', title: 'Skill based lab - Web Technology II', type: 'Lab', room: 'Lab 620' },
      { periodNo: 'P6 - P7', time: '03:00 PM – 05:00 PM', title: 'Skill based lab - Web Technology II', type: 'Lab', room: 'Lab 620' }
    ]
  },
  {
    id: 'dsy-phase-2',
    phaseNumber: 2,
    subject: 'Data Structure',
    code: 'CMCOR2PC203',
    dates: '19th November 2026 – 26th November 2026',
    effectiveFrom: '19/11/2026',
    division: 'Direct SYCM',
    room: 'Room 620',
    faculties: [
      { name: 'Dr. Vidyullata Devmane (HOD)', abbr: 'VD' },
      { name: 'Ms. Shahzia Sayyad', abbr: 'SSY' },
      { name: 'Dr. Atul Kachare', abbr: 'AK' }
    ],
    periods: [
      { periodNo: 'P1 - P2', time: '10:00 AM – 12:00 PM', title: 'DSYCM Data Structure (Core Theory & Hands-on)', type: 'Theory', room: 'Room 620' },
      { periodNo: 'P3', time: '12:00 PM – 01:00 PM', title: 'Recess / Lunch Break', type: 'Break', room: 'Campus' },
      { periodNo: 'P4 - P5', time: '01:00 PM – 03:00 PM', title: 'DSYCM Data Structure', type: 'Theory', room: 'Room 620' },
      { periodNo: 'P6 - P7', time: '03:00 PM – 05:00 PM', title: 'DSYCM Data Structure', type: 'Theory', room: 'Room 620' }
    ]
  },
  {
    id: 'dsy-phase-3',
    phaseNumber: 3,
    subject: 'Skill based Lab-OOPM With JAVA',
    code: 'CMLOR2VS202',
    dates: '27th November 2026 – 4th December 2026',
    effectiveFrom: '27/11/2026',
    division: 'Direct SY',
    room: 'Lab 620',
    faculties: [
      { name: 'Ms. Prithi Kanaga Paul', abbr: 'PP' },
      { name: 'Ms. Deepshikha Chaturvedi', abbr: 'DC' },
      { name: 'Ms. Shilpa Kalantri', abbr: 'SK' }
    ],
    periods: [
      { periodNo: 'P1 - P2', time: '10:00 AM – 12:00 PM', title: 'Skill based Lab-OOPM with JAVA', type: 'Lab', room: 'Lab 620' },
      { periodNo: 'P3', time: '12:00 PM – 01:00 PM', title: 'Recess / Lunch Break', type: 'Break', room: 'Campus' },
      { periodNo: 'P4 - P5', time: '01:00 PM – 03:00 PM', title: 'Skill based Lab-OOPM with JAVA', type: 'Lab', room: 'Lab 620' },
      { periodNo: 'P6 - P7', time: '03:00 PM – 05:00 PM', title: 'Skill based Lab-OOPM with JAVA', type: 'Lab', room: 'Lab 620' }
    ]
  },
  {
    id: 'dsy-phase-4',
    phaseNumber: 4,
    subject: 'Discrete Structure',
    code: 'CMCOR2PC201',
    dates: '5th December 2026 – 11th December 2026',
    effectiveFrom: '05/12/2026',
    division: 'Direct SYCM',
    room: 'Room 620',
    faculties: [
      { name: 'Dr. Pinki Vishwakarma', abbr: 'PV' },
      { name: 'Ms. Deepti Pawar', abbr: 'DP' },
      { name: 'Mr. Tejas Hirave', abbr: 'TH' }
    ],
    periods: [
      { periodNo: 'P1 - P2', time: '10:00 AM – 12:00 PM', title: 'DSYCM Discrete Structure', type: 'Theory', room: 'Room 620' },
      { periodNo: 'P3', time: '12:00 PM – 01:00 PM', title: 'Recess / Lunch Break', type: 'Break', room: 'Campus' },
      { periodNo: 'P4 - P5', time: '01:00 PM – 03:00 PM', title: 'DSYCM Discrete Structure', type: 'Theory', room: 'Room 620' },
      { periodNo: 'P6 - P7', time: '03:00 PM – 05:00 PM', title: 'DSYCM Discrete Structure', type: 'Theory', room: 'Room 620' }
    ]
  }
];

// ----------------------------------------------------
// EXAM & TERM SCHEDULES
// Source: SAKEC Official Academic Arrangement of Terms (SH 2026)
// ----------------------------------------------------
interface ExamMilestone {
  title: string;
  dates: string;
  type: 'MSE' | 'ESE' | 'PRACTICAL' | 'TERM_START' | 'TERM_END';
  note: string;
  status: 'Completed' | 'Upcoming' | 'Active';
}

const DSY_EXAM_SCHEDULE: ExamMilestone[] = [
  {
    title: 'Commencement of Term (SH 2026)',
    dates: '25/08/2026',
    type: 'TERM_START',
    note: 'Term initiation for Direct Second Year (All UG Programme - SEM III)',
    status: 'Completed'
  },
  {
    title: 'Mid Semester Examination (MSE)',
    dates: '02/11/2026 To 06/11/2026',
    type: 'MSE',
    note: 'Official Mid Semester Exams (30 Marks · 1 Hour per subject)',
    status: 'Completed'
  },
  {
    title: 'Term End (SH 2026)',
    dates: '12/12/2026',
    type: 'TERM_END',
    note: 'Final instructional day of Semester III for DSY',
    status: 'Upcoming'
  },
  {
    title: 'End Semester Theory Examination (ESE)',
    dates: '19/12/2026 To 26/12/2026',
    type: 'ESE',
    note: 'Final University/Autonomous written theory papers',
    status: 'Upcoming'
  },
  {
    title: 'End Semester Practical Examination',
    dates: '28/12/2026 To 02/01/2027',
    type: 'PRACTICAL',
    note: 'Lab journals, practical evaluation and viva voce',
    status: 'Upcoming'
  },
  {
    title: 'New Term Commencement (FH 2027 - SEM IV)',
    dates: '04/01/2027',
    type: 'TERM_START',
    note: 'Commencement of Even Semester (Semester IV)',
    status: 'Upcoming'
  }
];

const REGULAR_EXAM_SCHEDULE: ExamMilestone[] = [
  {
    title: 'Commencement of Term (SH 2026)',
    dates: '08/07/2026',
    type: 'TERM_START',
    note: 'Regular Semester III term start for Computer Engineering',
    status: 'Completed'
  },
  {
    title: 'Mid Semester Examination (MSE)',
    dates: '14/10/2026 To 17/10/2026',
    type: 'MSE',
    note: 'Internal test evaluation across all Semester III courses',
    status: 'Completed'
  },
  {
    title: 'Term End (SH 2026)',
    dates: '07/11/2026',
    type: 'TERM_END',
    note: 'Instructional term conclusion for regular batch',
    status: 'Completed'
  },
  {
    title: 'End Semester Theory Examination (ESE)',
    dates: '18/11/2026 To 02/12/2026',
    type: 'ESE',
    note: 'Comprehensive university semester theory exam',
    status: 'Upcoming'
  },
  {
    title: 'End Semester Practical Examination',
    dates: '03/12/2026 To 10/12/2026',
    type: 'PRACTICAL',
    note: 'Practical lab tests and project vivas',
    status: 'Upcoming'
  },
  {
    title: 'New Term Commencement (FH 2027 - SEM IV)',
    dates: '04/01/2027',
    type: 'TERM_START',
    note: 'Semester IV classes start',
    status: 'Upcoming'
  }
];

export const TimetableModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'timetable' | 'exams';
}> = ({ isOpen, onClose, initialTab = 'timetable' }) => {
  // Mode tabs: 'timetable' | 'exams'
  const [activeTab, setActiveTab] = useState<'timetable' | 'exams'>(initialTab);

  // Student division: 'regular' (SYCM1) vs 'dsy' (Direct Second Year)
  const [division, setDivision] = useState<'regular' | 'dsy'>(() => {
    try {
      return (localStorage.getItem('studysyncplus_division_pref') as 'regular' | 'dsy') || 'dsy';
    } catch {
      return 'dsy';
    }
  });

  // Regular selected day
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // DSY selected module block
  const [selectedBlockId, setSelectedBlockId] = useState<string>('dsy-phase-1');

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Set today for regular schedule
  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    if (today !== 'Sunday' && REGULAR_SCHEDULE[today]) {
      setSelectedDay(today);
    }
  }, []);

  const handleSelectDivision = (div: 'regular' | 'dsy') => {
    setDivision(div);
    try {
      localStorage.setItem('studysyncplus_division_pref', div);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const activeDsyBlock = DSY_BLOCKS.find((b) => b.id === selectedBlockId) || DSY_BLOCKS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-white border-2 border-slate-900 rounded-2xl w-full max-w-4xl shadow-[6px_6px_0px_#0f172a] max-h-[92vh] overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-amber-300 border-b-2 border-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] shrink-0">
              {activeTab === 'timetable' ? <Calendar className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {division === 'dsy' ? 'Direct Second Year (DSY)' : 'SYCM1 (Regular)'}{' '}
                  {activeTab === 'timetable' ? 'Class Timetable' : 'Exam & Term Schedule'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-black shrink-0">
                  {division === 'dsy' ? 'DSY SAKEC' : 'SYCM1 Live'}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium truncate mt-0.5">
                Semester III • Department of Computer Engineering • Shah & Anchor Kutchhi Engg. College
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 hover:bg-slate-100 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-900 stroke-[2.5]" />
          </button>
        </div>

        {/* Dual Control Switcher: Division Picker (Left) & Section Tabs (Right) */}
        <div className="p-2.5 sm:p-3 bg-slate-100 border-b-2 border-slate-900 flex items-center justify-between gap-2 flex-wrap">
          {/* Division Switcher */}
          <div className="flex items-center bg-white border-2 border-slate-900 p-0.5 rounded-xl shadow-2xs">
            <button
              onClick={() => handleSelectDivision('dsy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                division === 'dsy'
                  ? 'bg-slate-900 text-amber-300 shadow-2xs font-extrabold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Direct Second Year (DSY)</span>
            </button>
            <button
              onClick={() => handleSelectDivision('regular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                division === 'regular'
                  ? 'bg-slate-900 text-amber-300 shadow-2xs font-extrabold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Regular (SYCM1)</span>
            </button>
          </div>

          {/* Section View Tabs */}
          <div className="flex items-center bg-white border-2 border-slate-900 p-0.5 rounded-xl shadow-2xs">
            <button
              onClick={() => setActiveTab('timetable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'timetable'
                  ? 'bg-amber-300 text-slate-900 border border-slate-900 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Time Table</span>
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'exams'
                  ? 'bg-amber-300 text-slate-900 border border-slate-900 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Exam &amp; Terms</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: TIMETABLE VIEW                                       */}
        {/* ============================================================ */}
        {activeTab === 'timetable' && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-[#f8fafc]">
            {division === 'dsy' ? (
              /* DSY Intensive Module Blocks */
              <div className="p-4 sm:p-6 space-y-4">
                {/* Banner explaining DSY block-course format */}
                <div className="p-3.5 bg-blue-50 border-2 border-slate-900 rounded-xl flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                    ⚡
                  </div>
                  <div className="min-w-0 text-xs">
                    <h4 className="font-extrabold text-slate-900 mb-0.5">
                      Intensive Course Schedule (Room 620 • Version R1:V2)
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Direct SY students follow concentrated single-course blocks from 10:00 AM to 5:00 PM daily in Room 620 to cover hands-on lab hours and core syllabi.
                    </p>
                  </div>
                </div>

                {/* 4 Block Tabs */}
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                    Select Subject Block (12 Nov – 11 Dec 2026):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {DSY_BLOCKS.map((block) => {
                      const isSelected = selectedBlockId === block.id;
                      return (
                        <button
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_#f59e0b]'
                              : 'bg-white text-slate-900 border-slate-900 hover:bg-amber-50 shadow-2xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span
                                className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-amber-300 text-slate-900' : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                Block #{block.phaseNumber}
                              </span>
                              <span
                                className={`text-[10px] font-mono ${
                                  isSelected ? 'text-amber-200' : 'text-slate-500'
                                }`}
                              >
                                {block.room}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-xs line-clamp-2 leading-snug">
                              {block.subject}
                            </h4>
                          </div>

                          <div
                            className={`mt-2 pt-1.5 border-t text-[10px] font-mono ${
                              isSelected ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            {block.dates.split('–')[0].trim()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Block Full Detail View */}
                <div className="bg-white border-2 border-slate-900 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 bg-amber-300 text-slate-900 border border-slate-900 rounded font-mono font-bold text-xs">
                          {activeDsyBlock.code}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-xs">
                          {activeDsyBlock.division}
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-mono font-bold text-xs">
                          w.e.f. {activeDsyBlock.effectiveFrom}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900">
                        {activeDsyBlock.subject}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-700" />
                        <span>Schedule: <strong>{activeDsyBlock.dates}</strong></span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end text-xs">
                      <span className="text-[11px] font-black uppercase text-slate-500">Classroom Location</span>
                      <span className="font-mono font-bold text-sm bg-slate-100 px-2.5 py-1 rounded border border-slate-300 text-slate-900 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        {activeDsyBlock.room}
                      </span>
                    </div>
                  </div>

                  {/* Faculty In-Charge Team */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                      Assigned Faculty Team:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeDsyBlock.faculties.map((f, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{f.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">({f.abbr})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Period Slots */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                      Daily Class Timings:
                    </label>
                    <div className="space-y-2">
                      {activeDsyBlock.periods.map((p, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            p.type === 'Break'
                              ? 'bg-amber-50/70 border-dashed border-amber-300 text-slate-700'
                              : 'bg-white border-slate-900 shadow-2xs text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-extrabold text-xs shrink-0 ${
                                p.type === 'Break'
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              {p.periodNo}
                            </span>
                            <div>
                              <h5 className="font-bold text-xs sm:text-sm">{p.title}</h5>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {p.type === 'Break' ? '1 Hour Lunch Recess' : `${p.type} Session · Room ${p.room}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className="flex items-center gap-1 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {p.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular (SYCM1) Timetable */
              <div>
                {/* Day Tabs */}
                <div className="p-3 bg-white border-b-2 border-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {REGULAR_DAYS.map((day) => {
                    const isSelected = selectedDay === day;
                    const isToday = currentDayName === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 border-2 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{day}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500 text-white font-mono text-[9px] uppercase font-bold animate-pulse">
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Period Cards */}
                <div className="p-4 sm:p-6 space-y-3">
                  {REGULAR_SCHEDULE[selectedDay]?.map((period, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0f172a] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 border border-slate-900 flex items-center justify-center font-bold text-xs font-mono text-slate-900 shrink-0">
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
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {period.type}
                            </span>
                            {period.batch && (
                              <span className="text-[11px] text-slate-500 font-mono">({period.batch})</span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{period.subject}</h3>
                          {period.faculty && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{period.faculty}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 self-end sm:self-center shrink-0">
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
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: EXAMS & TERMS SCHEDULE                               */}
        {/* ============================================================ */}
        {activeTab === 'exams' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] space-y-4">
            {/* Official Term Notice Header Box */}
            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-200">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                    Arrangement of Terms · Academic Year 2026-2027 (SH 2026)
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {division === 'dsy'
                      ? 'Direct Second Year (All UG Programme - SEM III)'
                      : 'Regular Second Year B.Tech (SEM III)'}
                  </h3>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md">
                    SH 2026 Notice
                  </span>
                </div>
              </div>

              {/* Term Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <span className="text-slate-500 font-medium block text-[11px]">Term Commencement Date:</span>
                  <strong className="text-sm font-black text-slate-900 font-mono">
                    {division === 'dsy' ? '25/08/2026 (25 Aug 2026)' : '08/07/2026 (08 Jul 2026)'}
                  </strong>
                </div>
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                  <span className="text-slate-500 font-medium block text-[11px]">Term End Date:</span>
                  <strong className="text-sm font-black text-red-900 font-mono">
                    {division === 'dsy' ? '12/12/2026 (12 Dec 2026)' : '07/11/2026 (07 Nov 2026)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Exam Milestones List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                  Official Examination Milestones:
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Autonomous SAKEC Syllabus
                </span>
              </div>

              <div className="space-y-2.5">
                {(division === 'dsy' ? DSY_EXAM_SCHEDULE : REGULAR_EXAM_SCHEDULE).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white border-2 border-slate-900 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 border ${
                          item.type === 'MSE'
                            ? 'bg-blue-100 text-blue-900 border-blue-400'
                            : item.type === 'ESE'
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : item.type === 'PRACTICAL'
                            ? 'bg-purple-100 text-purple-900 border-purple-400'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-sm text-slate-900">{item.title}</h5>
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold ${
                              item.status === 'Completed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{item.note}</p>
                      </div>
                    </div>

                    <div className="self-end sm:self-center shrink-0">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-amber-300 font-mono font-black text-xs border border-slate-900 shadow-2xs block text-center">
                        {item.dates}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Signatories Footer */}
            <div className="p-3 bg-white border border-slate-300 rounded-xl flex items-center justify-between text-[11px] text-slate-500 font-medium flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified by <strong>Dean Academics (Dr. Vaishali Hirlekar)</strong> &amp; <strong>Principal (Dr. Bhavesh Patel)</strong></span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">SAKEC Autonomous Mumbai</span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t-2 border-slate-900 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping hidden sm:inline-block" />
            <span>CRs: Tanmay Shinde (67) &amp; Aditya Shah (68)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
