/**
 * Модуль логирования
 * Обеспечивает централизованную систему логирования с разными уровнями важности
 */
class LoggerClass {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.levelColors = {
            error: 'var(--error-color)',
            warn: 'var(--warning-color)',
            info: 'var(--info-color)',
            debug: 'var(--debug-color)'
        };
        
        // Установка уровня логирования по умолчанию
        this.setLevel(this._getStoredLevel() || 'info');
        
        // Максимальное количество логов в памяти
        this.maxLogsCount = 500;
        
        // Массив для хранения логов
        this.logs = [];
        
        // Флаг для отключения логирования
        this.enabled = true;
        
        console.log('Logger initialized');
    }
    
    /**
     * Получение уровня логирования из localStorage
     * @private
     * @returns {string} Уровень логирования
     */
    _getStoredLevel() {
        try {
            return localStorage.getItem('dmarc_scanner_log_level');
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Установка уровня логирования
     * @param {string} level - Уровень логирования (error, warn, info, debug)
     */
    setLevel(level) {
        if (!this.levels.hasOwnProperty(level)) {
            level = 'info';
        }
        
        this.currentLevel = level;
        this.currentLevelValue = this.levels[level];
        
        try {
            localStorage.setItem('dmarc_scanner_log_level', level);
        } catch (e) {
            // Игнорируем ошибки localStorage
        }
        
        this.info(`Log level set to: ${level}`);
    }
    
    /**
     * Создание записи лога
     * @private
     * @param {string} level - Уровень лога
     * @param {string} message - Сообщение
     * @param {Object} [data] - Дополнительные данные для лога
     * @returns {Object} Объект лога
     */
    _createLogEntry(level, message, data) {
        const timestamp = new Date();
        const entry = {
            timestamp,
            timeString: timestamp.toLocaleTimeString(),
            level,
            message,
            data
        };
        
        // Добавляем лог в массив с ограничением размера
        this.logs.push(entry);
        if (this.logs.length > this.maxLogsCount) {
            this.logs.shift();
        }
        
        return entry;
    }
    
    /**
     * Логирование сообщения об ошибке
     * @param {string} message - Сообщение
     * @param {Object} [data] - Дополнительные данные
     */
    error(message, data) {
        if (!this.enabled) return;
        
        const entry = this._createLogEntry('error', message, data);
        console.error(message, data !== undefined ? data : '');
        
        // Генерируем событие для обновления UI
        if (window.EventBus) {
            window.EventBus.emit('log:new', entry);
        }
    }
    
    /**
     * Логирование предупреждения
     * @param {string} message - Сообщение
     * @param {Object} [data] - Дополнительные данные
     */
    warn(message, data) {
        if (!this.enabled || this.currentLevelValue < this.levels.warn) return;
        
        const entry = this._createLogEntry('warn', message, data);
        console.warn(message, data !== undefined ? data : '');
        
        if (window.EventBus) {
            window.EventBus.emit('log:new', entry);
        }
    }
    
    /**
     * Логирование информационного сообщения
     * @param {string} message - Сообщение
     * @param {Object} [data] - Дополнительные данные
     */
    info(message, data) {
        if (!this.enabled || this.currentLevelValue < this.levels.info) return;
        
        const entry = this._createLogEntry('info', message, data);
        console.info(message, data !== undefined ? data : '');
        
        if (window.EventBus) {
            window.EventBus.emit('log:new', entry);
        }
    }
    
    /**
     * Логирование отладочного сообщения
     * @param {string} message - Сообщение
     * @param {Object} [data] - Дополнительные данные
     */
    debug(message, data) {
        if (!this.enabled || this.currentLevelValue < this.levels.debug) return;
        
        const entry = this._createLogEntry('debug', message, data);
        console.debug(message, data !== undefined ? data : '');
        
        if (window.EventBus) {
            window.EventBus.emit('log:new', entry);
        }
    }
    
    /**
     * Очистка логов
     */
    clear() {
        this.logs = [];
        console.clear();
        
        if (window.EventBus) {
            window.EventBus.emit('log:cleared');
        }
        
        this.info('Logs cleared');
    }
    
    /**
     * Получение всех логов
     * @returns {Array} Массив логов
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * Включение логирования
     */
    enable() {
        this.enabled = true;
        this.info('Logging enabled');
    }
    
    /**
     * Отключение логирования
     */
    disable() {
        this.info('Logging disabled');
        this.enabled = false;
    }
}

// Создаем глобальный экземпляр логгера
window.Logger = new LoggerClass();