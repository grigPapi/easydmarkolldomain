/**
 * Шина событий для межкомпонентного взаимодействия
 * Реализует паттерн Наблюдатель (Observer) для обеспечения слабой связанности между компонентами
 */
class EventBusClass {
    constructor() {
        this.listeners = {};
        this.onceListeners = {};
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('EventBus initialized');
        } else {
            console.log('EventBus initialized');
        }
    }
    
    /**
     * Подписка на событие
     * @param {string} event - Имя события
     * @param {Function} callback - Функция-обработчик события
     * @param {Object} [context] - Контекст выполнения функции
     * @returns {Function} Функция для отписки от события
     */
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('EventBus.on: callback is not a function', { event, callback });
            } else {
                console.error('EventBus.on: callback is not a function', { event, callback });
            }
            return () => {};
        }
        
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        
        const listener = { callback, context };
        this.listeners[event].push(listener);
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(`EventBus: Subscribed to event "${event}"`, { callback: callback.name || 'anonymous' });
        } else {
            console.log(`EventBus: Subscribed to event "${event}"`, { callback: callback.name || 'anonymous' });
        }
        
        // Возвращаем функцию для удобной отписки
        return () => this.off(event, callback, context);
    }
    
    /**
     * Подписка на событие с автоматической отпиской после первого выполнения
     * @param {string} event - Имя события
     * @param {Function} callback - Функция-обработчик события
     * @param {Object} [context] - Контекст выполнения функции
     */
    once(event, callback, context = null) {
        if (typeof callback !== 'function') {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('EventBus.once: callback is not a function', { event, callback });
            } else {
                console.error('EventBus.once: callback is not a function', { event, callback });
            }
            return;
        }
        
        if (!this.onceListeners[event]) {
            this.onceListeners[event] = [];
        }
        
        this.onceListeners[event].push({ callback, context });
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(`EventBus: Subscribed to event "${event}" (once)`, { callback: callback.name || 'anonymous' });
        } else {
            console.log(`EventBus: Subscribed to event "${event}" (once)`, { callback: callback.name || 'anonymous' });
        }
    }
    
    /**
     * Отписка от события
     * @param {string} event - Имя события
     * @param {Function} [callback] - Функция-обработчик события (если не указана, удаляются все обработчики события)
     * @param {Object} [context] - Контекст выполнения функции
     */
    off(event, callback = null, context = null) {
        // Если нет слушателей для события, ничего не делаем
        if (!this.listeners[event]) {
            return;
        }
        
        // Если обработчик не указан, удаляем все обработчики события
        if (!callback) {
            delete this.listeners[event];
            delete this.onceListeners[event];
            
            if (window.Logger && typeof window.Logger.debug === 'function') {
                window.Logger.debug(`EventBus: Unsubscribed from all callbacks for event "${event}"`);
            } else {
                console.log(`EventBus: Unsubscribed from all callbacks for event "${event}"`);
            }
            return;
        }
        
        // Удаляем указанный обработчик
        this.listeners[event] = this.listeners[event].filter(listener => {
            return listener.callback !== callback || (context && listener.context !== context);
        });
        
        // Очищаем onceListeners
        if (this.onceListeners[event]) {
            this.onceListeners[event] = this.onceListeners[event].filter(listener => {
                return listener.callback !== callback || (context && listener.context !== context);
            });
        }
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(`EventBus: Unsubscribed from event "${event}"`, { callback: callback.name || 'anonymous' });
        } else {
            console.log(`EventBus: Unsubscribed from event "${event}"`, { callback: callback.name || 'anonymous' });
        }
    }
    
    /**
     * Генерация события
     * @param {string} event - Имя события
     * @param {...*} args - Аргументы, передаваемые обработчикам
     */
    emit(event, ...args) {
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(`EventBus: Emitting event "${event}"`, args.length > 0 ? args[0] : null);
        } else {
            console.log(`EventBus: Emitting event "${event}"`, args.length > 0 ? args[0] : null);
        }
        
        // Вызываем обычных слушателей
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => {
                try {
                    if (listener.context) {
                        listener.callback.apply(listener.context, args);
                    } else {
                        listener.callback(...args);
                    }
                } catch (error) {
                    if (window.Logger && typeof window.Logger.error === 'function') {
                        window.Logger.error(`Error in event handler for "${event}"`, error);
                    } else {
                        console.error(`Error in event handler for "${event}"`, error);
                    }
                }
            });
        }
        
        // Вызываем one-time слушателей и затем удаляем их
        if (this.onceListeners[event]) {
            const onceListeners = [...this.onceListeners[event]];
            this.onceListeners[event] = [];
            
            onceListeners.forEach(listener => {
                try {
                    if (listener.context) {
                        listener.callback.apply(listener.context, args);
                    } else {
                        listener.callback(...args);
                    }
                } catch (error) {
                    if (window.Logger && typeof window.Logger.error === 'function') {
                        window.Logger.error(`Error in once event handler for "${event}"`, error);
                    } else {
                        console.error(`Error in once event handler for "${event}"`, error);
                    }
                }
            });
        }
    }
    
    /**
     * Получение списка всех обработчиков для события
     * @param {string} event - Имя события
     * @returns {Array} Массив обработчиков
     */
    getListeners(event) {
        const regular = this.listeners[event] || [];
        const once = this.onceListeners[event] || [];
        return [...regular, ...once];
    }
    
    /**
     * Проверка наличия обработчиков для события
     * @param {string} event - Имя события
     * @returns {boolean} true, если есть хотя бы один обработчик
     */
    hasListeners(event) {
        return (
            (this.listeners[event] && this.listeners[event].length > 0) ||
            (this.onceListeners[event] && this.onceListeners[event].length > 0)
        );
    }
    
    /**
     * Очистка всех обработчиков
     */
    clearAll() {
        this.listeners = {};
        this.onceListeners = {};
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('EventBus: All listeners cleared');
        } else {
            console.log('EventBus: All listeners cleared');
        }
    }
}

// Создаем глобальный экземпляр шины событий
window.EventBus = new EventBusClass();