/**
 * Основной менеджер UI
 * Управляет взаимодействием с пользовательским интерфейсом
 */
class UIManager {
    constructor() {
        // DOM элементы
        this.loadBtn = DOMUtils.getById('loadBtn');
        this.scanBtn = DOMUtils.getById('scanBtn');
        this.stopBtn = DOMUtils.getById('stopBtn');
        this.progressBar = DOMUtils.getById('progressBar');
        this.progressText = DOMUtils.getById('progressText');
        this.exportBtn = DOMUtils.getById('exportBtn');
        this.exportPdfBtn = DOMUtils.getById('exportPdfBtn');
        this.exportCsvBtn = DOMUtils.getById('exportCsvBtn');
        this.settingsBtn = DOMUtils.getById('settingsBtn');
        this.settingsPanel = DOMUtils.getById('settingsPanel');
        this.saveSettingsBtn = DOMUtils.getById('saveSettingsBtn');
        
        // Состояние сканирования
        this.scanningState = {
            isScanning: false,
            progress: 0,
            processed: 0,
            total: 0
        };
        
        // Инициализация обработчиков событий
        this._setupEventListeners();
        
        Logger.debug('UIManager initialized');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Кнопка загрузки файла
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', this._handleLoadClick.bind(this));
        }
        
        // Кнопка сканирования
        if (this.scanBtn) {
            this.scanBtn.addEventListener('click', this._handleScanClick.bind(this));
        }
        
