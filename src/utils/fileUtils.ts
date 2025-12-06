export const downloadFile = (
  content: string | Blob,
  filename: string,
  type: string,
  onComplete?: () => void // Callback to close menu or perform other actions
) => {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (onComplete) onComplete();
  }, 1000);
};