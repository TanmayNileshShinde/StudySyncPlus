import type { ResourceTypeValue } from "./validators";

/**
 * Initial dataset — the existing Semester III course file, migrated 1:1 from
 * the former localStorage seed (src/data/initialResources.ts).
 */

export interface SeedSemester {
  number: number;
  label: string;
  schemeLabel: string;
}

export interface SeedSubject {
  srNo: number;
  category: string;
  abbreviation: string;
  courseCode: string;
  name: string;
  cl: number;
  tl: number;
  ll: number;
  slPbl: number;
  nh: number;
  credits: number;
  /** Appears in the library filter rail + upload picker (8 of the 10 rows). */
  inLibrary: boolean;
}

export interface SeedFolder {
  name: string;
  order: number;
}

export interface SeedResource {
  legacyId: string;
  courseCode: string;
  title: string;
  subjectName: string;
  type: ResourceTypeValue;
  folderName?: string;
  uploadedBy: string;
  rollNumber: string;
  uploadDate: string;
  /** Nominal size in MB; stored as bytes for display parity with the old seed. */
  sizeMb: number;
  downloadCount: number;
  /** Synthetic peer-review baseline kept on the aggregate fields. */
  rating: number;
  description: string;
  tags: string[];
}

export const STANDARD_FOLDERS: SeedFolder[] = [
  { name: "Practicals", order: 1 },
];

export const SEED_SEMESTER: SeedSemester = {
  number: 3,
  label: "Semester III",
  schemeLabel: "22+2* credits · 2022 scheme",
};

export const SEED_SUBJECTS: SeedSubject[] = [
  {
    srNo: 1,
    category: "Program Core",
    abbreviation: "PC",
    courseCode: "CMCOR2PC201",
    name: "Discrete Structures",
    cl: 30,
    tl: 0,
    ll: 30,
    slPbl: 30,
    nh: 90,
    credits: 3,
    inLibrary: true,
  },
  {
    srNo: 2,
    category: "Program Core",
    abbreviation: "PC",
    courseCode: "CMCOR2PC202",
    name: "Operating System",
    cl: 30,
    tl: 0,
    ll: 30,
    slPbl: 30,
    nh: 90,
    credits: 3,
    inLibrary: true,
  },
  {
    srNo: 3,
    category: "Program Core",
    abbreviation: "PC",
    courseCode: "CMCOR2PC203",
    name: "Data Structures",
    cl: 30,
    tl: 0,
    ll: 30,
    slPbl: 30,
    nh: 90,
    credits: 3,
    inLibrary: true,
  },
  {
    srNo: 4,
    category: "Program Core",
    abbreviation: "PC",
    courseCode: "CMCOR2PC204",
    name: "Microprocessor",
    cl: 30,
    tl: 0,
    ll: 30,
    slPbl: 30,
    nh: 90,
    credits: 3,
    inLibrary: true,
  },
  {
    srNo: 5,
    category: "MultiDisciplinary",
    abbreviation: "MD",
    courseCode: "CMCOR2MD201",
    name: "Foundation of Embedded System",
    cl: 30,
    tl: 0,
    ll: 30,
    slPbl: 30,
    nh: 90,
    credits: 3,
    inLibrary: true,
  },
  {
    srNo: 6,
    category: "Humanities, Social Science & Management",
    abbreviation: "HSSM-IK",
    courseCode: "CMLOR2IK201.1",
    name: "Indian Philosophical Systems",
    cl: 0,
    tl: 0,
    ll: 30,
    slPbl: 0,
    nh: 30,
    credits: 1,
    inLibrary: true,
  },
  {
    srNo: 6,
    category: "Humanities, Social Science & Management",
    abbreviation: "HSSM-IK",
    courseCode: "CMLOR2IK201.2",
    name: "Sanskrit and Computational Linguistics",
    cl: 0,
    tl: 0,
    ll: 30,
    slPbl: 0,
    nh: 30,
    credits: 1,
    inLibrary: true,
  },
  {
    srNo: 7,
    category: "Humanities, Social Science & Management",
    abbreviation: "HSSM-ED",
    courseCode: "CMLOR2ED201",
    name: "Engineering Career Navigation",
    cl: 0,
    tl: 0,
    ll: 30,
    slPbl: 0,
    nh: 30,
    credits: 1,
    inLibrary: true,
  },
  {
    srNo: 8,
    category: "Vocational & Skill",
    abbreviation: "VS",
    courseCode: "CMLOR2VS201",
    name: "Web Technology II",
    cl: 0,
    tl: 0,
    ll: 60,
    slPbl: 0,
    nh: 60,
    credits: 2,
    inLibrary: true,
  },
  {
    srNo: 9,
    category: "Vocational & Skill",
    abbreviation: "VS",
    courseCode: "CMLOR2VS202",
    name: "OOP with Java",
    cl: 0,
    tl: 0,
    ll: 60,
    slPbl: 0,
    nh: 60,
    credits: 2,
    inLibrary: true,
  },
  {
    srNo: 10,
    category: "Experiential Learning",
    abbreviation: "EL-CP",
    courseCode: "CMLOR2CP201",
    name: "Community Engagement Project Lab",
    cl: 0,
    tl: 0,
    ll: 30,
    slPbl: 0,
    nh: 30,
    credits: 1,
    inLibrary: true,
  },
  {
    srNo: 11,
    category: "Bridge course",
    abbreviation: "BC",
    courseCode: "CMLOR2BC201",
    name: "Bridge course BC",
    cl: 0,
    tl: 0,
    ll: 60,
    slPbl: 0,
    nh: 60,
    credits: 2,
    inLibrary: true,
  },
];

