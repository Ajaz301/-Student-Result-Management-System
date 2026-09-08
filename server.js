/**
 * AcademiaSync - Node.js Express Server Backend
 * Supports Google Cloud Firebase Firestore as well as SQLite fallback mode.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const { initFirebase, isFirebaseReady, getFirebaseStatus } = require('./firebaseAdmin');
const firebaseService = require('./firebaseService');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel serverless environment support for SQLite database
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION || !!process.env.VERCEL_ENV;
let DB_FILE = path.join(__dirname, 'database.db');
if (isVercel) {
  const tmpDb = path.join('/tmp', 'database.db');
  if (!fs.existsSync(tmpDb) && fs.existsSync(DB_FILE)) {
    try {
      fs.copyFileSync(DB_FILE, tmpDb);
    } catch (e) {
      console.warn("Could not copy database to /tmp:", e.message);
    }
  }
  DB_FILE = tmpDb;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files directly from workspace

// Initialize Firebase Admin (if serviceAccountKey.json is available)
const fbInitResult = initFirebase();
const USE_FIREBASE = isFirebaseReady();

console.log('---------------------------------------------------');
if (USE_FIREBASE) {
  console.log('🔥 Active Database Engine: Google Cloud Firebase Firestore');
} else {
  console.log('📦 Active Database Engine: SQLite (Local Fallback)');
  console.log('💡 Note: Place "serviceAccountKey.json" in root to activate Firebase.');
}
console.log('---------------------------------------------------');

// Health / Status Check Endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mode: isFirebaseReady() ? 'Firebase Cloud Firestore' : 'SQLite Local',
    time: new Date().toISOString()
  });
});

// SQLite connection (always active as primary engine or zero-downtime local fallback)
let sqliteDb = null;
sqliteDb = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("Database connection failure:", err.message);
  } else {
    console.log("Connected to SQLite Database:", DB_FILE);
    initializeDatabaseSchema();
  }
});

/**
 * -------------------------------------------------------------------------
 * SQLITE SCHEMA INITIALIZATION & SEED DATA (FALLBACK)
 * -------------------------------------------------------------------------
 */
function initializeDatabaseSchema() {
  if (!sqliteDb) return;
  sqliteDb.serialize(() => {
    // 1. Admins Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Classes Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      section TEXT NOT NULL,
      semester TEXT DEFAULT 'Semester 1',
      class_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDb.run(`ALTER TABLE classes ADD COLUMN semester TEXT DEFAULT 'Semester 1'`, (err) => {
      sqliteDb.run("UPDATE classes SET semester = 'Semester 1' WHERE semester IS NULL OR semester = ''", () => {});
    });

    // 3. Subjects Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject_code TEXT UNIQUE NOT NULL,
      subject_type TEXT DEFAULT 'Theory',
      credits INTEGER DEFAULT 4,
      max_marks INTEGER DEFAULT 100,
      pass_marks INTEGER DEFAULT 33,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDb.run(`ALTER TABLE subjects ADD COLUMN subject_type TEXT DEFAULT 'Theory'`, () => {});
    sqliteDb.run(`ALTER TABLE subjects ADD COLUMN credits INTEGER DEFAULT 4`, () => {});

    // 4. Subject Combinations Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS subject_combinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(class_id, subject_id)
    )`);

    // 5. Students Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      gender TEXT,
      dob TEXT,
      email TEXT UNIQUE,
      mobile TEXT,
      status TEXT DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
    )`);

    // 6. Results Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER UNIQUE NOT NULL,
      class_id INTEGER NOT NULL,
      declared_at TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )`);

    // 7. Result Marks Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS result_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      marks_obtained REAL NOT NULL,
      FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(result_id, subject_id)
    )`);

    // 8. Notices Table
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      target TEXT DEFAULT 'All',
      is_pinned INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check if database needs seeding or BCA data addition
    sqliteDb.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
      if (row && row.count === 0) {
        seedInitialDemoData();
      } else {
        ensureBCAProgramData();
      }
    });
  });
}

function seedInitialDemoData() {
  if (!sqliteDb) return;
  console.log("Seeding initial demo data to SQLite database...");
  sqliteDb.serialize(() => {
    sqliteDb.run(`INSERT INTO admins (username, password, name, email) 
      VALUES ('admin', 'admin123', 'School Administrator', 'admin@srms-edu.org')`);

    sqliteDb.run(`INSERT INTO classes (name, section, semester, class_code) VALUES 
      ('Class 10', 'A', 'Semester 1', '10-A-SEM1'),
      ('Class 10', 'B', 'Semester 2', '10-B-SEM2'),
      ('Class 11', 'Science-A', 'Semester 3', '11-SCI-SEM3'),
      ('Class 12', 'Commerce-A', 'Semester 5', '12-COM-SEM5')`);

    sqliteDb.run(`INSERT INTO subjects (name, subject_code, max_marks, pass_marks) VALUES 
      ('Mathematics', 'MATH101', 100, 33),
      ('Science', 'SCI101', 100, 33),
      ('Social Studies', 'SST101', 100, 33),
      ('English Core', 'ENG101', 100, 33),
      ('Physics', 'PHY201', 100, 33),
      ('Chemistry', 'CHEM201', 100, 33),
      ('Accountancy', 'ACC301', 100, 33),
      ('Business Studies', 'BST301', 100, 33)`);

    sqliteDb.run(`INSERT INTO subject_combinations (class_id, subject_id, status) VALUES 
      (1, 1, 'Active'), (1, 2, 'Active'), (1, 3, 'Active'), (1, 4, 'Active'),
      (2, 1, 'Active'), (2, 2, 'Active'), (2, 3, 'Active'), (2, 4, 'Active'),
      (3, 4, 'Active'), (3, 5, 'Active'), (3, 6, 'Active'), (3, 1, 'Active'),
      (4, 4, 'Active'), (4, 7, 'Active'), (4, 8, 'Active'), (4, 1, 'Active')`);

    sqliteDb.run(`INSERT INTO students (roll_id, name, class_id, gender, dob, email, mobile, status) VALUES 
      ('1001', 'Rahul Sharma', 1, 'Male', '2011-05-12', 'rahul.sharma@example.com', '9876543210', 'Active'),
      ('1002', 'Aditi Verma', 1, 'Female', '2011-09-20', 'aditi.verma@example.com', '9876543211', 'Active'),
      ('1021', 'Amit Patel', 2, 'Male', '2011-02-14', 'amit.patel@example.com', '9876543212', 'Active'),
      ('1101', 'Vikram Singh', 3, 'Male', '2010-11-05', 'vikram.singh@example.com', '9876543213', 'Active'),
      ('1102', 'Priya Das', 3, 'Female', '2010-08-18', 'priya.das@example.com', '9876543214', 'Active'),
      ('1201', 'Sneha Gupta', 4, 'Female', '2009-04-25', 'sneha.gupta@example.com', '9876543215', 'Active')`);

    sqliteDb.run(`INSERT INTO results (student_id, class_id, declared_at) VALUES 
      (1, 1, '2026-08-28'),
      (2, 1, '2026-08-28'),
      (4, 3, '2026-08-28'),
      (5, 3, '2026-08-28')`);

    sqliteDb.run(`INSERT INTO result_marks (result_id, subject_id, marks_obtained) VALUES 
      (1, 1, 85.00), (1, 2, 90.00), (1, 3, 78.00), (1, 4, 88.00),
      (2, 1, 92.00), (2, 2, 95.00), (2, 3, 89.00), (2, 4, 91.00),
      (3, 4, 75.00), (3, 5, 82.00), (3, 6, 79.00), (3, 1, 88.00),
      (4, 4, 45.00), (4, 5, 31.00), (4, 6, 55.00), (4, 1, 35.00)`);

    sqliteDb.run(`INSERT INTO notices (title, content, category, target, is_pinned, created_at) VALUES 
      ('Final Term Examinations Schedule', 'The final term examinations for academic session 2026-27 will commence from September 18th, 2026. Please collect your admit cards from the administrative desk by September 10th. Make sure all library dues are cleared.', 'Examination', 'All', 1, '2026-08-25'),
      ('Mid-Term Results Declared', 'The Mid-Term examination results for Classes 10th and 11th have been declared. Students can search and download their marksheets using their valid Roll IDs. For correction in student bio details, contact office admin.', 'Result', 'All', 0, '2026-08-28'),
      ('Inter-School Science Fair 2026', 'Interested students from classes 9th to 12th can register for the Annual Inter-School Science & Technology Fair. Registrations close on September 5th. Projects will be mentored by science teachers.', 'Event', 'Students', 0, '2026-08-20')`);
  
    ensureBCAProgramData();
  });
}

