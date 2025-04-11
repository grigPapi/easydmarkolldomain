/**
 * Менеджер темы приложения (светлая/темная)
 * Управляет переключением и сохранением выбранной темы
 */
class ThemeManager {
    constructor() {
        // DOM элементы
        this.themeSwitch = DOMUtils.getById('themeSwitch');
        this.themeSwitchLabel = DOMUtils.getById('themeSwitchLabel');
        
        // Ключ для localStorage
        this.storageKey = 'theme';
        
        // Инициализация темы
        this._initTheme();
        
        // Установка обработчиков событий
        this._setupEventListeners();
        
        Logger.debug('ThemeManager initialized');
    }
    
    /**
     * Инициализация выбранной темы
     * @private
     */
    _initTheme() {
        // Проверяем предпочтения пользователя из localStorage
        const savedTheme = StorageManager.get(this.storageKey, { defaultValue: null });
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Если сохранена тема, применяем её, иначе смотрим на системные предпочтения
        if (savedTheme) {
            this._applyTheme(savedTheme);
        } else if (prefersDarkScheme) {
            this._applyTheme('dark');
        } else {
            this._applyTheme('light');
        }
    }
    
    /**
     * Установка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        if (this.themeSwitch) {
            this.themeSwitch.addEventListener('change', this._handleThemeToggle.bind(this));
        } else {
            Logger.warn('Theme switch element not found');
        }
        
        // Отслеживаем изменение системных предпочтений
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this._handleSystemThemeChange.bind(this));
    }
    
    /**
     * Обработчик переключения темы
     * @param {Event} event - Событие изменения состояния переключателя
     * @private
     */
    _handleThemeToggle(event) {
        const isDarkTheme = event.target.checked;
        const theme = isDarkTheme ? 'dark' : 'light';
        
        this._applyTheme(theme);
        this._saveThemePreference(theme);
    }
    
    /**
     * Обработчик изменения системной темы
     * @param {MediaQueryListEvent} event - Событие изменения медиа-запроса
     * @private
     */
    _handleSystemThemeChange(event) {
        // Меняем тему только если нет сохраненных пользовательских предпочтений
        if (!StorageManager.get(this.storageKey)) {
            const theme = event.matches ? 'dark' : 'light';
            this._applyTheme(theme);
        }
    }
    
    /**
     * Применение выбранной темы
     * @param {string} theme - Название темы ('dark' или 'light')
     * @private
     */
    _applyTheme(theme) {
        // Устанавливаем атрибут data-theme для HTML
        document.documentElement.setAttribute('data-theme', theme);
        
        // Обновляем состояние переключателя
        if (this.themeSwitch) {
            this.themeSwitch.checked = theme === 'dark';
        }
        
        // Обновляем текст метки
        if (this.themeSwitchLabel) {
            this.themeSwitchLabel.textContent = theme === 'dark' ? 'Темная тема' : 'Светлая тема';
        }
        
        Logger.info(`Theme switched to ${theme}`);
        
        // Оповещаем об изменении темы
        EventBus.emit('theme:changed', theme);
    }
    
    /**
     * Сохранение выбранной темы в localStorage
     * @param {string} theme - Название темы ('dark' или 'light')
     * @private
     */
    _saveThemePreference(theme) {
        StorageManager.set(this.storageKey, theme);
        Logger.debug(`Theme preference saved: ${theme}`);
    }
    
    /**
     * Получение текущей темы
     * @returns {string} Название текущей темы ('dark' или 'light')
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
    
    /**
     * Переключение на темную тему
     */
    setDarkTheme() {
        this._applyTheme('dark');
        this._saveThemePreference('dark');
    }
    
    /**
     * Переключение на светлую тему
     */
    setLightTheme() {
        this._applyTheme('light');
        this._saveThemePreference('light');
    }
    
    /**
     * Переключение текущей темы на противоположную
     */
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this._applyTheme(newTheme);
        this._saveThemePreference(newTheme);
    }
}

// Инициализация менеджера темы после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});