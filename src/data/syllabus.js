// ============================================================
// SYLLABUS BLUEPRINT — NCERT chapter modules per class.
// `weight` is the approximate share of the annual paper.
// ============================================================

export const SYLLABUS = {
  'PP1': [
    { subject: 'English Phonics & Rhymes', code: 'ENG-PP1', weight: 25, book: 'Early Phonics Wonder — Step 1',
      chapters: ['Alphabet sound recognition A–Z', 'Sight words and three-letter blends (cat, bat, sun)', 'Nursery action rhymes and story listening', 'Pencil grip and letter tracing'] },
    { subject: 'Numbers & Early Math', code: 'MAT-PP1', weight: 25, book: 'Early Math Explorer — Step 1',
      chapters: ['Counting and writing numbers 1 to 50', 'Big and small, tall and short, more and less', 'Shapes: circle, triangle, square, rectangle', 'Colour recognition and sorting by group'] },
    { subject: 'Hindi Varnmala', code: 'HIN-PP1', weight: 20, book: 'Hindi Pehli Seedhi',
      chapters: ['स्वर अ से अः पहचान', 'व्यंजन क से ज्ञ', 'सरल दो अक्षर शब्द', 'बाल कविताएँ और कहानी श्रवण'] },
    { subject: 'General Awareness', code: 'EVS-PP1', weight: 15, book: 'My Little World',
      chapters: ['Myself and my family', 'Parts of the body', 'Fruits, vegetables and animals', 'Good habits and safety rules'] },
    { subject: 'Drawing & Art', code: 'ART-108', weight: 15, book: 'Creative Hands — Junior',
      chapters: ['Free colouring within outlines', 'Thumb printing and leaf printing', 'Clay modelling basics', 'Paper folding and tearing craft'] },
  ],

  '5TH': [
    { subject: 'Mathematics', code: 'MAT-501', weight: 20, book: 'NCERT Math-Magic 5',
      chapters: ['The Fish Tale — large numbers', 'Shapes and Angles', 'How Many Squares — area and perimeter', 'Parts and Wholes — fractions', 'Does it Look the Same — symmetry', 'Mapping Your Way', 'Tenths and Hundredths — decimals', 'Area and its Boundary'] },
    { subject: 'Environmental Studies', code: 'EVS-501', weight: 20, book: 'NCERT Looking Around 5',
      chapters: ['Super Senses', 'A Snake Charmer\'s Story', 'From Tasting to Digesting', 'Mangoes Round the Year', 'Seeds and Seeds', 'Every Drop Counts', 'Experiments with Water', 'Up You Go — mountaineering'] },
    { subject: 'English', code: 'ENG-501', weight: 20, book: 'NCERT Marigold 5',
      chapters: ['Ice-cream Man and Wonderful Waste', 'Teamwork and Flying Together', 'My Shadow and Robinson Crusoe', 'Crying and My Elder Brother', 'Grammar: tenses, articles, prepositions', 'Paragraph and informal letter writing'] },
    { subject: 'Hindi', code: 'HIN-501', weight: 20, book: 'NCERT रिमझिम 5',
      chapters: ['राख की रस्सी', 'फसलों के त्योहार', 'खिलौनेवाला', 'नन्हा फनकार', 'व्याकरण: संज्ञा, सर्वनाम, विशेषण, क्रिया', 'पत्र लेखन और अनुच्छेद' ] },
    { subject: 'Computer Basics', code: 'CMP-501', weight: 20, book: 'Cyber Beans 5',
      chapters: ['Parts of a computer and input/output devices', 'Typing practice and MS Paint tools', 'Introduction to MS Word', 'Internet safety for children'] },
  ],

  '8TH': [
    { subject: 'Mathematics', code: 'MAT-801', weight: 20, book: 'NCERT Mathematics 8 + Exemplar',
      chapters: ['Rational Numbers', 'Linear Equations in One Variable', 'Understanding Quadrilaterals', 'Data Handling', 'Squares, Square Roots, Cubes & Cube Roots', 'Comparing Quantities — profit, loss, interest', 'Algebraic Expressions & Identities', 'Mensuration', 'Exponents and Powers', 'Direct and Inverse Proportions', 'Factorisation', 'Introduction to Graphs'] },
    { subject: 'Science', code: 'SCI-801', weight: 20, book: 'NCERT Science 8',
      chapters: ['Crop Production and Management', 'Microorganisms: Friend and Foe', 'Coal and Petroleum', 'Combustion and Flame', 'Conservation of Plants and Animals', 'Cell Structure and Functions', 'Reproduction in Animals', 'Reaching the Age of Adolescence', 'Force and Pressure', 'Friction', 'Sound', 'Chemical Effects of Electric Current', 'Light'] },
    { subject: 'Social Science', code: 'SST-801', weight: 20, book: 'NCERT Our Pasts III, Resources and Development, Social and Political Life III',
      chapters: ['History: From Trade to Territory', 'History: Ruling the Countryside', 'History: The Revolt of 1857', 'Geography: Resources and Land, Soil, Water', 'Geography: Agriculture and Industries', 'Civics: The Indian Constitution', 'Civics: Understanding Secularism', 'Civics: Judiciary and the Police'] },
    { subject: 'English', code: 'ENG-801', weight: 20, book: 'NCERT Honeydew & It So Happened',
      chapters: ['The Best Christmas Present in the World', 'The Tsunami', 'Glimpses of the Past', 'Bepin Choudhury\'s Lapse of Memory', 'The Open Window', 'Grammar: active-passive voice, reported speech, modals', 'Writing: notice, formal letter, story'] },
    { subject: 'Hindi', code: 'HIN-801', weight: 20, book: 'NCERT वसंत भाग 3',
      chapters: ['ध्वनि और लाख की चूड़ियाँ', 'बस की यात्रा', 'दीवानों की हस्ती', 'अकबरी लोटा', 'व्याकरण: वाच्य, समास, अलंकार, मुहावरे', 'निबंध, पत्र और संवाद लेखन'] },
  ],

  '9TH': [
    { subject: 'Mathematics', code: 'MAT-901', weight: 20, book: 'NCERT Mathematics 9 + Exemplar',
      chapters: ['Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations in Two Variables', 'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Circles', 'Heron\'s Formula', 'Surface Areas and Volumes', 'Statistics'] },
    { subject: 'Science', code: 'SCI-901', weight: 20, book: 'NCERT Science 9',
      chapters: ['Matter in Our Surroundings', 'Is Matter Around Us Pure?', 'Atoms and Molecules', 'Structure of the Atom', 'The Fundamental Unit of Life', 'Tissues', 'Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound', 'Improvement in Food Resources'] },
    { subject: 'Social Science', code: 'SST-901', weight: 20, book: 'NCERT India and the Contemporary World I, Contemporary India I, Democratic Politics I, Economics',
      chapters: ['History: The French Revolution', 'History: Socialism in Europe and the Russian Revolution', 'History: Nazism and the Rise of Hitler', 'Geography: India — Size, Location, Physical Features', 'Geography: Drainage, Climate, Natural Vegetation', 'Civics: What is Democracy? Constitutional Design', 'Civics: Electoral Politics and Working of Institutions', 'Economics: The Story of Village Palampur, People as Resource, Poverty'] },
    { subject: 'English Language & Literature', code: 'ENG-902', weight: 20, book: 'NCERT Beehive & Moments',
      chapters: ['Beehive Prose: The Fun They Had, The Sound of Music, Kathmandu', 'Beehive Poetry: The Road Not Taken, Wind, Rain on the Roof', 'Moments: The Lost Child, Iswaran the Storyteller, In the Kingdom of Fools', 'Grammar: tenses, modals, subject-verb concord, reported speech', 'Writing: descriptive paragraph, diary entry, story'] },
    { subject: 'Hindi Course A', code: 'HIN-901', weight: 20, book: 'NCERT क्षितिज भाग 1 व कृतिका भाग 1',
      chapters: ['क्षितिज: दो बैलों की कथा, ल्हासा की ओर', 'क्षितिज काव्य: साखियाँ, वाख, सवैये', 'कृतिका: इस जल प्रलय में, मेरे संग की औरतें', 'व्याकरण: उपसर्ग-प्रत्यय, समास, अलंकार', 'अनुच्छेद, पत्र और संवाद लेखन'] },
    { subject: 'Information Technology', code: 'IT-402', weight: 0, book: 'CBSE Vocational IT 9 (optional subject)',
      chapters: ['Basic ICT skills and digital documentation', 'Electronic spreadsheet fundamentals', 'Digital presentation', 'Email and internet etiquette'] },
  ],

  '10TH': [
    { subject: 'Mathematics Standard / Basic', code: 'MAT-103', weight: 20, book: 'NCERT Mathematics 10 + Exemplar',
      chapters: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles and Similarity', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'] },
    { subject: 'Science (Phy, Chem, Bio)', code: 'SCI-104', weight: 20, book: 'NCERT Science 10',
      chapters: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity and Evolution', 'Light — Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Our Environment'] },
    { subject: 'Social Science', code: 'SST-105', weight: 20, book: 'NCERT India and the Contemporary World II, Contemporary India II, Democratic Politics II, Understanding Economic Development',
      chapters: ['History: The Rise of Nationalism in Europe', 'History: Nationalism in India', 'History: The Making of a Global World', 'Geography: Resources and Development', 'Geography: Water Resources, Agriculture, Minerals and Energy', 'Geography: Manufacturing Industries and Lifelines of the Economy', 'Civics: Power Sharing and Federalism', 'Civics: Gender, Religion and Caste; Political Parties', 'Economics: Development, Sectors of the Indian Economy', 'Economics: Money and Credit, Globalisation, Consumer Rights'] },
    { subject: 'English Language & Lit', code: 'ENG-102', weight: 20, book: 'NCERT First Flight & Footprints Without Feet',
      chapters: ['First Flight Prose: A Letter to God, Nelson Mandela, Two Stories about Flying', 'First Flight Prose: From the Diary of Anne Frank, Glimpses of India', 'First Flight Poetry: Dust of Snow, Fire and Ice, A Tiger in the Zoo, Amanda', 'Footprints: A Triumph of Surgery, The Thief\'s Story, The Midnight Visitor, Bholi', 'Grammar: tenses, modals, subject-verb concord, reported speech, determiners', 'Writing: formal letter, analytical paragraph'] },
    { subject: 'Hindi Course A', code: 'HIN-101', weight: 20, book: 'NCERT क्षितिज भाग 2 व कृतिका भाग 2',
      chapters: ['क्षितिज गद्य: नेताजी का चश्मा, बालगोबिन भगत, लखनवी अंदाज़', 'क्षितिज काव्य: सूरदास के पद, तुलसीदास, देव, जयशंकर प्रसाद', 'कृतिका: माता का अँचल, साना साना हाथ जोड़ि', 'व्याकरण: रचना के आधार पर वाक्य भेद, वाच्य, पद परिचय, रस', 'अनुच्छेद, पत्र, सूचना और विज्ञापन लेखन'] },
    { subject: 'Information Technology (Voc)', code: 'IT-402', weight: 0, book: 'CBSE Vocational IT 10',
      chapters: ['Digital Documentation (Advanced) — LibreOffice Writer', 'Electronic Spreadsheet (Advanced) — LibreOffice Calc', 'Database Management System — LibreOffice Base / MySQL', 'Web Applications and Security', 'Employability skills and entrepreneurship'] },
  ],
};

