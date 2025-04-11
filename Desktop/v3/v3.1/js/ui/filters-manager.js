/**
 * Менеджер фильтров для результатов сканирования
 * Управляет фильтрацией результатов по различным критериям
 */
class FiltersManager {
    constructor() {
        // DOM элементы фильтров
        this.filterDmarc = DOMUtils.getById('filterDmarc');
        this.filterSpf = DOMUtils.getById('filterSpf');
        this.filterDkim = DOMUtils.getById('filterDkim');
        this.filterScore = DOMUtils.getById('filterScore');
        this.searchDomain = DOMUtils.getById('searchDomain');
        
        // Текущие значения фильтров
        this.currentFilters = {
            dmarc: 'all',
            spf: 'all',
            dkim: 'all',
            score: 0,
            domain: ''
        };
        
        // Инициализация событий
        this._setupEventListeners();
        
        // Инициализация дебаунс-функций
        this._initDebounce();
        
        Logger.debug('FiltersManager initialized');
    }
    
    /**
     * Установка обработчиков событий для фильтров
     * @private
     */
    _setupEventListeners() {
        // DMARC фильтр
        if (this.filterDmarc) {
            this.filterDmarc.addEventListener('change', this._handleDmarcChange.bind(this));
        }
        
        // SPF фильтр
        if (this.filterSpf) {
            this.filterSpf.addEventListener('change', this._handleSpfChange.bind(this));
        }
        
        // DKIM фильтр
        if (this.filterDkim) {
            this.filterDkim.addEventListener('change', this._handleDkimChange.bind(this));
        }
        
        // Фильтр по оценке безопасности
        if (this.filterScore) {
            this.filterScore.addEventListener('input', this._handleScoreChange.bind(this));
        }
        
        // Поиск по домену
        if (this.searchDomain) {
            this.searchDomain.addEventListener('input', this._handleDomainSearch.bind(this));
        }
        
        // Очистка фильтров при обновлении результатов
        EventBus.on('results:cleared', this.resetFilters.bind(this));
    }
    
    /**
     * Инициализация дебаунс-функций для обработки изменений
     * @private
     */
    _initDebounce() {
        // Дебаунс для поиска по домену (300 мс)
        this._debouncedDomainSearch = DOMUtils.debounce((value) => {
            this.currentFilters.domain = value;
            this._applyFilters();
        }, 300);
        
        // Дебаунс для оценки безопасности (100 мс)
        this._debouncedScoreChange = DOMUtils.debounce((value) => {
            this.currentFilters.score = value;
            this._applyFilters();
        }, 100);
    }
    
    /**
     * Обработчик изменения фильтра DMARC
     * @param {Event} event - Событие изменения
     * @private
     */
    _handleDmarcChange(event) {
        this.currentFilters.dmarc = event.target.value;
        this._applyFilters();
    }
    
    /**
     * Обработчик изменения фильтра SPF
     * @param {Event} event - Событие изменения
     * @private
     */
    _handleSpfChange(event) {
        this.currentFilters.spf = event.target.value;
        this._applyFilters();
    }
    
    /**
     * Обработчик изменения фильтра DKIM
     * @param {Event} event - Событие изменения
     * @private
     */
    _handleDkimChange(event) {
        this.currentFilters.dkim = event.target.value;
        this._applyFilters();
    }
    
    /**
     * Обработчик изменения фильтра оценки безопасности
     * @param {Event} event - Событие изменения
     * @private
     */
    _handleScoreChange(event) {
        const value = parseInt(event.target.value) || 0;
        // Используем дебаунс для предотвращения частых обновлений
        this._debouncedScoreChange(value);
    }
    
    /**
     * Обработчик поиска по домену
     * @param {Event} event - Событие ввода
     * @private
     */
    _handleDomainSearch(event) {
        const value = event.target.value.trim();
        // Используем дебаунс для предотвращения частых обновлений
        this._debouncedDomainSearch(value);
    }
    
    /**
     * Применение фильтров и уведомление о изменениях
     * @private
     */
    _applyFilters() {
        Logger.debug('Filters changed', this.currentFilters);
        
        // Генерация события изменения фильтров
        EventBus.emit('filter:change', this.currentFilters);
    }
    
