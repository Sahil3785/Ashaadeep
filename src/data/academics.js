// ============================================================
// SEED STUDENT & MARKS RECORDS
// These populate localStorage on first visit. The teacher
// dashboard writes on top of them.
// ============================================================

export const SEED_STUDENTS = [
  { student_id: 'STU-1001', roll_no: '1',  name: 'AMAN VERMA',     class: '10TH', section: 'A', father_name: 'Rajesh Verma',   mother_name: 'Sunita Verma',  contact: '9812345670', dob: '2010-04-12', house: 'Jyoti',    fee_status: 'PAID' },
  { student_id: 'STU-1002', roll_no: '2',  name: 'PRIYA SHARMA',   class: '10TH', section: 'A', father_name: 'Mukesh Sharma',  mother_name: 'Geeta Sharma',  contact: '9812345671', dob: '2010-07-02', house: 'Vidya',    fee_status: 'PAID' },
  { student_id: 'STU-1003', roll_no: '3',  name: 'ROHIT KUMAR',    class: '10TH', section: 'B', father_name: 'Suresh Kumar',   mother_name: 'Kavita Devi',   contact: '9812345672', dob: '2010-01-25', house: 'Shakti',   fee_status: 'PENDING' },
  { student_id: 'STU-1004', roll_no: '1',  name: 'ANANYA GUPTA',   class: '9TH',  section: 'A', father_name: 'Dinesh Gupta',   mother_name: 'Anita Gupta',   contact: '9812345673', dob: '2011-03-18', house: 'Prakriti', fee_status: 'PAID' },
  { student_id: 'STU-1005', roll_no: '2',  name: 'HARSHIT JAIN',   class: '9TH',  section: 'A', father_name: 'Vikas Jain',     mother_name: 'Ritu Jain',     contact: '9812345674', dob: '2011-09-09', house: 'Jyoti',    fee_status: 'PAID' },
  { student_id: 'STU-1006', roll_no: '10', name: 'SAHIL KHAN',     class: '10TH', section: 'A', father_name: 'Arif Khan',      mother_name: 'Salma Begum',   contact: '9812345675', dob: '2010-11-30', house: 'Vidya',    fee_status: 'PAID' },
  { student_id: 'STU-1007', roll_no: '5',  name: 'DIKSHA RANI',    class: '8TH',  section: 'A', father_name: 'Vijay Kumar',    mother_name: 'Pooja Rani',    contact: '9812345676', dob: '2012-06-14', house: 'Prakriti', fee_status: 'PAID' },
  { student_id: 'STU-1008', roll_no: '1',  name: 'KABIR SINGH',    class: 'PP1',  section: 'A', father_name: 'Harjeet Singh',  mother_name: 'Simran Kaur',   contact: '9812345677', dob: '2022-02-08', house: 'Shakti',   fee_status: 'PAID' },
  { student_id: 'STU-1009', roll_no: '4',  name: 'NEHA CHAUHAN',   class: '10TH', section: 'A', father_name: 'Ramesh Chauhan', mother_name: 'Meena Chauhan', contact: '9812345678', dob: '2010-05-21', house: 'Jyoti',    fee_status: 'PAID' },
  { student_id: 'STU-1010', roll_no: '3',  name: 'ARJUN MALIK',    class: '9TH',  section: 'B', father_name: 'Satbir Malik',   mother_name: 'Rekha Malik',   contact: '9812345679', dob: '2011-12-03', house: 'Shakti',   fee_status: 'PENDING' },
];

// Helper so the long seed list below stays readable.
const mk = (id, student_id, cls, exam, subject, code, tMax, tObt, pMax, pObt) =>
  ({ marks_id: id, student_id, class: cls, exam_name: exam, subject, code,
     theory_max: tMax, theory_obt: tObt, practical_max: pMax, practical_obt: pObt });