function ensureBCAProgramData() {
  if (!sqliteDb) return;
  sqliteDb.get("SELECT COUNT(*) as count FROM classes WHERE name = 'BCA'", (err, row) => {
    if (err) return console.error("Error checking BCA classes:", err.message);
    if (row && row.count >= 8) {
      return; // Already initialized
    }
    console.log("🎓 Provisioning complete BCA 1st to 8th Semester curriculum into database...");

    sqliteDb.serialize(() => {
      // 1. Insert 8 BCA Semesters
      const bcaClasses = [
        ['BCA', 'Section A', 'Semester 1', 'BCA-A-SEM1'],
        ['BCA', 'Section A', 'Semester 2', 'BCA-A-SEM2'],
        ['BCA', 'Section A', 'Semester 3', 'BCA-A-SEM3'],
        ['BCA', 'Section A', 'Semester 4', 'BCA-A-SEM4'],
        ['BCA', 'Section A', 'Semester 5', 'BCA-A-SEM5'],
        ['BCA', 'Section A', 'Semester 6', 'BCA-A-SEM6'],
        ['BCA', 'Section A', 'Semester 7', 'BCA-A-SEM7'],
        ['BCA', 'Section A', 'Semester 8', 'BCA-A-SEM8']
      ];

      const classStmt = sqliteDb.prepare("INSERT OR IGNORE INTO classes (name, section, semester, class_code) VALUES (?, ?, ?, ?)");
      bcaClasses.forEach(c => classStmt.run(c[0], c[1], c[2], c[3]));
      classStmt.finalize();

      // 2. Insert BCA Subjects
      const bcaSubjects = [
        // Semester 1
        ['Programming Fundamentals using C', 'BCA101', 'Theory', 4, 100, 33],
        ['Computer Fundamentals & Information Tech', 'BCA102', 'Theory', 4, 100, 33],
        ['Digital Electronics & Logic Design', 'BCA103', 'Theory', 4, 100, 33],
        ['Discrete Mathematics & Linear Algebra', 'BCA104', 'Theory', 4, 100, 33],
        ['Professional Communication & Soft Skills', 'BCA105', 'Theory', 3, 100, 33],
        ['C Programming & Linux Lab', 'BCA106', 'Practical / Lab', 2, 100, 33],

        // Semester 2
        ['Object Oriented Programming with C++', 'BCA201', 'Theory', 4, 100, 33],
        ['Data Structures & Algorithms', 'BCA202', 'Theory', 4, 100, 33],
        ['Operating Systems Principles', 'BCA203', 'Theory', 4, 100, 33],
        ['Numerical Methods & Statistical Techniques', 'BCA204', 'Theory', 4, 100, 33],
        ['Environmental Science & Cyber Ethics', 'BCA205', 'Theory', 3, 100, 33],
        ['Data Structures & C++ Lab', 'BCA206', 'Practical / Lab', 2, 100, 33],

        // Semester 3
        ['Database Management Systems (DBMS)', 'BCA301', 'Theory', 4, 100, 33],
        ['Core Java Programming', 'BCA302', 'Theory', 4, 100, 33],
        ['Computer Networks & Data Communication', 'BCA303', 'Theory', 4, 100, 33],
        ['Software Engineering & Agile Methodologies', 'BCA304', 'Theory', 4, 100, 33],
        ['Financial Accounting & Management', 'BCA305', 'Theory', 3, 100, 33],
        ['Oracle SQL & Core Java Lab', 'BCA306', 'Practical / Lab', 2, 100, 33],

        // Semester 4
        ['Advanced Java & Enterprise Frameworks', 'BCA401', 'Theory', 4, 100, 33],
        ['Python Programming & Data Handling', 'BCA402', 'Theory', 4, 100, 33],
        ['Web Technologies (HTML5/CSS3/JavaScript/React)', 'BCA403', 'Theory', 4, 100, 33],
        ['Design & Analysis of Algorithms (DAA)', 'BCA404', 'Theory', 4, 100, 33],
        ['Computer Graphics & Multimedia Systems', 'BCA405', 'Theory', 3, 100, 33],
        ['Web Development & Python Scripting Lab', 'BCA406', 'Practical / Lab', 2, 100, 33],

        // Semester 5
        ['Cloud Computing & Virtualization', 'BCA501', 'Theory', 4, 100, 33],
        ['Information & Cyber Security', 'BCA502', 'Theory', 4, 100, 33],
        ['Full-Stack Web Development (Node.js/Express)', 'BCA503', 'Theory', 4, 100, 33],
        ['Data Warehousing & Business Intelligence', 'BCA504', 'Theory', 4, 100, 33],
        ['Mobile Application Development (Flutter/Android)', 'BCA505', 'Theory', 4, 100, 33],
        ['Cloud & Mobile App Development Lab', 'BCA506', 'Practical / Lab', 2, 100, 33],

        // Semester 6
        ['Artificial Intelligence & Machine Learning', 'BCA601', 'Theory', 4, 100, 33],
        ['Internet of Things (IoT) & Smart Devices', 'BCA602', 'Theory', 4, 100, 33],
        ['Software Testing & Quality Assurance (QA)', 'BCA603', 'Theory', 4, 100, 33],
        ['Big Data Analytics with Hadoop & Spark', 'BCA604', 'Theory', 4, 100, 33],
        ['Major Project & Industrial Training Phase I', 'BCA605', 'Project / Viva', 6, 100, 33],

        // Semester 7
        ['DevOps, CI/CD & Kubernetes', 'BCA701', 'Theory', 4, 100, 33],
        ['Blockchain Technology & Smart Contracts', 'BCA702', 'Theory', 4, 100, 33],
        ['Deep Learning & Computer Vision', 'BCA703', 'Theory', 4, 100, 33],
        ['Distributed Systems & Microservices Architecture', 'BCA704', 'Theory', 4, 100, 33],
        ['Research Methodology & Technical Paper Writing', 'BCA705', 'Core', 3, 100, 33],

        // Semester 8
        ['Capstone Industrial Internship / Major Project', 'BCA801', 'Project / Viva', 10, 100, 33],
        ['Quantum Computing & Next-Gen Technologies', 'BCA802', 'Theory', 4, 100, 33],
        ['IT Entrepreneurship, IPR & Startup Management', 'BCA803', 'Theory', 3, 100, 33],
        ['Comprehensive Viva-Voce & Dissertation Defense', 'BCA804', 'Project / Viva', 4, 100, 33]
      ];

      const subjStmt = sqliteDb.prepare("INSERT OR IGNORE INTO subjects (name, subject_code, subject_type, credits, max_marks, pass_marks) VALUES (?, ?, ?, ?, ?, ?)");
      bcaSubjects.forEach(s => subjStmt.run(s[0], s[1], s[2], s[3], s[4], s[5]));
      subjStmt.finalize();

      // 3. Map Subject Combinations for BCA 1st to 8th Sem
      const semSubjectMap = [
        { code: 'BCA-A-SEM1', subs: ['BCA101', 'BCA102', 'BCA103', 'BCA104', 'BCA105', 'BCA106'] },
        { code: 'BCA-A-SEM2', subs: ['BCA201', 'BCA202', 'BCA203', 'BCA204', 'BCA205', 'BCA206'] },
        { code: 'BCA-A-SEM3', subs: ['BCA301', 'BCA302', 'BCA303', 'BCA304', 'BCA305', 'BCA306'] },
        { code: 'BCA-A-SEM4', subs: ['BCA401', 'BCA402', 'BCA403', 'BCA404', 'BCA405', 'BCA406'] },
        { code: 'BCA-A-SEM5', subs: ['BCA501', 'BCA502', 'BCA503', 'BCA504', 'BCA505', 'BCA506'] },
        { code: 'BCA-A-SEM6', subs: ['BCA601', 'BCA602', 'BCA603', 'BCA604', 'BCA605'] },
        { code: 'BCA-A-SEM7', subs: ['BCA701', 'BCA702', 'BCA703', 'BCA704', 'BCA705'] },
        { code: 'BCA-A-SEM8', subs: ['BCA801', 'BCA802', 'BCA803', 'BCA804'] }
      ];

      semSubjectMap.forEach(item => {
        item.subs.forEach(subCode => {
          sqliteDb.run(`
            INSERT OR IGNORE INTO subject_combinations (class_id, subject_id, status)
            SELECT c.id, s.id, 'Active'
            FROM classes c, subjects s
            WHERE c.class_code = ? AND s.subject_code = ?
          `, [item.code, subCode]);
        });
      });

      // 4. Seed Demo BCA Students
      const bcaStudents = [
        ['BCA2601', 'Aryan Sharma', 'BCA-A-SEM1', 'Male', '2007-06-15', 'aryan.sharma@srms-edu.org', '9811223344', 'Active'],
        ['BCA2602', 'Tanvi Patel', 'BCA-A-SEM1', 'Female', '2007-09-22', 'tanvi.patel@srms-edu.org', '9811223345', 'Active'],
        ['BCA2501', 'Rohan Deshmukh', 'BCA-A-SEM2', 'Male', '2006-04-10', 'rohan.deshmukh@srms-edu.org', '9811223346', 'Active'],
        ['BCA2401', 'Ananya Iyer', 'BCA-A-SEM3', 'Female', '2005-11-03', 'ananya.iyer@srms-edu.org', '9811223347', 'Active'],
        ['BCA2301', 'Siddharth Verma', 'BCA-A-SEM4', 'Male', '2005-02-18', 'siddharth.verma@srms-edu.org', '9811223348', 'Active'],
        ['BCA2201', 'Meera Nambiar', 'BCA-A-SEM5', 'Female', '2004-07-29', 'meera.nambiar@srms-edu.org', '9811223349', 'Active'],
        ['BCA2101', 'Kabir Kapoor', 'BCA-A-SEM6', 'Male', '2003-12-14', 'kabir.kapoor@srms-edu.org', '9811223350', 'Active'],
        ['BCA2001', 'Diya Sengupta', 'BCA-A-SEM7', 'Female', '2003-05-08', 'diya.sengupta@srms-edu.org', '9811223351', 'Active'],
        ['BCA1901', 'Yashvardhan Roy', 'BCA-A-SEM8', 'Male', '2002-08-30', 'yash.roy@srms-edu.org', '9811223352', 'Active']
      ];

      bcaStudents.forEach(st => {
        sqliteDb.run(`
          INSERT OR IGNORE INTO students (roll_id, name, class_id, gender, dob, email, mobile, status)
          SELECT ?, ?, c.id, ?, ?, ?, ?, ?
          FROM classes c WHERE c.class_code = ?
        `, [st[0], st[1], st[3], st[4], st[5], st[6], st[7], st[2]]);
      });

      // 5. Seed Demo Results & Marks for Aryan Sharma (BCA2601) and Tanvi Patel (BCA2602)
      sqliteDb.get("SELECT id, class_id FROM students WHERE roll_id = 'BCA2601'", (e1, st1) => {
        if (st1) {
          sqliteDb.run("INSERT OR IGNORE INTO results (student_id, class_id, declared_at) VALUES (?, ?, '2026-08-28')", [st1.id, st1.class_id], function() {
            sqliteDb.get("SELECT id FROM results WHERE student_id = ?", [st1.id], (reErr, resRow) => {
              if (resRow) {
                const marksList = [
                  ['BCA101', 88.0], ['BCA102', 92.0], ['BCA103', 85.0],
                  ['BCA104', 79.0], ['BCA105', 90.0], ['BCA106', 95.0]
                ];
                marksList.forEach(m => {
                  sqliteDb.run(`
                    INSERT OR IGNORE INTO result_marks (result_id, subject_id, marks_obtained)
                    SELECT ?, s.id, ? FROM subjects s WHERE s.subject_code = ?
                  `, [resRow.id, m[1], m[0]]);
                });
              }
            });
          });
        }
      });

      sqliteDb.get("SELECT id, class_id FROM students WHERE roll_id = 'BCA2602'", (e2, st2) => {
        if (st2) {
          sqliteDb.run("INSERT OR IGNORE INTO results (student_id, class_id, declared_at) VALUES (?, ?, '2026-08-28')", [st2.id, st2.class_id], function() {
            sqliteDb.get("SELECT id FROM results WHERE student_id = ?", [st2.id], (reErr, resRow) => {
              if (resRow) {
                const marksList = [
                  ['BCA101', 94.0], ['BCA102', 96.0], ['BCA103', 91.0],
                  ['BCA104', 88.0], ['BCA105', 93.0], ['BCA106', 98.0]
                ];
                marksList.forEach(m => {
                  sqliteDb.run(`
                    INSERT OR IGNORE INTO result_marks (result_id, subject_id, marks_obtained)
                    SELECT ?, s.id, ? FROM subjects s WHERE s.subject_code = ?
                  `, [resRow.id, m[1], m[0]]);
                });
              }
            });
          });
        }
      });

      console.log("✔ BCA 1st to 8th Semester curriculum, subjects, combinations & demo students loaded!");
    });
  });
}

