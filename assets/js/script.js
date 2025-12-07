// === Работа с LocalStorage ===
const Storage = {
    getReadBooks: () => JSON.parse(localStorage.getItem('readBooks') || '[]'),
    getPlanBooks: () => JSON.parse(localStorage.getItem('planBooks') || '[]'),
    
    addToReadBooks: (book) => {
        const readBooks = Storage.getReadBooks();
        if (readBooks.find(b => b.id === book.id)) return false;
        
        readBooks.push(book);
        localStorage.setItem('readBooks', JSON.stringify(readBooks));
        Storage.removeFromPlanBooks(book.id);
        return true;
    },
    
    addToPlanBooks: (book) => {
        const planBooks = Storage.getPlanBooks();
        if (planBooks.find(b => b.id === book.id)) return false;
        
        planBooks.push(book);
        localStorage.setItem('planBooks', JSON.stringify(planBooks));
        return true;
    },
    
    removeFromReadBooks: (bookId) => {
        const readBooks = Storage.getReadBooks().filter(b => b.id !== bookId);
        localStorage.setItem('readBooks', JSON.stringify(readBooks));
    },
    
    removeFromPlanBooks: (bookId) => {
        const planBooks = Storage.getPlanBooks().filter(b => b.id !== bookId);
        localStorage.setItem('planBooks', JSON.stringify(planBooks));
    },
    
    isInReadBooks: (bookId) => Storage.getReadBooks().some(b => b.id === bookId),
    isInPlanBooks: (bookId) => Storage.getPlanBooks().some(b => b.id === bookId)
};

// === Глобальные переменные ===
let booksCache = [];

// === Создание карточки книги ===
function createBookCard(book, showActions = true) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const isRead = Storage.isInReadBooks(book.id);
    const isInPlan = Storage.isInPlanBooks(book.id);
    
    // Кнопки действий
    let actionsHTML = '';
    if (showActions) {
        if (!isRead) {
            actionsHTML = `
                <button class="btn btn-primary btn-small" onclick='addToRead(${JSON.stringify(book.id)})'>
                    ${isInPlan ? 'Тапсырыс берілді ✓' : 'Тапсырыс беру'}
                </button>`;
            if (!isInPlan) {
                actionsHTML += `<button class="btn btn-secondary btn-small" onclick='addToPlan(${JSON.stringify(book.id)})'>Жоспарға</button>`;
            }
        } else {
            actionsHTML = '<button class="btn btn-small" style="background: #4CAF50; color: white;" disabled>тапсырыс берілді ✓</button>';
        }
    }
    
    // Обложка книги
    const coverHTML = book.coverUrl 
        ? `<img src="${book.coverUrl}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='📚';">`
        : (book.icon || '📚');
    
    card.innerHTML = `
        <div class="book-cover">${coverHTML}</div>
        <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-genre">${book.genre} • ${book.year}</div>
            ${actionsHTML ? `<div class="book-actions">${actionsHTML}</div>` : ''}
        </div>
    `;
    
    return card;
}

// === Действия с книгами ===
function addToRead(bookId) {
    const book = booksCache.find(b => b.id === bookId);
    if (book && Storage.addToReadBooks(book)) {
        showNotification('Кітап тізімге қосылды');
        reloadCurrentPage();
    }
}

function addToPlan(bookId) {
    const book = booksCache.find(b => b.id === bookId);
    if (book && Storage.addToPlanBooks(book)) {
        showNotification('Кітап жоспарға қосылды');
        reloadCurrentPage();
    }
}

function removeFromList(bookId, listType) {
    if (listType === 'read') {
        Storage.removeFromReadBooks(bookId);
    } else {
        Storage.removeFromPlanBooks(bookId);
    }
    showNotification('Кітап тізімнен жойылды');
    reloadCurrentPage();
}

function reloadCurrentPage() {
    if (window.location.pathname.includes('my-books.html')) {
        loadMyBooks();
    } else if (window.location.pathname.includes('search.html')) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            performSearch();
        } else {
            displayPopularBooksOnSearch();
        }
    }
}

// === Уведомления ===
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// === Страница поиска - инициализация ===
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const genreFilter = document.getElementById('genreFilter');

    if (!searchInput || !searchBtn) return;

    displayPopularBooksOnSearch();

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    if (genreFilter) {
        genreFilter.addEventListener('change', performSearch);
    }
}

// === Поиск книг ===
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    const grid = document.getElementById('booksGrid');
    const resultsCount = document.getElementById('resultsCount');
    const genreFilter = document.getElementById('genreFilter');
    
    if (!query) {
        displayPopularBooksOnSearch();
        return;
    }

    grid.innerHTML = '<div class="search-hint">Кітаптарды іздеу...</div>';
    resultsCount.textContent = '';
    
    try {
        const { books } = await searchBooksWithFallback(query, 40);
        
        // Фильтр по жанру
        const selectedGenre = genreFilter ? genreFilter.value : '';
        const filteredBooks = selectedGenre 
            ? books.filter(book => book.genre === selectedGenre)
            : books;

        displaySearchResults(filteredBooks);
    } catch (error) {
        console.error('Ошибка поиска:', error);
        grid.innerHTML = '<div class="search-hint">Іздеу қатесі. Кейінірек қайталап көріңіз.</div>';
    }
}

