import React from 'react';
import { useResources } from '../context/ResourceContext';
import {
  Chart as ChartJS,
  type ScriptableContext,
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
import { BarChart3, TrendingUp, PieChart, Download, Star, Layers, UserCheck } from 'lucide-react';

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

const INK = '#111111';
const LIME = '#a3e635';
const GRAY2 = '#78716c';
const GRAY3 = '#d6d3d1';
const RULE = '#e7e5e4';
const MONO = "'JetBrains Mono', monospace";

const tooltipStyle = {
  backgroundColor: INK,
  titleFont: { family: MONO, size: 11 },
  bodyFont: { family: MONO, size: 11 },
  padding: 10,
  cornerRadius: 0,
  displayColors: false
};

const scaleOptions = {
  y: {
    beginAtZero: true,
    grid: { color: RULE },
    ticks: { font: { family: MONO, size: 10 }, color: GRAY2 },
    border: { color: INK, width: 1 }
  },
  x: {
    grid: { display: false },
    ticks: { font: { family: MONO, size: 10 }, color: GRAY2 },
    border: { color: INK, width: 1 }
  }
};

export const AnalyticsCharts: React.FC = () => {
  const { resources } = useResources();

  // Aggregate metrics dynamically from state
  const totalDownloads = resources.reduce((acc, curr) => acc + curr.downloadCount, 0);
  const avgRating = (
    resources.reduce((acc, curr) => acc + curr.rating, 0) / (resources.length || 1)
  ).toFixed(1);

  // Subject downloads aggregation
  const subjectMap: Record<string, number> = {};
  resources.forEach((r) => {
    subjectMap[r.subject] = (subjectMap[r.subject] || 0) + r.downloadCount;
  });

  const subjectLabels = Object.keys(subjectMap);
  const subjectData = Object.values(subjectMap);
  const maxSubject = Math.max(...subjectData, 0);

  // Resource type distribution
  const typeMap: Record<string, number> = {};
  resources.forEach((r) => {
    typeMap[r.type] = (typeMap[r.type] || 0) + 1;
  });

  const typeLabels = Object.keys(typeMap);
  const typeData = Object.values(typeMap);

  // Bar chart — ink bars, the leading subject gets the highlighter pass
  const barChartData = {
    labels: subjectLabels.map((s) => (s.length > 20 ? s.slice(0, 18) + '…' : s)),
    datasets: [
      {
        label: 'Total Student Downloads',
        data: subjectData,
        backgroundColor: (ctx: ScriptableContext<'bar'>) => {
          const v = ctx.parsed?.y ?? 0;
          return maxSubject > 0 && v === maxSubject ? LIME : INK;
        },
        borderWidth: 0,
        borderRadius: 0,
        maxBarThickness: 42
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle
    },
    scales: scaleOptions
  };

  // Line chart — lime lead series over ink-gray comparison
  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Resource Access Volume',
        data: [120, 190, 240, 310, 290, 480, 520],
        borderColor: LIME,
        backgroundColor: 'rgba(163, 230, 53, 0.14)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: INK,
        pointRadius: 3,
        pointHoverRadius: 5
      },
      {
        label: 'Peer Discussion Threads',
        data: [45, 70, 95, 120, 110, 195, 230],
        borderColor: GRAY2,
        backgroundColor: 'rgba(120, 113, 108, 0.08)',
        borderWidth: 1.5,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: GRAY2,
        pointRadius: 2
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { font: { family: MONO, size: 10 }, boxWidth: 10, color: INK }
      },
      tooltip: tooltipStyle
    },
    scales: scaleOptions
  };

  // Doughnut chart — ink/lime/stone series, paper cutouts
  const doughnutChartData = {
    labels: typeLabels,
    datasets: [
      {
        data: typeData,
        backgroundColor: [INK, LIME, GRAY2, GRAY3, RULE],
        borderWidth: 2,
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
          font: { family: MONO, size: 10 },
          boxWidth: 10,
          padding: 12,
          color: INK
        }
      },
      tooltip: tooltipStyle
    },
    cutout: '65%'
  };

  const stats = [
    { icon: <Layers className="w-4 h-4" aria-hidden="true" />, label: 'Total Resources', value: String(resources.length) },
    { icon: <Download className="w-4 h-4" aria-hidden="true" />, label: 'Total Downloads', value: String(totalDownloads) },
    { icon: <Star className="w-4 h-4" aria-hidden="true" />, label: 'Avg Rating', value: `${avgRating} / 5.0` },
    { icon: <UserCheck className="w-4 h-4" aria-hidden="true" />, label: 'Demo Data Reach', value: 'Synthetic' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <section className="border border-ink bg-paper p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink">
            Academic Analytics Dashboard
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-[58ch]">
            Live graphical telemetry of student engagement, subject popularity, and resource
            distribution — <span className="font-mono text-[11px] text-ink-3">Module 4 · CO5 &amp; CO6</span>
          </p>
        </div>

        <div className="ruled-sunk px-4 py-3 shrink-0">
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">Syllabus Grade</p>
          <p className="text-sm font-extrabold text-ink tabular">100% Coverage</p>
        </div>
      </section>

      {/* Index summary strip */}
      <dl className="ruled grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-rule">
        {stats.map((s) => (
          <div key={s.label} className="p-4 sm:p-5 flex items-center gap-3">
            <div className="w-8 h-8 bg-ink text-lime flex items-center justify-center shrink-0" aria-hidden="true">
              {s.icon}
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em]">{s.label}</dt>
              <dd className="text-lg font-black text-ink tabular leading-tight">{s.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="ruled p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-ink flex items-center gap-2">
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
                Resource Downloads by Subject
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">
                Real-time aggregation of student download requests. The leading subject gets the highlighter.
              </p>
            </div>
            <span className="stamp stamp-outline">Bar</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </section>

        <section className="ruled p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="font-bold text-ink flex items-center gap-2">
                <PieChart className="w-4 h-4" aria-hidden="true" />
                Resource Types
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">Notes vs PYQs vs Labs</p>
            </div>
            <span className="stamp stamp-outline">Doughnut</span>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <Doughnut data={doughnutChartData} options={doughnutOptions} />
          </div>
        </section>

        <section className="ruled p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-ink flex items-center gap-2">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                Weekly Academic Traffic &amp; Active Study Peaks
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">
                Demo trend illustrating the surge during exam-preparation weekends.
              </p>
            </div>
            <span className="stamp stamp-outline">Line</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </section>
      </div>
    </div>
  );
};
