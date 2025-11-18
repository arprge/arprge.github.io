// Управление локальным хранилищем (обновлено для API)
const Storage = {
    getReadBooks: function() {
        const books = localStorage.getItem('readBooks');
        return books ? JSON.parse(books) : [];
    },
    
    getPlanBooks: function() {
        const books = localStorage.getItem('planBooks');
        return books ? JSON.parse(books) : [];
    },
    
    addToReadBooks: function(book) {
        const readBooks = this.getReadBooks();
        const exists = readBooks.find(b => b.id === book.id);
        if (!exists) {
            readBooks.push(book);
            localStorage.setItem('readBooks', JSON.stringify(readBooks));
            
            // Удаляем из планов 
            this.removeFromPlanBooks(book.id);
            return true;
        }
        return false;
    },
    
    addToPlanBooks: function(book) {
        const planBooks = this.getPlanBooks();
        const exists = planBooks.find(b => b.id === book.id);
        if (!exists) {
            planBooks.push(book);
            localStorage.setItem('planBooks', JSON.stringify(planBooks));
            return true;
        }
        return false;
    },
    
    removeFromReadBooks: function(bookId) {
        let readBooks = this.getReadBooks();
        readBooks = readBooks.filter(b => b.id !== bookId);
        localStorage.setItem('readBooks', JSON.stringify(readBooks));
    },
    
    removeFromPlanBooks: function(bookId) {
        let planBooks = this.getPlanBooks();
        planBooks = planBooks.filter(b => b.id !== bookId);
        localStorage.setItem('planBooks', JSON.stringify(planBooks));
    },
    
    isInReadBooks: function(bookId) {
        return this.getReadBooks().some(b => b.id === bookId);
    },
    
    isInPlanBooks: function(bookId) {
        return this.getPlanBooks().some(b => b.id === bookId);
    }
};

// Создание карточки книггггиии
function createBookCard(book, showActions = true) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const bookIdString = JSON.stringify(book.id).replace(/"/g, '&quot;');
    const isRead = Storage.isInReadBooks(book.id);
    const isInPlan = Storage.isInPlanBooks(book.id);
    
    let actionsHTML = '';
    if (showActions) {
        actionsHTML = `
            <div class="book-actions">
                ${!isRead ? `<button class="btn btn-primary btn-small" onclick='addToRead(${bookIdString})'>
                    ${isInPlan ? 'Тапсырыс берілді ✓' : 'Тапсырыс беру'}
                </button>` : '<button class="btn btn-small" style="background: #4CAF50; color: white;" disabled>тапсырыс берілді ✓</button>'}
                ${!isRead && !isInPlan ? `<button class="btn btn-secondary btn-small" onclick='addToPlan(${bookIdString})'>Жоспарға</button>` : ''}
            </div>
        `;
    }
    
    // Используем реальную обложку или иконку
    let coverHTML;
    if (book.coverUrl) {
        coverHTML = `<img src="${book.coverUrl}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='${book.icon || '📚'}';">`;
    } else {
        coverHTML = book.icon || '📚';
    }
    
    card.innerHTML = `
        <div class="book-cover">${coverHTML}</div>
        <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-genre">${book.genre} • ${book.year}</div>
            ${actionsHTML}
        </div>
    `;
    
    return card;
}

// Глобальный кэш книг для быстрого доступа
let booksCache = [];
let currentSearchResults = [];
let currentSearchSource = '';
let lastSearchQuery = '';
let searchInputTimer = null;

function addToRead(bookId) {
    const book = booksCache.find(b => b.id === bookId);
    if (book && Storage.addToReadBooks(book)) {
        showNotification('Кітап тізімге қосылды');
        // Перезагрузка текущей страницы
        if (window.location.pathname.includes('search.html')) {
            performSearch();
        } else if (window.location.pathname.includes('my-books.html')) {
            loadMyBooks();
        }
    }
}

function addToPlan(bookId) {
    const book = booksCache.find(b => b.id === bookId);
    if (book && Storage.addToPlanBooks(book)) {
        showNotification('Кітап жоспарға қосылды');
        if (window.location.pathname.includes('search.html')) {
            performSearch();
        } else if (window.location.pathname.includes('my-books.html')) {
            loadMyBooks();
        }
    }
}

function removeFromList(bookId, listType) {
    if (listType === 'read') {
        Storage.removeFromReadBooks(bookId);
    } else if (listType === 'plan') {
        Storage.removeFromPlanBooks(bookId);
    }
    showNotification('Кітап тізімнен жойылды');
    if (window.location.pathname.includes('my-books.html')) {
        loadMyBooks();
    } else if (window.location.pathname.includes('search.html')) {
        performSearch();
    }
}

