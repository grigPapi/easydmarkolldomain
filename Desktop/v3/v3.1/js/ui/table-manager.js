/**
 * Менеджер таблицы результатов
 * Управляет отображением результатов сканирования в таблице
 */
class TableManager {
    constructor() {
        // DOM элементы
        this.table = DOMUtils.getById('resultsTable');
        this.tableBody = DOMUtils.getById('resultsBody');
        this.emptyMessage = DOMUtils.getById('emptyResultsMessage');
        
        // Шаблоны
        this.rowTemplate = DOMUtils.getById('domainRowTemplate');
        this.detailsTemplate = DOMUtils.getById('domainDetailsTemplate');
        
        // Текущие результаты
        this.currentResults = [];
        
        // Текущая сортировка
        this.sortConfig = {
            field: 'domain',
            direction: 'asc'
        };
        
        // Инициализация событий
        this._setupEventListeners();
        
        Logger.debug('TableManager initialized');
    }
    
    /**
     * Установка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Обработка событий таблицы
        if (this.table) {
            // Делегирование события клика на заголовки для сортировки
            this.table.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-sort]');
                if (th) {
                    const field = th.dataset.sort;
                    this._handleSort(field);
                }
            });
            
            // Делегирование события клика на кнопки деталей
            this.tableBody.addEventListener('click', (e) => {
                const detailBtn = e.target.closest('.detail-btn');
                if (detailBtn) {
                    const row = detailBtn.closest('tr');
                    this._toggleDetails(row);
                }
            });
        }
        
        // Подписка на события обновления результатов
        EventBus.on('results:updated', this.updateResults.bind(this));
        EventBus.on('results:filtered', this.updateResults.bind(this));
        EventBus.on('results:sorted', this.updateResults.bind(this));
        EventBus.on('results:cleared', this.clearTable.bind(this));
    }
    
    /**
     * Обновление результатов в таблице
     * @param {Array<Object>} results - Массив результатов
     */
    updateResults(results) {
        if (!Array.isArray(results)) {
            Logger.error('Invalid results format for table update', results);
            return;
        }
        
        this.currentResults = results;
        
        // Проверяем, есть ли результаты
        if (results.length === 0) {
            this._showEmptyMessage();
            return;
        }
        
        // Скрываем сообщение о пустых результатах
        this._hideEmptyMessage();
        
        // Очищаем текущую таблицу
        this._clearTableBody();
        
        // Создаем фрагмент для оптимизации DOM-операций
        const fragment = document.createDocumentFragment();
        
        // Добавляем строки для каждого результата
        results.forEach(result => {
            // Создаем основную строку
            const row = this._createDomainRow(result);
            fragment.appendChild(row);
            
            // Создаем строку с деталями (скрытую)
            const detailsRow = this._createDetailsRow(result);
            fragment.appendChild(detailsRow);
        });
        
        // Обновляем DOM одной операцией
        DOMUtils.animationFrame(() => {
            this.tableBody.appendChild(fragment);
        });
        
        Logger.debug(`Table updated with ${results.length} results`);
    }
    
    /**
     * Очистка таблицы
     */
    clearTable() {
        this.currentResults = [];
        this._clearTableBody();
        this._showEmptyMessage();
        
        Logger.debug('Table cleared');
    }
    
    /**
     * Создание строки таблицы для домена
     * @param {Object} result - Результат сканирования домена
     * @returns {HTMLElement} Строка таблицы
     * @private
     */
    _createDomainRow(result) {
        // Клонируем шаблон строки
        const row = this.rowTemplate.content.cloneNode(true);
        
        // Заполняем ячейки данными
        const domainCell = row.querySelector('.domain-cell');
        const dmarcCell = row.querySelector('.dmarc-cell');
        const spfCell = row.querySelector('.spf-cell');
        const dkimCell = row.querySelector('.dkim-cell');
        const scoreCell = row.querySelector('.score-cell');
        
        // Устанавливаем значения и классы
        domainCell.textContent = result.domain;
        
        // Добавляем класс ошибки, если есть
        if (result.error) {
            domainCell.classList.add('status-error');
            dmarcCell.textContent = 'Ошибка';
            dmarcCell.classList.add('status-error');
            spfCell.textContent = 'Ошибка';
            spfCell.classList.add('status-error');
            dkimCell.textContent = 'Ошибка';
            dkimCell.classList.add('status-error');
            scoreCell.textContent = '0%';
        } else {
            // DMARC статус
            dmarcCell.textContent = this._getStatusText(result.dmarc ? result.dmarc.status : 'error');
            dmarcCell.classList.add(`status-${result.dmarc ? result.dmarc.status : 'error'}`);
            
            // SPF статус
            spfCell.textContent = this._getStatusText(result.spf ? result.spf.status : 'error');
            spfCell.classList.add(`status-${result.spf ? result.spf.status : 'error'}`);
            
            // DKIM статус
            dkimCell.textContent = this._getStatusText(result.dkim ? result.dkim.status : 'error');
            dkimCell.classList.add(`status-${result.dkim ? result.dkim.status : 'error'}`);
            
            // Оценка безопасности
            scoreCell.textContent = `${result.securityScore || 0}%`;
        }
        
        // Добавляем data-атрибут с доменом для связи со строкой деталей
        row.querySelector('tr').dataset.domain = result.domain;
        
        return row;
    }
    
