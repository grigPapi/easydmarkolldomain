/**
 * Менеджер статистики
 * Генерирует и отображает статистику по результатам сканирования
 */
class StatisticsManager {
    constructor() {
        // DOM элементы
        this.statsPanel = DOMUtils.getById('statsPanel');
        this.statisticsContainer = DOMUtils.getById('statisticsContainer');
        
        // Кнопка переключения панели статистики
        this.statsBtn = DOMUtils.getById('statsBtn');
        
        // Инициализация событий
        this._setupEventListeners();
        
        Logger.debug('StatisticsManager initialized');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Переключение отображения панели статистики
        if (this.statsBtn) {
            this.statsBtn.addEventListener('click', this._toggleStatsPanel.bind(this));
        }
        
        // Обновление статистики при обновлении результатов
        EventBus.on('results:updated', this._handleResultsUpdate.bind(this));
        EventBus.on('results:cleared', this._handleResultsCleared.bind(this));
    }
    
    /**
     * Переключение отображения панели статистики
     * @private
     */
    _toggleStatsPanel() {
        if (!this.statsPanel) return;
        
        const isVisible = this.statsPanel.style.display === 'block';
        
        // Переключаем отображение
        this.statsPanel.style.display = isVisible ? 'none' : 'block';
        
        // Меняем текст кнопки
        if (this.statsBtn) {
            this.statsBtn.textContent = isVisible ? 'Статистика' : 'Скрыть статистику';
        }
        
        // Если открываем панель, генерируем статистику
        if (!isVisible && window.resultsManager) {
            this.generateStatistics(window.resultsManager.getAllResults());
        }
        
        // Скрываем панель настроек, если она открыта
        this._hideOtherPanels();
        
        Logger.debug(`Statistics panel ${isVisible ? 'hidden' : 'shown'}`);
    }
    
    /**
     * Скрытие других панелей
     * @private
     */
    _hideOtherPanels() {
        // Скрываем панель настроек, если она открыта
        const settingsPanel = DOMUtils.getById('settingsPanel');
        const settingsBtn = DOMUtils.getById('settingsBtn');
        
        if (settingsPanel && settingsPanel.style.display === 'block') {
            settingsPanel.style.display = 'none';
            
            if (settingsBtn) {
                settingsBtn.textContent = 'Показать настройки';
            }
        }
    }
    
    /**
     * Обработчик обновления результатов
     * @param {Array<Object>} results - Результаты сканирования
     * @private
     */
    _handleResultsUpdate(results) {
        // Если панель статистики открыта, обновляем статистику
        if (this.statsPanel && this.statsPanel.style.display === 'block') {
            this.generateStatistics(results);
        }
    }
    
    /**
     * Обработчик очистки результатов
     * @private
     */
    _handleResultsCleared() {
        if (this.statisticsContainer) {
            this.statisticsContainer.innerHTML = '<p class="empty-state">Проведите сканирование, чтобы увидеть статистику</p>';
        }
    }
    
    /**
     * Генерация и отображение статистики
     * @param {Array<Object>} results - Результаты сканирования
     */
    generateStatistics(results) {
        if (!Array.isArray(results) || !this.statisticsContainer) {
            return;
        }
        
        // Если нет результатов, показываем сообщение
        if (results.length === 0) {
            this.statisticsContainer.innerHTML = '<p class="empty-state">Проведите сканирование, чтобы увидеть статистику</p>';
            return;
        }
        
        // Получаем данные для статистики
        const stats = this._calculateStatistics(results);
        
        // Формируем HTML для статистики
        const html = this._generateStatisticsHTML(stats);
        
        // Обновляем DOM
        DOMUtils.animationFrame(() => {
            this.statisticsContainer.innerHTML = html;
        });
        
        Logger.debug('Statistics generated', stats);
    }
    
