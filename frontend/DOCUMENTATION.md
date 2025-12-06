# HLP Referral Case Management System - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [User Roles & Permissions](#user-roles--permissions)
- [Core Features Guide](#core-features-guide)
- [Data Management](#data-management)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The HLP (Housing, Land and Property) Referral Case Management System is a comprehensive web application designed to manage referral cases for housing, land, and property rights. The system supports multi-user access with role-based permissions, case tracking, document management, and data import/export capabilities.

### Purpose
- Track and manage beneficiary cases related to housing, land, and property rights
- Support multiple staff members with different access levels
- Import data from KoboToolbox surveys
- Generate reports and statistics
- Export case data for analysis

### Target Users
- **Administrators**: Full system access, user management
- **Internal Staff**: Case management, data entry
- **External Partners**: Limited access to assigned cases

---

## Release Notes (Most recent changes)

- Date: 2025-12-06 — Minor release
- Resolve Now (UI): Added a `Resolve Now` button and flow in the Case Details UI which guarantees a `resolve_comment` is captured and persisted before the case status updates to a resolved state (Completed/Closed). The Save button will also validate that a resolve comment is present when users change a case to a resolved state.
- Import robustness: The backend import endpoint (`/api/import`) now provides better validation and error messages for header and row parsing. The frontend gracefully falls back to per-row creation or local-only import if the server import fails. Local fallback rows are marked with `created_at` timestamps so `Age (days)` metrics display correctly for all imports.
- Import dedup: Duplicate detection is performed both server-side (using JSON path queries when available) and client-side. For DB dialects that lack JSON path support (SQLite development setups), the server falls back to scanning existing `raw` fields in Python to detect duplicates. Import jobs also store per-row status (pending, skipped, success, failed).
- Data & Age/SLA: The Cases list shows `Age (days)` and an SLA indicator based on the submission date / created_at. Local imports now include `created_at`, and backend updates set `updated_at` and `completed_at` (where applicable).
- Delete-case fixes: Deleting a case now nullifies import rows and deletes comments before deleting the case, preventing database FK constraint errors. Permission normalization (`role` vs `roles` string/list handling) was fixed to avoid 403 unauthorized errors for valid users.
- Case detail UI changes: `note`-typed fields are hidden in case detail cards, the Comments panel was moved up for visibility, and the 'Submission Date' column showing on the Cases list is now `Last Update` (updated_at-based).
- Search: Beneficiary search now uses canonical keys (`beneficiary_name`, `beneficiary_family_name`, etc.) with backward-compatible fallbacks for legacy or prefixed keys (e.g., `benef_*`).
- Favicon/title/footer: Planned changes were discussed; favicon and page title were not updated in this release and remain pending; the footer update is also pending.

These are primarily functional and UX improvements; if you need me to split this into separate release notes by subsystem (backend/frontend), I can do that as a follow-up.


## Features

### 🔐 Authentication & Authorization
- **Three User Roles**: Admin, Internal, External
- **Secure Login**: Session-based authentication with localStorage persistence
- **Role-Based Access Control (RBAC)**: Granular permissions per role
- **Account Management**: Users can update email and password

### 📋 Case Management
- **Comprehensive Case Details**: Multi-section forms covering beneficiary profile, property status, legal documentation
- **Case Assignment**: Assign cases to staff members
- **Case Filtering**: Role-based case visibility
- **Search Functionality**: Search by case ID, beneficiary name, father/mother name, birth date
- **Comments System**: Add notes and updates to cases
  - **Age (days) + SLA**: The case list now shows an 'Age (days)' column which displays the number of days since submission and a small SLA progress bar below it (green->orange->red->black color thresholds).

### 📊 Data & Analytics
- **Statistics Dashboard**: Visual charts and metrics
- **Case Status Tracking**: Monitor pending, in-progress, and completed cases
- **Export Capabilities**: Download data in JSON format
- **PDF Export**: Generate PDF reports of case details

### 📥 Data Import
- **XLSX Import**: Import data from Excel/KoboToolbox exports
  - **Import Robustness**: The backend `/api/import` endpoint provides better error messages for header and row parsing failures, and the frontend now gracefully falls back to per-row creation or a local-only import if a server import fails. The frontend will mark local fallback rows with `created_at` timestamps so the `Age (days)` metric is still computed in list views.
### UI Updates (Notes & Comments)
- **Notes field handling**: All `note`-typed fields are now hidden from the Case Detail card views (they are still displayed as the 'Notes' column in case lists). This reduces verbosity in detail cards while keeping the list title and export-friendly columns intact. Note that `note` type fields remain available in the `raw` payload for admin users.
- **Comments placement**: The Comments panel was moved from the bottom of the case detail page to just under the primary metadata (Case Number / Status / Assigned Staff / Category grid). This makes comments easier to find when reviewing case details.
 - **Category**: The Category column in the cases table and the case detail header is now backfilled from form fields (priority order: `law_followup5`, `law_followup4`, `law_followup3`, `law_followup1`, `eng_followup1`). This means server-imported cases and webhook/kobo imports that include these fields will display Category correctly.
 - **Submission Date / Age**: Frontend will try to resolve the canonical submission timestamp in the following order: `caseRecord.submissionDate`, `raw._submission_time`, `raw.submissiontime`, `formFields.today`, `raw.submissiondate`, `raw.end`, `raw.start`, `raw.created_at`.
   - This provides robust fallbacks for different payloads and ensures the Age (days) calculation works for cases submitted both locally and via webhook/n8n.
  - **Resolve comment behavior**: When a user changes a case's status to a resolved state (`Completed` or `Closed`), the UI ensures a resolve comment is created and sent to the server as `resolve_comment` in the case update request so backend validation passes and a persistent comment is recorded for the resolution action.

### Sensitive Fields & Admin-only Visibility
- **Admin-only sensitive fields**: Fields that may contain PII such as `id_card_nu`, `family_card_nu`, and `passport_nu_001` are **now hidden from non-admin users** in API responses and UI rendering. These fields remain present in the data store and are visible in the UI for admin users only. This change affects `GET /cases`, `GET /cases/{id}`, and `GET /import/jobs/{job_id}`.
- **Back-end sanitization**: The server sanitizes `raw` fields for non-admin users server-side to ensure sensitive values are not inadvertently returned to non-admin clients.

### Import: Server Fallback & CORS
- **Server fallback**: The frontend will attempt to import XLSX files as a single server job. If `/api/import` fails, the UI falls back to per-row creates and/or local-only import and notifies the user. The UI also now provides clearer messages to indicate whether the error was due to authentication/permission, file size, or inability to reach the server.
- **CORS & credentials**: If the frontend calls the backend with `credentials: 'include'` (cookies or credentials), the server must echo the `Origin` in `Access-Control-Allow-Origin` instead of returning `'*'` as the wildcard. The backend now echoes `Origin` (when allowed by `CORS_ORIGINS`) to support credentialed requests and avoid browser blocking.

- **Field Mapping**: Automatic mapping of survey fields to system fields
- **Batch Import**: Process multiple cases at once

### 🎨 User Interface
- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Ant Design Components**: Modern, accessible UI
- **Multilingual Support**: Arabic and English labels

---

## Technology Stack

### Frontend
- **React 19.2.0**: UI framework
- **React Router DOM 7.10.0**: Client-side routing
- **Ant Design 6.0.1**: UI component library
- **Vite 7.2.5**: Build tool and dev server
- **html2canvas + jsPDF**: PDF generation
- **xlsx**: Excel file processing

### State Management
- **React Context API**: Global state management
  - `AuthContext`: User authentication and authorization
  - `ThemeContext`: Dark/light mode
  - `CasesContext`: Case data and operations

### Storage
- **localStorage**: Client-side data persistence
  - User authentication state
  - Case data
  - User list
  - Theme preference

---

## Project Structure

```
frontend/
├── public/
│   └── logo.png                    # Application logo
├── src/
│   ├── api/                        # API layer (prepared for backend integration)
│   │   ├── http.js                 # HTTP client with authentication
│   │   └── index.js                # API endpoint definitions
│   ├── assets/                     # Static assets
│   ├── components/                 # Reusable components
│   │   ├── DashboardLayout.jsx     # Main layout with sidebar
│   │   └── DashboardLayout.css     # Layout styles
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.jsx         # Authentication & user management
│   │   ├── CasesContext.jsx        # Case data & operations
│   │   └── ThemeContext.jsx        # Theme management
│   ├── data/                       # Static data and metadata
│   │   ├── formMetadata.js         # Survey form field definitions
│   │   └── selectOptions.generated.json  # Dropdown options
│   ├── pages/                      # Route components
│   │   ├── Login.jsx               # Login page
│   │   ├── CaseList.jsx            # Case list with filtering
│   │   ├── CaseDetails.jsx         # Detailed case view
│   │   ├── Search.jsx              # Advanced search
│   │   ├── Statistics.jsx          # Analytics dashboard
│   │   ├── Data.jsx                # Data management
│   │   ├── XLSXImport.jsx          # XLSX import interface
│   │   ├── Admin.jsx               # User management (admin only)
│   │   ├── AccountSettings.jsx     # User profile settings
│   │   ├── Assignment.jsx          # Case assignment
│   │   └── Comments.jsx            # Case comments
│   ├── App.jsx                     # Main app component with routing
│   ├── App.css                     # Global styles
│   ├── main.jsx                    # Application entry point
│   └── index.css                   # Root styles
├── package.json                    # Dependencies and scripts
├── vite.config.js                  # Vite configuration
├── eslint.config.js                # ESLint configuration
├── index.html                      # HTML entry point
├── Dockerfile                      # Docker container configuration
└── README.md                       # Basic project info
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control (optional)

### Step 1: Clone or Download the Project
```bash
# If using Git
git clone <repository-url>
cd frontend

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages:
- React and React DOM
- React Router
- Ant Design
- Vite
- XLSX processing library
- PDF generation libraries
- Development tools (ESLint, etc.)

### Step 3: Start Development Server
```bash
npm run dev
```

The application will start on `http://localhost:5173`

### Step 4: Access the Application
Open your browser and navigate to `http://localhost:5173`

**Default Login Credentials:**
- **Admin**: `admin` / `admin123`
- **Internal**: `internal` / `internal123`
- **External**: `external` / `external123`

---

## Known UI Issues & Fixes

If you notice layout problems when resizing the browser window (especially on the Data and User Management pages), try the following:

- Tables: The table components now use a horizontal scroll fallback when the viewport is narrow. If a table column layout appears clipped or fixed, confirm your viewport width allows the table a horizontal scrollbar. The `.table-wrapper` element has been updated to support overflow-x: auto so you can scroll horizontally if a table's columns exceed the visible width.
- Vertical breadcrumb/page titles: If a long Title appears oriented vertically on small screens, this was caused by forced wrapping. The CSS now ensures card panel headings use `writing-mode: horizontal-tb` and `white-space: normal`. If you still encounter this problem, try clearing the browser cache (to ensure you have the latest CSS) and inspect the element using browser devtools to confirm there are no local overrides.
- Navigation inside tables: Tables are now scrollable horizontally and support selectable rows; if table rows are not clickable, ensure the `onRow` handler is present on that page's table (some pages like `Cases` list are clickable by default).

- Fixed: Frontend build failed due to a missing component declaration in `CaseList.jsx` (Esbuild error: "Unexpected '}'"). The fix was to wrap hook usage and component logic inside `const CaseList = () => { ... }` and ensure the file exports the component correctly. Re-run `npm run build` to validate.

- UI updates: Replaced "Submission Date" with "Last Update" in the Cases list, removed the "Follow-up" filter and Follow-up column from lists and filters, and replaced the "Notes" column in the Data page with an "Age (days)" column and SLA indicator. These changes also include a backend _updated_at_ field to track the last activity.
- Deletion fix: When deleting cases from the Data page, the Cases list is refreshed and the UI now shows a summary of server deletions and failures to ensure visibility if server-side deletion could not be performed.
- Import dedup: Client- and server-side de-duplication now prevents upload of duplicate cases by matching common identifiers (`case_id`, `_id`, `_uuid`, `caseNumber`). Duplicate rows are marked as 'skipped' on import jobs.

How to test:
1. Start the frontend dev server: `npm run dev`.
2. Log in as admin and navigate to Data and User Management pages.
3. Resize the developer tools or browser window to a narrow width and verify the table displays a horizontal scrollbar and the panel heading remains horizontally oriented.

Additional testing for new UX/API changes:
4. Resolve Now (UI):
  - Set a case's status to `Completed` or `Closed` using the Case Details page.
  - Attempt to click `Save` without a comment — the UI should show an error explaining a resolve comment is required.
  - Add a resolve comment and either click `Resolve Now` or Save; verify the server now shows a `resolve_comment` attached to the update and a comment appears in the case timeline.
5. Import / Import job behavior:
  - Try uploading a KoboToolbox XLSX that includes existing `case_id`/`caseNumber` values; duplicates should be skipped and marked as `skipped` in the import job results.
  - Temporarily turn off the backend import endpoint or simulate a server failure; the frontend should fall back to per-row creates (or local-only import) and mark created rows with `created_at` so Age (days) displays correctly.
6. Deletion and Permissions:
  - Delete a case from the Data page as an admin; confirm the case is removed and comments/import rows are cleaned up server-side.
  - Try deleting a case with a non-admin user and note correct permission behavior (403 if unauthorized).


If the problem persists: capture a screenshot and your browser name/version to help diagnose further.


## Configuration

### Environment Variables
Create a `.env` file in the root directory for environment-specific settings:

```env
# API Base URL (for future backend integration)
VITE_API_URL=http://localhost:5000/api

# Application Name
VITE_APP_NAME=HLP Referral System

# Maximum File Size for Uploads (in MB)
VITE_MAX_FILE_SIZE=10
```

### Vite Configuration
The `vite.config.js` file contains build and dev server settings:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

---

## User Roles & Permissions

### Admin Role
**Full System Access**

✅ **Permissions:**
- View all cases (regardless of assignment)
- View all field data (including hidden fields)
- Create, edit, and delete cases
- Assign cases to staff
- Access user management page
- Add, edit, and delete users
- Access all statistics and reports
- Import and export data
- Access account settings

🔒 **Restrictions:**
- Cannot delete own account

### Internal Role
**Case Management Access**

✅ **Permissions:**
- View all cases (regardless of assignment)
- Create and edit cases
- Assign cases to staff
- Add comments to cases
- Access statistics and reports
- Import data
- Export assigned cases
- Access account settings

🔒 **Restrictions:**
- Cannot view hidden survey fields (sensitive data)
- Cannot access user management
- Cannot add, edit, or delete users

### External Role
**Limited Case Access**

✅ **Permissions:**
- View only assigned cases
- Add comments to assigned cases
- View statistics for assigned cases
- Export assigned cases
- Access account settings

🔒 **Restrictions:**
- Cannot view hidden survey fields
- Cannot view unassigned cases
- Cannot create or edit cases
- Cannot assign cases
- Cannot access user management
- Cannot import data

### Hidden Fields
The following fields are **only visible to Admin users**:
- `username` (system)
- `deviceid` (system)
- `logo` (form metadata)
- `case_id_note` (internal note)
- `case_id_store` (internal ID)
- `id_card_nu` (national ID number)
- `family_card_nu` (family card number)
- `passport_nu_001` (passport number)
- `fam_docs_other` (document details)
- All `note` type fields (section headers)
- `legal_state12_1` (document photo)

---

## Core Features Guide

### 1. Login & Authentication

**Location:** `/login`

**Steps:**
1. Enter username and password
2. Click "Sign In"
3. System validates credentials
4. On success, redirected to case list

**Features:**
- Session persistence (stays logged in after refresh)
- Error messages for invalid credentials
- Automatic redirect if already logged in

### 2. Case List

**Location:** `/cases`

**Features:**
- Paginated table of cases
- Columns: Case ID, Beneficiary Name, Status, Assigned Staff, Date
- Click row to view details
- Role-based filtering (admins/internal see all, external see assigned only)

**Actions:**
- Search cases (via search icon)
- View case details
- Filter by status

### 3. Case Details

**Location:** `/case/:id`

**Features:**
- Complete case information organized in sections:
  - Session Metadata
  - Beneficiary Profile
  - Identification Documents
  - Contact & Access
  - Family Roster
  - Owner Legal Status
  - Supporting Documents
  - Official Legal State
  - Property Condition
  - Inheritance Information
  - Special Laws
  - Case Closure & Referral

**Actions:**
- Export to PDF
- Add comments
- Edit comments
- Delete comments
- Back to list

**Notes on Family Roster data source:**

- The family roster table shown in the case details is populated using the following sources (in priority order):
  1. `formFields.family` — a canonical array of family member objects (preferred).
  2. `raw.family` — an array structure present on older or webhook-wrapped payloads.
  3. Repeated grouped fields from Kobo/ODK that follow the naming pattern `group_fj2tt69_partnernu1_<slot>_<field>` — the UI will parse groups like `group_fj2tt69_partnernu1_7_1_partner_name`, `group_fj2tt69_partnernu1_7_1_partner_relation1`, `group_fj2tt69_partnernu1_7_1_partner_govreg`, `group_fj2tt69_partnernu1_7_1_partner_lastname`, `group_fj2tt69_partnernu1_7_1_partner`, and `group_fj2tt69_partnernu1_7_1_partner_nationality` into the roster table.

**Display order note:**

- The roster rows are rendered according to the Kobo group slot mapping and the expected ordering for this survey. The UI sorts cases into the order: `7_1`, `5_1`, `3_1`, `2_1`, `1`, `6_1`, `4_1` where those slot names come from the Kobo group suffixes such as `partnernu1_7_1`.

> Tip: If you're using n8n, include a `MoveBodyIds` step or promote `formFields` from nested `raw.body` to top-level `raw.formFields` before sending the case to the API; the backend includes migration helper and promotion logic to allow for either shape.

**Dev debugging tip:**

- When running the frontend in development mode, the console logs a debug message when grouped roster fields are parsed. Look for a console entry like: `backfillFormFields: parsed roster slots` which shows the discovered slots and the parsed roster array length and objects (handy for diagnosing why a table is empty).

**Source behavior note**

- Cases created via XLSX file import are marked with `source: file` and the UI will show roster values as present in the file (no select option label mapping is applied).
- Cases created from backend/Kobo/n8n flows often carry Kobo identifiers like `kobo_case_id` and are marked `source: kobo`. UI will format select option codes into labels for those cases (where metadata is available).

### 4. Search

**Location:** `/search`

**Search Types:**
1. **By Case ID**: Enter exact case ID
2. **By Beneficiary Details**:
   - First Name
   - Last Name
   - Father's Name
   - Mother's Name
   - Birth Date

**Features:**
- Real-time search
- Results table with matching cases
- Click to view case details

### 5. Statistics

**Location:** `/statistics`

**Metrics:**
- Total Cases
- Assigned Cases
- Unassigned Cases
- Status Breakdown (Pending, In Progress, Completed, etc.)
- Assignment by Staff Member
- Cases by Work Location

**Visualizations:**
- Progress bars
- Colored statistics cards
- Percentage displays

**Export:**
- Export as PDF
- Export as Word document

### 6. Data Management

**Location:** `/data`

**Features:**
- **Upload XLSX**: Import cases from Excel files
- **Download All**: Export all cases as JSON
- **Download Selected**: Select specific cases to export
- **Delete Selected**: Remove multiple cases at once

**Table Columns:**
- Case ID
- Beneficiary Name
- Assigned Staff
- Status
- Submission Date

**Row Selection:**
- Checkbox selection
- Select all option
- Bulk operations

### 7. User Management (Admin Only)

**Location:** `/admin`

**Features:**
- User table with columns:
  - Name
  - Username
  - Email
  - Role
  - Actions

**Operations:**
- **Add User**: Create new user accounts
  - Required: Name, Username, Email, Password, Role
  - Auto-generate secure passwords
- **Edit User**: Update user information
  - Change name, email, role
  - Reset password
- **Delete User**: Remove user accounts
  - Cannot delete own account
  - Confirmation dialog

**Roles Available:**
- Admin
- Internal
- External

### 8. Account Settings

**Location:** `/settings`

**Features:**
- View account information (read-only):
  - Name
  - Username
- Update email address
- Change password:
  - Enter new password
  - Confirm new password
  - Validation for matching passwords

**Validations:**
- Email format validation
- Password confirmation match
- Required field validation

### 9. Theme Toggle

**Location:** Header (all pages)

**Features:**
- Sun icon for dark mode
- Moon icon for light mode
- Persistent preference (saved in localStorage)
- Smooth transition between themes

**Dark Mode Colors:**
- Background: Dark grays (#0a0a0a, #1a1a1a)
- Accent: Blue tones (#1e3a5f, #2a4d7c)
- Text: Light colors for readability
- Table headers: Dark blue-gray (#1a2332)

### 10. XLSX Import

**Location:** `/import`

**Supported Format:**
- KoboToolbox export format
- Excel files (.xlsx)

**Import Process:**
1. Click "Upload XLSX"
2. Select file from computer
3. System processes and maps fields
4. Cases automatically created
5. Success message displayed

**Field Mapping:**
- Automatic mapping based on `formMetadata.js`
- Handles multiple field name variations (aliases)
- Normalizes data formats
- Generates unique case IDs

---

## Data Management

### Case Data Structure

Each case contains:

```javascript
{
  key: 'unique-id',
  recordId: 'UPL-2025-1234',
  submissionDate: '2025-12-03T10:30:00.000Z',
  assignedStaff: 'Admin User',
  status: 'Pending',
  
  // Session metadata
  start: '2025-12-03T09:00:00',
  end: '2025-12-03T10:30:00',
  staff_name: 'John Doe',
  work_location: 'Damascus',
  
  // Beneficiary profile
  beneficiary_name: 'Ahmad',
  beneficiary_last_name: 'Hassan',
  beneficiary_father: 'Mohammed',
  beneficiary_mother: 'Fatima',
  beneficiary_birth_date: '1980-05-15',
  beneficiary_birth_place: 'Damascus',
  ben_gender: 'male',
  beneficiary_civil_status: 'married',
  
  // ... additional fields from formMetadata.js
  
  // Family members (array)
  familyMembers: [
    {
      relation: 'spouse',
      govreg: 'yes',
      name: 'Sara',
      lastName: 'Ahmad',
      birthDate: '1985-03-20',
      nationality: 'Syrian'
    }
  ],
  
  // Comments (array)
  comments: [
    {
      id: 'comment-1',
      text: 'Initial assessment completed',
      author: 'Admin User',
      timestamp: '2025-12-03T11:00:00.000Z'
    }
  ]
}
```

### Data Storage
Note: The XLSX Import page has been removed. Data can be managed via the `Data` page and exports (JSON/XLSX). Future import workflows may be handled via backend or automation tools.
localStorage.setItem('cases', JSON.stringify(casesArray))
localStorage.setItem('users', JSON.stringify(usersArray))
│   │   ├── Data.jsx                # Data management & exports
localStorage.setItem('theme', 'dark' | 'light')
### 10. Data Management
Use the `Data` page to review processed datasets and export case data in JSON and XLSX formats. Import functionality has been removed from the UI.
// Import endpoint removed from UI; backend-only workflows may use server-side import endpoints if implemented
// Import verification removed; focus on export and data review
- Single browser only
#### 5. Data Export Issues
If exporting data fails:
- Ensure there are cases selected (for selected export)
- Try exporting JSON to confirm dataset integrity
- Check browser download permissions
- Verify that the XLSX library is present in `package.json`
// XLSX import removed
```javascript
// Configure base URL
const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

// Available methods
fetchCases(params)
fetchCaseDetails(id)
assignCase(id, user, ability)
fetchComments(caseId)
addComment(caseId, text)
importXLSX(file)
```

**Required Backend Endpoints:**
- `GET /api/cases` - List cases with filtering
- `GET /api/cases/:id` - Get case details
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case
- `POST /api/cases/:id/assign` - Assign case
- `GET /api/cases/:id/comments` - Get comments
- `POST /api/cases/:id/comments` - Add comment
- `POST /api/import` - Import XLSX data
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

---

## Deployment

### Option 1: Static Hosting (Recommended for Current Setup)

**Build for Production:**
```bash
npm run build
```

This creates a `dist/` folder with optimized static files.

**Deploy to Netlify:**
1. Create account at [netlify.com](https://netlify.com)
2. Connect your Git repository or drag & drop `dist` folder
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy

**Deploy to Vercel:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Access your URL

**Deploy to GitHub Pages:**
1. Update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ... other config
})
```
2. Build: `npm run build`
3. Push `dist` to `gh-pages` branch

### Option 2: Docker Deployment

**Build Docker Image:**
```bash
docker build -t hlp-referral-system .
```

**Run Container:**
```bash
docker run -p 80:80 hlp-referral-system
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://api:5000/api
  
  # Add backend service here in future
  # api:
  #   image: your-backend-image
  #   ports:
  #     - "5000:5000"
```

### Option 3: Traditional Web Server

**Using Nginx:**
1. Build: `npm run build`
2. Copy `dist/*` to `/var/www/html/`
3. Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

    ## n8n Integration (Kobo → Referral System) — Minimal Guide

    This section contains a compact, ready-to-use n8n workflow and code snippets to forward KoboToolbox submissions to the Referral System at https://api.bessar.work/api. It uses `_uuid` as the dedupe key and includes steps to add a duplicate comment or create a case.

    Prerequisites:
    - An n8n instance with access to the internet (able to reach https://api.bessar.work).
    - A service account (internal role) for n8n. Store the JWT token in a credential called `ReferralAPIToken`.
    - Kobo webhook configured to call your n8n webhook path (e.g., /webhook/kobo-submission).

    Nodes (minimal) with code and config:

    1) Webhook (Trigger)
    - Type: Webhook
    - Name: Kobo Webhook
    - HTTP Method: POST
    - Path: `/webhook/kobo-submission`

    2) MapKoboToCase (Function)
    Code (paste as-is into the Function node):
    ```javascript
    const firstOf = (...vals) => { for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '') return v; return null; };
    const s = items[0].json || {};
    const raw = s;
    const _uuid = firstOf(s._uuid, s.instanceID, s._id);
    const caseNumber = firstOf(s.case_id, s.caseNumber);
    const beneficiary_name = firstOf(s.beneficiary_name, s.name, s.full_name);
    const beneficiary_family_name = firstOf(s.beneficiary_family_name, s.last_name);
    const title = firstOf(s.Title, beneficiary_name ? `${beneficiary_name}${beneficiary_family_name ? ' ' + beneficiary_family_name : ''}` : null, `Kobo ${firstOf(caseNumber, _uuid, 'submission')}`);
    const description = firstOf(s.description, s.summary, s.notes, '') || '';
    const payload = { title: String(title || `Kobo ${_uuid || caseNumber || 'unknown'}`), description: String(description || ''), raw };
    return [{ json: { payload, dedupe:{ _uuid, caseNumber, beneficiary_name, beneficiary_family_name }, _uuid, caseNumber, raw } }];
    ```

    3) GET Cases (HTTP Request)
    - Type: HTTP Request
    - Name: GET Cases
    - Method: GET
    - URL: `https://api.bessar.work/api/cases?limit=200`
    - Credentials: ReferralAPIToken

    4) FilterDuplicates (Function)
    Code:
    ```javascript
    const list = Array.isArray(items[0].json) ? items[0].json : (items[0].json.data || items[0].json.items || items[0].json || []);
    const map = $items("MapKoboToCase")[0].json;
    const targetUuid = map.dedupe._uuid;
    let found = null;
    if (Array.isArray(list)) {
      found = list.find(c => c.raw && (String(c.raw._uuid) === String(targetUuid) || String(c.raw.instanceID) === String(targetUuid) || String(c.raw._id) === String(targetUuid)));
    }
    return [{ json: { duplicateFound: Boolean(found), foundCase: found || null, mappedPayload: map.payload, dedupe: map.dedupe, originalRaw: map.raw } }];
    ```

    5) If node (Check Duplicate) — Branches: true/false
    - Condition: `{{$json["duplicateFound"]}} === true`

    6A) True (Duplicate): POST Comment (optional)
    - Type: HTTP Request
    - Name: POST Comment (duplicate)
    - Method: POST
    - URL: `https://api.bessar.work/api/cases/{{ $json.foundCase.id }}/comments`
    - Credentials: ReferralAPIToken
    - Body (Raw JSON):
    ```json
    {
      "content": "Duplicate Kobo submission — instance: {{$json.originalRaw.instanceID || $json.dedupe._uuid}} — not created."
    }
    ```
    - Respond to Webhook: `{ "success": true, "message": "Duplicate - not created", "case_id": {{ $json.foundCase.id }} }`

    6B) False (Not Duplicate): POST Create Case
    - Type: HTTP Request
    - Name: POST Create Case
    - Method: POST
    - URL: `https://api.bessar.work/api/cases`
    - Credentials: ReferralAPIToken
    - Body Type: Raw JSON
    - Body (Use expression): `{{ $json.mappedPayload }}` or explicitly:
    ```json
    {
      "title": "{{$json.mappedPayload.title}}",
      "description": "{{$json.mappedPayload.description}}",
      "raw": {{$json.mappedPayload.raw}}
    }
    ```
    - Respond to Webhook: `{ "success": true, "message": "Case created", "case_id": "{{ $json.id }}" }`

    Optional: Add nodes for attachment download & upload or to call `/api/import` for batch imports.

    Credentials setup (n8n):
    - Create new credential: `ReferralAPIToken` (HTTP Header or API Key)
    - If HTTP Header: set `Authorization` header to `Bearer <JWT_TOKEN>`
    - If API Key: add `Authorization: Bearer {{$credentials.ReferralAPIToken.apiKey}}` to node headers

    Test via curl:
    ```bash
    curl -X POST https://<n8n-hook>/webhook/kobo-submission -H "Content-Type: application/json" -d '{"_uuid":"test-1","beneficiary_name":"Test"}'
    ```

    Notes:
    - Use `_uuid` as the primary dedupe key and keep `raw` intact for server auditing.
    - If your backend supports a `raw._uuid` filter param, you can replace `limit=200` with a filtered GET to reduce data transfer.
    - For production, protect the webhook (secret param or signature);
    - For high-volume imports, prefer `POST /api/import` and let the server handle dedupe and `ImportJob` tracking.



**Using Apache:**
1. Build: `npm run build`
2. Copy `dist/*` to `/var/www/html/`
3. Create `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Production Checklist

Before deploying to production:

- [ ] Remove or secure default login credentials
- [ ] Update environment variables for production API URL
- [ ] Test all user roles and permissions
- [ ] Verify XLSX import with real data
- [ ] Test PDF export functionality
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up proper backup strategy
- [ ] Configure monitoring and error tracking
- [ ] Test on different browsers
- [ ] Test mobile responsiveness
- [ ] Review and update security headers
- [ ] Set up proper logging

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
**Error:** `Port 5173 is already in use`

**Solution:**
```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <process-id> /F

# Or use different port
npm run dev -- --port 3000
```

#### 2. Module Not Found
**Error:** `Cannot find module 'xxx'`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. Login Not Working
**Issue:** Cannot login with default credentials

**Solution:**
- Check browser console for errors
- Clear localStorage: `localStorage.clear()`
- Refresh page and try again
- Verify credentials in `src/context/AuthContext.jsx`

#### 4. Cases Not Displaying
**Issue:** Case list is empty

**Solution:**
- Check if you're logged in with correct role
- External users only see assigned cases
- Import sample data from XLSX
- Check browser console for errors

#### 5. XLSX Import Fails
**Issue:** Upload doesn't create cases

**Solution:**
- Verify file format matches KoboToolbox export
- Check file size (max 10MB by default)
- Review field mappings in `formMetadata.js`
- Check browser console for parsing errors

#### 6. Dark Mode Not Working
**Issue:** Theme toggle doesn't switch

**Solution:**
- Clear localStorage theme: `localStorage.removeItem('theme')`
- Check `ThemeContext.jsx` for errors
- Verify CSS variables in `DashboardLayout.css`

#### 7. PDF Export Not Working
**Issue:** PDF download fails

**Solution:**
- Check browser console for errors
- Verify `html2canvas` and `jsPDF` are installed
- Test in different browser
- Reduce case details length if too large

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Known Issues:**
- PDF export may be slower on Firefox
- localStorage limits vary by browser
- Some CSS features require modern browsers

### Performance Optimization

**Large Datasets:**
```javascript
// Paginate case list (already implemented)
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;

// Lazy load images
<img loading="lazy" src="..." />

// Debounce search input
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);
```

**Bundle Size:**
- Current build: ~500KB gzipped
- Optimize by code-splitting routes
- Tree-shake unused Ant Design components
- Lazy load heavy libraries

---

## Development Guide

### Running in Development

```bash
# Start dev server with hot reload
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Features

**1. Add New Page:**
```javascript
// 1. Create component in src/pages/
// src/pages/NewPage.jsx
import React from 'react';
const NewPage = () => {
  return <div>New Page Content</div>;
};
export default NewPage;

// 2. Add route in App.jsx
import NewPage from './pages/NewPage';
// Inside Routes:
<Route path="/new-page" element={<NewPage />} />

// 3. Add menu item in DashboardLayout.jsx
{
  key: 'new-page',
  icon: <YourIcon />,
  label: 'New Page',
}
```

**2. Add New Context:**
```javascript
// src/context/NewContext.jsx
import React, { createContext, useContext, useState } from 'react';

const NewContext = createContext();

export const NewProvider = ({ children }) => {
  const [state, setState] = useState(initialValue);
  
  return (
    <NewContext.Provider value={{ state, setState }}>
      {children}
    </NewContext.Provider>
  );
};

export const useNew = () => useContext(NewContext);

// Wrap in main.jsx
<NewProvider>
  <App />
</NewProvider>
```

**3. Add New Case Field:**
```javascript
// Update src/data/formMetadata.js
{
  id: 'yourSection',
  title: 'Section Title',
  fields: [
    {
      name: 'new_field',
      type: 'text',
      label: { ar: 'Arabic', en: 'English' },
      aliases: ['alternative_name']
    }
  ]
}
```

### Code Style Guidelines

- Use functional components with hooks
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Keep components under 300 lines
- Extract reusable logic to custom hooks

---

## Support & Maintenance

### Logs & Debugging

**Enable Debug Logs:**
```javascript
// In .env
VITE_DEBUG=true

// Use in code
if (import.meta.env.VITE_DEBUG) {
  console.log('Debug info:', data);
}
```

**Browser DevTools:**
- Check Console for errors
- Network tab for API calls (future)
- Application tab for localStorage
- Performance tab for optimization

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages
npm update

# Major version updates
npm install package-name@latest
```

### Backup & Restore

**Export All Data:**
1. Go to `/data` page
2. Click "Download All"
3. Save JSON file

**Restore Data:**
1. Open browser console
2. Paste saved data:
```javascript
localStorage.setItem('cases', '<your-json-data>');
location.reload();
```

---

## Contact & Contributing

### Getting Help
- Review this documentation
- Check Troubleshooting section
- Review code comments
- Consult React/Ant Design docs

### Future Enhancements

**Planned Features:**
- [ ] Backend API integration
- [ ] Database storage (MongoDB/PostgreSQL)
- [ ] n8n workflow automation
- [ ] KoboToolbox webhook integration
- [ ] Advanced reporting
- [ ] Email notifications
- [ ] File attachments
- [ ] Audit logs
- [ ] Multi-language full support
- [ ] Export to multiple formats

**Integration Ready:**
- API client prepared
- Endpoint structure defined
- Authentication headers configured
- Error handling implemented

---

## License

This project is proprietary software developed for HLP case management. All rights reserved.

---

## Version History

**Current Version: 1.0.0** (December 2025)

**Features:**
- Complete case management system
- Three-tier role-based access
- Dark/light mode
- XLSX import from KoboToolbox
- PDF export
- Statistics dashboard
- User management
- Account settings
- Mobile responsive design

---

**Last Updated:** December 3, 2025
**Documentation Version:** 1.0.0
