# 🎓 StudySync — Student Resource Sharing Hub

> **A Claymorphic Modern Web Application for Academic Resource Collaboration & Visual Analytics**  
> Developed for **Shah & Anchor Kutchhi Engineering College (SAKEC)**  
> **Course:** Web Computing & Modern Frameworks

---

## 👥 Student Development Team
| Roll No. | Student ID | Full Name | GitHub Profile |
|:---:|:---:|:---:|:---:|
| **67** | `126BTCM2008` | **Tanmay Shinde** | [@TanmayNileshShinde](https://github.com/TanmayNileshShinde) |
| **68** | `126BTCM2009` | **Aditya Shah** | Contributor / Peer Author |

---

## 🌟 Live Demo & Deployment
- 🌐 **Live Website (GitHub Pages):** [https://TanmayNileshShinde.github.io/studysync/](https://TanmayNileshShinde.github.io/studysync/)
- 💻 **Source Repository:** [https://github.com/TanmayNileshShinde/studysync](https://github.com/TanmayNileshShinde/studysync)

---

## 🎨 Claymorphism UI Design System
StudySync is styled using a modern **Claymorphic** aesthetic:
- **Soft 3D Tactile Elements:** Rounded squircles (`rounded-3xl`), dual-tone drop shadows, and subtle inner inset lighting highlights.
- **Friendly Pastel Palette:** Clean slate typography against soft lavender, mint, peach, and indigo accent gradients.
- **Micro-Interactions:** Smooth button lift animations, real-time tag pills, and celebratory confetti upon downloads and resource uploads.

---

## 📋 Comprehensive Syllabus & Course Outcome (CO) Mapping

This project was built to comprehensively fulfill all four curriculum modules and course outcomes:

### 🧩 Module 1: Advanced JavaScript Concepts (CO1)
- **1.1 ES6 Features:** Built with arrow functions, `let`/`const`, template literals, array/object destructuring, and spread/rest operators throughout the codebase.
- **1.2 DOM Manipulation:** Real-time modal portals, dynamic card rendering, toast message dispatch, and dynamic text-file Blob generator.
- **1.3 Events & Form Validation:** Live regex-validated resource upload modal checking title length, roll number patterns (`126BTCM2008`), and file size thresholds.
- **1.4 Client Storage (`localStorage` API):** Persistent client-side storage for resources, saved bookmarks, and user profiles across browser sessions.
- **1.5 Error Handling & Debugging:** Resilient `try...catch` blocks with an interactive intentional error injection simulator in the Async Lab tab.

### 🌐 Module 2: Client-Server Communication (CO2)
- **2.1 JSON Format:** Clean JSON schema definitions with TypeScript interfaces for resource metadata and analytics payloads.
- **2.2 Fetch API:** Real live REST API integration connecting to the OpenLibrary search endpoint for academic book references.
- **2.3 AJAX Dynamic Updates:** Instant non-blocking search and multi-criteria filtering without page reloads.
- **2.4 Asynchronous Programming:** Modern `async`/`await` and `Promise` constructs handling simulated network latency.
- **2.5 Promise Chaining:** Multi-stage sequential `.then()` pipeline demonstrating asynchronous request processing.
- **2.6 RESTful Integration:** Standard HTTP methods, query parameter encoding, and response status validation.
- **2.7 CORS Handling:** Documentation and real-world architectural handling of Cross-Origin Resource Sharing.

### ⚛️ Module 3: Front-End Frameworks and UI (CO3, CO4)
- **3.1 & 3.2 Responsive Grid:** Mobile-first responsive grid system implementing Bootstrap 5 layout principles.
- **3.3 React.js Ecosystem:** Modular JSX components, strictly typed props, and React 19 functional hooks (`useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`).
- **3.4 Single Page Application (SPA):** Seamless tab-based routing between Library, Analytics, Async Lab, and Syllabus Viva tabs.
- **3.5 React Context API:** Global state centralized in `ResourceContext` managing resources, bookmarks, filters, and downloads.

### 📊 Module 4: Data Visualization and Deployment (CO5, CO6)
- **4.1 & 4.2 Interactive Chart.js Visualizations:**
  - **Bar Chart:** Student resource downloads categorized across core academic subjects.
  - **Spline Line Chart:** Weekly study activity trends and resource access peaks.
  - **Doughnut Chart:** Resource distribution by category (Lecture Notes, PYQs, Lab Manuals, Cheat Sheets).
- **4.3 GitHub Pages Deployment:** Production build configured with relative paths (`base: './'`) and `gh-pages` automated deployment.
- **4.4 Web Hosting Essentials:** Production minification, asset hash cache-busting, and sub-second loading speeds.

---

## 🛠️ Technology Stack
- **Core Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS with custom Claymorphism utility shadows
- **Charts & Telemetry:** Chart.js & `react-chartjs-2`
- **Iconography:** Lucide React
- **Animations:** Canvas Confetti

---

## 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TanmayNileshShinde/studysync.git
   cd studysync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```

---

## 📄 License
Created for academic evaluation at **Shah & Anchor Kutchhi Engineering College (SAKEC)**. Open-source under the MIT License.
