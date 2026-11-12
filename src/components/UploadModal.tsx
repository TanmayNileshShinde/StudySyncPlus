import React, { useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { SubjectCategory, ResourceType, FormErrors } from '../types';
import { X, UploadCloud, AlertCircle, Sparkles, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUBJECT_OPTIONS: { name: SubjectCategory; code: string }[] = [
  { name: 'Web Technology II', code: 'CMLOR2VS201' },
  { name: 'Operating System', code: 'CMCOR2PC202' },
  { name: 'Data Structures', code: 'CMCOR2PC203' },
  { name: 'Discrete Structures', code: 'CMCOR2PC201' },
  { name: 'Microprocessor', code: 'CMCOR2PC204' },
  { name: 'Foundation of Embedded System', code: 'CMCOR2MD201' },
  { name: 'OOP with Java', code: 'CMLOR2VS202' },
  { name: 'Engineering Career Navigation', code: 'CMLOR2ED201' }
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
  const [subject, setSubject] = useState<SubjectCategory>('Web Technology II');
  const [courseCode, setCourseCode] = useState('CMLOR2VS201');
  const [type, setType] = useState<ResourceType>('Lecture Notes');
  const [fileSizeMb, setFileSizeMb] = useState<string>('3.5');
  const [uploadedBy, setUploadedBy] = useState(userProfile.name);
  const [rollNumber, setRollNumber] = useState(userProfile.studentId);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('WebTech2, CMLOR2VS201, Notes');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubjectChange = (subj: SubjectCategory) => {
    setSubject(subj);
    const found = SUBJECT_OPTIONS.find((s) => s.name === subj);
    if (found) {
      setCourseCode(found.code);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Resource title is mandatory.';
    } else if (title.trim().length < 6) {
      newErrors.title = 'Title must be at least 6 characters long.';
    } else if (title.trim().length > 95) {
      newErrors.title = 'Title must not exceed 95 characters.';
    }

    const rollRegex = /^[0-9a-zA-Z]{2,15}$/;
    if (!rollNumber.trim()) {
      newErrors.rollNumber = 'Roll/Seat number is required.';
    } else if (!rollRegex.test(rollNumber.trim())) {
      newErrors.rollNumber = 'Invalid roll number format (e.g. 126BTCM2008 or 67).';
    }

    if (!uploadedBy.trim() || uploadedBy.trim().length < 3) {
      newErrors.uploadedBy = 'Please provide an author name (at least 3 characters).';
    }

    const sizeNum = parseFloat(fileSizeMb);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      newErrors.fileSize = 'File size must be a positive number.';
    } else if (sizeNum > 50) {
      newErrors.fileSize = 'Maximum allowed file size is 50 MB.';
    }

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

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    setTimeout(() => {
      addResource({
        courseCode,
        title: title.trim(),
        subject,
        type,
        fileSize: `${parseFloat(fileSizeMb).toFixed(1)} MB`,
        uploadedBy: uploadedBy.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        description: description.trim(),
        tags: parsedTags.length > 0 ? parsedTags : ['StudyMaterial', 'Semester3', 'PDF']
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setIsSubmitting(false);
      onClose();
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
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">Upload Semester 3 PDF Resource</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-md border border-rose-200">
                  PDF Only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Contribute verified Semester III notes and lab manuals for student peers
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Resource Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Resource Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unit 3 Dynamic Programming & AVL Trees Solved PYQs"
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

          {/* Subject & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Semester 3 Course</label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value as SubjectCategory)}
                className="w-full px-3 py-2.5 clay-input text-slate-800 bg-white"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub.code} value={sub.name}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Curriculum</label>
              <div className="w-full px-3 py-2.5 clay-input text-slate-700 bg-slate-50 flex items-center justify-between font-medium">
                <span>Semester III (Level 4.5)</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600">{courseCode}</span>
              </div>
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
              <div className="w-full px-3 py-2.5 clay-input text-rose-700 bg-rose-50/50 flex items-center gap-2 font-bold">
                <FileText className="w-4 h-4 text-rose-600" />
                <span>PDF Document</span>
              </div>
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

          {/* Author Details */}
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
              placeholder="Summarize key units, experiments, or exam questions covered in this PDF..."
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
              placeholder="e.g. WebTech2, CMLOR2VS201, Algorithms, SAKEC, PDF"
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
                  <span>Publish PDF Resource</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
