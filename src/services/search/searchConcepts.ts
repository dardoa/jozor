export type SearchIntent =
    | 'children' | 'seniors' | 'females' | 'males' | 'deceased' | 'living'
    | 'rel_children' | 'rel_daughters' | 'rel_sons'
    | 'rel_grandchildren' | 'rel_granddaughters' | 'rel_grandsons'
    | 'rel_spouses' | 'rel_siblings'
    | 'rel_uncles_paternal' | 'rel_aunts_paternal'
    | 'rel_uncles_maternal' | 'rel_aunts_maternal'
    | 'rel_cousins_paternal_uncle' | 'rel_cousins_paternal_aunt'
    | 'rel_cousins_maternal_uncle' | 'rel_cousins_maternal_aunt'
    | 'rel_grandparents' | 'rel_grandmothers'
    | 'loc_indicator' | 'none';

export type LogicType = 'CATEGORICAL' | 'RELATIONAL' | 'LOCATIONAL';

export interface ConceptDefinition {
    id: SearchIntent;
    logicType: LogicType;
    keywords: string[];
}

export const SEARCH_CONCEPTS: ConceptDefinition[] = [
    { id: 'rel_spouses', logicType: 'RELATIONAL', keywords: ['مرت', 'مرته', 'مرا', 'مرة', 'مره', 'زوجة', 'زوج', 'جوز', 'جوزها', 'جوزة'] },
    { id: 'children', logicType: 'CATEGORICAL', keywords: ['أطفال', 'اطفال', 'اطفال صغار', 'بزارين', 'children', 'child', 'kids'] },
    { id: 'seniors', logicType: 'CATEGORICAL', keywords: ['مسنين', 'كبار السن', 'senior', 'seniors', 'elderly'] },
    { id: 'females', logicType: 'CATEGORICAL', keywords: ['نساء', 'اناث', 'إناث', 'حريم', 'بنات', 'female', 'females', 'women'] },
    { id: 'males', logicType: 'CATEGORICAL', keywords: ['رجال', 'ذكور', 'شباب', 'male', 'males', 'men'] },
    { id: 'deceased', logicType: 'CATEGORICAL', keywords: ['متوفين', 'متوفى', 'متوفاة', 'رحمهم الله', 'deceased', 'dead'] },
    { id: 'living', logicType: 'CATEGORICAL', keywords: ['احياء', 'أحياء', 'عايشين', 'living', 'alive'] },

    { id: 'rel_children', logicType: 'RELATIONAL', keywords: ['ابناء', 'أبناء', 'اولاد', 'أولاد', 'ذرية', 'ذريّة', 'افراد', 'أفراد', 'عيال', 'children of', 'family of', 'family'] },
    { id: 'rel_daughters', logicType: 'RELATIONAL', keywords: ['بنات', 'daughters of', 'daughters'] },
    { id: 'rel_sons', logicType: 'RELATIONAL', keywords: ['بنين', 'ابناء ذكور', 'أبناء ذكور', 'sons of', 'sons'] },

    { id: 'rel_grandchildren', logicType: 'RELATIONAL', keywords: ['احفاد', 'أحفاد', 'حفدة', 'grandchildren of', 'grandchildren'] },
    { id: 'rel_granddaughters', logicType: 'RELATIONAL', keywords: ['حفيدات', 'granddaughters of', 'granddaughters'] },
    { id: 'rel_grandsons', logicType: 'RELATIONAL', keywords: ['حفيد', 'أحفاد ذكور', 'grandsons of', 'grandsons'] },

    { id: 'rel_spouses', logicType: 'RELATIONAL', keywords: ['زوجات', 'ازواج', 'أزواج', 'نسوان', 'زوجة', 'زوج', 'جوز', 'جوزها', 'جوزة', 'spouses of', 'spouses', 'wife of', 'husband of'] },
    { id: 'rel_siblings', logicType: 'RELATIONAL', keywords: ['اخوة', 'إخوة', 'اخوان', 'خوان', 'اشقاء', 'أشقاء', 'siblings of', 'siblings'] },

    { id: 'rel_grandparents', logicType: 'RELATIONAL', keywords: ['أجداد', 'اجداد', 'جد', 'grandparents of', 'grandparents'] },
    { id: 'rel_grandmothers', logicType: 'RELATIONAL', keywords: ['جدات', 'جدة', 'جده', 'grandmothers of', 'grandmothers'] },

    { id: 'rel_uncles_paternal', logicType: 'RELATIONAL', keywords: ['اعمام', 'أعمام', 'عمام', 'عم', 'paternal uncles of'] },
    { id: 'rel_aunts_paternal', logicType: 'RELATIONAL', keywords: ['عمات', 'عمة', 'paternal aunts of'] },

    { id: 'rel_uncles_maternal', logicType: 'RELATIONAL', keywords: ['اخوال', 'أخوال', 'خوال', 'خال', 'maternal uncles of'] },
    { id: 'rel_aunts_maternal', logicType: 'RELATIONAL', keywords: ['خالات', 'خالة', 'maternal aunts of'] },

    { id: 'rel_cousins_paternal_uncle', logicType: 'RELATIONAL', keywords: ['اولاد عم', 'أولاد عم', 'ابناء عم', 'أبناء عم', 'بنات عم'] },
    { id: 'rel_cousins_paternal_aunt', logicType: 'RELATIONAL', keywords: ['اولاد عمة', 'أولاد عمة', 'ابناء عمة', 'أبناء عمة', 'بنات عمة'] },

    { id: 'rel_cousins_maternal_uncle', logicType: 'RELATIONAL', keywords: ['اولاد خال', 'أولاد خال', 'ابناء خال', 'أبناء خال', 'بنات خال'] },
    { id: 'rel_cousins_maternal_aunt', logicType: 'RELATIONAL', keywords: ['اولاد خالة', 'أولاد خالة', 'ابناء خالة', 'أبناء خالة', 'بنات خالة'] },

    { id: 'loc_indicator', logicType: 'LOCATIONAL', keywords: ['في', 'من', 'from', 'in'] }
];
