/**
 * InfoSec Academy - Система шаблонов
 * Этот скрипт обеспечивает загрузку повторно используемых компонентов (шапка, подвал и т.д.)
 */

// Загрузка компонентов при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadComponents();
    setupNavigationHighlight();
    setupTOCHighlight();
});

/**
 * Загружает все HTML компоненты в соответствующие контейнеры
 */
async function loadComponents() {
    // Массив компонентов для загрузки
    const components = [
        { id: 'header-container', path: '/components/header.html' },
        { id: 'footer-container', path: '/components/footer.html' },
        { id: 'breadcrumbs-container', path: '/components/breadcrumbs.html' }
    ];
    
    // Загрузка каждого компонента
    for (const component of components) {
        const container = document.getElementById(component.id);
        if (container) {
            try {
                const response = await fetch(component.path);
                if (response.ok) {
                    const html = await response.text();
                    container.innerHTML = html;
                } else {
                    console.error(`Ошибка загрузки компонента: ${component.path}`);
                }
            } catch (error) {
                console.error(`Ошибка при загрузке компонента ${component.path}:`, error);
            }
        }
    }
    
    // Отдельно загружаем боковую панель
    await loadSidebar();
    
    // Обрабатываем динамические данные
    processPageVariables();
}

/**
 * Загружает боковую панель с особой обработкой JavaScript
 */
async function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    
    try {
        const response = await fetch('/components/sidebar.html');
        if (!response.ok) {
            console.error('Ошибка загрузки компонента: /components/sidebar.html');
            return;
        }
        
        const html = await response.text();
        
        // Разделяем HTML и JavaScript из компонента
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Извлекаем HTML без скриптов
        const htmlWithoutScripts = Array.from(doc.body.children)
            .filter(node => node.tagName !== 'SCRIPT')
            .map(node => node.outerHTML)
            .join('');
        
        // Загружаем HTML
        container.innerHTML = htmlWithoutScripts;
        
        // Теперь вручную добавляем функциональность
        loadCourseLessons();
        generateTableOfContents();
    } catch (error) {
        console.error('Ошибка при загрузке боковой панели:', error);
    }
}

/**
 * Загрузка списка уроков курса
 */
async function loadCourseLessons() {
    const courseId = document.querySelector('meta[name="page-course-id"]')?.getAttribute('content');
    if (!courseId) {
        console.warn("Не найден мета-тег page-course-id");
        return;
    }
    
    const courseListContainer = document.getElementById('course-lessons-list');
    if (!courseListContainer) return;
    
    try {
        console.log(`Загрузка уроков из: /courses/${courseId}/lessons.json`);
        const response = await fetch(`/courses/${courseId}/lessons.json`);
        
        if (!response.ok) {
            throw new Error(`Ответ сервера: ${response.status} ${response.statusText}`);
        }
        
        const lessons = await response.json();
        
        // Очистка контейнера
        courseListContainer.innerHTML = '';
        
        // Получение текущего урока
        const currentLessonId = document.querySelector('meta[name="page-lesson-id"]')?.getAttribute('content');
        
        if (lessons.length === 0) {
            courseListContainer.innerHTML = '<li><a href="#" class="empty">Нет доступных уроков</a></li>';
            return;
        }
        
        // Добавление уроков в список
        lessons.forEach((lesson, index) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = lesson.url;
            a.textContent = lesson.title;
            
            // Если это текущий урок, добавляем класс active
            if (currentLessonId && lesson.id === currentLessonId) {
                a.classList.add('active');
                
                // Обновляем прогресс
                updateProgress(index + 1, lessons.length);
            }
            
            li.appendChild(a);
            courseListContainer.appendChild(li);
        });
    } catch (error) {
        console.error('Ошибка при загрузке списка уроков:', error);
        courseListContainer.innerHTML = `<li><a href="#" class="error">Ошибка загрузки уроков: ${error.message}</a></li>`;
    }
}

/**
 * Обновление прогресса прохождения курса
 */
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    document.documentElement.style.setProperty('--progress-percentage', `${percentage}%`);
    
    const progressText = document.querySelector('[data-variable="progress-text"]');
    if (progressText) {
        progressText.textContent = `${current} из ${total} уроков (${percentage}%)`;
    }
}

/**
 * Генерация оглавления урока на основе заголовков
 */
