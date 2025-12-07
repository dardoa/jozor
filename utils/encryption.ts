import CryptoJS from 'crypto-js';

// IMPORTANT: In a real application, this key should be securely managed,
// e.g., derived from a user's login, an environment variable, or a more complex mechanism.
// Hardcoding it here is for demonstration purposes only.
const SECRET_KEY = 'jozor-super-secret-key-123'; 

export const encryptData = (data: any): string => {
  try {
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    return ciphertext;
  } catch (e) {
    console.error("Encryption failed:", e);
    return JSON.stringify(data); // Fallback to unencrypted if encryption fails
  }
};

export const decryptData = (ciphertext: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (e) {
    console.error("Decryption failed:", e);
    // If decryption fails, it might be unencrypted data or corrupted data.
    // Attempt to parse as plain JSON as a fallback.
    try {
        return JSON.parse(ciphertext);
    } catch (parseError) {
        console.error("Fallback JSON parse also failed:", parseError);
        return null; // Return null if neither decryption nor plain parse works
    }
  }
};