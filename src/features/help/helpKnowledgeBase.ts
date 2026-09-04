import type { Language } from '../../types/common';

export type HelpCategoryId =
  | 'getting-started'
  | 'family-records'
  | 'explore-tree'
  | 'collaboration'
  | 'publishing-backup'
  | 'privacy-security'
  | 'troubleshooting';

export type HelpAudience = 'owner' | 'editor' | 'viewer';

export type HelpActionId =
  | 'tree-preferences'
  | 'tree-control'
  | 'kindi'
  | 'add-person'
  | 'activity-log'
  | 'global-settings'
  | 'diagnostics'
  | 'vault-trees'
  | 'vault-members'
  | 'vault-security'
  | 'vault-stats'
  | 'vault-family-book'
  | 'vault-visuals'
  | 'vault-data-export'
  | 'vault-history'
  | 'vault-cloud-backup';

interface LocalizedHelpCategory {
  title: string;
  description: string;
}

interface LocalizedHelpTopic {
  title: string;
  summary: string;
  steps: readonly string[];
  keywords: readonly string[];
  actionLabel?: string;
}

export interface HelpCategoryDefinition {
  id: HelpCategoryId;
  content: Record<Language, LocalizedHelpCategory>;
}

export interface HelpTopicDefinition {
  id: string;
  categoryId: HelpCategoryId;
  audience: readonly HelpAudience[];
  actionId?: HelpActionId;
  kindiGuide?: boolean;
  kindiGuideId?: string;
  content: Record<Language, LocalizedHelpTopic>;
}

export interface LocalizedHelpTopicView extends Omit<HelpTopicDefinition, 'content'>, LocalizedHelpTopic {}

export const HELP_CATEGORIES: readonly HelpCategoryDefinition[] = [
  {
    id: 'getting-started',
    content: {
      ar: { title: 'البدء', description: 'أنشئ شجرتك وتعرّف على مساحة العمل.' },
      en: { title: 'Getting started', description: 'Create a tree and learn the workspace.' },
    },
  },
  {
    id: 'family-records',
    content: {
      ar: { title: 'الأشخاص والسجلات', description: 'أضف الأشخاص ووثّق العلاقات والمصادر.' },
      en: { title: 'People and records', description: 'Add people and document relationships and sources.' },
    },
  },
  {
    id: 'explore-tree',
    content: {
      ar: { title: 'استكشاف الشجرة', description: 'تنقّل بين طرق العرض واستخدم كِندي.' },
      en: { title: 'Explore the tree', description: 'Navigate views and work with Kindi.' },
    },
  },
  {
    id: 'collaboration',
    content: {
      ar: { title: 'المشاركة والتعاون', description: 'أدر الدعوات والأدوار والمحادثات.' },
      en: { title: 'Sharing and collaboration', description: 'Manage invitations, roles, and conversations.' },
    },
  },
  {
    id: 'publishing-backup',
    content: {
      ar: { title: 'النشر والنسخ الاحتياطي', description: 'حوّل الشجرة إلى مخرجات واحفظ نسخًا منها.' },
      en: { title: 'Publishing and backup', description: 'Turn the tree into outputs and preserve copies.' },
    },
  },
  {
    id: 'privacy-security',
    content: {
      ar: { title: 'الخصوصية والأمان', description: 'افهم حماية البيانات وصلاحيات الوصول.' },
      en: { title: 'Privacy and security', description: 'Understand data protection and access control.' },
    },
  },
  {
    id: 'troubleshooting',
    content: {
      ar: { title: 'الحل والاستعادة', description: 'افحص المزامنة واستعد العمل بأمان.' },
      en: { title: 'Troubleshooting and recovery', description: 'Inspect sync and recover work safely.' },
    },
  },
] as const;

const ALL_ROLES = ['owner', 'editor', 'viewer'] as const;
const EDIT_ROLES = ['owner', 'editor'] as const;
const OWNER_ONLY = ['owner'] as const;

