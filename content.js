// Observe DOM and notify background about renameActive
let lastRenameActive = null;
function checkAndSetRenameFlag() {
  const exists = !!document.getElementById('CoursePageLectureDetail');
  if (exists !== lastRenameActive) {
    lastRenameActive = exists;
    console.log("[content] renameActive changed to", exists);
    chrome.runtime.sendMessage({ type: 'setRenameActive', value: exists });
  }
}
checkAndSetRenameFlag();
const observer = new MutationObserver(checkAndSetRenameFlag);
observer.observe(document.body, { childList: true, subtree: true });

// Block native download and send renamed download
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button#getDownloadSemPdf2');
  if (!btn) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  const row = btn.closest('tr');
  if (!row) {
    console.error('[content] No table row found for download button');
    return;
  }

  const cells = row.querySelectorAll('td');
  const topicContentCell = cells[3];  // Adjust index if needed
  const topicText = topicContentCell ? topicContentCell.textContent.trim() : "Downloaded";

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
    formData.append('semSubId', btn.dataset.semid);
    formData.append('classId', btn.dataset.clsid);
    formData.append('materialId', btn.dataset.matid);
    formData.append('materialDate', btn.dataset.mdate);

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

    // Optional: revoke object URL after a delay to avoid issues
    setTimeout(() => URL.revokeObjectURL(url), 10000);

  } catch (err) {
    console.error('[content] Download failed:', err);
  }
}, true);  // Use capture phase to block native events earlier

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