function generateTableOfContents() {
    const tocContainer = document.getElementById('lesson-toc');
    const lessonContent = document.querySelector('.lesson-content');
    
    if (!tocContainer || !lessonContent) return;
    
    // Получаем все заголовки h2 и h3 из контента урока
    const headings = lessonContent.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        tocContainer.innerHTML = '<li>Нет разделов</li>';
        return;
    }
    
    // Очистка контейнера
    tocContainer.innerHTML = '';
    
    // Проходим по всем заголовкам
    headings.forEach(heading => {
        // Если у заголовка нет id, добавляем его
        if (!heading.id) {
            heading.id = heading.textContent.toLowerCase().replace(/\s+/g, '-');
        }
        
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;
        
        // Отступ для h3
        if (heading.tagName === 'H3') {
            li.style.paddingLeft = '1rem';
        }
        
        li.appendChild(a);
        tocContainer.appendChild(li);
    });
}

/**
 * Обрабатывает переменные на странице
 * Заменяет все теги с data-variable атрибутом на соответствующие значения
 */
function processPageVariables() {
    // Получаем данные страницы из мета-тегов
    const pageData = {};
    document.querySelectorAll('meta[name^="page-"]').forEach(meta => {
        const key = meta.getAttribute('name').replace('page-', '');
        pageData[key] = meta.getAttribute('content');
    });
    
    // Заполняем переменные на странице
    document.querySelectorAll('[data-variable]').forEach(element => {
        const variable = element.getAttribute('data-variable');
        if (pageData[variable]) {
            element.textContent = pageData[variable];
        }
    });
    
    // Обработка хлебных крошек
    processBreadcrumbs(pageData);
    
    // Подсветка активного пункта меню
    highlightActiveMenuItem(pageData);
}

/**
 * Обрабатывает хлебные крошки на основе данных страницы
 */
function processBreadcrumbs(pageData) {
    const breadcrumbsContainer = document.querySelector('.breadcrumbs ul');
    if (!breadcrumbsContainer || !pageData.breadcrumbs) return;
    
    try {
        const breadcrumbs = JSON.parse(pageData.breadcrumbs);
        breadcrumbsContainer.innerHTML = ''; // Очищаем контейнер
        
        // Добавляем ссылку на главную
        const homeLi = document.createElement('li');
        const homeLink = document.createElement('a');
        homeLink.href = '/index.html';
        homeLink.textContent = 'Главная';
        homeLi.appendChild(homeLink);
        breadcrumbsContainer.appendChild(homeLi);
        
        // Добавляем остальные хлебные крошки
        breadcrumbs.forEach((crumb, index) => {
            const li = document.createElement('li');
            
            if (index === breadcrumbs.length - 1) {
                // Последний элемент - просто текст
                li.textContent = crumb.title;
            } else {
                // Промежуточные элементы - ссылки
                const link = document.createElement('a');
                link.href = crumb.url;
                link.textContent = crumb.title;
                li.appendChild(link);
            }
            
            breadcrumbsContainer.appendChild(li);
        });
    } catch (error) {
        console.error('Ошибка при обработке хлебных крошек:', error);
    }
}

/**
 * Подсвечивает активный пункт меню
 */
function highlightActiveMenuItem(pageData) {
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        // Убираем класс active у всех ссылок
        link.classList.remove('active');
        
        // Определяем текущую страницу и подсвечиваем соответствующую ссылку
        const href = link.getAttribute('href');
        if (currentPage.endsWith(href) || 
            (pageData.section && href.includes(pageData.section))) {
            link.classList.add('active');
        }
    });
}

/**
 * Подсвечивает текущий раздел в оглавлении при прокрутке
 */
function setupTOCHighlight() {
    const sections = document.querySelectorAll('.lesson-section');
    const tocItems = document.querySelectorAll('.toc-menu ul li a');
    
    if (sections.length === 0 || tocItems.length === 0) return;
    
    // Функция проверки видимости элемента
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= window.innerHeight * 0.5 &&
            rect.bottom >= window.innerHeight * 0.1
        );
    }
    
    // Функция для подсветки элемента в оглавлении
    function highlightTOC() {
        let highlightedSection = null;
        
        // Проходим по всем секциям и находим видимую
        sections.forEach((section) => {
            if (isElementInViewport(section)) {
                highlightedSection = section;
            }
        });
        
        if (highlightedSection) {
            const id = highlightedSection.getAttribute('id');
            
            // Подсвечиваем соответствующий пункт в меню
            tocItems.forEach((item) => {
                if (item.getAttribute('href') === `#${id}`) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }
    
    // Вызов функции при прокрутке
    window.addEventListener('scroll', highlightTOC);
    highlightTOC(); // Вызов при загрузке страницы
}

/**
 * Настраивает подсветку меню навигации
 */
function setupNavigationHighlight() {
    // Реализация в highlightActiveMenuItem
}