/**
 * -------------------------------------------------------------------------
 * RESTful API ENDPOINTS
 * -------------------------------------------------------------------------
 */

// --- 0. SYSTEM STATUS & ENGINE DETECTION ---
app.get('/api/status', (req, res) => {
  const fbStatus = getFirebaseStatus();
  res.json({
    engine: isFirebaseReady() ? 'Firebase Firestore' : 'SQLite Local',
    firebaseReady: isFirebaseReady(),
    firebaseConfigured: fbStatus.isConfigured,
    firebaseKeyPath: fbStatus.keyPath,
    firebaseError: fbStatus.error
  });
});

// --- 1. ADMIN AUTH ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  // 1. Try Firebase Firestore if initialized
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.verifyAdmin(cleanUsername, cleanPassword);
      if (result && result.success) {
        return res.json(result);
      }
    } catch (e) {
      console.warn('[Auth] Firebase authentication attempt error, checking local fallback:', e.message);
    }
  }

  // 2. Check SQLite Database
  if (sqliteDb) {
    return sqliteDb.get(
      "SELECT * FROM admins WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND password = ?",
      [cleanUsername, cleanUsername, cleanPassword],
      (err, row) => {
        if (err) {
          console.error('[Auth SQLite Error]', err.message);
        }
        if (row) {
          return res.json({ success: true, name: row.name, email: row.email, username: row.username });
        }
        // Check default demo credentials
        if ((cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'admin@srms-edu.org') && cleanPassword === 'admin123') {
          return res.json({ success: true, name: 'School Administrator', email: 'admin@srms-edu.org', username: 'admin' });
        }
        return res.status(401).json({ success: false, message: 'Invalid administrator username or password.' });
      }
    );
  }

  // 3. Fallback to default demo credentials
  if ((cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'admin@srms-edu.org') && cleanPassword === 'admin123') {
    return res.json({ success: true, name: 'School Administrator', email: 'admin@srms-edu.org', username: 'admin' });
  }

  return res.status(401).json({ success: false, message: 'Invalid administrator username or password.' });
});

