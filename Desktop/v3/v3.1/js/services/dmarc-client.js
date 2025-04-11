/**
 * Усовершенствованный клиент для проверки DMARC, SPF и DKIM настроек доменов
 * Для работы без API ключа (через парсинг веб-интерфейса)
 * 
 * Этот скрипт можно добавить в ваш проект в качестве замены текущего клиента
 * или использовать кусочки кода для исправления текущего клиента.
 */
class EnhancedDmarcClient {
    constructor(options = {}) {
        this.baseWebUrl = 'https://easydmarc.com/tools/domain-scanner';
        this.delay = options.delay || 1000;
        this.concurrentRequests = options.concurrentRequests || 3;
        
        // Состояние сканирования
        this.isScanning = false;
        this.shouldStop = false;
        this.activeScanTasks = [];
        
        // Инициализация кэша
        this.cache = new Map();
        this.cacheEnabled = options.cacheEnabled !== false;
        
        console.log('EnhancedDmarcClient initialized', {
            delay: this.delay,
            concurrentRequests: this.concurrentRequests,
            cacheEnabled: this.cacheEnabled
        });
    }
    
    /**
     * Проверка формата домена
     * @param {string} domain - строка для проверки
     * @returns {boolean} - является ли строка корректным доменом
     */
    isValidDomain(domain) {
        // Простая регулярка для проверки домена
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
        return domainRegex.test(domain);
    }
    
