/**
 * Student Result Management System - Core Application Logic
 * Integrates SPA router, UI builders, event listeners, and form validations.
 * Updated to support fully asynchronous database client APIs.
 */

// Global State
let currentAdminSession = false;
try {
  currentAdminSession = sessionStorage.getItem('srms_admin_active') === 'true' || localStorage.getItem('srms_admin_active') === 'true';
} catch (e) {
  console.warn("Storage is restricted in this context.", e);
}
let confirmCallback = null;

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupTheme();
  setupNavigation();
  await populateDropdowns();
  
  // Direct landing check
  showView('view-home');
  updateHeaderAuthButton();
}

/* ==========================================
   THEME MANAGER
   ========================================== */
function setupTheme() {
  const isDark = localStorage.getItem('srms_theme') === 'dark';
  if (isDark) {
    document.body.classList.add('dark-theme');
  }
  
  const toggleBtn = document.getElementById('theme-toggle-btn');
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const darkNow = document.body.classList.contains('dark-theme');
    localStorage.setItem('srms_theme', darkNow ? 'dark' : 'light');
  });
}

/* ==========================================
   SPA ROUTER / VIEW SWITCHER
   ========================================== */
function showView(viewId) {
  const views = ['view-home', 'view-student', 'view-marksheet', 'view-notices', 'view-admin-login', 'view-admin-layout'];
  
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  // Security Check for Admin view
  if (viewId === 'view-admin-layout') {
    if (!currentAdminSession) {
      showToast('Admin authorization required.', 'danger');
      showView('view-admin-login');
      return;
    }
    document.getElementById(viewId).style.display = 'flex';
    renderAdminPanel('dashboard');
  } else {
    const targetEl = document.getElementById(viewId);
    if (targetEl) targetEl.style.display = 'block';
  }

  updateHeaderAuthButton();
  window.scrollTo(0, 0);
}

async function renderAdminPanel(panelName) {
  // Hide all panels
  const panels = ['panel-dashboard', 'panel-classes', 'panel-subjects', 'panel-combinations', 'panel-students', 'panel-results', 'panel-notices', 'panel-settings'];
  panels.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
  });

  // Deactivate all sidebar items
  const menuButtons = {
    dashboard: 'menu-btn-dashboard',
    classes: 'menu-btn-classes',
    subjects: 'menu-btn-subjects',
    combinations: 'menu-btn-combinations',
    students: 'menu-btn-students',
    results: 'menu-btn-results',
    notices: 'menu-btn-notices',
    settings: 'menu-btn-settings'
  };

  Object.values(menuButtons).forEach(btnId => {
    const el = document.getElementById(btnId);
    if (el) el.classList.remove('active');
  });

  // Activate chosen panel
  const targetPanel = document.getElementById(`panel-${panelName}`);
  if (targetPanel) targetPanel.style.display = 'block';

  const targetMenu = document.getElementById(menuButtons[panelName]);
  if (targetMenu) targetMenu.classList.add('active');

  // Trigger Panel Specific Data Loading
  switch (panelName) {
    case 'dashboard':
      await loadDashboardData();
      break;
    case 'classes':
      await renderClassesTable();
      break;
    case 'subjects':
      await renderSubjectsTable();
      break;
    case 'combinations':
      await renderCombinationsTable();
      break;
    case 'students':
      await renderStudentsTable();
      break;
    case 'results':
      await renderResultsTable();
      break;
    case 'notices':
      await renderAdminNoticesTable();
      break;
    case 'settings':
      loadSettingsData();
      break;
  }
}

function updateHeaderAuthButton() {
  const loginBtn = document.getElementById('nav-btn-portal-login');
  const loginText = document.getElementById('portal-login-text');
  
  if (currentAdminSession) {
    loginText.textContent = 'Logout';
    loginBtn.title = 'Close admin session';
  } else {
    loginText.textContent = 'Admin Login';
    loginBtn.title = 'Access administrator dashboard';
  }
}

/* ==========================================
   NAVIGATION & SHORTCUT LINKS
   ========================================== */
function setupNavigation() {
  // Brand Logo Click -> Go Home
  document.getElementById('nav-brand-logo').addEventListener('click', () => {
    showView('view-home');
  });

  // Header Notice Shortcut
  document.getElementById('nav-btn-notices').addEventListener('click', async () => {
    await renderPublicNotices();
    showView('view-notices');
  });

  // Home Page Cards
  document.getElementById('portal-card-student').addEventListener('click', async () => {
    await populateClassSelectDropdown('search-class-id');
    showView('view-student');
  });

  document.getElementById('home-btn-check-result').addEventListener('click', async () => {
    await populateClassSelectDropdown('search-class-id');
    showView('view-student');
  });

  document.getElementById('portal-card-admin').addEventListener('click', () => {
    if (currentAdminSession) {
      showView('view-admin-layout');
    } else {
      showView('view-admin-login');
    }
  });

  document.getElementById('home-btn-notices').addEventListener('click', async () => {
    await renderPublicNotices();
    showView('view-notices');
  });

  // Header Portal Login/Logout Action
  document.getElementById('nav-btn-portal-login').addEventListener('click', () => {
    if (currentAdminSession) {
      try {
        sessionStorage.removeItem('srms_admin_active');
        localStorage.removeItem('srms_admin_active');
      } catch (e) {
        console.warn("Storage is restricted in this context.", e);
      }
      currentAdminSession = false;
      updateHeaderAuthButton();
      updatePortalLoginButton();
      showToast('Logged out of Admin space successfully.');
      showView('view-home');
    } else {
      showView('view-admin-login');
    }
  });

  // Form back buttons
  document.getElementById('search-btn-back').addEventListener('click', () => showView('view-home'));
  document.getElementById('login-btn-back').addEventListener('click', () => showView('view-home'));
  document.getElementById('notices-btn-back').addEventListener('click', () => showView('view-home'));
  document.getElementById('ms-btn-back').addEventListener('click', () => showView('view-student'));

  // Admin Sidebar triggers
  document.getElementById('menu-btn-dashboard').addEventListener('click', () => renderAdminPanel('dashboard'));
  document.getElementById('menu-btn-classes').addEventListener('click', () => renderAdminPanel('classes'));
  document.getElementById('menu-btn-subjects').addEventListener('click', () => renderAdminPanel('subjects'));
  document.getElementById('menu-btn-combinations').addEventListener('click', () => renderAdminPanel('combinations'));
  document.getElementById('menu-btn-students').addEventListener('click', () => renderAdminPanel('students'));
  document.getElementById('menu-btn-results').addEventListener('click', () => renderAdminPanel('results'));
  document.getElementById('menu-btn-notices').addEventListener('click', () => renderAdminPanel('notices'));
  document.getElementById('menu-btn-settings').addEventListener('click', () => renderAdminPanel('settings'));
}

