/**
 * Ensures a date string is compatible with Postgres DATE type (YYYY-MM-DD).
 * If the input is just a year (e.g., "1933"), it converts it to "1933-01-01".
 * If the input is invalid or empty, it returns null.
 */
export const formatDateForPostgres = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // Case 1: YYYY (4 digits)
    if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-01-01`;
    }

    // Case 2: YYYY-MM
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
        return `${trimmed}-01`;
    }

    // Case 3: YYYY-MM-DD (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    // Attempt to parse other formats?
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        // Check if it's a valid year range (not 1970 unintentional default)
        return parsed.toISOString().split('T')[0];
    }

    return null;
};
