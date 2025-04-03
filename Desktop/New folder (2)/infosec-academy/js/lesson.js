 
/**
 * lesson.js - Скрипты для страниц уроков
 */

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация функционала урока
    setupLessonNavigation();
    setupCodeBlocks();
    setupQuiz();
    setupCommentForm();
    calculateReadingTime();
    addSidebarToggle();
});

/**
 * Настраивает навигацию между уроками
 */
async function setupLessonNavigation() {
    const prevButton = document.getElementById('prev-lesson');
    const nextButton = document.getElementById('next-lesson');
    
    if (!prevButton || !nextButton) return;
    
    const courseId = document.querySelector('meta[name="page-course-id"]')?.getAttribute('content');
    const currentLessonId = document.querySelector('meta[name="page-lesson-id"]')?.getAttribute('content');
    
    if (!courseId || !currentLessonId) {
        // Скрываем кнопки навигации, если нет информации о курсе или уроке
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        return;
    }
    
    try {
        // Загрузка JSON файла со списком уроков курса
        const response = await fetch(`/courses/${courseId}/lessons.json`);
        if (!response.ok) throw new Error('Ошибка загрузки списка уроков');
        
        const lessons = await response.json();
        
        // Находим индекс текущего урока
        const currentIndex = lessons.findIndex(lesson => lesson.id === currentLessonId);
        
        if (currentIndex === -1) {
            throw new Error('Текущий урок не найден в списке');
        }
        
        // Настраиваем кнопку предыдущего урока
        if (currentIndex > 0) {
            const prevLesson = lessons[currentIndex - 1];
            prevButton.href = prevLesson.url;
            prevButton.innerHTML = `<i>←</i> ${prevLesson.title}`;
        } else {
            prevButton.style.display = 'none';
        }
        
        // Настраиваем кнопку следующего урока
        if (currentIndex < lessons.length - 1) {
            const nextLesson = lessons[currentIndex + 1];
            nextButton.href = nextLesson.url;
            nextButton.innerHTML = `${nextLesson.title} <i>→</i>`;
        } else {
            nextButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка при настройке навигации урока:', error);
        // Скрываем кнопки навигации при ошибке
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
    }
}

/**
 * Добавляет функционал для блоков кода
 */
function setupCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-block pre');
    
    codeBlocks.forEach(block => {
        // Добавляем кнопку копирования для блоков кода
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = 'Копировать';
        copyButton.addEventListener('click', () => {
            const code = block.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyButton.innerHTML = 'Скопировано!';
                setTimeout(() => {
                    copyButton.innerHTML = 'Копировать';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка при копировании: ', err);
                copyButton.innerHTML = 'Ошибка';
                setTimeout(() => {
                    copyButton.innerHTML = 'Копировать';
                }, 2000);
            });
        });
        
        // Добавляем обертку для блока кода и кнопки
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        wrapper.appendChild(copyButton);
    });
}

/**
 * Настраивает функционал викторины
 */
function setupQuiz() {
    const quizForms = document.querySelectorAll('.quiz-section');
    
    quizForms.forEach(form => {
        const submitButton = form.querySelector('.quiz-submit');
        if (!submitButton) return;
        
        submitButton.addEventListener('click', () => {
            // Здесь была бы логика проверки ответов
            // В текущей реализации просто показываем общее сообщение
            alert('Функция проверки ответов будет доступна в полной версии сайта.');
        });
    });
}

/**
 * Настраивает форму комментариев
 */
function setupCommentForm() {
    const commentForm = document.querySelector('.comment-form');
    
    if (!commentForm) return;
    
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const textarea = commentForm.querySelector('textarea');
        const commentText = textarea.value.trim();
        
        if (commentText) {
            // В реальном приложении здесь был бы код для отправки комментария на сервер
            alert('Функция комментариев будет доступна в полной версии сайта.');
            textarea.value = '';
        } else {
            alert('Пожалуйста, введите текст комментария');
        }
    });
}

/**
 * Расчет времени чтения
 */
function calculateReadingTime() {
    const content = document.querySelector('.lesson-content');
    if (!content) return;
    
    // Получаем весь текст из контента урока
    const text = content.textContent || '';
    
    // Считаем количество слов (приблизительно)
    const wordCount = text.split(/\s+/).length;
    
    // Вычисляем время чтения (среднее количество слов в минуту - около 200)
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    
    // Обновляем метатег и отображаемое время чтения
    const readingTimeMeta = document.querySelector('meta[name="page-reading-time"]');
    if (readingTimeMeta) {
        readingTimeMeta.setAttribute('content', readingTimeMinutes.toString());
    }
    
    const readingTimeElement = document.querySelector('[data-variable="reading-time"]');
    if (readingTimeElement) {
        readingTimeElement.textContent = readingTimeMinutes.toString();
    }
}

/**
 * Добавляет кнопку переключения боковой панели на мобильных устройствах
 */
function addSidebarToggle() {
    // Проверяем, нужна ли кнопка (только для мобильных устройств)
    if (window.innerWidth > 992) return;
    
    const sidebar = document.querySelector('.lesson-sidebar');
    const lessonContent = document.querySelector('.lesson-content');
    
    if (!sidebar || !lessonContent) return;
    
    // Создаем кнопку
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '≡ Показать содержание';
    
    // Добавляем обработчик нажатия
    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        toggleButton.innerHTML = sidebar.classList.contains('active') 
            ? '× Скрыть содержание' 
            : '≡ Показать содержание';
    });
    
    // Добавляем кнопку в начало контента
    lessonContent.insertBefore(toggleButton, lessonContent.firstChild);
    
    // Добавляем стили для кнопки
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-toggle {
            display: block;
            width: 100%;
            padding: 0.75rem;
            margin-bottom: 1.5rem;
            background-color: var(--secondary-color);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: bold;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Обеспечивает работу интерактивных элементов в уроке
 */
function setupInteractiveElements() {
    // Подсветка синтаксиса в блоках кода
    // Это потребовало бы подключения библиотеки подсветки синтаксиса, например, Prism.js
    
    // Обработка изображений (прикрепление лайтбокса)
    const contentImages = document.querySelectorAll('.lesson-content img');
    contentImages.forEach(img => {
        img.addEventListener('click', () => {
            // Простая реализация лайтбокса
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            
            const imgClone = document.createElement('img');
            imgClone.src = img.src;
            
            overlay.appendChild(imgClone);
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', () => {
                overlay.remove();
            });
            
            // Стили для оверлея
            const style = document.createElement('style');
            style.textContent = `
                .image-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    cursor: pointer;
                }
                
                .image-overlay img {
                    max-width: 90%;
                    max-height: 90%;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                }
            `;
            document.head.appendChild(style);
        });
        
        // Добавляем стиль курсора при наведении
        img.style.cursor = 'pointer';
    });
}