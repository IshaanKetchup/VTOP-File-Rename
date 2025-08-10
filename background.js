let renameActive = false;
const downloadNameMap = new Map();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "setRenameActive") {
    renameActive = message.value;
    console.log("[background] renameActive set to", renameActive);
  }

  if (message.type === "download" && message.url && message.filename) {
    console.log("[background] Download request received with filename:", message.filename);
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      conflictAction: 'overwrite',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[background] Download error:', chrome.runtime.lastError);
      } else {
        console.log('[background] Download started ID:', downloadId);
        downloadNameMap.set(downloadId, message.filename);
      }
    });
  }
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  console.log("[background] Download detected:", downloadItem.filename, downloadItem.url, "renameActive:", renameActive);

  if (renameActive && downloadItem.url.startsWith("blob:")) {
    const newName = downloadNameMap.get(downloadItem.id);
    if (newName) {
      console.log("[background] Suggesting rename to", newName);
      suggest({ filename: newName });
      downloadNameMap.delete(downloadItem.id);
      return;
    }
  }
  suggest();
});
