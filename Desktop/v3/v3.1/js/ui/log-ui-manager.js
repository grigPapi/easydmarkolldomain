/**
 * Менеджер UI для журнала событий
 * Отображает логи в интерфейсе пользователя
 */
class LogUIManager {
    constructor() {
        // DOM элементы
        this.logsContainer = DOMUtils.getById('logsContainer');
        this.clearLogsBtn = DOMUtils.getById('clearLogsBtn');
        this.toggleLogsBtn = DOMUtils.getById('toggleLogsBtn');
        
        // Шаблон записи лога
        this.logItemTemplate = DOMUtils.getById('logItemTemplate');
        
        // Максимальное количество отображаемых логов
        this.maxDisplayedLogs = 100;
        
        // Флаг свернутой панели
        this.isCollapsed = false;
        
        // Инициализация обработчиков событий
        this._setupEventListeners();
        
        // Загрузка начальных логов
        this._loadInitialLogs();
        
        Logger.debug('LogUIManager initialized');
    }
    
    /**
     * Установка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Кнопка очистки логов
        if (this.clearLogsBtn) {
            this.clearLogsBtn.addEventListener('click', this._handleClearLogs.bind(this));
        }
        
        // Кнопка сворачивания/разворачивания панели логов
        if (this.toggleLogsBtn) {
            this.toggleLogsBtn.addEventListener('click', this._handleToggleLogs.bind(this));
        }
        
        // Подписка на новые логи
        EventBus.on('log:new', this._handleNewLog.bind(this));
        EventBus.on('log:cleared', this._handleLogCleared.bind(this));
    }
    
    /**
     * Загрузка начальных логов
     * @private
     */
    _loadInitialLogs() {
        if (!this.logsContainer || !window.Logger) return;
        
        // Получаем все логи
        const logs = window.Logger.getLogs();
        
        // Ограничиваем количество отображаемых логов
        const logsToDisplay = logs.slice(-this.maxDisplayedLogs);
        
        // Очищаем контейнер
        DOMUtils.empty(this.logsContainer);
        
        // Добавляем логи
        logsToDisplay.forEach(log => {
            this._addLogToUI(log);
        });
    }
    
    /**
     * Обработчик очистки логов
     * @private
     */
    _handleClearLogs() {
        if (window.Logger) {
            window.Logger.clear();
        }
    }
    