export const HELP_TOPICS: readonly HelpTopicDefinition[] = [
  {
    id: 'create-or-open-tree', categoryId: 'getting-started', audience: ALL_ROLES, actionId: 'vault-trees',
    content: {
      ar: { title: 'إنشاء شجرة أو فتحها', summary: 'تدير الخزنة الأشجار التي تملكها أو تشارك فيها من مكان واحد.', steps: ['افتح الخزنة.', 'اختر إدارة الشجرة.', 'أنشئ شجرة جديدة أو افتح شجرة متاحة لك.'], keywords: ['إنشاء شجرة', 'فتح شجرة', 'إدارة الأشجار', 'البداية'], actionLabel: 'فتح إدارة الشجرة' },
      en: { title: 'Create or open a tree', summary: 'The Vault keeps trees you own or collaborate on in one place.', steps: ['Open The Vault.', 'Choose Tree management.', 'Create a tree or open one available to you.'], keywords: ['create tree', 'open tree', 'tree management', 'start'], actionLabel: 'Open tree management' },
    },
  },
  {
    id: 'tree-navigation', categoryId: 'getting-started', audience: ALL_ROLES, actionId: 'tree-preferences',
    content: {
      ar: { title: 'التنقل والتكبير وطرق العرض', summary: 'استخدم التركيز والملاءمة والتكبير لرؤية الجزء المناسب من الشجرة دون فقدان السياق.', steps: ['حدد شخصًا للتركيز عليه.', 'استخدم تفضيلات العرض لاختيار التخطيط.', 'استخدم ملاءمة الشاشة أو إعادة الضبط عند الحاجة.'], keywords: ['تنقل', 'تكبير', 'تصغير', 'ملاءمة', 'تركيز', 'شعاعي'], actionLabel: 'فتح تفضيلات العرض' },
      en: { title: 'Navigate, zoom, and change views', summary: 'Use focus, fit, and zoom controls to inspect the right part of the tree.', steps: ['Select a person to focus.', 'Use Visual preferences to choose a layout.', 'Use Fit or Reset when needed.'], keywords: ['navigate', 'zoom', 'fit', 'focus', 'radial', 'view'], actionLabel: 'Open visual preferences' },
    },
  },
  {
    id: 'tree-control-center', categoryId: 'getting-started', audience: ALL_ROLES, actionId: 'tree-control',
    content: {
      ar: { title: 'مركز التحكم بالشجرة', summary: 'يجمع مركز التحكم حالة الشجرة، أدوات التنظيم، والتنبيهات التشغيلية.', steps: ['افتح قائمة الشجرة.', 'اختر مركز التحكم.', 'راجع الحالة والإجراءات المتاحة وفق صلاحيتك.'], keywords: ['مركز التحكم', 'حالة الشجرة', 'تنظيم'], actionLabel: 'فتح مركز التحكم' },
      en: { title: 'Tree Control Center', summary: 'The control center brings together tree status, organization tools, and operational notices.', steps: ['Open the tree menu.', 'Choose Tree Control Center.', 'Review status and actions available to your role.'], keywords: ['control center', 'tree status', 'organize'], actionLabel: 'Open Tree Control Center' },
    },
  },
  {
    id: 'add-relatives', categoryId: 'family-records', audience: EDIT_ROLES, actionId: 'add-person', kindiGuide: true, kindiGuideId: 'kindi-add-relative',
    content: {
      ar: { title: 'إضافة شخص أو قريب', summary: 'لإضافة قريب، استخدم بطاقة الشخص أو اطلب من كِندي تجهيز العملية للمراجعة.', steps: ['حدد الشخص المرتبط بالقريب الجديد.', 'اختر إضافة والد أو زوج أو ابن، أو استخدم زر الإضافة.', 'راجع البيانات ثم احفظ.'], keywords: ['إضافة شخص', 'إضافة قريب', 'والد', 'زوج', 'ابن', 'بنت', 'كيف أضيف'], actionLabel: 'إضافة شخص' },
      en: { title: 'Add a person or relative', summary: 'Add from a person card or ask Kindi to prepare the change for review.', steps: ['Select the person related to the new relative.', 'Choose parent, spouse, or child, or use Add.', 'Review the details and save.'], keywords: ['add person', 'add relative', 'parent', 'spouse', 'child', 'how do i add'], actionLabel: 'Add a person' },
    },
  },
  {
    id: 'edit-person-record', categoryId: 'family-records', audience: EDIT_ROLES, kindiGuide: true, kindiGuideId: 'kindi-update-person',
    content: {
      ar: { title: 'تعديل سجل شخص', summary: 'تحتوي لوحة الشخص على الهوية والتواريخ والأماكن والملاحظات.', steps: ['افتح بطاقة الشخص.', 'انتقل إلى القسم المطلوب وعدّل الحقول.', 'راجع التغيير ثم احفظه.'], keywords: ['تعديل شخص', 'تاريخ الميلاد', 'مهنة', 'اسم', 'صحح', 'غير'], actionLabel: 'فتح الشخص المحدد' },
      en: { title: 'Edit a person record', summary: 'The person panel contains identity, dates, places, and notes.', steps: ['Open the person card.', 'Go to the relevant section and edit fields.', 'Review the change and save.'], keywords: ['edit person', 'birth date', 'occupation', 'name', 'update', 'change'], actionLabel: 'Open the selected person' },
    },
  },
  {
    id: 'delete-person-safely', categoryId: 'family-records', audience: EDIT_ROLES, kindiGuide: true, kindiGuideId: 'kindi-delete-person',
    content: {
      ar: { title: 'حذف شخص بأمان', summary: 'الحذف إجراء حساس؛ يعرض كِندي أو لوحة الشخص مراجعة صريحة قبل تنفيذه.', steps: ['تحقق من هوية الشخص وعلاقاته.', 'ابدأ الحذف من سجل الشخص أو اطلبه من كِندي.', 'اقرأ التحذير واضغط زر الحذف الصريح للتأكيد.'], keywords: ['حذف', 'احذف', 'إزالة', 'امسح', 'شيل'] },
      en: { title: 'Delete a person safely', summary: 'Deletion is sensitive; Kindi or the person panel shows an explicit review before execution.', steps: ['Verify the person and relationships.', 'Start deletion from the record or ask Kindi.', 'Read the warning and use the explicit Delete button to confirm.'], keywords: ['delete', 'remove', 'erase person'] },
    },
  },
  {
    id: 'manage-relationships', categoryId: 'family-records', audience: EDIT_ROLES, actionId: 'add-person',
    content: {
      ar: { title: 'إدارة العلاقات العائلية', summary: 'اربط شخصًا موجودًا أو أنشئ قريبًا جديدًا مع الحفاظ على اتجاه العلاقة الصحيح.', steps: ['حدد الشخص الأساسي.', 'اختر نوع العلاقة.', 'أنشئ شخصًا أو اربط سجلًا موجودًا وتحقق من النتيجة.'], keywords: ['علاقة', 'ربط شخص', 'والدين', 'أزواج', 'أبناء'], actionLabel: 'فتح إضافة علاقة' },
      en: { title: 'Manage family relationships', summary: 'Link an existing person or create a new relative while preserving relationship direction.', steps: ['Select the primary person.', 'Choose the relationship type.', 'Create or link a record and verify the result.'], keywords: ['relationship', 'link person', 'parents', 'spouses', 'children'], actionLabel: 'Add a relationship' },
    },
  },
  {
    id: 'media-and-sources', categoryId: 'family-records', audience: EDIT_ROLES,
    content: {
      ar: { title: 'الصور والوسائط والمصادر', summary: 'اربط الصورة والمصدر بالشخص الصحيح حتى تبقى المعلومة قابلة للمراجعة.', steps: ['افتح تفاصيل الشخص.', 'اختر الوسائط أو المصادر.', 'أضف الملف أو المرجع مع وصف واضح.'], keywords: ['صورة', 'وسائط', 'مصدر', 'وثيقة', 'مرجع'] },
      en: { title: 'Photos, media, and sources', summary: 'Attach photos and sources to the correct person so information remains reviewable.', steps: ['Open person details.', 'Choose Media or Sources.', 'Add the file or reference with a clear description.'], keywords: ['photo', 'media', 'source', 'document', 'citation'] },
    },
  },
  {
    id: 'focus-and-radial', categoryId: 'explore-tree', audience: ALL_ROLES, actionId: 'tree-preferences',
    content: {
      ar: { title: 'التركيز والعرض الشعاعي', summary: 'يعرض التركيز محيط شخص، بينما ينظم الشعاعي الأسلاف أو الأحفاد في حلقات.', steps: ['حدد شخصًا.', 'افتح تفضيلات العرض.', 'اختر التركيز أو الشعاعي واضبط العمق المناسب.'], keywords: ['تركيز', 'شعاعي', 'مروحة', 'أسلاف', 'أحفاد'], actionLabel: 'اختيار طريقة العرض' },
      en: { title: 'Focus and Radial views', summary: 'Focus shows one family neighborhood, while Radial arranges ancestors or descendants in rings.', steps: ['Select a person.', 'Open Visual preferences.', 'Choose Focus or Radial and set an appropriate depth.'], keywords: ['focus', 'radial', 'fan', 'ancestors', 'descendants'], actionLabel: 'Choose a view' },
    },
  },
  {
    id: 'kindi-capabilities', categoryId: 'explore-tree', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'ما الذي يستطيع كِندي فعله؟', summary: 'يمكنني البحث عن أفراد الشجرة، وشرح القرابة ومسارها، وفحص جودة البيانات، وصياغة مسودة سيرة، وتنظيم الملاحظات والمصادر المسجلة، وشرح التطبيق، وتجهيز التغييرات في بطاقة مراجعة قبل التنفيذ.', steps: ['افتح كِندي من الشريط العلوي.', 'اطرح سؤالًا عن شخص أو صلة قرابة أو جودة البيانات أو استخدام جذور.', 'راجع أي مسودة أو بطاقة تغيير قبل استخدامها أو تأكيدها.'], keywords: ['كندي', 'ماذا تستطيع', 'قدرات', 'مساعدة', 'بحث', 'أوامر', 'صلة القرابة', 'جودة البيانات', 'سيرة', 'نبذة', 'ملاحظات', 'مصادر'], actionLabel: 'اسأل كِندي' },
      en: { title: 'What can Kindi do?', summary: 'Kindi searches the tree, explains relationship paths, checks data quality, drafts biographies, organizes recorded notes and sources, guides you through Jozor, and prepares changes in a review card before execution.', steps: ['Open Kindi from the top bar.', 'Ask about a person, relationship path, data quality, or how to use Jozor.', 'Review every draft or change card before using or confirming it.'], keywords: ['kindi', 'what can you do', 'capabilities', 'help', 'search', 'commands', 'relationship path', 'data quality', 'biography', 'bio', 'notes', 'sources'], actionLabel: 'Ask Kindi' },
    },
  },
  {
    id: 'kindi-search', categoryId: 'explore-tree', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'البحث والسؤال عن الأقارب بكِندي', summary: 'اكتب اسمًا أو صلة قرابة، واختر البطاقة الصحيحة عندما تتشابه الأسماء.', steps: ['افتح كِندي.', 'اكتب اسم الشخص أو سؤال العلاقة.', 'اختر النتيجة الصحيحة للانتقال إليها.'], keywords: ['ابحث', 'العثور', 'الأشخاص', 'أبناء', 'أقارب', 'نفس الاسم'], actionLabel: 'فتح كِندي' },
      en: { title: 'Search and ask about relatives with Kindi', summary: 'Enter a name or relationship and choose the correct card when names are similar.', steps: ['Open Kindi.', 'Enter a name or relationship question.', 'Choose the correct result to focus it.'], keywords: ['search', 'find', 'people', 'children', 'relatives', 'same name'], actionLabel: 'Open Kindi' },
    },
  },
  {
    id: 'kindi-data-quality', categoryId: 'explore-tree', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'فحص جودة بيانات الشجرة بكِندي', summary: 'يفحص كِندي بيانات الشجرة محليًا ويعرض الصحة والاكتمال وتغطية المصادر دون إرسال الشجرة إلى خدمة سحابية.', steps: ['افتح كِندي.', 'اكتب «ما مشاكل الشجرة؟» للفحص العام، أو حدّد شخصًا واكتب «افحص هذا الشخص».', 'راجع المؤشرات وبطاقات الأشخاص الأكثر احتياجًا للمراجعة، ثم افتح السجل المطلوب.'], keywords: ['فحص الشجرة', 'فحص كيندي', 'مشاكل الشجرة', 'جودة البيانات', 'اكتمال البيانات', 'بيانات ناقصة', 'مصادر', 'افحص هذا الشخص'], actionLabel: 'فحص الشجرة مع كِندي' },
      en: { title: 'Check tree data quality with Kindi', summary: 'Kindi checks the tree locally and reports health, completeness, and source coverage without sending the tree to a cloud service.', steps: ['Open Kindi.', 'Enter “What are the tree issues?” for a tree-wide check, or select a person and enter “Check this person.”', 'Review the indicators and the people most in need of attention, then open the relevant record.'], keywords: ['check tree', 'tree issues', 'data quality', 'data completeness', 'missing data', 'sources', 'check this person'], actionLabel: 'Check the tree with Kindi' },
    },
  },
  {
    id: 'kindi-biography-draft', categoryId: 'family-records', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'صياغة مسودة سيرة بكِندي', summary: 'يصوغ كِندي مسودة محلية من الاسم والتواريخ والأماكن والمهنة المسجلة فقط، ويفصلها عن بيانات السجل الأصلية.', steps: ['حدد الشخص أو اذكر اسمه كاملًا في الطلب.', 'اكتب «اكتب مسودة سيرة لهذا الشخص».', 'راجع الحقائق المستخدمة والمسودة؛ لن تُحفظ في السجل تلقائيًا.'], keywords: ['مسودة سيرة', 'اكتب سيرة', 'نبذة', 'سيرة شخص', 'حقائق مسجلة'], actionLabel: 'صياغة مسودة مع كِندي' },
      en: { title: 'Draft a biography with Kindi', summary: 'Kindi creates a local draft from recorded names, dates, places, and occupations only, keeping it separate from the source record.', steps: ['Select the person or include their full name in the request.', 'Enter “Draft a biography for this person.”', 'Review the recorded facts and draft; it is not saved to the record automatically.'], keywords: ['biography draft', 'write biography', 'bio', 'person biography', 'recorded facts'], actionLabel: 'Draft with Kindi' },
    },
  },
  {
    id: 'kindi-record-review', categoryId: 'family-records', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'تنظيم ملاحظات ومصادر السجل بكِندي', summary: 'ينظم كِندي حقائق الشخص وملاحظاته ومصادره محليًا في معاينة آمنة، ويحجب الروابط والمعرفات الداخلية ولا يحفظ أي تغيير.', steps: ['حدد الشخص أو اذكر اسمه كاملًا.', 'اكتب «نظّم ملاحظات ومصادر هذا الشخص».', 'راجع الأقسام والفجوات، ثم استخدم «فتح سجل الشخص» للانتقال إلى السجل الأصلي.'], keywords: ['نظم الملاحظات', 'تنظيم المصادر', 'راجع المصادر', 'سجل الشخص', 'فجوات المصادر', 'ملاحظات'], actionLabel: 'مراجعة السجل مع كِندي' },
      en: { title: 'Organize record notes and sources with Kindi', summary: 'Kindi organizes a person’s facts, notes, and sources locally in a safe preview, hiding internal links and identifiers and saving no changes.', steps: ['Select the person or include their full name.', 'Enter “Organize notes and sources for this person.”', 'Review the sections and gaps, then use “Open person record” to move to the canonical record.'], keywords: ['organize notes', 'organise notes', 'review sources', 'person record', 'source gaps', 'notes and sources'], actionLabel: 'Review the record with Kindi' },
    },
  },
  {
    id: 'kindi-disambiguation', categoryId: 'explore-tree', audience: ALL_ROLES, actionId: 'kindi', kindiGuide: true,
    content: {
      ar: { title: 'اختيار الشخص الصحيح في كِندي', summary: 'عند تكرر الاسم يعرض كِندي بطاقات اختيار بسياق عائلي لمساعدتك.', steps: ['راجع الاسم والسياق في كل بطاقة.', 'اختر الشخص الصحيح.', 'ألغِ العملية إذا لم يكن أي اقتراح مناسبًا.'], keywords: ['اختيار', 'تشابه', 'تكرر الاسم', 'أي شخص', 'بطاقة'], actionLabel: 'فتح كِندي' },
      en: { title: 'Choose the right person in Kindi', summary: 'When a name repeats, Kindi shows cards with family context to help you choose.', steps: ['Review the name and context on each card.', 'Choose the correct person.', 'Cancel if no suggestion is right.'], keywords: ['choose', 'ambiguous', 'same name', 'which person', 'card'], actionLabel: 'Open Kindi' },
    },
  },
  {
    id: 'invite-collaborators', categoryId: 'collaboration', audience: OWNER_ONLY, actionId: 'vault-members',
    content: {
      ar: { title: 'دعوة متعاون', summary: 'يمنح المالك الوصول عبر دعوة رسمية؛ مشاركة رابط الشجرة وحدها لا تكفي.', steps: ['افتح الخزنة ثم الأعضاء.', 'أدخل حساب المتعاون وحدد دوره.', 'أرسل الدعوة وانتظر قبولها.'], keywords: ['دعوة', 'مشاركة', 'متعاون', 'عضو'], actionLabel: 'إدارة الأعضاء' },
      en: { title: 'Invite a collaborator', summary: 'The owner grants access through an invitation; sharing the tree URL alone is not enough.', steps: ['Open The Vault, then Members.', 'Enter the collaborator account and choose a role.', 'Send the invitation and wait for acceptance.'], keywords: ['invite', 'share', 'collaborator', 'member'], actionLabel: 'Manage members' },
    },
  },
  {
    id: 'roles-and-permissions', categoryId: 'collaboration', audience: ALL_ROLES, actionId: 'vault-members', kindiGuide: true, kindiGuideId: 'kindi-access-privacy',
    content: {
      ar: { title: 'أدوار المالك والمحرر والمشاهد', summary: 'المالك يدير الوصول، والمحرر يعدّل، والمشاهد يقرأ دون تغيير الشجرة.', steps: ['افتح قائمة الأعضاء.', 'راجع الدور بجانب كل عضو.', 'غيّر الدور أو ألغِ الوصول عند الحاجة بصفتك مالكًا.'], keywords: ['صلاحيات', 'مالك', 'محرر', 'مشاهد', 'وصول', 'خصوصية'], actionLabel: 'عرض الأعضاء والصلاحيات' },
      en: { title: 'Owner, editor, and viewer roles', summary: 'Owners manage access, editors can change the tree, and viewers have read-only access.', steps: ['Open the member list.', 'Review the role beside each member.', 'As owner, change the role or revoke access when needed.'], keywords: ['permissions', 'owner', 'editor', 'viewer', 'access', 'privacy'], actionLabel: 'View members and permissions' },
    },
  },
  {
    id: 'shared-tree-discussions', categoryId: 'collaboration', audience: ALL_ROLES, actionId: 'vault-members',
    content: {
      ar: { title: 'محادثات الشجرة المشتركة', summary: 'استخدم المحادثة المرتبطة بالشجرة لتنسيق المراجعة دون فصلها عن سياق العائلة.', steps: ['افتح مساحة المشاركة.', 'اكتب الملاحظة بوضوح واربطها بالشخص عند الحاجة.', 'تابع الردود قبل إجراء تغيير حساس.'], keywords: ['محادثة', 'تعليق', 'مشاركة', 'فريق'] , actionLabel: 'فتح المشاركة' },
      en: { title: 'Shared-tree discussions', summary: 'Use the tree discussion to coordinate review without losing family context.', steps: ['Open the collaboration area.', 'Write a clear note and reference the person when needed.', 'Review replies before a sensitive change.'], keywords: ['discussion', 'comment', 'sharing', 'team'], actionLabel: 'Open collaboration' },
    },
  },
  {
    id: 'visual-posters', categoryId: 'publishing-backup', audience: OWNER_ONLY, actionId: 'vault-visuals',
    content: {
      ar: { title: 'إنشاء بوستر عائلي', summary: 'ينشئ الاستوديو بوسترات SVG وPNG وPDF من مشهد طباعة موحّد.', steps: ['افتح الخزنة ثم المخرجات البصرية.', 'اختر نوع المخطط والنطاق والتصميم.', 'راجع الجودة ثم نزّل الصيغة المناسبة.'], keywords: ['بوستر', 'ملصق', 'طباعة', 'SVG', 'PNG', 'PDF', 'شعاعي'], actionLabel: 'فتح استوديو البوسترات' },
      en: { title: 'Create a family poster', summary: 'The Studio creates SVG, PNG, and PDF posters from one print scene.', steps: ['Open The Vault, then Visual outputs.', 'Choose layout, scope, and design.', 'Review print quality and download the right format.'], keywords: ['poster', 'print', 'SVG', 'PNG', 'PDF', 'radial'], actionLabel: 'Open Poster Studio' },
    },
  },
  {
    id: 'family-book', categoryId: 'publishing-backup', audience: OWNER_ONLY, actionId: 'vault-family-book',
    content: {
      ar: { title: 'إعداد كتاب العائلة', summary: 'يجمع كتاب العائلة الأشخاص والسرد والمصادر في وثيقة مرتبة.', steps: ['افتح الخزنة ثم كتاب العائلة.', 'اختر الجذر والنطاق وترتيب المحتوى.', 'راجع المعاينة قبل إنشاء الوثيقة.'], keywords: ['كتاب العائلة', 'سرد', 'وثيقة', 'مصادر'], actionLabel: 'فتح كتاب العائلة' },
      en: { title: 'Prepare a family book', summary: 'Family Book brings people, narrative, and sources into a structured document.', steps: ['Open The Vault, then Family Book.', 'Choose the root, scope, and ordering.', 'Review the preview before generating the document.'], keywords: ['family book', 'narrative', 'document', 'sources'], actionLabel: 'Open Family Book' },
    },
  },
  {
    id: 'portable-data', categoryId: 'publishing-backup', audience: OWNER_ONLY, actionId: 'vault-data-export',
    content: {
      ar: { title: 'تصدير البيانات وGEDCOM', summary: 'يوفر تصدير البيانات نسخة قابلة للنقل، ويتيح GEDCOM التبادل مع تطبيقات الأنساب.', steps: ['افتح البيانات القابلة للنقل.', 'اختر الأرشيف أو GEDCOM.', 'راجع نطاق البيانات ثم نزّل الملف واحفظه بأمان.'], keywords: ['تصدير', 'GEDCOM', 'أرشيف', 'بيانات قابلة للنقل'], actionLabel: 'فتح تصدير البيانات' },
      en: { title: 'Export data and GEDCOM', summary: 'Data export provides a portable copy, while GEDCOM supports exchange with genealogy apps.', steps: ['Open Portable data.', 'Choose archive or GEDCOM.', 'Review the scope, download, and store the file safely.'], keywords: ['export', 'GEDCOM', 'archive', 'portable data'], actionLabel: 'Open data export' },
    },
  },
  {
    id: 'cloud-backup', categoryId: 'publishing-backup', audience: OWNER_ONLY, actionId: 'vault-cloud-backup', kindiGuide: true, kindiGuideId: 'kindi-backup-sync',
    content: {
      ar: { title: 'النسخ الاحتياطي السحابي', summary: 'يوفر Google Drive النسخ الاحتياطي الاختياري والمنفصل عن مزامنة بيانات جذور.', steps: ['افتح الخزنة ثم النسخ السحابي.', 'أنشئ نسخة جديدة أو راجع النسخ الموجودة.', 'اختبر الاستعادة على النسخة الصحيحة قبل استبدال العمل.'], keywords: ['نسخ احتياطي', 'نسخة احتياطية', 'مزامنة', 'درايف', 'جوجل', 'سحابة', 'استعادة'], actionLabel: 'إدارة النسخ السحابية' },
      en: { title: 'Cloud backup', summary: 'Google Drive backup is optional and separate from Jozor data synchronization.', steps: ['Open The Vault, then Cloud backup.', 'Create a copy or review existing backups.', 'Verify the selected copy before restoring over current work.'], keywords: ['backup', 'sync', 'drive', 'google', 'cloud', 'restore'], actionLabel: 'Manage cloud backups' },
    },
  },
  {
    id: 'living-people-privacy', categoryId: 'privacy-security', audience: ALL_ROLES, actionId: 'vault-security',
    content: {
      ar: { title: 'خصوصية الأحياء والصور', summary: 'تتحكم إعدادات الخصوصية في إظهار بيانات الأحياء وصورهم في العرض والنشر.', steps: ['افتح الخزنة ثم الأمان.', 'راجع سياسة الأحياء والصور.', 'تحقق من المعاينة قبل مشاركة أي مخرج.'], keywords: ['خصوصية', 'أحياء', 'صور', 'إخفاء', 'بيانات'], actionLabel: 'فتح إعدادات الأمان' },
      en: { title: 'Living-person and photo privacy', summary: 'Privacy settings control how living-person data and photos appear in views and publishing.', steps: ['Open The Vault, then Security.', 'Review living-person and photo policy.', 'Check the preview before sharing any output.'], keywords: ['privacy', 'living', 'photos', 'hide', 'data'], actionLabel: 'Open security settings' },
    },
  },
  {
    id: 'account-and-tree-security', categoryId: 'privacy-security', audience: ALL_ROLES, actionId: 'vault-security',
    content: {
      ar: { title: 'أمان الحساب والشجرة', summary: 'يحمي تسجيل الدخول وصلاحيات الشجرة البيانات؛ لا ترسل رموز الدخول أو ملفات التصدير الخاصة.', steps: ['استخدم حسابك الشخصي فقط.', 'راجع الأعضاء والصلاحيات دوريًا.', 'احفظ ملفات التصدير والنسخ الاحتياطية في مكان موثوق.'], keywords: ['أمان', 'حساب', 'رمز دخول', 'صلاحيات', 'ملف خاص'], actionLabel: 'مراجعة الأمان' },
      en: { title: 'Account and tree security', summary: 'Authentication and tree permissions protect data; never share sign-in tokens or private exports.', steps: ['Use only your own account.', 'Review members and roles regularly.', 'Store exports and backups in a trusted location.'], keywords: ['security', 'account', 'token', 'permissions', 'private file'], actionLabel: 'Review security' },
    },
  },
  {
    id: 'sync-and-recovery', categoryId: 'troubleshooting', audience: EDIT_ROLES, actionId: 'tree-control',
    content: {
      ar: { title: 'فهم المزامنة واستعادة العمل', summary: 'تعرض حالة المزامنة التغييرات المعلّقة؛ لا تغلق الصفحة أثناء الحفظ النشط.', steps: ['راجع شريط حالة المزامنة.', 'انتظر اكتمال التغييرات المعلّقة.', 'إذا استمرت المشكلة افتح مركز التحكم أو التشخيص.'], keywords: ['مزامنة', 'حفظ', 'معلق', 'استعادة', 'اتصال'], actionLabel: 'فحص حالة الشجرة' },
      en: { title: 'Understand sync and recover work', summary: 'Sync status shows pending changes; avoid closing the page during active saves.', steps: ['Check the sync status ribbon.', 'Wait for pending changes to complete.', 'If the issue persists, open Tree Control or Diagnostics.'], keywords: ['sync', 'save', 'pending', 'recover', 'connection'], actionLabel: 'Inspect tree status' },
    },
  },
  {
    id: 'activity-history', categoryId: 'troubleshooting', audience: OWNER_ONLY, actionId: 'activity-log',
    content: {
      ar: { title: 'سجل النشاط والتغييرات', summary: 'يساعد سجل النشاط على فهم من غيّر ماذا ومتى في الشجرة المشتركة.', steps: ['افتح سجل النشاط.', 'صفِّ الأحداث حسب النوع أو الشخص.', 'راجع السياق قبل اتخاذ إجراء تصحيحي.'], keywords: ['سجل النشاط', 'تاريخ', 'تغييرات', 'من عدل'], actionLabel: 'فتح سجل النشاط' },
      en: { title: 'Activity and change history', summary: 'Activity history helps explain who changed what and when in a shared tree.', steps: ['Open Activity history.', 'Filter events by type or person.', 'Review context before taking corrective action.'], keywords: ['activity log', 'history', 'changes', 'who changed'], actionLabel: 'Open activity history' },
    },
  },
  {
    id: 'diagnostics', categoryId: 'troubleshooting', audience: ALL_ROLES, actionId: 'diagnostics',
    content: {
      ar: { title: 'التشخيص عند استمرار المشكلة', summary: 'يعرض التشخيص معلومات تشغيلية تساعد في تحديد سبب المشكلة دون تخمين.', steps: ['أعد تنفيذ الخطوة مرة واحدة وسجل ما حدث.', 'افتح لوحة التشخيص.', 'شارك الوصف والوقت فقط مع الدعم، دون بيانات عائلية خاصة.'], keywords: ['تشخيص', 'خطأ', 'مشكلة', 'لا يعمل', 'دعم'], actionLabel: 'فتح التشخيص' },
      en: { title: 'Diagnostics for persistent problems', summary: 'Diagnostics provides operational information that helps identify a problem without guesswork.', steps: ['Repeat the step once and note what happened.', 'Open Diagnostics.', 'Share the description and time with support, without private family data.'], keywords: ['diagnostics', 'error', 'problem', 'not working', 'support'], actionLabel: 'Open Diagnostics' },
    },
  },
] as const;

