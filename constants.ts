import { Book, Chapter } from './types';

export const CONFIG = {
  TRIAL_CHAPTERS: 2,
  TRIAL_DAYS: 7,
  VALID_LICENSE_PREFIX: 'INF-',
  TEST_LICENSE: 'INF-TEST-2024'
};

const createChapter = (
  id: string, 
  title: string, 
  section: 'front' | 'chapter' | 'back', 
  num: number, 
  badge?: string
): Chapter => ({
  id,
  title,
  label: title,
  section,
  chapterNumber: num,
  badge,
  // Placeholder content since we don't have the files
  content: `
    <h3>${title}</h3>
    <p class="italic text-medium-gray mb-8">Loading content for ${title}...</p>
    <p>The mechanisms of the Loop are often invisible to the naked eye, obscured by layers of historical precedent and bureaucratic abstraction. To understand the present moment, we must trace the threads back to their origin points.</p>
    <p>In this section, we explore the fundamental dynamics that have shaped this reality. It is not merely a history lesson, but a diagnostic tool for the systems currently in operation.</p>
    <p>Generating detailed analysis...</p>
  `
});

export const INFINITY_LOOP_BOOK: Book = {
  title: "The Infinity Loop",
  frontMatter: [
    createChapter('title-page', 'Title Page', 'front', 0),
    createChapter('dedication', 'Dedication', 'front', 0),
    createChapter('epigraph', 'Epigraph', 'front', 0),
    createChapter('warning', 'Content Warning / Reader Care Note', 'front', 0),
    createChapter('language', 'A Note on Language and Terminology', 'front', 0),
    createChapter('guide', "How to Use This Book: A Reader's Guide", 'front', 0),
    createChapter('preface', "Author's Preface: Understanding the Infinity Loop", 'front', 0),
    createChapter('methodology', 'Note on Sources and Methodology', 'front', 0)
  ],
  chapters: [
    createChapter('ch1', 'CHAPTER 1: THE GENESIS: RECONSTRUCTION AND THE BLACK CODES', 'chapter', 1, '(1865 - 1877) LoopSnapshot🟡6/10'),
    createChapter('ch2', 'CHAPTER 2: THE REFINEMENT: JIM CROW AND THE RISE OF LEGALIZED APARTHEID', 'chapter', 2, '(1877 - 1919) LoopSnapshot🟢8/10'),
    createChapter('ch3', 'CHAPTER 3: MOBILIZATION AND BACKLASH: RED SUMMER, GARVEY, AND THE PROTO-COINTELPRO', 'chapter', 3, '(1919 - 1945) LoopSnapshot🔴8/10'),
    createChapter('ch4', 'CHAPTER 4: COLD WAR CONTRADICTIONS: VETERANS, MCGEE, AND "GENOCIDE"', 'chapter', 4, '(1946 - 1955) LoopSnapshot🔴8/10'),
    createChapter('ch5', 'CHAPTER 5: COINTELPRO PEAK: NEUTRALIZATION, KERNER, AND THE PANTHER\'S PRICE', 'chapter', 5, '(1956 - 1971) LoopSnapshot🔴9/10'),
    createChapter('ch6', 'CHAPTER 6: THE MODERN CARCERAL STATE: THE WAR ON DRUGS ESCALATES', 'chapter', 6, '(1972 - 1989) LoopSnapshot🔴9/10'),
    createChapter('ch7', 'CHAPTER 7: THE "COLORBLIND" ERA: PREDICTIVE POLICING AND MASS INCARCERATION', 'chapter', 7, '(1990 - 2009) LoopSnapshot🔴9/10'),
    createChapter('ch8', 'CHAPTER 8: DIGITAL AUGMENTATION: FERGUSON, BALTIMORE, AND ALGORITHMIC BIAS', 'chapter', 8, '(2010 - 2016) LoopSnapshot🔴9/10'),
    createChapter('ch9', 'CHAPTER 9: THE AUTOMATED LOOP: BIE LABELS, AI, AND THE FUTURE OF CONTROL', 'chapter', 9, '(2017 - 2024) LoopSnapshot🔴🟡🟢10/10'),
    createChapter('ch10', 'CHAPTER 10: THE RESILIENCE BLUEPRINT: RESISTANCE AND THRIVING WITHIN THE LOOP', 'chapter', 10, '(1619 - Present) LoopSnapshot🟢8/10'),
    createChapter('ch11', 'CHAPTER 11: THE ABOLITION HORIZON: FROM EVIDENCE TO ABOLITION', 'chapter', 11, '2025 AND BEYOND LoopSnapshot🔴10/10')
  ],
  backMatter: [
    createChapter('app-a', 'Appendix A: Loop Mechanism Glossary', 'back', 0),
    createChapter('app-b', 'Appendix B: Historical Timeline (1619–2025)', 'back', 0),
    createChapter('app-c', 'Appendix C: Methodology and Sources Note', 'back', 0),
    createChapter('works', 'Works Cited', 'back', 0),
    createChapter('ack', 'Acknowledgments', 'back', 0),
    createChapter('about', 'About the Author', 'back', 0)
  ]
};