    /**
     * Обработчик сворачивания/разворачивания панели логов
     * @private
     */
    _handleToggleLogs() {
        if (!this.logsContainer || !this.toggleLogsBtn) return;
        
        this.isCollapsed = !this.isCollapsed;
        
        // Изменяем стиль контейнера
        this.logsContainer.style.height = this.isCollapsed ? '42px' : '200px';
        
        // Изменяем текст кнопки
        this.toggleLogsBtn.textContent = this.isCollapsed ? 'Развернуть' : 'Свернуть';
        
        Logger.debug(`Log panel ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
    }
    
    /**
     * Обработчик появления нового лога
     * @param {Object} log - Объект лога
     * @private
     */
    _handleNewLog(log) {
        if (!this.logsContainer) return;
        
        // Добавляем лог в UI
        this._addLogToUI(log);
        
        // Ограничиваем количество отображаемых логов
        this._limitDisplayedLogs();
    }
    
    /**
     * Обработчик очистки логов
     * @private
     */
    _handleLogCleared() {
        if (!this.logsContainer) return;
        
        // Очищаем контейнер
        DOMUtils.empty(this.logsContainer);
    }
    
    /**
     * Добавление лога в UI
     * @param {Object} log - Объект лога
     * @private
     */
    _addLogToUI(log) {
        if (!this.logsContainer || !this.logItemTemplate) return;
        
        // Клонируем шаблон
        const logElement = this.logItemTemplate.content.cloneNode(true);
        
        // Заполняем данными
        const logItem = logElement.querySelector('.log-item');
        const timeElement = logElement.querySelector('.log-time');
        const levelElement = logElement.querySelector('.log-level');
        const messageElement = logElement.querySelector('.log-message');
        
        // Устанавливаем класс в зависимости от уровня лога
        logItem.classList.add(`log-level-${log.level}`);
        
        // Заполняем элементы
        timeElement.textContent = log.timeString;
        levelElement.textContent = log.level.toUpperCase();
        messageElement.textContent = log.message;
        
        // Добавляем дополнительный класс для уровня
        levelElement.classList.add(`level-${log.level}`);
        
        // Добавляем элемент в контейнер
        DOMUtils.animationFrame(() => {
            this.logsContainer.appendChild(logElement);
            
            // Прокручиваем к последнему логу
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        });
    }
    
    /**
     * Ограничение количества отображаемых логов
     * @private
     */
    _limitDisplayedLogs() {
        if (!this.logsContainer) return;
        
        // Получаем все элементы логов
        const logItems = this.logsContainer.querySelectorAll('.log-item');
        
        // Если количество логов превышает максимальное, удаляем старые
        if (logItems.length > this.maxDisplayedLogs) {
            const itemsToRemove = logItems.length - this.maxDisplayedLogs;
            
            for (let i = 0; i < itemsToRemove; i++) {
                if (logItems[i].parentNode) {
                    logItems[i].parentNode.removeChild(logItems[i]);
                }
            }
        }
    }
    
    /**
     * Добавление лога ошибки в UI
     * @param {string} message - Сообщение ошибки
     */
    addErrorLog(message) {
        if (window.Logger) {
            window.Logger.error(message);
        } else {
            // Если логгер недоступен, добавляем лог напрямую
            const log = {
                timestamp: new Date(),
                timeString: new Date().toLocaleTimeString(),
                level: 'error',
                message: message
            };
            
            this._addLogToUI(log);
        }
    }
    
    /**
     * Добавление информационного лога в UI
     * @param {string} message - Информационное сообщение
     */
    addInfoLog(message) {
        if (window.Logger) {
            window.Logger.info(message);
        } else {
            // Если логгер недоступен, добавляем лог напрямую
            const log = {
                timestamp: new Date(),
                timeString: new Date().toLocaleTimeString(),
                level: 'info',
                message: message
            };
            
            this._addLogToUI(log);
        }
    }
    
    /**
     * Свернуть панель логов
     */
    collapse() {
        if (this.isCollapsed) return;
        
        this._handleToggleLogs();
    }
    
    /**
     * Развернуть панель логов
     */
    expand() {
        if (!this.isCollapsed) return;
        
        this._handleToggleLogs();
    }
}

// Создаем глобальный экземпляр менеджера UI для логов после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.logUIManager = new LogUIManager();
    
    // Добавляем стили для логов, если их еще нет
    if (!document.getElementById('log-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'log-styles';
        styleEl.textContent = `
            .log-panel {
                background-color: var(--log-bg);
                border: 1px solid var(--log-border);
                border-radius: 8px;
                margin-top: 20px;
                overflow: hidden;
            }
            
            .log-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid var(--log-border);
                background-color: var(--filter-panel-bg);
            }
            
            .log-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .log-controls {
                display: flex;
                gap: 5px;
            }
            
            .logs-container {
                height: 200px;
                overflow-y: auto;
                padding: 10px;
                font-family: monospace;
                font-size: 13px;
                transition: height 0.3s ease;
            }
            
            .log-item {
                margin-bottom: 5px;
                padding: 3px 0;
                border-bottom: 1px solid var(--log-border);
                display: flex;
                align-items: flex-start;
            }
            
            .log-time {
                color: var(--text-secondary);
                margin-right: 10px;
                min-width: 80px;
            }
            
            .log-level {
                font-weight: bold;
                margin-right: 10px;
                min-width: 70px;
                text-align: center;
                padding: 1px 5px;
                border-radius: 3px;
            }
            
            .level-error {
                background-color: rgba(244, 67, 54, 0.2);
                color: var(--error-color);
            }
            
            .level-warn {
                background-color: rgba(255, 152, 0, 0.2);
                color: var(--warning-color);
            }
            
            .level-info {
                background-color: rgba(33, 150, 243, 0.2);
                color: var(--info-color);
            }
            
            .level-debug {
                background-color: rgba(158, 158, 158, 0.2);
                color: var(--debug-color);
            }
            
            .log-message {
                flex-grow: 1;
                word-break: break-word;
            }
            
            /* Стили для свернутой панели */
            .logs-container[style*="height: 42px"] {
                overflow: hidden;
            }
            
            .logs-container[style*="height: 42px"] .log-item {
                display: none;
            }
            
            .logs-container[style*="height: 42px"] .log-item:last-child {
                display: flex;
                margin-bottom: 0;
                border-bottom: none;
            }
        `;
        document.head.appendChild(styleEl);
    }
});