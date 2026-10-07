-- ============================================================================
-- Seed data — the same ten demo students the offline build shipped with.
-- Optional: skip this file if you are loading your real register instead.
-- Safe to re-run; existing rows are left alone.
-- ============================================================================

insert into public.students (admission_no, roll_no, name, class, section, father_name, mother_name, contact, dob, house, fee_status) values
  ('STU-1001', '1', 'AMAN VERMA', '10TH', 'A', 'Rajesh Verma', 'Sunita Verma', '9812345670', '2010-04-12', 'Jyoti', 'PAID'),
  ('STU-1002', '2', 'PRIYA SHARMA', '10TH', 'A', 'Mukesh Sharma', 'Geeta Sharma', '9812345671', '2010-07-02', 'Vidya', 'PAID'),
  ('STU-1003', '3', 'ROHIT KUMAR', '10TH', 'B', 'Suresh Kumar', 'Kavita Devi', '9812345672', '2010-01-25', 'Shakti', 'PENDING'),
  ('STU-1004', '1', 'ANANYA GUPTA', '9TH', 'A', 'Dinesh Gupta', 'Anita Gupta', '9812345673', '2011-03-18', 'Prakriti', 'PAID'),
  ('STU-1005', '2', 'HARSHIT JAIN', '9TH', 'A', 'Vikas Jain', 'Ritu Jain', '9812345674', '2011-09-09', 'Jyoti', 'PAID'),
  ('STU-1006', '10', 'SAHIL KHAN', '10TH', 'A', 'Arif Khan', 'Salma Begum', '9812345675', '2010-11-30', 'Vidya', 'PAID'),
  ('STU-1007', '5', 'DIKSHA RANI', '8TH', 'A', 'Vijay Kumar', 'Pooja Rani', '9812345676', '2012-06-14', 'Prakriti', 'PAID'),
  ('STU-1008', '1', 'KABIR SINGH', 'PP1', 'A', 'Harjeet Singh', 'Simran Kaur', '9812345677', '2022-02-08', 'Shakti', 'PAID'),
  ('STU-1009', '4', 'NEHA CHAUHAN', '10TH', 'A', 'Ramesh Chauhan', 'Meena Chauhan', '9812345678', '2010-05-21', 'Jyoti', 'PAID'),
  ('STU-1010', '3', 'ARJUN MALIK', '9TH', 'B', 'Satbir Malik', 'Rekha Malik', '9812345679', '2011-12-03', 'Shakti', 'PENDING')
on conflict (class, section, roll_no) do nothing;

