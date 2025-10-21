/**
 * Utility functions for social sharing and link copying
 */

/**
 * Share content to social media platforms
 * @param {string} platform - The platform to share to (facebook, twitter, whatsapp, linkedin)
 * @param {string} url - The URL to share
 * @param {string} title - The title/text to share
 */
export function shareToSocial(platform, url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    };
    
    const shareUrl = shareUrls[platform];
    if (!shareUrl) {
        console.error('Platform not supported:', platform);
        return;
    }
    
    // Open share window
    const width = 600;
    const height = 500;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
        shareUrl,
        `share-${platform}`,
        `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
    );
}

/**
 * Copy URL to clipboard
 * @param {string} url - The URL to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(url) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            // Modern clipboard API
            await navigator.clipboard.writeText(url);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            textArea.remove();
            
            return successful;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Show temporary success message
 * @param {string} message - The message to show
 */
export function showCopySuccess(message = 'Link copiato!') {
    // Check if toast already exists
    let toast = document.getElementById('copy-toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copy-toast';
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '11';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header bg-success text-white">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong class="me-auto">Successo</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