/* ==========================================
   DROPDOWN & OPTION BUILDERS
   ========================================== */
async function populateDropdowns() {
  await populateClassSelectDropdown('search-class-id');
  await populateClassSelectDropdown('comb-class-filter', true);
  await populateClassSelectDropdown('students-class-filter', true);
  await populateClassSelectDropdown('results-class-filter', true);
}

async function populateClassSelectDropdown(selectId, includeAllOption = false) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '';
  if (includeAllOption) {
    const opt = document.createElement('option');
    opt.value = 'All';
    opt.textContent = 'All Classes';
    select.appendChild(opt);
  } else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Select Class';
    select.appendChild(opt);
  }

  const classes = await db.getClasses();
  classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    const semTag = c.semester ? ` (${c.semester})` : '';
    opt.textContent = `${c.name} - Section ${c.section}${semTag}`;
    select.appendChild(opt);
  });
}

async function populateSubjectSelectDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Choose Subject</option>';
  const subjects = await db.getSubjects();
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    const typeTag = s.subject_type ? ` - ${s.subject_type}` : '';
    opt.textContent = `${s.name} (${s.subject_code}${typeTag})`;
    select.appendChild(opt);
  });
}

/* ==========================================
   STUDENT PORTAL & MARKSHEET BUILDER
   ========================================== */
// Student Search Form Submit
document.getElementById('student-search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const classId = document.getElementById('search-class-id').value;
  const rollId = document.getElementById('search-roll-id').value.trim();

  const response = await db.searchResult(rollId, classId);
  if (response.success) {
    renderMarksheet(response);
    showView('view-marksheet');
    showToast(`Result fetched successfully for ${response.student.name}`);
  } else {
    showToast(response.message, 'danger');
  }
});

function renderMarksheet(data) {
  const student = data.student;
  const evalData = data.evaluation;

  document.getElementById('ms-student-name').textContent = student.name;
  document.getElementById('ms-roll-id').textContent = student.rollId;
  document.getElementById('ms-class-name').textContent = student.className;
  document.getElementById('ms-dob').textContent = student.dob;
  document.getElementById('ms-email').textContent = student.email;
  document.getElementById('ms-mobile').textContent = student.mobile;

  // Render Table Rows
  const tbody = document.getElementById('ms-marks-table-body');
  tbody.innerHTML = '';

  evalData.subjects.forEach(subj => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${subj.code}</td>
      <td class="subj-name">${subj.name}</td>
      <td>${subj.max}</td>
      <td>${subj.pass}</td>
      <td class="${subj.isFailed ? 'fail-mark' : ''}">${subj.obtained}</td>
      <td>${subj.grade}</td>
      <td>
        <span class="badge ${subj.isFailed ? 'badge-danger' : 'badge-success'}">
          ${subj.isFailed ? 'Fail' : 'Pass'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Renders Scorecard details
  document.getElementById('ms-total-obtained').textContent = evalData.totalObtained;
  document.getElementById('ms-total-max').textContent = evalData.totalMax;
  document.getElementById('ms-percentage').textContent = `${evalData.percentage}%`;
  document.getElementById('ms-overall-grade').textContent = evalData.overallGrade;

  // Stamping
  const stamp = document.getElementById('ms-status-stamp');
  stamp.textContent = evalData.status;
  stamp.className = 'result-status-stamp'; // clear styles
  
  if (evalData.status === 'PASS') {
    stamp.classList.add('stamp-pass');
  } else if (evalData.status === 'FAIL') {
    stamp.classList.add('stamp-fail');
  } else {
    stamp.classList.add('stamp-promoted');
  }
}

// PDF print handler
document.getElementById('ms-btn-print').addEventListener('click', () => {
  window.print();
});

/* ==========================================
   PUBLIC NOTICE BOARD VIEWER
   ========================================== */
let activePublicNoticeCategory = 'All';

async function renderPublicNotices() {
  const notices = await db.getNotices();
  const container = document.getElementById('public-notice-list-container');
  container.innerHTML = '';

  const filtered = notices.filter(n => {
    if (activePublicNoticeCategory === 'All') return true;
    return n.category === activePublicNoticeCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-notice">No public circulars published in this category yet.</div>`;
    return;
  }

  filtered.forEach(notice => {
    const div = document.createElement('div');
    div.className = `notice-card ${notice.isPinned ? 'pinned' : ''}`;
    div.innerHTML = `
      ${notice.isPinned ? '<span class="notice-badge-pinned">📌 Pinned</span>' : ''}
      <div class="notice-meta">
        <span class="notice-tag">${notice.category}</span>
        <span>•</span>
        <span>Target: ${notice.target}</span>
        <span>•</span>
        <span>Date: ${notice.created_at || notice.createdAt}</span>
      </div>
      <h3>${notice.title}</h3>
      <p>${notice.content}</p>
    `;
    container.appendChild(div);
  });
}

// Notice categories filtering triggers
document.querySelectorAll('.filter-notice-btn').forEach(btn => {
  btn.addEventListener('click', async function() {
    document.querySelectorAll('.filter-notice-btn').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-outline');
    });
    this.classList.remove('btn-outline');
    this.classList.add('btn-primary');

    activePublicNoticeCategory = this.dataset.category;
    await renderPublicNotices();
  });
});

/* ==========================================
   ADMIN LOGIN FORM HANDLER & CONTROLS
   ========================================== */

// Show/Hide Password Toggle
const togglePasswordBtn = document.getElementById('toggle-login-password');
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const passField = document.getElementById('login-password');
    if (!passField) return;
    const isPassword = passField.type === 'password';
    passField.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.title = isPassword ? 'Hide Password' : 'Show Password';
    togglePasswordBtn.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  });
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    showToast('Please enter both username and password.', 'warning');
    return;
  }

  const result = await db.verifyAdmin(username, password);
  const isSuccess = typeof result === 'object' ? result.success : !!result;

  if (isSuccess) {
    const rememberMe = document.getElementById('login-remember-me')?.checked;
    try {
      sessionStorage.setItem('srms_admin_active', 'true');
      if (rememberMe) {
        localStorage.setItem('srms_admin_active', 'true');
      } else {
        localStorage.removeItem('srms_admin_active');
      }
    } catch (e) {
      console.warn("Storage is restricted in this context.", e);
    }
    currentAdminSession = true;
    updatePortalLoginButton();
    updateHeaderAuthButton();
    
    // Reset forms
    document.getElementById('admin-login-form').reset();
    showToast('Logged in as Administrator successfully.', 'success');
    
    // Redirect to Layout
    showView('view-admin-layout');
    await loadDashboardData();
  } else {
    const errorMsg = (typeof result === 'object' && result.message) ? result.message : 'Incorrect administrator username or password.';
    showToast(errorMsg, 'danger');
  }
});