-- Marks attach by looking each student up on their admission number, so this
-- works regardless of the uuid Postgres generated for them above.
insert into public.marks (student_id, exam_name, subject, code, theory_max, theory_obt, practical_max, practical_obt)
select s.id, v.exam_name, v.subject, v.code, v.theory_max, v.theory_obt, v.practical_max, v.practical_obt
from (values
  ('STU-1001', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 28, 10, 10),
  ('STU-1001', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 27, 10, 9),
  ('STU-1001', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 30, 10, 10),
  ('STU-1001', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 28, 10, 9),
  ('STU-1001', 'UT-1', 'Social Science', 'SST-105', 30, 27, 10, 9),
  ('STU-1001', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 20, 20, 20),
  ('STU-1001', 'SA-1', 'Hindi (Core)', 'HIN-101', 80, 74, 20, 19),
  ('STU-1001', 'SA-1', 'English Language & Lit', 'ENG-102', 80, 72, 20, 19),
  ('STU-1001', 'SA-1', 'Mathematics Standard', 'MAT-103', 80, 79, 20, 20),
  ('STU-1001', 'SA-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 80, 76, 20, 19),
  ('STU-1001', 'SA-1', 'Social Science', 'SST-105', 80, 73, 20, 18),
  ('STU-1001', 'SA-1', 'Information Technology (Voc)', 'IT-402', 50, 48, 50, 49),
  ('STU-1001', 'UT-2', 'Hindi (Core)', 'HIN-101', 30, 29, 10, 10),
  ('STU-1001', 'UT-2', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  ('STU-1001', 'UT-2', 'Mathematics Standard', 'MAT-103', 30, 29, 10, 10),
  ('STU-1001', 'UT-2', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 29, 10, 10),
  ('STU-1001', 'UT-2', 'Social Science', 'SST-105', 30, 28, 10, 9),
  ('STU-1001', 'UT-2', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 20),
  ('STU-1002', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 29, 10, 10),
  ('STU-1002', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 29, 10, 10),
  ('STU-1002', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 28, 10, 9),
  ('STU-1002', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 29, 10, 10),
  ('STU-1002', 'UT-1', 'Social Science', 'SST-105', 30, 28, 10, 9),
  ('STU-1002', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 20),
  ('STU-1002', 'SA-1', 'Hindi (Core)', 'HIN-101', 80, 78, 20, 20),
  ('STU-1002', 'SA-1', 'English Language & Lit', 'ENG-102', 80, 76, 20, 19),
  ('STU-1002', 'SA-1', 'Mathematics Standard', 'MAT-103', 80, 77, 20, 19),
  ('STU-1002', 'SA-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 80, 79, 20, 20),
  ('STU-1002', 'SA-1', 'Social Science', 'SST-105', 80, 75, 20, 19),
  ('STU-1002', 'SA-1', 'Information Technology (Voc)', 'IT-402', 50, 49, 50, 50),
  ('STU-1003', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 22, 10, 8),
  ('STU-1003', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 19, 10, 7),
  ('STU-1003', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 24, 10, 9),
  ('STU-1003', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 21, 10, 8),
  ('STU-1003', 'UT-1', 'Social Science', 'SST-105', 30, 20, 10, 8),
  ('STU-1004', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 27, 10, 10),
  ('STU-1004', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  ('STU-1004', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 26, 10, 9),
  ('STU-1004', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 9),
  ('STU-1004', 'UT-1', 'Social Science', 'SST-105', 30, 25, 10, 9),
  ('STU-1005', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 24, 10, 9),
  ('STU-1005', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 23, 10, 8),
  ('STU-1005', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 27, 10, 10),
  ('STU-1005', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 25, 10, 9),
  ('STU-1005', 'UT-1', 'Social Science', 'SST-105', 30, 22, 10, 8),
  ('STU-1006', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 26, 10, 9),
  ('STU-1006', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 25, 10, 9),
  ('STU-1006', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 28, 10, 10),
  ('STU-1006', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 10),
  ('STU-1006', 'UT-1', 'Social Science', 'SST-105', 30, 24, 10, 9),
  ('STU-1006', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 18, 20, 19),
  ('STU-1007', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 28, 10, 10),
  ('STU-1007', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 26, 10, 9),
  ('STU-1007', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 29, 10, 10),
  ('STU-1007', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 27, 10, 10),
  ('STU-1007', 'UT-1', 'Social Science', 'SST-105', 30, 26, 10, 9),
  ('STU-1009', 'UT-1', 'Hindi (Core)', 'HIN-101', 30, 27, 10, 10),
  ('STU-1009', 'UT-1', 'English Language & Lit', 'ENG-102', 30, 28, 10, 10),
  ('STU-1009', 'UT-1', 'Mathematics Standard', 'MAT-103', 30, 25, 10, 9),
  ('STU-1009', 'UT-1', 'Science (Phy, Chem, Bio)', 'SCI-104', 30, 26, 10, 9),
  ('STU-1009', 'UT-1', 'Social Science', 'SST-105', 30, 27, 10, 10),
  ('STU-1009', 'UT-1', 'Information Technology (Voc)', 'IT-402', 20, 19, 20, 19),
  ('STU-1008', 'UT-1', 'English Phonics & Rhymes', 'ENG-PP1', 25, 23, 25, 24),
  ('STU-1008', 'UT-1', 'Numbers & Early Math', 'MAT-PP1', 25, 24, 25, 25),
  ('STU-1008', 'UT-1', 'Drawing & Art', 'ART-108', 25, 22, 25, 25)
) as v(admission_no, exam_name, subject, code, theory_max, theory_obt, practical_max, practical_obt)
join public.students s on s.admission_no = v.admission_no
on conflict (student_id, exam_name, code) do nothing;

-- ---------------------------------------------------------------------------
-- Notices and events shown on the public website.
-- ---------------------------------------------------------------------------
insert into public.notices (title, body, tag, is_urgent, publish_date) values
  ('Admissions open for Session 2026-27', 'Registration for Pre-Primary (PP1) through Class 9 is now open. Forms are available at the school office and through the Admissions page on this portal. Class 10 admissions are subject to seat availability and a transfer certificate.', 'Admissions', true, '2026-10-04'),
  ('Unit Test 2 (UT-2) datesheet released', 'UT-2 for Classes 6 to 10 runs from 20 October to 27 October 2026. Exams are held in the first two periods; school closes at 11:30 AM on all exam days. The subject-wise datesheet is on the classroom noticeboard.', 'Examination', true, '2026-10-01'),
  ('Quarterly fee due by 10 October', 'The second-quarter fee can be paid at the office counter or instantly through the UPI QR on the Fee Payment page. Marksheets are released only after dues are cleared, so please pay before the UT-2 result date.', 'Fees', false, '2026-09-28'),
  ('Science & Robotics Exhibition — 15 November', 'Students of Classes 6 to 10 will display working models. Parents are welcome from 10:00 AM to 1:00 PM. Teams should submit project titles to Mr. Vinod Saini by 30 October.', 'Event', false, '2026-09-20'),
  ('Parent–Teacher Meeting this Saturday', 'PTM for all classes on Saturday, 19 September, from 9:00 AM to 12:00 PM. Class teachers will share UT-1 performance and attendance records. Please bring the student diary.', 'PTM', false, '2026-09-14'),
  ('School closed for Gandhi Jayanti', 'The school will remain closed on 2 October 2026. Classes resume as usual on 3 October with the regular timetable.', 'Holiday', false, '2026-09-05')
on conflict do nothing;

insert into public.events (title, event_type, description, event_date) values
  ('Unit Test 2 Begins', 'Examination', 'Classes 6–10. First two periods daily; early dismissal at 11:30 AM.', '2026-10-20'),
  ('Children''s Day Celebration', 'Cultural', 'Teachers perform for students. Inter-house quiz and prize distribution.', '2026-11-14'),
  ('Science & Robotics Exhibition', 'Academic', 'Student-built working models, open to parents 10:00 AM – 1:00 PM.', '2026-11-15'),
  ('Annual Sports Meet', 'Sports', 'Track events, kabaddi and volleyball finals across all four houses.', '2026-12-10'),
  ('Republic Day Flag Hoisting', 'National', 'Assembly ground, 8:00 AM. NCC march-past and patriotic choir.', '2027-01-26'),
  ('Annual Day & Prize Distribution', 'Cultural', 'Every section performs. Academic and sports awards presented to toppers.', '2027-02-14'),
  ('Annual Examination Begins', 'Examination', 'Classes PP1–9. Class 10 appears for the HBSE Board examination.', '2027-03-05')
on conflict do nothing;
