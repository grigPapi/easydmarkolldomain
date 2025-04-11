/**
 * Мультирежимный клиент для проверки DMARC, SPF и DKIM настроек доменов
 * Поддерживает различные режимы работы: API, Web, Offline (DNS) и Simulation
 */
class MultiModeDmarcClient {
    constructor(options = {}) {
        // Базовые настройки
        this.delay = options.delay || 1000;
        this.concurrentRequests = options.concurrentRequests || 3;
        this.apiKey = options.apiKey || '';
        
        // Режим работы (api, web, offline, simulation)
        this.mode = options.mode || 'simulation';
        
        // Состояние сканирования
        this.isScanning = false;
        this.shouldStop = false;
        this.activeScanTasks = [];
        
        // Инициализация кэша
        this.cache = new Map();
        this.cacheEnabled = options.cacheEnabled !== false;
        
        // Настройки для режима Offline (DNS)
        this.dnsServer = options.dnsServer || 'https://cloudflare-dns.com/dns-query';
        this.dnsTimeout = options.dnsTimeout || 5000;
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info('MultiModeDmarcClient initialized', {
                mode: this.mode,
                delay: this.delay,
                concurrentRequests: this.concurrentRequests,
                cacheEnabled: this.cacheEnabled
            });
        } else {
            console.log('MultiModeDmarcClient initialized', {
                mode: this.mode,
                delay: this.delay,
                concurrentRequests: this.concurrentRequests,
                cacheEnabled: this.cacheEnabled
            });
        }
    }
    
    /**
     * Установка режима работы
     * @param {string} mode - Режим работы (api, web, offline, simulation)
     */
    setMode(mode) {
        const availableModes = ['api', 'web', 'offline', 'simulation'];
        
        if (!availableModes.includes(mode)) {
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn(`Invalid mode: ${mode}. Using simulation mode.`);
            } else {
                console.warn(`Invalid mode: ${mode}. Using simulation mode.`);
            }
            mode = 'simulation';
        }
        
        const previousMode = this.mode;
        this.mode = mode;
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Client mode changed from ${previousMode} to ${mode}`);
        } else {
            console.log(`Client mode changed from ${previousMode} to ${mode}`);
        }
        
        // Вызываем событие изменения режима
        if (window.EventBus && typeof window.EventBus.emit === 'function') {
            window.EventBus.emit('dmarc_client:mode_changed', mode);
        }
        
        return this.mode;
    }
    
    /**
     * Получение текущего режима работы
     * @returns {string} - Текущий режим работы
     */
    getMode() {
        return this.mode;
    }
    
    /**
     * Проверка доступности режима API
     * @returns {Promise<boolean>} - Доступен ли режим API
     */
    async checkApiModeAvailability() {
        try {
            if (!this.apiKey) {
                return false;
            }
            
            // TODO: Реализовать проверку API ключа
            // В реальном приложении здесь должен быть запрос к API
            // для проверки валидности ключа
            
            return false; // Временно всегда возвращаем false
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error checking API mode availability', error);
            } else {
                console.error('Error checking API mode availability', error);
            }
            return false;
        }
    }
    
    /**
     * Проверка доступности режима Web
     * @returns {Promise<boolean>} - Доступен ли режим Web
     */
    async checkWebModeAvailability() {
        try {
            // TODO: Реализовать проверку доступности Web-парсинга
            // В реальном приложении здесь должен быть запрос к веб-странице
            // для проверки возможности парсинга
            
            return false; // Временно всегда возвращаем false
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error checking Web mode availability', error);
            } else {
                console.error('Error checking Web mode availability', error);
            }
            return false;
        }
    }
    
    /**
     * Проверка доступности режима Offline (DNS)
     * @returns {Promise<boolean>} - Доступен ли режим Offline
     */
    async checkOfflineModeAvailability() {
        try {
            // Пробуем сделать тестовый DNS-запрос
            const testResult = await this._dnsLookup('example.com', 'TXT');
            return !!testResult && Array.isArray(testResult);
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error checking Offline mode availability', error);
            } else {
                console.error('Error checking Offline mode availability', error);
            }
            return false;
        }
    }
    
    /**
     * Выбор наилучшего доступного режима
     * @returns {Promise<string>} - Выбранный режим
     */
    async selectBestAvailableMode() {
        try {
            // Проверяем доступность режимов в порядке предпочтения
            if (await this.checkApiModeAvailability()) {
                return this.setMode('api');
            }
            
            if (await this.checkWebModeAvailability()) {
                return this.setMode('web');
            }
            
            if (await this.checkOfflineModeAvailability()) {
                return this.setMode('offline');
            }
            
            // Если ничего не доступно, используем симуляцию
            return this.setMode('simulation');
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error selecting best mode', error);
            } else {
                console.error('Error selecting best mode', error);
            }
            return this.setMode('simulation');
        }
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
     * Проверка домена
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     */
    async checkDomain(domain) {
        try {
            if (!domain || typeof domain !== 'string') {
                return this._getErrorResult('unknown', 'Не указан домен для проверки');
            }
            
            // Очищаем домен от лишних символов
            domain = domain.trim().toLowerCase();
            
            // Проверяем корректность формата домена
            if (!this.isValidDomain(domain)) {
                return this._getErrorResult(domain, 'Некорректный формат доменного имени');
            }
            
            // Проверяем кэш
            if (this.cacheEnabled && this.cache.has(domain)) {
                if (window.Logger && typeof window.Logger.debug === 'function') {
                    window.Logger.debug(`Using cached result for ${domain}`);
                } else {
                    console.log(`Using cached result for ${domain}`);
                }
                return this.cache.get(domain);
            }
            
            let result;
            
            // Выбираем метод проверки в зависимости от режима
            switch (this.mode) {
                case 'api':
                    result = await this._checkDomainViaApi(domain);
                    break;
                case 'web':
                    result = await this._checkDomainViaWeb(domain);
                    break;
                case 'offline':
                    result = await this._checkDomainOffline(domain);
                    break;
                case 'simulation':
                default:
                    result = await this._simulateDomainCheck(domain);
            }
            
            // Сохраняем в кэш
            if (this.cacheEnabled) {
                this.cache.set(domain, result);
            }
            
            return result;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error checking domain ${domain}:`, error);
            } else {
                console.error(`Error checking domain ${domain}:`, error);
            }
            return this._getErrorResult(domain, error.message);
        }
    }
    
    /**
     * Проверка домена через API EasyDMARC
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     * @private
     */
    async _checkDomainViaApi(domain) {
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Checking domain via API: ${domain}`);
        } else {
            console.log(`Checking domain via API: ${domain}`);
        }
        
        // TODO: Реализовать проверку через API
        // В реальном приложении здесь должен быть запрос к API EasyDMARC
        
        // Временно используем симуляцию
        return this._simulateDomainCheck(domain);
    }
    
    /**
     * Проверка домена через Web-парсинг
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     * @private
     */
    async _checkDomainViaWeb(domain) {
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Checking domain via Web: ${domain}`);
        } else {
            console.log(`Checking domain via Web: ${domain}`);
        }
        
        // TODO: Реализовать проверку через Web-парсинг
        // В реальном приложении здесь должен быть запрос к веб-странице
        // и последующий парсинг результатов
        
        // Временно используем симуляцию
        return this._simulateDomainCheck(domain);
    }
    
    /**
     * Проверка домена с использованием DNS-запросов (Offline режим)
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     * @private
     */
    async _checkDomainOffline(domain) {
        try {
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`Checking domain offline (DNS): ${domain}`);
            } else {
                console.log(`Checking domain offline (DNS): ${domain}`);
            }
            
            // Получаем MX-записи
            const mxRecords = await this._getMxRecords(domain);
            
            // Проверяем DMARC
            const dmarcResult = await this._checkDmarc(domain);
            
            // Проверяем SPF
            const spfResult = await this._checkSpf(domain);
            
            // Проверяем DKIM (базовая проверка)
            const dkimResult = await this._checkDkim(domain);
            
            // Рассчитываем общую оценку безопасности
            const securityScore = this._calculateSecurityScore(
                dmarcResult.status, 
                spfResult.status, 
                dkimResult.status
            );
            
            // Собираем результат
            const result = {
                domain,
                dmarc: dmarcResult,
                spf: spfResult,
                dkim: dkimResult,
                mx: mxRecords,
                securityScore
            };
            
            return result;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error checking domain offline: ${domain}`, error);
            } else {
                console.error(`Error checking domain offline: ${domain}`, error);
            }
            return this._getErrorResult(domain, `Ошибка офлайн-проверки: ${error.message}`);
        }
    }
    
    /**
     * Проверка DMARC записи
     * @param {string} domain - Доменное имя
     * @returns {Promise<Object>} - Результат проверки DMARC
     * @private
     */
    async _checkDmarc(domain) {
        try {
            // Запрашиваем DMARC запись
            const dmarcDomain = `_dmarc.${domain}`;
            const dmarcRecords = await this._dnsLookup(dmarcDomain, 'TXT');
            
            // Если записи нет, DMARC не настроен
            if (!dmarcRecords || !dmarcRecords.length) {
                return {
                    status: 'error',
                    record: '',
                    policy: ''
                };
            }
            
            // Ищем DMARC запись среди TXT записей
            let dmarcRecord = null;
            for (const record of dmarcRecords) {
                if (record.includes('v=DMARC1')) {
                    dmarcRecord = record;
                    break;
                }
            }
            
            if (!dmarcRecord) {
                return {
                    status: 'error',
                    record: '',
                    policy: ''
                };
            }
            
            // Анализируем DMARC запись
            let status = 'ok';
            let policy = '';
            
            // Извлекаем политику
            const policyMatch = dmarcRecord.match(/p=([^;\s]+)/i);
            if (policyMatch) {
                policy = policyMatch[1].toLowerCase();
                
                // Если политика none, статус warning
                if (policy === 'none') {
                    status = 'warning';
                }
            } else {
                status = 'warning';
            }
            
            // Проверяем процент
            const pctMatch = dmarcRecord.match(/pct=([0-9]+)/i);
            if (!pctMatch || parseInt(pctMatch[1]) < 100) {
                status = 'warning';
            }
            
            // Проверяем наличие адреса для отчетов
            const ruaMatch = dmarcRecord.match(/rua=([^;\s]+)/i);
            if (!ruaMatch) {
                status = 'warning';
            }
            
            return {
                status,
                record: dmarcRecord,
                policy
            };
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error checking DMARC for ${domain}`, error);
            } else {
                console.error(`Error checking DMARC for ${domain}`, error);
            }
            
            return {
                status: 'error',
                record: '',
                policy: '',
                error: error.message
            };
        }
    }
    
    /**
     * Проверка SPF записи
     * @param {string} domain - Доменное имя
     * @returns {Promise<Object>} - Результат проверки SPF
     * @private
     */
    async _checkSpf(domain) {
        try {
            // Запрашиваем TXT записи домена
            const txtRecords = await this._dnsLookup(domain, 'TXT');
            
            // Если записей нет, SPF не настроен
            if (!txtRecords || !txtRecords.length) {
                return {
                    status: 'error',
                    record: ''
                };
            }
            
            // Ищем SPF запись среди TXT записей
            let spfRecord = null;
            for (const record of txtRecords) {
                if (record.includes('v=spf1')) {
                    spfRecord = record;
                    break;
                }
            }
            
            if (!spfRecord) {
                return {
                    status: 'error',
                    record: ''
                };
            }
            
            // Анализируем SPF запись
            let status = 'ok';
            
            // Проверяем директиву
            if (spfRecord.includes('?all')) {
                status = 'warning'; // Нейтральная директива
            } else if (spfRecord.includes('+all')) {
                status = 'warning'; // Опасная директива
            } else if (!spfRecord.includes('-all') && !spfRecord.includes('~all')) {
                status = 'warning'; // Нет завершающей директивы
            }
            
            return {
                status,
                record: spfRecord
            };
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error checking SPF for ${domain}`, error);
            } else {
                console.error(`Error checking SPF for ${domain}`, error);
            }
            
            return {
                status: 'error',
                record: '',
                error: error.message
            };
        }
    }
    
    /**
     * Проверка DKIM
     * @param {string} domain - Доменное имя
     * @returns {Promise<Object>} - Результат проверки DKIM
     * @private
     */
    async _checkDkim(domain) {
        try {
            // Список популярных селекторов для проверки
            const commonSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'dkim'];
            const foundSelectors = [];
            
            // Проверяем каждый селектор
            for (const selector of commonSelectors) {
                try {
                    const dkimDomain = `${selector}._domainkey.${domain}`;
                    const dkimRecords = await this._dnsLookup(dkimDomain, 'TXT');
                    
                    if (dkimRecords && dkimRecords.length > 0) {
                        // Проверяем, содержит ли запись DKIM данные
                        for (const record of dkimRecords) {
                            if (record.includes('v=DKIM1') || record.includes('k=rsa') || record.includes('p=')) {
                                foundSelectors.push(selector);
                                break;
                            }
                        }
                    }
                } catch (selectorError) {
                    // Игнорируем ошибки для отдельных селекторов
                    continue;
                }
            }
            
            // Определяем статус
            let status;
            if (foundSelectors.length > 0) {
                status = foundSelectors.length > 1 ? 'ok' : 'warning';
            } else {
                status = 'error';
            }
            
            return {
                status,
                selectors: foundSelectors
            };
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error checking DKIM for ${domain}`, error);
            } else {
                console.error(`Error checking DKIM for ${domain}`, error);
            }
            
            return {
                status: 'error',
                selectors: [],
                error: error.message
            };
        }
    }
    
    /**
     * Получение MX-записей домена
     * @param {string} domain - Доменное имя
     * @returns {Promise<Array<string>>} - Массив MX-записей
     * @private
     */
    async _getMxRecords(domain) {
        try {
            const mxRecords = await this._dnsLookup(domain, 'MX');
            
            if (!mxRecords || !mxRecords.length) {
                return [];
            }
            
            // В реальном приложении здесь должна быть обработка MX-записей
            // В упрощенном варианте просто возвращаем их как строки
            return mxRecords;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error getting MX records for ${domain}`, error);
            } else {
                console.error(`Error getting MX records for ${domain}`, error);
            }
            return [];
        }
    }
    
    /**
     * Выполнение DNS-запроса
     * @param {string} domain - Доменное имя
     * @param {string} type - Тип записи (A, MX, TXT и т.д.)
     * @returns {Promise<Array<string>>} - Массив записей
     * @private
     */
    async _dnsLookup(domain, type) {
        try {
            // В браузере нет прямого доступа к DNS, поэтому используем DNS-over-HTTPS
            // или любой другой доступный метод
            
            // Для демонстрации просто имитируем ответы
            // В реальном приложении здесь должен быть запрос к DNS через API
            
            switch (type) {
                case 'MX':
                    if (domain === 'example.com') {
                        return ['mail.example.com', 'backup-mail.example.com'];
                    } else if (domain === 'gmail.com') {
                        return ['aspmx.l.google.com', 'alt1.aspmx.l.google.com'];
                    } else {
                        // Генерируем случайные MX записи для демонстрации
                        const randomCount = Math.floor(Math.random() * 3) + 1;
                        const records = [];
                        for (let i = 0; i < randomCount; i++) {
                            records.push(`mx${i+1}.${domain}`);
                        }
                        return records;
                    }
                
                case 'TXT':
                    if (domain === '_dmarc.example.com') {
                        return ['v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100'];
                    } else if (domain === '_dmarc.gmail.com') {
                        return ['v=DMARC1; p=none; sp=quarantine; rua=mailto:mailauth-reports@google.com'];
                    } else if (domain === 'example.com') {
                        return ['v=spf1 include:_spf.example.com -all'];
                    } else if (domain === 'gmail.com') {
                        return ['v=spf1 include:_spf.google.com ~all'];
                    } else if (domain.includes('_domainkey')) {
                        // Имитируем DKIM запись
                        if (Math.random() > 0.5) {
                            return ['v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...'];
                        } else {
                            return [];
                        }
                    } else if (domain.startsWith('_dmarc.')) {
                        // Генерируем случайную DMARC запись
                        const policies = ['none', 'quarantine', 'reject'];
                        const policy = policies[Math.floor(Math.random() * policies.length)];
                        const pct = Math.random() > 0.3 ? '100' : '50';
                        const baseDomain = domain.substring(7); // Удаляем "_dmarc."
                        
                        return [`v=DMARC1; p=${policy}; rua=mailto:dmarc@${baseDomain}; pct=${pct}`];
                    } else {
                        // Генерируем случайную SPF запись
                        const allModes = ['-all', '~all', '?all', '+all'];
                        const allMode = allModes[Math.floor(Math.random() * allModes.length)];
                        
                        return [`v=spf1 include:_spf.${domain} ${allMode}`];
                    }
                    
                default:
                    return [];
            }
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`DNS lookup error for ${domain} (${type})`, error);
            } else {
                console.error(`DNS lookup error for ${domain} (${type})`, error);
            }
            throw error;
        }
    }
    
    /**
     * Проверка домена через симуляцию (для тестирования и отладки)
     * @param {string} domain - Доменное имя для проверки
     * @returns {Promise<Object>} - Результаты проверки
     * @private
     */
    async _simulateDomainCheck(domain) {
        try {
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`Simulating domain check: ${domain}`);
            } else {
                console.log(`Simulating domain check: ${domain}`);
            }
            
            // Проверка валидности домена была выполнена ранее
            
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
                    record: dmarcStatus === 'error' ? '' : `v=DMARC1; p=${dmarcPolicy}; pct=100;`
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
            
            return result;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error simulating domain check for ${domain}:`, error);
            } else {
                console.error(`Error simulating domain check for ${domain}:`, error);
            }
            return this._getErrorResult(domain, error.message);
        }
    }
    
    /**
     * Массовая проверка доменов
     * @param {Array<string>} domains - Список доменов для проверки
     * @param {Function} [progressCallback=null] - Функция обратного вызова для отслеживания прогресса
     * @returns {Promise<Array<Object>>} - Результаты проверки всех доменов
     */
    async checkDomains(domains, progressCallback = null) {
        // Проверяем, не запущено ли уже сканирование
        if (this.isScanning) {
            const errorMsg = 'Сканирование уже выполняется';
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn(errorMsg);
            } else {
                console.warn(errorMsg);
            }
            throw new Error(errorMsg);
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
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn(`Found ${invalidDomains.length} invalid domain formats: ${invalidDomains.join(', ')}`);
            } else {
                console.warn(`Found ${invalidDomains.length} invalid domain formats: ${invalidDomains.join(', ')}`);
            }
        }
        
        if (validDomains.length === 0) {
            const errorMsg = 'Список не содержит корректных доменов для сканирования';
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn(errorMsg);
            } else {
                console.warn(errorMsg);
            }
            throw new Error(errorMsg);
        }
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Starting scan of ${validDomains.length} domains in mode: ${this.mode}`);
        } else {
            console.log(`Starting scan of ${validDomains.length} domains in mode: ${this.mode}`);
        }
        
        // Устанавливаем состояние сканирования
        this.isScanning = true;
        this.shouldStop = false;
        this.activeScanTasks = [];
        
        const results = [];
        let completedCount = 0;
        const totalCount = validDomains.length + invalidDomains.length;
        
        // Создаем пул доменов для сканирования
        const domainQueue = [...validDomains];
        
        // Добавляем в результаты информацию о некорректных доменах
        invalidDomains.forEach(domain => {
            const errorResult = this._getErrorResult(domain, 'Некорректный формат доменного имени');
            results.push(errorResult);
            completedCount++;
            
            if (progressCallback) {
                try {
                    progressCallback(completedCount, totalCount, errorResult);
                } catch (callbackError) {
                    if (window.Logger && typeof window.Logger.error === 'function') {
                        window.Logger.error('Error in progress callback for invalid domain:', callbackError);
                    } else {
                        console.error('Error in progress callback for invalid domain:', callbackError);
                    }
                }
            }
        });
        
        // Функция для обработки одного домена из очереди
        const processNextDomain = async () => {
            if (this.shouldStop) {
                if (window.Logger && typeof window.Logger.info === 'function') {
                    window.Logger.info('Scanning stopped by user');
                } else {
                    console.log('Scanning stopped by user');
                }
                return null;
            }
            
            // Получаем следующий домен из очереди
            const domain = domainQueue.shift();
            if (!domain) {
                return null; // Очередь пуста
            }
            
            try {
                if (window.Logger && typeof window.Logger.debug === 'function') {
                    window.Logger.debug(`Processing domain: ${domain}`);
                } else {
                    console.log(`Processing domain: ${domain}`);
                }
                
                const result = await this.checkDomain(domain);
                
                results.push(result);
                completedCount++;
                
                // Вызываем колбэк прогресса
                if (progressCallback) {
                    try {
                        progressCallback(completedCount, totalCount, result);
                    } catch (callbackError) {
                        if (window.Logger && typeof window.Logger.error === 'function') {
                            window.Logger.error('Error in progress callback:', callbackError);
                        } else {
                            console.error('Error in progress callback:', callbackError);
                        }
                    }
                }
                
                // Добавляем небольшую задержку между доменами для снижения нагрузки
                await new Promise(resolve => setTimeout(resolve, this.delay));
                
                return result;
            } catch (error) {
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error(`Error processing domain ${domain}:`, error);
                } else {
                    console.error(`Error processing domain ${domain}:`, error);
                }
                
                const errorResult = this._getErrorResult(domain, error.message);
                results.push(errorResult);
                completedCount++;
                
                if (progressCallback) {
                    try {
                        progressCallback(completedCount, totalCount, errorResult);
                    } catch (callbackError) {
                        if (window.Logger && typeof window.Logger.error === 'function') {
                            window.Logger.error('Error in progress callback for error case:', callbackError);
                        } else {
                            console.error('Error in progress callback for error case:', callbackError);
                        }
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
            
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`Scan completed for ${totalCount} domains`);
            } else {
                console.log(`Scan completed for ${totalCount} domains`);
            }
            
            // Сбрасываем состояние сканирования
            this.isScanning = false;
            this.activeScanTasks = [];
            
            // Сортируем результаты в правильном порядке
            const allDomains = [...invalidDomains, ...validDomains];
            return this._sortResultsByOriginalOrder(results, allDomains);
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error('Error during domain scanning:', error);
            } else {
                console.error('Error during domain scanning:', error);
            }
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
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn('No active scanning to stop');
            } else {
                console.warn('No active scanning to stop');
            }
            return;
        }
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info('Stopping scan...');
        } else {
            console.log('Stopping scan...');
        }
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
            activeTasksCount: this.activeScanTasks.length,
            mode: this.mode
        };
    }
    
    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info('Cache cleared');
        } else {
            console.log('Cache cleared');
        }
    }
    
    /**
     * Включение/выключение кэширования
     * @param {boolean} enabled - Включить кэширование
     */
    setCacheEnabled(enabled) {
        this.cacheEnabled = !!enabled;
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Caching ${this.cacheEnabled ? 'enabled' : 'disabled'}`);
        } else {
            console.log(`Caching ${this.cacheEnabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * Установка задержки между запросами
     * @param {number} delay - Задержка в миллисекундах
     */
    setDelay(delay) {
        this.delay = parseInt(delay) || 1000;
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Request delay set to ${this.delay} ms`);
        } else {
            console.log(`Request delay set to ${this.delay} ms`);
        }
    }
    
    /**
     * Установка количества одновременных запросов
     * @param {number} count - Количество одновременных запросов
     */
    setConcurrentRequests(count) {
        this.concurrentRequests = parseInt(count) || 3;
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`Concurrent requests set to ${this.concurrentRequests}`);
        } else {
            console.log(`Concurrent requests set to ${this.concurrentRequests}`);
        }
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

