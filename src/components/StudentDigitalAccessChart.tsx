import React, { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Laptop,
  Wifi,
  RefreshCw,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  BookOpen,
  GraduationCap,
  Library,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { apiService, type StudentDigitalAccessData } from '../services/apiService';

// Ensure ChartJS components are registered
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const INK = '#0f172a';
const YELLOW = '#eab308';
const MONO = "'JetBrains Mono', monospace";

const tooltipStyle = {
  backgroundColor: INK,
  titleFont: { family: MONO, size: 11, weight: 'bold' as const },
  bodyFont: { family: MONO, size: 11 },
  padding: 10,
  cornerRadius: 6,
  displayColors: true
};

export const StudentDigitalAccessChart: React.FC = () => {
  const [data, setData] = useState<StudentDigitalAccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'subjects' | 'books' | 'demographics' | 'internet' | 'trends'>('devices');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Initial load
  useEffect(() => {
    let ignore = false;
    apiService.fetchStudentDigitalAccessData().then((res) => {
      if (!ignore) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiService.fetchStudentDigitalAccessData();
      setData(res);
    } catch (err) {
      console.error('Failed to load student digital access data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time polling demonstration (Experiment 10)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshData();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  if (!data && isLoading) {
    return (
      <div className="card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-slate-900 animate-spin" />
          <span className="font-mono text-sm font-bold text-slate-900">
            Querying Live APIs: Open Trivia DB, Open Library &amp; DummyJSON...
          </span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Chart 1: Device Distribution (Bar Chart)
  const deviceChartData = {
    labels: data.deviceDistribution.map((d) => d.device),
    datasets: [
      {
        label: 'Student Ownership & Access (%)',
        data: data.deviceDistribution.map((d) => d.percentage),
        backgroundColor: [
          'rgba(234, 179, 8, 0.85)', // Yellow (Laptop)
          'rgba(59, 130, 246, 0.85)', // Blue (Phone)
          'rgba(16, 185, 129, 0.85)', // Green (Desktop)
          'rgba(139, 92, 246, 0.85)'  // Purple (Tablet)
        ],
        borderColor: INK,
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  // Chart 2: Academic Question Bank (Open Trivia DB API)
  const subjectList = data.academicSubjectQuestions || [];
  const subjectChartData = {
    labels: subjectList.map((s) => s.subject),
    datasets: [
      {
        label: 'Verified Questions (Live API)',
        data: subjectList.map((s) => s.verifiedQuestions),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: INK,
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Total Question Bank Pool',
        data: subjectList.map((s) => s.totalQuestions),
        backgroundColor: 'rgba(234, 179, 8, 0.75)',
        borderColor: INK,
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  // Chart 3: Open Library Computer Science Books (Open Library API)
  const booksList = data.openLibraryBooks || [];
  const booksChartData = {
    labels: booksList.map((b) => b.title),
    datasets: [
      {
        label: 'Published Editions (Internet Archive)',
        data: booksList.map((b) => b.editions),
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(234, 179, 8, 0.85)',
          'rgba(239, 68, 68, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(236, 72, 153, 0.85)'
        ],
        borderColor: INK,
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  // Chart 4: DummyJSON Student Demographics (DummyJSON API)
  const demoList = data.dummyJsonDemographics || [];
  const demoChartData = {
    labels: demoList.map((d) => d.cohort),
    datasets: [
      {
        label: 'Student Enrolment Count',
        data: demoList.map((d) => d.count),
        backgroundColor: [
          'rgba(234, 179, 8, 0.9)',
          'rgba(59, 130, 246, 0.9)',
          'rgba(16, 185, 129, 0.9)',
          'rgba(139, 92, 246, 0.9)'
        ],
        borderColor: INK,
        borderWidth: 2
      }
    ]
  };

  // Chart 5: Internet Connectivity (Doughnut Chart)
  const internetChartData = {
    labels: data.internetConnectivity.map((i) => i.category),
    datasets: [
      {
        label: 'Connection Type (%)',
        data: data.internetConnectivity.map((i) => i.percentage),
        backgroundColor: [
          'rgba(16, 185, 129, 0.9)', // Fiber
          'rgba(59, 130, 246, 0.9)', // 5G/4G
          'rgba(234, 179, 8, 0.9)',  // Campus Wi-Fi
          'rgba(239, 68, 68, 0.9)'   // Limited
        ],
        borderColor: INK,
        borderWidth: 2
      }
    ]
  };

  // Chart 6: Weekly Online Study Hours Trend (Line Chart)
  const hoursChartData = {
    labels: data.weeklyOnlineHours.map((h) => h.semester),
    datasets: [
      {
        label: 'Avg Digital Study Hours / Week',
        data: data.weeklyOnlineHours.map((h) => h.hours),
        borderColor: INK,
        backgroundColor: 'rgba(234, 179, 8, 0.25)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: YELLOW,
        pointBorderColor: INK,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  return (
    <div className="card-neo bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-5 sm:p-7 overflow-hidden">
      {/* 1. Header with Live API Badges & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-500 font-mono text-[11px] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Student &amp; Academic APIs
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {data.httpStatus}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 font-semibold">
              <Zap className="w-3 h-3 text-yellow-500" />
              {data.responseTimeMs}ms
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-300 text-blue-900 font-mono text-[10px] font-bold">
              opentdb.com · openlibrary.org · dummyjson.com
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-yellow-500 stroke-[2.5]" />
            Student Digital Learning &amp; Academic Telemetry Hub
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Live multi-API data visualization spanning student device access, academic subject banks, CS books &amp; university demographics.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border-2 border-slate-900 font-mono text-xs font-bold transition-all shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer ${
              autoRefresh ? 'bg-emerald-300 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle automatic 8-second real-time polling (Experiment 10)"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'Auto: ON (8s)' : 'Auto: OFF'}</span>
          </button>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 border-2 border-slate-900 text-slate-900 font-mono text-xs font-black transition-all shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Fetch Live APIs</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-bold">
            <Laptop className="w-3.5 h-3.5 text-yellow-600" />
            <span>Laptop Access</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {data.keyMetrics.laptopOwnershipRate}%
          </div>
          <span className="font-mono text-[10px] text-emerald-700 font-bold">
            ✓ Primary coding device
          </span>
        </div>

        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-bold">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>High-Speed Net</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {data.keyMetrics.highSpeedInternetRate}%
          </div>
          <span className="font-mono text-[10px] text-emerald-700 font-bold">
            ✓ Fiber / 5G Mobile
          </span>
        </div>

        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-bold">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Online Study Mode</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {data.keyMetrics.onlineStudyAdoption}%
          </div>
          <span className="font-mono text-[10px] text-blue-700 font-bold">
            ✓ LMS &amp; digital notes
          </span>
        </div>

        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>Weekly Study</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {data.keyMetrics.avgStudyHoursPerWeek} hrs
          </div>
          <span className="font-mono text-[10px] text-purple-700 font-bold">
            ✓ Online course time
          </span>
        </div>
      </div>

      {/* 3. Visualization Mode Switcher Tabs */}
      <div className="flex items-center flex-wrap gap-2 border-b border-slate-200 pb-3 mb-4 font-mono text-xs">
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'devices'
              ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Device Distribution</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-blue-600 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-blue-50 text-blue-800 border-blue-200 hover:border-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Subject Bank (Open Trivia)</span>
        </button>

        <button
          onClick={() => setActiveTab('books')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'books'
              ? 'bg-emerald-600 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-slate-900'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>CS Books (Open Library)</span>
        </button>

        <button
          onClick={() => setActiveTab('demographics')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'demographics'
              ? 'bg-purple-600 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-purple-50 text-purple-800 border-purple-200 hover:border-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student Cohorts (DummyJSON)</span>
        </button>

        <button
          onClick={() => setActiveTab('internet')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'internet'
              ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Internet Connectivity</span>
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`px-3 py-1.5 rounded-lg border-2 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'trends'
              ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#eab308]'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Semester Hours</span>
        </button>
      </div>

      {/* 4. Dynamic Chart Rendering */}
      <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-4 sm:p-5 relative min-h-[280px] flex items-center justify-center">
        {activeTab === 'devices' && (
          <div className="w-full h-[260px]">
            <Bar
              data={deviceChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Student Device Ownership for Coursework & Lab Practicals (%)',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                      font: { family: MONO, size: 10 },
                      color: '#64748b',
                      callback: (v) => `${v}%`
                    },
                    border: { color: INK, width: 1.5 }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { family: MONO, size: 10, weight: 'bold' }, color: INK },
                    border: { color: INK, width: 1.5 }
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="w-full h-[260px]">
            <Bar
              data={subjectChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { font: { family: MONO, size: 10, weight: 'bold' }, color: INK }
                  },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Live Open Trivia DB Academic API: Question Bank Distribution by Subject',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                      font: { family: MONO, size: 10 },
                      color: '#64748b'
                    },
                    border: { color: INK, width: 1.5 }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { family: MONO, size: 10, weight: 'bold' }, color: INK },
                    border: { color: INK, width: 1.5 }
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'books' && (
          <div className="w-full h-[260px]">
            <Bar
              data={booksChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Live Open Library API: Top Computer Science Reference Books by Published Editions',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                      font: { family: MONO, size: 10 },
                      color: '#64748b',
                      callback: (v) => `${v} ed.`
                    },
                    border: { color: INK, width: 1.5 }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { family: MONO, size: 9, weight: 'bold' }, color: INK },
                    border: { color: INK, width: 1.5 }
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'demographics' && (
          <div className="w-full h-[260px] flex items-center justify-center">
            <Doughnut
              data={demoChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { font: { family: MONO, size: 11 }, color: INK }
                  },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Live DummyJSON API: Student Cohorts & University Academic Demographics',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'internet' && (
          <div className="w-full h-[260px] flex items-center justify-center">
            <Doughnut
              data={internetChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { font: { family: MONO, size: 11 }, color: INK }
                  },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Primary Internet Connection Type Used for Online Study',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                }
              }}
            />
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="w-full h-[260px]">
            <Line
              data={hoursChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: tooltipStyle,
                  title: {
                    display: true,
                    text: 'Average Weekly Digital Learning Hours Across Academic Semesters',
                    font: { family: MONO, size: 12, weight: 'bold' },
                    color: INK
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#e2e8f0' },
                    ticks: {
                      font: { family: MONO, size: 10 },
                      color: '#64748b',
                      callback: (v) => `${v} hrs`
                    },
                    border: { color: INK, width: 1.5 }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { font: { family: MONO, size: 10, weight: 'bold' }, color: INK },
                    border: { color: INK, width: 1.5 }
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 5. Footer with Academic Telemetry Timestamp & Metadata */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">Live Endpoints: <code className="text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{data.endpointUrl}</code></span>
        </div>
        <div className="tabular shrink-0">
          <span>Synced at: <strong className="text-slate-900">{data.timestamp}</strong></span>
        </div>
      </div>
    </div>
  );
};