/* ==========================================
   ADMIN DASHBOARD PANEL GENERATOR
   ========================================== */
async function loadDashboardData() {
  const stats = await db.getDashboardStats();
  
  // 1. Text Metrics Card Updates
  document.getElementById('stat-total-students').textContent = stats.cards.totalStudents;
  document.getElementById('stat-total-classes').textContent = stats.cards.totalClasses;
  document.getElementById('stat-total-subjects').textContent = stats.cards.totalSubjects;
  document.getElementById('stat-total-results').textContent = stats.cards.declaredResults;
  document.getElementById('stat-pass-rate').textContent = `${stats.cards.passRate}%`;

  // Update profile name card in sidebar
  const adminProfile = db.getAdminProfile();
  document.getElementById('admin-profile-name').textContent = adminProfile.name;
  document.getElementById('admin-avatar').textContent = adminProfile.name[0].toUpperCase();

  // 2. Custom Graphic Bar Chart
  const barsContainer = document.getElementById('dashboard-bars-container');
  barsContainer.innerHTML = '';
  
  if (stats.classPerformance.length === 0) {
    barsContainer.innerHTML = '<div style="margin: auto; color: var(--text-tertiary);">No active classes mapping registered.</div>';
  } else {
    stats.classPerformance.forEach(classStat => {
      const barWrapper = document.createElement('div');
      barWrapper.className = 'chart-bar-wrapper';
      
      const heightPercentage = classStat.total > 0 ? classStat.passRate : 0;
      
      barWrapper.innerHTML = `
        <div class="chart-tooltip">${classStat.className}: ${classStat.passRate}% Pass (${classStat.passed}/${classStat.total})</div>
        <div class="chart-bar" style="height: ${Math.max(heightPercentage, 5)}%; ${classStat.total === 0 ? 'background: var(--border-color);' : ''}"></div>
        <div class="chart-label-text" title="${classStat.className}">${classStat.className}</div>
      `;
      barsContainer.appendChild(barWrapper);
    });
  }

  // 3. Toppers List Render
  const toppersList = document.getElementById('dashboard-toppers-list');
  toppersList.innerHTML = '';

  if (stats.toppers.length === 0) {
    toppersList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary); font-size: 0.88rem;">No results declared yet to evaluate toppers.</div>';
  } else {
    stats.toppers.forEach((topper, idx) => {
      const card = document.createElement('div');
      card.className = 'topper-item-card';
      
      let rankClass = 'rank-standard';
      let rankContent = `#${idx + 1}`;
      if (idx === 0) { rankClass = 'rank-gold'; rankContent = '🥇'; }
      else if (idx === 1) { rankClass = 'rank-silver'; rankContent = '🥈'; }
      else if (idx === 2) { rankClass = 'rank-bronze'; rankContent = '🥉'; }

      card.innerHTML = `
        <div class="topper-rank-badge ${rankClass}">${rankContent}</div>
        <div class="topper-details">
          <div class="topper-name">${topper.studentName}</div>
          <div class="topper-meta">Class: <strong>${topper.className}</strong> • Roll: <strong>${topper.rollId}</strong></div>
        </div>
        <div class="topper-score-badge">${topper.percentage}%</div>
      `;
      toppersList.appendChild(card);
    });
  }
}

/* ==========================================
   CLASS PANEL CONTROLLERS (CRUD)
   ========================================== */
