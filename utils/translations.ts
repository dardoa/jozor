import { Language } from '../types';

export const translations = {
  en: {
    appTitle: "Jozor",
    welcomeTitle: "Jozor",
    welcomeSubtitle: "Preserve your family history, link your past to your future.",
    startNew: "Start New Tree",
    importFile: "Import File (JSON/GEDCOM)",
    safeData: "Your data is secure and stored locally on your device.",
    cloudSaveDescription: "Or sign in to save your work to the cloud (Google Drive) and access it from any device.",
    
    // Auth
    loginGoogle: "Sign in with Google",
    logout: "Log Out",
    syncing: "Syncing...",
    synced: "Saved to Cloud",
    demoMode: "Demo Mode (Local)",
    offline: "Local Mode",
    welcomeUser: "Welcome,",
    
    // Auth Config Help
    authConfigTitle: "Authentication Setup",
    authConfigStep1: "1. Add this Origin URL:",
    authConfigStep2: "Go to Google Cloud Console > Credentials > Client ID",
    authConfigStep3: "Paste into 'Authorized JavaScript origins'",
    authConfigWarning: "Important: Do NOT add a trailing slash (/) at the end.",
    clientIdUsed: "Client ID in use:",
    verifyId: "Ensure this matches your Google Cloud Console exactly.",

    // Header
    searchPlaceholder: "Search your family...",
    results: "Results",
    import: "Import",
    export: "Export",
    downloadAs: "Download As",
    jozorArchive: "Jozor Archive",
    photosData: "Photos + Data (Recommended)",
    jsonFile: "JSON File",
    textOnly: "Text only",
    gedcomFile: "GEDCOM File",
    standard: "Standard",
    printPdf: "Print / PDF",
    tools: "Tools",
    relationshipCalculator: "Relationship Calculator",
    familyStatistics: "Family Statistics",
    consistencyChecker: "Consistency Checker",
    familyTimeline: "Family Timeline",
    toggleSidebar: "Toggle Sidebar", // Added
    clearSearch: "Clear Search", // Added
    
    // View Settings
    viewOptions: "View Options",
    showPhotos: "Show Photos",
    showDates: "Show Dates",
    showMiddleName: "Show Middle Name",
    showLastName: "Show Last Name",
    showMinimap: "Show Minimap",
    layout: "Tree Layout",
    chartType: "Chart Type",
    descendantChart: "Interactive Descendant",
    fanChart: "Ancestry Fan Chart", 
    pedigreeChart: "Pedigree Chart",
    forceChart: "Comprehensive Diagram (All-in-One)",
    vertical: "Vertical",
    horizontal: "Horizontal",
    radial: "Radial",
    compactMode: "Compact Mode",

    // Sidebar Tabs
    profile: "Profile",
    partners: "Partners",
    contact: "Contact",
    bio: "Bio",
    gallery: "Media",
    
    // Actions
    addFather: "DAD",
    addMother: "MOM",
    addHusband: "HUSB",
    addWife: "WIFE",
    addSon: "SON",
    addDaughter: "DAUG",
    deletePerson: "Delete Person",
    saveChanges: "Save Changes",
    editDetails: "Edit Details",
    changePhoto: "CHANGE",
    removePhoto: "Remove",
    addPhoto: "Add Photo",
    noPhotos: "No photos yet.",
    removeRelation: "Remove Link",
    
    // Fields
    firstName: "First",
    middleName: "Middle",
    lastName: "Last",
    title: "Title",
    suffix: "Suffix",
    nickName: "Nick Name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    living: "Living",
    deceased: "Deceased",
    birthDate: "Birth Date",
    birthPlace: "Birth Place",
    deathDate: "Death Date",
    deathPlace: "Death Place",
    born: "Born",
    died: "Died",
    marriage: "Marriage",
    nee: "née",
    source: "Source",
    sourcePlaceholder: "e.g. Birth Certificate",
    
    // Contact
    email: "Email",
    website: "Website",
    blog: "Blog",
    address: "Address",
    readOnly: "Read Only",
    
    // Bio & AI
    workInterests: "Work & Interests",
    profession: "Profession",
    company: "Company",
    interests: "Interests",
    biography: "Biography",
    writeBio: "Write a biography...",
    noBio: "No biography available.",
    tone: "Tone",
    generate: "AI",
    chatWithAncestor: "Chat with Ancestor (AI)",
    chatPlaceholder: "Ask them about their life...",
    
    // Media & Voice
    voiceMemories: "Voice Memories",
    recordVoice: "Record Voice",
    stopRecording: "Stop",
    recording: "Recording...",
    play: "Play",
    delete: "Delete",
    galleryTab: "Photos & Audio",
    
    // Relationships
    familyRelationships: "Family Relationships",
    parents: "PARENTS",
    children: "CHILDREN",
    spouses: "PARTNERS",
    noRelatives: "No relatives added yet.",
    viewProfile: "View Profile",
    married: "Married",
    engaged: "Engaged",
    divorced: "Divorced",
    separated: "Separated",
    since: "Since",
    place: "Place",
    
    // Modal
    add: "Add",
    howToAdd: "How would you like to add this person?",
    createNewProfile: "Create New Profile",
    startBlank: "Start with a blank profile",
    or: "OR",
    selectExisting: "Select Existing Person",
    searchByName: "Search by name...",
    noMatches: "No matches found in tree.",
    
    // Calculator
    calculateRelationship: "Calculate Relationship",
    selectTwoPeople: "Select two people to see how they are related.",
    person1: "Person 1",
    person2: "Person 2",
    relationshipIs: "Relationship:",
    calculate: "Calculate",
    commonAncestor: "Common Ancestor",
    samePerson: "Same Person",

    // Consistency
    checkIssues: "Check Logic Issues",
    noIssuesFound: "No logical issues found. Great job!",
    issuesFound: "Potential Issues Found",
    issueType: "Issue Type",
    description: "Description",
    ignore: "Ignore",
    fix: "Fix",
    types: {
        parentTooYoung: "Parent too young",
        parentTooOld: "Parent too old",
        bornAfterDeath: "Born after death",
        futureBirth: "Born in future",
        immortal: "Unverified longevity",
        childOlderThanParent: "Child older than parent"
    },

    // Timeline
    oldestFirst: "Oldest First",
    newestFirst: "Newest First",
    noEvents: "No dated events found to display.",

    // Sharing
    shareTree: "Share Tree",
    inviteCollaborator: "Invite Collaborator",
    emailPlaceholder: "Enter email address",
    role: "Role",
    editor: "Editor",
    viewer: "Viewer",
    sendInvite: "Send Invite",
    collaborators: "Collaborators",
    owner: "Owner",
    pending: "Pending",
    remove: "Remove",
    inviteSent: "Invitation sent to:",
    you: "You",

    // Statistics
    totalMembers: "Total Members",
    generations: "Generations",
    averageLifespan: "Average Lifespan",
    genderRatio: "Gender Ratio",
    years: "years",
    
    // Alerts
    confirmDelete: "Are you sure you want to delete this person?",
    confirmUnlink: "Are you sure you want to remove this relationship? The person will remain in the tree.",
    newTreeConfirm: "Start a new tree? Current unsaved changes might be lost if not exported.",
    
    // Statistics Details
    birthsPerDecade: "Births per Decade",
    topNames: "Top Names",
    locations: "Locations",
    overview: "Overview",
    timeline: "Timeline",
    geography: "Geography",
    names: "Names",
    oldestMember: "Oldest Member",
    mostChildren: "Most Children",
    topPlaces: "Top Places",
    maleNames: "Male Names",
    femaleNames: "Female Names",

    // New Features
    familyStory: "Family Story (AI)",
    generateStory: "Generate Story",
    calendarExport: "Calendar (.ics)",
    viewOnMap: "View on Google Maps",
    storyTitle: "The Story of the",
    family: "Family",
    undo: "Undo", // Added
    redo: "Redo" // Added
  },
  ar: {
    appTitle: "جذور",
    welcomeTitle: "جذور",
    welcomeSubtitle: "احفظ تاريخ عائلتك، واربط ماضيك بمستقبلك.",
    startNew: "إنشاء شجرة جديدة",
    importFile: "استيراد ملف (JSON/GEDCOM)",
    safeData: "بياناتك آمنة ومحفوظة محلياً على جهازك.",
    cloudSaveDescription: "أو سجل الدخول لحفظ عملك سحابياً على غوغل درايف والوصول إليه من أي جهاز.",
    
    // Auth
    loginGoogle: "تسجيل الدخول عبر Google",
    logout: "تسجيل الخروج",
    syncing: "جارِ المزامنة...",
    synced: "محفوظ سحابياً",
    demoMode: "وضع تجريبي (محلي)",
    offline: "وضع محلي",
    welcomeUser: "مرحباً،",

    // Auth Config Help
    authConfigTitle: "إعداد المصادقة (Auth)",
    authConfigStep1: "1. انسخ رابط الموقع (Origin):",
    authConfigStep2: "اذهب إلى Google Cloud Console > Credentials > Client ID",
    authConfigStep3: "الصقه في خانة 'Authorized JavaScript origins'",
    authConfigWarning: "هام: تأكد من عدم وجود شرطة مائلة (/) في النهاية.",
    clientIdUsed: "Client ID المستخدم:",
    verifyId: "تأكد من مطابقته للمفتاح في Google Cloud.",

    // Header
    searchPlaceholder: "ابحث عن شخص...",
    results: "النتائج",
    import: "استيراد",
    export: "تصدير",
    downloadAs: "تنزيل بصيغة",
    jozorArchive: "أرشيف جذور",
    photosData: "صور + بيانات (موصى به)",
    jsonFile: "ملف JSON",
    textOnly: "نصوص فقط",
    gedcomFile: "ملف GEDCOM",
    standard: "قياسي",
    printPdf: "طباعة / PDF",
    tools: "أدوات",
    relationshipCalculator: "حاسبة القرابة",
    familyStatistics: "إحصائيات العائلة",
    consistencyChecker: "المدقق المنطقي",
    familyTimeline: "الجدول الزمني العائلي",
    toggleSidebar: "تبديل الشريط الجانبي", // Added
    clearSearch: "مسح البحث", // Added
    
    // View Settings
    viewOptions: "خيارات العرض",
    showPhotos: "إظهار الصور",
    showDates: "إظهار التواريخ",
    showMiddleName: "إظهار الأب/الوسط",
    showLastName: "إظهار العائلة",
    showMinimap: "إظهار الخريطة المصغرة",
    layout: "تخطيط الشجرة",
    chartType: "نوع المخطط",
    descendantChart: "شجرة العائلة (تفاعلية)",
    fanChart: "مخطط المروحة (الأسلاف)", 
    pedigreeChart: "مخطط النسب (مشجر)",
    forceChart: "مخطط العائلة الشامل (All-in-One)",
    vertical: "عمودي",
    horizontal: "أفقي",
    radial: "دائري",
    compactMode: "الوضع المضغوط",
    
    // Sidebar Tabs
    profile: "الملف الشخصي",
    partners: "الشركاء",
    contact: "اتصال",
    bio: "السيرة",
    gallery: "الوسائط",
    
    // Actions
    addFather: "أب",
    addMother: "أم",
    addHusband: "زوج",
    addWife: "زوجة",
    addSon: "ابن",
    addDaughter: "ابنة",
    deletePerson: "حذف الشخص",
    saveChanges: "حفظ التغييرات",
    editDetails: "تعديل التفاصيل",
    changePhoto: "تغيير",
    removePhoto: "إزالة",
    addPhoto: "إضافة صورة",
    noPhotos: "لا يوجد صور.",
    removeRelation: "إلغاء الصلة",
    
    // Fields
    firstName: "الاسم الأول",
    middleName: "الأب/الوسط",
    lastName: "العائلة",
    title: "اللقب",
    suffix: "اللاحقة",
    nickName: "الكنية",
    gender: "الجنس",
    male: "ذكر",
    female: "أنثى",
    living: "حي",
    deceased: "متوفي",
    birthDate: "تاريخ الميلاد",
    birthPlace: "مكان الميلاد",
    deathDate: "تاريخ الوفاة",
    deathPlace: "مكان الوفاة",
    born: "ولد",
    died: "توفي",
    marriage: "زواج",
    nee: "سابقاً",
    source: "المصدر",
    sourcePlaceholder: "مثلاً: شهادة ميلاد",
    
    // Contact
    email: "البريد",
    website: "موقع",
    blog: "مدونة",
    address: "العنوان",
    readOnly: "للقراءة فقط",
    
    // Bio & AI
    workInterests: "العمل والاهتمامات",
    profession: "المهنة",
    company: "الشركة",
    interests: "الاهتمامات",
    biography: "السيرة الذاتية",
    writeBio: "اكتب السيرة الذاتية...",
    noBio: "لا توجد سيرة ذاتية.",
    tone: "الأسلوب",
    generate: "توليد",
    chatWithAncestor: "تحدث مع السلف (AI)",
    chatPlaceholder: "اسألهم عن حياتهم...",
    
    // Media & Voice
    voiceMemories: "المذكرات الصوتية",
    recordVoice: "تسجيل صوت",
    stopRecording: "إيقاف",
    recording: "جارِ التسجيل...",
    play: "تشغيل",
    delete: "حذف",
    galleryTab: "الصور والصوت",

    // Relationships
    familyRelationships: "العلاقات العائلية",
    parents: "الوالدين",
    children: "الأبناء",
    spouses: "الشركاء",
    noRelatives: "لم تتم إضافة أقارب بعد.",
    viewProfile: "عرض الملف",
    married: "زواج",
    engaged: "خطوبة",
    divorced: "طلاق",
    separated: "انفصال",
    since: "منذ",
    place: "المكان",
    
    // Modal
    add: "إضافة",
    howToAdd: "كيف تود إضافة هذا الشخص؟",
    createNewProfile: "إنشاء ملف شخصي جديد",
    startBlank: "البدء بملف فارغ",
    or: "أو",
    selectExisting: "اختر شخصاً موجوداً",
    searchByName: "ابحث بالاسم...",
    noMatches: "لم يتم العثور على نتائج.",
    
    // Calculator
    calculateRelationship: "حاسبة صلة القرابة",
    selectTwoPeople: "اختر شخصين لمعرفة صلة القرابة بينهما.",
    person1: "الشخص الأول",
    person2: "الشخص الثاني",
    relationshipIs: "صلة القرابة:",
    calculate: "احسب",
    commonAncestor: "الجد المشترك",
    samePerson: "نفس الشخص",

    // Consistency
    checkIssues: "فحص الأخطاء المنطقية",
    noIssuesFound: "لم يتم العثور على أخطاء منطقية. عمل رائع!",
    issuesFound: "تم العثور على مشاكل محتملة",
    issueType: "نوع المشكلة",
    description: "الوصف",
    ignore: "تجاهل",
    fix: "إصلاح",
    types: {
        parentTooYoung: "الوالد صغير جداً",
        parentTooOld: "الوالد كبير جداً",
        bornAfterDeath: "ولد بعد الوفاة",
        futureBirth: "تاريخ ميلاد في المستقبل",
        immortal: "عمر غير منطقي (تحقق من الوفاة)",
        childOlderThanParent: "الابن أكبر من الوالد"
    },

    // Timeline
    oldestFirst: "الأقدم أولاً",
    newestFirst: "الأحدث أولاً",
    noEvents: "لا توجد أحداث مؤرخة للعرض.",

    // Sharing
    shareTree: "مشاركة الشجرة",
    inviteCollaborator: "دعوة متعاون",
    emailPlaceholder: "أدخل البريد الإلكتروني",
    role: "الصلاحية",
    editor: "محرر",
    viewer: "مشاهد",
    sendInvite: "إرسال الدعوة",
    collaborators: "المتعاونون",
    owner: "المالك",
    pending: "قيد الانتظار",
    remove: "إزالة",
    inviteSent: "تم إرسال الدعوة إلى:",
    you: "أنت",

    // Statistics
    totalMembers: "مجموع الأفراد",
    generations: "الأجيال",
    averageLifespan: "متوسط العمر",
    genderRatio: "نسبة الجنسين",
    years: "سنة",
    
    // Alerts
    confirmDelete: "هل أنت متأكد من حذف هذا الشخص؟",
    confirmUnlink: "هل أنت متأكد من إزالة صلة القرابة هذه؟ سيبقى الشخص موجوداً في الشجرة.",
    newTreeConfirm: "بدء شجرة جديدة؟ قد تفقد التغييرات غير المحفوظة.",
    
    // Statistics Details
    birthsPerDecade: "المواليد حسب العقود",
    topNames: "الأسماء الأكثر شيوعاً",
    locations: "الأماكن",
    overview: "نظرة عامة",
    timeline: "الجدول الزمني",
    geography: "الجغرافيا",
    names: "الأسماء",
    oldestMember: "أكبر المعمرين",
    mostChildren: "الأكثر أبناءً",
    topPlaces: "أبرز الأماكن",
    maleNames: "أسماء الذكور",
    femaleNames: "أسماء الإناث",

    // New Features
    familyStory: "حكاية العائلة (AI)",
    generateStory: "كتابة القصة",
    calendarExport: "تصدير التقويم (.ics)",
    viewOnMap: "عرض على الخريطة",
    storyTitle: "قصة عائلة",
    family: "عائلة",
    undo: "تراجع", // Added
    redo: "إعادة" // Added
  }
};

export const getTranslation = (lang: Language) => translations[lang] as typeof translations.en; // Cast to specific type