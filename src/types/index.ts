export type SubjectCategory = 
  | 'Data Structures & Algorithms'
  | 'Database Management Systems'
  | 'Operating Systems'
  | 'Web Computing & Modern Frameworks'
  | 'Computer Networks'
  | 'Artificial Intelligence & Machine Learning';

export type ResourceType = 'Lecture Notes' | 'Past Exam Papers' | 'Lab Manual' | 'Cheat Sheet' | 'Reference Book';

export type Semester = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StudyResource {
  id: string;
  title: string;
  subject: SubjectCategory;
  semester: Semester;
  type: ResourceType;
  uploadedBy: string;
  rollNumber: string;
  uploadDate: string;
  fileSize: string; // e.g. "2.4 MB"
  downloadCount: number;
  rating: number; // 1-5
  fileFormat: 'PDF' | 'DOCX' | 'ZIP' | 'PPTX';
  description: string;
  tags: string[];
  externalUrl?: string;
  isUserUploaded?: boolean;
}

export interface UserProfile {
  name: string;
  rollNumber: string;
  studentId: string;
  semester: Semester;
  branch: string;
  college: string;
  savedResourceIds: string[];
  studyStreakDays: number;
}

export type ActiveTab = 'library' | 'analytics' | 'async-lab' | 'syllabus-viva';

export interface FormErrors {
  title?: string;
  subject?: string;
  semester?: string;
  type?: string;
  uploadedBy?: string;
  rollNumber?: string;
  fileSize?: string;
  fileFormat?: string;
  description?: string;
}
