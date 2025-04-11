/**
 * Компонент для выбора режима работы DMARC-клиента
 * Позволяет переключаться между различными режимами проверки доменов
 */
class ModeSelectorUI {
    constructor() {
        // DOM элементы
        this.modeSelector = null;
        this.modeStatusMessage = null;
        this.checkModeBtn = null;
        this.modeIndicator = null;
        
        // Флаг инициализации
        this.initialized = false;
        
        // Инициализация компонента
        this._init();
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('ModeSelectorUI initialized');
        } else {
            console.log('ModeSelectorUI initialized');
        }
    }
    
    /**
     * Инициализация компонента
     * @private
     */
    _init() {
        try {
            // Проверяем, что элементы интерфейса существуют или создаем их
            if (!this._createUIElements()) {
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error('Failed to create UI elements for ModeSelectorUI');
                } else {
                    console.error('Failed to create UI elements for ModeSelectorUI');
                }
                return;
            }
            
            // Загружаем текущий режим
            this._loadCurrentMode();
            
            // Инициализируем обработчики событий
            this._setupEventListeners();
            
            this.initialized = true;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error initializing ModeSelectorUI', error);
            } else {
                console.error('Error initializing ModeSelectorUI', error);
            }
        }
    }
    
    /**
     * Создание элементов пользовательского интерфейса
     * @returns {boolean} - Успешно ли созданы элементы
     * @private
     */
    _createUIElements() {
        try {
            // Создаем переключатель режима в панели настроек
            this._createModeSwitch();
            
            // Создаем индикатор режима в заголовке
            this._createModeIndicator();
            
            return true;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error creating UI elements', error);
            } else {
                console.error('Error creating UI elements', error);
            }
            return false;
        }
    }
    
    /**
     * Создание переключателя режима в панели настроек
     * @private
     */
    _createModeSwitch() {
        // Проверяем, существует ли панель настроек
        const settingsPanel = DOMUtils.getById('settingsPanel');
        if (!settingsPanel) {
            throw new Error('Settings panel not found');
        }
        
        // Создаем группу настроек режима
        const modeSettingsGroup = DOMUtils.createElement('div', {
            class: 'settings-group'
        });
        
        // Создаем содержимое группы
        modeSettingsGroup.innerHTML = `
            <label for="clientMode">Режим проверки:</label>
            <select id="clientMode" class="settings-select">
                <option value="api">API EasyDMARC (онлайн)</option>
                <option value="web">Web EasyDMARC (онлайн)</option>
                <option value="offline">Офлайн (DNS)</option>
                <option value="simulation">Симуляция</option>
            </select>
            <button id="checkModeAvailability" class="small-btn" type="button">Проверить доступность</button>
            <p id="modeStatusMessage" style="margin-top: 5px; font-size: 12px;"></p>
        `;
        
        // Находим, куда добавить группу настроек (перед кнопкой сохранения)
        const saveSettingsBtn = DOMUtils.getById('saveSettingsBtn');
        if (saveSettingsBtn && saveSettingsBtn.parentNode) {
            saveSettingsBtn.parentNode.before(modeSettingsGroup);
        } else {
            // Если кнопка не найдена, добавляем в конец панели
            settingsPanel.appendChild(modeSettingsGroup);
        }
        
        // Сохраняем ссылки на созданные элементы
        this.modeSelector = DOMUtils.getById('clientMode');
        this.modeStatusMessage = DOMUtils.getById('modeStatusMessage');
        this.checkModeBtn = DOMUtils.getById('checkModeAvailability');
    }
    
    /**
     * Создание индикатора режима в заголовке
     * @private
     */
    _createModeIndicator() {
        // Находим заголовок приложения
        const headerTitle = document.querySelector('h1');
        if (!headerTitle) {
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn('Header title not found for mode indicator');
            } else {
                console.warn('Header title not found for mode indicator');
            }
            return;
        }
        
        // Создаем индикатор режима
        const modeIndicator = DOMUtils.createElement('div', {
            class: 'mode-indicator'
        });
        
        modeIndicator.innerHTML = `
            <span class="mode-label">Режим:</span>
            <span class="mode-value" id="currentModeDisplay">загрузка...</span>
        `;
        
        // Добавляем стили
        this._addModeIndicatorStyles();
        
        // Вставляем после заголовка
        headerTitle.appendChild(modeIndicator);
        
        // Сохраняем ссылку на индикатор
        this.modeIndicator = DOMUtils.getById('currentModeDisplay');
    }
    
    /**
     * Добавление стилей для индикатора режима
     * @private
     */
    _addModeIndicatorStyles() {
        if (document.getElementById('mode-indicator-styles')) {
            return; // Стили уже добавлены
        }
        
        const styleElement = DOMUtils.createElement('style', {
            id: 'mode-indicator-styles'
        });
        
        styleElement.textContent = `
            .mode-indicator {
                display: inline-block;
                margin-left: 15px;
                font-size: 14px;
                padding: 3px 8px;
                background-color: var(--filter-panel-bg);
                border-radius: 4px;
                vertical-align: middle;
            }
            .mode-label {
                color: var(--text-secondary);
                margin-right: 5px;
            }
            .mode-value {
                font-weight: bold;
            }
            .mode-api {
                color: var(--success-color);
            }
            .mode-web {
                color: var(--info-color);
            }
            .mode-offline {
                color: var(--warning-color);
            }
            .mode-simulation {
                color: var(--debug-color);
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Обработчик для кнопки проверки доступности режимов
        if (this.checkModeBtn) {
            this.checkModeBtn.addEventListener('click', this._handleCheckModeClick.bind(this));
        }
        
        // Обработчик для сохранения настроек
        const saveSettingsBtn = DOMUtils.getById('saveSettingsBtn');
        if (saveSettingsBtn) {
            // Сохраняем оригинальный обработчик
            const originalClickHandler = saveSettingsBtn.onclick;
            
            // Заменяем обработчик
            saveSettingsBtn.onclick = (event) => {
                // Сохраняем выбранный режим
                this._saveSelectedMode();
                
                // Вызываем оригинальный обработчик, если он был
                if (typeof originalClickHandler === 'function') {
                    return originalClickHandler.call(saveSettingsBtn, event);
                }
            };
        }
        
        // Подписываемся на события изменения режима
        if (window.EventBus && typeof window.EventBus.on === 'function') {
            window.EventBus.on('dmarc_client:mode_changed', this._handleModeChanged.bind(this));
        }
    }
    
    /**
     * Загрузка текущего режима
     * @private
     */
    _loadCurrentMode() {
        try {
            // Получаем текущий режим из клиента
            const currentMode = window.dmarcClient ? window.dmarcClient.getMode() : 'simulation';
            
            // Устанавливаем значение в селекте
            if (this.modeSelector) {
                this.modeSelector.value = currentMode;
            }
            
            // Обновляем индикатор режима
            this._updateModeIndicator(currentMode);
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error loading current mode', error);
            } else {
                console.error('Error loading current mode', error);
            }
        }
    }
    
    /**
     * Обработчик клика по кнопке проверки доступности режимов
     * @private
     */
    async _handleCheckModeClick() {
        if (!this.checkModeBtn || !window.dmarcClient) return;
        
        try {
            // Отключаем кнопку на время проверки
            this.checkModeBtn.disabled = true;
            
            // Показываем статус проверки
            if (this.modeStatusMessage) {
                this.modeStatusMessage.textContent = 'Проверка доступности...';
                this.modeStatusMessage.style.color = '';
            }
            
            // Выбираем наилучший доступный режим
            const bestMode = await window.dmarcClient.selectBestAvailableMode();
            
            // Обновляем селект
            if (this.modeSelector) {
                this.modeSelector.value = bestMode;
            }
            
            // Сохраняем выбранный режим
            this._saveSelectedMode(bestMode);
            
            // Обновляем индикатор режима
            this._updateModeIndicator(bestMode);
            
            // Показываем сообщение об успехе
            if (this.modeStatusMessage) {
                this.modeStatusMessage.textContent = `Выбран режим: ${this._getModeDisplayName(bestMode)}`;
                this.modeStatusMessage.style.color = 'var(--success-color)';
            }
            
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`Switched to best available mode: ${bestMode}`);
            } else {
                console.log(`Switched to best available mode: ${bestMode}`);
            }
        } catch (error) {
            // Показываем сообщение об ошибке
            if (this.modeStatusMessage) {
                this.modeStatusMessage.textContent = `Ошибка: ${error.message}`;
                this.modeStatusMessage.style.color = 'var(--error-color)';
            }
            
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error selecting best mode', error);
            } else {
                console.error('Error selecting best mode', error);
            }
        } finally {
            // Включаем кнопку
            this.checkModeBtn.disabled = false;
        }
    }
    
    /**
     * Обработчик изменения режима
     * @param {string} mode - Новый режим
     * @private
     */
    _handleModeChanged(mode) {
        // Обновляем селект
        if (this.modeSelector) {
            this.modeSelector.value = mode;
        }
        
        // Обновляем индикатор режима
        this._updateModeIndicator(mode);
        
        // Обновляем прогресс-бар с информацией о режиме
        this._updateProgressText(mode);
    }
    
    /**
     * Сохранение выбранного режима
     * @param {string} [mode] - Режим для сохранения (если не указан, берется из селекта)
     * @private
     */
    _saveSelectedMode(mode) {
        try {
            // Если режим не указан, берем из селекта
            if (!mode && this.modeSelector) {
                mode = this.modeSelector.value;
            }
            
            if (!mode) return;
            
            // Устанавливаем режим в клиенте
            if (window.dmarcClient) {
                window.dmarcClient.setMode(mode);
            }
            
            // Сохраняем в хранилище
            if (window.StorageManager && typeof window.StorageManager.set === 'function') {
                window.StorageManager.set('dmarc_client_mode', mode);
            }
            
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`DMARC client mode set to ${mode}`);
            } else {
                console.log(`DMARC client mode set to ${mode}`);
            }
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error saving mode', error);
            } else {
                console.error('Error saving mode', error);
            }
        }
    }
    
    /**
     * Обновление индикатора режима
     * @param {string} mode - Режим
     * @private
     */
    _updateModeIndicator(mode) {
        if (!this.modeIndicator) return;
        
        // Получаем название режима для отображения
        const displayName = this._getModeDisplayName(mode);
        
        // Обновляем текст
        this.modeIndicator.textContent = displayName;
        
        // Удаляем все классы режимов
        this.modeIndicator.classList.remove('mode-api', 'mode-web', 'mode-offline', 'mode-simulation');
        
        // Добавляем класс для текущего режима
        this.modeIndicator.classList.add(`mode-${mode}`);
    }
    
    /**
     * Обновление текста прогресса с информацией о режиме
     * @param {string} mode - Режим
     * @private
     */
    _updateProgressText(mode) {
        const progressText = DOMUtils.getById('progressText');
        if (!progressText) return;
        
        // Получаем текущий текст прогресса
        const currentText = progressText.textContent || '';
        
        // Если сканирование не запущено, обновляем текст
        if (currentText.includes('Готов') || currentText.includes('Режим')) {
            const displayName = this._getModeDisplayName(mode);
            progressText.textContent = `Режим проверки: ${displayName}`;
        }
    }
    
    /**
     * Получение имени режима для отображения
     * @param {string} mode - Код режима
     * @returns {string} - Имя режима для отображения
     * @private
     */
    _getModeDisplayName(mode) {
        const modeNames = {
            'api': 'API EasyDMARC (онлайн)',
            'web': 'Web EasyDMARC (онлайн)',
            'offline': 'Офлайн (DNS)',
            'simulation': 'Симуляция'
        };
        
        return modeNames[mode] || mode;
    }
}

// Делаем класс ModeSelectorUI доступным глобально
window.ModeSelectorUI = ModeSelectorUI;

// Создаем глобальный экземпляр селектора режима после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Ждем небольшую задержку, чтобы убедиться, что dmarcClient инициализирован
    setTimeout(() => {
        if (!window.modeSelectorUI) {
            window.modeSelectorUI = new ModeSelectorUI();
        }
    }, 500);
});