    /**
     * Создание строки с деталями
     * @param {Object} result - Результат сканирования домена
     * @returns {HTMLElement} Строка с деталями
     * @private
     */
    _createDetailsRow(result) {
        // Клонируем шаблон строки деталей
        const detailsRow = this.detailsTemplate.content.cloneNode(true);
        const row = detailsRow.querySelector('tr');
        
        // Устанавливаем data-атрибут с доменом
        row.dataset.domain = result.domain;
        
        // Заполняем детали
        const domainTitle = detailsRow.querySelector('.details-domain');
        domainTitle.textContent = `Детальная информация для ${result.domain}`;
        
        // Если есть ошибка, показываем только её
        if (result.error) {
            // Скрываем секции с деталями
            const sections = detailsRow.querySelectorAll('.detail-section');
            sections.forEach(section => section.style.display = 'none');
            
            // Создаем секцию с ошибкой
            const errorSection = DOMUtils.createElement('div', {
                class: 'detail-section error-section'
            });
            
            const errorTitle = DOMUtils.createElement('h5', {}, 'Ошибка');
            const errorText = DOMUtils.createElement('p', {
                class: 'status-error'
            }, result.error);
            
            errorSection.appendChild(errorTitle);
            errorSection.appendChild(errorText);
            
            // Добавляем секцию с ошибкой
            const sectionsContainer = detailsRow.querySelector('.details-sections');
            sectionsContainer.appendChild(errorSection);
        } else {
            // Заполняем секции с деталями
            
            // DMARC
            const dmarcStatus = detailsRow.querySelector('.dmarc-status');
            const dmarcRecord = detailsRow.querySelector('.dmarc-record');
            const dmarcPolicy = detailsRow.querySelector('.dmarc-policy');
            
            dmarcStatus.textContent = this._getStatusText(result.dmarc ? result.dmarc.status : 'error');
            dmarcStatus.classList.add(`status-${result.dmarc ? result.dmarc.status : 'error'}`);
            dmarcRecord.textContent = result.dmarc && result.dmarc.record ? result.dmarc.record : 'Отсутствует';
            dmarcPolicy.textContent = result.dmarc && result.dmarc.policy ? result.dmarc.policy : 'Не определена';
            
            // SPF
            const spfStatus = detailsRow.querySelector('.spf-status');
            const spfRecord = detailsRow.querySelector('.spf-record');
            
            spfStatus.textContent = this._getStatusText(result.spf ? result.spf.status : 'error');
            spfStatus.classList.add(`status-${result.spf ? result.spf.status : 'error'}`);
            spfRecord.textContent = result.spf && result.spf.record ? result.spf.record : 'Отсутствует';
            
            // DKIM
            const dkimStatus = detailsRow.querySelector('.dkim-status');
            const dkimSelectors = detailsRow.querySelector('.dkim-selectors');
            
            dkimStatus.textContent = this._getStatusText(result.dkim ? result.dkim.status : 'error');
            dkimStatus.classList.add(`status-${result.dkim ? result.dkim.status : 'error'}`);
            dkimSelectors.textContent = result.dkim && result.dkim.selectors && result.dkim.selectors.length > 0 ? 
                result.dkim.selectors.join(', ') : 'Отсутствуют';
            
            // MX записи
            const mxRecords = detailsRow.querySelector('.mx-records');
            
            if (result.mx && result.mx.length > 0) {
                const mxList = DOMUtils.createElement('ul', {
                    class: 'mx-list'
                });
                
                result.mx.forEach(mx => {
                    const mxItem = DOMUtils.createElement('li', {}, mx);
                    mxList.appendChild(mxItem);
                });
                
                mxRecords.appendChild(mxList);
            } else {
                mxRecords.textContent = 'Отсутствуют';
            }
            
            // Рекомендации (заполняются отложенно)
            const recommendationsContainer = detailsRow.querySelector('.recommendations-container');
            recommendationsContainer.textContent = 'Загрузка рекомендаций...';
            
            // Отложенная загрузка рекомендаций
            setTimeout(() => {
                if (window.RecommendationsManager) {
                    const recommendations = window.RecommendationsManager.getRecommendations(result);
                    const recommendationsHTML = window.RecommendationsManager.renderRecommendationsHTML(recommendations);
                    recommendationsContainer.innerHTML = recommendationsHTML;
                } else {
                    recommendationsContainer.textContent = 'Менеджер рекомендаций не инициализирован';
                }
            }, 100);
        }
        
        return detailsRow;
    }
    
