document.addEventListener('DOMContentLoaded', () => {
    // Get the URL search parameters
    const params = new URLSearchParams(window.location.search);
    
    // Get the 'url' (file link) and 'folderId' parameters
    const fileUrl = params.get('url');
    const folderId = params.get('folderId'); 

    // 1. Set the individual file link
    if (fileUrl) {
        const driveLink = document.getElementById('driveLink');
        driveLink.href = decodeURIComponent(fileUrl);
    }

    // 2. Set the folder link using the retrieved folder ID
    if (folderId) {
        const folderLink = document.getElementById('folderLink');
        // Construct the URL to open the specific folder view in Google Drive
        folderLink.href = `https://drive.google.com/drive/folders/${folderId}`;
    }
});