async function renderClassesTable() {
  const classes = await db.getClasses();
  const tbody = document.getElementById('classes-table-body');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('classes-search').value.toLowerCase().trim();
  const semFilterEl = document.getElementById('classes-semester-filter');
  const semFilter = semFilterEl ? semFilterEl.value : 'All';
  
  const filtered = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchVal) || 
      c.section.toLowerCase().includes(searchVal) || 
      (c.semester && c.semester.toLowerCase().includes(searchVal)) ||
      c.class_code.toLowerCase().includes(searchVal);

    const matchesSemester = semFilter === 'All' || c.semester === semFilter;
    return matchesSearch && matchesSemester;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-tertiary);">No matching classes found.</td></tr>`;
    return;
  }

  // Count assigned students helper
  const students = await db.getStudents();

  filtered.forEach(c => {
    const studentCount = students.filter(s => s.class_id === c.id).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.class_code}</strong></td>
      <td>${c.name}</td>
      <td>${c.section}</td>
      <td><span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--primary); padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600;">${c.semester || 'Semester 1'}</span></td>
      <td>${c.created_at || c.createdAt || 'N/A'}</td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-icon-only" onclick="editClassModal('${c.id}')" title="Edit Class">✏️</button>
          <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteClassConfirm('${c.id}')" title="Delete Class">🗑️</button>
          <span style="font-size: 0.8rem; color: var(--text-tertiary); align-self: center; margin-left: 0.5rem;">
            (${studentCount} Students)
          </span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('classes-search').addEventListener('input', renderClassesTable);
const classSemFilter = document.getElementById('classes-semester-filter');
if (classSemFilter) {
  classSemFilter.addEventListener('change', renderClassesTable);
}
document.getElementById('classes-btn-add').addEventListener('click', () => {
  document.getElementById('form-class').reset();
  document.getElementById('class-modal-id').value = '';
  document.getElementById('class-semester-input').value = 'Semester 1';
  document.getElementById('class-modal-title').textContent = 'Add Class Configuration';
  document.getElementById('class-modal-submit-btn').textContent = 'Save Class';
  openModal('modal-class');
});

async function editClassModal(id) {
  const classes = await db.getClasses();
  const cls = classes.find(c => String(c.id) === String(id));
  if (!cls) return;

  document.getElementById('class-modal-id').value = cls.id;
  document.getElementById('class-name-input').value = cls.name;
  document.getElementById('class-section-input').value = cls.section;
  document.getElementById('class-semester-input').value = cls.semester || 'Semester 1';
  
  document.getElementById('class-modal-title').textContent = 'Update Class Configuration';
  document.getElementById('class-modal-submit-btn').textContent = 'Update Class';
  openModal('modal-class');
}

// Global scope helpers for onclick buttons
window.editClassModal = editClassModal;
window.deleteClassConfirm = deleteClassConfirm;

document.getElementById('form-class').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('class-modal-id').value;
  const name = document.getElementById('class-name-input').value;
  const section = document.getElementById('class-section-input').value;
  const semester = document.getElementById('class-semester-input').value;

  let res;
  if (id) {
    res = await db.updateClass(id, { name, section, semester });
  } else {
    res = await db.addClass({ name, section, semester });
  }

  if (res.success) {
    showToast(id ? 'Class updated successfully' : 'New class added successfully');
    closeModal('modal-class');
    await renderClassesTable();
    await populateDropdowns();
  } else {
    showToast(res.message, 'danger');
  }
});

function deleteClassConfirm(id) {
  showConfirm(
    'Delete Class (Cascade Warning)',
    'Are you sure you want to delete this class? This will permanently delete this class, its enrolled students, and all associated examination results.',
    async () => {
      const res = await db.deleteClass(id);
      if (res.success) {
        showToast('Class and associated records deleted successfully.');
        await renderClassesTable();
        await populateDropdowns();
      } else {
        showToast(res.message, 'danger');
      }
    }
  );
}

/* ==========================================
   SUBJECT PANEL CONTROLLERS (CRUD)
   ========================================== */
async function renderSubjectsTable() {
  const subjects = await db.getSubjects();
  const tbody = document.getElementById('subjects-table-body');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('subjects-search').value.toLowerCase().trim();
  const typeFilterEl = document.getElementById('subjects-type-filter');
  const typeFilter = typeFilterEl ? typeFilterEl.value : 'All';

  const filtered = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchVal) || 
      s.subject_code.toLowerCase().includes(searchVal) ||
      (s.subject_type && s.subject_type.toLowerCase().includes(searchVal));

    const matchesType = typeFilter === 'All' || s.subject_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-tertiary);">No subjects match standard search or filter.</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.subject_code}</strong></td>
      <td>${s.name}</td>
      <td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600;">${s.subject_type || 'Theory'}</span></td>
      <td><span class="badge" style="background: rgba(99, 102, 241, 0.12); color: var(--primary); padding: 0.25rem 0.55rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">${s.credits || 4} Cr</span></td>
      <td>${s.max_marks} Marks</td>
      <td>${s.pass_marks} Marks</td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-icon-only" onclick="editSubjectModal('${s.id}')" title="Edit Subject">✏️</button>
          <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteSubjectConfirm('${s.id}')" title="Delete Subject">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('subjects-search').addEventListener('input', renderSubjectsTable);
const subjTypeFilter = document.getElementById('subjects-type-filter');
if (subjTypeFilter) {
  subjTypeFilter.addEventListener('change', renderSubjectsTable);
}
document.getElementById('subjects-btn-add').addEventListener('click', () => {
  document.getElementById('form-subject').reset();
  document.getElementById('subject-modal-id').value = '';
  document.getElementById('subj-type-input').value = 'Theory';
  document.getElementById('subj-credits-input').value = '4';
  document.getElementById('subject-modal-title').textContent = 'Add Subject Details';
  document.getElementById('subject-modal-submit-btn').textContent = 'Save Subject';
  openModal('modal-subject');
});

