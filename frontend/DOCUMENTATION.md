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

### 📊 Data & Analytics
- **Statistics Dashboard**: Visual charts and metrics
- **Case Status Tracking**: Monitor pending, in-progress, and completed cases
- **Export Capabilities**: Download data in JSON format
- **PDF Export**: Generate PDF reports of case details

### 📥 Data Import
- **XLSX Import**: Import data from Excel/KoboToolbox exports
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
```

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
