import { Language } from './../types';

const en = {
  // General
  appName: 'Jozor',
  profile: 'Profile',
  partners: 'Partners',
  contact: 'Contact',
  bio: 'Bio',
  galleryTab: 'Gallery', // Changed from 'Media' to 'Gallery'
  chatWithAncestor: 'Chat with Ancestor',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  add: 'Add',
  addParent: 'Add Parent',
  addSpouse: 'Add Spouse',
  addChild: 'Add Child',
  remove: 'Remove',
  male: 'Male',
  female: 'Female',
  unknown: 'Unknown',
  birthDate: 'Birth Date',
  birthPlace: 'Birth Place',
  deathDate: 'Death Date',
  deathPlace: 'Death Place',
  isDeceased: 'Is Deceased',
  yes: 'Yes',
  no: 'No',
  // Person fields
  title: 'Title',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  birthName: 'Birth Name',
  nickName: 'Nickname',
  suffix: 'Suffix',
  profession: 'Profession',
  company: 'Company',
  interests: 'Interests',
  email: 'Email',
  website: 'Website',
  blog: 'Blog',
  address: 'Address',
  // Relationships
  parents: 'Parents',
  spouses: 'Spouses',
  children: 'Children',
  siblings: 'Siblings',
  married: 'Married',
  divorced: 'Divorced',
  engaged: 'Engaged',
  separated: 'Separated',
  startDate: 'Start Date',
  startPlace: 'Start Place',
  endDate: 'End Date',
  endPlace: 'End Place',
  // Sidebar Footer
  viewProfile: 'View Profile',
  // Header
  undo: 'Undo',
  redo: 'Redo',
  settings: 'Settings',
  darkMode: 'Dark Mode',
  language: 'Language',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  syncWithGoogleDrive: 'Sync with Google Drive',
  syncing: 'Syncing...',
  view: 'View',
  present: 'Present',
  tools: 'Tools',
  calculator: 'Calculator',
  stats: 'Stats',
  chat: 'Chat',
  consistency: 'Consistency',
  timeline: 'Timeline',
  share: 'Share',
  story: 'Story',
  map: 'Map',
  export: 'Export',
  exportJozor: 'Export Jozor',
  exportJson: 'Export JSON',
  exportGedcom: 'Export GEDCOM',
  exportIcs: 'Export ICS',
  print: 'Print',
  search: 'Search...',
  // Tree Settings
  treeSettings: 'Tree Settings',
  showPhotos: 'Show Photos',
  showDates: 'Show Dates',
  showMiddleName: 'Show Middle Name',
  showLastName: 'Show Last Name',
  showMinimap: 'Show Minimap',
  layoutMode: 'Layout Mode',
  vertical: 'Vertical',
  horizontal: 'Horizontal',
  radial: 'Radial',
  isCompact: 'Compact View',
  chartType: 'Chart Type',
  descendant: 'Descendant',
  fan: 'Fan Chart',
  pedigree: 'Pedigree',
  force: 'Force Layout',
  enableForcePhysics: 'Enable Physics',
  // Modals
  comingSoon: 'Coming Soon',
  // Alerts
  personDeleteConfirm: 'Are you sure you want to delete this person and all their relationships?',
  // Media Tab
  addPhoto: 'Add Photo',
  addVoiceNote: 'Add Voice Note',
  uploadImage: 'Upload Image',
  uploadVoiceNote: 'Upload Voice Note',
  dragDropImage: 'Drag & drop an image here, or click to select',
  dragDropAudio: 'Drag & drop an audio file here, or click to select',
  noMedia: 'No media added yet.',
  // Bio Tab
  generateBio: 'Generate Bio with AI',
  // Contact Tab
  noContactInfo: 'No contact information available.',
  // Partners Tab
  noPartners: 'No partners added yet.',
  // Info Tab
  noParents: 'No parents added yet.',
  noChildren: 'No children added yet.',
  noSiblings: 'No siblings added yet.',
  // Search
  noResults: 'No results found.',
  // Google Drive
  googleDriveSyncSuccess: 'Successfully synced with Google Drive!',
  googleDriveSyncError: 'Failed to sync with Google Drive.',
  googleDriveFileSelect: 'Select a Jozor file from Google Drive',
  googleDriveFileLoadError: 'Failed to load file from Google Drive.',
  googleDriveFileLoadSuccess: 'File loaded successfully from Google Drive.',
  googleDriveSaveNewFile: 'Save as new file on Google Drive',
  googleDriveSaveExistingFile: 'Save to existing file on Google Drive',
  googleDriveFileName: 'Jozor File Name',
  googleDriveSaveConfirm: 'Are you sure you want to overwrite the existing file?',
  googleDriveSaveSuccess: 'File saved to Google Drive successfully!',
  googleDriveSaveError: 'Failed to save file to Google Drive.',
  // GEDCOM Import
  gedcomImportSuccess: 'GEDCOM file imported successfully!',
  gedcomImportError: 'Failed to import GEDCOM file.',
  // Jozor Import
  jozorImportSuccess: 'Jozor file imported successfully!',
  jozorImportError: 'Failed to import Jozor file.',
  // Date Select
  day: 'Day',
  month: 'Month',
  year: 'Year',
  jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
  jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
  // Smart Input
  clickToEdit: 'Click to edit',
  // Family Tree
  rootPerson: 'Root Person',
  // Relationship Modal
  selectPerson: 'Select Person',
  selectRelationshipType: 'Select Relationship Type',
  addRelationship: 'Add Relationship',
  // Share Modal
  copyLink: 'Copy Link',
  shareLink: 'Share Link',
  // Story Modal
  generateStory: 'Generate Story',
  // Map Modal
  showLocations: 'Show Locations',
  // Timeline Modal
  showEvents: 'Show Events',
  // Consistency Modal
  runChecks: 'Run Checks',
  // Calculator Modal
  calculate: 'Calculate',
  // Stats Modal
  showStats: 'Show Stats',
};

