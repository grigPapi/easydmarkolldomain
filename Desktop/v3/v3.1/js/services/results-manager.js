/**
 * Менеджер результатов сканирования
 * Отвечает за хранение, фильтрацию и сортировку результатов сканирования
 */
class ResultsManager {
    constructor() {
        // Массив всех результатов
        this.results = [];
        
        // Отфильтрованные результаты
        this.filteredResults = [];
        
        // Текущие настройки фильтрации
        this.currentFilters = {
            dmarc: 'all',
            spf: 'all',
            dkim: 'all',
            score: 0,
            domain: ''
        };
        
        // Текущие настройки сортировки
        this.sortConfig = {
            field: 'domain',
            direction: 'asc'
        };
        
        // Состояние сканирования
        this.scanState = {
            isScanning: false,
            progress: 0,
            processed: 0,
            total: 0
        };
        
        // Инициализация обработчиков событий
        this._setupEventListeners();
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('ResultsManager initialized');
        } else {
            console.log('ResultsManager initialized');
        }
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    _setupEventListeners() {
        if (!window.EventBus) {
            console.error('EventBus is not available for ResultsManager');
            return;
        }
        
        // Подписка на изменение фильтров
        window.EventBus.on('filter:change', this.applyFilters.bind(this));
        
        // Подписка на изменение сортировки
        window.EventBus.on('sort:change', this.applySorting.bind(this));
    }
    
