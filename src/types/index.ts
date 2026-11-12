export type SubjectCategory = 
  | 'Web Technology II'
  | 'Operating System'
  | 'Data Structures'
  | 'Discrete Structures'
  | 'Microprocessor'
  | 'Foundation of Embedded System'
  | 'OOP with Java'
  | 'Engineering Career Navigation';

export type ResourceType = 'Lecture Notes' | 'Past Exam Papers' | 'Lab Manual' | 'Cheat Sheet' | 'Reference Book';

export type Semester = 3;

export interface StudyResource {
  id: string;
  courseCode: string; // e.g. "CMLOR2VS201", "CMCOR2PC202"
  title: string;
  subject: SubjectCategory;
  semester: 3;
  type: ResourceType;
  uploadedBy: string;
  rollNumber: string;
  uploadDate: string;
  fileSize: string; // e.g. "2.4 MB"
  downloadCount: number;
  rating: number; // 1-5
  fileFormat: 'PDF';
  description: string;
  tags: string[];
  externalUrl?: string;
  isUserUploaded?: boolean;
}

export interface UserProfile {
  name: string;
  rollNumber: string;
  studentId: string;
  semester: 3;
  branch: string;
  college: string;
  savedResourceIds: string[];
  studyStreakDays: number;
}

export type ActiveTab = 'library' | 'analytics' | 'async-lab' | 'syllabus-viva' | 'curriculum-scheme';

export interface FormErrors {
  title?: string;
  subject?: string;
  type?: string;
  uploadedBy?: string;
  rollNumber?: string;
  fileSize?: string;
  fileFormat?: string;
  description?: string;
}

export interface OfficialCourseSchemeItem {
  srNo: number;
  category: string;
  abbreviation: string;
  courseCode: string;
  courseName: string;
  cl: number;
  tl: number;
  ll: number;
  slPbl: number;
  nh: number;
  credits: number;
}
