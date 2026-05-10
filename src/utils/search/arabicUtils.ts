/**
 * Normalizes text (Arabic & English) for consistent searching.
 * Handles common variations like Alifs with Hamzas, Teh Marbuta, and English casing.
 */
export const normalizeArabic = (text: string): string => {
    if (!text) return '';
    
    return text
        .trim()
        .toLowerCase()
        // Alifs: آ، أ، إ -> ا
        .replace(/[أإآ]/g, 'ا')
        // Teh Marbuta: ة -> ه
        .replace(/ة/g, 'ه')
        // Alef Maksura: ى -> ي
        .replace(/ى/g, 'ي')
        // Waw with Hamza: ؤ -> و
        .replace(/ؤ/g, 'و')
        // Ya with Hamza: ئ -> ي
        .replace(/ئ/g, 'ي')
        // Remove Tatweel (Kashida)
        .replace(/\u0640/g, '')
        // Remove Tashkeel (diacritics)
        .replace(/[\u064B-\u065F]/g, '');
};

/**
 * Strips common Arabic prefixes like "Al-" (ال) for better name matching.
 */
export const stripArabicPrefixes = (text: string): string => {
    if (!text) return '';
    // Remove "ال" prefix if it exists at the start of a word
    return text.replace(/^ال/g, '').replace(/\sال/g, ' ');
};