    /**
     * Установка всех результатов
     * @param {Array<Object>} results - Массив результатов сканирования
     */
    setResults(results) {
        if (!Array.isArray(results)) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Invalid results format', results);
            } else {
                console.error('Invalid results format', results);
            }
            return;
        }
        
        this.results = [...results];
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие обновления результатов
        if (window.EventBus) {
            window.EventBus.emit('results:updated', this.filteredResults);
        }
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Set ${results.length} results`);
        } else {
            console.log(`Set ${results.length} results`);
        }
    }
    
    /**
     * Добавление нового результата
     * @param {Object} result - Результат сканирования
     */
    addResult(result) {
        if (!result || typeof result !== 'object') {
            return;
        }
        
        // Проверяем, есть ли уже результат для этого домена
        const index = this.results.findIndex(r => r.domain === result.domain);
        
        if (index !== -1) {
            // Обновляем существующий результат
            this.results[index] = result;
        } else {
            // Добавляем новый результат
            this.results.push(result);
        }
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие обновления результатов
        if (window.EventBus) {
            window.EventBus.emit('results:updated', this.filteredResults);
        }
    }
    
    /**
     * Обновление результата по домену
     * @param {string} domain - Доменное имя
     * @param {Object} newData - Новые данные
     * @returns {boolean} Успешно ли обновление
     */
    updateResult(domain, newData) {
        if (!domain || !newData) {
            return false;
        }
        
        // Ищем результат для домена
        const index = this.results.findIndex(r => r.domain === domain);
        
        if (index === -1) {
            return false;
        }
        
        // Обновляем данные
        this.results[index] = { ...this.results[index], ...newData };
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие обновления результатов
        if (window.EventBus) {
            window.EventBus.emit('results:updated', this.filteredResults);
        }
        
        return true;
    }
    
    /**
     * Удаление результата по домену
     * @param {string} domain - Доменное имя
     * @returns {boolean} Успешно ли удаление
     */
    removeResult(domain) {
        if (!domain) {
            return false;
        }
        
        // Ищем результат для домена
        const index = this.results.findIndex(r => r.domain === domain);
        
        if (index === -1) {
            return false;
        }
        
        // Удаляем результат
        this.results.splice(index, 1);
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие обновления результатов
        if (window.EventBus) {
            window.EventBus.emit('results:updated', this.filteredResults);
        }
        
        return true;
    }
    
    /**
     * Очистка всех результатов
     */
    clearResults() {
        this.results = [];
        this.filteredResults = [];
        
        // Генерируем событие очистки результатов
        if (window.EventBus) {
            window.EventBus.emit('results:cleared');
        }
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info('Results cleared');
        } else {
            console.log('Results cleared');
        }
    }
    
    /**
     * Применение фильтров к результатам
     * @param {Object} filters - Объект с фильтрами
     */
    applyFilters(filters) {
        if (!filters) return;
        
        // Обновляем текущие фильтры
        this.currentFilters = { ...this.currentFilters, ...filters };
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие фильтрации результатов
        if (window.EventBus) {
            window.EventBus.emit('results:filtered', this.filteredResults);
        }
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('Filters applied', this.currentFilters);
        } else {
            console.log('Filters applied', this.currentFilters);
        }
    }
    
    /**
     * Применение сортировки к результатам
     * @param {string} field - Поле для сортировки
     */
    applySorting(field) {
        if (!field) return;
        
        // Обновляем направление сортировки
        if (field === this.sortConfig.field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }
        
        // Применяем фильтры и сортировку
        this._applyFiltersAndSort();
        
        // Генерируем событие сортировки результатов
        if (window.EventBus) {
            window.EventBus.emit('results:sorted', this.filteredResults);
        }
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('Results sorted', this.sortConfig);
        } else {
            console.log('Results sorted', this.sortConfig);
        }
    }
    
    /**
     * Применение фильтров и сортировки к результатам
     * @private
     */
    _applyFiltersAndSort() {
        // Применяем фильтры
        this.filteredResults = this.results.filter(result => {
            // Фильтр по DMARC
            if (this.currentFilters.dmarc !== 'all' && (!result.dmarc || result.dmarc.status !== this.currentFilters.dmarc)) {
                return false;
            }
            
            // Фильтр по SPF
            if (this.currentFilters.spf !== 'all' && (!result.spf || result.spf.status !== this.currentFilters.spf)) {
                return false;
            }
            
            // Фильтр по DKIM
            if (this.currentFilters.dkim !== 'all' && (!result.dkim || result.dkim.status !== this.currentFilters.dkim)) {
                return false;
            }
            
            // Фильтр по оценке безопасности
            if (this.currentFilters.score > 0 && (result.securityScore === undefined || result.securityScore < this.currentFilters.score)) {
                return false;
            }
            
            // Фильтр по домену (поиск)
            if (this.currentFilters.domain && !result.domain.toLowerCase().includes(this.currentFilters.domain.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        // Применяем сортировку
        this._sortResults();
    }
    
    /**
     * Сортировка результатов
     * @private
     */
    _sortResults() {
        const { field, direction } = this.sortConfig;
        
        this.filteredResults.sort((a, b) => {
            let valueA, valueB;
            
            // Получаем значения в зависимости от поля сортировки
            switch (field) {
                case 'domain':
                    valueA = (a.domain || '').toLowerCase();
                    valueB = (b.domain || '').toLowerCase();
                    break;
                case 'dmarc':
                    valueA = a.dmarc ? a.dmarc.status : 'error';
                    valueB = b.dmarc ? b.dmarc.status : 'error';
                    break;
                case 'spf':
                    valueA = a.spf ? a.spf.status : 'error';
                    valueB = b.spf ? b.spf.status : 'error';
                    break;
                case 'dkim':
                    valueA = a.dkim ? a.dkim.status : 'error';
                    valueB = b.dkim ? b.dkim.status : 'error';
                    break;
                case 'score':
                    valueA = a.securityScore || 0;
                    valueB = b.securityScore || 0;
                    break;
                default:
                    valueA = a[field] || '';
                    valueB = b[field] || '';
            }
            
            // Сортировка по возрастанию/убыванию
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
    }
    
    /**
     * Получение всех результатов
     * @returns {Array<Object>} Массив всех результатов
     */
    getAllResults() {
        return [...this.results];
    }
    
    /**
     * Получение отфильтрованных результатов
     * @returns {Array<Object>} Массив отфильтрованных результатов
     */
    getFilteredResults() {
        return [...this.filteredResults];
    }
    
    /**
     * Получение результата по домену
     * @param {string} domain - Доменное имя
     * @returns {Object|null} Результат или null, если не найден
     */
    getResultByDomain(domain) {
        if (!domain) return null;
        
        const result = this.results.find(r => r.domain === domain);
        return result ? { ...result } : null;
    }
    
    /**
     * Получение текущих фильтров
     * @returns {Object} Объект с текущими фильтрами
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }
    
    /**
     * Получение текущих настроек сортировки
     * @returns {Object} Объект с настройками сортировки
     */
    getSortConfig() {
        return { ...this.sortConfig };
    }
    
    /**
     * Обновление состояния сканирования
     * @param {Object} state - Новое состояние
     */
    updateScanState(state) {
        this.scanState = { ...this.scanState, ...state };
        
        // Генерируем событие изменения состояния сканирования
        if (window.EventBus) {
            window.EventBus.emit('scan:state_changed', this.scanState);
        }
    }
    
    /**
     * Получение состояния сканирования
     * @returns {Object} Объект с состоянием сканирования
     */
    getScanState() {
        return { ...this.scanState };
    }
    
    /**
     * Сохранение результатов в localStorage
     * @returns {boolean} Успешно ли сохранение
     */
    saveResultsToStorage() {
        if (!window.StorageManager) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('StorageManager is not available');
            } else {
                console.error('StorageManager is not available');
            }
            return false;
        }
        
        return window.StorageManager.set('scan_results', this.results);
    }
    
    /**
     * Загрузка результатов из localStorage
     * @returns {boolean} Успешно ли загрузка
     */
    loadResultsFromStorage() {
        if (!window.StorageManager) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('StorageManager is not available');
            } else {
                console.error('StorageManager is not available');
            }
            return false;
        }
        
        const savedResults = window.StorageManager.get('scan_results');
        
        if (!savedResults || !Array.isArray(savedResults)) {
            return false;
        }
        
        this.setResults(savedResults);
        return true;
    }
}

// Создаем глобальный экземпляр менеджера результатов
window.resultsManager = new ResultsManager();