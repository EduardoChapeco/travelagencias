/**
 * Helper utilities to split large arrays or long text blocks into smaller chunks 
 * that fit within an A4 page without breaking midway.
 */

/**
 * Splits an array of items (like timeline days or service cards) into an array of pages.
 * @param items The items to paginate
 * @param itemsPerPage Maximum items allowed per page
 */
export function paginateArray<T>(items: T[], itemsPerPage: number): T[][] {
  if (!items || items.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
}

/**
 * Splits a long text string into an array of paragraphs or chunks that fit roughly into a character limit.
 * Real DOM height measurement is complex, so we use a safe character count heuristic for A4 pages.
 * An A4 page full of text fits roughly 2500-3000 chars comfortably.
 */
export function splitTextIntoPages(text: string | null | undefined, maxCharsPerPage = 2500): string[] {
  if (!text) return [];
  
  // Split by double line breaks (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  const pages: string[] = [];
  
  let currentPage = "";
  
  for (const p of paragraphs) {
    if ((currentPage.length + p.length) > maxCharsPerPage) {
      if (currentPage) {
        pages.push(currentPage.trim());
        currentPage = "";
      }
      
      // If a single paragraph is larger than maxCharsPerPage, we just push it anyway
      // to avoid breaking words, but this is a rare edge case.
      if (p.length > maxCharsPerPage) {
        pages.push(p.trim());
      } else {
        currentPage = p + "\n\n";
      }
    } else {
      currentPage += p + "\n\n";
    }
  }
  
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }
  
  return pages;
}
