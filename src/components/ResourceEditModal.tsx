import React, { useEffect, useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { useOverlayBehavior } from '../hooks/useOverlayBehavior';
import type { ResourceType, FormErrors } from '../types';
import { X, Pencil, AlertCircle, FileText } from 'lucide-react';

const RESOURCE_TYPES: ResourceType[] = [
  'Lecture Notes',
  'Past Exam Papers',
  'Lab Manual',
  'Cheat Sheet',
  'Reference Book'
];

/** Parity with the server-side storage cap. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const FieldError: React.FC<{ message?: string; id?: string }> = ({ message, id }) =>
  message ? (
    <p id={id} className="text-alert text-[11px] mt-1 flex items-center gap-1 font-medium">
      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" /> {message}
    </p>
  ) : null;

export const ResourceEditModal: React.FC = () => {
  const { editResource, closeEdit, subjects, updateResource, showToast } = useResources();
  const isOpen = editResource !== null;
  const panelRef = useOverlayBehavior(isOpen, closeEdit);

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [type, setType] = useState<ResourceType>('Lecture Notes');
  const [uploadedBy, setUploadedBy] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens for a resource.
  useEffect(() => {
    if (!editResource) return;
    setTitle(editResource.title);
    setSubjectId(editResource.subjectId);
    setType(editResource.type);
    setUploadedBy(editResource.uploadedBy);
    setRollNumber(editResource.rollNumber);
    setDescription(editResource.description);
    setTagsInput(editResource.tags.join(', '));
    setFile(null);
    setErrors({});
    setSaving(false);
  }, [editResource]);

  if (!editResource) return null;

  // Ensure the select has a valid option (including an archived subject kept on edit).
  const subjectChoices = subjects.some((s) => s.id === editResource.subjectId)
    ? subjects
    : [{ id: editResource.subjectId, name: editResource.subjectName, courseCode: editResource.courseCode }, ...subjects];

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

    if (!subjectId) newErrors.subject = 'Select the course this resource belongs to.';

    const rollRegex = /^[0-9a-zA-Z]{2,15}$/;
    if (!rollNumber.trim()) {
      newErrors.rollNumber = 'Roll/Seat number is required.';
    } else if (!rollRegex.test(rollNumber.trim())) {
      newErrors.rollNumber = 'Invalid roll number format (e.g. 126BTCM2008 or 67).';
    }

    if (!uploadedBy.trim() || uploadedBy.trim().length < 3) {
      newErrors.uploadedBy = 'Please provide an author name (at least 3 characters).';
    }

    if (file) {
      const isAccepted =
        ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type) ||
        /\.(pdf|ppt|pptx)$/i.test(file.name);
      if (!isAccepted) {
        newErrors.file = 'Only PDF, PPT and PPTX files can be catalogued.';
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
    if (!validateForm()) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);
    const tags = parsedTags.length > 0 ? parsedTags : ['StudyMaterial', 'Semester3'];

    setSaving(true);
    try {
      await updateResource(editResource.id, {
        title: title.trim(),
        subjectId,
        type,
        uploadedBy: uploadedBy.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        description: description.trim(),
        tags,
        replaceFile: file ?? undefined
      });
      closeEdit();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saving failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) closeEdit();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="ruled w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-overlay animate-fadeIn bg-paper"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-ink">
          <div className="min-w-0">
            <h2 id="edit-modal-title" className="text-lg font-extrabold text-ink leading-tight">
              Edit material
            </h2>
            <p className="text-xs text-ink-2 mt-0.5 truncate">
              {editResource.title} — attach a file only to replace the stored copy.
            </p>
          </div>
          <button onClick={closeEdit} className="btn btn-ghost px-2 shrink-0" aria-label="Close edit form" disabled={saving}>
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label htmlFor="edit-title" className="block font-semibold text-ink mb-1">
              Title <span className="text-alert" aria-hidden="true">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'edit-title-error' : undefined}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={`field w-full px-3.5 py-2.5 ${errors.title ? 'field-error' : ''}`}
            />
            <FieldError id="edit-title-error" message={errors.title} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-subject" className="block font-semibold text-ink mb-1">
                Subject
              </label>
              <select
                id="edit-subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
                }}
                className="field w-full px-3 py-2.5"
              >
                {subjectChoices.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.courseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-type" className="block font-semibold text-ink mb-1">
                Category
              </label>
              <select
                id="edit-type"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-author" className="block font-semibold text-ink mb-1">
                Uploader name
              </label>
              <input
                id="edit-author"
                type="text"
                aria-invalid={!!errors.uploadedBy}
                aria-describedby={errors.uploadedBy ? 'edit-author-error' : undefined}
                value={uploadedBy}
                onChange={(e) => {
                  setUploadedBy(e.target.value);
                  if (errors.uploadedBy) setErrors((prev) => ({ ...prev, uploadedBy: undefined }));
                }}
                className={`field w-full px-3 py-2.5 ${errors.uploadedBy ? 'field-error' : ''}`}
              />
              <FieldError id="edit-author-error" message={errors.uploadedBy} />
            </div>

            <div>
              <label htmlFor="edit-roll" className="block font-semibold text-ink mb-1">
                Roll / seat no
              </label>
              <input
                id="edit-roll"
                type="text"
                aria-invalid={!!errors.rollNumber}
                aria-describedby={errors.rollNumber ? 'edit-roll-error' : undefined}
                value={rollNumber}
                onChange={(e) => {
                  setRollNumber(e.target.value);
                  if (errors.rollNumber) setErrors((prev) => ({ ...prev, rollNumber: undefined }));
                }}
                className={`field w-full px-3 py-2.5 font-mono ${errors.rollNumber ? 'field-error' : ''}`}
              />
              <FieldError id="edit-roll-error" message={errors.rollNumber} />
            </div>
          </div>

          <div>
            <label htmlFor="edit-description" className="block font-semibold text-ink mb-1">
              Description &amp; key topics <span className="text-alert" aria-hidden="true">*</span>
            </label>
            <textarea
              id="edit-description"
              rows={3}
              aria-required="true"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'edit-description-error' : undefined}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={`field w-full px-3.5 py-2.5 resize-none ${errors.description ? 'field-error' : ''}`}
            />
            <FieldError id="edit-description-error" message={errors.description} />
          </div>

          <div>
            <label htmlFor="edit-tags" className="block font-semibold text-ink mb-1">
              Tags <span className="text-ink-3 font-normal">(comma-separated)</span>
            </label>
            <input
              id="edit-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="field w-full px-3.5 py-2.5"
            />
          </div>

          <div>
            <label htmlFor="edit-file" className="block font-semibold text-ink mb-1">
              Replace file (optional)
            </label>
            <input
              id="edit-file"
              type="file"
              accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              aria-invalid={!!errors.file}
              aria-describedby={errors.file ? 'edit-file-error' : undefined}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                if (errors.file) setErrors((prev) => ({ ...prev, file: undefined }));
              }}
              className={`field w-full px-3 py-2 file:mr-3 file:px-2 file:py-1 file:border file:border-ink file:bg-paper file:text-[11px] file:font-semibold file:text-ink ${
                errors.file ? 'field-error' : ''
              }`}
            />
            <FieldError id="edit-file-error" message={errors.file} />
            <p className="ruled-sunk px-3 py-2 mt-2 flex items-center gap-2 text-[11px] text-ink-2">
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {file ? (
                <span className="truncate text-ink">
                  <strong>{file.name}</strong> replaces the stored file and rebuilds the index.
                </span>
              ) : selectedSubject ? (
                <span>
                  Keeping the current stored file ({editResource.fileSize}) — the index refreshes on replace.
                </span>
              ) : null}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-rule flex items-center justify-end gap-3">
            <button type="button" onClick={closeEdit} className="btn btn-ghost px-5" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary px-6">
              <Pencil className="w-4 h-4" aria-hidden="true" />
              <span>{saving ? 'Saving changes…' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
