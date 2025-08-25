import './style.css'

// PUBLIC_INTERFACE
/**
 * Initialize the Personal Notes minimalistic web app.
 * Provides: List, Search, Create, Edit, Delete notes with REST backend integration.
 * Env:
 *  - VITE_API_BASE_URL: Base URL of backend API (e.g., http://localhost:8000)
 */
function initApp() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  // Build the base layout
  const app = document.querySelector('#app');
  app.innerHTML = `
    <header class="app-header">
      <div class="brand">
        <span class="brand-dot" aria-hidden="true"></span>
        <span class="brand-name">Personal Notes</span>
      </div>
      <div class="header-actions">
        <button id="newNoteBtn" class="btn btn-primary" title="New note">New</button>
      </div>
    </header>
    <main class="app-main">
      <aside class="sidebar">
        <div class="search-box">
          <input id="searchInput" type="search" placeholder="Search notes..." aria-label="Search notes" />
        </div>
        <ul id="notesList" class="notes-list" aria-label="Notes list"></ul>
      </aside>
      <section class="editor">
        <div class="editor-toolbar">
          <button id="saveBtn" class="btn btn-primary">Save</button>
          <button id="deleteBtn" class="btn btn-danger" disabled>Delete</button>
          <span id="statusText" class="status-text" role="status" aria-live="polite"></span>
        </div>
        <input id="titleInput" class="title-input" type="text" placeholder="Note title" />
        <textarea id="contentInput" class="content-input" placeholder="Write your note here..."></textarea>
      </section>
    </main>
    <footer class="app-footer">
      <small>Minimalistic notes · Light theme</small>
    </footer>
  `;

  // Elements
  const notesListEl = document.getElementById('notesList');
  const searchInputEl = document.getElementById('searchInput');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  const statusText = document.getElementById('statusText');

  // Local state
  let notes = [];
  let filteredNotes = [];
  let selectedId = null;
  let isSaving = false;

  // Utilities
  function setStatus(message, type = 'info') {
    statusText.textContent = message || '';
    statusText.dataset.type = type;
    if (message) {
      // auto clear after delay
      setTimeout(() => {
        if (statusText.textContent === message) {
          statusText.textContent = '';
        }
      }, 2500);
    }
  }

  function getApiUrl(path) {
    // Ensure no double slashes
    if (!API_BASE_URL) return path;
    return `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  // API calls
  async function apiListNotes(query = '') {
    const url = new URL(getApiUrl('/notes'));
    if (query) url.searchParams.set('q', query);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
    return await res.json();
  }

  async function apiCreateNote(note) {
    const res = await fetch(getApiUrl('/notes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(`Failed to create note: ${res.status}`);
    return await res.json();
  }

  async function apiUpdateNote(id, note) {
    const res = await fetch(getApiUrl(`/notes/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(`Failed to update note: ${res.status}`);
    return await res.json();
  }

  async function apiDeleteNote(id) {
    const res = await fetch(getApiUrl(`/notes/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete note: ${res.status}`);
    return true;
  }

  // Rendering
  function renderList() {
    const list = filteredNotes.length ? filteredNotes : notes;
    notesListEl.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'notes-empty';
      li.textContent = 'No notes';
      notesListEl.appendChild(li);
      return;
    }
    list.forEach(n => {
      const li = document.createElement('li');
      li.className = 'note-item' + (n.id === selectedId ? ' selected' : '');
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.dataset.id = String(n.id);
      const title = n.title?.trim() || 'Untitled';
      const preview = (n.content || '').replace(/\n/g, ' ').slice(0, 80);
      li.innerHTML = `
        <div class="note-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="note-preview">${escapeHtml(preview)}</div>
      `;
      li.addEventListener('click', () => selectNote(n.id));
      li.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectNote(n.id);
          e.preventDefault();
        }
      });
      notesListEl.appendChild(li);
    });
  }

  function renderEditor(note) {
    titleInput.value = note?.title || '';
    contentInput.value = note?.content || '';
    deleteBtn.disabled = !note || !note.id;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[m]);
  }

  // State ops
  function selectNote(id) {
    selectedId = id;
    const note = notes.find(n => n.id === id);
    renderEditor(note || { title: '', content: '' });
    renderList();
  }

  function newNote() {
    selectedId = null;
    renderEditor({ title: '', content: '' });
    renderList();
    titleInput.focus();
  }

  function applySearch() {
    const q = searchInputEl.value.trim().toLowerCase();
    if (!q) {
      filteredNotes = [];
    } else {
      filteredNotes = notes.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
      );
    }
    renderList();
  }

  // Actions
  async function saveCurrent() {
    if (isSaving) return;
    const payload = {
      title: titleInput.value.trim(),
      content: contentInput.value,
    };
    try {
      isSaving = true;
      setStatus('Saving...', 'info');
      if (!selectedId) {
        const created = await apiCreateNote(payload);
        // optimistic: add to list and select
        notes.unshift(created);
        selectedId = created.id;
      } else {
        const updated = await apiUpdateNote(selectedId, payload);
        const idx = notes.findIndex(n => n.id === selectedId);
        if (idx >= 0) notes[idx] = updated;
      }
      setStatus('Saved', 'success');
      applySearch();
      renderList();
    } catch (e) {
      console.error(e);
      setStatus('Error saving note', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function deleteCurrent() {
    if (!selectedId) return;
    const id = selectedId;
    try {
      setStatus('Deleting...', 'info');
      await apiDeleteNote(id);
      notes = notes.filter(n => n.id !== id);
      selectedId = null;
      renderEditor({ title: '', content: '' });
      setStatus('Deleted', 'success');
      applySearch();
      renderList();
    } catch (e) {
      console.error(e);
      setStatus('Error deleting note', 'error');
    }
  }

  // Event listeners
  newNoteBtn.addEventListener('click', newNote);
  saveBtn.addEventListener('click', saveCurrent);
  deleteBtn.addEventListener('click', deleteCurrent);

  // Save with Cmd/Ctrl+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveCurrent();
    }
  });

  // Search debounce
  let searchTimer = null;
  searchInputEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 200);
  });

  // Load initial notes
  (async () => {
    try {
      setStatus('Loading...', 'info');
      notes = await apiListNotes('');
      setStatus('');
      renderList();
      if (notes.length) {
        selectNote(notes[0].id);
      } else {
        newNote();
      }
    } catch (e) {
      console.error(e);
      setStatus('Failed to load notes', 'error');
      renderList();
      newNote();
    }
  })();
}

initApp();