    /**
     * Расчет статистики по результатам
     * @param {Array<Object>} results - Результаты сканирования
     * @returns {Object} Объект со статистикой
     * @private
     */
    _calculateStatistics(results) {
        const stats = {
            total: results.length,
            dmarc: { ok: 0, warning: 0, error: 0 },
            spf: { ok: 0, warning: 0, error: 0 },
            dkim: { ok: 0, warning: 0, error: 0 },
            averageScore: 0,
            securityLevels: {
                high: 0,    // 80-100
                medium: 0,  // 50-79
                low: 0      // 0-49
            }
        };
        
        if (results.length === 0) {
            return stats;
        }
        
        // Собираем данные
        let totalScore = 0;
        
        results.forEach(result => {
            // Подсчет статусов DMARC
            if (result.dmarc && result.dmarc.status) {
                stats.dmarc[result.dmarc.status]++;
            } else {
                stats.dmarc.error++;
            }
            
            // Подсчет статусов SPF
            if (result.spf && result.spf.status) {
                stats.spf[result.spf.status]++;
            } else {
                stats.spf.error++;
            }
            
            // Подсчет статусов DKIM
            if (result.dkim && result.dkim.status) {
                stats.dkim[result.dkim.status]++;
            } else {
                stats.dkim.error++;
            }
            
            // Учет оценки безопасности
            const score = result.securityScore || 0;
            totalScore += score;
            
            // Распределение по уровням безопасности
            if (score >= 80) {
                stats.securityLevels.high++;
            } else if (score >= 50) {
                stats.securityLevels.medium++;
            } else {
                stats.securityLevels.low++;
            }
        });
        
        // Расчет средней оценки безопасности
        stats.averageScore = Math.round(totalScore / results.length);
        
        return stats;
    }
    
