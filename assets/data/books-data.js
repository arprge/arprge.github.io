// Open Library API Integration
// Документация: https://openlibrary.org/dev/docs/api/search

const API_BASE = 'https://openlibrary.org';
const LOCAL_DATA_PATH = 'assets/data/books.csv';
const LOCAL_DATA_LIMIT = 400;
const SOURCE_OPEN_LIBRARY = 'Open Library';
const SOURCE_LOCAL = 'Жергілікті каталог';

const CSV_COLUMNS = {
    id: 0,
    title: 1,
    authors: 2,
    rating: 3,
    publicationDate: 10
};

// Функция для получения URL обложки книги
function getCoverUrl(coverId, size = 'M') {
    if (!coverId) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

// Поиск книг через Open Library API
async function searchBooks(query, limit = 30) {
    try {
        const url = `${API_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await fetch(url);
        const data = await response.json();
        
        return data.docs.map((book, index) => ({
            id: book.key || index,
            title: book.title || 'Атаусыз',
            author: book.author_name ? book.author_name.join(', ') : 'Автор белгісіз',
            genre: book.subject ? book.subject[0] : 'Әртүрлі',
            year: book.first_publish_year || '—',
            isbn: book.isbn ? book.isbn[0] : null,
            coverUrl: book.cover_i ? getCoverUrl(book.cover_i) : null,
            icon: book.cover_i ? null : '📚'
        }));
    } catch (error) {
        console.error('Ошибка поиска книг:', error);
        return [];
    }
}

// Поиск книг по автору
async function searchByAuthor(author, limit = 30) {
    try {
        const url = `${API_BASE}/search.json?author=${encodeURIComponent(author)}&limit=${limit}`;
        const response = await fetch(url);
        const data = await response.json();
        
        return data.docs.map((book, index) => ({
            id: book.key || index,
            title: book.title || 'Атаусыз',
            author: book.author_name ? book.author_name.join(', ') : author,
            genre: book.subject ? book.subject[0] : 'Әртүрлі',
            year: book.first_publish_year || '—',
            isbn: book.isbn ? book.isbn[0] : null,
            coverUrl: book.cover_i ? getCoverUrl(book.cover_i) : null,
            icon: book.cover_i ? null : '📚'
        }));
    } catch (error) {
        console.error('Ошибка поиска по автору:', error);
        return [];
    }
}

// Поиск книг по названию
async function searchByTitle(title, limit = 30) {
    try {
        const url = `${API_BASE}/search.json?title=${encodeURIComponent(title)}&limit=${limit}`;
        const response = await fetch(url);
        const data = await response.json();
        
        return data.docs.map((book, index) => ({
            id: book.key || index,
            title: book.title || 'Атаусыз',
            author: book.author_name ? book.author_name.join(', ') : 'Автор белгісіз',
            genre: book.subject ? book.subject[0] : 'Әртүрлі',
            year: book.first_publish_year || '—',
            isbn: book.isbn ? book.isbn[0] : null,
            coverUrl: book.cover_i ? getCoverUrl(book.cover_i) : null,
            icon: book.cover_i ? null : '📚'
        }));
    } catch (error) {
        console.error('Ошибка поиска по названию:', error);
        return [];
    }
}

// Получить популярные книги (используем trending или какую-то базовую выборку)
async function getPopularBooks(count = 6) {
    const apiBooks = await searchBooks('bestseller', count);
    if (apiBooks.length) {
        return apiBooks;
    }
    return await getFallbackPopularBooks(count);
}

async function searchBooksWithFallback(query, limit = 30) {
    const apiResults = await searchBooks(query, limit);
    const needsSupplement = apiResults.length < limit;

    if (!needsSupplement && apiResults.length) {
        return { books: apiResults, source: SOURCE_OPEN_LIBRARY };
    }

    const localResults = await searchLocalBooks(query, limit * 2);
    if (!apiResults.length && !localResults.length) {
        return { books: [], source: SOURCE_OPEN_LIBRARY };
    }

    if (!apiResults.length && localResults.length) {
        return { books: localResults.slice(0, limit), source: SOURCE_LOCAL };
    }

    const merged = dedupeBooks([...apiResults, ...localResults]);
    const finalResults = merged.slice(0, limit);
    const sourceLabel = localResults.length
        ? `${SOURCE_OPEN_LIBRARY} + ${SOURCE_LOCAL}`
        : SOURCE_OPEN_LIBRARY;

    return { books: finalResults, source: sourceLabel };
}

let booksDatabase = [];
let localBooksPromise = null;

async function getFallbackPopularBooks(count) {
    const localBooks = await loadLocalBooks();
    if (!localBooks.length) {
        return [];
    }
    return [...localBooks]
        .filter(book => typeof book.rating === 'number')
        .sort((a, b) => b.rating - a.rating)
        .slice(0, count);
}

async function searchLocalBooks(query, limit = 30) {
    const books = await loadLocalBooks();
    if (!books.length) {
        return [];
    }
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = books.filter(book => {
        if (!normalizedQuery) {
            return true;
        }
        const tokens = [book.title, book.author, book.genre]
            .filter(Boolean)
            .map(value => value.toLowerCase());
        return tokens.some(value => value.includes(normalizedQuery));
    });
    return filtered.slice(0, limit);
}

async function loadLocalBooks() {
    if (booksDatabase.length) {
        return booksDatabase;
    }
    if (!localBooksPromise) {
        localBooksPromise = fetch(LOCAL_DATA_PATH)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Cannot load ${LOCAL_DATA_PATH}`);
                }
                return response.text();
            })
            .then(text => {
                booksDatabase = parseLocalBooks(text).slice(0, LOCAL_DATA_LIMIT);
                return booksDatabase;
            })
            .catch(error => {
                console.error('Жергілікті файлдан кітаптарды жүктеу қатесі:', error);
                booksDatabase = [];
                return booksDatabase;
            });
    }
    return localBooksPromise;
}

