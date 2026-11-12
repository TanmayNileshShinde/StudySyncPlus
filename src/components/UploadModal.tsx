import React, { useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
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

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

const FieldError: React.FC<{ message?: string; id?: string }> = ({ message, id }) =>
  message ? (
    <p id={id} className="text-alert text-[11px] mt-1 flex items-center gap-1 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" /> {message}
    </p>
  ) : null;

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { addResource, userProfile } = useResources();
  const panelRef = useOverlayBehavior(isOpen, onClose);

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
        origin: { y: 0.6 },
        colors: CONFETTI_COLORS
      });

      setIsSubmitting(false);
      onClose();
      setTitle('');
      setDescription('');
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        className="ruled w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-overlay animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-ink">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-ink flex items-center justify-center shrink-0" aria-hidden="true">
              <UploadCloud className="w-5 h-5 text-lime" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="upload-modal-title" className="text-lg font-bold text-ink leading-tight">
                  Upload Semester 3 PDF Resource
                </h2>
                <span className="stamp stamp-ink">PDF Only</span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Contribute verified Semester III notes and lab manuals for student peers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost px-2 shrink-0"
            aria-label="Close upload form"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Title */}
          <div>
            <label htmlFor="upload-title" className="block font-semibold text-ink mb-1">
              Resource Title <span className="text-alert" aria-hidden="true">*</span>
            </label>
            <input
              id="upload-title"
              type="text"
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'upload-title-error' : undefined}
              placeholder="e.g. Unit 3 Dynamic Programming & AVL Trees Solved PYQs"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={`field w-full px-3.5 py-2.5 ${errors.title ? 'field-error' : ''}`}
            />
            <FieldError id="upload-title-error" message={errors.title} />
          </div>

          {/* Subject & curriculum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="upload-subject" className="block font-semibold text-ink mb-1">
                Semester 3 Course
              </label>
              <select
                id="upload-subject"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value as SubjectCategory)}
                className="field w-full px-3 py-2.5"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub.code} value={sub.name}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block font-semibold text-ink mb-1">Target Curriculum</span>
              <div className="field w-full px-3 py-2.5 flex items-center justify-between font-medium">
                <span className="text-ink-2">Semester III (Level 4.5)</span>
                <span className="font-mono font-bold text-ink text-[11px]">{courseCode}</span>
              </div>
            </div>
          </div>

          {/* Type, format, size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="upload-type" className="block font-semibold text-ink mb-1">
                Resource Category
              </label>
              <select
                id="upload-type"
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="field w-full px-3 py-2.5"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block font-semibold text-ink mb-1">File Format</span>
              <div className="field w-full px-3 py-2.5 flex items-center gap-2 font-semibold">
                <FileText className="w-4 h-4 text-ink" aria-hidden="true" />
                <span>PDF Document</span>
              </div>
            </div>

            <div>
              <label htmlFor="upload-size" className="block font-semibold text-ink mb-1">
                Estimated Size (MB)
              </label>
              <input
                id="upload-size"
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                aria-invalid={!!errors.fileSize}
                aria-describedby={errors.fileSize ? 'upload-size-error' : undefined}
                value={fileSizeMb}
                onChange={(e) => setFileSizeMb(e.target.value)}
                className={`field w-full px-3 py-2.5 ${errors.fileSize ? 'field-error' : ''}`}
              />
              <FieldError id="upload-size-error" message={errors.fileSize} />
            </div>
          </div>

          {/* Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="upload-author" className="block font-semibold text-ink mb-1">
                Uploader Student Name
              </label>
              <input
                id="upload-author"
                type="text"
                aria-invalid={!!errors.uploadedBy}
                aria-describedby={errors.uploadedBy ? 'upload-author-error' : undefined}
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Tanmay Shinde"
                className={`field w-full px-3 py-2.5 ${errors.uploadedBy ? 'field-error' : ''}`}
              />
              <FieldError id="upload-author-error" message={errors.uploadedBy} />
            </div>

            <div>
              <label htmlFor="upload-roll" className="block font-semibold text-ink mb-1">
                Roll / Seat No
              </label>
              <input
                id="upload-roll"
                type="text"
                aria-invalid={!!errors.rollNumber}
                aria-describedby={errors.rollNumber ? 'upload-roll-error' : undefined}
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="126BTCM2008"
                className={`field w-full px-3 py-2.5 font-mono ${errors.rollNumber ? 'field-error' : ''}`}
              />
              <FieldError id="upload-roll-error" message={errors.rollNumber} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="upload-description" className="block font-semibold text-ink mb-1">
              Description &amp; Key Topics <span className="text-alert" aria-hidden="true">*</span>
            </label>
            <textarea
              id="upload-description"
              rows={3}
              aria-required="true"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'upload-description-error' : undefined}
              placeholder="Summarize key units, experiments, or exam questions covered in this PDF..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={`field w-full px-3.5 py-2.5 resize-none ${errors.description ? 'field-error' : ''}`}
            />
            <FieldError id="upload-description-error" message={errors.description} />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="upload-tags" className="block font-semibold text-ink mb-1">
              Tags <span className="text-ink-3 font-normal">(comma-separated)</span>
            </label>
            <input
              id="upload-tags"
              type="text"
              placeholder="e.g. WebTech2, CMLOR2VS201, Algorithms, SAKEC, PDF"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="field w-full px-3.5 py-2.5"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost px-5">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary px-6">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Validating & Storing…' : 'Publish PDF Resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
