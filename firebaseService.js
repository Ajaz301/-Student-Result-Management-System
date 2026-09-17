/**
 * Firebase Firestore Service Layer for AcademiaSync
 * Encapsulates all CRUD and analytical queries for SRMS using Cloud Firestore.
 */

const { getDb } = require('./firebaseAdmin');

// Collections references
const COLL = {
  ADMINS: 'admins',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  COMBINATIONS: 'subject_combinations',
  STUDENTS: 'students',
  RESULTS: 'results',
  NOTICES: 'notices'
};

class FirebaseService {
  get db() {
    const db = getDb();
    if (!db) {
      throw new Error('Firebase Firestore is not initialized. Please ensure serviceAccountKey.json is configured.');
    }
    return db;
  }

  // =========================================================================
  // 1. ADMIN AUTHENTICATION
  // =========================================================================
  async verifyAdmin(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Username and password are required.' };
    }

    try {
      // 1. Check by username
      const snapshot = await this.db.collection(COLL.ADMINS)
        .where('username', '==', cleanUser)
        .where('password', '==', cleanPass)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
          success: true,
          id: doc.id,
          name: data.name || 'Administrator',
          email: data.email || 'admin@srms-edu.org',
          username: data.username || cleanUser
        };
      }

      // 2. Check by email
      const emailSnapshot = await this.db.collection(COLL.ADMINS)
        .where('email', '==', cleanUser)
        .where('password', '==', cleanPass)
        .limit(1)
        .get();

      if (!emailSnapshot.empty) {
        const doc = emailSnapshot.docs[0];
        const data = doc.data();
        return {
          success: true,
          id: doc.id,
          name: data.name || 'Administrator',
          email: data.email || 'admin@srms-edu.org',
          username: data.username || cleanUser
        };
      }

      // 3. If collection is empty and default admin credentials used, auto-create default admin doc
      const countSnapshot = await this.db.collection(COLL.ADMINS).limit(1).get();
      if (countSnapshot.empty && (cleanUser.toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'admin@srms-edu.org') && cleanPass === 'Admin@Academia2026!') {
        const newAdmin = {
          username: 'admin',
          password: 'Admin@Academia2026!',
          name: 'School Administrator',
          email: 'admin@srms-edu.org',
          created_at: new Date().toISOString()
        };
        const docRef = await this.db.collection(COLL.ADMINS).add(newAdmin);
        return {
          success: true,
          id: docRef.id,
          name: newAdmin.name,
          email: newAdmin.email,
          username: newAdmin.username
        };
      }

      return { success: false, message: 'Invalid credentials' };
    } catch (err) {
      console.warn('[FirebaseService verifyAdmin warning]:', err.message);
      throw err;
    }
  }

  async changePassword(oldPassword, newPassword) {
    const cleanOld = (oldPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    try {
      // 1. Check if admin doc exists by current password
      let snapshot = await this.db.collection(COLL.ADMINS)
        .where('password', '==', cleanOld)
        .get();

      // 2. If not found by exact password query, check by username 'admin'
      if (snapshot.empty) {
        snapshot = await this.db.collection(COLL.ADMINS)
          .where('username', '==', 'admin')
          .get();
      }

      // 3. If no admin doc exists in Firestore, create it with the new password
      if (snapshot.empty) {
        const docRef = await this.db.collection(COLL.ADMINS).add({
          username: 'admin',
          password: cleanNew,
          name: 'School Administrator',
          email: 'admin@srms-edu.org',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        console.log(`[FirebaseService] Created admin document with new password in Firestore (ID: ${docRef.id})`);
        return { success: true, message: 'Password updated and saved to Firebase Firestore successfully' };
      }

      // 4. Update all matched admin docs in Firestore
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          password: cleanNew,
          updated_at: new Date().toISOString()
        });
      });
      await batch.commit();

      console.log(`[FirebaseService] Updated ${snapshot.size} admin document(s) in Firebase Firestore with new password.`);
      return { success: true, message: 'Password updated successfully in Firebase Firestore' };
    } catch (err) {
      console.warn('[FirebaseService changePassword warning]:', err.message);
      throw err;
    }
  }

  // =========================================================================
  // 2. CLASSES CRUD
  // =========================================================================
  async getClasses() {
    const snapshot = await this.db.collection(COLL.CLASSES).orderBy('name', 'asc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async addClass({ name, section, semester }) {
    const cleanName = name.trim();
    const cleanSection = section.trim();
    const sem = semester && semester.trim() ? semester.trim() : 'Semester 1';
    const semSlug = sem.replace(/\s+/g, '');
    const classCode = `${cleanName.replace(/\s+/g, '')}-${cleanSection.replace(/\s+/g, '')}-${semSlug}`.toUpperCase();

    // Check duplicate
    const existing = await this.db.collection(COLL.CLASSES)
      .where('name', '==', cleanName)
      .where('section', '==', cleanSection)
      .where('semester', '==', sem)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, message: 'Class with this name, section, and semester already exists' };
    }

    const docRef = await this.db.collection(COLL.CLASSES).add({
      name: cleanName,
      section: cleanSection,
      semester: sem,
      class_code: classCode,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      class: {
        id: docRef.id,
        name: cleanName,
        section: cleanSection,
        semester: sem,
        class_code: classCode
      }
    };
  }

  async updateClass(id, { name, section, semester }) {
    const cleanName = name.trim();
    const cleanSection = section.trim();
    const sem = semester && semester.trim() ? semester.trim() : 'Semester 1';
    const semSlug = sem.replace(/\s+/g, '');
    const classCode = `${cleanName.replace(/\s+/g, '')}-${cleanSection.replace(/\s+/g, '')}-${semSlug}`.toUpperCase();

    // Check duplicate among other classes
    const existing = await this.db.collection(COLL.CLASSES)
      .where('name', '==', cleanName)
      .where('section', '==', cleanSection)
      .where('semester', '==', sem)
      .get();

    const isDuplicate = existing.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      return { success: false, message: 'Another class with same name, section, and semester exists' };
    }

    await this.db.collection(COLL.CLASSES).doc(id).update({
      name: cleanName,
      section: cleanSection,
      semester: sem,
      class_code: classCode,
      updated_at: new Date().toISOString()
    });

    return { success: true };
  }

  async deleteClass(id) {
    const batch = this.db.batch();

    // 1. Delete associated results
    const results = await this.db.collection(COLL.RESULTS).where('class_id', '==', id).get();
    results.docs.forEach(doc => batch.delete(doc.ref));

    // 2. Delete enrolled students
    const students = await this.db.collection(COLL.STUDENTS).where('class_id', '==', id).get();
    students.docs.forEach(doc => batch.delete(doc.ref));

    // 3. Delete combinations
    const combs = await this.db.collection(COLL.COMBINATIONS).where('class_id', '==', id).get();
    combs.docs.forEach(doc => batch.delete(doc.ref));

    // 4. Delete class document
    batch.delete(this.db.collection(COLL.CLASSES).doc(id));

    await batch.commit();
    return { success: true, message: 'Class and all associated records deleted successfully.' };
  }

  // =========================================================================
  // 3. SUBJECTS CRUD
  // =========================================================================
  async getSubjects() {
    const snapshot = await this.db.collection(COLL.SUBJECTS).orderBy('name', 'asc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async addSubject({ name, code, subjectType, credits, maxMarks, passMarks }) {
    const upperCode = code.toUpperCase().replace(/\s+/g, '');
    const type = subjectType && subjectType.trim() ? subjectType.trim() : 'Theory';
    const parsedCred = parseInt(credits);
    const cred = !isNaN(parsedCred) && parsedCred >= 1 && parsedCred <= 6 ? parsedCred : 4;
    const max = parseInt(maxMarks) || 100;
    const pass = parseInt(passMarks) || 33;

    const existing = await this.db.collection(COLL.SUBJECTS)
      .where('subject_code', '==', upperCode)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, message: `Subject code ${upperCode} already exists` };
    }

    const docRef = await this.db.collection(COLL.SUBJECTS).add({
      name: name.trim(),
      subject_code: upperCode,
      subject_type: type,
      credits: cred,
      max_marks: max,
      pass_marks: pass,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      subject: {
        id: docRef.id,
        name: name.trim(),
        subject_code: upperCode,
        subject_type: type,
        credits: cred,
        max_marks: max,
        pass_marks: pass
      }
    };
  }

  async updateSubject(id, { name, code, subjectType, credits, maxMarks, passMarks }) {
    const upperCode = code.toUpperCase().replace(/\s+/g, '');
    const type = subjectType && subjectType.trim() ? subjectType.trim() : 'Theory';
    const parsedCred = parseInt(credits);
    const cred = !isNaN(parsedCred) && parsedCred >= 1 && parsedCred <= 6 ? parsedCred : 4;
    const max = parseInt(maxMarks) || 100;
    const pass = parseInt(passMarks) || 33;

    const existing = await this.db.collection(COLL.SUBJECTS)
      .where('subject_code', '==', upperCode)
      .get();

    const isDuplicate = existing.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      return { success: false, message: `Another subject with code ${upperCode} exists` };
    }

    await this.db.collection(COLL.SUBJECTS).doc(id).update({
      name: name.trim(),
      subject_code: upperCode,
      subject_type: type,
      credits: cred,
      max_marks: max,
      pass_marks: pass,
      updated_at: new Date().toISOString()
    });

    return { success: true };
  }

  async deleteSubject(id) {
    const batch = this.db.batch();

    // Delete combinations referencing this subject
    const combs = await this.db.collection(COLL.COMBINATIONS).where('subject_id', '==', id).get();
    combs.docs.forEach(doc => batch.delete(doc.ref));

    // Delete subject
    batch.delete(this.db.collection(COLL.SUBJECTS).doc(id));

    await batch.commit();
    return { success: true, message: 'Subject and associated records deleted successfully.' };
  }

  // =========================================================================
  // 4. SUBJECT COMBINATIONS
  // =========================================================================
  async getCombinations() {
    const [combsSnap, classesSnap, subjectsSnap] = await Promise.all([
      this.db.collection(COLL.COMBINATIONS).get(),
      this.db.collection(COLL.CLASSES).get(),
      this.db.collection(COLL.SUBJECTS).get()
    ]);

    const classesMap = {};
    classesSnap.docs.forEach(d => { classesMap[d.id] = d.data(); });

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });

    return combsSnap.docs.map(doc => {
      const data = doc.data();
      const cls = classesMap[data.class_id] || {};
      const sub = subjectsMap[data.subject_id] || {};

      const sem = cls.semester || 'Semester 1';
      const className = cls.name ? `${cls.name} (${cls.section || ''} - ${sem})` : 'Unknown Class';

      return {
        id: doc.id,
        class_id: data.class_id,
        subject_id: data.subject_id,
        status: data.status || 'Active',
        className,
        subjectName: sub.name || 'Unknown Subject',
        subjectCode: sub.subject_code || ''
      };
    });
  }

  async addCombination({ classId, subjectId }) {
    const existing = await this.db.collection(COLL.COMBINATIONS)
      .where('class_id', '==', String(classId))
      .where('subject_id', '==', String(subjectId))
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, message: 'Subject combination already linked to class' };
    }

    await this.db.collection(COLL.COMBINATIONS).add({
      class_id: String(classId),
      subject_id: String(subjectId),
      status: 'Active',
      created_at: new Date().toISOString()
    });

    return { success: true };
  }

  async toggleCombination(id) {
    const docRef = this.db.collection(COLL.COMBINATIONS).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { success: false, message: 'Combination not found' };
    }

    const currentStatus = doc.data().status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    await docRef.update({
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    return { success: true, status: newStatus };
  }

  async deleteCombination(id) {
    await this.db.collection(COLL.COMBINATIONS).doc(id).delete();
    return { success: true };
  }

  async getActiveSubjectsForClass(classId) {
    const combsSnap = await this.db.collection(COLL.COMBINATIONS)
      .where('class_id', '==', String(classId))
      .where('status', '==', 'Active')
      .get();

    if (combsSnap.empty) return [];

    const subjectIds = combsSnap.docs.map(d => d.data().subject_id);
    const subjectsSnap = await this.db.collection(COLL.SUBJECTS).get();

    return subjectsSnap.docs
      .filter(d => subjectIds.includes(d.id))
      .map(d => ({ id: d.id, ...d.data() }));
  }

  // =========================================================================
  // 5. STUDENTS CRUD
  // =========================================================================
  async getStudents() {
    const [studentsSnap, classesSnap] = await Promise.all([
      this.db.collection(COLL.STUDENTS).orderBy('roll_id', 'asc').get(),
      this.db.collection(COLL.CLASSES).get()
    ]);

    const classesMap = {};
    classesSnap.docs.forEach(d => { classesMap[d.id] = d.data(); });

    return studentsSnap.docs.map(doc => {
      const data = doc.data();
      const cls = classesMap[data.class_id] || {};
      const sem = cls.semester || 'Semester 1';
      const className = cls.name ? `${cls.name} - Section ${cls.section} (${sem})` : 'Unassigned';

      return {
        id: doc.id,
        ...data,
        className
      };
    });
  }

  async addStudent({ rollId, name, classId, gender, dob, email, mobile, status }) {
    const cleanRoll = rollId.trim();

    const existing = await this.db.collection(COLL.STUDENTS)
      .where('roll_id', '==', cleanRoll)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, message: `A student with Roll ID "${cleanRoll}" is already registered.` };
    }

    await this.db.collection(COLL.STUDENTS).add({
      roll_id: cleanRoll,
      name: name.trim(),
      class_id: String(classId),
      gender: gender || 'Other',
      dob: dob || '',
      email: (email || '').trim(),
      mobile: (mobile || '').trim(),
      status: status || 'Active',
      created_at: new Date().toISOString()
    });

    return { success: true };
  }

  async updateStudent(id, { rollId, name, classId, gender, dob, email, mobile, status }) {
    const cleanRoll = rollId.trim();

    const existing = await this.db.collection(COLL.STUDENTS)
      .where('roll_id', '==', cleanRoll)
      .get();

    const isDuplicate = existing.docs.some(doc => doc.id !== id);
    if (isDuplicate) {
      return { success: false, message: `Another student with Roll ID "${cleanRoll}" exists.` };
    }

    await this.db.collection(COLL.STUDENTS).doc(id).update({
      roll_id: cleanRoll,
      name: name.trim(),
      class_id: String(classId),
      gender: gender || 'Other',
      dob: dob || '',
      email: (email || '').trim(),
      mobile: (mobile || '').trim(),
      status: status || 'Active',
      updated_at: new Date().toISOString()
    });

    return { success: true };
  }

  async deleteStudent(id) {
    const batch = this.db.batch();

    // Delete student results
    const results = await this.db.collection(COLL.RESULTS).where('student_id', '==', id).get();
    results.docs.forEach(doc => batch.delete(doc.ref));

    // Delete student doc
    batch.delete(this.db.collection(COLL.STUDENTS).doc(id));

    await batch.commit();
    return { success: true, message: 'Student and associated results deleted.' };
  }

  async getStudentsWithoutResult(classId) {
    const [studentsSnap, resultsSnap] = await Promise.all([
      this.db.collection(COLL.STUDENTS)
        .where('class_id', '==', String(classId))
        .where('status', '==', 'Active')
        .get(),
      this.db.collection(COLL.RESULTS).where('class_id', '==', String(classId)).get()
    ]);

    const resultStudentIds = new Set(resultsSnap.docs.map(d => String(d.data().student_id)));

    return studentsSnap.docs
      .filter(d => !resultStudentIds.has(d.id))
      .map(d => ({ id: d.id, ...d.data() }));
  }

  // =========================================================================
  // 6. RESULTS CRUD
  // =========================================================================
  async getResults() {
    const [resultsSnap, studentsSnap, classesSnap, subjectsSnap] = await Promise.all([
      this.db.collection(COLL.RESULTS).get(),
      this.db.collection(COLL.STUDENTS).get(),
      this.db.collection(COLL.CLASSES).get(),
      this.db.collection(COLL.SUBJECTS).get()
    ]);

    const studentsMap = {};
    studentsSnap.docs.forEach(d => { studentsMap[d.id] = d.data(); });

    const classesMap = {};
    classesSnap.docs.forEach(d => { classesMap[d.id] = d.data(); });

    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = d.data(); });

    return resultsSnap.docs.map(doc => {
      const data = doc.data();
      const student = studentsMap[data.student_id] || {};
      const cls = classesMap[data.class_id] || {};
      const sem = cls.semester || 'Semester 1';
      const className = cls.name ? `${cls.name} (${cls.section || ''} - ${sem})` : 'Unknown Class';

      const marksMap = data.marks || {};
      let totalMax = 0;
      let totalObtained = 0;
      let failCount = 0;

      for (const [subjId, obtained] of Object.entries(marksMap)) {
        const sub = subjectsMap[subjId] || { max_marks: 100, pass_marks: 33 };
        const max = sub.max_marks || 100;
        const pass = sub.pass_marks || 33;
        const obt = parseFloat(obtained) || 0;

        totalMax += max;
        totalObtained += obt;
        if (obt < pass) {
          failCount++;
        }
      }

      const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
      let status = 'PASS';
      if (failCount > 0) status = failCount === 1 ? 'PROMOTED' : 'FAIL';

      let overallGrade = 'F';
      if (status !== 'FAIL') {
        if (percentage >= 90) overallGrade = 'A+';
        else if (percentage >= 80) overallGrade = 'A';
        else if (percentage >= 70) overallGrade = 'B+';
        else if (percentage >= 60) overallGrade = 'B';
        else if (percentage >= 50) overallGrade = 'C';
        else if (percentage >= 33) overallGrade = 'D';
      }

      return {
        id: doc.id,
        studentId: data.student_id,
        rollId: student.roll_id || '',
        classId: data.class_id,
        studentName: student.name || 'Unknown Student',
        className,
        declaredAt: data.declared_at || '',
        marks: marksMap,
        summary: {
          totalMax,
          totalObtained,
          percentage,
          status,
          overallGrade
        }
      };
    });
  }

  async addResult({ studentId, classId, rollId, marks }) {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.db.collection(COLL.RESULTS)
      .where('student_id', '==', String(studentId))
      .limit(1)
      .get();

    if (!existing.empty) {
      return { success: false, message: 'Result already declared for this student.' };
    }

    // Convert string numeric marks to numbers
    const cleanMarks = {};
    for (const [sId, obt] of Object.entries(marks || {})) {
      cleanMarks[sId] = parseFloat(obt) || 0;
    }

    await this.db.collection(COLL.RESULTS).add({
      student_id: String(studentId),
      class_id: String(classId),
      roll_id: rollId || '',
      declared_at: today,
      marks: cleanMarks,
      created_at: new Date().toISOString()
    });

    return { success: true };
  }

  async updateResult(id, { marks }) {
    const today = new Date().toISOString().split('T')[0];

    const cleanMarks = {};
    for (const [sId, obt] of Object.entries(marks || {})) {
      cleanMarks[sId] = parseFloat(obt) || 0;
    }

    await this.db.collection(COLL.RESULTS).doc(id).update({
      declared_at: today,
      marks: cleanMarks,
      updated_at: new Date().toISOString()
    });

    return { success: true };
  }

  async deleteResult(id) {
    await this.db.collection(COLL.RESULTS).doc(id).delete();
    return { success: true, message: 'Result deleted successfully.' };
  }

  // =========================================================================
  // 7. STUDENT RESULT PUBLIC SEARCH
  // =========================================================================
  async searchStudentResult(rollId, classId) {
    const cleanRoll = rollId.trim();

    // 1. Find Student by Roll ID and Class ID
    const studentSnap = await this.db.collection(COLL.STUDENTS)
      .where('roll_id', '==', cleanRoll)
      .where('class_id', '==', String(classId))
      .limit(1)
      .get();

    if (studentSnap.empty) {
      return { success: false, status: 404, message: 'No student profile matches this roll number in the selected class' };
    }

    const studentDoc = studentSnap.docs[0];
    const studentData = studentDoc.data();

    if (studentData.status !== 'Active') {
      return { success: false, status: 403, message: 'This student file is inactive. Contact administration.' };
    }

    // 2. Fetch Class Details
    const classDoc = await this.db.collection(COLL.CLASSES).doc(String(classId)).get();
    const classData = classDoc.exists ? classDoc.data() : {};
    const sem = classData.semester || 'Semester 1';
    const className = `${classData.name || 'Class'} (${classData.section || ''} - ${sem})`;

    // 3. Find Result Document
    const resultSnap = await this.db.collection(COLL.RESULTS)
      .where('student_id', '==', studentDoc.id)
      .limit(1)
      .get();

    if (resultSnap.empty) {
      return { success: false, status: 404, message: 'Results have not been declared yet for this student.' };
    }

    const resultData = resultSnap.docs[0].data();
    const marksMap = resultData.marks || {};

    // 4. Fetch Subjects
    const subjectsSnap = await this.db.collection(COLL.SUBJECTS).get();
    const subjectsMap = {};
    subjectsSnap.docs.forEach(d => { subjectsMap[d.id] = { id: d.id, ...d.data() }; });

    let totalMax = 0;
    let totalObtained = 0;
    let failCount = 0;
    const subjectsDetails = [];

    for (const [subjId, obtained] of Object.entries(marksMap)) {
      const sub = subjectsMap[subjId] || { name: 'Subject', subject_code: 'SUB', max_marks: 100, pass_marks: 33 };
      const max = sub.max_marks || 100;
      const pass = sub.pass_marks || 33;
      const obt = parseFloat(obtained) || 0;

      totalMax += max;
      totalObtained += obt;
      const failed = obt < pass;
      if (failed) failCount++;

      const pct = max > 0 ? (obt / max) * 100 : 0;
      let grade = 'F';
      if (pct >= 91) grade = 'A1';
      else if (pct >= 81) grade = 'A2';
      else if (pct >= 71) grade = 'B1';
      else if (pct >= 61) grade = 'B2';
      else if (pct >= 51) grade = 'C1';
      else if (pct >= 41) grade = 'C2';
      else if (pct >= 33) grade = 'D';

      subjectsDetails.push({
        subjectId: subjId,
        name: sub.name,
        code: sub.subject_code,
        max,
        pass,
        obtained: obt,
        grade,
        isFailed: failed
      });
    }

    const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    let status = 'PASS';
    if (failCount > 0) status = failCount === 1 ? 'PROMOTED' : 'FAIL';

    let overallGrade = 'F';
    if (status !== 'FAIL') {
      if (percentage >= 90) overallGrade = 'A+';
      else if (percentage >= 80) overallGrade = 'A';
      else if (percentage >= 70) overallGrade = 'B+';
      else if (percentage >= 60) overallGrade = 'B';
      else if (percentage >= 50) overallGrade = 'C';
      else if (percentage >= 33) overallGrade = 'D';
    }

    return {
      success: true,
      student: {
        name: studentData.name,
        rollId: studentData.roll_id,
        gender: studentData.gender,
        dob: studentData.dob,
        email: studentData.email,
        mobile: studentData.mobile,
        className
      },
      evaluation: {
        totalMax,
        totalObtained,
        percentage,
        status,
        overallGrade,
        subjects: subjectsDetails
      },
      declaredAt: resultData.declared_at
    };
  }

  // =========================================================================
  // 8. NOTICES CRUD
  // =========================================================================
  async getNotices() {
    const snapshot = await this.db.collection(COLL.NOTICES).get();
    const notices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        isPinned: !!data.is_pinned
      };
    });

    // Sort pinned first, then newest
    return notices.sort((a, b) => {
      if (b.isPinned !== a.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }

  async addNotice({ title, content, category, target, isPinned }) {
    const today = new Date().toISOString().split('T')[0];

    await this.db.collection(COLL.NOTICES).add({
      title: title.trim(),
      content: content.trim(),
      category: category || 'General',
      target: target || 'All',
      is_pinned: isPinned ? 1 : 0,
      created_at: today
    });

    return { success: true };
  }

  async deleteNotice(id) {
    await this.db.collection(COLL.NOTICES).doc(id).delete();
    return { success: true };
  }

  // =========================================================================
  // 9. DASHBOARD STATS
  // =========================================================================
  async getDashboardStats() {
    const [students, classes, subjects, results, notices] = await Promise.all([
      this.getStudents(),
      this.getClasses(),
      this.getSubjects(),
      this.getResults(),
      this.getNotices()
    ]);

    const totalResults = results.length;
    const passedCount = results.filter(r => r.summary.status === 'PASS' || r.summary.status === 'PROMOTED').length;
    const passRate = totalResults > 0 ? parseFloat(((passedCount / totalResults) * 100).toFixed(1)) : 0;

    // Toppers
    const toppers = results
      .filter(r => r.summary.status === 'PASS')
      .sort((a, b) => b.summary.percentage - a.summary.percentage)
      .slice(0, 5)
      .map(r => ({
        studentName: r.studentName,
        rollId: r.rollId,
        className: r.className,
        percentage: r.summary.percentage,
        status: r.summary.status
      }));

    // Class Performance Breakdown
    const classPerformance = classes.map(c => {
      const sem = c.semester || 'Semester 1';
      const classCodeName = `${c.name} (${c.section} - ${sem})`;
      const classResults = results.filter(r => String(r.classId) === String(c.id));
      const passed = classResults.filter(r => r.summary.status === 'PASS' || r.summary.status === 'PROMOTED').length;
      const failed = classResults.length - passed;
      const rate = classResults.length > 0 ? Math.round((passed / classResults.length) * 100) : 0;

      return {
        className: classCodeName,
        total: classResults.length,
        passed,
        failed,
        passRate: rate
      };
    });

    return {
      cards: {
        totalStudents: students.length,
        totalClasses: classes.length,
        totalSubjects: subjects.length,
        declaredResults: results.length,
        activeNotices: notices.length,
        passRate
      },
      toppers,
      classPerformance
    };
  }

  // =========================================================================
  // 10. BACKUP, RESTORE & RESET
  // =========================================================================
  async exportBackup() {
    const [adminsSnap, classesSnap, subjectsSnap, combsSnap, studentsSnap, resultsSnap, noticesSnap] = await Promise.all([
      this.db.collection(COLL.ADMINS).get(),
      this.db.collection(COLL.CLASSES).get(),
      this.db.collection(COLL.SUBJECTS).get(),
      this.db.collection(COLL.COMBINATIONS).get(),
      this.db.collection(COLL.STUDENTS).get(),
      this.db.collection(COLL.RESULTS).get(),
      this.db.collection(COLL.NOTICES).get()
    ]);

    return {
      admins: adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      classes: classesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      subjects: subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      combinations: combsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      students: studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      results: resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      notices: noticesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  }

  async resetDatabase() {
    const collections = [COLL.ADMINS, COLL.CLASSES, COLL.SUBJECTS, COLL.COMBINATIONS, COLL.STUDENTS, COLL.RESULTS, COLL.NOTICES];
    
    for (const colName of collections) {
      const snap = await this.db.collection(colName).get();
      const batch = this.db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return { success: true };
  }
}

module.exports = new FirebaseService();
