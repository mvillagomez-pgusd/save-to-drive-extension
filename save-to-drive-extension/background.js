// Function to find or create the 'office-file-downloads' folder.
// This ensures that if the user deletes the folder, it will be recreated
// on the next successful upload attempt.
async function getOrCreateFolderId(token) {
    const folderName = 'office-file-downloads';
    
    // Search query: Find a folder named 'office-file-downloads' in the root
    // that has NOT been trashed.
    const driveSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false&spaces=drive&fields=files(id)`;

    // 1. Search for the existing folder
    let response = await fetch(driveSearchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    let data = await response.json();

    if (data.files && data.files.length > 0) {
        // Folder found, return its ID
        console.log("Folder found:", data.files[0].id);
        return data.files[0].id;
    }

    // 2. Folder not found or was deleted, create a new one
    console.log("Folder not found. Creating a new 'office-file-downloads' folder.");
    const createFolderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
    };

    response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(createFolderMetadata)
    });
    data = await response.json();
    
    if (data.id) {
        console.log("Folder created:", data.id);
        return data.id;
    } else {
        console.error("Failed to create folder:", data);
        throw new Error("Failed to create folder");
    }
}

// Listen for any new download
chrome.downloads.onCreated.addListener(function(downloadItem) {
  
  // Ignore downloads that were already completed before the extension loaded, 
  // preventing processing of old files.
  if (downloadItem.state && downloadItem.state !== 'in_progress') {
    console.log(`NOTE: Ignoring download ${downloadItem.id}. State is not 'in_progress' (${downloadItem.state}).`);
    return;
  }
  
  // Ignore downloads originating from Google Drive itself to prevent an infinite loop.
  if (downloadItem.url.includes("docs.google.com") || downloadItem.url.includes("app.asapconnected.com") || downloadItem.url.includes("googleusercontent.com")) {
    console.log("NOTE: Ignoring download from Google to prevent loop.");
    return;
  }

  const targetMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword',                                                      // .doc
    //'application/pdf',                                                        // .pdf
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',      // .xlsx
    'application/vnd.ms-excel',                                                // .xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-powerpoint'                                           // .ppt
  ];

  if (targetMimeTypes.includes(downloadItem.mime)) {
    console.log(`SUCCESS: Target MIME type detected (${downloadItem.mime}). Attempting to save to Drive.`);
    
    // Immediately cancel the default Chrome download
    chrome.downloads.cancel(downloadItem.id);
    
    // Initiate the custom upload process
    uploadToDrive(downloadItem);
  }
});

// Main function to handle the upload
function uploadToDrive(downloadItem) {
  // Get OAuth token for Drive API access
  chrome.identity.getAuthToken({ interactive: true }, async function(token) {
    if (chrome.runtime.lastError || !token) {
      console.error("Could not get auth token:", chrome.runtime.lastError);
      return;
    }

    let folderId;
    try {
        // Get or create the folder ID. This ensures the folder exists.
        folderId = await getOrCreateFolderId(token);
    } catch (e) {
        console.error(e.message);
        return;
    }

    // Fetch the file contents as a blob using the download URL
    fetch(downloadItem.url)
      .then(response => response.blob())
      .then(blob => {
        const filename = downloadItem.filename || new URL(downloadItem.url).pathname.split('/').pop() || 'downloaded-file';
        
        // Metadata includes the target folder ID
        const metadata = {
          name: filename,
          mimeType: downloadItem.mime,
          parents: [folderId] // Specify the target folder
        };
        
        // Prepare multipart form data for the upload
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', blob);

        // Upload the file to Google Drive
        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            console.error("Drive API Error:", data.error.message);
          } else {
            console.log("File uploaded successfully:", data);
            
            // Open the success page with links to the file and folder
            const successPageUrl = chrome.runtime.getURL('success.html');
            const urlWithParams = `${successPageUrl}?url=${encodeURIComponent(data.webViewLink)}&folderId=${folderId}`; 
            
            chrome.tabs.create({ url: urlWithParams });
          }
        })
        .catch(error => console.error("Upload failed:", error));
      })
      .catch(error => console.error("Fetching file failed:", error));
  });
}
