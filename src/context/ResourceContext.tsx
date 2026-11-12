import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { StudyResource, UserProfile, SubjectCategory, ResourceType, ActiveTab } from '../types';
import { INITIAL_RESOURCES } from '../data/initialResources';

interface ResourceContextType {
  resources: StudyResource[];
  userProfile: UserProfile;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSubject: SubjectCategory | 'All';
  setSelectedSubject: (subject: SubjectCategory | 'All') => void;
  selectedType: ResourceType | 'All';
  setSelectedType: (type: ResourceType | 'All') => void;
  filteredResources: StudyResource[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  incrementDownload: (id: string) => void;
  addResource: (newResource: Omit<StudyResource, 'id' | 'downloadCount' | 'uploadDate' | 'rating' | 'fileFormat' | 'semester'>) => void;
  deleteResource: (id: string) => void;
  resetToDefaults: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const STORAGE_KEYS = {
  RESOURCES: 'studysyncplus_resources_v3',
  PROFILE: 'studysyncplus_user_profile_v3'
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Tanmay Shinde',
  rollNumber: '67',
  studentId: '126BTCM2008',
  semester: 3,
  branch: 'Computer Engineering',
  college: 'Shah & Anchor Kutchhi Engineering College (SAKEC)',
  savedResourceIds: ['res-001', 'res-002'],
  studyStreakDays: 14
};

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [resources, setResources] = useState<StudyResource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESOURCES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading resources from localStorage', e);
    }
    return INITIAL_RESOURCES;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading profile from localStorage', e);
    }
    return DEFAULT_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectCategory | 'All'>('All');
  const [selectedType, setSelectedType] = useState<ResourceType | 'All'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));
    } catch (e) {
      console.error('Failed to sync resources to localStorage', e);
    }
  }, [resources]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
    } catch (e) {
      console.error('Failed to sync profile to localStorage', e);
    }
  }, [userProfile]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      const matchesType = selectedType === 'All' || item.type === selectedType;

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [resources, searchQuery, selectedSubject, selectedType]);

  const toggleBookmark = useCallback((id: string) => {
    setUserProfile((prev) => {
      const alreadySaved = prev.savedResourceIds.includes(id);
      const updatedSaved = alreadySaved
        ? prev.savedResourceIds.filter((item) => item !== id)
        : [...prev.savedResourceIds, id];
      
      showToast(alreadySaved ? 'Removed from saved bookmarks' : 'Added to saved bookmarks! ⭐');
      return {
        ...prev,
        savedResourceIds: updatedSaved
      };
    });
  }, [showToast]);

  const isBookmarked = useCallback((id: string) => {
    return userProfile.savedResourceIds.includes(id);
  }, [userProfile.savedResourceIds]);

  const incrementDownload = useCallback((id: string) => {
    setResources((prev) =>
      prev.map((res) => (res.id === id ? { ...res, downloadCount: res.downloadCount + 1 } : res))
    );
  }, []);

  const addResource = useCallback(
    (newResource: Omit<StudyResource, 'id' | 'downloadCount' | 'uploadDate' | 'rating' | 'fileFormat' | 'semester'>) => {
      const created: StudyResource = {
        ...newResource,
        id: `res-${Date.now()}`,
        semester: 3,
        fileFormat: 'PDF',
        downloadCount: 0,
        uploadDate: new Date().toISOString().split('T')[0],
        rating: 5.0,
        isUserUploaded: true
      };

      setResources((prev) => [created, ...prev]);
      showToast(`PDF Resource "${created.title.slice(0, 24)}..." published!`);
    },
    [showToast]
  );

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((res) => res.id !== id));
    setUserProfile((prev) => ({
      ...prev,
      savedResourceIds: prev.savedResourceIds.filter((item) => item !== id)
    }));
    showToast('Resource removed successfully');
  }, [showToast]);

  const resetToDefaults = useCallback(() => {
    setResources(INITIAL_RESOURCES);
    setUserProfile(DEFAULT_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.RESOURCES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    showToast('Reset StudySyncPlus to official Semester 3 PDF syllabus data.');
  }, [showToast]);

  const value = useMemo(
    () => ({
      resources,
      userProfile,
      activeTab,
      setActiveTab,
      searchQuery,
      setSearchQuery,
      selectedSubject,
      setSelectedSubject,
      selectedType,
      setSelectedType,
      filteredResources,
      toggleBookmark,
      isBookmarked,
      incrementDownload,
      addResource,
      deleteResource,
      resetToDefaults,
      toastMessage,
      showToast
    }),
    [
      resources,
      userProfile,
      activeTab,
      searchQuery,
      selectedSubject,
      selectedType,
      filteredResources,
      toggleBookmark,
      isBookmarked,
      incrementDownload,
      addResource,
      deleteResource,
      resetToDefaults,
      toastMessage,
      showToast
    ]
  );

  return <ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>;
};

export const useResources = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
};
