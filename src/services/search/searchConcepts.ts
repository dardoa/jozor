export type SearchIntent = 
    | 'children' | 'seniors' | 'females' | 'males' | 'deceased' | 'living' 
    | 'rel_children' | 'rel_daughters' | 'rel_sons'
    | 'rel_grandchildren' | 'rel_granddaughters' | 'rel_grandsons'
    | 'rel_spouses' | 'rel_siblings'
    | 'rel_uncles_paternal' | 'rel_aunts_paternal'
    | 'rel_uncles_maternal' | 'rel_aunts_maternal'
    | 'rel_cousins_paternal_uncle' | 'rel_cousins_paternal_aunt'
    | 'rel_cousins_maternal_uncle' | 'rel_cousins_maternal_aunt'
    | 'loc_indicator' | 'none';

export type LogicType = 'CATEGORICAL' | 'RELATIONAL' | 'LOCATIONAL';

export interface ConceptDefinition {
    id: SearchIntent;
    logicType: LogicType;
    keywords: string[];
}

export const SEARCH_CONCEPTS: ConceptDefinition[] = [
    { id: 'children', logicType: 'CATEGORICAL', keywords: ['اطفال صغار', 'بزارين'] },
    { id: 'seniors', logicType: 'CATEGORICAL', keywords: ['مسنين', 'كبار السن'] },
    { id: 'females', logicType: 'CATEGORICAL', keywords: ['نساء', 'اناث', 'حريم'] },
    { id: 'males', logicType: 'CATEGORICAL', keywords: ['رجال', 'ذكور', 'شباب'] },
    { id: 'deceased', logicType: 'CATEGORICAL', keywords: ['متوفين', 'رحمهم الله'] },
    { id: 'living', logicType: 'CATEGORICAL', keywords: ['احياء', 'عايشين'] },
    
    // --- Relational Concepts ---
    { id: 'rel_children', logicType: 'RELATIONAL', keywords: ['ابناء', 'اولاد', 'ذرية', 'عيال'] },
    { id: 'rel_daughters', logicType: 'RELATIONAL', keywords: ['بنات'] },
    { id: 'rel_sons', logicType: 'RELATIONAL', keywords: ['بنين'] },
    
    { id: 'rel_grandchildren', logicType: 'RELATIONAL', keywords: ['احفاد', 'حفدة'] },
    { id: 'rel_granddaughters', logicType: 'RELATIONAL', keywords: ['حفيدات'] },
    { id: 'rel_grandsons', logicType: 'RELATIONAL', keywords: ['حفيد'] },

    { id: 'rel_spouses', logicType: 'RELATIONAL', keywords: ['زوجات', 'ازواج', 'نسوان', 'زوجة', 'زوج'] },
    { id: 'rel_siblings', logicType: 'RELATIONAL', keywords: ['اخوة', 'اخوان', 'خوات', 'اشقاء'] },
    
    { id: 'rel_grandparents', logicType: 'RELATIONAL', keywords: ['أجداد', 'اجداد', 'جد'] },
    { id: 'rel_grandmothers', logicType: 'RELATIONAL', keywords: ['جدات', 'جدة', 'جده'] },

    { id: 'rel_uncles_paternal', logicType: 'RELATIONAL', keywords: ['اعمام', 'عمام', 'عم'] },
    { id: 'rel_aunts_paternal', logicType: 'RELATIONAL', keywords: ['عمات', 'عمة'] },
    
    { id: 'rel_uncles_maternal', logicType: 'RELATIONAL', keywords: ['اخوال', 'خوال', 'خال'] },
    { id: 'rel_aunts_maternal', logicType: 'RELATIONAL', keywords: ['خالات', 'خالة'] },
    
    { id: 'rel_cousins_paternal_uncle', logicType: 'RELATIONAL', keywords: ['اولاد عم', 'ابناء عم', 'بنات عم'] },
    { id: 'rel_cousins_paternal_aunt', logicType: 'RELATIONAL', keywords: ['اولاد عمة', 'ابناء عمة', 'بنات عمة'] },
    
    { id: 'rel_cousins_maternal_uncle', logicType: 'RELATIONAL', keywords: ['اولاد خال', 'ابناء خال', 'بنات خال'] },
    { id: 'rel_cousins_maternal_aunt', logicType: 'RELATIONAL', keywords: ['اولاد خالة', 'ابناء خالة', 'بنات خالة'] },
    
    // --- Location Indicators ---
    { id: 'loc_indicator', logicType: 'LOCATIONAL', keywords: ['في', 'من'] }
];
