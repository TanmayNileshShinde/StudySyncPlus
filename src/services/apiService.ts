import { StudyResource } from '../types';

export interface OpenLibraryBook {
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  key: string;
}

/**
 * Service demonstrating Module 2 (CO2) Client-Server Communication:
 * - Fetch API
 * - Asynchronous programming (Promises, async/await)
 * - Promise chaining
 * - REST API integration
 * - Error handling & CORS
 */
class ApiService {
  /**
   * Real live REST API request to OpenLibrary public search endpoint.
   * Demonstrates: Fetch API, async/await, JSON parsing, error handling.
   */
  async searchExternalAcademicBooks(query: string, limit: number = 4): Promise<OpenLibraryBook[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      return (data.docs || []).map((doc: any) => ({
        title: doc.title,
        author_name: doc.author_name || ['Unknown Academic'],
        first_publish_year: doc.first_publish_year || 2020,
        isbn: doc.isbn || [],
        key: doc.key
      }));
    } catch (error: any) {
      console.warn('External OpenLibrary API fallback activated:', error.message);
      // Fallback in case of offline/network block
      return [
        {
          title: `${query} — Computer Science Reference Manual`,
          author_name: ['Prof. T. Shinde', 'Prof. A. Shah'],
          first_publish_year: 2025,
          key: 'local-ref-1'
        },
        {
          title: `Modern Principles of ${query}`,
          author_name: ['Academic Press & Research Group'],
          first_publish_year: 2024,
          key: 'local-ref-2'
        }
      ];
    }
  }

  /**
   * Demonstrates Promise chaining (CO2.5):
   * Step 1: Validate payload
   * Step 2: Simulate network transmission latency (500ms)
   * Step 3: Parse response JSON
   * Step 4: Update telemetry
   */
  simulatePromiseChaining(resourceTitle: string): Promise<string> {
    return new Promise<string>((resolve) => {
      // Step 1: Initiating request
      setTimeout(() => {
        resolve(`[Request Sent] Handshake initiated for "${resourceTitle}"`);
      }, 300);
    })
      .then((status1) => {
        // Step 2: Server acknowledgement
        return new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve(`${status1} ➔ [200 OK] Server acknowledged payload`);
          }, 300);
        });
      })
      .then((status2) => {
        // Step 3: Storage persistence & response packaging
        return new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve(`${status2} ➔ [Success] Resource indexed into StudySyncPlus database.`);
          }, 300);
        });
      })
      .catch((error) => {
        console.error('Promise chaining caught error:', error);
        return `Failed at pipeline: ${error.message}`;
      });
  }

  /**
   * Demonstrates intentional error handling & recovery (CO1.5, CO2.2)
   */
  async simulateNetworkError(): Promise<never> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw new Error('ERR_CONNECTION_REFUSED: Simulated 503 Service Unavailable for error handling viva demonstration.');
  }

  /**
   * Builds the summary-sheet text for legacy seeded rows (no stored file).
   * Used by the single download fallback and the ZIP bulk export.
   */
  generateResourceSummaryText(resource: StudyResource): string {
    return `==========================================================
STUDYSYNCPLUS — SEMESTER 3 STUDENT RESOURCE SHARING HUB
Shah & Anchor Kutchhi Engineering College (SAKEC)
Course Project: Web Computing & Modern Frameworks
==========================================================

Title: ${resource.title}
Course Code: ${resource.courseCode}
Subject: ${resource.subjectName}
Semester: ${resource.semester}
Resource Type: ${resource.type}
File Format: ${resource.fileFormat}
Size: ${resource.fileSize}
Uploaded By: ${resource.uploadedBy} (Roll No: ${resource.rollNumber})
Upload Date: ${resource.uploadDate}
Community Rating: ${resource.rating} / 5.0 ⭐
Total Downloads: ${resource.downloadCount + 1}

SUMMARY / DESCRIPTION:
${resource.description}

TAGS: ${resource.tags.join(', ')}

==========================================================
Verified Academic Material | StudySyncPlus Academic Portal
Developed by:
  - Tanmay Shinde (126BTCM2008 | Roll 67)
  - Aditya Shah   (126BTCM2009 | Roll 68)
==========================================================
`;
  }

  /**
   * Generates a downloadable dummy file (Blob URL) to demonstrate browser DOM interaction (CO1.2)
   */
  generateAndDownloadResource(resource: StudyResource): void {
    const content = this.generateResourceSummaryText(resource);

    const blob = new Blob([content], { type: 'application/pdf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `${resource.title.replace(/[^a-zA-Z0-9]/g, '_')}_StudySyncPlus.pdf`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }
}

export const apiService = new ApiService();
