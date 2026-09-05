-- =========================================================================
-- AcademiaSync - Relational Database Schema Creation Script (SQL)
-- Target: SQLite / PostgreSQL / MySQL compliant relational structure
-- =========================================================================

-- 1. ADMINE CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- stores hashed string
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLASS REGISTRY TABLE
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50) NOT NULL,
    semester VARCHAR(50) DEFAULT 'Semester 1',
    class_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SUBJECTS CATALOG TABLE
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    subject_code VARCHAR(50) UNIQUE NOT NULL,
    subject_type VARCHAR(50) DEFAULT 'Theory', -- 'Theory', 'Practical / Lab', 'Core', 'Elective', 'Project / Viva'
    credits INTEGER DEFAULT 4 CHECK(credits >= 1 AND credits <= 6), -- Range 1 to 6
    max_marks INTEGER DEFAULT 100,
    pass_marks INTEGER DEFAULT 33,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUBJECT COMBINATIONS MAPPING TABLE (Many-to-Many)
CREATE TABLE IF NOT EXISTS subject_combinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Active', -- 'Active' or 'Inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id) -- Prevents duplicate course mapping
);

-- 5. STUDENTS ROSTER TABLE
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roll_id VARCHAR(50) UNIQUE NOT NULL, -- Searching index
    name VARCHAR(150) NOT NULL,
    class_id INTEGER NOT NULL,
    gender VARCHAR(20),
    dob DATE,
    email VARCHAR(150) UNIQUE,
    mobile VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active', -- 'Active' or 'Inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
);

-- 6. RESULTS MASTER TABLE
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL, -- Ensures 1 scorecard sheet per student
    class_id INTEGER NOT NULL,
    declared_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- 7. RESULT MARKS DETAILS TABLE (One-to-Many relation with results)
CREATE TABLE IF NOT EXISTS result_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    marks_obtained DECIMAL(5, 2) NOT NULL,
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(result_id, subject_id) -- Prevents entering multiple scores for same subject
);

-- 8. NOTICE BOARD TABLE
CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General', -- 'Examination', 'Result', 'Event', 'General'
    target VARCHAR(50) DEFAULT 'All', -- 'All', 'Students'
    is_pinned BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================================
-- INITIAL DEMO SEED DATA INSERTIONS
-- =========================================================================

-- Seed Admins
INSERT INTO admins (username, password, name, email) 
VALUES ('admin', 'admin123', 'School Administrator', 'admin@srms-edu.org');

-- Seed Classes (School + BCA 1st to 8th Semesters)
INSERT INTO classes (name, section, semester, class_code) VALUES 
('Class 10', 'A', 'Semester 1', '10-A-SEM1'),
('Class 10', 'B', 'Semester 2', '10-B-SEM2'),
('Class 11', 'Science-A', 'Semester 3', '11-SCI-SEM3'),
('Class 12', 'Commerce-A', 'Semester 5', '12-COM-SEM5'),
-- BCA 1st to 8th Semester Curriculum Classes
('BCA', 'Section A', 'Semester 1', 'BCA-A-SEM1'),
('BCA', 'Section A', 'Semester 2', 'BCA-A-SEM2'),
('BCA', 'Section A', 'Semester 3', 'BCA-A-SEM3'),
('BCA', 'Section A', 'Semester 4', 'BCA-A-SEM4'),
('BCA', 'Section A', 'Semester 5', 'BCA-A-SEM5'),
('BCA', 'Section A', 'Semester 6', 'BCA-A-SEM6'),
('BCA', 'Section A', 'Semester 7', 'BCA-A-SEM7'),
('BCA', 'Section A', 'Semester 8', 'BCA-A-SEM8');

-- Seed Subjects
INSERT INTO subjects (name, subject_code, subject_type, credits, max_marks, pass_marks) VALUES 
('Mathematics', 'MATH101', 'Theory', 4, 100, 33),
('Science', 'SCI101', 'Theory', 4, 100, 33),
('Social Studies', 'SST101', 'Theory', 3, 100, 33),
('English Core', 'ENG101', 'Theory', 4, 100, 33),
('Physics', 'PHY201', 'Theory', 4, 100, 33),
('Chemistry', 'CHEM201', 'Theory', 4, 100, 33),
('Accountancy', 'ACC301', 'Theory', 4, 100, 33),
('Business Studies', 'BST301', 'Theory', 4, 100, 33),

