// Загрузка и парсинг CSV файла
let booksDatabase = [];

// Парсер CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const books = [];
    
    // Пропускаем заголовок и пустые строки
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        
        // Извлекаем нужные поля
        const bookID = values[0];
        const title = values[1];
        const author = values[2]?.split('/')[0]; // Берем первого автора
        const year = values[10]?.split('/')[2]; // Извлекаем год из даты
        
        // Пропускаем некорректные записи
        if (!title || !author) continue;
        
        // Определяем жанр на основе названия/автора
        const genre = detectGenre(title, author);
        
        books.push({
            id: parseInt(bookID),
            title: cleanTitle(title),
            author: author.trim(),
            genre: genre,
            year: year ? parseInt(year) : 2000,
            icon: getIconForGenre(genre)
        });
    }
    
    return books;
}

// Очистка названия от серийных номеров
function cleanTitle(title) {
    return title
        .replace(/\([^)]*#[^)]*\)/g, '') // Удаляем (Series #1)
        .replace(/\s+/g, ' ')
        .trim();
}

/*
// Определение жанра
const genreRules = [
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

    for (const rule of genreRules) {
        const { title: titleKeywords, author: authorKeywords } = rule.keywords;

        if (titleKeywords && titleKeywords.some(keyword => titleLower.includes(keyword))) {
            return rule.genre;
        }
        if (authorKeywords && authorKeywords.some(keyword => authorLower.includes(keyword))) {
            return rule.genre;
        }
    }
    
    return 'Роман'; // По умолчанию
}

// Иконка для жанра
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
}  */

// Загрузка CSV при старте
async function loadBooksFromCSV() {
    try {
        const response = await fetch('../data/books.csv');
        const csvText = await response.text();
        booksDatabase = parseCSV(csvText);
        
        // Ограничиваем до 100 книг для производительности
        booksDatabase = booksDatabase.slice(0, 100);
        
        console.log(`Загружено ${booksDatabase.length} книг из CSV`);
        return booksDatabase;
    } catch (error) {
        console.error('Ошибка загрузки CSV:', error);
        // Возвращаем пустой массив если не удалось загрузить
        booksDatabase = [];
        return [];
    }
}
