# Library Web App

A small, focused web app to browse a library catalog, search books, and keep simple reading lists.

## Features

- Browse catalog and view book details
- Search by title, author, or genre (Open Library API)
- Personal lists: reading, plan-to-read (Local Storage)
- Library hours and simple floor plan
- Responsive layout

## Structure

```
library/
├─ assets/
│  ├─ css/
│  ├─ js/
│  ├─ images/
│  └─ data/
├─ index.html
├─ search.html
├─ my-books.html
└─ about.html
```

## Run

Option 1: open `index.html` directly in a browser.

Option 2 (recommended for API/local data): start a tiny server, then open the shown URL.

```powershell
python -m http.server 5500
# or
npx serve .
```

## Tech

- HTML, CSS, JavaScript
- Local Storage for lists
- Open Library API for search