export const SYLLABUS_CLASSES = Object.keys(SYLLABUS);

// ============================================================
// GRADING — HBSE / CBSE nine-point scale.
// ============================================================
export function calculateGrade(pct) {
  if (pct >= 91) return { grade: 'A1', points: 10.0, remark: 'Outstanding', tone: 'garden' };
  if (pct >= 81) return { grade: 'A2', points: 9.0,  remark: 'Excellent',   tone: 'garden' };
  if (pct >= 71) return { grade: 'B1', points: 8.0,  remark: 'Very Good',   tone: 'garden' };
  if (pct >= 61) return { grade: 'B2', points: 7.0,  remark: 'Good',        tone: 'brass'  };
  if (pct >= 51) return { grade: 'C1', points: 6.0,  remark: 'Above Average', tone: 'brass' };
  if (pct >= 41) return { grade: 'C2', points: 5.0,  remark: 'Average',     tone: 'brass'  };
  if (pct >= 33) return { grade: 'D',  points: 4.0,  remark: 'Needs Improvement', tone: 'rose' };
  return { grade: 'E', points: 0.0, remark: 'Essential Repeat', tone: 'rose' };
}

// Overall division label, the way Indian marksheets phrase it.
export function divisionFor(pct) {
  if (pct >= 75) return 'PASSED WITH DISTINCTION';
  if (pct >= 60) return 'PASSED IN FIRST DIVISION';
  if (pct >= 45) return 'PASSED IN SECOND DIVISION';
  if (pct >= 33) return 'PASSED IN THIRD DIVISION';
  return 'NOT QUALIFIED — REAPPEAR';
}

// Totals a list of mark rows into one summary object.
export function summarise(rows) {
  const max = rows.reduce((a, m) => a + (+m.theory_max || 0) + (+m.practical_max || 0), 0);
  const obt = rows.reduce((a, m) => a + (+m.theory_obt || 0) + (+m.practical_obt || 0), 0);
  const pct = max > 0 ? (obt / max) * 100 : 0;
  const perSubject = rows.map(m => {
    const sMax = (+m.theory_max || 0) + (+m.practical_max || 0);
    const sObt = (+m.theory_obt || 0) + (+m.practical_obt || 0);
    const sPct = sMax > 0 ? (sObt / sMax) * 100 : 0;
    return { ...m, sMax, sObt, sPct, ...calculateGrade(sPct) };
  });
  const cgpa = perSubject.length
    ? perSubject.reduce((a, s) => a + s.points, 0) / perSubject.length
    : 0;
  return {
    max, obt, pct,
    perSubject,
    cgpa,
    grade: calculateGrade(pct),
    division: divisionFor(pct),
    best: perSubject.reduce((b, s) => (!b || s.sPct > b.sPct ? s : b), null),
    weakest: perSubject.reduce((w, s) => (!w || s.sPct < w.sPct ? s : w), null),
  };
}