app.post('/api/auth/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const cleanOld = (oldPassword || '').trim();
  const cleanNew = (newPassword || '').trim();

  if (!cleanOld || !cleanNew) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }

  let updatedInFirebase = false;
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.changePassword(cleanOld, cleanNew);
      if (result && result.success) {
        updatedInFirebase = true;
      }
    } catch (e) {
      console.warn('[Auth] Firebase changePassword error:', e.message);
    }
  }

  if (sqliteDb) {
    sqliteDb.get("SELECT * FROM admins WHERE password = ?", [cleanOld], (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!row && !updatedInFirebase) {
        return res.status(400).json({ success: false, message: 'Current password does not match' });
      }
      if (row) {
        sqliteDb.run("UPDATE admins SET password = ? WHERE id = ?", [cleanNew, row.id], (updateErr) => {
          if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
          return res.json({ success: true, message: 'Password updated successfully' });
        });
      } else {
        return res.json({ success: true, message: 'Password updated successfully' });
      }
    });
  } else {
    if (updatedInFirebase) {
      return res.json({ success: true, message: 'Password updated successfully' });
    }
    return res.status(400).json({ success: false, message: 'Current password does not match' });
  }
});

// --- 2. CLASSES CRUD ---
app.get('/api/classes', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const classes = await firebaseService.getClasses();
      if (classes && classes.length > 0) {
        return res.json(classes);
      }
    } catch (e) {
      console.warn('[Classes] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.all("SELECT * FROM classes", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

app.post('/api/classes', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addClass(req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Classes] Firebase addClass error, falling back to SQLite:', e.message);
    }
  }

  const { name, section, semester } = req.body;
  const sem = semester && semester.trim() ? semester.trim() : 'Semester 1';
  const semSlug = sem.replace(/\s+/g, '');
  const classCode = `${name.replace(/\s+/g, '')}-${section.replace(/\s+/g, '')}-${semSlug}`.toUpperCase();

  sqliteDb.get("SELECT * FROM classes WHERE name = ? AND section = ? AND semester = ?", [name.trim(), section.trim(), sem], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (row) {
      return res.status(400).json({ success: false, message: 'Class with this name, section, and semester already exists' });
    }

    sqliteDb.run("INSERT INTO classes (name, section, semester, class_code) VALUES (?, ?, ?, ?)", [name.trim(), section.trim(), sem, classCode], function (insertErr) {
      if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });
      res.json({ success: true, class: { id: this.lastID, name: name.trim(), section: section.trim(), semester: sem, class_code: classCode } });
    });
  });
});

app.put('/api/classes/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.updateClass(id, req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Classes] Firebase updateClass error, falling back to SQLite:', e.message);
    }
  }

  const { name, section, semester } = req.body;
  const sem = semester && semester.trim() ? semester.trim() : 'Semester 1';
  const semSlug = sem.replace(/\s+/g, '');
  const classCode = `${name.replace(/\s+/g, '')}-${section.replace(/\s+/g, '')}-${semSlug}`.toUpperCase();

  sqliteDb.get("SELECT * FROM classes WHERE name = ? AND section = ? AND semester = ? AND id != ?", [name.trim(), section.trim(), sem, id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (row) {
      return res.status(400).json({ success: false, message: 'Another class with same name, section, and semester exists' });
    }

    sqliteDb.run("UPDATE classes SET name = ?, section = ?, semester = ?, class_code = ? WHERE id = ?", [name.trim(), section.trim(), sem, classCode, id], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
      res.json({ success: true });
    });
  });
});