-- BCA Semester 1 Subjects
('Programming Fundamentals using C', 'BCA101', 'Theory', 4, 100, 33),
('Computer Fundamentals & Information Tech', 'BCA102', 'Theory', 4, 100, 33),
('Digital Electronics & Logic Design', 'BCA103', 'Theory', 4, 100, 33),
('Discrete Mathematics & Linear Algebra', 'BCA104', 'Theory', 4, 100, 33),
('Professional Communication & Soft Skills', 'BCA105', 'Theory', 3, 100, 33),
('C Programming & Linux Lab', 'BCA106', 'Practical / Lab', 2, 100, 33),

-- BCA Semester 2 Subjects
('Object Oriented Programming with C++', 'BCA201', 'Theory', 4, 100, 33),
('Data Structures & Algorithms', 'BCA202', 'Theory', 4, 100, 33),
('Operating Systems Principles', 'BCA203', 'Theory', 4, 100, 33),
('Numerical Methods & Statistical Techniques', 'BCA204', 'Theory', 4, 100, 33),
('Environmental Science & Cyber Ethics', 'BCA205', 'Theory', 3, 100, 33),
('Data Structures & C++ Lab', 'BCA206', 'Practical / Lab', 2, 100, 33),

-- BCA Semester 3 Subjects
('Database Management Systems (DBMS)', 'BCA301', 'Theory', 4, 100, 33),
('Core Java Programming', 'BCA302', 'Theory', 4, 100, 33),
('Computer Networks & Data Communication', 'BCA303', 'Theory', 4, 100, 33),
('Software Engineering & Agile Methodologies', 'BCA304', 'Theory', 4, 100, 33),
('Financial Accounting & Management', 'BCA305', 'Theory', 3, 100, 33),
('Oracle SQL & Core Java Lab', 'BCA306', 'Practical / Lab', 2, 100, 33),

-- BCA Semester 4 Subjects
('Advanced Java & Enterprise Frameworks', 'BCA401', 'Theory', 4, 100, 33),
('Python Programming & Data Handling', 'BCA402', 'Theory', 4, 100, 33),
('Web Technologies (HTML5/CSS3/JavaScript/React)', 'BCA403', 'Theory', 4, 100, 33),
('Design & Analysis of Algorithms (DAA)', 'BCA404', 'Theory', 4, 100, 33),
('Computer Graphics & Multimedia Systems', 'BCA405', 'Theory', 3, 100, 33),
('Web Development & Python Scripting Lab', 'BCA406', 'Practical / Lab', 2, 100, 33),

-- BCA Semester 5 Subjects
('Cloud Computing & Virtualization', 'BCA501', 'Theory', 4, 100, 33),
('Information & Cyber Security', 'BCA502', 'Theory', 4, 100, 33),
('Full-Stack Web Development (Node.js/Express)', 'BCA503', 'Theory', 4, 100, 33),
('Data Warehousing & Business Intelligence', 'BCA504', 'Theory', 4, 100, 33),
('Mobile Application Development (Flutter/Android)', 'BCA505', 'Theory', 4, 100, 33),
('Cloud & Mobile App Development Lab', 'BCA506', 'Practical / Lab', 2, 100, 33),

-- BCA Semester 6 Subjects
('Artificial Intelligence & Machine Learning', 'BCA601', 'Theory', 4, 100, 33),
('Internet of Things (IoT) & Smart Devices', 'BCA602', 'Theory', 4, 100, 33),
('Software Testing & Quality Assurance (QA)', 'BCA603', 'Theory', 4, 100, 33),
('Big Data Analytics with Hadoop & Spark', 'BCA604', 'Theory', 4, 100, 33),
('Major Project & Industrial Training Phase I', 'BCA605', 'Project / Viva', 6, 100, 33),

-- BCA Semester 7 Subjects
('DevOps, CI/CD & Kubernetes', 'BCA701', 'Theory', 4, 100, 33),
('Blockchain Technology & Smart Contracts', 'BCA702', 'Theory', 4, 100, 33),
('Deep Learning & Computer Vision', 'BCA703', 'Theory', 4, 100, 33),
('Distributed Systems & Microservices Architecture', 'BCA704', 'Theory', 4, 100, 33),
('Research Methodology & Technical Paper Writing', 'BCA705', 'Core', 3, 100, 33),

-- BCA Semester 8 Subjects
('Capstone Industrial Internship / Major Project', 'BCA801', 'Project / Viva', 10, 100, 33),
('Quantum Computing & Next-Gen Technologies', 'BCA802', 'Theory', 4, 100, 33),
('IT Entrepreneurship, IPR & Startup Management', 'BCA803', 'Theory', 3, 100, 33),
('Comprehensive Viva-Voce & Dissertation Defense', 'BCA804', 'Project / Viva', 4, 100, 33);

