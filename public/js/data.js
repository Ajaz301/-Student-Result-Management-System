/**
 * Student Result Management System - Database API Client Layer
 * Handles async fetch API calls to the Express SQL server.
 */

const API_BASE = '/api';

class ServerDatabaseClient {
  // --- Admin Auth ---
  async verifyAdmin(username, password) {
    try {
      const cleanUser = (username || '').trim();
      const cleanPass = (password || '').trim();
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem('srms_admin_profile', JSON.stringify({
          name: data.name || 'Administrator',
          email: data.email || 'admin@srms-edu.org',
          username: data.username || cleanUser
        }));
        return { success: true, profile: data };
      }
      return { success: false, message: data && data.message ? data.message : 'Invalid credentials' };
    } catch (e) {
      console.error("API error during login:", e);
      return { success: false, message: 'Could not connect to backend server. Make sure server is running.' };
    }
  }

  getAdminProfile() {
    try {
      return JSON.parse(localStorage.getItem('srms_admin_profile')) || { name: 'Administrator', email: 'admin@srms-edu.org', username: 'admin' };
    } catch (e) {
      return { name: 'Administrator', email: 'admin@srms-edu.org', username: 'admin' };
    }
  }

  async changePassword(oldPassword, newPassword) {
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to backend server.' };
    }
  }

  // --- Classes CRUD ---
  async getClasses() {
    try {
      const res = await fetch(`${API_BASE}/classes`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addClass(classObj) {
    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classObj)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to backend server.' };
    }
  }

  async updateClass(id, updatedInfo) {
    try {
      const res = await fetch(`${API_BASE}/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInfo)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to backend server.' };
    }
  }

  async deleteClass(id) {
    try {
      const res = await fetch(`${API_BASE}/classes/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to backend server.' };
    }
  }

  // --- Subjects CRUD ---
  async getSubjects() {
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addSubject(subjObj) {
    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjObj)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to server.' };
    }
  }

  async updateSubject(id, updatedInfo) {
    try {
      const res = await fetch(`${API_BASE}/subjects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInfo)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to server.' };
    }
  }

  async deleteSubject(id) {
    try {
      const res = await fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to server.' };
    }
  }

  // --- Subject Combinations ---
  async getCombinations() {
    try {
      const res = await fetch(`${API_BASE}/combinations`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addCombination(classId, subjectId) {
    try {
      const res = await fetch(`${API_BASE}/combinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, subjectId })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to link subject combination.' };
    }
  }

  async toggleCombinationStatus(id) {
    try {
      const res = await fetch(`${API_BASE}/combinations/${id}/toggle`, { method: 'PUT' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to toggle status.' };
    }
  }

  async deleteCombination(id) {
    try {
      const res = await fetch(`${API_BASE}/combinations/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to delete mapped combination.' };
    }
  }

  async getActiveSubjectsForClass(classId) {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/active-subjects`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // --- Students CRUD ---
  async getStudents() {
    try {
      const res = await fetch(`${API_BASE}/students`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addStudent(studObj) {
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studObj)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to register student profile.' };
    }
  }

  async updateStudent(id, updatedInfo) {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInfo)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to update student profile.' };
    }
  }

  async deleteStudent(id) {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to delete student.' };
    }
  }

  async getStudentsWithNoResult(classId) {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/students-no-result`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // --- Results CRUD ---
  async getResults() {
    try {
      const res = await fetch(`${API_BASE}/results`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addResult(resultObj) {
    try {
      const res = await fetch(`${API_BASE}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultObj)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to declare student result.' };
    }
  }

  async updateResult(id, updatedMarks) {
    try {
      const res = await fetch(`${API_BASE}/results/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: updatedMarks })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to update result marks.' };
    }
  }

  async deleteResult(id) {
    try {
      const res = await fetch(`${API_BASE}/results/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to delete result record.' };
    }
  }

  async searchResult(rollId, classId) {
    try {
      const res = await fetch(`${API_BASE}/student/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollId, classId })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to search student record. Server connection refused.' };
    }
  }

  // --- Notices CRUD ---
  async getNotices() {
    try {
      const res = await fetch(`${API_BASE}/notices`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addNotice(noticeObj) {
    try {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticeObj)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to publish notice.' };
    }
  }

  async deleteNotice(id) {
    try {
      const res = await fetch(`${API_BASE}/notices/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to delete notice circular.' };
    }
  }

  // --- General Analytics ---
  async getDashboardStats() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return {
        cards: { totalStudents: 0, totalClasses: 0, totalSubjects: 0, declaredResults: 0, activeNotices: 0, passRate: 0 },
        toppers: [],
        classPerformance: []
      };
    }
  }

  // --- Export and Import backups ---
  async exportBackup() {
    try {
      const res = await fetch(`${API_BASE}/settings/backup`);
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error(e);
      return '{}';
    }
  }

  async importBackup(jsonString) {
    try {
      const res = await fetch(`${API_BASE}/settings/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to connect to server backend.' };
    }
  }

  async reset() {
    try {
      const res = await fetch(`${API_BASE}/settings/reset`, { method: 'POST' });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Failed to reset database.' };
    }
  }
}

// Global Database Singleton instance mapping to the backend server
const db = new ServerDatabaseClient();