const ar = {
  // General
  appName: 'جذور',
  profile: 'الملف الشخصي',
  partners: 'الشركاء',
  contact: 'جهة الاتصال',
  bio: 'السيرة الذاتية',
  galleryTab: 'المعرض', // Changed from 'الوسائط' to 'المعرض'
  chatWithAncestor: 'الدردشة مع السلف',
  edit: 'تعديل',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  add: 'إضافة',
  addParent: 'إضافة والد',
  addSpouse: 'إضافة شريك',
  addChild: 'إضافة طفل',
  remove: 'إزالة',
  male: 'ذكر',
  female: 'أنثى',
  unknown: 'غير معروف',
  birthDate: 'تاريخ الميلاد',
  birthPlace: 'مكان الميلاد',
  deathDate: 'تاريخ الوفاة',
  deathPlace: 'مكان الوفاة',
  isDeceased: 'متوفى',
  yes: 'نعم',
  no: 'لا',
  // Person fields
  title: 'اللقب',
  firstName: 'الاسم الأول',
  middleName: 'الاسم الأوسط',
  lastName: 'اسم العائلة',
  birthName: 'اسم الميلاد',
  nickName: 'الاسم المستعار',
  suffix: 'اللاحقة',
  profession: 'المهنة',
  company: 'الشركة',
  interests: 'الاهتمامات',
  email: 'البريد الإلكتروني',
  website: 'الموقع الإلكتروني',
  blog: 'المدونة',
  address: 'العنوان',
  // Relationships
  parents: 'الآباء',
  spouses: 'الأزواج',
  children: 'الأبناء',
  siblings: 'الأشقاء',
  married: 'متزوج',
  divorced: 'مطلق',
  engaged: 'مخطوب',
  separated: 'منفصل',
  startDate: 'تاريخ البدء',
  startPlace: 'مكان البدء',
  endDate: 'تاريخ الانتهاء',
  endPlace: 'مكان الانتهاء',
  // Sidebar Footer
  viewProfile: 'عرض الملف الشخصي',
  // Header
  undo: 'تراجع',
  redo: 'إعادة',
  settings: 'الإعدادات',
  darkMode: 'الوضع الداكن',
  language: 'اللغة',
  signIn: 'تسجيل الدخول',
  signOut: 'تسجيل الخروج',
  syncWithGoogleDrive: 'المزامنة مع جوجل درايف',
  syncing: 'جاري المزامنة...',
  view: 'عرض',
  present: 'تقديم',
  tools: 'الأدوات',
  calculator: 'الحاسبة',
  stats: 'الإحصائيات',
  chat: 'الدردشة',
  consistency: 'التناسق',
  timeline: 'الخط الزمني',
  share: 'مشاركة',
  story: 'القصة',
  map: 'الخريطة',
  export: 'تصدير',
  exportJozor: 'تصدير جوزور',
  exportJson: 'تصدير JSON',
  exportGedcom: 'تصدير GEDCOM',
  exportIcs: 'تصدير ICS',
  print: 'طباعة',
  search: 'بحث...',
  // Tree Settings
  treeSettings: 'إعدادات الشجرة',
  showPhotos: 'إظهار الصور',
  showDates: 'إظهار التواريخ',
  showMiddleName: 'إظهار الاسم الأوسط',
  showLastName: 'إظهار اسم العائلة',
  showMinimap: 'إظهار الخريطة المصغرة',
  layoutMode: 'وضع التخطيط',
  vertical: 'عمودي',
  horizontal: 'أفقي',
  radial: 'شعاعي',
  isCompact: 'عرض مضغوط',
  chartType: 'نوع الرسم البياني',
  descendant: 'النسل',
  fan: 'مخطط المروحة',
  pedigree: 'شجرة النسب',
  force: 'تخطيط القوة',
  enableForcePhysics: 'تمكين الفيزياء',
  // Modals
  comingSoon: 'قريباً',
  // Alerts
  personDeleteConfirm: 'هل أنت متأكد أنك تريد حذف هذا الشخص وجميع علاقاته؟',
  // Media Tab
  addPhoto: 'إضافة صورة',
  addVoiceNote: 'إضافة ملاحظة صوتية',
  uploadImage: 'تحميل صورة',
  uploadVoiceNote: 'تحميل ملاحظة صوتية',
  dragDropImage: 'اسحب وأفلت صورة هنا، أو انقر للاختيار',
  dragDropAudio: 'اسحب وأفلت ملف صوتي هنا، أو انقر للاختيار',
  noMedia: 'لم تتم إضافة أي وسائط بعد.',
  // Bio Tab
  generateBio: 'إنشاء سيرة ذاتية بالذكاء الاصطناعي',
  // Contact Tab
  noContactInfo: 'لا توجد معلومات اتصال متاحة.',
  // Partners Tab
  noPartners: 'لم تتم إضافة شركاء بعد.',
  // Info Tab
  noParents: 'لم تتم إضافة آباء بعد.',
  noChildren: 'لم تتم إضافة أطفال بعد.',
  noSiblings: 'لم تتم إضافة أشقاء بعد.',
  // Search
  noResults: 'لا توجد نتائج.',
  // Google Drive
  googleDriveSyncSuccess: 'تمت المزامنة مع جوجل درايف بنجاح!',
  googleDriveSyncError: 'فشل في المزامنة مع جوجل درايف.',
  googleDriveFileSelect: 'اختر ملف جوزور من جوجل درايف',
  googleDriveFileLoadError: 'فشل في تحميل الملف من جوجل درايف.',
  googleDriveFileLoadSuccess: 'تم تحميل الملف بنجاح من جوجل درايف.',
  googleDriveSaveNewFile: 'حفظ كملف جديد على جوجل درايف',
  googleDriveSaveExistingFile: 'حفظ في ملف موجود على جوجل درايف',
  googleDriveFileName: 'اسم ملف جوزور',
  googleDriveSaveConfirm: 'هل أنت متأكد أنك تريد الكتابة فوق الملف الحالي؟',
  googleDriveSaveSuccess: 'تم حفظ الملف في جوجل درايف بنجاح!',
  googleDriveSaveError: 'فشل في حفظ الملف في جوجل درايف.',
  // GEDCOM Import
  gedcomImportSuccess: 'تم استيراد ملف GEDCOM بنجاح!',
  gedcomImportError: 'فشل في استيراد ملف GEDCOM.',
  // Jozor Import
  jozorImportSuccess: 'تم استيراد ملف Jozor بنجاح!',
  jozorImportError: 'فشل في استيراد ملف Jozor.',
  // Date Select
  day: 'يوم',
  month: 'شهر',
  year: 'سنة',
  jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل', may: 'مايو', jun: 'يونيو',
  jul: 'يوليو', aug: 'أغسطس', sep: 'سبتمبر', oct: 'أكتوبر', nov: 'نوفمبر', dec: 'ديسمبر',
  // Smart Input
  clickToEdit: 'انقر للتعديل',
  // Family Tree
  rootPerson: 'الشخص الجذر',
  // Relationship Modal
  selectPerson: 'اختر شخص',
  selectRelationshipType: 'اختر نوع العلاقة',
  addRelationship: 'إضافة علاقة',
  // Share Modal
  copyLink: 'نسخ الرابط',
  shareLink: 'مشاركة الرابط',
  // Story Modal
  generateStory: 'إنشاء قصة',
  // Map Modal
  showLocations: 'إظهار المواقع',
  // Timeline Modal
  showEvents: 'إظهار الأحداث',
  // Consistency Modal
  runChecks: 'تشغيل الفحوصات',
  // Calculator Modal
  calculate: 'حساب',
  // Stats Modal
  showStats: 'إظهار الإحصائيات',
};

const translations: Record<Language, any> = {
  en,
  ar,
};

export const getTranslation = (language: Language) => {
  return translations[language] || en; // Fallback to English if language not found
};