    /**
     * Сброс всех фильтров к значениям по умолчанию
     */
    resetFilters() {
        // Сбрасываем значения в DOM-элементах
        if (this.filterDmarc) this.filterDmarc.value = 'all';
        if (this.filterSpf) this.filterSpf.value = 'all';
        if (this.filterDkim) this.filterDkim.value = 'all';
        if (this.filterScore) this.filterScore.value = 0;
        if (this.searchDomain) this.searchDomain.value = '';
        
        // Обновляем текущие значения фильтров
        this.currentFilters = {
            dmarc: 'all',
            spf: 'all',
            dkim: 'all',
            score: 0,
            domain: ''
        };
        
        Logger.debug('Filters reset to defaults');
    }
    
    /**
     * Установка фильтров из объекта
     * @param {Object} filters - Объект с фильтрами
     */
    setFilters(filters) {
        if (!filters) return;
        
        // Обновляем значения в DOM-элементах
        if (filters.hasOwnProperty('dmarc') && this.filterDmarc) {
            this.filterDmarc.value = filters.dmarc;
            this.currentFilters.dmarc = filters.dmarc;
        }
        
        if (filters.hasOwnProperty('spf') && this.filterSpf) {
            this.filterSpf.value = filters.spf;
            this.currentFilters.spf = filters.spf;
        }
        
        if (filters.hasOwnProperty('dkim') && this.filterDkim) {
            this.filterDkim.value = filters.dkim;
            this.currentFilters.dkim = filters.dkim;
        }
        
        if (filters.hasOwnProperty('score') && this.filterScore) {
            this.filterScore.value = filters.score;
            this.currentFilters.score = filters.score;
        }
        
        if (filters.hasOwnProperty('domain') && this.searchDomain) {
            this.searchDomain.value = filters.domain;
            this.currentFilters.domain = filters.domain;
        }
        
        // Применяем фильтры
        this._applyFilters();
        
        Logger.debug('Filters set from object', filters);
    }
    
    /**
     * Получение текущих значений фильтров
     * @returns {Object} Объект с текущими фильтрами
     */
    getFilters() {
        return { ...this.currentFilters };
    }
    
    /**
     * Установка фильтра по статусу DMARC
     * @param {string} status - Статус DMARC ('all', 'ok', 'warning', 'error')
     */
    setDmarcFilter(status) {
        if (!this.filterDmarc) return;
        
        this.filterDmarc.value = status;
        this.currentFilters.dmarc = status;
        this._applyFilters();
        
        Logger.debug(`DMARC filter set to: ${status}`);
    }
    
    /**
     * Установка фильтра по статусу SPF
     * @param {string} status - Статус SPF ('all', 'ok', 'warning', 'error')
     */
    setSpfFilter(status) {
        if (!this.filterSpf) return;
        
        this.filterSpf.value = status;
        this.currentFilters.spf = status;
        this._applyFilters();
        
        Logger.debug(`SPF filter set to: ${status}`);
    }
    
    /**
     * Установка фильтра по статусу DKIM
     * @param {string} status - Статус DKIM ('all', 'ok', 'warning', 'error')
     */
    setDkimFilter(status) {
        if (!this.filterDkim) return;
        
        this.filterDkim.value = status;
        this.currentFilters.dkim = status;
        this._applyFilters();
        
        Logger.debug(`DKIM filter set to: ${status}`);
    }
    
    /**
     * Установка фильтра по минимальной оценке безопасности
     * @param {number} score - Минимальная оценка безопасности (0-100)
     */
    setScoreFilter(score) {
        if (!this.filterScore) return;
        
        const value = parseInt(score) || 0;
        this.filterScore.value = value;
        this.currentFilters.score = value;
        this._applyFilters();
        
        Logger.debug(`Score filter set to: ${value}`);
    }
    
    /**
     * Установка фильтра поиска по домену
     * @param {string} domain - Строка для поиска по домену
     */
    setDomainFilter(domain) {
        if (!this.searchDomain) return;
        
        this.searchDomain.value = domain;
        this.currentFilters.domain = domain;
        this._applyFilters();
        
        Logger.debug(`Domain filter set to: ${domain}`);
    }
}

// Создаем глобальный экземпляр менеджера фильтров после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.filtersManager = new FiltersManager();
});