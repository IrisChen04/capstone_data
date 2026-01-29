let annotationData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let totalPages = 1;
let editMode = false;
let editedItems = new Map();
let addedAnnotations = new Map();
let currentJsonFile = '';

const attitudeTypes = {
  'none': [],
  'affect': ['happiness', 'inclination', 'insecurity', 'satisfaction', 'security'],
  'appreciation': ['composition', 'reaction', 'valuation'],
  'judgement': ['capacity', 'propriety', 'tenacity', 'veracity']
};

const polarityOptions = ['positive', 'negative', 'neutral'];

async function loadData(jsonFile) {
currentJsonFile = jsonFile;
try {
  const response = await fetch(jsonFile);
  annotationData = await response.json();
  const companies = [...new Set(annotationData.map(item => item.company))].filter(c => c && c !== 'N/A').sort();
  const companyFilter = document.getElementById('companyFilter');
  companies.forEach(company => {
    const option = document.createElement('option');
    option.value = company;
    option.textContent = company;
    companyFilter.appendChild(option);
  });
  if (annotationData.length > 0) {
    const dates = annotationData.map(item => new Date(item.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    document.getElementById('dateFrom').value = minDate.toISOString().split('T')[0];
    document.getElementById('dateTo').value = maxDate.toISOString().split('T')[0];
  }
  updateDisplay();
} catch (error) {
  document.getElementById('contentArea').innerHTML = '<div class="no-results">Error loading data.</div>';
  console.error('Error:', error);
}
}

function toggleEditMode() {
editMode = !editMode;
const banner = document.getElementById('editModeBanner');
const btn = document.querySelector('.btn-toggle-edit');
if (editMode) {
  banner.classList.add('active');
  btn.textContent = 'Disable Edit Mode';
  btn.style.backgroundColor = '#dc3545';
} else {
  banner.classList.remove('active');
  btn.textContent = 'Enable Edit Mode';
  btn.style.backgroundColor = '#ffc107';
}
updateDisplay();
}

function editItem(id) {
const form = document.getElementById(`edit-form-${id}`);
const viewMode = document.getElementById(`view-mode-${id}`);
if (form && viewMode) {
  form.classList.add('active');
  viewMode.style.display = 'none';
  updateAddedAnnotationsList(id);
}
}

function cancelEdit(id) {
const form = document.getElementById(`edit-form-${id}`);
const viewMode = document.getElementById(`view-mode-${id}`);
if (form && viewMode) {
  form.classList.remove('active');
  viewMode.style.display = 'block';
}
}

function addNewAnnotation(id) {
const newAttType = document.getElementById(`new-type-${id}`).value;
const newAttSubtype = document.getElementById(`new-subtype-${id}`).value;
const newAttPolarity = document.getElementById(`new-polarity-${id}`).value;
const newMatchedText = document.getElementById(`new-matched-${id}`).value.trim();

if (!newMatchedText) {
  alert('Please enter matched text for the new annotation');
  return;
}

const itemIndex = annotationData.findIndex(item => item.id === id);
if (itemIndex !== -1) {
  const originalItem = annotationData[itemIndex];
  
  if (!addedAnnotations.has(id)) {
    addedAnnotations.set(id, []);
  }
  
  const newAnnotation = {
    attitudeType: newAttType,
    attitudeSubtype: newAttSubtype,
    attitudePolarity: newAttPolarity,
    matchedText: newMatchedText,
    parentId: id,
    title: originalItem.title,
    date: originalItem.date,
    journal: originalItem.journal,
    company: originalItem.company,
    region: originalItem.region,
    sentence: originalItem.sentenceRaw,
    sentenceRaw: originalItem.sentenceRaw
  };
  
  addedAnnotations.get(id).push(newAnnotation);
  
  document.getElementById(`new-matched-${id}`).value = '';
  document.getElementById(`new-type-${id}`).value = 'affect';
  updateSubtypeOptions(`new-type-${id}`, `new-subtype-${id}`);
  document.getElementById(`new-polarity-${id}`).value = 'positive';
  
  updateAddedAnnotationsList(id);
  updateChangesCount();
}
}

function removeAddedAnnotation(id, index) {
if (addedAnnotations.has(id)) {
  addedAnnotations.get(id).splice(index, 1);
  if (addedAnnotations.get(id).length === 0) {
    addedAnnotations.delete(id);
  }
  updateAddedAnnotationsList(id);
  updateChangesCount();
}
}

function updateAddedAnnotationsList(id) {
const container = document.getElementById(`added-annotations-${id}`);
if (!container) return;

if (!addedAnnotations.has(id) || addedAnnotations.get(id).length === 0) {
  container.innerHTML = '<div class="no-added-annotations">No additional annotations added yet</div>';
  return;
}

let html = '<div class="added-annotations-title">Additional Annotations:</div>';
addedAnnotations.get(id).forEach((ann, index) => {
  html += `
    <div class="added-annotation-item">
      <div class="added-annotation-content">
        <strong>${ann.attitudeType}</strong> → ${ann.attitudeSubtype} → ${ann.attitudePolarity}<br>
        <span class="added-annotation-text">Matched: "${ann.matchedText}"</span>
      </div>
      <button class="btn-remove-annotation" onclick="removeAddedAnnotation(${id}, ${index})">Remove</button>
    </div>
  `;
});
container.innerHTML = html;
}

function updateChangesCount() {
const totalChanges = editedItems.size + addedAnnotations.size;
document.getElementById('changesCount').textContent = `${totalChanges} change${totalChanges !== 1 ? 's' : ''} made`;
}

function saveEdit(id) {
const attType = document.getElementById(`edit-type-${id}`).value;
const attSubtype = document.getElementById(`edit-subtype-${id}`).value;
const attPolarity = document.getElementById(`edit-polarity-${id}`).value;
const matchedText = document.getElementById(`edit-matched-${id}`).value;
const newSentence = document.getElementById(`edit-sentence-${id}`).value.trim();

const itemIndex = annotationData.findIndex(item => item.id === id);
if (itemIndex !== -1) {
  const originalItem = {...annotationData[itemIndex]};
  
  annotationData[itemIndex].attitudeType = attType;
  annotationData[itemIndex].attitudeSubtype = attSubtype;
  annotationData[itemIndex].attitudePolarity = attPolarity;
  annotationData[itemIndex].matchedText = matchedText;
  
  if (newSentence !== '') {
    annotationData[itemIndex].sentenceRaw = newSentence;
    annotationData[itemIndex].sentence = newSentence;
  }
  
  editedItems.set(id, {
    original: originalItem, 
    edited: {...annotationData[itemIndex]},
    sentenceChanged: newSentence !== ''
  });
  
  updateChangesCount();
}
cancelEdit(id);
updateDisplay();
}

function downloadCorrections() {
if (editedItems.size === 0 && addedAnnotations.size === 0) {
  alert('No changes to download!');
  return;
}

let csv = 'Change_Type,ID,Original_Type,Original_Subtype,Original_Polarity,Original_MatchedText,Original_Sentence,New_Type,New_Subtype,New_Polarity,New_MatchedText,New_Sentence,Sentence_Changed,Title,Date,Company,Journal\n';

editedItems.forEach((change, id) => {
  const orig = change.original;
  const edit = change.edited;
  const title = (edit.title || '').replace(/"/g, '""');
  const company = (edit.company || '').replace(/"/g, '""');
  const journal = (edit.journal || '').replace(/"/g, '""');
  const origSentence = (orig.sentenceRaw || '').replace(/"/g, '""');
  const newSentence = (edit.sentenceRaw || '').replace(/"/g, '""');
  const sentenceChanged = change.sentenceChanged ? 'YES' : 'NO';
  csv += `EDIT,${id},"${orig.attitudeType}","${orig.attitudeSubtype}","${orig.attitudePolarity}","${orig.matchedText}","${origSentence}","${edit.attitudeType}","${edit.attitudeSubtype}","${edit.attitudePolarity}","${edit.matchedText}","${newSentence}","${sentenceChanged}","${title}","${edit.date}","${company}","${journal}"\n`;
});

addedAnnotations.forEach((annotations, parentId) => {
  const parentItem = annotationData.find(item => item.id === parentId);
  if (parentItem) {
    annotations.forEach(ann => {
      const title = (ann.title || '').replace(/"/g, '""');
      const company = (ann.company || '').replace(/"/g, '""');
      const journal = (ann.journal || '').replace(/"/g, '""');
      const sentence = (ann.sentenceRaw || '').replace(/"/g, '""');
      csv += `ADD,${parentId},"","","","","${sentence}","${ann.attitudeType}","${ann.attitudeSubtype}","${ann.attitudePolarity}","${ann.matchedText}","","NO","${title}","${ann.date}","${company}","${journal}"\n`;
    });
  }
});

const blob = new Blob([csv], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `corrections_${new Date().toISOString().split('T')[0]}.csv`;
a.click();
window.URL.revokeObjectURL(url);
}

function downloadJSON() {
  if (editedItems.size === 0 && addedAnnotations.size === 0) {
    alert('No changes to download!');
    return;
  }

  // 只导出被修改的数据
  const modifiedData = [];
  editedItems.forEach((change, id) => {
    modifiedData.push({
      id: id,
      original: change.original,
      edited: change.edited,
      sentenceChanged: change.sentenceChanged
    });
  });

  // 导出新增的注释
  const addedData = Array.from(addedAnnotations.entries()).map(([id, annotations]) => ({
    parentId: id,
    annotations: annotations
  }));

  const exportData = {
    exportDate: new Date().toISOString(),
    summary: {
      totalEdits: editedItems.size,
      totalAdditions: Array.from(addedAnnotations.values()).reduce((sum, arr) => sum + arr.length, 0)
    },
    modifiedData: modifiedData,
    addedAnnotations: addedData
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const pageName = currentJsonFile.split('/').pop().replace('.json', '');
  a.download = `corrections_${pageName}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}

function updateSubtypeOptions(typeSelectId, subtypeSelectId) {
const typeSelect = document.getElementById(typeSelectId);
const subtypeSelect = document.getElementById(subtypeSelectId);
const selectedType = typeSelect.value;
subtypeSelect.innerHTML = '';
if (selectedType === 'none') {
  const option = document.createElement('option');
  option.value = 'none';
  option.textContent = 'None';
  subtypeSelect.appendChild(option);
} else if (attitudeTypes[selectedType]) {
  attitudeTypes[selectedType].forEach(subtype => {
    const option = document.createElement('option');
    option.value = subtype;
    option.textContent = subtype.charAt(0).toUpperCase() + subtype.slice(1);
    subtypeSelect.appendChild(option);
  });
}
}

document.getElementById('groupBySelect').addEventListener('change', () => { currentPage = 1; updateDisplay(); });
document.getElementById('sortBySelect').addEventListener('change', updateDisplay);
document.getElementById('dateFrom').addEventListener('change', () => { currentPage = 1; updateDisplay(); });
document.getElementById('dateTo').addEventListener('change', () => { currentPage = 1; updateDisplay(); });
document.getElementById('companyFilter').addEventListener('change', () => { currentPage = 1; updateDisplay(); });
document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') applySearch(); });

function applySearch() { currentPage = 1; updateDisplay(); }
function changePageSize() { pageSize = parseInt(document.getElementById('pageSizeSelect').value); currentPage = 1; updateDisplay(); }
function goToPage(page) { if (page < 1 || page > totalPages) return; currentPage = page; updateDisplay(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function updateDisplay() {
const groupBy = document.getElementById('groupBySelect').value;
const sortBy = document.getElementById('sortBySelect').value;
const dateFrom = new Date(document.getElementById('dateFrom').value);
const dateTo = new Date(document.getElementById('dateTo').value);
dateTo.setHours(23, 59, 59, 999);
const companyFilter = document.getElementById('companyFilter').value;
const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
filteredData = annotationData.filter(item => {
  const itemDate = new Date(item.date);
  const dateMatch = itemDate >= dateFrom && itemDate <= dateTo;
  const companyMatch = companyFilter === 'all' || item.company === companyFilter;
  let searchMatch = true;
  if (searchText) {
    searchMatch = (item.matchedText && item.matchedText.toLowerCase().includes(searchText)) ||
                  (item.title && item.title.toLowerCase().includes(searchText)) ||
                  (item.sentence && item.sentence.toLowerCase().includes(searchText));
  }
  return dateMatch && companyMatch && searchMatch;
});
filteredData.sort((a, b) => {
  switch(sortBy) {
    case 'date-desc': return new Date(b.date) - new Date(a.date);
    case 'date-asc': return new Date(a.date) - new Date(b.date);
    case 'score-desc': return b.sentimentScore - a.sentimentScore;
    case 'score-asc': return a.sentimentScore - b.sentimentScore;
    default: return 0;
  }
});
document.getElementById('totalCount').textContent = annotationData.length;
document.getElementById('filteredCount').textContent = filteredData.length;
if (filteredData.length > 0) {
  const dates = filteredData.map(item => new Date(item.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  document.getElementById('dateRange').textContent = minDate.toLocaleDateString() + ' - ' + maxDate.toLocaleDateString();
}
totalPages = Math.ceil(filteredData.length / pageSize);
if (currentPage > totalPages) currentPage = totalPages || 1;
const startIdx = (currentPage - 1) * pageSize;
const endIdx = Math.min(startIdx + pageSize, filteredData.length);
const pageData = filteredData.slice(startIdx, endIdx);
document.getElementById('displayedCount').textContent = pageData.length;
document.getElementById('currentPageDisplay').textContent = currentPage;
document.getElementById('currentPageDisplay2').textContent = currentPage;
document.getElementById('totalPagesDisplay').textContent = totalPages;
document.getElementById('totalPagesDisplay2').textContent = totalPages;
document.getElementById('firstPageBtn').disabled = currentPage === 1;
document.getElementById('prevPageBtn').disabled = currentPage === 1;
document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
generatePageNumbers();
const contentArea = document.getElementById('contentArea');
if (filteredData.length === 0) {
  contentArea.innerHTML = '<div class="no-results">No entries match the selected filters.</div>';
  return;
}
if (groupBy === 'none') renderUngrouped(contentArea, pageData);
else if (groupBy === 'company') renderGroupedByCompany(contentArea, pageData);
else if (groupBy === 'word') renderGroupedByWord(contentArea, pageData);
}

function generatePageNumbers() {
const pageNumbers = document.getElementById('pageNumbers');
pageNumbers.innerHTML = '';
const maxButtons = 5;
let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
let endPage = Math.min(totalPages, startPage + maxButtons - 1);
if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);
for (let i = startPage; i <= endPage; i++) {
  const btn = document.createElement('button');
  btn.className = 'page-button' + (i === currentPage ? ' active' : '');
  btn.textContent = i;
  btn.onclick = () => goToPage(i);
  pageNumbers.appendChild(btn);
}
}

function renderUngrouped(container, data) {
let html = '<div class="group-section"><div class="group-header"><span>All Entries</span></div>';
data.forEach(item => { html += createAnnotationCard(item); });
html += '</div>';
container.innerHTML = html;
}

function renderGroupedByCompany(container, data) {
const grouped = {};
data.forEach(item => {
  if (!grouped[item.company]) grouped[item.company] = [];
  grouped[item.company].push(item);
});
let html = '';
Object.keys(grouped).sort().forEach(company => {
  html += `<div class="group-section"><div class="group-header"><span>${company}</span><span class="group-count">(${grouped[company].length} ${grouped[company].length === 1 ? 'entry' : 'entries'})</span></div>`;
  grouped[company].forEach(item => { html += createAnnotationCard(item); });
  html += '</div>';
});
container.innerHTML = html;
}

function renderGroupedByWord(container, data) {
const grouped = {};
data.forEach(item => {
  const word = item.matchedText || 'N/A';
  if (!grouped[word]) grouped[word] = [];
  grouped[word].push(item);
});
let html = '';
Object.keys(grouped).sort().forEach(word => {
  html += `<div class="group-section"><div class="group-header"><span>Matched Word: "${word}"</span><span class="group-count">(${grouped[word].length} ${grouped[word].length === 1 ? 'entry' : 'entries'})</span></div>`;
  grouped[word].forEach(item => { html += createAnnotationCard(item); });
  html += '</div>';
});
container.innerHTML = html;
}

function createAnnotationCard(item) {
const isEdited = editedItems.has(item.id);
const hasAddedAnnotations = addedAnnotations.has(item.id);
const isNoAttitude = !item.attitudeType || item.attitudeType === '' || item.attitudeType === 'nan';
const editedClass = isEdited ? 'edited' : '';
const noAttitudeClass = isNoAttitude ? 'no-attitude' : '';
const addedClass = hasAddedAnnotations ? 'has-additions' : '';

let typeOptionsHtml = '';
Object.keys(attitudeTypes).forEach(type => {
  const selected = type === item.attitudeType ? 'selected' : '';
  const displayName = type === 'none' ? 'None (No Attitude)' : type.charAt(0).toUpperCase() + type.slice(1);
  typeOptionsHtml += `<option value="${type}" ${selected}>${displayName}</option>`;
});

let subtypeOptionsHtml = '';
if (item.attitudeType === 'none' || !item.attitudeType || item.attitudeType === 'nan') {
  subtypeOptionsHtml = '<option value="none">None</option>';
} else if (attitudeTypes[item.attitudeType]) {
  attitudeTypes[item.attitudeType].forEach(subtype => {
    const selected = subtype === item.attitudeSubtype ? 'selected' : '';
    subtypeOptionsHtml += `<option value="${subtype}" ${selected}>${subtype.charAt(0).toUpperCase() + subtype.slice(1)}</option>`;
  });
}

let polarityOptionsHtml = '';
polarityOptions.forEach(pol => {
  const selected = pol === item.attitudePolarity ? 'selected' : '';
  polarityOptionsHtml += `<option value="${pol}" ${selected}>${pol.charAt(0).toUpperCase() + pol.slice(1)}</option>`;
});

let newTypeOptionsHtml = '';
Object.keys(attitudeTypes).forEach(type => {
  const displayName = type === 'none' ? 'None (No Attitude)' : type.charAt(0).toUpperCase() + type.slice(1);
  newTypeOptionsHtml += `<option value="${type}">${displayName}</option>`;
});

let newSubtypeOptionsHtml = '';
attitudeTypes['affect'].forEach(subtype => {
  newSubtypeOptionsHtml += `<option value="${subtype}">${subtype.charAt(0).toUpperCase() + subtype.slice(1)}</option>`;
});

let newPolarityOptionsHtml = '';
polarityOptions.forEach(pol => {
  newPolarityOptionsHtml += `<option value="${pol}">${pol.charAt(0).toUpperCase() + pol.slice(1)}</option>`;
});

const editButton = editMode ? `<button class="btn-edit" onclick="editItem(${item.id})">Edit</button>` : '';
const attitudeDisplay = isNoAttitude ? '<span class="no-attitude-badge">NO ATTITUDE FOUND</span>' : `<div class="meta-item"><span class="meta-label">Type:</span><span class="meta-value">${item.attitudeType || 'N/A'}</span></div><div class="meta-item"><span class="meta-label">Subtype:</span><span class="meta-value">${item.attitudeSubtype || 'N/A'}</span></div><div class="meta-item"><span class="meta-label">Polarity:</span><span class="meta-value">${item.attitudePolarity || 'N/A'}</span></div>`;

return `<div class="annotation-card ${editedClass} ${noAttitudeClass} ${addedClass}">
  <div class="edit-form" id="edit-form-${item.id}">
    <div class="edit-header">
      <h3 style="color: #007bff; font-size: 14px; margin-bottom: 12px;">Editing Mode</h3>
    </div>
    
    <div class="edit-section">
      <div class="section-title">Current Attitude Annotation</div>
      <div class="edit-form-row">
        <div class="edit-form-group">
          <label class="edit-form-label">Attitude Type</label>
          <select class="edit-form-select" id="edit-type-${item.id}" onchange="updateSubtypeOptions('edit-type-${item.id}', 'edit-subtype-${item.id}')">
            ${typeOptionsHtml}
          </select>
        </div>
        <div class="edit-form-group">
          <label class="edit-form-label">Attitude Subtype</label>
          <select class="edit-form-select" id="edit-subtype-${item.id}">
            ${subtypeOptionsHtml}
          </select>
        </div>
        <div class="edit-form-group">
          <label class="edit-form-label">Polarity</label>
          <select class="edit-form-select" id="edit-polarity-${item.id}">
            ${polarityOptionsHtml}
          </select>
        </div>
      </div>
      <div class="edit-form-row">
        <div class="edit-form-group" style="grid-column: 1 / -1;">
          <label class="edit-form-label">Matched Text</label>
          <input type="text" class="edit-form-input" id="edit-matched-${item.id}" value="${item.matchedText || ''}" placeholder="Enter matched text...">
        </div>
      </div>
    </div>

    <div class="edit-section edit-section-add">
      <div class="section-title">Add Additional Annotation (for multiple appraisals in same sentence)</div>
      <div class="edit-form-row">
        <div class="edit-form-group">
          <label class="edit-form-label">Attitude Type</label>
          <select class="edit-form-select" id="new-type-${item.id}" onchange="updateSubtypeOptions('new-type-${item.id}', 'new-subtype-${item.id}')">
            ${newTypeOptionsHtml}
          </select>
        </div>
        <div class="edit-form-group">
          <label class="edit-form-label">Attitude Subtype</label>
          <select class="edit-form-select" id="new-subtype-${item.id}">
            ${newSubtypeOptionsHtml}
          </select>
        </div>
        <div class="edit-form-group">
          <label class="edit-form-label">Polarity</label>
          <select class="edit-form-select" id="new-polarity-${item.id}">
            ${newPolarityOptionsHtml}
          </select>
        </div>
      </div>
      <div class="edit-form-row">
        <div class="edit-form-group" style="grid-column: 1 / -1;">
          <label class="edit-form-label">Matched Text</label>
          <input type="text" class="edit-form-input" id="new-matched-${item.id}" placeholder="Enter matched text for new annotation...">
        </div>
      </div>
      <button class="btn-add-annotation" onclick="addNewAnnotation(${item.id})">Add Annotation</button>
      <div id="added-annotations-${item.id}" class="added-annotations-list">
        <div class="no-added-annotations">No additional annotations added yet</div>
      </div>
    </div>

    <div class="edit-section">
      <div class="section-title">Original Sentence (Read-only)</div>
      <div class="original-sentence-display">
        ${item.sentence || 'No sentence available'}
      </div>
    </div>

    <div class="edit-section">
      <div class="section-title">New Sentence (Optional - leave empty to keep original)</div>
      <div class="edit-form-row">
        <div class="edit-form-group" style="grid-column: 1 / -1;">
          <textarea class="edit-form-textarea" id="edit-sentence-${item.id}" placeholder="Enter new sentence here, or leave empty to keep the original sentence..."></textarea>
          <div class="input-hint">Tip: Only fill this if you want to change the sentence. Leave empty to keep original.</div>
        </div>
      </div>
    </div>

    <div class="edit-actions">
      <button class="btn-save" onclick="saveEdit(${item.id})">Save Changes</button>
      <button class="btn-cancel" onclick="cancelEdit(${item.id})">Cancel</button>
    </div>
  </div>

  <div id="view-mode-${item.id}">
    <div class="card-header">
      <div class="article-title">${item.title || 'Untitled'}</div>
      <div class="card-actions">
        ${editButton}
        <span class="sentiment-badge sentiment-${item.sentiment}">${item.sentiment} (${item.sentimentScore.toFixed(3)})</span>
      </div>
    </div>
    <div class="metadata">
      <div class="meta-item"><span class="meta-label">Date:</span><span class="meta-value">${item.date}</span></div>
      <div class="meta-item"><span class="meta-label">Journal:</span><span class="meta-value">${item.journal || 'N/A'}</span></div>
      <div class="meta-item"><span class="meta-label">Company:</span><span class="meta-value">${item.company}</span></div>
      ${item.region ? `<div class="meta-item"><span class="meta-label">Region:</span><span class="meta-value">${item.region}</span></div>` : ''}
    </div>
    <div class="metadata">
      ${attitudeDisplay}
    </div>
    <div class="sentence-content">${item.sentence || 'No sentence available'}</div>
    <div class="annotation-details">
      <div class="detail-item"><span class="detail-label">Matched Text:</span><span>${item.matchedText || 'N/A'}</span></div>
      <div class="detail-item"><span class="detail-label">Match Type:</span><span>${item.matchType || 'N/A'}</span></div>
      <div class="detail-item"><span class="detail-label">Matches:</span><span>${item.numMatches || 0}</span></div>
    </div>
  </div>
</div>`;
}