app.delete('/api/classes/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteClass(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Classes] Firebase deleteClass error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.serialize(() => {
    sqliteDb.run(`DELETE FROM result_marks WHERE result_id IN (
      SELECT id FROM results WHERE class_id = ? OR student_id IN (SELECT id FROM students WHERE class_id = ?)
    )`, [id, id]);

    sqliteDb.run(`DELETE FROM results WHERE class_id = ? OR student_id IN (SELECT id FROM students WHERE class_id = ?)`, [id, id]);
    sqliteDb.run(`DELETE FROM students WHERE class_id = ?`, [id]);
    sqliteDb.run(`DELETE FROM subject_combinations WHERE class_id = ?`, [id]);
    sqliteDb.run(`DELETE FROM classes WHERE id = ?`, [id], (delErr) => {
      if (delErr) return res.status(500).json({ success: false, message: delErr.message });
      res.json({ success: true, message: 'Class and all associated records deleted successfully.' });
    });
  });
});

// --- 3. SUBJECTS CRUD ---
app.get('/api/subjects', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const subjects = await firebaseService.getSubjects();
      if (subjects && subjects.length > 0) {
        return res.json(subjects);
      }
    } catch (e) {
      console.warn('[Subjects] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.all("SELECT * FROM subjects", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

app.post('/api/subjects', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addSubject(req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Subjects] Firebase addSubject error, falling back to SQLite:', e.message);
    }
  }

  const { name, code, subjectType, credits, maxMarks, passMarks } = req.body;
  const upperCode = code.toUpperCase().replace(/\s+/g, '');
  const type = subjectType && subjectType.trim() ? subjectType.trim() : 'Theory';
  const parsedCred = parseInt(credits);
  const cred = !isNaN(parsedCred) && parsedCred >= 1 && parsedCred <= 6 ? parsedCred : 4;

  sqliteDb.get("SELECT * FROM subjects WHERE subject_code = ?", [upperCode], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (row) return res.status(400).json({ success: false, message: `Subject code ${upperCode} already exists` });

    sqliteDb.run("INSERT INTO subjects (name, subject_code, subject_type, credits, max_marks, pass_marks) VALUES (?, ?, ?, ?, ?, ?)", [name.trim(), upperCode, type, cred, maxMarks, passMarks], function (insertErr) {
      if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });
      res.json({ success: true, subject: { id: this.lastID, name: name.trim(), subject_code: upperCode, subject_type: type, credits: cred, max_marks: maxMarks, pass_marks: passMarks } });
    });
  });
});

app.put('/api/subjects/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.updateSubject(id, req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Subjects] Firebase updateSubject error, falling back to SQLite:', e.message);
    }
  }

  const { name, code, subjectType, credits, maxMarks, passMarks } = req.body;
  const upperCode = code.toUpperCase().replace(/\s+/g, '');
  const type = subjectType && subjectType.trim() ? subjectType.trim() : 'Theory';
  const parsedCred = parseInt(credits);
  const cred = !isNaN(parsedCred) && parsedCred >= 1 && parsedCred <= 6 ? parsedCred : 4;

  sqliteDb.get("SELECT * FROM subjects WHERE subject_code = ? AND id != ?", [upperCode, id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (row) return res.status(400).json({ success: false, message: `Another subject with code ${upperCode} exists` });

    sqliteDb.run("UPDATE subjects SET name = ?, subject_code = ?, subject_type = ?, credits = ?, max_marks = ?, pass_marks = ? WHERE id = ?", [name.trim(), upperCode, type, cred, maxMarks, passMarks, id], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
      res.json({ success: true });
    });
  });
});

app.delete('/api/subjects/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteSubject(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Subjects] Firebase deleteSubject error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.serialize(() => {
    sqliteDb.run(`DELETE FROM result_marks WHERE subject_id = ?`, [id]);
    sqliteDb.run(`DELETE FROM subject_combinations WHERE subject_id = ?`, [id]);
    sqliteDb.run(`DELETE FROM results WHERE id NOT IN (SELECT DISTINCT result_id FROM result_marks)`);
    sqliteDb.run(`DELETE FROM subjects WHERE id = ?`, [id], (delErr) => {
      if (delErr) return res.status(500).json({ success: false, message: delErr.message });
      res.json({ success: true, message: 'Subject and associated records deleted successfully.' });
    });
  });
});

