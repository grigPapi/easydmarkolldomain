/**
 * Утилиты для работы с DOM
 * Содержит функции для удобного манипулирования DOM-элементами
 */
const DOMUtils = (function() {
    const cache = new Map();
    
    /**
     * Получение элемента по ID с кэшированием
     * @param {string} id - Идентификатор элемента
     * @returns {HTMLElement|null} Найденный элемент или null
     */
    function getById(id) {
        if (cache.has(id)) {
            return cache.get(id);
        }
        
        const element = document.getElementById(id);
        if (element) {
            cache.set(id, element);
        }
        
        return element;
    }
    
    /**
     * Получение элементов по селектору
     * @param {string} selector - CSS-селектор
     * @param {HTMLElement|Document} [parent=document] - Родительский элемент для поиска
     * @returns {NodeList} Найденные элементы
     */
    function queryAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }
    
    /**
     * Получение первого элемента по селектору
     * @param {string} selector - CSS-селектор
     * @param {HTMLElement|Document} [parent=document] - Родительский элемент для поиска
     * @returns {HTMLElement|null} Найденный элемент или null
     */
    function query(selector, parent = document) {
        return parent.querySelector(selector);
    }
    
    /**
     * Создание HTML-элемента с атрибутами и содержимым
     * @param {string} tag - Имя тега
     * @param {Object} [attributes={}] - Атрибуты элемента
     * @param {string|HTMLElement|Array} [content] - Содержимое элемента
     * @returns {HTMLElement} Созданный элемент
     */
    function createElement(tag, attributes = {}, content) {
        const element = document.createElement(tag);
        
        // Устанавливаем атрибуты
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class' || key === 'className') {
                if (Array.isArray(value)) {
                    element.classList.add(...value.filter(Boolean));
                } else if (typeof value === 'string') {
                    value.split(' ').filter(Boolean).forEach(cls => element.classList.add(cls));
                }
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else if (value !== null && value !== undefined) {
                element.setAttribute(key, value);
            }
        });
        
        // Добавляем содержимое
        if (content !== undefined) {
            appendContent(element, content);
        }
        
        return element;
    }
    
    /**
     * Добавление содержимого в элемент
     * @param {HTMLElement} element - Элемент, в который добавляется содержимое
     * @param {string|HTMLElement|Array} content - Содержимое для добавления
     */
    function appendContent(element, content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (item) {
                    appendContent(element, item);
                }
            });
        }
    }
    
    /**
     * Удаление всех дочерних элементов
     * @param {HTMLElement} element - Элемент, из которого удаляются дочерние элементы
     */
    function empty(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    
    /**
     * Установка нескольких атрибутов для элемента
     * @param {HTMLElement} element - Элемент
     * @param {Object} attributes - Объект с атрибутами
     */
    function setAttributes(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                element.setAttribute(key, value);
            } else {
                element.removeAttribute(key);
            }
        });
    }
    
    /**
     * Добавление/удаление класса в зависимости от условия
     * @param {HTMLElement} element - Элемент
     * @param {string} className - Имя класса
     * @param {boolean} condition - Условие
     */
    function toggleClass(element, className, condition) {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
    
    /**
     * Создание элемента из HTML-строки
     * @param {string} html - HTML-строка
     * @returns {HTMLElement} Созданный элемент
     */
    function createFromHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }
    
    /**
     * Безопасная анимация с использованием requestAnimationFrame
     * @param {function} callback - Функция для выполнения в следующем кадре
     */
    function animationFrame(callback) {
        return window.requestAnimationFrame(() => {
            try {
                callback();
            } catch (error) {
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error('Error in animation frame callback', error);
                } else {
                    console.error('Error in animation frame callback', error);
                }
            }
        });
    }
    
    /**
     * Создание элемента из шаблона
     * @param {string} templateId - ID шаблона
     * @returns {DocumentFragment} Клон содержимого шаблона
     */
    function createFromTemplate(templateId) {
        const template = getById(templateId);
        if (!template) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Template with id '${templateId}' not found`);
            } else {
                console.error(`Template with id '${templateId}' not found`);
            }
            return document.createDocumentFragment();
        }
        
        return template.content.cloneNode(true);
    }
    
    /**
     * Очистка кэша DOM-элементов
     */
    function clearCache() {
        cache.clear();
    }
    
    /**
     * Делегирование события
     * @param {HTMLElement} element - Элемент, на который вешается обработчик
     * @param {string} eventType - Тип события
     * @param {string} selector - CSS-селектор для фильтрации целевых элементов
     * @param {Function} handler - Обработчик события
     */
    function delegate(element, eventType, selector, handler) {
        element.addEventListener(eventType, function(event) {
            const targetElement = event.target.closest(selector);
            
            if (targetElement && element.contains(targetElement)) {
                handler.call(targetElement, event, targetElement);
            }
        });
    }
    
    /**
     * Debounce функция для предотвращения множественных вызовов
     * @param {Function} func - Функция для debounce
     * @param {number} wait - Время ожидания в мс
     * @returns {Function} Обернутая функция
     */
    function debounce(func, wait) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle функция для ограничения частоты вызовов
     * @param {Function} func - Функция для throttle
     * @param {number} limit - Минимальный интервал между вызовами в мс
     * @returns {Function} Обернутая функция
     */
    function throttle(func, limit) {
        let inThrottle;
        
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    }
    
    // Публичное API
    return {
        getById,
        query,
        queryAll,
        createElement,
        empty,
        setAttributes,
        toggleClass,
        createFromHTML,
        animationFrame,
        createFromTemplate,
        clearCache,
        delegate,
        debounce,
        throttle
    };
})();

// Инициализируем хелпер
if (window.Logger && typeof window.Logger.debug === 'function') {
    window.Logger.debug('DOMUtils initialized');
} else {
    console.log('DOMUtils initialized');
}