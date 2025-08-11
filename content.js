// Observe DOM and notify background about renameActive
let lastRenameActive = null;
function checkAndSetRenameFlag() {
  const exists = !!document.getElementById('CoursePageLectureDetail') || !!document.getElementById('materialTable_wrapper');
  if (exists !== lastRenameActive) {
    lastRenameActive = exists;
    console.log("[content] renameActive changed to", exists);
    chrome.runtime.sendMessage({ type: 'setRenameActive', value: exists });
  }
}
checkAndSetRenameFlag();
const observer = new MutationObserver(checkAndSetRenameFlag);
observer.observe(document.body, { childList: true, subtree: true });

// Utility to get extension from MIME type
function getExtension(mime) {
  const map = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
  };
  return map[mime] || '';
}

// Sanitize filename to remove illegal chars and whitespace
function sanitizeFilename(name) {
  return name
    .replace(/[\r\n\t]+/g, ' ')        // Replace newlines/tabs with space
    .replace(/[\/\\?%*:|"<>]/g, '')    // Remove illegal characters
    .replace(/\s+/g, ' ')               // Collapse multiple spaces
    .trim();
}

document.addEventListener('click', async (e) => {
  const firstPageBtn = e.target.closest('button#getDownloadSemPdf2');
  const secondPageBtn = e.target.closest('button#downloadmat');
  if (!firstPageBtn && !secondPageBtn) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  if (firstPageBtn) {
    // First page logic
    const row = firstPageBtn.closest('tr');
    if (!row) return console.error('[content] No table row found for download button');

    const cells = row.querySelectorAll('td');

    chrome.storage.sync.get(['renameColumnIndex'], async ({ renameColumnIndex }) => {
      const colIndex = (typeof renameColumnIndex === 'number') ? renameColumnIndex : 3;
      const topicContentCell = cells[colIndex];
      const rawTopicText = topicContentCell ? topicContentCell.textContent : "Downloaded";
      const topicText = sanitizeFilename(rawTopicText);

      try {
        const pageResponse = await fetch(window.location.href, { credentials: 'include' });
        if (!pageResponse.ok) throw new Error('Failed to fetch page');

        const pageText = await pageResponse.text();

        const csrfMatch = pageText.match(/var\s+csrfValue\s*=\s*"([^"]+)"/);
        const idMatch = pageText.match(/var\s+id\s*=\s*"([^"]+)"/);
        if (!csrfMatch || !idMatch) throw new Error('CSRF token or authorizedID not found');

        const csrfToken = csrfMatch[1];
        const authorizedID = idMatch[1];

        const formData = new URLSearchParams();
        formData.append('_csrf', csrfToken);
        formData.append('authorizedID', authorizedID);
        formData.append('semSubId', firstPageBtn.dataset.semid);
        formData.append('classId', firstPageBtn.dataset.clsid);
        formData.append('materialId', firstPageBtn.dataset.matid);
        formData.append('materialDate', firstPageBtn.dataset.mdate);

        const response = await fetch('https://vtop.vit.ac.in/vtop/downloadPdf', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (!response.ok) throw new Error('Download request failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const extension = getExtension(blob.type);
        const filename = topicText + extension;

        console.log("[content] Sending download message", filename);
        chrome.runtime.sendMessage({ type: 'download', url, filename });

        setTimeout(() => URL.revokeObjectURL(url), 10000);

      } catch (err) {
        console.error('[content] Download failed:', err);
      }
    });

  } else if (secondPageBtn) {
    // Second page logic
    const row = secondPageBtn.closest('tr');
    if (!row) return console.error('[content] No table row found for download button');

    const cells = row.querySelectorAll('td');

    chrome.storage.sync.get(['renameColumnIndex'], async ({ renameColumnIndex }) => {
      const colIndex = (typeof renameColumnIndex === 'number') ? renameColumnIndex : 2;
      const topicContentCell = cells[colIndex];
      const rawTopicText = topicContentCell ? topicContentCell.textContent : "Downloaded";
      const topicText = sanitizeFilename(rawTopicText);

      try {
        const pageResponse = await fetch(window.location.href, { credentials: 'include' });
        if (!pageResponse.ok) throw new Error('Failed to fetch page');

        const pageText = await pageResponse.text();

        const csrfMatch = pageText.match(/var\s+csrfValue\s*=\s*"([^"]+)"/);
        const idMatch = pageText.match(/var\s+id\s*=\s*"([^"]+)"/);
        if (!csrfMatch || !idMatch) throw new Error('CSRF token or authorizedID not found');

        const csrfToken = csrfMatch[1];
        const authorizedID = idMatch[1];

        const formData = new URLSearchParams();
        formData.append('_csrf', csrfToken);
        formData.append('authorizedID', authorizedID);
        formData.append('fileId', secondPageBtn.dataset.fileid);

        const response = await fetch('https://vtop.vit.ac.in/vtop/downloadCourseMaterialFacultyPdf', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (!response.ok) throw new Error('Download request failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const extension = getExtension(blob.type);
        const filename = topicText + extension;

        console.log("[content] Sending download message", filename);
        chrome.runtime.sendMessage({ type: 'download', url, filename });

        setTimeout(() => URL.revokeObjectURL(url), 10000);

      } catch (err) {
        console.error('[content] Download failed:', err);
      }
    });
  }
}, true);