    /**
     * Генерация HTML для статистики
     * @param {Object} stats - Объект со статистикой
     * @returns {string} HTML разметка
     * @private
     */
    _generateStatisticsHTML(stats) {
        return `
            <div class="stats-overview">
                <div class="stats-card">
                    <h4>Общая статистика</h4>
                    <div class="stats-data">
                        <p>Всего проверено доменов: <strong>${stats.total}</strong></p>
                        <p>Средняя оценка безопасности: <strong>${stats.averageScore}%</strong></p>
                    </div>
                </div>
                
                <div class="stats-card">
                    <h4>Протоколы защиты</h4>
                    <table class="stats-table">
                        <tr>
                            <th>Протокол</th>
                            <th class="status-ok">Настроен</th>
                            <th class="status-warning">Проблемы</th>
                            <th class="status-error">Отсутствует</th>
                        </tr>
                        <tr>
                            <td>DMARC</td>
                            <td>${stats.dmarc.ok} (${Math.round(stats.dmarc.ok / stats.total * 100) || 0}%)</td>
                            <td>${stats.dmarc.warning} (${Math.round(stats.dmarc.warning / stats.total * 100) || 0}%)</td>
                            <td>${stats.dmarc.error} (${Math.round(stats.dmarc.error / stats.total * 100) || 0}%)</td>
                        </tr>
                        <tr>
                            <td>SPF</td>
                            <td>${stats.spf.ok} (${Math.round(stats.spf.ok / stats.total * 100) || 0}%)</td>
                            <td>${stats.spf.warning} (${Math.round(stats.spf.warning / stats.total * 100) || 0}%)</td>
                            <td>${stats.spf.error} (${Math.round(stats.spf.error / stats.total * 100) || 0}%)</td>
                        </tr>
                        <tr>
                            <td>DKIM</td>
                            <td>${stats.dkim.ok} (${Math.round(stats.dkim.ok / stats.total * 100) || 0}%)</td>
                            <td>${stats.dkim.warning} (${Math.round(stats.dkim.warning / stats.total * 100) || 0}%)</td>
                            <td>${stats.dkim.error} (${Math.round(stats.dkim.error / stats.total * 100) || 0}%)</td>
                        </tr>
                    </table>
                </div>
                
                <div class="stats-card">
                    <h4>Уровни безопасности доменов</h4>
                    <div class="security-levels">
                        <div class="security-level high">
                            <div class="level-label">Высокий (80-100%)</div>
                            <div class="level-value">${stats.securityLevels.high} (${Math.round(stats.securityLevels.high / stats.total * 100) || 0}%)</div>
                            <div class="level-bar" style="width: ${Math.round(stats.securityLevels.high / stats.total * 100) || 0}%"></div>
                        </div>
                        <div class="security-level medium">
                            <div class="level-label">Средний (50-79%)</div>
                            <div class="level-value">${stats.securityLevels.medium} (${Math.round(stats.securityLevels.medium / stats.total * 100) || 0}%)</div>
                            <div class="level-bar" style="width: ${Math.round(stats.securityLevels.medium / stats.total * 100) || 0}%"></div>
                        </div>
                        <div class="security-level low">
                            <div class="level-label">Низкий (0-49%)</div>
                            <div class="level-value">${stats.securityLevels.low} (${Math.round(stats.securityLevels.low / stats.total * 100) || 0}%)</div>
                            <div class="level-bar" style="width: ${Math.round(stats.securityLevels.low / stats.total * 100) || 0}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-card">
                    <h4>Действия по улучшению безопасности</h4>
                    <ul class="action-list">
                        ${this._generateActionsList(stats)}
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Генерация списка рекомендуемых действий на основе статистики
     * @param {Object} stats - Объект со статистикой
     * @returns {string} HTML разметка списка действий
     * @private
     */
    _generateActionsList(stats) {
        const actions = [];
        
        // Рекомендации по DMARC
        if (stats.dmarc.error > 0) {
            actions.push(`
                <li class="action-item">
                    <strong class="status-error">Настройте DMARC:</strong> 
                    ${stats.dmarc.error} ${this._pluralize(stats.dmarc.error, 'домен', 'домена', 'доменов')} 
                    без DMARC записи. DMARC защищает от подделки отправителя.
                </li>
            `);
        }
        
        if (stats.dmarc.warning > 0) {
            actions.push(`
                <li class="action-item">
                    <strong class="status-warning">Улучшите DMARC:</strong> 
                    ${stats.dmarc.warning} ${this._pluralize(stats.dmarc.warning, 'домен', 'домена', 'доменов')} 
                    имеют проблемы с настройками DMARC. Рекомендуется использовать политику quarantine или reject.
                </li>
            `);
        }
        
        // Рекомендации по SPF
        if (stats.spf.error > 0) {
            actions.push(`
                <li class="action-item">
                    <strong class="status-error">Настройте SPF:</strong> 
                    ${stats.spf.error} ${this._pluralize(stats.spf.error, 'домен', 'домена', 'доменов')} 
                    без SPF записи. SPF определяет серверы, которые могут отправлять почту от вашего имени.
                </li>
            `);
        }
        
        // Рекомендации по DKIM
        if (stats.dkim.error > 0) {
            actions.push(`
                <li class="action-item">
                    <strong class="status-error">Настройте DKIM:</strong> 
                    ${stats.dkim.error} ${this._pluralize(stats.dkim.error, 'домен', 'домена', 'доменов')} 
                    без DKIM подписи. DKIM подтверждает подлинность писем и защищает от их изменения.
                </li>
            `);
        }
        
        // Рекомендации по общему уровню безопасности
        if (stats.securityLevels.low > stats.total * 0.3) { // Если низкий уровень безопасности у более 30% доменов
            actions.push(`
                <li class="action-item">
                    <strong class="status-error">Повысьте общий уровень защиты:</strong> 
                    ${stats.securityLevels.low} ${this._pluralize(stats.securityLevels.low, 'домен', 'домена', 'доменов')} 
                    (${Math.round(stats.securityLevels.low / stats.total * 100)}%) имеют низкий уровень защиты (0-49%).
                </li>
            `);
        }
        
        // Если нет рекомендаций
        if (actions.length === 0) {
            return `
                <li class="action-item status-ok">
                    <strong>Хорошая работа!</strong> 
                    Ваши домены имеют хороший уровень защиты. Продолжайте регулярно проверять их настройки.
                </li>
            `;
        }
        
        return actions.join('');
    }
    
    /**
     * Склонение существительных в зависимости от числа
     * @param {number} count - Количество
     * @param {string} one - Форма для единицы (1)
     * @param {string} few - Форма для нескольких (2-4)
     * @param {string} many - Форма для многих (5+)
     * @returns {string} Правильная форма слова
     * @private
     */
    _pluralize(count, one, few, many) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return one;
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return few;
        } else {
            return many;
        }
    }
    
    /**
     * Экспорт статистики в PDF
     * @returns {Promise<boolean>} Успешно ли выполнен экспорт
     */
    async exportStatisticsToPDF() {
        if (!window.resultsManager) {
            Logger.error('ResultsManager not available for statistics export');
            return false;
        }
        
        try {
            const results = window.resultsManager.getAllResults();
            if (results.length === 0) {
                Logger.warn('No results to export statistics');
                return false;
            }
            
            const stats = this._calculateStatistics(results);
            
            // Формируем HTML для PDF
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Статистика безопасности доменов</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                        .stats-section { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background-color: #f2f2f2; }
                        .security-level { margin: 10px 0; padding: 5px; }
                        .high { color: green; }
                        .medium { color: orange; }
                        .low { color: red; }
                        .action-list { margin-top: 15px; }
                        .action-item { margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Статистика безопасности доменов</h1>
                    <p>Дата создания: ${new Date().toLocaleString()}</p>
                    
                    <div class="stats-section">
                        <h2>Общая статистика</h2>
                        <p>Всего проверено доменов: <strong>${stats.total}</strong></p>
                        <p>Средняя оценка безопасности: <strong>${stats.averageScore}%</strong></p>
                    </div>
                    
                    <div class="stats-section">
                        <h2>Протоколы защиты</h2>
                        <table>
                            <tr>
                                <th>Протокол</th>
                                <th>Настроен</th>
                                <th>Проблемы</th>
                                <th>Отсутствует</th>
                            </tr>
                            <tr>
                                <td>DMARC</td>
                                <td>${stats.dmarc.ok} (${Math.round(stats.dmarc.ok / stats.total * 100) || 0}%)</td>
                                <td>${stats.dmarc.warning} (${Math.round(stats.dmarc.warning / stats.total * 100) || 0}%)</td>
                                <td>${stats.dmarc.error} (${Math.round(stats.dmarc.error / stats.total * 100) || 0}%)</td>
                            </tr>
                            <tr>
                                <td>SPF</td>
                                <td>${stats.spf.ok} (${Math.round(stats.spf.ok / stats.total * 100) || 0}%)</td>
                                <td>${stats.spf.warning} (${Math.round(stats.spf.warning / stats.total * 100) || 0}%)</td>
                                <td>${stats.spf.error} (${Math.round(stats.spf.error / stats.total * 100) || 0}%)</td>
                            </tr>
                            <tr>
                                <td>DKIM</td>
                                <td>${stats.dkim.ok} (${Math.round(stats.dkim.ok / stats.total * 100) || 0}%)</td>
                                <td>${stats.dkim.warning} (${Math.round(stats.dkim.warning / stats.total * 100) || 0}%)</td>
                                <td>${stats.dkim.error} (${Math.round(stats.dkim.error / stats.total * 100) || 0}%)</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="stats-section">
                        <h2>Уровни безопасности доменов</h2>
                        <div class="security-level high">
                            Высокий (80-100%): ${stats.securityLevels.high} (${Math.round(stats.securityLevels.high / stats.total * 100) || 0}%)
                        </div>
                        <div class="security-level medium">
                            Средний (50-79%): ${stats.securityLevels.medium} (${Math.round(stats.securityLevels.medium / stats.total * 100) || 0}%)
                        </div>
                        <div class="security-level low">
                            Низкий (0-49%): ${stats.securityLevels.low} (${Math.round(stats.securityLevels.low / stats.total * 100) || 0}%)
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h2>Рекомендации по улучшению безопасности</h2>
                        <ul class="action-list">
                            ${this._generateActionsList(stats).replace(/<\/?strong[^>]*>/g, '')}
                        </ul>
                    </div>
                </body>
                </html>
            `;
            
            // Экспортируем в PDF (или в HTML для демонстрации)
            const date = new Date().toISOString().slice(0, 10);
            const filename = `dmarc_stats_${date}.html`;
            
            // Сохраняем файл
            FileUtils.saveFile(html, filename, 'text/html');
            
            Logger.info('Statistics exported to PDF');
            return true;
        } catch (error) {
            Logger.error('Error exporting statistics to PDF', error);
            return false;
        }
    }
    
    /**
     * Показать панель статистики
     */
    showStatsPanel() {
        if (!this.statsPanel) return;
        
        this.statsPanel.style.display = 'block';
        
        if (this.statsBtn) {
            this.statsBtn.textContent = 'Скрыть статистику';
        }
        
        // Генерируем статистику, если есть результаты
        if (window.resultsManager) {
            this.generateStatistics(window.resultsManager.getAllResults());
        }
        
        Logger.debug('Statistics panel shown');
    }
    
    /**
     * Скрыть панель статистики
     */
    hideStatsPanel() {
        if (!this.statsPanel) return;
        
        this.statsPanel.style.display = 'none';
        
        if (this.statsBtn) {
            this.statsBtn.textContent = 'Статистика';
        }
        
        Logger.debug('Statistics panel hidden');
    }
}

// Создаем глобальный экземпляр менеджера статистики после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.statisticsManager = new StatisticsManager();
});