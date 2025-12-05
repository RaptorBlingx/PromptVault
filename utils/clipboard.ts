// ============================================
// Clipboard Utility
// ============================================

/**
 * Copies text to clipboard with fallback for non-secure contexts (HTTP)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;

    // Try the modern API first (works in secure contexts)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...', err);
        }
    }

    // Fallback for HTTP / older browsers
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Ensure it's not visible but part of the DOM
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Fallback copy failed:', err);
        return false;
    }
}