export const SEED_MARKS = [
  // ---- AMAN VERMA (STU-1001, Class 10) ----
  mk('M-01', 'STU-1001', '10TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 28, 10, 10),
  mk('M-02', 'STU-1001', '10TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 27, 10, 9),
  mk('M-03', 'STU-1001', '10TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 30, 10, 10),
  mk('M-04', 'STU-1001', '10TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 28, 10, 9),
  mk('M-05', 'STU-1001', '10TH', 'UT-1', 'Social Science', 'SST-105', 30, 27, 10, 9),
  mk('M-06', 'STU-1001', '10TH', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 20, 20, 20),

  mk('M-07', 'STU-1001', '10TH', 'SA-1', 'Hindi (Core)', 'HIN-101', 80, 74, 20, 19),
  mk('M-08', 'STU-1001', '10TH', 'SA-1', 'English Language & Lit', 'ENG-102', 80, 72, 20, 19),
  mk('M-09', 'STU-1001', '10TH', 'SA-1', 'Mathematics Standard', 'MAT-103', 80, 79, 20, 20),
  mk('M-10', 'STU-1001', '10TH', 'SA-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 80, 76, 20, 19),
  mk('M-11', 'STU-1001', '10TH', 'SA-1', 'Social Science', 'SST-105', 80, 73, 20, 18),
  mk('M-12', 'STU-1001', '10TH', 'SA-1', 'Information Technology (Voc)', 'IT-402', 50, 48, 50, 49),

  mk('M-13', 'STU-1001', '10TH', 'UT-2', 'Hindi (Core)', 'HIN-101', 30, 29, 10, 10),
  mk('M-14', 'STU-1001', '10TH', 'UT-2', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  mk('M-15', 'STU-1001', '10TH', 'UT-2', 'Mathematics Standard', 'MAT-103', 30, 29, 10, 10),
  mk('M-16', 'STU-1001', '10TH', 'UT-2', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 29, 10, 10),
  mk('M-17', 'STU-1001', '10TH', 'UT-2', 'Social Science', 'SST-105', 30, 28, 10, 9),
  mk('M-18', 'STU-1001', '10TH', 'UT-2', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 20),

  // ---- PRIYA SHARMA (STU-1002, Class 10) — the topper ----
  mk('M-19', 'STU-1002', '10TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 29, 10, 10),
  mk('M-20', 'STU-1002', '10TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 29, 10, 10),
  mk('M-21', 'STU-1002', '10TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 28, 10, 9),
  mk('M-22', 'STU-1002', '10TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 29, 10, 10),
  mk('M-23', 'STU-1002', '10TH', 'UT-1', 'Social Science', 'SST-105', 30, 28, 10, 9),
  mk('M-24', 'STU-1002', '10TH', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 20),

  mk('M-25', 'STU-1002', '10TH', 'SA-1', 'Hindi (Core)', 'HIN-101', 80, 78, 20, 20),
  mk('M-26', 'STU-1002', '10TH', 'SA-1', 'English Language & Lit', 'ENG-102', 80, 76, 20, 19),
  mk('M-27', 'STU-1002', '10TH', 'SA-1', 'Mathematics Standard', 'MAT-103', 80, 77, 20, 19),
  mk('M-28', 'STU-1002', '10TH', 'SA-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 80, 79, 20, 20),
  mk('M-29', 'STU-1002', '10TH', 'SA-1', 'Social Science', 'SST-105', 80, 75, 20, 19),
  mk('M-30', 'STU-1002', '10TH', 'SA-1', 'Information Technology (Voc)', 'IT-402', 50, 49, 50, 50),

  // ---- ROHIT KUMAR (STU-1003) — has marks, but fees are pending ----
  mk('M-31', 'STU-1003', '10TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 22, 10, 8),
  mk('M-32', 'STU-1003', '10TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 19, 10, 7),
  mk('M-33', 'STU-1003', '10TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 24, 10, 9),
  mk('M-34', 'STU-1003', '10TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 21, 10, 8),
  mk('M-35', 'STU-1003', '10TH', 'UT-1', 'Social Science', 'SST-105', 30, 20, 10, 8),

  // ---- ANANYA GUPTA (STU-1004, Class 9) ----
  mk('M-36', 'STU-1004', '9TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 27, 10, 10),
  mk('M-37', 'STU-1004', '9TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  mk('M-38', 'STU-1004', '9TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 26, 10, 9),
  mk('M-39', 'STU-1004', '9TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 9),
  mk('M-40', 'STU-1004', '9TH', 'UT-1', 'Social Science', 'SST-105', 30, 25, 10, 9),

  // ---- HARSHIT JAIN (STU-1005, Class 9) ----
  mk('M-41', 'STU-1005', '9TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 24, 10, 9),
  mk('M-42', 'STU-1005', '9TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 23, 10, 8),
  mk('M-43', 'STU-1005', '9TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 27, 10, 10),
  mk('M-44', 'STU-1005', '9TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 25, 10, 9),
  mk('M-45', 'STU-1005', '9TH', 'UT-1', 'Social Science', 'SST-105', 30, 22, 10, 8),

  // ---- SAHIL KHAN (STU-1006, Class 10) ----
  mk('M-46', 'STU-1006', '10TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 26, 10, 9),
  mk('M-47', 'STU-1006', '10TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 25, 10, 9),
  mk('M-48', 'STU-1006', '10TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 28, 10, 10),
  mk('M-49', 'STU-1006', '10TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 10),
  mk('M-50', 'STU-1006', '10TH', 'UT-1', 'Social Science', 'SST-105', 30, 24, 10, 9),
  mk('M-51', 'STU-1006', '10TH', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 18, 20, 19),

  // ---- DIKSHA RANI (STU-1007, Class 8) ----
  mk('M-52', 'STU-1007', '8TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 28, 10, 10),
  mk('M-53', 'STU-1007', '8TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 26, 10, 9),
  mk('M-54', 'STU-1007', '8TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 29, 10, 10),
  mk('M-55', 'STU-1007', '8TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 10),
  mk('M-56', 'STU-1007', '8TH', 'UT-1', 'Social Science', 'SST-105', 30, 26, 10, 9),

  // ---- NEHA CHAUHAN (STU-1009, Class 10) ----
  mk('M-57', 'STU-1009', '10TH', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 27, 10, 10),
  mk('M-58', 'STU-1009', '10TH', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  mk('M-59', 'STU-1009', '10TH', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 25, 10, 9),
  mk('M-60', 'STU-1009', '10TH', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 26, 10, 9),
  mk('M-61', 'STU-1009', '10TH', 'UT-1', 'Social Science', 'SST-105', 30, 27, 10, 10),
  mk('M-62', 'STU-1009', '10TH', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 19),

  // ---- KABIR SINGH (STU-1008, PP1) — graded on activity, not papers ----
  mk('M-63', 'STU-1008', 'PP1', 'UT-1', 'English Phonics & Rhymes', 'ENG-PP1', 25, 23, 25, 24),
  mk('M-64', 'STU-1008', 'PP1', 'UT-1', 'Numbers & Early Math', 'MAT-PP1', 25, 24, 25, 25),
  mk('M-65', 'STU-1008', 'PP1', 'UT-1', 'Drawing & Art', 'ART-108', 25, 22, 25, 25),
];
