# Food System Survey Platform

**Live Demo:** [https://foodsystem-project.vercel.app](https://foodsystem-project.vercel.app)

**Source Code:** [https://github.com/MossinClue/foodsystem_project](https://github.com/MossinClue/foodsystem_project)

---

## Setup Instructions

No setup required — the application is already deployed live. Simply click the link above to access the working prototype.

---

## Assumptions

- **Public access** — No authentication required for this prototype. Anyone with the link can submit surveys and view the dashboard.
- **Excel file structure** — The sample Excel file columns roughly match the survey table schema. The import logic automatically maps common column names.
- **Modern browser** — Assumes users are on modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled.
- **Data volume** — Designed for hundreds to low thousands of responses. For larger datasets, pagination would be needed.

---

## Design Decisions

| Decision | Rationale |
|----------|----------|
| **Supabase** | PostgreSQL database with built-in REST API and real-time subscriptions. Eliminated need for a separate backend server while still providing a robust data layer. |
| **React + Vite** | Fast development experience with optimized production builds. Component architecture made it easy to separate concerns (survey form, dashboard, charts, filters). |
| **Tailwind CSS** | Utility-first styling allowed a professional, responsive UI without writing custom CSS. |
| **Real-time dashboard** | Supabase real-time subscriptions enable instant dashboard updates when new surveys are submitted — a user experience improvement beyond the basic requirements. |
| **Client-side Excel import** | SheetJS (xlsx) processes Excel files directly in the browser, simplifying the architecture by eliminating backend file handling. |
| **Drag-and-drop upload** | Provides a more modern, intuitive user experience for importing Excel files compared to standard file inputs. |
| **Export functionality** | Allows managers to download filtered survey data for offline analysis, reporting, or sharing with stakeholders. |

---

## Limitations

- **No authentication** — Anyone can submit surveys and view the dashboard. Acceptable for a prototype but would require login for production.
- **Frontend validation only** — No backend validation beyond Supabase database constraints.
- **Single table structure** — All data lives in one table. A normalized structure would be better for complex queries in production.
- **No pagination** — Dashboard loads all responses at once. Pagination or virtual scrolling would be needed for thousands of records.

---

## Possible Future Improvements

- **Authentication** — Add Supabase Auth to secure the dashboard and limit survey submissions
- **Date range filtering** — Allow managers to filter surveys by date to identify trends over time
- **Trend charts** — Add line charts showing satisfaction scores over time
- **Pagination** — Implement pagination to handle larger datasets
- **Email notifications** — Alert managers when survey volume spikes or thresholds are reached

---
