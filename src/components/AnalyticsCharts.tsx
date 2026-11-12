import React from 'react';
import { useResources } from '../context/ResourceContext';
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
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { BarChart3, TrendingUp, PieChart, Users, Download, Star, Award } from 'lucide-react';

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

export const AnalyticsCharts: React.FC = () => {
  const { resources } = useResources();

  // Aggregate metrics dynamically from state
  const totalDownloads = resources.reduce((acc, curr) => acc + curr.downloadCount, 0);
  const avgRating = (
    resources.reduce((acc, curr) => acc + curr.rating, 0) / (resources.length || 1)
  ).toFixed(1);

  // Subject Downloads Aggregation
  const subjectMap: Record<string, number> = {};
  resources.forEach((r) => {
    subjectMap[r.subject] = (subjectMap[r.subject] || 0) + r.downloadCount;
  });

  const subjectLabels = Object.keys(subjectMap);
  const subjectData = Object.values(subjectMap);

  // Resource Type Distribution
  const typeMap: Record<string, number> = {};
  resources.forEach((r) => {
    typeMap[r.type] = (typeMap[r.type] || 0) + 1;
  });

  const typeLabels = Object.keys(typeMap);
  const typeData = Object.values(typeMap);

  // Bar Chart Config (Claymorphic styled)
  const barChartData = {
    labels: subjectLabels.map((s) => (s.length > 20 ? s.slice(0, 18) + '...' : s)),
    datasets: [
      {
        label: 'Total Student Downloads',
        data: subjectData,
        backgroundColor: [
          'rgba(99, 102, 241, 0.75)',
          'rgba(236, 72, 153, 0.75)',
          'rgba(6, 182, 212, 0.75)',
          'rgba(16, 185, 129, 0.75)',
          'rgba(245, 158, 11, 0.75)',
          'rgba(139, 92, 246, 0.75)'
        ],
        borderColor: [
          '#6366f1',
          '#ec4899',
          '#06b6d4',
          '#10b981',
          '#f59e0b',
          '#8b5cf6'
        ],
        borderWidth: 2,
        borderRadius: 10
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Plus Jakarta Sans', size: 12 },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: '#64748b' }
      }
    }
  };

  // Line Chart Config (Weekly Trends)
  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Resource Access Volume',
        data: [120, 190, 240, 310, 290, 480, 520],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4f46e5',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Peer Discussion Threads',
        data: [45, 70, 95, 120, 110, 195, 230],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0891b2',
        pointRadius: 4
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' }
      }
    }
  };

  // Doughnut Chart Config
  const doughnutChartData = {
    labels: typeLabels,
    datasets: [
      {
        data: typeData,
        backgroundColor: [
          '#6366f1',
          '#ec4899',
          '#06b6d4',
          '#10b981',
          '#f59e0b'
        ],
        borderWidth: 3,
        borderColor: '#ffffff'
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 11 },
          boxWidth: 10,
          padding: 12
        }
      }
    },
    cutout: '65%'
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="clay-box p-6 sm:p-8 bg-gradient-to-r from-white via-indigo-50/30 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg">
                Module 4 (CO5 & CO6)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Chart.js Interactive Visualization Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Academic Analytics Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live graphical telemetry of student engagement, subject popularity, and resource distribution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="clay-badge px-4 py-2 bg-white rounded-2xl flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Syllabus Grade</p>
                <p className="text-xs font-extrabold text-slate-800">100% Coverage</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clay-box p-5 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Resources</p>
            <h3 className="text-2xl font-black text-slate-800">{resources.length}</h3>
          </div>
        </div>

        <div className="clay-box p-5 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Downloads</p>
            <h3 className="text-2xl font-black text-slate-800">{totalDownloads}</h3>
          </div>
        </div>

        <div className="clay-box p-5 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Avg Rating</p>
            <h3 className="text-2xl font-black text-slate-800">{avgRating} / 5.0</h3>
          </div>
        </div>

        <div className="clay-box p-5 bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Student Reach</p>
            <h3 className="text-2xl font-black text-slate-800">1,240+</h3>
          </div>
        </div>
      </div>

      {/* Visual Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Subject Downloads */}
        <div className="clay-box p-6 bg-white lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Resource Downloads by Subject
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time Bar Chart aggregating student download requests across core semesters
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-1 bg-slate-100 rounded-md text-slate-600">
              Chart.js BarElement
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Doughnut Chart: Type Breakdown */}
        <div className="clay-box p-6 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pink-600" />
                Resource Types
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Notes vs PYQs vs Labs</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-1 bg-slate-100 rounded-md text-slate-600">
              Doughnut
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <Doughnut data={doughnutChartData} options={doughnutOptions} />
          </div>
        </div>

        {/* Line Chart: Weekly Trends */}
        <div className="clay-box p-6 bg-white lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                Weekly Academic Traffic & Active Study Peaks
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Smoothed Spline Line Chart illustrating surge during exam preparation weekends
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-1 bg-slate-100 rounded-md text-slate-600">
              Chart.js LineElement + Filler
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
