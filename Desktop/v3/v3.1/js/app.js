/**
 * Главный файл приложения
 * Инициализирует и координирует работу всех компонентов
 */

// Глобальный объект приложения
const App = {
    // Имя и версия приложения
    name: 'DMARC Domain Scanner',
    version: '2.0.0',
    
    // Флаг инициализации
    initialized: false,
    
    /**
     * Инициализация приложения
     */
    init() {
        try {
            // Проверяем, инициализировано ли уже приложение
            if (this.initialized) {
                console.warn('App already initialized');
                return;
            }
            
            console.log(`Initializing ${this.name} v${this.version}...`);
            
            // Проверяем доступность необходимых компонентов
            this._checkDependencies();
            
            // Инициализируем логгер
            if (window.Logger) {
                const logLevel = StorageManager.get('log_level', { defaultValue: 'info' });
                window.Logger.setLevel(logLevel);
                window.Logger.info(`${this.name} v${this.version} initializing...`);
            }
            
            // Подписываемся на события загрузки DOM
            document.addEventListener('DOMContentLoaded', this._onDomLoaded.bind(this));
            
            // Устанавливаем обработчики глобальных событий
            this._setupGlobalHandlers();
            
            this.initialized = true;
            
            if (window.Logger) {
                window.Logger.info(`${this.name} v${this.version} initialized`);
            } else {
                console.log(`${this.name} v${this.version} initialized`);
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            
            if (window.Logger) {
                window.Logger.error('Error initializing app', error);
            }
            
            // Показываем сообщение об ошибке инициализации
            this._showFatalError('Ошибка инициализации приложения', error);
        }
    },
    
    /**
     * Проверка зависимостей приложения
     * @private
     */
    _checkDependencies() {
        // Проверяем наличие необходимых глобальных объектов и функций
        const requiredDependencies = [
            { name: 'DOMUtils', obj: window.DOMUtils },
            { name: 'StorageManager', obj: window.StorageManager },
            { name: 'EventBus', obj: window.EventBus },
            { name: 'Logger', obj: window.Logger }
        ];
        
        const missingDependencies = requiredDependencies.filter(dep => !dep.obj);
        
        if (missingDependencies.length > 0) {
            const missingNames = missingDependencies.map(dep => dep.name).join(', ');
            throw new Error(`Missing required dependencies: ${missingNames}`);
        }
    },
    
    /**
     * Обработчик загрузки DOM
     * @private
     */
    _onDomLoaded() {
        try {
            if (window.Logger) {
                window.Logger.info('DOM loaded, initializing UI components');
            }
            
            // Проверяем и инициализируем взаимодействие между компонентами
            this._setupComponentInteractions();
            
            // Обновляем информацию о версии
            this._updateVersionInfo();
            
            // Проверяем наличие сохраненных настроек
            this._loadSavedSettings();
            
            // Скрываем прелоадер, если он есть
            this._hidePreloader();
            
            if (window.Logger) {
                window.Logger.info('App initialization completed');
            }
            
            // Генерируем событие о готовности приложения
            if (window.EventBus) {
                window.EventBus.emit('app:ready');
            }
        } catch (error) {
            console.error('Error in DOM loaded handler:', error);
            
            if (window.Logger) {
                window.Logger.error('Error initializing UI components', error);
            }
            
            // Показываем сообщение об ошибке инициализации UI
            this._showFatalError('Ошибка инициализации интерфейса', error);
        }
    },
    
    /**
     * Настройка взаимодействия между компонентами
     * @private
     */
    _setupComponentInteractions() {
        // Проверяем, доступны ли все необходимые компоненты
        const requiredComponents = [
            { name: 'dmarcClient', obj: window.dmarcClient },
            { name: 'resultsManager', obj: window.resultsManager },
            { name: 'tableManager', obj: window.tableManager },
            { name: 'exportService', obj: window.exportService },
            { name: 'uiManager', obj: window.uiManager },
            { name: 'filtersManager', obj: window.filtersManager }
        ];
        
        const missingComponents = requiredComponents.filter(comp => !comp.obj);
        
        if (missingComponents.length > 0) {
            const missingNames = missingComponents.map(comp => comp.name).join(', ');
            throw new Error(`Missing required components: ${missingNames}`);
        }
        
        // Настраиваем дополнительные обработчики событий между компонентами
        this._setupAdditionalEventHandlers();
    },
    
    /**
     * Настройка дополнительных обработчиков событий
     * @private
     */
    _setupAdditionalEventHandlers() {
        // Проверяем наличие EventBus
        if (!window.EventBus) return;
        
        // Обработка события очистки результатов
        window.EventBus.on('results:cleared', () => {
            // Сбрасываем прогресс-бар
            const progressBar = DOMUtils.getById('progressBar');
            const progressText = DOMUtils.getById('progressText');
            
            if (progressBar) {
                DOMUtils.animationFrame(() => {
                    progressBar.style.width = '0%';
                });
            }
            
            if (progressText) {
                progressText.textContent = 'Готов к сканированию';
            }
            
            // Отключаем кнопки экспорта
            const exportBtns = document.querySelectorAll('.export-btn');
            exportBtns.forEach(btn => btn.disabled = true);
            
            if (window.Logger) {
                window.Logger.info('Results cleared');
            }
        });
        
        // Обработка события изменения темы
        window.EventBus.on('theme:changed', (theme) => {
            // Обновляем метатеги для мобильных устройств
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.content = theme === 'dark' ? '#121212' : '#ffffff';
            }
            
            if (window.Logger) {
                window.Logger.debug(`Theme changed to ${theme}`);
            }
        });
    },
    
    /**
     * Настройка глобальных обработчиков
     * @private
     */
    _setupGlobalHandlers() {
        // Обработка необработанных исключений
        window.addEventListener('error', (event) => {
            if (window.Logger) {
                window.Logger.error('Unhandled error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            }
            
            // Предотвращаем стандартное поведение браузера (показ диалога ошибки)
            event.preventDefault();
            
            // Показываем сообщение пользователю
            this._showError('Произошла ошибка', event.message);
            
            return true;
        });
        
        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (event) => {
            if (window.Logger) {
                window.Logger.error('Unhandled promise rejection', {
                    reason: event.reason
                });
            }
            
            // Предотвращаем стандартное поведение браузера
            event.preventDefault();
            
            // Показываем сообщение пользователю
            const message = event.reason ? (event.reason.message || String(event.reason)) : 'Неизвестная причина';
            this._showError('Необработанная ошибка асинхронной операции', message);
            
            return true;
        });
        
        // Обработка события перед закрытием страницы
        window.addEventListener('beforeunload', (event) => {
            // Проверяем, идет ли сканирование
            if (window.dmarcClient && window.dmarcClient.getScanStatus().isScanning) {
                // Предупреждаем пользователя о потере данных
                const message = 'Сканирование не завершено. Вы уверены, что хотите покинуть страницу? Данные могут быть потеряны.';
                event.returnValue = message;
                return message;
            }
        });
    },
    
    /**
     * Обновление информации о версии в UI
     * @private
     */
    _updateVersionInfo() {
        // Проверяем, есть ли элемент для отображения версии
        const versionElement = document.querySelector('.app-version');
        if (versionElement) {
            versionElement.textContent = `v${this.version}`;
        }
    },
    
   /**
 * Загрузка сохраненных настроек
 * @private
 */
_loadSavedSettings() {
    // Проверяем наличие StorageManager
    if (!window.StorageManager) return;
    
    // Проверяем, доступно ли хранилище (используем корректное имя функции)
    if (typeof window.StorageManager.isAvailable === 'function' && !window.StorageManager.isAvailable()) {
        if (window.Logger) {
            window.Logger.warn('Local storage is not available, settings won\'t be saved');
        }
        return;
    }
    
    // Загружаем настройки в UI
    if (window.uiManager) {
        window.uiManager.loadSettingsToForm();
    }
},
    
    /**
     * Скрытие прелоадера
     * @private
     */
    _hidePreloader() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'none';
        }
    },
    
    /**
     * Показать критическую ошибку
     * @param {string} title - Заголовок ошибки
     * @param {Error|string} error - Объект ошибки или сообщение
     * @private
     */
    _showFatalError(title, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        
        // Создаем элемент с сообщением об ошибке
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fatal-error';
        errorContainer.innerHTML = `
            <div class="fatal-error-content">
                <h2>${title}</h2>
                <p>${errorMessage}</p>
                <p>Попробуйте перезагрузить страницу. Если проблема повторяется, обратитесь к администратору.</p>
                <button onclick="location.reload()">Перезагрузить страницу</button>
            </div>
        `;
        
        // Добавляем стили
        const style = document.createElement('style');
        style.textContent = `
            .fatal-error {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }
            .fatal-error-content {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                text-align: center;
            }
            .fatal-error h2 {
                color: #f44336;
                margin-top: 0;
            }
            .fatal-error button {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 15px;
            }
            .fatal-error button:hover {
                background-color: #45a049;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(errorContainer);
    },
    
    /**
     * Показать сообщение об ошибке
     * @param {string} title - Заголовок ошибки
     * @param {string} message - Сообщение об ошибке
     * @private
     */
    _showError(title, message) {
        alert(`${title}: ${message}`);
    }
};

// Инициализация приложения
App.init();