import React, { useCallback, memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { CollapsePoint, NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT, NODE_HEIGHT_DEFAULT, NODE_HEIGHT_COMPACT } from '../../utils/treeLayout';
import { getYears } from '../../utils/familyLogic';
import { User, Ribbon, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';

interface DescendantPedigreeChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  collapsePoints: CollapsePoint[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  toggleCollapse: (uniqueKey: string) => void;
  people: Record<string, Person>; // Needed for link path logic
}

export const DescendantPedigreeChart: React.FC<DescendantPedigreeChartProps> = memo(({
  nodes, links, collapsePoints, focusId, onSelect, settings, toggleCollapse, people
}) => {
  // Use centralized constants
  const NODE_WIDTH = settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
  const NODE_HEIGHT = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
  const COLLAPSE_CIRCLE_RADIUS = 12; // Radius of the collapse circle
  const LINE_CORNER_RADIUS = 10; // Radius for line corners
  const isVertical = settings.layoutMode === 'vertical';

  // Helper function to draw path from collapse point to child with curved corners
  const drawChildBranchPath = useCallback((collapsePointX: number, collapsePointY: number, targetX: number, targetY: number) => {
    const startPointY = collapsePointY + COLLAPSE_CIRCLE_RADIUS; // Start from bottom edge of collapse circle
    const targetPointY = targetY - NODE_HEIGHT / 2; // Connect to top edge of target node
    const targetPointX = targetX;

    const r = LINE_CORNER_RADIUS;

    if (isVertical) {
        // If child is directly below collapse point, draw a straight vertical line
        if (Math.abs(collapsePointX - targetPointX) < 1) {
            return `M ${collapsePointX} ${startPointY} V ${targetPointY}`;
        }

        // Otherwise, draw a path with curved corners
        const midY = startPointY + (targetPointY - startPointY) / 2;
        const dirX = targetPointX > collapsePointX ? 1 : -1;

        return `M ${collapsePointX} ${startPointY}` +
               `V ${midY - r}` + // Vertical segment before first curve
               `Q ${collapsePointX} ${midY}, ${collapsePointX + dirX * r} ${midY}` + // First curve
               `H ${targetPointX - dirX * r}` + // Horizontal segment
               `Q ${targetPointX} ${midY}, ${targetPointX} ${midY + r}` + // Second curve
               `V ${targetPointY}`; // Vertical segment to target
    } else { // Horizontal layout
        const startPointX = collapsePointY + COLLAPSE_CIRCLE_RADIUS; // Start from right edge of collapse circle
        const targetPointX = targetY - NODE_WIDTH / 2; // Connect to left edge of target node
        const targetPointY = targetX;

        // If child is directly to the right of collapse point, draw a straight horizontal line
        if (Math.abs(collapsePointX - targetPointX) < 1) {
            return `M ${startPointX} ${collapsePointY} H ${targetPointX}`;
        }

        // Otherwise, draw a path with curved corners
        const<dyad-problem-report summary="87 problems">
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="9" column="21" code="2304">Cannot find name 'memo'.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="18" column="11" code="6133">'t' is declared but its value is never read.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="66" column="86" code="2304">Cannot find name 'memo'.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="67" column="5" code="7031">Binding element 'person' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="67" column="13" code="7031">Binding element 'people' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="67" column="21" code="7031">Binding element 'isEditing' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="67" column="32" code="7031">Binding element 'onSelect' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="68" column="5" code="7031">Binding element 'familyActions' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="78" column="22" code="18046">'p' is of type 'unknown'.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="78" column="44" code="18046">'p' is of type 'unknown'.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="78" column="59" code="7006">Parameter 'parentId' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="79" column="19" code="18046">'p' is of type 'unknown'.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="84" column="53" code="7006">Parameter 'id' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="99" column="29" code="7006">Parameter 'g' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="115" column="29" code="7006">Parameter 'g' implicitly has an 'any' type.</problem>
<problem file="components/sidebar/FamilyRelationshipsSection.tsx" line="131" column="29" code="7006">Parameter 'g' implicitly has an 'any' type.</problem>
<problem file="services/geminiService.ts" line="8" column="7" code="6133">'getClient' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="32" column="11" code="6133">'sanitizedTone' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="50" column="11" code="6133">'details' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="109" column="89" code="6133">'history' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="109" column="109" code="6133">'newMessage' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="115" column="15" code="6133">'sanitizedPersonFirstName' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="116" column="15" code="6133">'sanitizedPersonLastName' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="117" column="15" code="6133">'sanitizedBirthDate' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="118" column="15" code="6133">'sanitizedBirthPlace' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="119" column="15" code="6133">'sanitizedDeathDate' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="120" column="15" code="6133">'sanitizedProfession' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="121" column="15" code="6133">'sanitizedInterests' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="122" column="15" code="6133">'sanitizedBio' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="124" column="15" code="6133">'sanitizedParentNames' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="125" column="15" code="6133">'sanitizedSpouseNames' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="173" column="41" code="6133">'text' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="218" column="36" code="6133">'base64Image' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="249" column="75" code="6133">'rootId' is declared but its value is never read.</problem>
<problem file="services/geminiService.ts" line="255" column="15" code="6133">'sanitizedSimplifiedData' is declared but its value is never read.</problem>
<problem file="components/sidebar/InfoTab.tsx" line="5" column="1" code="6133">'useTranslation' is declared but its value is never read.</problem>
<problem file="components/sidebar/BioTab.tsx" line="262" column="58" code="6133">'index' is declared but its value is never read.</problem>
<problem file="components/sidebar/BioTab.tsx" line="395" column="56" code="6133">'index' is declared but its value is never read.</problem>
<problem file="components/Sidebar.tsx" line="29" column="42" code="6133">'onTriggerImportFile' is declared but its value is never read.</problem>
<problem file="components/charts/DescendantPedigreeChart.tsx" line="6" column="1" code="6133">'d3' is declared but its value is never read.</problem>
<problem file="components/charts/FanChart.tsx" line="3" column="10" code="6133">'Person' is declared but its value is never read.</problem>
<problem file="components/charts/FanChart.tsx" line="13" column="67" code="6133">'focusId' is declared but its value is never read.</problem>
<problem file="components/charts/FanChart.tsx" line="13" column="86" code="6133">'settings' is declared but its value is never read.</problem>
<problem file="components/charts/ForceChart.tsx" line="2" column="10" code="6133">'Person' is declared but its value is never read.</problem>
<problem file="components/charts/ForceChart.tsx" line="3" column="1" code="6133">'User' is declared but its value is never read.</problem>
<problem file="components/charts/ForceChart.tsx" line="14" column="76" code="6133">'focusId' is declared but its value is never read.</problem>
<problem file="components/charts/ForceChart.tsx" line="14" column="95" code="6133">'settings' is declared but its value is never read.</problem>
<problem file="components/charts/ForceChart.tsx" line="19" column="19" code="6133">'link' is declared but its value is never read.</problem>
<problem file="components/WelcomeScreen.tsx" line="4" column="1" code="6133">'Language' is declared but its value is never read.</problem>
<problem file="components/WelcomeScreen.tsx" line="16" column="10" code="6133">'currentOrigin' is declared but its value is never read.</problem>
<problem file="components/LinkPersonModal.tsx" line="3" column="31" code="6133">'User' is declared but its value is never read.</problem>
<problem file="components/LinkPersonModal.tsx" line="24" column="3" code="6133">'language' is declared but its value is never read.</problem>
<problem file="utils/relationshipLogic.ts" line="70" column="11" code="6133">'enTerms' is declared but its value is never read.</problem>
<problem file="utils/relationshipLogic.ts" line="71" column="11" code="6133">'arTerms' is declared but its value is never read.</problem>
<problem file="utils/relationshipLogic.ts" line="99" column="11" code="6133">'generationDiff' is declared but its value is never read.</problem>
<problem file="components/RelationshipModal.tsx" line="3" column="25" code="6133">'ArrowRight' is declared but its value is never read.</problem>
<problem file="components/StatisticsModal.tsx" line="14" column="92" code="6133">'language' is declared but its value is never read.</problem>
<problem file="components/AncestorChatModal.tsx" line="15" column="104" code="6133">'language' is declared but its value is never read.</problem>
<problem file="components/ConsistencyModal.tsx" line="3" column="28" code="6133">'ConsistencyIssue' is declared but its value is never read.</problem>
<problem file="components/ConsistencyModal.tsx" line="16" column="46" code="6133">'language' is declared but its value is never read.</problem>
<problem file="components/TimelineModal.tsx" line="16" column="46" code="6133">'language' is declared but its value is never read.</problem>
<problem file="components/ShareModal.tsx" line="5" column="23" code="6133">'showError' is declared but its value is never read.</problem>
<problem file="components/GeoMapModal.tsx" line="14" column="84" code="6133">'language' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="2" column="10" code="6133">'Person' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="2" column="18" code="6133">'Gender' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="2" column="26" code="6133">'Language' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="2" column="36" code="6133">'UserProfile' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="2" column="49" code="6133">'FamilyActionsProps' is declared but its value is never read.</problem>
<problem file="components/ModalManager.tsx" line="67" column="14" code="2741">Property 'driveFileId' is missing in type '{ isOpen: boolean; onClose: () =&gt; void; onLoadCloud: () =&gt; Promise&lt;void&gt;; onSaveNewCloud: () =&gt; Promise&lt;void&gt;; }' but required in type 'GoogleSyncChoiceModalProps'.</problem>
<problem file="components/ModalManagerContainer.tsx" line="28" column="15" code="2304">Cannot find name 'DriveFile'.</problem>
<problem file="components/header/ExportMenu.tsx" line="1" column="8" code="6133">'React' is declared but its value is never read.</problem>
<problem file="components/header/ToolsMenu.tsx" line="1" column="8" code="6133">'React' is declared but its value is never read.</problem>
<problem file="components/header/ToolsMenu.tsx" line="3" column="15" code="6133">'Hammer' is declared but its value is never read.</problem>
<problem file="components/header/ViewSettingsMenu.tsx" line="1" column="8" code="6133">'React' is declared but its value is never read.</problem>
<problem file="components/header/ViewSettingsMenu.tsx" line="4" column="3" code="6133">'SlidersHorizontal' is declared but its value is never read.</problem>
<problem file="components/header/UserMenu.tsx" line="1" column="8" code="6133">'React' is declared but its value is never read.</problem>
<problem file="components/header/UserMenu.tsx" line="2" column="10" code="6133">'UserProfile' is declared but its value is never read.</problem>
<problem file="components/header/SearchResults.tsx" line="1" column="8" code="6133">'React' is declared but its value is never read.</problem>
<problem file="components/header/SearchResults.tsx" line="2" column="10" code="6133">'Person' is declared but its value is never read.</problem>
<problem file="components/header/HeaderRightSection.tsx" line="97" column="14" code="2741">Property 'onOpenDriveFileManager' is missing in type '{ user: UserProfile; isDemoMode: boolean; onLogout: () =&gt; Promise&lt;void&gt;; }' but required in type 'UserMenuProps'.</problem>
<problem file="hooks/useThemeSync.ts" line="2" column="1" code="6133">'AppTheme' is declared but its value is never read.</problem>
<problem file="hooks/useAppOrchestration.ts" line="21" column="33" code="6133">'addParent' is declared but its value is never read.</problem>
<problem file="hooks/useAppOrchestration.ts" line="21" column="44" code="6133">'addSpouse' is declared but its value is never read.</problem>
<problem file="hooks/useAppOrchestration.ts" line="21" column="55" code="6133">'addChild' is declared but its value is never read.</problem>
<problem file="hooks/useAppOrchestration.ts" line="77" column="50" code="2554">Expected 0 arguments, but got 1.</problem>
<problem file="App.tsx" line="25" column="5" code="6133">'handleOpenLinkModal' is declared but its value is never read.</problem>
<problem file="App.tsx" line="36" column="5" code="6133">'startNewTree' is declared but its value is never read.</problem>
</dyad-problem-report><think>**Analyzing TypeScript Errors**

I'm currently focused on resolving 87 TypeScript compile-time errors.  These are mainly due to unused imports like `React`, `memo`, and various data types. I'm prioritizing fixing these unnecessary imports to clean up the codebase. Other types of errors I'm working through include some issues related to type definitions of components, props, and actions.


**Identifying Core TypeScript Issues**

I'm making progress identifying and categorizing the 87 TypeScript errors. I've pinpointed key issues like unused imports of React and other modules, which I'm tackling first to streamline the code. There are also unused variables that need cleaning up. Furthermore, I've noticed numerous implicit 'any' types that require explicit definition. The issues also include missing imports like `memo` and required props such as `driveFileId`, and `onOpenDriveFileManager`.


**Systematically Addressing TypeScript Issues**

I've been systematically addressing the 87 TypeScript errors. Focusing on unused imports such as `React`, `memo`, `d3`, and several data types, and am now moving to correct unused variables like `t`, `sanitizedTone`, and `details`. I'm also adding types where 'any' is implicitly used. I'm importing missing modules like `memo` and addressing the missing required prop and argument errors.


**Tackling Remaining TypeScript Errors**

I'm now focusing on the remaining TypeScript errors, after removing the previously identified unused imports, variables, and addressing the implicit `any` types. I'm importing `memo`, passing required props, and providing necessary arguments to function calls. I've corrected the `useThemeSync` call and removed unused parameters in various functions. I'm systematically going through the remaining errors to resolve them one by one, ensuring code clarity and maintainability.


**Fixing Remaining TypeScript Issues**

I'm now methodically addressing the final TypeScript errors. My focus is on imports, types, and function calls. I've imported `DriveFile`, `memo`, and other missing imports, and have passed the required props and arguments to fix the type errors. I've also removed unused variables and corrected the `useThemeSync` call to align with its expected signature. I'm removing unused parameters in functions, making the code cleaner and the logic clearer.


**Systematically Resolving TypeScript Errors**

I'm now methodically addressing the remaining TypeScript issues. I've successfully addressed the `useThemeSync` call and removed various unused imports, including `Hammer`, `SlidersHorizontal`, and `Plus`. Furthermore, I've cleared unnecessary variables in several files, such as `components/ui/QuickAddSpeedDial.tsx` and `components/sidebar/InlineAddButton.tsx`, enhancing code clarity and maintainability. My current focus is on the remaining type errors and ensuring proper prop passing across components.


</think>بالتأكيد، سأقوم بإصلاح جميع أخطاء TypeScript المتبقية عن طريق إزالة الاستيرادات والمتغيرات غير المستخدمة، وتصحيح أي مشاكل في تمرير الخصائص (props) بين المكونات.

سأقوم بالتعديلات التالية:

1.  **`components/sidebar/FamilyRelationshipsSection.tsx`**: استيراد `memo` من `react`، وتحديد أنواع المعاملات بشكل صريح، وإزالة المتغيرات غير المستخدمة.
2.  **`services/geminiService.ts`**: تعليق أو إزالة المتغيرات والاستدعاءات المتعلقة بـ Gemini API نظرًا لتعطيل ميزات الذكاء الاصطناعي من جانب العميل حاليًا.
3.  **`components/ModalManager.tsx`**: تمرير خاصية `driveFileId` إلى `GoogleSyncChoiceModal` وإزالة الاستيرادات غير المستخدمة.
4.  **`components/ModalManagerContainer.tsx`**: استيراد `DriveFile` الذي كان مفقودًا.
5.  **`components/header/HeaderRightSection.tsx`**: تمرير خاصية `onOpenDriveFileManager` إلى مكون `UserMenu`.
6.  **`hooks/useAppOrchestration.ts`**: تصحيح استدعاء `useThemeSync` وإزالة الاستيرادات والمتغيرات غير المستخدمة.
7.  **`App.tsx`**: إزالة المتغيرات غير المستخدمة.
8.  **ملفات أخرى**: إزالة الاستيرادات والمتغيرات غير المستخدمة في الملفات الأخرى المذكورة في قائمة الأخطاء.

<dyad-write path="components/sidebar/FamilyRelationshipsSection.tsx" description="Importing `memo` from `react`, explicitly typing props, and removing unused variables.">
import React, { memo } from 'react'; // Import memo from react
import { Person, Gender, FamilyActionsProps } from '../../types';
import { Heart, Users, UserRound, Baby } from 'lucide-react';
import { InlineAddButton } from './InlineAddButton';
import { FamilyMemberItem } from './FamilyMemberItem';
import { useTranslation } from '../../context/TranslationContext';
import { sortPeopleByBirthDate } from '../../utils/familyLogic'; // Import the new sorting utility

// --- Family Group Component (now internal to this file, or could be moved to its own file if needed elsewhere) ---
const FamilyGroup = memo(({ 
    title, icon, ids, people, onAdd, onRemove, onSelect, placeholder, isEditing,
    iconBgClass = 'bg-stone-100 dark:bg-stone-800', // Default background for icon
    iconTextColorClass = 'text-stone-500' // Default text color for icon
}: { 
    title: string, icon: React.ReactNode, ids: string[], people: Record<string, Person>, onAdd?: (g: Gender) => void, onRemove?: (id: string) => void, onSelect: (id: string) => void, placeholder: string, isEditing: boolean,
    iconBgClass?: string, // New prop for icon background class
    iconTextColorClass?: string // New prop for icon text color class
}) => {
    const { t } = useTranslation();
    return (
        <div className="mb-3 last:mb-0">
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <div className={`p-1 rounded ${iconBgClass} ${iconTextColorClass}`}>{icon}</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">{title} <span className="opacity-60">({ids.length})</span></span>
                </div>
                {isEditing && onAdd && (
                    <div className="flex gap-1">
                        <InlineAddButton onClick={() => onAdd('male')} gender="male" />
                        <InlineAddButton onClick={() => onAdd('female')} gender="female" />
                    </div>
                )}
            </div>
            
            {ids.length === 0 && isEditing ? (
                 <div className="text-[9px] text-stone-400 italic px-2 py-2 bg-stone-50/50 dark:bg-stone-800/30 rounded-lg border border-dashed border-stone-100 dark:border-stone-700 text-center">
                    {placeholder}
                 </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {ids.map((id: string) => ( // Explicitly type id
                        <FamilyMemberItem 
                            key={id} 
                            id={id} 
                            person={people[id]} 
                            onSelect={onSelect} 
                            onRemove={isEditing ? onRemove : undefined}
                        />
                    ))} 
                </div>
            )}
        </div>
    );
});

// --- Main Component ---

interface FamilyRelationshipsSectionProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
}

export const FamilyRelationshipsSection: React.FC<FamilyRelationshipsSectionProps> = memo(({
    person, people, isEditing, onSelect,
    familyActions
}) => {
    const { t } = useTranslation();

    const handleRemoveParent = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'parent');
    const handleRemoveSpouse = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'spouse');
    const handleRemoveChild = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'child');

    // Calculate siblings based on common parents
    const siblingIds = Object.values(people)
        .filter((p: Person) => p.id !== person.id && p.parents.some((parentId: string) => person.parents.includes(parentId)))
        .map((p: Person) => p.id);

    // Sort children and siblings by birth date if not in editing mode
    const sortedChildrenIds = isEditing 
        ? person.children 
        : sortPeopleByBirthDate(person.children.map((id: string) => people[id]).filter(Boolean) as Person[]).map((p: Person) => p.id);

    const sortedSiblingIds = isEditing 
        ? siblingIds 
        : sortPeopleByBirthDate(siblingIds.map((id: string) => people[id]).filter(Boolean) as Person[]).map((p: Person) => p.id);

    return (
        <div className="space-y-3 relative">
            
            {(person.parents.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.parents} 
                    icon={<UserRound className="w-3.5 h-3.5" />} 
                    ids={person.parents} 
                    people={people}
                    onAdd={(g: Gender) => familyActions.onAddParent(g)}
                    onRemove={handleRemoveParent}
                    onSelect={onSelect}
                    placeholder={t.noParents}
                    isEditing={isEditing}
                    iconBgClass="bg-amber-100 dark:bg-amber-900/20"
                    iconTextColorClass="text-amber-600 dark:text-amber-400"
                />
            )}
            
            {(person.spouses.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.spouses} 
                    icon={<Heart className="w-3.5 h-3.5" />} 
                    ids={person.spouses} 
                    people={people}
                    onAdd={(g: Gender) => familyActions.onAddSpouse(g)}
                    onRemove={handleRemoveSpouse}
                    onSelect={onSelect}
                    placeholder={t.noPartners}
                    isEditing={isEditing}
                    iconBgClass="bg-rose-100 dark:bg-rose-900/20"
                    iconTextColorClass="text-rose-600 dark:text-rose-400"
                />
            )}

            {(sortedChildrenIds.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.children} 
                    icon={<Baby className="w-3.5 h-3.5" />} 
                    ids={sortedChildrenIds} 
                    people={people}
                    onAdd={(g: Gender) => familyActions.onAddChild(g)}
                    onRemove={handleRemoveChild}
                    onSelect={onSelect}
                    placeholder={t.noChildren}
                    isEditing={isEditing}
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
                    iconTextColorClass="text-emerald-600 dark:text-emerald-400"
                />
            )}

            {(sortedSiblingIds.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.siblings} 
                    icon={<Users className="w-3.5 h-3.5" />} 
                    ids={sortedSiblingIds} 
                    people={people}
                    onRemove={isEditing ? handleRemoveChild : undefined}
                    onSelect={onSelect}
                    placeholder={t.noSiblings}
                    isEditing={isEditing}
                    iconBgClass="bg-indigo-100 dark:bg-indigo-900/20"
                    iconTextColorClass="text-indigo-600 dark:text-indigo-400"
                />
            )}
        </div>
    );
});