// Уведомления
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Добавляем анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// === ФУНКЦИИ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ ===
async function displayPopularBooks() {
    const grid = document.getElementById('popularBooksGrid');
    if (!grid) return;

    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '<div class="section-message">Танымал кітаптар жүктелуде...</div>';

    try {
        const popularBooks = await getPopularBooks(6);
        if (!popularBooks.length) {
            grid.innerHTML = '<div class="section-message error">Қазір танымал кітаптар қолжетімсіз.</div>';
            return;
        }

        booksCache = [...popularBooks];
        grid.innerHTML = '';
        popularBooks.forEach(book => {
            grid.appendChild(createBookCard(book));
        });
    } catch (error) {
        console.error('Популяр кітаптарды жүктеу қатесі:', error);
        grid.innerHTML = '<div class="section-message error">Қазір кітаптарды көрсету мүмкін емес.</div>';
    } finally {
        grid.removeAttribute('aria-busy');
    }
}

// === ФУНКЦИИ ДЛЯ СТРАНИЦЫ ПОИСКА ===
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const genreFilter = document.getElementById('genreFilter');
    const grid = document.getElementById('booksGrid');

    if (!searchInput || !searchBtn || !grid) {
        return;
    }

    showSearchIntro();

    const triggerSearch = () => performSearch();

    searchBtn.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(searchInputTimer);
        const value = searchInput.value.trim();
        if (!value) {
            showSearchIntro();
            currentSearchResults = [];
            restoreGenreFilterOptions();
            return;
        }
        searchInputTimer = setTimeout(() => {
            if (value.length >= 3) {
                triggerSearch();
            }
        }, 450);
    });

    if (genreFilter) {
        genreFilter.addEventListener('change', () => {
            renderFilteredResults();
        });
    }
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    const grid = document.getElementById('booksGrid');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const resultsMeta = document.getElementById('resultsMeta');
    
    if (!query) {
        showSearchIntro();
        return;
    }

    // Показываем загрузку
    grid.style.display = 'block';
    grid.innerHTML = '<div class="search-hint">Кітаптарды іздеу...</div>';
    noResults.style.display = 'none';
    resultsCount.textContent = '';
    if (resultsMeta) {
        resultsMeta.textContent = '';
    }
    
    try {
        lastSearchQuery = query;
        const { books, source } = await searchBooksWithFallback(query, 40);
        currentSearchResults = books;
        currentSearchSource = source;
        updateGenreFilterOptions(books);
        renderFilteredResults();
    } catch (error) {
        console.error('Іздеу қатесі:', error);
        grid.innerHTML = '<div class="search-hint">Іздеу қатесі. Кейінірек қайталап көріңіз.</div>';
    }
}

function displaySearchResults(books, sourceLabel = '', totalCount = null) {
    const grid = document.getElementById('booksGrid');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const resultsMeta = document.getElementById('resultsMeta');
    const genreFilter = document.getElementById('genreFilter');
    
    booksCache = [...books]; // Обновляем кэш
    
    if (books.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        const noResultsText = noResults.querySelector('p');
        if (noResultsText) {
            noResultsText.textContent = lastSearchQuery
                ? `«${lastSearchQuery}» бойынша кітаптар табылмады. Басқа сөздерді қолданып көріңіз.`
                : 'Кітаптар табылмады. Басқа сұрау енгізіп көріңіз.';
        }
        resultsCount.textContent = '';
        if (resultsMeta) {
            resultsMeta.textContent = sourceLabel ? `Дереккөз: ${sourceLabel}` : '';
        }
        return;
    }
    
    grid.style.display = 'grid';
    noResults.style.display = 'none';
    const countText = totalCount && totalCount > books.length
        ? `Нәтижелер: ${books.length} / ${totalCount}`
        : `Нәтижелер: ${books.length}`;
    resultsCount.textContent = countText;

    if (resultsMeta) {
        const metaParts = [];
        if (sourceLabel) {
            metaParts.push(`Дереккөз: ${sourceLabel}`);
        }
        if (genreFilter && genreFilter.value) {
            metaParts.push(`Жанр: ${genreFilter.value}`);
        }
        resultsMeta.textContent = metaParts.join(' • ');
    }
    
    grid.innerHTML = '';
    books.forEach(book => {
        grid.appendChild(createBookCard(book));
    });
}

function renderFilteredResults() {
    if (!currentSearchResults.length) {
        return;
    }
    const genreFilter = document.getElementById('genreFilter');
    const selectedGenre = genreFilter ? genreFilter.value : '';
    const filtered = selectedGenre
        ? currentSearchResults.filter(book => (book.genre || '').toLowerCase() === selectedGenre.toLowerCase())
        : currentSearchResults;
    displaySearchResults(filtered, currentSearchSource, currentSearchResults.length);
}

