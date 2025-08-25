# personal-notes-manager-10295-10305

Frontend (notes_frontend)
- Stack: Vite, Vanilla JS, minimalistic light theme.
- Features: Create, Edit, Delete, List, Search notes.
- Layout: Header, left list, right editor.

Setup
1) cd personal-notes-manager-10295-10305/notes_frontend
2) Copy .env.example to .env and set VITE_API_BASE_URL to your backend URL (e.g., http://localhost:8000)
3) Install deps and run:
   - npm install
   - npm run dev

API expectations
- GET    /notes           -> returns [{ id, title, content }]
- POST   /notes           -> body { title, content } returns created { id, title, content }
- PUT    /notes/{id}      -> body { title, content } returns updated
- DELETE /notes/{id}      -> 204/200
Optional: GET /notes?q=search for server-side filtering.

Notes
- CORS must allow the frontend origin. You can omit VITE_API_BASE_URL to use relative paths (proxy or same-origin).