-- Seed Subject Combinations
INSERT INTO subject_combinations (class_id, subject_id, status)
SELECT c.id, s.id, 'Active'
FROM classes c, subjects s
WHERE 
   (c.class_code = '10-A-SEM1' AND s.subject_code IN ('MATH101', 'SCI101', 'SST101', 'ENG101'))
OR (c.class_code = '10-B-SEM2' AND s.subject_code IN ('MATH101', 'SCI101', 'SST101', 'ENG101'))
OR (c.class_code = '11-SCI-SEM3' AND s.subject_code IN ('ENG101', 'PHY201', 'CHEM201', 'MATH101'))
OR (c.class_code = '12-COM-SEM5' AND s.subject_code IN ('ENG101', 'ACC301', 'BST301', 'MATH101'))
-- BCA Semester Combinations
OR (c.class_code = 'BCA-A-SEM1' AND s.subject_code IN ('BCA101', 'BCA102', 'BCA103', 'BCA104', 'BCA105', 'BCA106'))
OR (c.class_code = 'BCA-A-SEM2' AND s.subject_code IN ('BCA201', 'BCA202', 'BCA203', 'BCA204', 'BCA205', 'BCA206'))
OR (c.class_code = 'BCA-A-SEM3' AND s.subject_code IN ('BCA301', 'BCA302', 'BCA303', 'BCA304', 'BCA305', 'BCA306'))
OR (c.class_code = 'BCA-A-SEM4' AND s.subject_code IN ('BCA401', 'BCA402', 'BCA403', 'BCA404', 'BCA405', 'BCA406'))
OR (c.class_code = 'BCA-A-SEM5' AND s.subject_code IN ('BCA501', 'BCA502', 'BCA503', 'BCA504', 'BCA505', 'BCA506'))
OR (c.class_code = 'BCA-A-SEM6' AND s.subject_code IN ('BCA601', 'BCA602', 'BCA603', 'BCA604', 'BCA605'))
OR (c.class_code = 'BCA-A-SEM7' AND s.subject_code IN ('BCA701', 'BCA702', 'BCA703', 'BCA704', 'BCA705'))
OR (c.class_code = 'BCA-A-SEM8' AND s.subject_code IN ('BCA801', 'BCA802', 'BCA803', 'BCA804'));

-- Seed Students (School + BCA 1st to 8th Semesters)
INSERT INTO students (roll_id, name, class_id, gender, dob, email, mobile, status)
SELECT '1001', 'Rahul Sharma', c.id, 'Male', '2011-05-12', 'rahul.sharma@example.com', '9876543210', 'Active' FROM classes c WHERE c.class_code = '10-A-SEM1'
UNION ALL
SELECT '1002', 'Aditi Verma', c.id, 'Female', '2011-09-20', 'aditi.verma@example.com', '9876543211', 'Active' FROM classes c WHERE c.class_code = '10-A-SEM1'
UNION ALL
SELECT '1021', 'Amit Patel', c.id, 'Male', '2011-02-14', 'amit.patel@example.com', '9876543212', 'Active' FROM classes c WHERE c.class_code = '10-B-SEM2'
UNION ALL
SELECT '1101', 'Vikram Singh', c.id, 'Male', '2010-11-05', 'vikram.singh@example.com', '9876543213', 'Active' FROM classes c WHERE c.class_code = '11-SCI-SEM3'
UNION ALL
SELECT '1102', 'Priya Das', c.id, 'Female', '2010-08-18', 'priya.das@example.com', '9876543214', 'Active' FROM classes c WHERE c.class_code = '11-SCI-SEM3'
UNION ALL
SELECT '1201', 'Sneha Gupta', c.id, 'Female', '2009-04-25', 'sneha.gupta@example.com', '9876543215', 'Active' FROM classes c WHERE c.class_code = '12-COM-SEM5'
-- BCA Students
UNION ALL
SELECT 'BCA2601', 'Aryan Sharma', c.id, 'Male', '2007-06-15', 'aryan.sharma@srms-edu.org', '9811223344', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM1'
UNION ALL
SELECT 'BCA2602', 'Tanvi Patel', c.id, 'Female', '2007-09-22', 'tanvi.patel@srms-edu.org', '9811223345', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM1'
UNION ALL
SELECT 'BCA2501', 'Rohan Deshmukh', c.id, 'Male', '2006-04-10', 'rohan.deshmukh@srms-edu.org', '9811223346', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM2'
UNION ALL
SELECT 'BCA2401', 'Ananya Iyer', c.id, 'Female', '2005-11-03', 'ananya.iyer@srms-edu.org', '9811223347', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM3'
UNION ALL
SELECT 'BCA2301', 'Siddharth Verma', c.id, 'Male', '2005-02-18', 'siddharth.verma@srms-edu.org', '9811223348', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM4'
UNION ALL
SELECT 'BCA2201', 'Meera Nambiar', c.id, 'Female', '2004-07-29', 'meera.nambiar@srms-edu.org', '9811223349', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM5'
UNION ALL
SELECT 'BCA2101', 'Kabir Kapoor', c.id, 'Male', '2003-12-14', 'kabir.kapoor@srms-edu.org', '9811223350', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM6'
UNION ALL
SELECT 'BCA2001', 'Diya Sengupta', c.id, 'Female', '2003-05-08', 'diya.sengupta@srms-edu.org', '9811223351', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM7'
UNION ALL
SELECT 'BCA1901', 'Yashvardhan Roy', c.id, 'Male', '2002-08-30', 'yash.roy@srms-edu.org', '9811223352', 'Active' FROM classes c WHERE c.class_code = 'BCA-A-SEM8';