function updateGenreFilterOptions(books) {
    const genreFilter = document.getElementById('genreFilter');
    if (!genreFilter || !books.length) {
        return;
    }
    if (!genreFilter.dataset.initialOptions) {
        genreFilter.dataset.initialOptions = genreFilter.innerHTML;
    }
    const defaultLabel = genreFilter.getAttribute('data-default-label') || 'Барлық жанрлар';
    const currentValue = genreFilter.value;
    const genres = Array.from(new Set(books
        .map(book => book.genre)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'kk'));

    genreFilter.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultLabel;
    genreFilter.appendChild(defaultOption);

    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    if (currentValue && genres.includes(currentValue)) {
        genreFilter.value = currentValue;
    }
}

function showSearchIntro() {
    const grid = document.getElementById('booksGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    const resultsMeta = document.getElementById('resultsMeta');

    if (grid) {
        grid.style.display = 'block';
        grid.innerHTML = '<div class="search-hint">Іздеуді бастау үшін кітаптың атын немесе авторды енгізіңіз.</div>';
    }
    if (noResults) {
        noResults.style.display = 'none';
    }
    if (resultsCount) {
        resultsCount.textContent = '';
    }
    if (resultsMeta) {
        resultsMeta.textContent = '';
    }
}

function restoreGenreFilterOptions() {
    const genreFilter = document.getElementById('genreFilter');
    if (!genreFilter || !genreFilter.dataset.initialOptions) {
        return;
    }
    genreFilter.innerHTML = genreFilter.dataset.initialOptions;
    genreFilter.value = '';
}

// === ФУНКЦИИ ДЛЯ СТРАНИЦЫ "МОИ КНИГИ" ===
function initMyBooks() {
    // Инициализация вкладок
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Добавляем активный класс к выбранной вкладке
            btn.classList.add('active');
            const tabId = btn.dataset.tab + 'Tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    loadMyBooks();
}

function loadMyBooks() {
    const readBooks = Storage.getReadBooks();
    const planBooks = Storage.getPlanBooks();
    
    // Обновляем статистику
    document.getElementById('readCount').textContent = readBooks.length;
    document.getElementById('planCount').textContent = planBooks.length;
    
    // Загружаем прочитанные книги
    const readBooksContainer = document.getElementById('readBooks');
    const emptyRead = document.getElementById('emptyRead');
    
    if (readBooks.length === 0) {
        readBooksContainer.style.display = 'none';
        emptyRead.style.display = 'block';
    } else {
        readBooksContainer.style.display = 'grid';
        emptyRead.style.display = 'none';
        readBooksContainer.innerHTML = '';
        
        readBooks.forEach(book => {
            const card = createBookCard(book, false);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-secondary btn-small';
            removeBtn.textContent = 'Жою';
            removeBtn.onclick = () => removeFromList(book.id, 'read');
            
            const bookInfo = card.querySelector('.book-info');
            const actions = document.createElement('div');
            actions.className = 'book-actions';
            actions.appendChild(removeBtn);
            bookInfo.appendChild(actions);
            
            readBooksContainer.appendChild(card);
        });
    }
    
    // Загружаем книги в планах
    const planBooksContainer = document.getElementById('planBooks');
    const emptyPlan = document.getElementById('emptyPlan');
    
    if (planBooks.length === 0) {
        planBooksContainer.style.display = 'none';
        emptyPlan.style.display = 'block';
    } else {
        planBooksContainer.style.display = 'grid';
        emptyPlan.style.display = 'none';
        planBooksContainer.innerHTML = '';
        
        planBooks.forEach(book => {
            const card = createBookCard(book, false);
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'book-actions';
            
            const readBtn = document.createElement('button');
            readBtn.className = 'btn btn-primary btn-small';
            readBtn.textContent = 'Тапсырыс беру';
            readBtn.onclick = () => {
                booksCache = [book]; // Временно добавляем в кэш
                addToRead(book.id);
            };
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-secondary btn-small';
            removeBtn.textContent = 'Жою';
            removeBtn.onclick = () => removeFromList(book.id, 'plan');
            
            actionsDiv.appendChild(readBtn);
            actionsDiv.appendChild(removeBtn);
            
            const bookInfo = card.querySelector('.book-info');
            bookInfo.appendChild(actionsDiv);
            
            planBooksContainer.appendChild(card);
        });
    }
}

// === Глобальный запуск для страниц ===
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('popularBooksGrid')) {
        displayPopularBooks();
    }
    if (document.getElementById('searchInput')) {
        initSearch();
    }
    if (document.querySelector('.my-books-section')) {
        initMyBooks();
    }
});