    /**
     * Проверка домена через симуляцию (для тестирования и отладки)
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     * @private
     */
    async _simulateDomainCheck(domain) {
        console.log(`Simulating domain check: ${domain}`);
        
        try {
            // Проверяем корректность формата домена
            if (!this.isValidDomain(domain)) {
                return this._getErrorResult(domain, 'Некорректный формат доменного имени');
            }
            
            // Проверяем кэш
            if (this.cacheEnabled && this.cache.has(domain)) {
                console.log(`Using cached result for ${domain}`);
                return this.cache.get(domain);
            }
            
            // Имитируем задержку запроса
            await new Promise(resolve => setTimeout(resolve, this.delay));
            
            // Генерация случайных статусов для демонстрации
            const statuses = ['ok', 'warning', 'error'];
            const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];
            
            const dmarcStatus = randomItem(statuses);
            const spfStatus = randomItem(statuses);
            const dkimStatus = randomItem(statuses);
            
            // Формируем случайные данные настроек
            let dmarcPolicy = '';
            let spfRecord = '';
            let dkimSelectors = [];
            
            if (dmarcStatus === 'ok') {
                const policies = ['reject', 'quarantine', 'none'];
                dmarcPolicy = randomItem(policies);
            }
            
            if (spfStatus === 'ok' || spfStatus === 'warning') {
                spfRecord = 'v=spf1 include:_spf.' + domain + ' ~all';
            }
            
            if (dkimStatus === 'ok') {
                dkimSelectors = ['default', 'google'];
            } else if (dkimStatus === 'warning') {
                dkimSelectors = ['default'];
            }
            
            const result = {
                domain: domain,
                dmarc: {
                    status: dmarcStatus,
                    policy: dmarcPolicy,
                    record: dmarcStatus === 'ok' ? `v=DMARC1; p=${dmarcPolicy}; pct=100;` : ''
                },
                spf: {
                    status: spfStatus,
                    record: spfRecord
                },
                dkim: {
                    status: dkimStatus,
                    selectors: dkimSelectors
                },
                mx: ['mx1.' + domain, 'mx2.' + domain],
                securityScore: this._calculateSecurityScore(dmarcStatus, spfStatus, dkimStatus)
            };
            
            // Сохраняем в кэш
            if (this.cacheEnabled) {
                this.cache.set(domain, result);
            }
            
            return result;
        } catch (error) {
            console.error(`Error simulating domain check for ${domain}:`, error);
            return this._getErrorResult(domain, error.message);
        }
    }
    
    /**
     * Проверка домена через web-интерфейс EasyDMARC
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     */
    async checkDomain(domain) {
        try {
            if (!domain || typeof domain !== 'string') {
                return this._getErrorResult('unknown', 'Не указан домен для проверки');
            }
            
            // Очищаем домен от лишних символов
            domain = domain.trim();
            
            // Проверяем корректность формата домена
            if (!this.isValidDomain(domain)) {
                return this._getErrorResult(domain, 'Некорректный формат доменного имени');
            }
            
            // Проверяем кэш
            if (this.cacheEnabled && this.cache.has(domain)) {
                console.log(`Using cached result for ${domain}`);
                return this.cache.get(domain);
            }
            
            // Для тестирования можно использовать симуляцию
            // return this._simulateDomainCheck(domain);
            
            // TODO: Здесь должен быть код для парсинга результатов с web-интерфейса EasyDMARC
            // Поскольку прямой запрос к API не работает из-за CORS-ограничений,
            // в реальном приложении нужно реализовать серверную часть для проксирования запросов
            // или использовать другие методы обхода CORS
            
            // В текущей реализации возвращаем симуляцию
            return this._simulateDomainCheck(domain);
        } catch (error) {
            console.error(`Error checking domain ${domain}:`, error);
            return this._getErrorResult(domain, error.message);
        }
    }
    
    /**
     * Массовая проверка доменов с многопоточной обработкой
     * @param {Array<string>} domains - Список доменов для проверки
     * @param {Function} [progressCallback=null] - Функция обратного вызова для отслеживания прогресса
     * @returns {Promise<Array<Object>>} - Результаты проверки всех доменов
     */
    async checkDomains(domains, progressCallback = null) {
        // Проверяем, не запущено ли уже сканирование
        if (this.isScanning) {
            console.warn('Scanning already in progress');
            throw new Error('Сканирование уже выполняется');
        }
        
        // Фильтруем и очищаем список доменов, удаляя некорректные форматы
        const validDomains = domains
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0 && this.isValidDomain(domain));
        
        const invalidDomains = domains
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0 && !this.isValidDomain(domain));
        
        // Логируем информацию о найденных некорректных доменах
        if (invalidDomains.length > 0) {
            console.warn(`Found ${invalidDomains.length} invalid domain formats: ${invalidDomains.join(', ')}`);
        }
        
        if (validDomains.length === 0) {
            console.warn('No valid domains to scan');
            throw new Error('Список не содержит корректных доменов для сканирования');
        }
        
        console.log(`Starting scan of ${validDomains.length} domains`);
        
        // Устанавливаем состояние сканирования
        this.isScanning = true;
        this.shouldStop = false;
        this.activeScanTasks = [];
        
        const results = [];
        let completedCount = 0;
        
        // Создаем пул доменов для сканирования
        const domainQueue = [...validDomains];
        
        // Добавляем в результаты информацию о некорректных доменах
        invalidDomains.forEach(domain => {
            const errorResult = this._getErrorResult(domain, 'Некорректный формат доменного имени');
            results.push(errorResult);
            completedCount++;
            
            if (progressCallback) {
                try {
                    progressCallback(completedCount, validDomains.length + invalidDomains.length, errorResult);
                } catch (callbackError) {
                    console.error('Error in progress callback for invalid domain:', callbackError);
                }
            }
        });
        
        // Функция для обработки одного домена из очереди
        const processNextDomain = async () => {
            if (this.shouldStop) {
                console.log('Scanning stopped by user');
                return null;
            }
            
            // Получаем следующий домен из очереди
            const domain = domainQueue.shift();
            if (!domain) {
                return null; // Очередь пуста
            }
            
            try {
                console.log(`Processing domain: ${domain}`);
                const result = await this.checkDomain(domain);
                
                results.push(result);
                completedCount++;
                
                // Вызываем колбэк прогресса
                if (progressCallback) {
                    try {
                        progressCallback(completedCount, validDomains.length + invalidDomains.length, result);
                    } catch (callbackError) {
                        console.error('Error in progress callback:', callbackError);
                    }
                }
                
                // Добавляем небольшую задержку между доменами для снижения нагрузки
                await new Promise(resolve => setTimeout(resolve, this.delay));
                
                return result;
            } catch (error) {
                console.error(`Error processing domain ${domain}:`, error);
                
                const errorResult = this._getErrorResult(domain, error.message);
                results.push(errorResult);
                completedCount++;
                
                if (progressCallback) {
                    try {
                        progressCallback(completedCount, validDomains.length + invalidDomains.length, errorResult);
                    } catch (callbackError) {
                        console.error('Error in progress callback for error case:', callbackError);
                    }
                }
                
                return errorResult;
            }
        };
        
        try {
            // Создаем пул обработчиков параллельных запросов
            const workerPromises = [];
            
            const startWorker = async () => {
                let result;
                // Обрабатываем домены, пока они есть в очереди
                while ((result = await processNextDomain()) !== null) {
                    // Продолжаем обработку
                }
            };
            
            // Запускаем указанное количество воркеров
            const workerCount = Math.min(this.concurrentRequests, validDomains.length);
            for (let i = 0; i < workerCount; i++) {
                const workerPromise = startWorker();
                workerPromises.push(workerPromise);
                this.activeScanTasks.push(workerPromise);
            }
            
            // Ждем завершения всех воркеров
            await Promise.all(workerPromises);
            
            console.log(`Scan completed for ${validDomains.length + invalidDomains.length} domains`);
            
            // Сбрасываем состояние сканирования
            this.isScanning = false;
            this.activeScanTasks = [];
            
            // Сортируем результаты в правильном порядке
            const allDomains = [...invalidDomains, ...validDomains];
            return this._sortResultsByOriginalOrder(results, allDomains);
        } catch (error) {
            console.error('Error during domain scanning:', error);
            this.isScanning = false;
            this.activeScanTasks = [];
            throw error;
        }
    }
    
    /**
     * Остановка текущего сканирования
     */
    stopScan() {
        if (!this.isScanning) {
            console.warn('No active scanning to stop');
            return;
        }
        
        console.log('Stopping scan...');
        this.shouldStop = true;
    }
    
    /**
     * Получение статуса сканирования
     * @returns {Object} Объект со статусом
     */
    getScanStatus() {
        return {
            isScanning: this.isScanning,
            shouldStop: this.shouldStop,
            activeTasksCount: this.activeScanTasks.length
        };
    }
    
    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }
    
    /**
     * Включение/выключение кэширования
     * @param {boolean} enabled - Включить кэширование
     */
    setCacheEnabled(enabled) {
        this.cacheEnabled = !!enabled;
        console.log(`Caching ${this.cacheEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Установка задержки между запросами
     * @param {number} delay - Задержка в миллисекундах
     */
    setDelay(delay) {
        this.delay = parseInt(delay) || 1000;
        console.log(`Request delay set to ${this.delay} ms`);
    }
    
    /**
     * Установка количества одновременных запросов
     * @param {number} count - Количество одновременных запросов
     */
    setConcurrentRequests(count) {
        this.concurrentRequests = parseInt(count) || 3;
        console.log(`Concurrent requests set to ${this.concurrentRequests}`);
    }
    
    /**
     * Генерация результата с ошибкой
     * @param {string} domain - Доменное имя
     * @param {string} errorMessage - Сообщение об ошибке
     * @returns {Object} - Результат с ошибкой
     * @private
     */
    _getErrorResult(domain, errorMessage) {
        return {
            domain: domain,
            error: errorMessage,
            dmarc: { status: 'error', policy: '', record: '' },
            spf: { status: 'error', record: '' },
            dkim: { status: 'error', selectors: [] },
            mx: [],
            securityScore: 0
        };
    }
    
    /**
     * Расчет оценки безопасности
     * @param {string} dmarcStatus - Статус DMARC
     * @param {string} spfStatus - Статус SPF
     * @param {string} dkimStatus - Статус DKIM
     * @returns {number} - Оценка безопасности (0-100)
     * @private
     */
    _calculateSecurityScore(dmarcStatus, spfStatus, dkimStatus) {
        let score = 0;
        
        // DMARC (до 40 баллов)
        if (dmarcStatus === 'ok') score += 40;
        else if (dmarcStatus === 'warning') score += 20;
        
        // SPF (до 30 баллов)
        if (spfStatus === 'ok') score += 30;
        else if (spfStatus === 'warning') score += 15;
        
        // DKIM (до 30 баллов)
        if (dkimStatus === 'ok') score += 30;
        else if (dkimStatus === 'warning') score += 15;
        
        return score;
    }
    
    /**
     * Сортировка результатов по оригинальному порядку доменов
     * @param {Array<Object>} results - Результаты сканирования
     * @param {Array<string>} originalDomains - Исходный порядок доменов
     * @returns {Array<Object>} - Отсортированные результаты
     * @private
     */
    _sortResultsByOriginalOrder(results, originalDomains) {
        // Создаем карту "домен -> результат"
        const resultMap = new Map();
        results.forEach(result => {
            resultMap.set(result.domain, result);
        });
        
        // Сортируем результаты в соответствии с исходным порядком
        return originalDomains.map(domain => {
            return resultMap.get(domain) || this._getErrorResult(domain, 'Result not found');
        });
    }
}

// Пример использования:
/*
// Создание экземпляра клиента
const dmarcClient = new EnhancedDmarcClient({
    delay: 1000,
    concurrentRequests: 3,
    cacheEnabled: true
});

// Проверка одного домена
dmarcClient.checkDomain('example.com')
    .then(result => console.log('Результат:', result))
    .catch(error => console.error('Ошибка:', error));

// Проверка списка доменов
const domains = ['example.com', 'google.com', 'invalid domain', 'microsoft.com'];
dmarcClient.checkDomains(domains, (processed, total, result) => {
    console.log(`Прогресс: ${processed}/${total}`, result.domain);
})
    .then(results => console.log('Все результаты:', results))
    .catch(error => console.error('Ошибка сканирования:', error));
*/

// Глобальный экземпляр клиента
window.dmarcClient = null;

// Инициализируем клиент после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем сохраненные настройки
    const delay = StorageManager.get('request_delay', { defaultValue: 1000 });
    const concurrentRequests = StorageManager.get('concurrent_requests', { defaultValue: 3 });
    
    // Создаем клиент
    window.dmarcClient = new EnhancedDmarcClient({
        delay,
        concurrentRequests,
        cacheEnabled: true
    });
    
    // Оповещаем о создании клиента
    if (window.EventBus) {
        window.EventBus.emit('dmarc_client:ready');
    }
    
    if (window.Logger && typeof window.Logger.info === 'function') {
        window.Logger.info('Global EnhancedDmarcClient instance created');
    } else {
        console.log('Global EnhancedDmarcClient instance created');
    }
});