// Делаем класс MultiModeDmarcClient доступным глобально
window.MultiModeDmarcClient = MultiModeDmarcClient;

// Глобальный экземпляр клиента
window.dmarcClient = null;

// Инициализируем клиент после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Загружаем сохраненные настройки
        const delay = window.StorageManager?.get('request_delay', { defaultValue: 1000 }) || 1000;
        const concurrentRequests = window.StorageManager?.get('concurrent_requests', { defaultValue: 3 }) || 3;
        const apiKey = window.StorageManager?.get('api_key', { defaultValue: '' }) || '';
        const savedMode = window.StorageManager?.get('dmarc_client_mode', { defaultValue: 'simulation' }) || 'simulation';
        
        // Создаем клиент
        window.dmarcClient = new MultiModeDmarcClient({
            mode: savedMode,
            delay,
            concurrentRequests,
            apiKey,
            cacheEnabled: true
        });
        
        // Оповещаем о создании клиента
        if (window.EventBus && typeof window.EventBus.emit === 'function') {
            window.EventBus.emit('dmarc_client:ready', window.dmarcClient.getMode());
        }
        
        if (window.Logger && typeof window.Logger.info === 'function') {
            window.Logger.info(`MultiModeDmarcClient instance created in ${savedMode} mode`);
        } else {
            console.log(`MultiModeDmarcClient instance created in ${savedMode} mode`);
        }
    } catch (error) {
        if (window.Logger && typeof window.Logger.error === 'function') {
            window.Logger.error('Error initializing MultiModeDmarcClient', error);
        } else {
            console.error('Error initializing MultiModeDmarcClient', error);
        }
        
        // Создаем клиент с настройками по умолчанию
        window.dmarcClient = new MultiModeDmarcClient({ mode: 'simulation' });
    }
});