document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('colIndex');
  const saveBtn = document.getElementById('saveBtn');

  chrome.storage.sync.get(['renameColumnIndex'], (result) => {
    if (typeof result.renameColumnIndex === 'number') {
      input.value = result.renameColumnIndex;
    }
  });

  saveBtn.addEventListener('click', () => {
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 0) {
      chrome.storage.sync.set({ renameColumnIndex: val }, () => {
        window.close();
      });
    } else {
      alert('Enter a valid non-negative integer');
    }
  });
});