async function editSubjectModal(id) {
  const subjects = await db.getSubjects();
  const subj = subjects.find(s => String(s.id) === String(id));
  if (!subj) return;

  document.getElementById('subject-modal-id').value = subj.id;
  document.getElementById('subj-name-input').value = subj.name;
  document.getElementById('subj-code-input').value = subj.subject_code;
  document.getElementById('subj-type-input').value = subj.subject_type || 'Theory';
  document.getElementById('subj-credits-input').value = String(subj.credits || 4);
  document.getElementById('subj-max-input').value = subj.max_marks;
  document.getElementById('subj-pass-input').value = subj.pass_marks;

  document.getElementById('subject-modal-title').textContent = 'Update Subject Details';
  document.getElementById('subject-modal-submit-btn').textContent = 'Update Subject';
  openModal('modal-subject');
}

window.editSubjectModal = editSubjectModal;
window.deleteSubjectConfirm = deleteSubjectConfirm;

document.getElementById('form-subject').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('subject-modal-id').value;
  const name = document.getElementById('subj-name-input').value;
  const code = document.getElementById('subj-code-input').value;
  const subjectType = document.getElementById('subj-type-input').value;
  const credits = parseInt(document.getElementById('subj-credits-input').value) || 4;
  const maxMarks = document.getElementById('subj-max-input').value;
  const passMarks = document.getElementById('subj-pass-input').value;

  if (parseInt(passMarks) > parseInt(maxMarks)) {
    showToast('Passing marks cannot exceed maximum marks.', 'warning');
    return;
  }

  let res;
  if (id) {
    res = await db.updateSubject(id, { name, code, subjectType, credits, maxMarks, passMarks });
  } else {
    res = await db.addSubject({ name, code, subjectType, credits, maxMarks, passMarks });
  }

  if (res.success) {
    showToast(id ? 'Subject parameters updated' : 'New subject cataloged successfully');
    closeModal('modal-subject');
    await renderSubjectsTable();
  } else {
    showToast(res.message, 'danger');
  }
});

function deleteSubjectConfirm(id) {
  showConfirm(
    'Delete Subject (Cascade Warning)',
    'Are you sure you want to delete this subject? This will delete the subject along with its recorded marks and class combination mappings.',
    async () => {
      const res = await db.deleteSubject(id);
      if (res.success) {
        showToast('Subject and associated records deleted successfully.');
        await renderSubjectsTable();
        await populateDropdowns();
      } else {
        showToast(res.message, 'danger');
      }
    }
  );
}

/* ==========================================
   SUBJECT COMBINATION PANEL CONTROLLERS
   ========================================== */