        // Кнопка остановки сканирования
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', this._handleStopClick.bind(this));
        }
        
        // Кнопки экспорта
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', this._handleExportClick.bind(this));
        }
        
        if (this.exportPdfBtn) {
            this.exportPdfBtn.addEventListener('click', this._handleExportPdfClick.bind(this));
        }
        
        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', this._handleExportCsvClick.bind(this));
        }
        
        // Кнопка и панель настроек
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', this._handleSettingsClick.bind(this));
        }
        
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', this._handleSaveSettingsClick.bind(this));
        }
        
        // Подписка на события
        EventBus.on('scan:state_changed', this._handleScanStateChanged.bind(this));
        EventBus.on('file:selected', this._handleFileSelected.bind(this));
        EventBus.on('scan:completed', this._handleScanCompleted.bind(this));
        EventBus.on('scan:error', this._handleScanError.bind(this));
        EventBus.on('notification:error', this._handleNotificationError.bind(this));
        EventBus.on('notification:info', this._handleNotificationInfo.bind(this));
    }
    
    /**
     * Обработчик клика по кнопке загрузки файла
     * @private
     */
    _handleLoadClick() {
        const fileInput = DOMUtils.getById('domainFile');
        if (fileInput) {
            fileInput.click();
        }
    }
    
    /**
     * Обработчик клика по кнопке сканирования
     * @private
     */
    _handleScanClick() {
        if (this.scanningState.isScanning) {
            Logger.warn('Scanning already in progress');
            return;
        }
        
        // Проверяем, выбран ли файл
        const fileInput = DOMUtils.getById('domainFile');
        if (!fileInput || fileInput.files.length === 0) {
            this._showError('Пожалуйста, выберите файл с доменами');
            return;
        }
        
        // Запускаем сканирование
        this._startScan(fileInput.files[0]);
    }
    
    /**
     * Обработчик клика по кнопке остановки сканирования
     * @private
     */
    _handleStopClick() {
        if (!this.scanningState.isScanning) {
            return;
        }
        
        // Останавливаем сканирование
        if (window.dmarcClient) {
            window.dmarcClient.stopScan();
        }
        
        // Обновляем UI
        this._updateScanningUI(false);
        
        this.scanningState.isScanning = false;
        
        // Обновляем текст прогресса
        if (this.progressText) {
            this.progressText.textContent = 'Сканирование остановлено';
        }
        
        Logger.info('Scanning stopped by user');
    }
    
    /**
     * Обработчик клика по кнопке экспорта JSON
     * @private
     */
    _handleExportClick() {
        if (!window.exportService || !window.resultsManager) {
            Logger.error('Export service or results manager not available');
            return;
        }
        
        const results = window.resultsManager.getAllResults();
        
        if (results.length === 0) {
            this._showError('Нет результатов для экспорта');
            return;
        }
        
        // Экспортируем результаты в JSON
        window.exportService.exportToJSON(results)
            .then(() => {
                this._showInfo('Результаты успешно экспортированы в JSON');
            })
            .catch(error => {
                Logger.error('Error exporting to JSON', error);
                this._showError('Ошибка при экспорте результатов: ' + error.message);
            });
    }
    
    /**
     * Обработчик клика по кнопке экспорта PDF
     * @private
     */
    _handleExportPdfClick() {
        if (!window.exportService || !window.resultsManager) {
            Logger.error('Export service or results manager not available');
            return;
        }
        
        const results = window.resultsManager.getAllResults();
        
        if (results.length === 0) {
            this._showError('Нет результатов для экспорта');
            return;
        }
        
        // Экспортируем результаты в PDF
        window.exportService.exportToPDF(results)
            .then(() => {
                this._showInfo('Результаты успешно экспортированы в PDF');
            })
            .catch(error => {
                Logger.error('Error exporting to PDF', error);
                this._showError('Ошибка при экспорте результатов: ' + error.message);
            });
    }
    
    /**
     * Обработчик клика по кнопке экспорта CSV
     * @private
     */
    _handleExportCsvClick() {
        if (!window.exportService || !window.resultsManager) {
            Logger.error('Export service or results manager not available');
            return;
        }
        
        const results = window.resultsManager.getAllResults();
        
        if (results.length === 0) {
            this._showError('Нет результатов для экспорта');
            return;
        }
        
        // Экспортируем результаты в CSV
        window.exportService.exportToCSV(results)
            .then(() => {
                this._showInfo('Результаты успешно экспортированы в CSV');
            })
            .catch(error => {
                Logger.error('Error exporting to CSV', error);
                this._showError('Ошибка при экспорте результатов: ' + error.message);
            });
    }
    
    /**
     * Обработчик клика по кнопке настроек
     * @private
     */
    _handleSettingsClick() {
        if (!this.settingsPanel) return;
        
        const isVisible = this.settingsPanel.style.display === 'block';
        
        // Переключаем отображение
        this.settingsPanel.style.display = isVisible ? 'none' : 'block';
        
        // Меняем текст кнопки
        if (this.settingsBtn) {
            this.settingsBtn.textContent = isVisible ? 'Показать настройки' : 'Скрыть настройки';
        }
        
        // Скрываем другие панели
        this._hideOtherPanels();
        
        Logger.debug(`Settings panel ${isVisible ? 'hidden' : 'shown'}`);
    }
    
    /**
     * Обработчик клика по кнопке сохранения настроек
     * @private
     */
    _handleSaveSettingsClick() {
        // Получаем значения настроек
        const apiKey = DOMUtils.getById('apiKey')?.value || '';
        const useApi = DOMUtils.getById('useApi')?.checked || false;
        const requestDelay = parseInt(DOMUtils.getById('requestDelay')?.value) || 1000;
        const concurrentRequests = parseInt(DOMUtils.getById('concurrentRequests')?.value) || 3;
        const logLevel = DOMUtils.getById('logLevel')?.value || 'info';
        
        // Сохраняем настройки
        StorageManager.set('api_key', apiKey);
        StorageManager.set('use_api', useApi);
        StorageManager.set('request_delay', requestDelay);
        StorageManager.set('concurrent_requests', concurrentRequests);
        
        // Обновляем настройки клиента
        if (window.dmarcClient) {
            window.dmarcClient.apiKey = apiKey;
            window.dmarcClient.useApi = useApi;
            window.dmarcClient.setDelay(requestDelay);
            window.dmarcClient.setConcurrentRequests(concurrentRequests);
        }
        
        // Обновляем уровень логирования
        if (window.Logger) {
            window.Logger.setLevel(logLevel);
        }
        
        // Скрываем панель настроек
        if (this.settingsPanel) {
            this.settingsPanel.style.display = 'none';
        }
        
        // Меняем текст кнопки
        if (this.settingsBtn) {
            this.settingsBtn.textContent = 'Показать настройки';
        }
        
        // Показываем сообщение об успешном сохранении
        this._showInfo('Настройки успешно сохранены');
        
        Logger.info('Settings saved', { apiKey: apiKey ? '***' : '', useApi, requestDelay, concurrentRequests, logLevel });
    }
    
    /**
     * Скрытие других панелей
     * @private
     */
    _hideOtherPanels() {
        // Скрываем панель статистики, если она открыта
        const statsPanel = DOMUtils.getById('statsPanel');
        const statsBtn = DOMUtils.getById('statsBtn');
        
        if (statsPanel && statsPanel.style.display === 'block') {
            statsPanel.style.display = 'none';
            
            if (statsBtn) {
                statsBtn.textContent = 'Статистика';
            }
        }
    }
    
    /**
     * Запуск сканирования доменов
     * @param {File} file - Файл с доменами
     * @private
     */
    async _startScan(file) {
        if (!file || !window.dmarcClient) {
            Logger.error('No file selected or DMARC client not available');
            return;
        }
        
        try {
            // Обновляем UI
            this._updateScanningUI(true);
            
            // Изменяем состояние сканирования
            this.scanningState.isScanning = true;
            this.scanningState.processed = 0;
            this.scanningState.progress = 0;
            this.scanningState.total = 0;
            
            // Обновляем прогресс-бар
            this._updateProgressBar(0);
            
            // Обновляем текст прогресса
            if (this.progressText) {
                this.progressText.textContent = 'Чтение файла с доменами...';
            }
            
            // Читаем файл
            const content = await FileUtils.readTextFile(file);
            const domains = FileUtils.parseLines(content);
            
            if (domains.length === 0) {
                throw new Error('Файл не содержит доменов');
            }
            
            // Обновляем текст прогресса
            if (this.progressText) {
                this.progressText.textContent = `Подготовка к сканированию ${domains.length} доменов...`;
            }
            
            // Обновляем состояние
            this.scanningState.total = domains.length;
            
            // Очищаем предыдущие результаты
            if (window.resultsManager) {
                window.resultsManager.clearResults();
            }
            
            // Обновляем прогресс-бар
            this._updateProgressBar(5);
            
            // Функция для отслеживания прогресса
            const progressCallback = (processed, total, result) => {
                // Обновляем состояние
                this.scanningState.processed = processed;
                this.scanningState.progress = Math.round((processed / total) * 100);
                
                // Обновляем прогресс-бар
                this._updateProgressBar(this.scanningState.progress);
                
                // Обновляем текст прогресса
                if (this.progressText) {
                    this.progressText.textContent = `Обработано ${processed} из ${total} доменов (${this.scanningState.progress}%)`;
                }
                
                // Добавляем результат
                if (window.resultsManager) {
                    window.resultsManager.addResult(result);
                }
                
                // Обновляем состояние сканирования в ResultsManager
                if (window.resultsManager) {
                    window.resultsManager.updateScanState({
                        isScanning: true,
                        processed,
                        total,
                        progress: this.scanningState.progress
                    });
                }
            };
            
            // Запускаем сканирование
            const results = await window.dmarcClient.checkDomains(domains, progressCallback);
            
            // Обновляем результаты
            if (window.resultsManager) {
                window.resultsManager.setResults(results);
            }
            
            // Обновляем состояние сканирования
            this.scanningState.isScanning = false;
            
            // Обновляем UI
            this._updateScanningUI(false);
            
            // Обновляем прогресс-бар
            this._updateProgressBar(100);
            
            // Обновляем текст прогресса
            if (this.progressText) {
                this.progressText.textContent = `Сканирование завершено. Обработано ${domains.length} доменов.`;
            }
            
            // Генерируем событие завершения сканирования
            EventBus.emit('scan:completed', results);
            
            // Сохраняем результаты в localStorage
            if (window.resultsManager) {
                window.resultsManager.saveResultsToStorage();
            }
            
            // Показываем статистику
            if (window.statisticsManager) {
                window.statisticsManager.showStatsPanel();
            }
            
            Logger.info(`Scanning completed. Processed ${domains.length} domains.`);
        } catch (error) {
            Logger.error('Error during scanning', error);
            
            // Обновляем состояние сканирования
            this.scanningState.isScanning = false;
            
            // Обновляем UI
            this._updateScanningUI(false);
            
            // Обновляем текст прогресса
            if (this.progressText) {
                this.progressText.textContent = `Ошибка сканирования: ${error.message}`;
            }
            
            // Генерируем событие ошибки сканирования
            EventBus.emit('scan:error', error);
            
            // Показываем сообщение об ошибке
            this._showError(`Ошибка сканирования: ${error.message}`);
        }
    }
    
    /**
     * Обновление UI в зависимости от состояния сканирования
     * @param {boolean} isScanning - Выполняется ли сканирование
     * @private
     */
    _updateScanningUI(isScanning) {
        // Обновляем состояние кнопок
        if (this.scanBtn) {
            this.scanBtn.disabled = isScanning;
        }
        
        if (this.stopBtn) {
            this.stopBtn.disabled = !isScanning;
        }
        
        if (this.loadBtn) {
            this.loadBtn.disabled = isScanning;
        }
        
        // Обновляем состояние кнопок экспорта
        if (this.exportBtn) {
            this.exportBtn.disabled = isScanning;
        }
        
        if (this.exportPdfBtn) {
            this.exportPdfBtn.disabled = isScanning;
        }
        
        if (this.exportCsvBtn) {
            this.exportCsvBtn.disabled = isScanning;
        }
    }
    
    /**
     * Обработчик выбора файла
     * @param {File} file - Выбранный файл
     * @private
     */
    _handleFileSelected(file) {
        // Активируем кнопку сканирования
        if (this.scanBtn) {
            this.scanBtn.disabled = false;
        }
        
        Logger.info(`File selected: ${file.name}`);
    }
    
    /**
     * Обработчик изменения состояния сканирования
     * @param {Object} state - Новое состояние сканирования
     * @private
     */
    _handleScanStateChanged(state) {
        // Обновляем состояние сканирования
        this.scanningState = { ...this.scanningState, ...state };
        
        // Обновляем прогресс-бар
        this._updateProgressBar(this.scanningState.progress);
    }
    
    /**
     * Обработчик завершения сканирования
     * @param {Array<Object>} results - Результаты сканирования
     * @private
     */
    _handleScanCompleted(results) {
        // Активируем кнопки экспорта
        if (this.exportBtn) {
            this.exportBtn.disabled = false;
        }
        
        if (this.exportPdfBtn) {
            this.exportPdfBtn.disabled = false;
        }
        
        if (this.exportCsvBtn) {
            this.exportCsvBtn.disabled = false;
        }
        
        // Показываем сообщение об успешном сканировании
        this._showInfo(`Сканирование завершено. Проверено ${results.length} доменов.`);
    }
    
    /**
     * Обработчик ошибки сканирования
     * @param {Error} error - Ошибка
     * @private
     */
    _handleScanError(error) {
        // Показываем сообщение об ошибке
        this._showError(`Ошибка сканирования: ${error.message}`);
    }
    
    /**
     * Обработчик уведомления об ошибке
     * @param {string} message - Сообщение об ошибке
     * @private
     */
    _handleNotificationError(message) {
        this._showError(message);
    }
    
    /**
     * Обработчик информационного уведомления
     * @param {string} message - Информационное сообщение
     * @private
     */
    _handleNotificationInfo(message) {
        this._showInfo(message);
    }
    
    /**
     * Обновление прогресс-бара
     * @param {number} progress - Прогресс (0-100)
     * @private
     */
    _updateProgressBar(progress) {
        if (!this.progressBar) return;
        
        // Приводим прогресс к корректному диапазону
        const normalizedProgress = Math.max(0, Math.min(100, progress));
        
        // Обновляем ширину прогресс-бара
        DOMUtils.animationFrame(() => {
            this.progressBar.style.width = `${normalizedProgress}%`;
        });
    }
    
    /**
     * Показ сообщения об ошибке
     * @param {string} message - Сообщение об ошибке
     * @private
     */
    _showError(message) {
        // Добавляем лог ошибки
        Logger.error(message);
        
        // Показываем уведомление (можно добавить тосты или другие уведомления)
        alert(message);
    }
    
    /**
     * Показ информационного сообщения
     * @param {string} message - Информационное сообщение
     * @private
     */
    _showInfo(message) {
        // Добавляем информационный лог
        Logger.info(message);
        
        // Здесь можно добавить отображение тостов или других уведомлений
    }
    
    /**
     * Загрузка настроек в форму настроек
     */
    loadSettingsToForm() {
        // Загружаем настройки из хранилища
        const apiKey = StorageManager.get('api_key', { defaultValue: '' });
        const useApi = StorageManager.get('use_api', { defaultValue: false });
        const requestDelay = StorageManager.get('request_delay', { defaultValue: 1000 });
        const concurrentRequests = StorageManager.get('concurrent_requests', { defaultValue: 3 });
        const logLevel = StorageManager.get('log_level', { defaultValue: 'info' });
        
        // Устанавливаем значения в форму
        const apiKeyInput = DOMUtils.getById('apiKey');
        const useApiCheckbox = DOMUtils.getById('useApi');
        const requestDelayInput = DOMUtils.getById('requestDelay');
        const concurrentRequestsInput = DOMUtils.getById('concurrentRequests');
        const logLevelSelect = DOMUtils.getById('logLevel');
        
        if (apiKeyInput) apiKeyInput.value = apiKey;
        if (useApiCheckbox) useApiCheckbox.checked = useApi;
        if (requestDelayInput) requestDelayInput.value = requestDelay;
        if (concurrentRequestsInput) concurrentRequestsInput.value = concurrentRequests;
        if (logLevelSelect) logLevelSelect.value = logLevel;
        
        Logger.debug('Settings loaded to form');
    }
}

// Создаем глобальный экземпляр UI менеджера после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
    
    // Загружаем настройки в форму
    window.uiManager.loadSettingsToForm();
    
    // Проверяем, есть ли сохраненные результаты
    if (StorageManager.get('scan_results')) {
        // Загружаем результаты
        if (window.resultsManager && window.resultsManager.loadResultsFromStorage()) {
            Logger.info('Loaded saved results from storage');
            
            // Активируем кнопки экспорта
            const exportBtn = DOMUtils.getById('exportBtn');
            const exportPdfBtn = DOMUtils.getById('exportPdfBtn');
            const exportCsvBtn = DOMUtils.getById('exportCsvBtn');
            
            if (exportBtn) exportBtn.disabled = false;
            if (exportPdfBtn) exportPdfBtn.disabled = false;
            if (exportCsvBtn) exportCsvBtn.disabled = false;
        }
    }
});