    /**
     * Переключение отображения деталей
     * @param {HTMLElement} row - Строка таблицы
     * @private
     */
    _toggleDetails(row) {
        if (!row) return;
        
        const domain = row.dataset.domain;
        const detailsRow = this.tableBody.querySelector(`tr.details-row[data-domain="${domain}"]`);
        
        if (!detailsRow) {
            Logger.warn(`Details row not found for domain: ${domain}`);
            return;
        }
        
        const detailBtn = row.querySelector('.detail-btn');
        
        // Переключаем отображение
        if (detailsRow.style.display === 'table-row') {
            // Скрываем детали
            detailsRow.style.display = 'none';
            if (detailBtn) detailBtn.textContent = 'Детали';
        } else {
            // Показываем детали
            detailsRow.style.display = 'table-row';
            if (detailBtn) detailBtn.textContent = 'Скрыть';
        }
    }
    
    /**
     * Обработчик сортировки
     * @param {string} field - Поле для сортировки
     * @private
     */
    _handleSort(field) {
        if (!field) return;
        
        // Уведомляем о изменении сортировки
        EventBus.emit('sort:change', field);
        
        // Обновляем иконки сортировки в заголовках таблицы
        this._updateSortIndicators(field);
    }
    
    /**
     * Обновление индикаторов сортировки
     * @param {string} field - Сортируемое поле
     * @private
     */
    _updateSortIndicators(field) {
        if (!this.table) return;
        
        // Получаем все заголовки
        const headers = this.table.querySelectorAll('th[data-sort]');
        
        // Обновляем направление сортировки
        if (field === this.sortConfig.field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }
        
        // Обновляем классы заголовков
        headers.forEach(header => {
            // Удаляем классы сортировки
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Добавляем класс для текущего заголовка
            if (header.dataset.sort === field) {
                header.classList.add(`sort-${this.sortConfig.direction}`);
            }
        });
    }
    
    /**
     * Очистка тела таблицы
     * @private
     */
    _clearTableBody() {
        if (this.tableBody) {
            DOMUtils.empty(this.tableBody);
        }
    }
    
    /**
     * Отображение сообщения о пустой таблице
     * @private
     */
    _showEmptyMessage() {
        if (this.emptyMessage) {
            this.emptyMessage.style.display = 'block';
        }
        
        if (this.table) {
            this.table.style.display = 'none';
        }
    }
    
    /**
     * Скрытие сообщения о пустой таблице
     * @private
     */
    _hideEmptyMessage() {
        if (this.emptyMessage) {
            this.emptyMessage.style.display = 'none';
        }
        
        if (this.table) {
            this.table.style.display = 'table';
        }
    }
    
    /**
     * Получение текстового представления статуса
     * @param {string} status - Статус ('ok', 'warning', 'error')
     * @returns {string} Текстовое представление статуса
     * @private
     */
    _getStatusText(status) {
        switch (status) {
            case 'ok': return 'Настроен';
            case 'warning': return 'Проблемы';
            case 'error': return 'Отсутствует';
            default: return 'Неизвестно';
        }
    }
    
    /**
     * Открытие деталей для конкретного домена
     * @param {string} domain - Доменное имя
     * @returns {boolean} Успешно ли открыты детали
     */
    openDetailsForDomain(domain) {
        if (!domain || !this.tableBody) return false;
        
        const row = this.tableBody.querySelector(`tr[data-domain="${domain}"]:not(.details-row)`);
        
        if (row) {
            this._toggleDetails(row);
            
            // Прокручиваем к строке
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
        
        return false;
    }
    
    /**
     * Закрытие всех открытых деталей
     */
    closeAllDetails() {
        if (!this.tableBody) return;
        
        // Находим все открытые строки деталей
        const openDetailRows = this.tableBody.querySelectorAll('tr.details-row[style*="display: table-row"]');
        
        openDetailRows.forEach(detailRow => {
            const domain = detailRow.dataset.domain;
            const row = this.tableBody.querySelector(`tr[data-domain="${domain}"]:not(.details-row)`);
            
            if (row) {
                this._toggleDetails(row);
            }
        });
    }
}

// Создаем глобальный экземпляр менеджера таблицы после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.tableManager = new TableManager();
});