// === Отображение результатов поиска ===
function displaySearchResults(books) {
    const grid = document.getElementById('booksGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    booksCache = books;
    
    if (books.length === 0) {
        grid.innerHTML = '<div class="search-hint">Кітаптар табылмады. Басқа сөздерді қолданып көріңіз.</div>';
        resultsCount.textContent = '';
        return;
    }
    
    resultsCount.textContent = `Нәтижелер: ${books.length}`;
    resultsCount.style.color = 'white';
    
    grid.style.display = 'grid';
    grid.innerHTML = '';
    books.forEach(book => grid.appendChild(createBookCard(book)));
}

// === Популярные книги на странице поиска ===
async function displayPopularBooksOnSearch() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="search-hint">Танымал кітаптар жүктелуде...</div>';

    try {
        const popularBooks = await getPopularBooks(12);
        if (!popularBooks.length) return;

        booksCache = popularBooks;
        
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = 'Танымал кітаптар';
            resultsCount.style.color = 'white';
        }
        
        const resultsMeta = document.getElementById('resultsMeta');
        if (resultsMeta) {
            resultsMeta.textContent = 'Іздеуді бастау үшін кітаптың атын немесе авторды енгізіңіз';
            resultsMeta.style.color = 'rgba(255,255,255,0.9)';
        }

        grid.style.display = 'grid';
        grid.innerHTML = '';
        popularBooks.forEach(book => grid.appendChild(createBookCard(book)));
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        grid.innerHTML = '<div class="search-hint">Іздеуді бастау үшін кітаптың атын немесе авторды енгізіңіз.</div>';
    }
}

// === Страница "Мои книги" ===
function initMyBooks() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });
    
    loadMyBooks();
}

function loadMyBooks() {
    const readBooks = Storage.getReadBooks();
    const planBooks = Storage.getPlanBooks();
    
    // Статистика
    document.getElementById('readCount').textContent = readBooks.length;
    document.getElementById('planCount').textContent = planBooks.length;
    
    // Прочитанные книги
    displayBookList('readBooks', 'emptyRead', readBooks, 'read');
    
    // Книги в планах
    displayBookList('planBooks', 'emptyPlan', planBooks, 'plan');
}

function displayBookList(containerId, emptyId, books, listType) {
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyId);
    
    if (books.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    books.forEach(book => {
        const card = createBookCard(book, false);
        const bookInfo = card.querySelector('.book-info');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'book-actions';
        
        if (listType === 'plan') {
            const readBtn = document.createElement('button');
            readBtn.className = 'btn btn-primary btn-small';
            readBtn.textContent = 'Тапсырыс беру';
            readBtn.onclick = () => {
                booksCache = [book];
                addToRead(book.id);
            };
            actionsDiv.appendChild(readBtn);
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-secondary btn-small';
        removeBtn.textContent = 'Жою';
        removeBtn.onclick = () => removeFromList(book.id, listType);
        actionsDiv.appendChild(removeBtn);
        
        bookInfo.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

// === Инициализация при загрузке страницы ===
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('searchInput')) initSearch();
    if (document.querySelector('.my-books-section')) initMyBooks();
    initAuth();
});

// === Аутентификация (минимум логики для демо) ===
function initAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const authModal = document.getElementById('authModal');
    const authClose = document.getElementById('authClose');
    const authTabs = document.querySelectorAll('[data-auth-tab]');
    const authForms = document.querySelectorAll('[data-auth-form]');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const USERS_KEY = 'libUsers';
    const CURRENT_USER_KEY = 'libCurrentUser';

    if (!loginBtn || !authModal) return;

    const setMode = (mode) => {
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === mode));
        authForms.forEach(form => form.classList.toggle('active', form.dataset.authForm === mode));
    };

    const openModal = (mode = 'login') => {
        setMode(mode);
        authModal.classList.add('open');
        authModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        authModal.classList.remove('open');
        authModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        loginForm?.reset();
        registerForm?.reset();
    };

    const updateButton = () => {
        const currentUser = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUser) {
            loginBtn.textContent = currentUser;
            loginBtn.classList.add('btn-logged');
        } else {
            loginBtn.textContent = 'Кіру';
            loginBtn.classList.remove('btn-logged');
        }
    };

    updateButton();

    loginBtn.addEventListener('click', () => {
        const currentUser = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUser) {
            if (confirm('Шығу керек пе?')) {
                localStorage.removeItem(CURRENT_USER_KEY);
                updateButton();
                showNotification('Сіз жүйеден шықтыңыз');
            }
            return;
        }
        openModal('login');
    });

    authClose?.addEventListener('click', closeModal);
    authModal.addEventListener('click', (event) => {
        if (event.target === authModal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && authModal.classList.contains('open')) closeModal();
    });
    authTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.authTab)));

    loginForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('authLogin').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const match = users.find(user => user.username === username && user.password === password);
        if (!match) {
            showNotification('Қате логин немесе құпия сөз');
            return;
        }
        localStorage.setItem(CURRENT_USER_KEY, username);
        closeModal();
        updateButton();
        showNotification('Сәтті кірдіңіз');
    });

    registerForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('authRegLogin').value.trim();
        const password = document.getElementById('authRegPassword').value.trim();
        if (username.length < 3 || password.length < 4) {
            showNotification('Кемінде 3 таңбалы логин және 4 таңбалы құпия сөз');
            return;
        }
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        if (users.some(user => user.username === username)) {
            showNotification('Бұл логин қолданылып жатыр');
            return;
        }
        users.push({ username, password });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, username);
        closeModal();
        updateButton();
        showNotification('Тіркелу сәтті өтті');
    });
}
