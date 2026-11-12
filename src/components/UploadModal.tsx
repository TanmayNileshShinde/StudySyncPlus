import React, { useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { SubjectCategory, ResourceType, Semester, FormErrors } from '../types';
import { X, UploadCloud, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUBJECTS: SubjectCategory[] = [
  'Web Computing & Modern Frameworks',
  'Data Structures & Algorithms',
  'Database Management Systems',
  'Operating Systems',
  'Computer Networks',
  'Artificial Intelligence & Machine Learning'
];

const RESOURCE_TYPES: ResourceType[] = [
  'Lecture Notes',
  'Past Exam Papers',
  'Lab Manual',
  'Cheat Sheet',
  'Reference Book'
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { addResource, userProfile } = useResources();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectCategory>('Web Computing & Modern Frameworks');
  const [semester, setSemester] = useState<Semester>(5);
  const [type, setType] = useState<ResourceType>('Lecture Notes');
  const [fileFormat, setFileFormat] = useState<'PDF' | 'DOCX' | 'ZIP' | 'PPTX'>('PDF');
  const [fileSizeMb, setFileSizeMb] = useState<string>('3.5');
  const [uploadedBy, setUploadedBy] = useState(userProfile.name);
  const [rollNumber, setRollNumber] = useState(userProfile.studentId);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('React, Syllabus, Notes');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Real-time & submission form validation (CO1.3, CO1.4)
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 1. Title validation
    if (!title.trim()) {
      newErrors.title = 'Resource title is mandatory.';
    } else if (title.trim().length < 6) {
      newErrors.title = 'Title must be at least 6 characters long.';
    } else if (title.trim().length > 90) {
      newErrors.title = 'Title must not exceed 90 characters.';
    }

    // 2. Roll number regex validation
    const rollRegex = /^[0-9a-zA-Z]{2,15}$/;
    if (!rollNumber.trim()) {
      newErrors.rollNumber = 'Roll/Seat number is required.';
    } else if (!rollRegex.test(rollNumber.trim())) {
      newErrors.rollNumber = 'Invalid roll number format (e.g. 126BTCM2008 or 67).';
    }

    // 3. Uploader Name
    if (!uploadedBy.trim() || uploadedBy.trim().length < 3) {
      newErrors.uploadedBy = 'Please provide an author name (at least 3 characters).';
    }

    // 4. File size validation
    const sizeNum = parseFloat(fileSizeMb);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      newErrors.fileSize = 'File size must be a positive number.';
    } else if (sizeNum > 50) {
      newErrors.fileSize = 'Maximum allowed file size is 50 MB.';
    }

    // 5. Description validation
    if (!description.trim()) {
      newErrors.description = 'Please provide a helpful summary for peer students.';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Description should be at least 15 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Parse tags array using ES6 split, map, filter
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    setTimeout(() => {
      addResource({
        title: title.trim(),
        subject,
        semester,
        type,
        fileFormat,
        fileSize: `${parseFloat(fileSizeMb).toFixed(1)} MB`,
        uploadedBy: uploadedBy.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        description: description.trim(),
        tags: parsedTags.length > 0 ? parsedTags : ['StudyMaterial', 'SemesterPrep']
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setIsSubmitting(false);
      onClose();
      // Reset form fields
      setTitle('');
      setDescription('');
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="clay-box w-full max-w-2xl bg-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Share Study Resource</h2>
              <p className="text-xs text-slate-500 font-medium">
                Contribute verified notes, PYQs, and cheat sheets for student peers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Live Validation */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Resource Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Resource Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unit 3 Dynamic Programming & Memoization Notes"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={`w-full px-4 py-2.5 clay-input text-slate-800 ${
                errors.title ? 'border-rose-400 bg-rose-50/30' : ''
              }`}
            />
            {errors.title && (
              <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* Subject & Semester Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectCategory)}
                className="w-full px-3 py-2.5 clay-input text-slate-800 bg-white"
              >
                {SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as Semester)}
                className="w-full px-3 py-2.5 clay-input text-slate-800 bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type, Format & File Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resource Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="w-full px-3 py-2.5 clay-input text-slate-800 bg-white"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">File Format</label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as any)}
                className="w-full px-3 py-2.5 clay-input text-slate-800 bg-white"
              >
                <option value="PDF">PDF Document</option>
                <option value="DOCX">Word Document</option>
                <option value="ZIP">ZIP Archive (Lab code)</option>
                <option value="PPTX">PowerPoint Presentation</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Size (MB)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                value={fileSizeMb}
                onChange={(e) => setFileSizeMb(e.target.value)}
                className="w-full px-3 py-2.5 clay-input text-slate-800"
              />
              {errors.fileSize && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.fileSize}</p>
              )}
            </div>
          </div>

          {/* Author Details (Tanmay & Aditya or Custom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Uploader Student Name</label>
              <input
                type="text"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Tanmay Shinde"
                className="w-full px-3 py-2.5 clay-input text-slate-800"
              />
              {errors.uploadedBy && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.uploadedBy}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Roll / Seat No</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="126BTCM2008"
                className="w-full px-3 py-2.5 clay-input text-slate-800"
              />
              {errors.rollNumber && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.rollNumber}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description & Key Topics <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Summarize key chapters, professors, or exam points covered in this resource..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={`w-full px-4 py-2.5 clay-input text-slate-800 resize-none ${
                errors.description ? 'border-rose-400 bg-rose-50/30' : ''
              }`}
            />
            {errors.description && (
              <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.description}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tags <span className="text-slate-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Algorithms, Module3, MumbaiUniversity, Solved"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 clay-input text-slate-800"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="clay-button px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-button-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Validating & Storing...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish to StudySync</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