async function renderCombinationsTable() {
  const list = await db.getCombinations();
  const tbody = document.getElementById('combinations-table-body');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('comb-search').value.toLowerCase().trim();
  const classFilter = document.getElementById('comb-class-filter').value;

  const filtered = list.filter(c => {
    const matchesSearch = c.className.toLowerCase().includes(searchVal) || 
                          c.subjectName.toLowerCase().includes(searchVal) || 
                          c.subjectCode.toLowerCase().includes(searchVal);
    const matchesClass = classFilter === 'All' || String(c.class_id) === String(classFilter);
    return matchesSearch && matchesClass;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary);">No mapped teaching combinations.</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const badgeClass = c.status === 'Active' ? 'badge-success' : 'badge-danger';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.className}</strong></td>
      <td>${c.subjectCode}</td>
      <td>${c.subjectName}</td>
      <td>
        <span class="badge ${badgeClass}" style="cursor: pointer;" onclick="toggleCombination('${c.id}')" title="Click to Toggle status">
          ${c.status}
        </span>
      </td>
      <td>
        <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteCombinationConfirm('${c.id}')" title="Delete Combination">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('comb-search').addEventListener('input', renderCombinationsTable);
document.getElementById('comb-class-filter').addEventListener('change', renderCombinationsTable);

document.getElementById('comb-btn-add').addEventListener('click', async () => {
  await populateClassSelectDropdown('comb-class-select');
  
  // Custom subject loader to populate comb-subj-select dropdown
  const select = document.getElementById('comb-subj-select');
  if (select) {
    select.innerHTML = '<option value="">Choose Subject</option>';
    const subjects = await db.getSubjects();
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.subject_code})`;
      select.appendChild(opt);
    });
  }

  document.getElementById('form-combination').reset();
  openModal('modal-combination');
});

document.getElementById('form-combination').addEventListener('submit', async (e) => {
  e.preventDefault();
  const classId = document.getElementById('comb-class-select').value;
  const subjectId = document.getElementById('comb-subj-select').value;

  const res = await db.addCombination(classId, subjectId);
  if (res.success) {
    showToast('Subject linked to class successfully.');
    closeModal('modal-combination');
    await renderCombinationsTable();
  } else {
    showToast(res.message, 'danger');
  }
});

async function toggleCombination(id) {
  const res = await db.toggleCombinationStatus(id);
  if (res.success) {
    showToast(`Combination status updated to ${res.status}`);
    await renderCombinationsTable();
  }
}

function deleteCombinationConfirm(id) {
  showConfirm(
    'Delete Mapping Confirmation',
    'Are you sure you want to remove this subject combination from class list?',
    async () => {
      const res = await db.deleteCombination(id);
      if (res.success) {
        showToast('Teaching combination links removed.');
        await renderCombinationsTable();
      }
    }
  );
}

window.toggleCombination = toggleCombination;
window.deleteCombinationConfirm = deleteCombinationConfirm;

/* ==========================================
   STUDENT ROSTER PANEL CONTROLLERS (CRUD)
   ========================================== */
async function renderStudentsTable() {
  const list = await db.getStudents();
  const tbody = document.getElementById('students-table-body');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('students-search').value.toLowerCase().trim();
  const classFilter = document.getElementById('students-class-filter').value;

  const filtered = list.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchVal) || 
                          s.roll_id.toLowerCase().includes(searchVal) || 
                          (s.email && s.email.toLowerCase().includes(searchVal));
    const matchesClass = classFilter === 'All' || String(s.class_id) === String(classFilter);
    return matchesSearch && matchesClass;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-tertiary);">No registered student profiles.</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const badgeClass = s.status === 'Active' ? 'badge-success' : 'badge-danger';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.roll_id}</strong></td>
      <td>${s.name}</td>
      <td>${s.className}</td>
      <td>${s.email || 'N/A'}</td>
      <td>${s.mobile || 'N/A'}</td>
      <td><span class="badge ${badgeClass}">${s.status}</span></td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-icon-only" onclick="editStudentModal('${s.id}')" title="Edit Info">✏️</button>
          <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteStudentConfirm('${s.id}')" title="Delete Profile">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('students-search').addEventListener('input', renderStudentsTable);
document.getElementById('students-class-filter').addEventListener('change', renderStudentsTable);

document.getElementById('students-btn-add').addEventListener('click', async () => {
  await populateClassSelectDropdown('stud-class-select');
  document.getElementById('form-student').reset();
  document.getElementById('student-modal-id').value = '';
  document.getElementById('stud-roll-input').disabled = false;
  document.getElementById('student-modal-title').textContent = 'Student Registration';
  document.getElementById('student-modal-submit-btn').textContent = 'Register Student';
  openModal('modal-student');
});

async function editStudentModal(id) {
  const students = await db.getStudents();
  const stud = students.find(s => String(s.id) === String(id));
  if (!stud) return;

  await populateClassSelectDropdown('stud-class-select');

  document.getElementById('student-modal-id').value = stud.id;
  document.getElementById('stud-roll-input').value = stud.roll_id;
  document.getElementById('stud-roll-input').disabled = true;

  document.getElementById('stud-class-select').value = stud.class_id;
  document.getElementById('stud-name-input').value = stud.name;
  document.getElementById('stud-gender-select').value = stud.gender;
  document.getElementById('stud-dob-input').value = stud.dob;
  document.getElementById('stud-email-input').value = stud.email || '';
  document.getElementById('stud-mobile-input').value = stud.mobile || '';
  document.getElementById('stud-status-select').value = stud.status;

  document.getElementById('student-modal-title').textContent = 'Update Student Details';
  document.getElementById('student-modal-submit-btn').textContent = 'Update Bio Info';
  openModal('modal-student');
}

window.editStudentModal = editStudentModal;
window.deleteStudentConfirm = deleteStudentConfirm;

document.getElementById('form-student').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('student-modal-id').value;
  const rollId = document.getElementById('stud-roll-input').value;
  const classId = document.getElementById('stud-class-select').value;
  const name = document.getElementById('stud-name-input').value;
  const gender = document.getElementById('stud-gender-select').value;
  const dob = document.getElementById('stud-dob-input').value;
  const email = document.getElementById('stud-email-input').value;
  const mobile = document.getElementById('stud-mobile-input').value;
  const status = document.getElementById('stud-status-select').value;

  let res;
  if (id) {
    res = await db.updateStudent(id, { rollId, classId, name, gender, dob, email, mobile, status });
  } else {
    res = await db.addStudent({ rollId, classId, name, gender, dob, email, mobile, status });
  }

  if (res.success) {
    showToast(id ? 'Student file updated' : 'Student registered successfully');
    closeModal('modal-student');
    await renderStudentsTable();
    await populateDropdowns();
  } else {
    showToast(res.message, 'danger');
  }
});

function deleteStudentConfirm(id) {
  showConfirm(
    'Delete Student Record',
    'Are you sure you want to permanently delete this student? All declared result sheets will be wiped.',
    async () => {
      const res = await db.deleteStudent(id);
      if (res.success) {
        showToast('Student file wiped out.');
        await renderStudentsTable();
      }
    }
  );
}

/* ==========================================
   RESULT DECLARATION PANEL (CRUD & SCORING)
   ========================================== */
async function renderResultsTable() {
  const list = await db.getResults();
  const tbody = document.getElementById('results-table-body');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('results-search').value.toLowerCase().trim();
  const classFilter = document.getElementById('results-class-filter').value;

  const filtered = list.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchVal) || 
                          r.rollId.toLowerCase().includes(searchVal);
    const matchesClass = classFilter === 'All' || String(r.classId) === String(classFilter);
    return matchesSearch && matchesClass;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-tertiary);">No result sheets declared.</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    let badgeClass = 'badge-success';
    if (r.summary.status === 'FAIL') badgeClass = 'badge-danger';
    if (r.summary.status === 'PROMOTED') badgeClass = 'badge-warning';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${r.rollId}</strong></td>
      <td>${r.studentName}</td>
      <td>${r.className}</td>
      <td>${r.summary.totalObtained} / ${r.summary.totalMax}</td>
      <td>${r.summary.percentage}%</td>
      <td><strong>${r.summary.overallGrade}</strong></td>
      <td><span class="badge ${badgeClass}">${r.summary.status}</span></td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-icon-only" onclick="previewMarksheetModal('${r.rollId}', '${r.classId}')" title="Preview Marksheet">📄</button>
          <button class="btn btn-outline btn-icon-only" onclick="editResultModal('${r.id}')" title="Edit Marks">✏️</button>
          <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteResultConfirm('${r.id}')" title="Delete Record">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('results-search').addEventListener('input', renderResultsTable);
document.getElementById('results-class-filter').addEventListener('change', renderResultsTable);

// Add result trigger
document.getElementById('results-btn-declare').addEventListener('click', async () => {
  await populateClassSelectDropdown('res-class-select');
  
  // Clean setup
  document.getElementById('form-result').reset();
  document.getElementById('result-modal-id').value = '';
  
  document.getElementById('result-selection-block').style.display = 'block';
  document.getElementById('result-static-block').style.display = 'none';
  document.getElementById('res-marks-rows-container').innerHTML = `
    <div style="text-align: center; color: var(--text-tertiary); padding: 1.5rem 0;" id="res-marks-placeholder-text">
      Please choose a student to view linked active subject fields.
    </div>
  `;
  document.getElementById('res-student-select').disabled = true;
  document.getElementById('res-student-select').innerHTML = '<option value="">Select Student (Choose class first)</option>';

  document.getElementById('result-modal-title').textContent = 'Declare Student Result Marks';
  document.getElementById('result-modal-submit-btn').textContent = 'Declare Result';

  openModal('modal-result');
});

// Load students dropdown dynamically on class change (when declaring result)
document.getElementById('res-class-select').addEventListener('change', async function() {
  const classId = this.value;
  const studSelect = document.getElementById('res-student-select');
  studSelect.innerHTML = '<option value="">Select Student</option>';
  studSelect.disabled = true;

  if (!classId) return;

  const unsubmittedStudents = await db.getStudentsWithNoResult(classId);

  if (unsubmittedStudents.length === 0) {
    studSelect.innerHTML = '<option value="">All active students in class already have declared results.</option>';
    return;
  }

  unsubmittedStudents.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} (Roll ID: ${s.roll_id})`;
    studSelect.appendChild(opt);
  });
  studSelect.disabled = false;
});

