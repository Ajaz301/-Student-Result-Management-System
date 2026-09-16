/**
 * Firebase Firestore Seeding Utility
 * Student Result Management System (AcademiaSync)
 * 
 * Usage: node seed-firebase.js
 */

const { initFirebase, getFirebaseStatus } = require('./firebaseAdmin');

async function seedFirestore() {
  console.log('======================================================');
  console.log('  AcademiaSync - Firebase Firestore Database Seeder   ');
  console.log('======================================================\n');

  const { isReady, db, error } = initFirebase();

  if (!isReady) {
    console.error('❌ Could not connect to Firebase:');
    console.error(`   ${error}\n`);
    console.log('💡 Quick Setup Guide:');
    console.log('   1. Open Firebase Console: https://console.firebase.google.com/');
    console.log('   2. Create a new Firebase project.');
    console.log('   3. Enable Firestore Database (Build > Firestore Database).');
    console.log('   4. Go to Project Settings > Service accounts > Generate new private key.');
    console.log('   5. Save the downloaded JSON file as "serviceAccountKey.json" in this directory.');
    console.log('   6. Run this command again: npm run seed:firebase\n');
    process.exit(1);
  }

  console.log('🚀 Connected to Firestore. Beginning initial data seeding...\n');

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Seed Admins
    console.log('👤 Seeding Administrators...');
    const adminRef = await db.collection('admins').add({
      username: 'admin',
      password: 'Admin@Academia2026!',
      name: 'School Administrator',
      email: 'admin@srms-edu.org',
      created_at: new Date().toISOString()
    });
    console.log(`   ✔ Admin seeded: admin / Admin@Academia2026! (Doc ID: ${adminRef.id})`);

    // 2. Seed Classes
    console.log('🏫 Seeding Classes...');
    const classesData = [
      { name: 'Class 10', section: 'A', semester: 'Semester 1', class_code: '10-A-SEM1' },
      { name: 'Class 10', section: 'B', semester: 'Semester 2', class_code: '10-B-SEM2' },
      { name: 'Class 11', section: 'Science-A', semester: 'Semester 3', class_code: '11-SCI-SEM3' },
      { name: 'Class 12', section: 'Commerce-A', semester: 'Semester 5', class_code: '12-COM-SEM5' },
      // BCA 1st to 8th Semesters
      { name: 'BCA', section: 'Section A', semester: 'Semester 1', class_code: 'BCA-A-SEM1' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 2', class_code: 'BCA-A-SEM2' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 3', class_code: 'BCA-A-SEM3' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 4', class_code: 'BCA-A-SEM4' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 5', class_code: 'BCA-A-SEM5' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 6', class_code: 'BCA-A-SEM6' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 7', class_code: 'BCA-A-SEM7' },
      { name: 'BCA', section: 'Section A', semester: 'Semester 8', class_code: 'BCA-A-SEM8' }
    ];

    const classDocs = [];
    for (const c of classesData) {
      const ref = await db.collection('classes').add({
        ...c,
        created_at: new Date().toISOString()
      });
      classDocs.push({ id: ref.id, ...c });
    }
    console.log(`   ✔ ${classDocs.length} Classes seeded.`);

    // 3. Seed Subjects
    console.log('📚 Seeding Subjects...');
    const subjectsData = [
      { name: 'Mathematics', subject_code: 'MATH101', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Science', subject_code: 'SCI101', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Social Studies', subject_code: 'SST101', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'English Core', subject_code: 'ENG101', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Physics', subject_code: 'PHY201', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Chemistry', subject_code: 'CHEM201', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Accountancy', subject_code: 'ACC301', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Business Studies', subject_code: 'BST301', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },

      // BCA Semester 1 Subjects
      { name: 'Programming Fundamentals using C', subject_code: 'BCA101', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Computer Fundamentals & Information Tech', subject_code: 'BCA102', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Digital Electronics & Logic Design', subject_code: 'BCA103', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Discrete Mathematics & Linear Algebra', subject_code: 'BCA104', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Professional Communication & Soft Skills', subject_code: 'BCA105', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'C Programming & Linux Lab', subject_code: 'BCA106', subject_type: 'Practical / Lab', credits: 2, max_marks: 100, pass_marks: 33 },

      // BCA Semester 2 Subjects
      { name: 'Object Oriented Programming with C++', subject_code: 'BCA201', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Data Structures & Algorithms', subject_code: 'BCA202', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Operating Systems Principles', subject_code: 'BCA203', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Numerical Methods & Statistical Techniques', subject_code: 'BCA204', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Environmental Science & Cyber Ethics', subject_code: 'BCA205', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'Data Structures & C++ Lab', subject_code: 'BCA206', subject_type: 'Practical / Lab', credits: 2, max_marks: 100, pass_marks: 33 },

      // BCA Semester 3 Subjects
      { name: 'Database Management Systems (DBMS)', subject_code: 'BCA301', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Core Java Programming', subject_code: 'BCA302', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Computer Networks & Data Communication', subject_code: 'BCA303', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Software Engineering & Agile Methodologies', subject_code: 'BCA304', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Financial Accounting & Management', subject_code: 'BCA305', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'Oracle SQL & Core Java Lab', subject_code: 'BCA306', subject_type: 'Practical / Lab', credits: 2, max_marks: 100, pass_marks: 33 },

      // BCA Semester 4 Subjects
      { name: 'Advanced Java & Enterprise Frameworks', subject_code: 'BCA401', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Python Programming & Data Handling', subject_code: 'BCA402', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Web Technologies (HTML5/CSS3/JavaScript/React)', subject_code: 'BCA403', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Design & Analysis of Algorithms (DAA)', subject_code: 'BCA404', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Computer Graphics & Multimedia Systems', subject_code: 'BCA405', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'Web Development & Python Scripting Lab', subject_code: 'BCA406', subject_type: 'Practical / Lab', credits: 2, max_marks: 100, pass_marks: 33 },

      // BCA Semester 5 Subjects
      { name: 'Cloud Computing & Virtualization', subject_code: 'BCA501', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Information & Cyber Security', subject_code: 'BCA502', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Full-Stack Web Development (Node.js/Express)', subject_code: 'BCA503', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Data Warehousing & Business Intelligence', subject_code: 'BCA504', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Mobile Application Development (Flutter/Android)', subject_code: 'BCA505', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Cloud & Mobile App Development Lab', subject_code: 'BCA506', subject_type: 'Practical / Lab', credits: 2, max_marks: 100, pass_marks: 33 },

      // BCA Semester 6 Subjects
      { name: 'Artificial Intelligence & Machine Learning', subject_code: 'BCA601', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Internet of Things (IoT) & Smart Devices', subject_code: 'BCA602', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Software Testing & Quality Assurance (QA)', subject_code: 'BCA603', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Big Data Analytics with Hadoop & Spark', subject_code: 'BCA604', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Major Project & Industrial Training Phase I', subject_code: 'BCA605', subject_type: 'Project / Viva', credits: 6, max_marks: 100, pass_marks: 33 },

      // BCA Semester 7 Subjects
      { name: 'DevOps, CI/CD & Kubernetes', subject_code: 'BCA701', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Blockchain Technology & Smart Contracts', subject_code: 'BCA702', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Deep Learning & Computer Vision', subject_code: 'BCA703', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Distributed Systems & Microservices Architecture', subject_code: 'BCA704', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'Research Methodology & Technical Paper Writing', subject_code: 'BCA705', subject_type: 'Core', credits: 3, max_marks: 100, pass_marks: 33 },

      // BCA Semester 8 Subjects
      { name: 'Capstone Industrial Internship / Major Project', subject_code: 'BCA801', subject_type: 'Project / Viva', credits: 10, max_marks: 100, pass_marks: 33 },
      { name: 'Quantum Computing & Next-Gen Technologies', subject_code: 'BCA802', subject_type: 'Theory', credits: 4, max_marks: 100, pass_marks: 33 },
      { name: 'IT Entrepreneurship, IPR & Startup Management', subject_code: 'BCA803', subject_type: 'Theory', credits: 3, max_marks: 100, pass_marks: 33 },
      { name: 'Comprehensive Viva-Voce & Dissertation Defense', subject_code: 'BCA804', subject_type: 'Project / Viva', credits: 4, max_marks: 100, pass_marks: 33 }
    ];

    const subjectDocs = [];
    for (const s of subjectsData) {
      const ref = await db.collection('subjects').add({
        ...s,
        created_at: new Date().toISOString()
      });
      subjectDocs.push({ id: ref.id, ...s });
    }
    console.log(`   ✔ ${subjectDocs.length} Subjects seeded.`);

    // Helper to find subject and class by code
    const findSub = (code) => subjectDocs.find(s => s.subject_code === code);
    const findClass = (code) => classDocs.find(c => c.class_code === code);

    // 4. Seed Combinations
    console.log('🔗 Seeding Subject Combinations...');
    const combinationsMap = [
      // School Classes
      { classCode: '10-A-SEM1', subCodes: ['MATH101', 'SCI101', 'SST101', 'ENG101'] },
      { classCode: '10-B-SEM2', subCodes: ['MATH101', 'SCI101', 'SST101', 'ENG101'] },
      { classCode: '11-SCI-SEM3', subCodes: ['ENG101', 'PHY201', 'CHEM201', 'MATH101'] },
      { classCode: '12-COM-SEM5', subCodes: ['ENG101', 'ACC301', 'BST301', 'MATH101'] },
      // BCA Semesters 1 to 8
      { classCode: 'BCA-A-SEM1', subCodes: ['BCA101', 'BCA102', 'BCA103', 'BCA104', 'BCA105', 'BCA106'] },
      { classCode: 'BCA-A-SEM2', subCodes: ['BCA201', 'BCA202', 'BCA203', 'BCA204', 'BCA205', 'BCA206'] },
      { classCode: 'BCA-A-SEM3', subCodes: ['BCA301', 'BCA302', 'BCA303', 'BCA304', 'BCA305', 'BCA306'] },
      { classCode: 'BCA-A-SEM4', subCodes: ['BCA401', 'BCA402', 'BCA403', 'BCA404', 'BCA405', 'BCA406'] },
      { classCode: 'BCA-A-SEM5', subCodes: ['BCA501', 'BCA502', 'BCA503', 'BCA504', 'BCA505', 'BCA506'] },
      { classCode: 'BCA-A-SEM6', subCodes: ['BCA601', 'BCA602', 'BCA603', 'BCA604', 'BCA605'] },
      { classCode: 'BCA-A-SEM7', subCodes: ['BCA701', 'BCA702', 'BCA703', 'BCA704', 'BCA705'] },
      { classCode: 'BCA-A-SEM8', subCodes: ['BCA801', 'BCA802', 'BCA803', 'BCA804'] }
    ];

    let combCount = 0;
    for (const item of combinationsMap) {
      const cls = findClass(item.classCode);
      if (!cls) continue;
      for (const code of item.subCodes) {
        const sub = findSub(code);
        if (sub) {
          await db.collection('subject_combinations').add({
            class_id: cls.id,
            subject_id: sub.id,
            status: 'Active',
            created_at: new Date().toISOString()
          });
          combCount++;
        }
      }
    }
    console.log(`   ✔ ${combCount} Subject Combinations linked.`);

    // 5. Seed Students
    console.log('🎓 Seeding Students...');
    const rawStudentsData = [
      { roll_id: '1001', name: 'Rahul Sharma', class_code: '10-A-SEM1', gender: 'Male', dob: '2011-05-12', email: 'rahul.sharma@example.com', mobile: '9876543210', status: 'Active' },
      { roll_id: '1002', name: 'Aditi Verma', class_code: '10-A-SEM1', gender: 'Female', dob: '2011-09-20', email: 'aditi.verma@example.com', mobile: '9876543211', status: 'Active' },
      { roll_id: '1021', name: 'Amit Patel', class_code: '10-B-SEM2', gender: 'Male', dob: '2011-02-14', email: 'amit.patel@example.com', mobile: '9876543212', status: 'Active' },
      { roll_id: '1101', name: 'Vikram Singh', class_code: '11-SCI-SEM3', gender: 'Male', dob: '2010-11-05', email: 'vikram.singh@example.com', mobile: '9876543213', status: 'Active' },
      { roll_id: '1102', name: 'Priya Das', class_code: '11-SCI-SEM3', gender: 'Female', dob: '2010-08-18', email: 'priya.das@example.com', mobile: '9876543214', status: 'Active' },
      { roll_id: '1201', name: 'Sneha Gupta', class_code: '12-COM-SEM5', gender: 'Female', dob: '2009-04-25', email: 'sneha.gupta@example.com', mobile: '9876543215', status: 'Active' },
      // BCA Students
      { roll_id: 'BCA2601', name: 'Aryan Sharma', class_code: 'BCA-A-SEM1', gender: 'Male', dob: '2007-06-15', email: 'aryan.sharma@srms-edu.org', mobile: '9811223344', status: 'Active' },
      { roll_id: 'BCA2602', name: 'Tanvi Patel', class_code: 'BCA-A-SEM1', gender: 'Female', dob: '2007-09-22', email: 'tanvi.patel@srms-edu.org', mobile: '9811223345', status: 'Active' },
      { roll_id: 'BCA2501', name: 'Rohan Deshmukh', class_code: 'BCA-A-SEM2', gender: 'Male', dob: '2006-04-10', email: 'rohan.deshmukh@srms-edu.org', mobile: '9811223346', status: 'Active' },
      { roll_id: 'BCA2401', name: 'Ananya Iyer', class_code: 'BCA-A-SEM3', gender: 'Female', dob: '2005-11-03', email: 'ananya.iyer@srms-edu.org', mobile: '9811223347', status: 'Active' },
      { roll_id: 'BCA2301', name: 'Siddharth Verma', class_code: 'BCA-A-SEM4', gender: 'Male', dob: '2005-02-18', email: 'siddharth.verma@srms-edu.org', mobile: '9811223348', status: 'Active' },
      { roll_id: 'BCA2201', name: 'Meera Nambiar', class_code: 'BCA-A-SEM5', gender: 'Female', dob: '2004-07-29', email: 'meera.nambiar@srms-edu.org', mobile: '9811223349', status: 'Active' },
      { roll_id: 'BCA2101', name: 'Kabir Kapoor', class_code: 'BCA-A-SEM6', gender: 'Male', dob: '2003-12-14', email: 'kabir.kapoor@srms-edu.org', mobile: '9811223350', status: 'Active' },
      { roll_id: 'BCA2001', name: 'Diya Sengupta', class_code: 'BCA-A-SEM7', gender: 'Female', dob: '2003-05-08', email: 'diya.sengupta@srms-edu.org', mobile: '9811223351', status: 'Active' },
      { roll_id: 'BCA1901', name: 'Yashvardhan Roy', class_code: 'BCA-A-SEM8', gender: 'Male', dob: '2002-08-30', email: 'yash.roy@srms-edu.org', mobile: '9811223352', status: 'Active' }
    ];

    const studentDocs = [];
    for (const s of rawStudentsData) {
      const cls = findClass(s.class_code);
      const studentPayload = {
        roll_id: s.roll_id,
        name: s.name,
        class_id: cls ? cls.id : '',
        gender: s.gender,
        dob: s.dob,
        email: s.email,
        mobile: s.mobile,
        status: s.status,
        created_at: new Date().toISOString()
      };
      const ref = await db.collection('students').add(studentPayload);
      studentDocs.push({ id: ref.id, ...studentPayload, class_code: s.class_code });
    }
    console.log(`   ✔ ${studentDocs.length} Students enrolled.`);

    // Helper to find student by roll_id
    const findStudent = (roll) => studentDocs.find(st => st.roll_id === roll);

    // 6. Seed Results
    console.log('📝 Seeding Results...');
    const mathSub = findSub('MATH101') ? findSub('MATH101').id : '';
    const sciSub = findSub('SCI101') ? findSub('SCI101').id : '';
    const sstSub = findSub('SST101') ? findSub('SST101').id : '';
    const engSub = findSub('ENG101') ? findSub('ENG101').id : '';
    const phySub = findSub('PHY201') ? findSub('PHY201').id : '';
    const chemSub = findSub('CHEM201') ? findSub('CHEM201').id : '';

    const bca101 = findSub('BCA101') ? findSub('BCA101').id : '';
    const bca102 = findSub('BCA102') ? findSub('BCA102').id : '';
    const bca103 = findSub('BCA103') ? findSub('BCA103').id : '';
    const bca104 = findSub('BCA104') ? findSub('BCA104').id : '';
    const bca105 = findSub('BCA105') ? findSub('BCA105').id : '';
    const bca106 = findSub('BCA106') ? findSub('BCA106').id : '';

    const resultsData = [
      // Rahul Sharma (1001) in Class 10-A
      {
        student_id: findStudent('1001').id,
        class_id: findStudent('1001').class_id,
        roll_id: '1001',
        declared_at: '2026-08-28',
        marks: { [mathSub]: 85, [sciSub]: 90, [sstSub]: 78, [engSub]: 88 }
      },
      // Aditi Verma (1002) in Class 10-A
      {
        student_id: findStudent('1002').id,
        class_id: findStudent('1002').class_id,
        roll_id: '1002',
        declared_at: '2026-08-28',
        marks: { [mathSub]: 92, [sciSub]: 95, [sstSub]: 89, [engSub]: 91 }
      },
      // Vikram Singh (1101) in Class 11-SCI
      {
        student_id: findStudent('1101').id,
        class_id: findStudent('1101').class_id,
        roll_id: '1101',
        declared_at: '2026-08-28',
        marks: { [engSub]: 75, [phySub]: 82, [chemSub]: 79, [mathSub]: 88 }
      },
      // Priya Das (1102) in Class 11-SCI
      {
        student_id: findStudent('1102').id,
        class_id: findStudent('1102').class_id,
        roll_id: '1102',
        declared_at: '2026-08-28',
        marks: { [engSub]: 45, [phySub]: 31, [chemSub]: 55, [mathSub]: 35 }
      },
      // Aryan Sharma (BCA2601) in BCA Sem 1
      {
        student_id: findStudent('BCA2601').id,
        class_id: findStudent('BCA2601').class_id,
        roll_id: 'BCA2601',
        declared_at: '2026-08-28',
        marks: { [bca101]: 88, [bca102]: 92, [bca103]: 85, [bca104]: 79, [bca105]: 90, [bca106]: 95 }
      },
      // Tanvi Patel (BCA2602) in BCA Sem 1
      {
        student_id: findStudent('BCA2602').id,
        class_id: findStudent('BCA2602').class_id,
        roll_id: 'BCA2602',
        declared_at: '2026-08-28',
        marks: { [bca101]: 94, [bca102]: 96, [bca103]: 91, [bca104]: 88, [bca105]: 93, [bca106]: 98 }
      }
    ];

    for (const r of resultsData) {
      await db.collection('results').add({
        ...r,
        created_at: new Date().toISOString()
      });
    }
    console.log(`   ✔ ${resultsData.length} Examination results published.`);

    // 7. Seed Notices
    console.log('📢 Seeding Public Notices...');
    const noticesData = [
      {
        title: 'Final Term Examinations Schedule',
        content: 'The final term examinations for academic session 2026-27 will commence from September 18th, 2026. Please collect your admit cards from the administrative desk by September 10th. Make sure all library dues are cleared.',
        category: 'Examination',
        target: 'All',
        is_pinned: 1,
        created_at: '2026-08-25'
      },
      {
        title: 'BCA Semesters 1 to 8 Curriculum & Results Declared',
        content: 'The BCA (Bachelor of Computer Applications) semesters 1 to 8 subject structures, laboratory modules, and evaluation schemes have been registered. Students of BCA Sem 1 to 8 can check their semester marksheets online.',
        category: 'Result',
        target: 'All',
        is_pinned: 1,
        created_at: '2026-08-30'
      },
      {
        title: 'Mid-Term Results Declared',
        content: 'The Mid-Term examination results for Classes 10th and 11th have been declared. Students can search and download their marksheets using their valid Roll IDs. For correction in student bio details, contact office admin.',
        category: 'Result',
        target: 'All',
        is_pinned: 0,
        created_at: '2026-08-28'
      },
      {
        title: 'Inter-School Science Fair 2026',
        content: 'Interested students from classes 9th to 12th can register for the Annual Inter-School Science & Technology Fair. Registrations close on September 5th. Projects will be mentored by science teachers.',
        category: 'Event',
        target: 'Students',
        is_pinned: 0,
        created_at: '2026-08-20'
      }
    ];

    for (const n of noticesData) {
      await db.collection('notices').add({
        ...n,
        created_at: n.created_at || today
      });
    }
    console.log(`   ✔ ${noticesData.length} Notices created.`);

    console.log('\n======================================================');
    console.log('  🎉 Firebase Firestore Seed Completed Successfully!  ');
    console.log('======================================================\n');
    console.log('You can now run:');
    console.log('   npm start');
    console.log('\nDefault Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@Academia2026!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error while seeding Firestore:', err);
    process.exit(1);
  }
}

seedFirestore();