const normalizeSearchText = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

export const isHelpActionId = (value: string | null | undefined): value is HelpActionId =>
  HELP_TOPICS.some((topic) => topic.actionId === value);

export const getLocalizedHelpCategories = (language: Language) =>
  HELP_CATEGORIES.map((category) => ({ id: category.id, ...category.content[language] }));

export const getLocalizedHelpTopics = (language: Language): LocalizedHelpTopicView[] =>
  HELP_TOPICS.map(({ content, ...topic }) => ({ ...topic, ...content[language] }));

export const getHelpTopic = (topicId: string, language: Language): LocalizedHelpTopicView | undefined => {
  const topic = HELP_TOPICS.find((item) => item.id === topicId);
  if (!topic) return undefined;
  const { content, ...definition } = topic;
  return { ...definition, ...content[language] };
};

export const searchHelpTopics = (
  query: string,
  language: Language,
  categoryId?: HelpCategoryId
): LocalizedHelpTopicView[] => {
  const normalizedQuery = normalizeSearchText(query);
  const topics = getLocalizedHelpTopics(language)
    .filter((topic) => !categoryId || topic.categoryId === categoryId);

  if (!normalizedQuery) return topics;

  return topics
    .map((topic) => {
      const title = normalizeSearchText(topic.title);
      const summary = normalizeSearchText(topic.summary);
      const searchable = normalizeSearchText([
        topic.title,
        topic.summary,
        ...topic.steps,
        ...topic.keywords,
      ].join(' '));
      const score = title.includes(normalizedQuery)
        ? 8
        : summary.includes(normalizedQuery)
          ? 5
          : searchable.includes(normalizedQuery)
            ? 2
            : 0;
      return { topic, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.topic.title.localeCompare(right.topic.title, language))
    .map(({ topic }) => topic);
};