// Load marks text fields dynamically on student selection (when declaring result)
document.getElementById('res-student-select').addEventListener('change', async function() {
  const studentId = this.value;
  const classId = document.getElementById('res-class-select').value;
  await buildMarksFormFields(classId, studentId);
});

async function buildMarksFormFields(classId, studentId, existingMarks = {}) {
  const container = document.getElementById('res-marks-rows-container');
  container.innerHTML = '';

  const activeSubjects = await db.getActiveSubjectsForClass(classId);
  if (activeSubjects.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 1.5rem 0;">No active subjects combination is mapped to this class! Link subjects first.</div>`;
    return;
  }

  activeSubjects.forEach(subj => {
    const val = existingMarks[subj.id] !== undefined ? existingMarks[subj.id] : '';
    const row = document.createElement('div');
    row.className = 'marks-entry-row';
    row.innerHTML = `
      <div class="marks-entry-subj">
        ${subj.name} 
        <span style="font-size: 0.75rem; color: var(--text-tertiary);">(${subj.subject_code})</span>
      </div>
      <input type="number" class="form-control marks-entry-input res-subject-mark-input" 
             data-subject-id="${subj.id}" data-max-marks="${subj.max_marks}" 
             value="${val}" placeholder="Marks" min="0" max="${subj.max_marks}" required>
      <div class="marks-entry-max">/ ${subj.max_marks}</div>
    `;
    container.appendChild(row);
  });
}

// Edit Result marks loader
async function editResultModal(id) {
  const resultsList = await db.getResults();
  const res = resultsList.find(r => String(r.id) === String(id));
  if (!res) return;

  document.getElementById('result-modal-id').value = res.id;
  document.getElementById('result-selection-block').style.display = 'none';
  document.getElementById('result-static-block').style.display = 'block';

  document.getElementById('res-static-name').textContent = res.studentName;
  document.getElementById('res-static-roll').textContent = res.rollId;
  document.getElementById('res-static-class').textContent = res.className;

  await buildMarksFormFields(res.classId, res.studentId, res.marks);

  document.getElementById('result-modal-title').textContent = 'Edit Student Marks Sheet';
  document.getElementById('result-modal-submit-btn').textContent = 'Update Marks';

  openModal('modal-result');
}

window.editResultModal = editResultModal;
window.deleteResultConfirm = deleteResultConfirm;
window.previewMarksheetModal = previewMarksheetModal;

// Form result declaration submit
document.getElementById('form-result').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('result-modal-id').value;
  
  // Build marks dataset object
  const marks = {};
  let isValid = true;

  document.querySelectorAll('.res-subject-mark-input').forEach(input => {
    const subjId = input.dataset.subjectId;
    const val = parseFloat(input.value);
    const maxVal = parseFloat(input.dataset.maxMarks);

    if (val > maxVal || val < 0) {
      showToast(`Marks obtained cannot exceed maximum limit of ${maxVal}`, 'warning');
      isValid = false;
      return;
    }
    marks[subjId] = val;
  });

  if (!isValid) return;

  if (Object.keys(marks).length === 0) {
    showToast('No subjects are active to enter scores.', 'warning');
    return;
  }

  let res;
  if (id) {
    res = await db.updateResult(id, marks);
  } else {
    const studentId = document.getElementById('res-student-select').value;
    const classId = document.getElementById('res-class-select').value;
    const students = await db.getStudents();
    const student = students.find(s => String(s.id) === String(studentId));
    
    res = await db.addResult({
      studentId,
      classId,
      rollId: student.roll_id,
      marks
    });
  }

  if (res.success) {
    showToast(id ? 'Result sheet updated' : 'Academic result declared successfully');
    closeModal('modal-result');
    await renderResultsTable();
  } else {
    showToast(res.message, 'danger');
  }
});