// --- 4. SUBJECT COMBINATIONS ---
app.get('/api/combinations', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const combs = await firebaseService.getCombinations();
      if (combs && combs.length > 0) {
        return res.json(combs);
      }
    } catch (e) {
      console.warn('[Combinations] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  const sql = `
    SELECT sc.id, sc.class_id, sc.subject_id, sc.status,
           c.name || ' (' || c.section || ' - ' || COALESCE(c.semester, 'Semester 1') || ')' as className,
           s.name as subjectName, s.subject_code as subjectCode
    FROM subject_combinations sc
    JOIN classes c ON sc.class_id = c.id
    JOIN subjects s ON sc.subject_id = s.id
  `;
  sqliteDb.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

app.post('/api/combinations', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addCombination(req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Combinations] Firebase addCombination error, falling back to SQLite:', e.message);
    }
  }

  const { classId, subjectId } = req.body;
  sqliteDb.run("INSERT INTO subject_combinations (class_id, subject_id, status) VALUES (?, ?, 'Active')", [classId, subjectId], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ success: false, message: 'Subject combination already linked to class' });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true });
  });
});

app.put('/api/combinations/:id/toggle', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.toggleCombination(id);
      if (result.success) return res.json(result);
      return res.status(404).json(result);
    } catch (e) {
      console.warn('[Combinations] Firebase toggleCombination error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.get("SELECT status FROM subject_combinations WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const newStatus = row.status === 'Active' ? 'Inactive' : 'Active';
    sqliteDb.run("UPDATE subject_combinations SET status = ? WHERE id = ?", [newStatus, id], (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
      res.json({ success: true, status: newStatus });
    });
  });
});

app.delete('/api/combinations/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteCombination(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Combinations] Firebase deleteCombination error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.run("DELETE FROM subject_combinations WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

app.get('/api/classes/:classId/active-subjects', async (req, res) => {
  const { classId } = req.params;

  if (isFirebaseReady()) {
    try {
      const subjects = await firebaseService.getActiveSubjectsForClass(classId);
      if (subjects && subjects.length > 0) {
        return res.json(subjects);
      }
    } catch (e) {
      console.warn('[ActiveSubjects] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  const sql = `
    SELECT s.* FROM subjects s
    JOIN subject_combinations sc ON sc.subject_id = s.id
    WHERE sc.class_id = ? AND sc.status = 'Active'
  `;
  sqliteDb.all(sql, [classId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

// --- 5. STUDENTS CRUD ---
app.get('/api/students', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const students = await firebaseService.getStudents();
      if (students && students.length > 0) {
        return res.json(students);
      }
    } catch (e) {
      console.warn('[Students] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  const sql = `
    SELECT s.*, c.name || ' - Section ' || c.section || ' (' || COALESCE(c.semester, 'Semester 1') || ')' as className
    FROM students s
    JOIN classes c ON s.class_id = c.id
  `;
  sqliteDb.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

app.post('/api/students', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addStudent(req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Students] Firebase addStudent error, falling back to SQLite:', e.message);
    }
  }

  const { rollId, name, classId, gender, dob, email, mobile, status } = req.body;
  const cleanRoll = rollId.trim();

  sqliteDb.run(
    "INSERT INTO students (roll_id, name, class_id, gender, dob, email, mobile, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [cleanRoll, name.trim(), classId, gender, dob, email.trim(), mobile.trim(), status || 'Active'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: `A student with Roll ID "${cleanRoll}" is already registered.` });
        }
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.updateStudent(id, req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Students] Firebase updateStudent error, falling back to SQLite:', e.message);
    }
  }

  const { rollId, name, classId, gender, dob, email, mobile, status } = req.body;
  const cleanRoll = rollId.trim();

  sqliteDb.run(
    "UPDATE students SET roll_id = ?, name = ?, class_id = ?, gender = ?, dob = ?, email = ?, mobile = ?, status = ? WHERE id = ?",
    [cleanRoll, name.trim(), classId, gender, dob, email.trim(), mobile.trim(), status, id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: `Another student with Roll ID "${cleanRoll}" exists.` });
        }
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteStudent(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Students] Firebase deleteStudent error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.serialize(() => {
    sqliteDb.run("DELETE FROM result_marks WHERE result_id IN (SELECT id FROM results WHERE student_id = ?)", [id]);
    sqliteDb.run("DELETE FROM results WHERE student_id = ?", [id]);
    sqliteDb.run("DELETE FROM students WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Student and associated results deleted.' });
    });
  });
});

app.get('/api/classes/:classId/students-no-result', async (req, res) => {
  const { classId } = req.params;

  if (isFirebaseReady()) {
    try {
      const students = await firebaseService.getStudentsWithoutResult(classId);
      if (students && students.length > 0) {
        return res.json(students);
      }
    } catch (e) {
      console.warn('[StudentsNoResult] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  const sql = `
    SELECT s.* FROM students s
    LEFT JOIN results r ON r.student_id = s.id
    WHERE s.class_id = ? AND s.status = 'Active' AND r.id IS NULL
  `;
  sqliteDb.all(sql, [classId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

// --- 6. RESULTS DECLARATION ---
app.get('/api/results', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const results = await firebaseService.getResults();
      if (results && results.length > 0) {
        return res.json(results);
      }
    } catch (e) {
      console.warn('[Results] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  const sql = `
    SELECT r.id, r.student_id, r.class_id, r.declared_at,
           s.name as studentName, s.roll_id as rollId,
           c.name || ' (' || c.section || ' - ' || COALESCE(c.semester, 'Semester 1') || ')' as className
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN classes c ON r.class_id = c.id
  `;

  sqliteDb.all(sql, [], (err, resultsRows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (resultsRows.length === 0) return res.json([]);

    sqliteDb.all("SELECT rm.*, s.pass_marks, s.max_marks FROM result_marks rm JOIN subjects s ON rm.subject_id = s.id", [], (marksErr, marksRows) => {
      if (marksErr) return res.status(500).json({ success: false, message: marksErr.message });

      const results = resultsRows.map(res => {
        const studentMarks = marksRows.filter(m => m.result_id === res.id);
        
        let totalMax = 0;
        let totalObtained = 0;
        let failCount = 0;

        studentMarks.forEach(m => {
          totalMax += m.max_marks;
          totalObtained += m.marks_obtained;
          if (m.marks_obtained < m.pass_marks) {
            failCount++;
          }
        });

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
          id: res.id,
          studentId: res.student_id,
          rollId: res.rollId,
          classId: res.class_id,
          studentName: res.studentName,
          className: res.className,
          declaredAt: res.declared_at,
          marks: studentMarks.reduce((acc, curr) => {
            acc[curr.subject_id] = curr.marks_obtained;
            return acc;
          }, {}),
          summary: {
            totalMax,
            totalObtained,
            percentage,
            status,
            overallGrade
          }
        };
      });

      res.json(results);
    });
  });
});

app.post('/api/results', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addResult(req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Results] Firebase addResult error, falling back to SQLite:', e.message);
    }
  }

  const { studentId, classId, rollId, marks } = req.body;
  const today = new Date().toISOString().split('T')[0];

  sqliteDb.serialize(() => {
    sqliteDb.run("INSERT INTO results (student_id, class_id, declared_at) VALUES (?, ?, ?)", [studentId, classId, today], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ success: false, message: 'Result already declared for this student.' });
        }
        return res.status(500).json({ success: false, message: err.message });
      }

      const resultId = this.lastID;
      const stmt = sqliteDb.prepare("INSERT INTO result_marks (result_id, subject_id, marks_obtained) VALUES (?, ?, ?)");
      
      for (const [subjId, obtained] of Object.entries(marks)) {
        stmt.run(resultId, parseInt(subjId), parseFloat(obtained));
      }
      
      stmt.finalize((finalizeErr) => {
        if (finalizeErr) return res.status(500).json({ success: false, message: finalizeErr.message });
        res.json({ success: true });
      });
    });
  });
});

app.put('/api/results/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.updateResult(id, req.body);
      if (result.success) return res.json(result);
      return res.status(400).json(result);
    } catch (e) {
      console.warn('[Results] Firebase updateResult error, falling back to SQLite:', e.message);
    }
  }

  const { marks } = req.body;
  const today = new Date().toISOString().split('T')[0];

  sqliteDb.serialize(() => {
    sqliteDb.run("UPDATE results SET declared_at = ? WHERE id = ?", [today, id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      sqliteDb.run("DELETE FROM result_marks WHERE result_id = ?", [id], (delErr) => {
        if (delErr) return res.status(500).json({ success: false, message: delErr.message });

        const stmt = sqliteDb.prepare("INSERT INTO result_marks (result_id, subject_id, marks_obtained) VALUES (?, ?, ?)");
        for (const [subjId, obtained] of Object.entries(marks)) {
          stmt.run(id, parseInt(subjId), parseFloat(obtained));
        }

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) return res.status(500).json({ success: false, message: finalizeErr.message });
          res.json({ success: true });
        });
      });
    });
  });
});

app.delete('/api/results/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteResult(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Results] Firebase deleteResult error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.serialize(() => {
    sqliteDb.run("DELETE FROM result_marks WHERE result_id = ?", [id]);
    sqliteDb.run("DELETE FROM results WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'Result and marks deleted successfully.' });
    });
  });
});

// --- 7. STUDENT RESULT SEARCH ---
app.post('/api/student/search', async (req, res) => {
  const { rollId, classId } = req.body;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.searchStudentResult(rollId, classId);
      if (result && result.success) return res.json(result);
    } catch (e) {
      console.warn('[Search] Firebase search error, falling back to SQLite:', e.message);
    }
  }

  const studentSql = `
    SELECT s.*, c.name || ' (' || c.section || ' - ' || COALESCE(c.semester, 'Semester 1') || ')' as className
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.roll_id = ? AND s.class_id = ?
  `;

  sqliteDb.get(studentSql, [rollId, classId], (err, studentRow) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!studentRow) {
      return res.status(404).json({ success: false, message: 'No student profile matches this roll number in the selected class' });
    }
    if (studentRow.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'This student file is inactive. Contact administration.' });
    }

    sqliteDb.get("SELECT * FROM results WHERE student_id = ?", [studentRow.id], (resErr, resRow) => {
      if (resErr) return res.status(500).json({ success: false, message: resErr.message });
      if (!resRow) {
        return res.status(404).json({ success: false, message: 'Results have not been declared yet for this student.' });
      }

      const marksSql = `
        SELECT rm.marks_obtained, s.name as subjectName, s.subject_code as subjectCode, s.max_marks as max, s.pass_marks as pass, s.id as subjectId
        FROM result_marks rm
        JOIN subjects s ON rm.subject_id = s.id
        WHERE rm.result_id = ?
      `;

      sqliteDb.all(marksSql, [resRow.id], (marksErr, marksRows) => {
        if (marksErr) return res.status(500).json({ success: false, message: marksErr.message });

        let totalMax = 0;
        let totalObtained = 0;
        let failCount = 0;
        const subjectsDetails = [];

        marksRows.forEach(row => {
          totalMax += row.max;
          totalObtained += row.marks_obtained;
          const failed = row.marks_obtained < row.pass;
          if (failed) failCount++;

          const pct = (row.marks_obtained / row.max) * 100;
          let grade = 'F';
          if (pct >= 91) grade = 'A1';
          else if (pct >= 81) grade = 'A2';
          else if (pct >= 71) grade = 'B1';
          else if (pct >= 61) grade = 'B2';
          else if (pct >= 51) grade = 'C1';
          else if (pct >= 41) grade = 'C2';
          else if (pct >= 33) grade = 'D';

          subjectsDetails.push({
            subjectId: row.subjectId,
            name: row.subjectName,
            code: row.subjectCode,
            max: row.max,
            pass: row.pass,
            obtained: row.marks_obtained,
            grade,
            isFailed: failed
          });
        });

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

        res.json({
          success: true,
          student: {
            name: studentRow.name,
            rollId: studentRow.roll_id,
            gender: studentRow.gender,
            dob: studentRow.dob,
            email: studentRow.email,
            mobile: studentRow.mobile,
            className: studentRow.className
          },
          evaluation: {
            totalMax,
            totalObtained,
            percentage,
            status,
            overallGrade,
            subjects: subjectsDetails
          },
          declaredAt: resRow.declared_at
        });
      });
    });
  });
});

// --- 8. NOTICES CRUD ---
app.get('/api/notices', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const notices = await firebaseService.getNotices();
      if (notices && notices.length > 0) {
        return res.json(notices);
      }
    } catch (e) {
      console.warn('[Notices] Firebase fetch error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.all("SELECT * FROM notices ORDER BY is_pinned DESC, id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const notices = rows.map(r => ({
      ...r,
      isPinned: !!r.is_pinned
    }));
    res.json(notices);
  });
});

app.post('/api/notices', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.addNotice(req.body);
      return res.json(result);
    } catch (e) {
      console.warn('[Notices] Firebase addNotice error, falling back to SQLite:', e.message);
    }
  }

  const { title, content, category, target, isPinned } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const pinVal = isPinned ? 1 : 0;

  sqliteDb.run(
    "INSERT INTO notices (title, content, category, target, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [title, content, category, target, pinVal, today],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/notices/:id', async (req, res) => {
  const { id } = req.params;

  if (isFirebaseReady()) {
    try {
      const result = await firebaseService.deleteNotice(id);
      return res.json(result);
    } catch (e) {
      console.warn('[Notices] Firebase deleteNotice error, falling back to SQLite:', e.message);
    }
  }

  sqliteDb.run("DELETE FROM notices WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// --- 9. DASHBOARD STATS ---
app.get('/api/dashboard/stats', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const stats = await firebaseService.getDashboardStats();
      if (stats && stats.cards && (stats.cards.totalStudents > 0 || stats.cards.totalClasses > 0)) {
        return res.json(stats);
      }
    } catch (e) {
      console.warn('[DashboardStats] Firebase error, falling back to SQLite:', e.message);
    }
  }

  const stats = {
    cards: {
      totalStudents: 0,
      totalClasses: 0,
      totalSubjects: 0,
      declaredResults: 0,
      activeNotices: 0,
      passRate: 0
    },
    toppers: [],
    classPerformance: []
  };

  sqliteDb.serialize(() => {
    sqliteDb.get("SELECT COUNT(*) as count FROM students", (e, r) => { if(r) stats.cards.totalStudents = r.count; });
    sqliteDb.get("SELECT COUNT(*) as count FROM classes", (e, r) => { if(r) stats.cards.totalClasses = r.count; });
    sqliteDb.get("SELECT COUNT(*) as count FROM subjects", (e, r) => { if(r) stats.cards.totalSubjects = r.count; });
    sqliteDb.get("SELECT COUNT(*) as count FROM results", (e, r) => { if(r) stats.cards.declaredResults = r.count; });
    sqliteDb.get("SELECT COUNT(*) as count FROM notices", (e, r) => { if(r) stats.cards.activeNotices = r.count; });

    const sql = `
      SELECT r.id as resultId, r.student_id, r.class_id,
             s.name as studentName, s.roll_id as rollId,
             c.name || ' (' || c.section || ')' as className,
             rm.marks_obtained, sub.max_marks, sub.pass_marks
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN classes c ON r.class_id = c.id
      LEFT JOIN result_marks rm ON rm.result_id = r.id
      LEFT JOIN subjects sub ON rm.subject_id = sub.id
    `;

    sqliteDb.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      
      const resultsGroup = {};
      rows.forEach(row => {
        if (!resultsGroup[row.resultId]) {
          resultsGroup[row.resultId] = {
            studentName: row.studentName,
            rollId: row.rollId,
            className: row.className,
            classId: row.class_id,
            totalObtained: 0,
            totalMax: 0,
            failCount: 0
          };
        }
        if (row.marks_obtained !== null) {
          resultsGroup[row.resultId].totalObtained += row.marks_obtained;
          resultsGroup[row.resultId].totalMax += row.max_marks;
          if (row.marks_obtained < row.pass_marks) {
            resultsGroup[row.resultId].failCount++;
          }
        }
      });

      const list = Object.values(resultsGroup).map(item => {
        const pct = item.totalMax > 0 ? parseFloat(((item.totalObtained / item.totalMax) * 100).toFixed(2)) : 0;
        let pass = 'PASS';
        if (item.failCount > 0) pass = item.failCount === 1 ? 'PROMOTED' : 'FAIL';
        return {
          ...item,
          percentage: pct,
          status: pass
        };
      });

      const totalResults = list.length;
      const passedCount = list.filter(r => r.status === 'PASS' || r.status === 'PROMOTED').length;
      stats.cards.passRate = totalResults > 0 ? parseFloat(((passedCount / totalResults) * 100).toFixed(1)) : 0;

      stats.toppers = list
        .filter(r => r.status === 'PASS')
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

      sqliteDb.all("SELECT * FROM classes", [], (classesErr, classesRows) => {
        if (classesErr) return res.status(500).json({ success: false, message: classesErr.message });
        
        stats.classPerformance = classesRows.map(c => {
          const classCodeName = `${c.name} (${c.section})`;
          const classResults = list.filter(r => r.classId === c.id);
          const passed = classResults.filter(r => r.status === 'PASS' || r.status === 'PROMOTED').length;
          const failed = classResults.length - passed;
          const passRate = classResults.length > 0 ? Math.round((passed / classResults.length) * 100) : 0;
          return {
            className: classCodeName,
            total: classResults.length,
            passed,
            failed,
            passRate
          };
        });

        res.json(stats);
      });
    });
  });
});

// --- 10. BACKUP & WIPES ---
app.get('/api/settings/backup', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      const backup = await firebaseService.exportBackup();
      return res.json(backup);
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const backup = {};
  sqliteDb.serialize(() => {
    sqliteDb.all("SELECT * FROM admins", [], (e, r) => { backup.admin = r[0]; });
    sqliteDb.all("SELECT * FROM classes", [], (e, r) => { backup.classes = r; });
    sqliteDb.all("SELECT * FROM subjects", [], (e, r) => { backup.subjects = r; });
    sqliteDb.all("SELECT * FROM subject_combinations", [], (e, r) => { backup.combinations = r; });
    sqliteDb.all("SELECT * FROM students", [], (e, r) => { backup.students = r; });
    sqliteDb.all("SELECT * FROM results", [], (e, r) => { backup.results = r; });
    sqliteDb.all("SELECT * FROM result_marks", [], (e, r) => { backup.result_marks = r; });
    sqliteDb.all("SELECT * FROM notices", [], (e, r) => {
      backup.notices = r;
      res.json(backup);
    });
  });
});

app.post('/api/settings/restore', (req, res) => {
  const backup = req.body;
  if (!backup.classes || !backup.students || !backup.subjects) {
    return res.status(400).json({ success: false, message: 'Invalid database backup schema' });
  }

  if (isFirebaseReady()) {
    return res.status(501).json({ success: false, message: 'JSON restore into Firestore is coming soon. Use seed:firebase for fresh datasets.' });
  }

  sqliteDb.serialize(() => {
    sqliteDb.run("DELETE FROM result_marks");
    sqliteDb.run("DELETE FROM results");
    sqliteDb.run("DELETE FROM students");
    sqliteDb.run("DELETE FROM subject_combinations");
    sqliteDb.run("DELETE FROM subjects");
    sqliteDb.run("DELETE FROM classes");
    sqliteDb.run("DELETE FROM notices");
    sqliteDb.run("DELETE FROM admins");

    if (backup.admin) {
      sqliteDb.run("INSERT INTO admins (id, username, password, name, email) VALUES (?, ?, ?, ?, ?)", 
        [backup.admin.id, backup.admin.username, backup.admin.password, backup.admin.name, backup.admin.email]);
    }
    
    const classStmt = sqliteDb.prepare("INSERT INTO classes (id, name, section, class_code, created_at) VALUES (?, ?, ?, ?, ?)");
    (backup.classes || []).forEach(c => classStmt.run(c.id, c.name, c.section, c.class_code, c.created_at));
    classStmt.finalize();

    const subjStmt = sqliteDb.prepare("INSERT INTO subjects (id, name, subject_code, max_marks, pass_marks, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    (backup.subjects || []).forEach(s => subjStmt.run(s.id, s.name, s.subject_code, s.max_marks, s.pass_marks, s.created_at));
    subjStmt.finalize();

    const combStmt = sqliteDb.prepare("INSERT INTO subject_combinations (id, class_id, subject_id, status, created_at) VALUES (?, ?, ?, ?, ?)");
    (backup.combinations || []).forEach(c => combStmt.run(c.id, c.class_id, c.subject_id, c.status, c.created_at));
    combStmt.finalize();

    const studStmt = sqliteDb.prepare("INSERT INTO students (id, roll_id, name, class_id, gender, dob, email, mobile, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    (backup.students || []).forEach(s => studStmt.run(s.id, s.roll_id, s.name, s.class_id, s.gender, s.dob, s.email, s.mobile, s.status, s.created_at));
    studStmt.finalize();

    const resStmt = sqliteDb.prepare("INSERT INTO results (id, student_id, class_id, declared_at, created_at) VALUES (?, ?, ?, ?, ?)");
    (backup.results || []).forEach(r => resStmt.run(r.id, r.student_id, r.class_id, r.declared_at, r.created_at));
    resStmt.finalize();

    const marksStmt = sqliteDb.prepare("INSERT INTO result_marks (id, result_id, subject_id, marks_obtained) VALUES (?, ?, ?, ?)");
    (backup.result_marks || []).forEach(m => marksStmt.run(m.id, m.result_id, m.subject_id, m.marks_obtained));
    marksStmt.finalize();

    const noticeStmt = sqliteDb.prepare("INSERT INTO notices (id, title, content, category, target, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    (backup.notices || []).forEach(n => noticeStmt.run(n.id, n.title, n.content, n.category, n.target, n.is_pinned ? 1 : 0, n.created_at));
    noticeStmt.finalize((err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    });
  });
});

app.post('/api/settings/reset', async (req, res) => {
  if (isFirebaseReady()) {
    try {
      await firebaseService.resetDatabase();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  sqliteDb.serialize(() => {
    sqliteDb.run("DROP TABLE IF EXISTS result_marks");
    sqliteDb.run("DROP TABLE IF EXISTS results");
    sqliteDb.run("DROP TABLE IF EXISTS students");
    sqliteDb.run("DROP TABLE IF EXISTS subject_combinations");
    sqliteDb.run("DROP TABLE IF EXISTS subjects");
    sqliteDb.run("DROP TABLE IF EXISTS classes");
    sqliteDb.run("DROP TABLE IF EXISTS notices");
    sqliteDb.run("DROP TABLE IF EXISTS admins");
    
    initializeDatabaseSchema();
    setTimeout(() => {
      res.json({ success: true });
    }, 1000);
  });
});

// Fallback: send index.html for all page requests (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Launch server (only when executed directly, not when imported by Vercel serverless functions)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` AcademiaSync API Server is running locally!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Mode: ${isFirebaseReady() ? 'Google Cloud Firebase Firestore' : 'SQLite Local Fallback'}`);
    console.log(` Press Ctrl+C to terminate the server.`);
    console.log(`===================================================`);
  });
}

module.exports = app;