-- Seed Results Master
INSERT INTO results (student_id, class_id, declared_at)
SELECT s.id, s.class_id, '2026-08-28' FROM students s WHERE s.roll_id IN ('1001', '1002', '1101', '1102', 'BCA2601', 'BCA2602');

-- Seed Result Marks Details for BCA Students
INSERT INTO result_marks (result_id, subject_id, marks_obtained)
SELECT r.id, s.id, 88.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA101' WHERE st.roll_id = 'BCA2601'
UNION ALL
SELECT r.id, s.id, 92.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA102' WHERE st.roll_id = 'BCA2601'
UNION ALL
SELECT r.id, s.id, 85.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA103' WHERE st.roll_id = 'BCA2601'
UNION ALL
SELECT r.id, s.id, 79.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA104' WHERE st.roll_id = 'BCA2601'
UNION ALL
SELECT r.id, s.id, 90.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA105' WHERE st.roll_id = 'BCA2601'
UNION ALL
SELECT r.id, s.id, 95.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA106' WHERE st.roll_id = 'BCA2601'
-- Tanvi Patel (BCA2602)
UNION ALL
SELECT r.id, s.id, 94.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA101' WHERE st.roll_id = 'BCA2602'
UNION ALL
SELECT r.id, s.id, 96.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA102' WHERE st.roll_id = 'BCA2602'
UNION ALL
SELECT r.id, s.id, 91.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA103' WHERE st.roll_id = 'BCA2602'
UNION ALL
SELECT r.id, s.id, 88.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA104' WHERE st.roll_id = 'BCA2602'
UNION ALL
SELECT r.id, s.id, 93.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA105' WHERE st.roll_id = 'BCA2602'
UNION ALL
SELECT r.id, s.id, 98.00 FROM results r JOIN students st ON r.student_id = st.id JOIN subjects s ON s.subject_code = 'BCA106' WHERE st.roll_id = 'BCA2602';

-- Seed Notices
INSERT INTO notices (title, content, category, target, is_pinned, created_at) VALUES 
('Final Term Examinations Schedule', 'The final term examinations for academic session 2026-27 will commence from September 18th, 2026. Please collect your admit cards from the administrative desk by September 10th. Make sure all library dues are cleared.', 'Examination', 'All', 1, '2026-08-25'),
('BCA Semesters 1 to 8 Curriculum & Results Declared', 'The BCA (Bachelor of Computer Applications) semesters 1 to 8 subject structures, laboratory modules, and evaluation schemes have been registered. Students of BCA Sem 1 to 8 can check their semester marksheets online.', 'Result', 'All', 1, '2026-08-30'),
('Mid-Term Results Declared', 'The Mid-Term examination results for Classes 10th and 11th have been declared. Students can search and download their marksheets using their valid Roll IDs. For correction in student bio details, contact office admin.', 'Result', 'All', 0, '2026-08-28'),
('Inter-School Science Fair 2026', 'Interested students from classes 9th to 12th can register for the Annual Inter-School Science & Technology Fair. Registrations close on September 5th. Projects will be mentored by science teachers.', 'Event', 'Students', 0, '2026-08-20');
