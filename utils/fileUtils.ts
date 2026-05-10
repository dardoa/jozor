/**
 * Triggers a file download in the browser.
 * @param content The content of the file (string or Blob).
 * @param filename The name of the file to download.
 * @param type The MIME type of the file.
 * @param onComplete Optional callback properly typed to void.
 */
export const downloadFile = (
  content: string | Blob,
  filename: string,
  type: string,
  onComplete?: () => void
): void => {
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else if (typeof content === 'string' && content.startsWith('data:')) {
    // Detect and handle Data URLs (Base64 or encoded)
    blob = dataURLtoBlob(content);
  } else {
    // Standard text content
    blob = new Blob([content], { type });
  }

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);

  document.body.appendChild(link);
  link.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onComplete) onComplete();
  }, 100);
};

/**
 * Helper to convert Data URL to Blob
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return new Blob([dataurl]);

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
