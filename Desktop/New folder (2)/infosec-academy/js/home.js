/**
 * home.js - Скрипты для главной страницы
 */

document.addEventListener('DOMContentLoaded', function() {
    // Загрузка курсов
    loadFeaturedCourses();
    loadAllCourses();
    setupTestimonialsSlider();
    setupAnimations();
});

/**
 * Загружает рекомендуемые курсы
 */
async function loadFeaturedCourses() {
    const featuredCoursesContainer = document.getElementById('featured-courses-container');
    if (!featuredCoursesContainer) return;
    
    try {
        // Загружаем список всех курсов
        const response = await fetch('/data/courses.json');
        if (!response.ok) throw new Error('Ошибка загрузки списка курсов');
        
        const courses = await response.json();
        
        // Выбираем два рекомендуемых курса (в реальном приложении можно было бы использовать специальные флаги)
        const featuredCourses = courses.filter(course => 
            course.id === 'sys-admin' || course.id === 'hacking'
        );
        
        if (featuredCourses.length === 0) {
            featuredCoursesContainer.innerHTML = '<div class="empty-state">Нет рекомендуемых курсов.</div>';
            return;
        }
        
        // Очистка контейнера
        featuredCoursesContainer.innerHTML = '';
        
        // Добавляем карточки рекомендуемых курсов
        featuredCourses.forEach(course => {
            const badge = course.id === 'sys-admin' ? 'Популярный' : 'Новинка';
            
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card featured';
            courseCard.innerHTML = `
                <div class="course-badge">${badge}</div>
                <div class="course-image">
                    <span class="course-icon">${course.icon}</span>
                </div>
                <div class="course-content">
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <div class="course-meta">
                        <div class="meta-item">
                            <span class="meta-icon">📚</span>
                            <span>${course.lessons} уроков</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">🏆</span>
                            <span>${course.certification}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">⏱️</span>
                            <span>${course.duration}+ минут</span>
                        </div>
                    </div>
                    <a href="/courses/${course.id}/index.html" class="btn btn-outline">Подробнее</a>
                </div>
            `;
            featuredCoursesContainer.appendChild(courseCard);
            
            // Добавляем анимацию с задержкой
            setTimeout(() => {
                courseCard.classList.add('animated');
            }, 100);
        });
    } catch (error) {
        console.error('Ошибка при загрузке рекомендуемых курсов:', error);
        featuredCoursesContainer.innerHTML = '<div class="error-state">Ошибка загрузки рекомендуемых курсов. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Загружает все курсы
 */
async function loadAllCourses() {
    const allCoursesContainer = document.getElementById('all-courses-container');
    if (!allCoursesContainer) return;
    
    try {
        // Загружаем список всех курсов
        const response = await fetch('/data/courses.json');
        if (!response.ok) throw new Error('Ошибка загрузки списка курсов');
        
        const courses = await response.json();
        
        if (courses.length === 0) {
            allCoursesContainer.innerHTML = '<div class="empty-state">Нет доступных курсов.</div>';
            return;
        }
        
        // Очистка контейнера
        allCoursesContainer.innerHTML = '';
        
        // Добавляем карточки всех курсов
        courses.forEach((course, index) => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <div class="course-image">
                    <span class="course-icon">${course.icon}</span>
                </div>
                <div class="course-content">
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <div class="course-meta">
                        <span>${course.lessons} уроков</span>
                        <span>${course.certification}</span>
                    </div>
                    <a href="/courses/${course.id}/index.html" class="btn btn-sm">Перейти к курсу</a>
                </div>
            `;
            allCoursesContainer.appendChild(courseCard);
            
            // Добавляем анимацию с задержкой
            setTimeout(() => {
                courseCard.classList.add('animated');
            }, 100 + index * 50); // Разные задержки для красивого эффекта
        });
    } catch (error) {
        console.error('Ошибка при загрузке курсов:', error);
        allCoursesContainer.innerHTML = '<div class="error-state">Ошибка загрузки курсов. Пожалуйста, попробуйте позже.</div>';
    }
}

/**
 * Настраивает слайдер отзывов
 */
function setupTestimonialsSlider() {
    const testimonials = document.querySelectorAll('.testimonial');
    if (testimonials.length <= 1) return;
    
    let currentIndex = 0;
    
    // Показываем только первый отзыв (остальные скрыты с помощью CSS)
    testimonials[0].classList.add('active');
    
    // Автоматическое переключение отзывов
    setInterval(() => {
        testimonials[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % testimonials.length;
        testimonials[currentIndex].classList.add('active');
    }, 5000);
}

/**
 * Настраивает анимации элементов при прокрутке
 */
function setupAnimations() {
    const animationElements = document.querySelectorAll('.section-header, .course-card, .topic-item, .testimonial, .about-content');
    
    // Функция для проверки видимости элемента в окне просмотра
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.9 &&
            rect.bottom >= 0
        );
    }
    
    // Функция для анимации элементов при прокрутке
    function animateOnScroll() {
        animationElements.forEach(element => {
            if (isElementInViewport(element)) {
                element.classList.add('animated');
            }
        });
    }
    
    // Запускаем анимацию при прокрутке
    window.addEventListener('scroll', animateOnScroll);
    
    // Запускаем анимацию при загрузке страницы
    animateOnScroll();
}