export const SEED_RESOURCES: SeedResource[] = [
  // ==========================================
  // Operating System (CMCOR2PC202) - SAKEC Lab Practicals
  // ==========================================
  {
    legacyId: "res-os-001",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 1: Basic Linux/Unix Shell Commands and Architecture",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.41,
    downloadCount: 210,
    rating: 5.0,
    description:
      "Official SAKEC Autonomous OS Lab Practical (Roll 67). Explores Linux architecture, directory structure, navigation, file management, permissions, and pipeline filtering commands.",
    tags: ["OperatingSystem", "CMCOR2PC202", "LabManual", "LinuxCommands", "TanmayShinde"],
  },
  {
    legacyId: "res-os-002",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 2: Process Control System Calls (fork, getpid, exit, wait)",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.77,
    downloadCount: 235,
    rating: 5.0,
    description:
      "C program demonstrations of UNIX process hierarchy, parent-child fork() execution, process PID tracking, and zombie/orphan process mitigation with wait() system calls.",
    tags: ["SystemCalls", "Fork", "ProcessControl", "LabManual"],
  },
  {
    legacyId: "res-os-003",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 3: CPU Process Scheduling Algorithms (FCFS, Non-Preemptive SJF)",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.24,
    downloadCount: 195,
    rating: 5.0,
    description:
      "Algorithm design, Gantt chart computation, turnaround time, waiting time, and C language implementation of First Come First Serve (FCFS) and Shortest Job First (SJF).",
    tags: ["Scheduling", "FCFS", "SJF", "GanttChart", "LabManual"],
  },
  {
    legacyId: "res-os-004",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 4: Preemptive CPU Scheduling Algorithms (Round Robin & Priority)",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.63,
    downloadCount: 250,
    rating: 5.0,
    description:
      "Implementation of Round Robin (RR) with dynamic time quantum slicing and Preemptive Priority Scheduling with waiting/turnaround time comparisons.",
    tags: ["RoundRobin", "PriorityScheduling", "TimeQuantum", "LabManual"],
  },
  {
    legacyId: "res-os-005",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 5: Process Synchronization using Semaphores & Shared Memory",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.54,
    downloadCount: 220,
    rating: 5.0,
    description:
      "Solving the classic Producer-Consumer and Bounded Buffer synchronization problem using POSIX semaphores, mutex locks, and inter-process communication.",
    tags: ["Semaphores", "Mutex", "ProducerConsumer", "Synchronization", "LabManual"],
  },
  {
    legacyId: "res-os-006",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 6: Deadlock Avoidance using Banker's Safety Algorithm",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.29,
    downloadCount: 280,
    rating: 5.0,
    description:
      "Implementation of Dijkstra's Banker's Algorithm for deadlock avoidance: Available, Max, Allocation, and Need matrices with safe sequence computation.",
    tags: ["BankersAlgorithm", "DeadlockAvoidance", "SafeState", "LabManual"],
  },
  {
    legacyId: "res-os-007",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 7: Virtual Memory Page Replacement Algorithms (FIFO, LRU)",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.27,
    downloadCount: 215,
    rating: 5.0,
    description:
      "Demand paging simulations comparing FIFO (First In First Out), LRU (Least Recently Used), and Optimal Page Replacement algorithms with hit/fault ratios.",
    tags: ["PageReplacement", "FIFO", "LRU", "VirtualMemory", "LabManual"],
  },
  {
    legacyId: "res-os-008",
    courseCode: "CMCOR2PC202",
    title: "OS Experiment 8: Disk Arm Scheduling Algorithms (FCFS, SSTF, SCAN)",
    subjectName: "Operating System",
    type: "Lab Manual",
    folderName: "Practicals",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-16",
    sizeMb: 0.30,
    downloadCount: 190,
    rating: 5.0,
    description:
      "Secondary storage disk head scheduling: FCFS, Shortest Seek Time First (SSTF), SCAN (Elevator), and C-SCAN algorithms with total seek time calculations.",
    tags: ["DiskScheduling", "SSTF", "SCAN", "SeekTime", "LabManual"],
  },
];