function deleteResultConfirm(id) {
  showConfirm(
    'Delete Result Record',
    'Are you sure you want to retract and delete this student\'s declared marksheet?',
    async () => {
      const res = await db.deleteResult(id);
      if (res.success) {
        showToast('Declared marks record removed.');
        await renderResultsTable();
      }
    }
  );
}

// Direct Preview from admin table shortcut
async function previewMarksheetModal(rollId, classId) {
  const response = await db.searchResult(rollId, classId);
  if (response.success) {
    renderMarksheet(response);
    showView('view-marksheet');
    
    // override back button in marksheet to return to admin panel results page
    const backBtn = document.getElementById('ms-btn-back');
    const overrideBack = () => {
      showView('view-admin-layout');
      renderAdminPanel('results');
      backBtn.removeEventListener('click', overrideBack);
      backBtn.addEventListener('click', restoreNormalBack);
    };

    const restoreNormalBack = () => {
      showView('view-student');
      backBtn.removeEventListener('click', restoreNormalBack);
    };

    backBtn.removeEventListener('click', restoreNormalBack);
    backBtn.addEventListener('click', overrideBack);
  }
}

/* ==========================================
   ADMIN NOTICE BOARD MANAGEMENTS
   ========================================== */
async function renderAdminNoticesTable() {
  const list = await db.getNotices();
  const tbody = document.getElementById('admin-notices-table-body');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('admin-notices-search').value.toLowerCase().trim();
  const filtered = list.filter(n => 
    n.title.toLowerCase().includes(searchVal) || 
    n.content.toLowerCase().includes(searchVal)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-tertiary);">No notices cataloged.</td></tr>`;
    return;
  }

  filtered.forEach(n => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${n.title}</strong></td>
      <td><span class="badge badge-accent">${n.category}</span></td>
      <td>${n.target}</td>
      <td>${n.created_at || n.createdAt || 'N/A'}</td>
      <td>${n.isPinned ? '📌 Yes' : 'No'}</td>
      <td>
        <button class="btn btn-outline btn-icon-only btn-danger" onclick="deleteNoticeConfirm('${n.id}')" title="Delete Notice">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('admin-notices-search').addEventListener('input', renderAdminNoticesTable);
document.getElementById('notices-btn-add').addEventListener('click', () => {
  document.getElementById('form-notice').reset();
  openModal('modal-notice');
});

document.getElementById('form-notice').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('notice-title-input').value;
  const category = document.getElementById('notice-cat-select').value;
  const target = document.getElementById('notice-target-select').value;
  const content = document.getElementById('notice-content-input').value;
  const isPinned = document.getElementById('notice-pin-input').checked;

  const res = await db.addNotice({ title, category, target, content, isPinned });
  if (res.success) {
    showToast('Notice published successfully on bulletin board.');
    closeModal('modal-notice');
    await renderAdminNoticesTable();
  }
});

function deleteNoticeConfirm(id) {
  showConfirm(
    'Delete Announcement Circular',
    'Are you sure you want to delete this notice? It will disappear from student portal bulletin.',
    async () => {
      const res = await db.deleteNotice(id);
      if (res.success) {
        showToast('Notice circular deleted.');
        await renderAdminNoticesTable();
      }
    }
  );
}

window.deleteNoticeConfirm = deleteNoticeConfirm;

/* ==========================================
   ADMIN ACCOUNT SETTINGS & DATA CONTROLS
   ========================================== */
function loadSettingsData() {
  document.getElementById('settings-password-form').reset();
}

// Password Form Submit handler
document.getElementById('settings-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const oldPass = document.getElementById('pass-old').value;
  const newPass = document.getElementById('pass-new').value;
  const confirmPass = document.getElementById('pass-confirm').value;

  if (newPass !== confirmPass) {
    showToast('Passwords do not match confirmation.', 'warning');
    return;
  }

  if (newPass.length < 5) {
    showToast('New password should be at least 5 characters.', 'warning');
    return;
  }

  const res = await db.changePassword(oldPass, newPass);
  if (res.success) {
    showToast('Admin password changed successfully.');
    document.getElementById('settings-password-form').reset();
  } else {
    showToast(res.message, 'danger');
  }
});

// Database Export JSON Backup
document.getElementById('settings-btn-export').addEventListener('click', async () => {
  const jsonStr = await db.exportBackup();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `srms_database_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Database exported successfully as JSON file.');
});

// Database Import triggers
document.getElementById('settings-btn-import-trigger').addEventListener('click', () => {
  document.getElementById('settings-import-file').click();
});

document.getElementById('settings-import-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    const res = await db.importBackup(evt.target.result);
    if (res.success) {
      showToast('Database JSON backup imported and re-seeded successfully.');
      await loadDashboardData();
      await populateDropdowns();
    } else {
      showToast(res.message, 'danger');
    }
  };
  reader.readAsText(file);
  this.value = '';
});

// Factory Reset system
document.getElementById('settings-btn-reset-demo').addEventListener('click', () => {
  showConfirm(
    'Factory Reset Database',
    'Are you sure you want to wipe all records and restore initial demo seeded data?',
    async () => {
      await db.reset();
      showToast('System variables reset to default values.');
      await loadDashboardData();
      await populateDropdowns();
      await renderAdminPanel('dashboard');
    }
  );
});

/* ==========================================
   UI UTILITY DIALOGS & OVERLAYS
   ========================================== */
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

window.closeModal = closeModal;

// Toast notification triggers
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

// Global showConfirm
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = onConfirm;
  openModal('modal-confirm');
}

// Submit button triggers in Confirmation modal
document.getElementById('confirm-submit-btn').addEventListener('click', () => {
  if (confirmCallback && typeof confirmCallback === 'function') {
    confirmCallback();
  }
  closeModal('modal-confirm');
});
