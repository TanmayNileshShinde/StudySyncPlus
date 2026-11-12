import React, { useEffect, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import type { ResourceType, FormErrors, StudyResource } from '../types';
import { X, UploadCloud, AlertCircle, Sparkles, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present when the modal is editing an existing user-uploaded resource. */
  editing?: StudyResource | null;
}

const RESOURCE_TYPES: ResourceType[] = [
  'Lecture Notes',
  'Past Exam Papers',
  'Lab Manual',
  'Cheat Sheet',
  'Reference Book'
];

/** Parity with the server-side storage cap. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const CONFETTI_COLORS = ['#111111', '#a3e635', '#d6d3d1'];

const DEMO_STUDENT = { name: 'Tanmay Shinde', studentId: '126BTCM2008' };

const FieldError: React.FC<{ message?: string; id?: string }> = ({ message, id }) =>
  message ? (
    <p id={id} className="text-alert text-[11px] mt-1 flex items-center gap-1 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" /> {message}
    </p>
  ) : null;

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, editing }) => {
  const { subjects, addResource, updateResource, showToast } = useResources();
  const panelRef = useOverlayBehavior(isOpen, onClose);

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [type, setType] = useState<ResourceType>('Lecture Notes');
  const [uploadedBy, setUploadedBy] = useState(DEMO_STUDENT.name);
  const [rollNumber, setRollNumber] = useState(DEMO_STUDENT.studentId);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'publishing'>('idle');
  const isSubmitting = phase !== 'idle';

  const isEditing = !!editing;

  // Ensure the select has a valid option (including an archived subject kept on edit).
  const subjectChoices = React.useMemo(() => {
    if (editing && !subjects.some((s) => s.id === editing.subjectId)) {
      return [{ id: editing.subjectId, name: editing.subjectName, courseCode: editing.courseCode }, ...subjects];
    }
    return subjects;
  }, [subjects, editing]);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setPhase('idle');
    setErrors({});
    setFile(null);
    if (editing) {
      setTitle(editing.title);
      setSubjectId(editing.subjectId);
      setType(editing.type);
      setUploadedBy(editing.uploadedBy);
      setRollNumber(editing.rollNumber);
      setDescription(editing.description);
      setTagsInput(editing.tags.join(', '));
    } else {
      setTitle('');
      setSubjectId(subjects[0]?.id ?? '');
      setType('Lecture Notes');
      setUploadedBy(DEMO_STUDENT.name);
      setRollNumber(DEMO_STUDENT.studentId);
      setDescription('');
      setTagsInput(subjects[0] ? `${subjects[0].courseCode}, Semester3, PDF` : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const selectedSubject = subjectChoices.find((s) => s.id === subjectId);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Resource title is mandatory.';
    } else if (title.trim().length < 6) {
      newErrors.title = 'Title must be at least 6 characters long.';
    } else if (title.trim().length > 95) {
      newErrors.title = 'Title must not exceed 95 characters.';
    }

    if (!subjectId) {
      newErrors.subject = 'Select the course this resource belongs to.';
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

    if (!isEditing && !file) {
      newErrors.file = 'Attach the PDF file to be catalogued.';
    } else if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        newErrors.file = 'Only PDF files can be catalogued.';
      } else if (file.size > MAX_FILE_BYTES) {
        newErrors.file = 'Maximum allowed file size is 50 MB.';
      } else if (file.size === 0) {
        newErrors.file = 'The selected file appears to be empty.';
      }
    }

    if (!description.trim()) {
      newErrors.description = 'Please provide a helpful summary for peer students.';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Description should be at least 15 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const tags = parsedTags.length > 0 ? parsedTags : ['StudyMaterial', 'Semester3', 'PDF'];

    try {
      if (isEditing && editing) {
        setPhase('publishing');
        await updateResource(editing.id, {
          title: title.trim(),
          subjectId,
          type,
          uploadedBy: uploadedBy.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          description: description.trim(),
          tags,
          replaceFile: file ?? undefined
        });
      } else {
        setPhase('uploading');
        await addResource({
          file: file as File,
          title: title.trim(),
          subjectId,
          type,
          uploadedBy: uploadedBy.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          description: description.trim(),
          tags
        });
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: CONFETTI_COLORS
        });
      }
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Publishing failed. Please try again.');
      setPhase('idle');
    }
  };

  const buttonLabel = isEditing
    ? phase === 'idle'
      ? 'Save Changes'
      : phase === 'uploading'
        ? 'Uploading PDF…'
        : 'Saving Changes…'
    : phase === 'idle'
      ? 'Publish PDF Resource'
      : phase === 'uploading'
        ? 'Uploading PDF…'
        : 'Publishing…';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
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
                  {isEditing ? 'Edit Resource' : 'Upload Semester 3 PDF Resource'}
                </h2>
                <span className="stamp stamp-ink">PDF Only</span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                {isEditing
                  ? 'Update the catalogue entry. Replace the file if the scan was wrong.'
                  : 'Contribute verified Semester III notes and lab manuals for student peers.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost px-2 shrink-0"
            aria-label="Close upload form"
            disabled={isSubmitting}
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
                Semester Course
              </label>
              <select
                id="upload-subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
                }}
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? 'upload-subject-error' : undefined}
                className={`field w-full px-3 py-2.5 ${errors.subject ? 'field-error' : ''}`}
              >
                {subjectChoices.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.courseCode})
                  </option>
                ))}
              </select>
              <FieldError id="upload-subject-error" message={errors.subject} />
            </div>

            <div>
              <span className="block font-semibold text-ink mb-1">Paired Course Code</span>
              <div className="field w-full px-3 py-2.5 flex items-center justify-between font-medium">
                <span className="text-ink-2">Auto-paired</span>
                <span className="font-mono font-bold text-ink text-[11px]">
                  {selectedSubject?.courseCode || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Type + file */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label htmlFor="upload-file" className="block font-semibold text-ink mb-1">
                {isEditing ? 'Replace PDF (optional)' : 'PDF File'}{' '}
                {!isEditing && <span className="text-alert" aria-hidden="true">*</span>}
              </label>
              <input
                id="upload-file"
                type="file"
                accept="application/pdf,.pdf"
                aria-required={!isEditing}
                aria-invalid={!!errors.file}
                aria-describedby={errors.file ? 'upload-file-error' : undefined}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  if (errors.file) setErrors((prev) => ({ ...prev, file: undefined }));
                }}
                className={`field w-full px-3 py-2 file:mr-3 file:px-2 file:py-1 file:border file:border-ink file:bg-paper file:text-[11px] file:font-semibold file:text-ink ${
                  errors.file ? 'field-error' : ''
                }`}
              />
              <FieldError id="upload-file-error" message={errors.file} />
            </div>
          </div>

          {/* File status row */}
          <div className="ruled-sunk px-3.5 py-2.5 flex items-center gap-2.5 text-[11px]">
            <FileText className="w-4 h-4 text-ink shrink-0" aria-hidden="true" />
            {file ? (
              <span className="min-w-0 truncate text-ink">
                <strong>{file.name}</strong>
                <span className="text-ink-3"> · {formatBytes(file.size)} · will be stored on the backend</span>
              </span>
            ) : isEditing ? (
              <span className="text-ink-2">
                Keeping the current stored PDF ({editing?.fileSize}) — attach a file above to replace it.
              </span>
            ) : (
              <span className="text-ink-3">PDF up to 50 MB. The file is stored and served by the backend.</span>
            )}
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
                onChange={(e) => {
                  setUploadedBy(e.target.value);
                  if (errors.uploadedBy) setErrors((prev) => ({ ...prev, uploadedBy: undefined }));
                }}
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
                onChange={(e) => {
                  setRollNumber(e.target.value);
                  if (errors.rollNumber) setErrors((prev) => ({ ...prev, rollNumber: undefined }));
                }}
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
            <button type="button" onClick={onClose} className="btn btn-ghost px-5" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || subjectChoices.length === 0} className="btn btn-primary px-6">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{buttonLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
