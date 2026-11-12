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

export interface SeedResource {
  legacyId: string;
  courseCode: string;
  title: string;
  subjectName: string;
  type: ResourceTypeValue;
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
    category: "HSSM - Indian Knowledge System",
    abbreviation: "HSSM-IK",
    courseCode: "CMLOR2IK201.1",
    name: "Indian Philosophical Systems",
    cl: 0,
    tl: 0,
    ll: 30,
    slPbl: 0,
    nh: 30,
    credits: 1,
    inLibrary: false,
  },
  {
    srNo: 7,
    category: "HSSM - Entrepreneurship",
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
    inLibrary: false,
  },
];

export const SEED_RESOURCES: SeedResource[] = [
  {
    legacyId: "res-001",
    courseCode: "CMLOR2VS201",
    title: "Web Technology II — ES6, Fetch API, DOM & React Master Notes",
    subjectName: "Web Technology II",
    type: "Lecture Notes",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-10-14",
    sizeMb: 4.2,
    downloadCount: 420,
    rating: 4.9,
    description:
      "Complete Lab manual and theory notes for Web Tech II (CMLOR2VS201) covering ES6+, DOM manipulation, Promise chaining, Context API, and Chart.js integration.",
    tags: ["WebTech2", "CMLOR2VS201", "JavaScript", "React", "Vite"],
  },
  {
    legacyId: "res-002",
    courseCode: "CMCOR2PC203",
    title: "Data Structures — AVL Trees, Graphs & Traversal Implementation",
    subjectName: "Data Structures",
    type: "Lab Manual",
    uploadedBy: "Aditya Shah",
    rollNumber: "126BTCM2009",
    uploadDate: "2026-09-28",
    sizeMb: 5.2,
    downloadCount: 512,
    rating: 4.8,
    description:
      "Verified C++ programs for Balanced BSTs, B-Trees, Dijkstra shortest path, BFS/DFS traversals, and dynamic arrays with complexity proofs.",
    tags: ["DataStructures", "CMCOR2PC203", "Trees", "Graphs", "Algorithms"],
  },
  {
    legacyId: "res-003",
    courseCode: "CMCOR2PC202",
    title: "Operating System — CPU Scheduling, Deadlocks & Memory Management",
    subjectName: "Operating System",
    type: "Cheat Sheet",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-10-02",
    sizeMb: 2.8,
    downloadCount: 380,
    rating: 4.9,
    description:
      "Step-by-step Gantt charts for Round Robin, SJF, SRTF, Banker algorithm safety sequence, and FIFO/LRU page fault calculations.",
    tags: ["OperatingSystem", "CMCOR2PC202", "Scheduling", "Deadlocks", "Paging"],
  },
  {
    legacyId: "res-004",
    courseCode: "CMCOR2PC201",
    title: "Discrete Structures — Sets, Relations, Graphs & Combinatorics",
    subjectName: "Discrete Structures",
    type: "Past Exam Papers",
    uploadedBy: "Aditya Shah",
    rollNumber: "126BTCM2009",
    uploadDate: "2026-09-18",
    sizeMb: 6.4,
    downloadCount: 390,
    rating: 4.7,
    description:
      "Solved university numericals on Pigeonhole principle, recurrence relations, generating functions, Hasse diagrams, and Posets.",
    tags: ["DiscreteMath", "CMCOR2PC201", "Relations", "Combinatorics"],
  },
  {
    legacyId: "res-005",
    courseCode: "CMCOR2PC204",
    title: "Microprocessor — 8086 Architecture, Assembly & Interfacing Manual",
    subjectName: "Microprocessor",
    type: "Lab Manual",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-10-22",
    sizeMb: 7.1,
    downloadCount: 345,
    rating: 4.8,
    description:
      "Assembly Language Programs (ALP) for 8086 addressing modes, string operations, 8255 PPI interfacing, and interrupt vector tables.",
    tags: ["Microprocessor", "CMCOR2PC204", "8086", "Assembly", "MASM"],
  },
  {
    legacyId: "res-006",
    courseCode: "CMLOR2VS202",
    title: "OOP with Java — Inheritance, Polymorphism, Collections & Multithreading",
    subjectName: "OOP with Java",
    type: "Lecture Notes",
    uploadedBy: "Aditya Shah",
    rollNumber: "126BTCM2009",
    uploadDate: "2026-09-25",
    sizeMb: 4.9,
    downloadCount: 460,
    rating: 4.9,
    description:
      "Clean Java programs demonstrating abstract classes, interfaces, custom exception handling, generic collections, and thread synchronization.",
    tags: ["Java", "CMLOR2VS202", "OOP", "Multithreading", "Collections"],
  },
  {
    legacyId: "res-007",
    courseCode: "CMCOR2MD201",
    title: "Foundation of Embedded System — Microcontrollers, Sensors & GPIO",
    subjectName: "Foundation of Embedded System",
    type: "Reference Book",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-10-18",
    sizeMb: 9.2,
    downloadCount: 295,
    rating: 4.6,
    description:
      "Embedded C programming, ADC/DAC conversions, PWM timer control, I2C/SPI bus protocols, and IoT sensor interfacing tutorials.",
    tags: ["EmbeddedSystems", "CMCOR2MD201", "Microcontroller", "Sensors"],
  },
  {
    legacyId: "res-008",
    courseCode: "CMLOR2ED201",
    title: "Engineering Career Navigation — Resume, Tech Stack & Interview Guide",
    subjectName: "Engineering Career Navigation",
    type: "Cheat Sheet",
    uploadedBy: "Tanmay Shinde",
    rollNumber: "126BTCM2008",
    uploadDate: "2026-11-04",
    sizeMb: 1.9,
    downloadCount: 520,
    rating: 5.0,
    description:
      "Curated technical interview roadmaps for engineering students, GitHub portfolio setup, DSA prep strategy, and placement guidance.",
    tags: ["Career", "CMLOR2ED201", "Interviews", "Placements"],
  },
];
