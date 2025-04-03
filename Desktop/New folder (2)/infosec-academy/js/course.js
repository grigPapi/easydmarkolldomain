/**
 * course.js - Скрипты для страниц курсов
 */

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация функционала страницы курса
    setupTabs();
    loadCourseCurriculum();
    loadRelatedCourses();
    setupUserProgress();
});

/**
 * Настраивает переключение вкладок
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Сбрасываем активные состояния
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Устанавливаем активное состояние для выбранной вкладки
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

/**
 * Загружает программу курса
 */
async function loadCourseCurriculum() {
    const courseId = document.querySelector('meta[name="page-course-id"]')?.getAttribute('content');
    if (!courseId) return;
    
    const curriculumContainer = document.querySelector('.course-curriculum');
    if (!curriculumContainer) return;
    
    try {
        // Загрузка JSON файла со списком уроков курса
        const response = await fetch(`/courses/${courseId}/lessons.json`);
        if (!response.ok) throw new Error('Ошибка загрузки списка уроков');
        
        const lessons = await response.json();
        
        // Очистка контейнера
        curriculumContainer.innerHTML = '';
        
        if (lessons.length === 0) {
            curriculumContainer.innerHTML = '<div class="empty-state">Нет уроков в этом курсе.</div>';
            return;
        }
        
        // Создаем блок с уроками
        const curriculumItem = document.createElement('div');
        curriculumItem.className = 'curriculum-item active';
        
        // Заголовок блока
        const itemHeader = document.createElement('div');
        itemHeader.className = 'curriculum-item-header';
        itemHeader.innerHTML = `
            <div class="curriculum-item-title">
                <div class="curriculum-item-icon">📚</div>
                <div>Уроки курса</div>
            </div>
            <div class="curriculum-item-meta">
                <div>${lessons.length} уроков</div>
            </div>
        `;
        
        // Содержимое блока
        const itemContent = document.createElement('div');
        itemContent.className = 'curriculum-item-content';
        
        // Добавляем уроки
        lessons.forEach(lesson => {
            const lessonElement = document.createElement('div');
            lessonElement.className = 'curriculum-lesson';
            lessonElement.innerHTML = `
                <div class="curriculum-lesson-title">
                    <div class="curriculum-lesson-icon">📝</div>
                    <a href="${lesson.url}">${lesson.title}</a>
                </div>
                <div class="curriculum-lesson-meta">
                    <div class="curriculum-lesson-duration">${lesson.duration} мин</div>
                    <a href="${lesson.url}" class="curriculum-lesson-preview">Просмотр</a>
                </div>
            `;
            itemContent.appendChild(lessonElement);
        });
        
        // Собираем блок
        curriculumItem.appendChild(itemHeader);
        curriculumItem.appendChild(itemContent);
        curriculumContainer.appendChild(curriculumItem);
        
        // Обновляем метаданные курса
        updateCourseMetadata(lessons);
        
        // Настраиваем переключение состояния блока
        itemHeader.addEventListener('click', () => {
            curriculumItem.classList.toggle('active');
        });
    } catch (error) {
        console.error('Ошибка при загрузке программы курса:', error);
        curriculumContainer.innerHTML = '<div class="error-state">Ошибка загрузки программы курса. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Обновляет метаданные курса на основе списка уроков
 */
function updateCourseMetadata(lessons) {
    // Обновляем количество уроков
    const lessonsCountElement = document.getElementById('lessons-count');
    if (lessonsCountElement) {
        lessonsCountElement.textContent = lessons.length;
    }
    
    // Рассчитываем общую продолжительность курса
    const totalDuration = lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
    const totalDurationElement = document.getElementById('total-duration');
    if (totalDurationElement) {
        totalDurationElement.textContent = totalDuration;
    }
}

/**
 * Загружает похожие курсы
 */
async function loadRelatedCourses() {
    const courseId = document.querySelector('meta[name="page-course-id"]')?.getAttribute('content');
    if (!courseId) return;
    
    const relatedCoursesContainer = document.querySelector('.related-courses-grid');
    if (!relatedCoursesContainer) return;
    
    try {
        // Загружаем список всех курсов
        const response = await fetch('/data/courses.json');
        if (!response.ok) throw new Error('Ошибка загрузки списка курсов');
        
        const courses = await response.json();
        
        // Фильтруем курсы, исключая текущий
        const relatedCourses = courses
            .filter(course => course.id !== courseId)
            .slice(0, 3); // Берем только первые 3 курса
        
        // Очистка контейнера
        relatedCoursesContainer.innerHTML = '';
        
        if (relatedCourses.length === 0) {
            relatedCoursesContainer.innerHTML = '<div class="empty-state">Нет похожих курсов.</div>';
            return;
        }
        
        // Добавляем карточки похожих курсов
        relatedCourses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'related-course-card';
            courseCard.innerHTML = `
                <div class="related-course-image">${course.icon || '📚'}</div>
                <div class="related-course-content">
                    <div class="related-course-title">
                        <a href="/courses/${course.id}/index.html">${course.title}</a>
                    </div>
                    <div class="related-course-meta">
                        <div>${course.lessons} уроков</div>
                        <div>${course.difficulty}</div>
                    </div>
                </div>
            `;
            relatedCoursesContainer.appendChild(courseCard);
        });
    } catch (error) {
        console.error('Ошибка при загрузке похожих курсов:', error);
        relatedCoursesContainer.innerHTML = '<div class="error-state">Ошибка загрузки рекомендаций. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Настраивает отображение прогресса пользователя
 */
function setupUserProgress() {
    const courseId = document.querySelector('meta[name="page-course-id"]')?.getAttribute('content');
    if (!courseId) return;
    
    // Загружаем прогресс пользователя из localStorage
    const userProgressKey = `course_progress_${courseId}`;
    let userProgress = JSON.parse(localStorage.getItem(userProgressKey) || '{"completedLessons":[],"lastLessonId":"","progressPercentage":0}');
    
    // Отображаем прогресс
    const progressBar = document.querySelector('.progress-card .progress-bar-fill');
    const progressText = document.querySelector('.progress-card .progress-text');
    const lastLessonLink = document.querySelector('.progress-card .last-lesson');
    
    if (progressBar && progressText) {
        progressBar.style.width = `${userProgress.progressPercentage}%`;
        progressText.textContent = `${userProgress.progressPercentage}% завершено`;
    }
    
    // Настраиваем ссылку на последний урок
    if (lastLessonLink) {
        if (userProgress.lastLessonId) {
            // Загружаем список уроков, чтобы найти URL последнего урока
            fetch(`/courses/${courseId}/lessons.json`)
                .then(response => response.json())
                .then(lessons => {
                    const lastLesson = lessons.find(lesson => lesson.id === userProgress.lastLessonId);
                    if (lastLesson) {
                        lastLessonLink.href = lastLesson.url;
                        lastLessonLink.textContent = 'Продолжить обучение';
                    } else {
                        // Если урок не найден, устанавливаем ссылку на первый урок
                        if (lessons.length > 0) {
                            lastLessonLink.href = lessons[0].url;
                            lastLessonLink.textContent = 'Начать обучение';
                        }
                    }
                })
                .catch(error => {
                    console.error('Ошибка при загрузке списка уроков:', error);
                    lastLessonLink.textContent = 'Просмотреть уроки';
                    lastLessonLink.href = '#content';
                });
        } else {
            // Если нет последнего урока, устанавливаем ссылку на содержание курса
            lastLessonLink.textContent = 'Начать обучение';
            lastLessonLink.href = '#content';
        }
    }
}