function parseLocalBooks(csvText) {
    const lines = csvText.split(/\r?\n/);
    const books = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) {
            continue;
        }
        const values = splitCsvLine(line);
        if (!values || values.length <= CSV_COLUMNS.authors) {
            continue;
        }

        const title = cleanTitle(normalizeCsvValue(values[CSV_COLUMNS.title]));
        const authorRaw = normalizeCsvValue(values[CSV_COLUMNS.authors]);
        const author = authorRaw.split('/')[0]?.trim();
        if (!title || !author) {
            continue;
        }

        const idValue = normalizeCsvValue(values[CSV_COLUMNS.id]);
        const ratingValue = normalizeCsvValue(values[CSV_COLUMNS.rating]);
        const dateValue = normalizeCsvValue(values[CSV_COLUMNS.publicationDate]);

        const genre = detectGenre(title, author);
        const bookRecord = {
            id: Number(idValue) || `local-${i}`,
            title,
            author,
            genre,
            year: parsePublicationYear(dateValue),
            rating: parseRating(ratingValue),
            icon: getIconForGenre(genre)
        };

        books.push(bookRecord);
    }
    return books;
}

function splitCsvLine(line) {
    return line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(normalizeCsvValue);
}

function normalizeCsvValue(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.replace(/^"|"$/g, '').trim();
}

function cleanTitle(title) {
    return title
        .replace(/\([^)]*#[^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const GENRE_RULES = [
    { genre: 'Фантастика', keywords: { title: ['harry potter', 'wizard', 'lord of the rings', 'hobbit', 'dune', 'space', 'hitchhiker'] } },
    { genre: 'Классика', keywords: { author: ['tolstoy', 'dostoyevsky', 'hemingway', 'fitzgerald'] } },
    { genre: 'Детектив', keywords: { title: ['mystery', 'detective'] } },
    { genre: 'Роман', keywords: { title: ['love', 'heart'] } },
    { genre: 'История', keywords: { title: ['history', 'war'] } },
    { genre: 'Приключения', keywords: { title: ['adventure', 'treasure'] } },
    { genre: 'Путешествия', keywords: { author: ['bryson'] } },
    { genre: 'Философия', keywords: { title: ['philosophy', 'thinking'] } }
];

function detectGenre(title, author) {
    const titleLower = title.toLowerCase();
    const authorLower = author.toLowerCase();

    for (const rule of GENRE_RULES) {
        const { title: titleKeywords, author: authorKeywords } = rule.keywords;
        if (titleKeywords && titleKeywords.some(keyword => titleLower.includes(keyword))) {
            return rule.genre;
        }
        if (authorKeywords && authorKeywords.some(keyword => authorLower.includes(keyword))) {
            return rule.genre;
        }
    }

    return 'Роман';
}

function getIconForGenre(genre) {
    const icons = {
        'Фантастика': '🚀',
        'Классика': '📚',
        'Детектив': '🔍',
        'Роман': '💕',
        'История': '📜',
        'Приключения': '🗺️',
        'Путешествия': '✈️',
        'Философия': '💭',
        'Наука': '🔬',
        'Поэзия': '🌸',
        'Эссе': '✍️',
        'Мемуары': '📝'
    };
    return icons[genre] || '📖';
}

function parsePublicationYear(dateString) {
    if (!dateString) {
        return '—';
    }
    const parts = dateString.split('/');
    const year = parts[2] ? parseInt(parts[2], 10) : NaN;
    return Number.isFinite(year) ? year : '—';
}

function parseRating(value) {
    const rating = parseFloat(value);
    return Number.isFinite(rating) ? rating : null;
}

function dedupeBooks(books) {
    const seen = new Set();
    return books.filter(book => {
        const key = `${(book.title || '').toLowerCase()}|${(book.author || '').toLowerCase()}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
