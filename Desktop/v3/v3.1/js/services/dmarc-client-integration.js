/**
 * Скрипт интеграции нового MultiModeDmarcClient с существующими компонентами приложения
 * Обеспечивает плавный переход от старой реализации к новой
 */

(function() {
    // Сохраняем ссылку на оригинальный клиент (если он создан раньше)
    const originalClient = window.dmarcClient;
    
    /**
     * Интеграция мультирежимного клиента
     */
    function integrateModeClient() {
        if (!window.MultiModeDmarcClient) {
            console.error('MultiModeDmarcClient class not found');
            return;
        }
        
        try {
            // Проверяем, есть ли уже созданный мультирежимный клиент
            if (window.dmarcClient instanceof window.MultiModeDmarcClient) {
                console.log('MultiModeDmarcClient already initialized');
                return;
            }
            
            // Если оригинальный клиент существует, копируем его настройки
            let options = {};
            if (originalClient) {
                options = {
                    delay: originalClient.delay || 1000,
                    concurrentRequests: originalClient.concurrentRequests || 3,
                    apiKey: originalClient.apiKey || '',
                    cacheEnabled: originalClient.cacheEnabled !== undefined ? originalClient.cacheEnabled : true
                };
            } else {
                // Загружаем настройки из хранилища
                options = {
                    delay: window.StorageManager?.get('request_delay', { defaultValue: 1000 }) || 1000,
                    concurrentRequests: window.StorageManager?.get('concurrent_requests', { defaultValue: 3 }) || 3,
                    apiKey: window.StorageManager?.get('api_key', { defaultValue: '' }) || '',
                    cacheEnabled: true
                };
            }
            
            // Загружаем сохраненный режим
            const savedMode = window.StorageManager?.get('dmarc_client_mode', { defaultValue: 'offline' }) || 'offline';
            options.mode = savedMode;
            
            // Создаем новый клиент
            window.dmarcClient = new window.MultiModeDmarcClient(options);
            
            // Логируем информацию о замене
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`Integrated new MultiModeDmarcClient in ${savedMode} mode`);
            } else {
                console.log(`Integrated new MultiModeDmarcClient in ${savedMode} mode`);
            }
            
            // Оповещаем о создании клиента
            if (window.EventBus && typeof window.EventBus.emit === 'function') {
                window.EventBus.emit('dmarc_client:ready', window.dmarcClient.getMode());
            }
        } catch (error) {
            console.error('Error integrating MultiModeDmarcClient:', error);
            
            // Восстанавливаем оригинальный клиент в случае ошибки
            if (originalClient) {
                window.dmarcClient = originalClient;
                console.log('Restored original DMARC client due to integration error');
            }
        }
    }
    
    /**
     * Проверка готовности всех необходимых компонентов
     */
    function checkDependencies() {
        if (!window.MultiModeDmarcClient) {
            console.warn('MultiModeDmarcClient not available yet, waiting...');
            return false;
        }
        
        if (!window.StorageManager) {
            console.warn('StorageManager not available yet, waiting...');
            return false;
        }
        
        if (!window.EventBus) {
            console.warn('EventBus not available yet, waiting...');
            return false;
        }
        
        return true;
    }
    
    /**
     * Обработчик события dmarc_client:ready
     */
    function handleClientReady() {
        // Интегрируем модульный режим работы
        integrateModeClient();
        
        // Инициализируем UI селектор режима
        if (!window.modeSelectorUI && window.ModeSelectorUI) {
            window.modeSelectorUI = new window.ModeSelectorUI();
        }
        
        console.log('DMARC client integration complete');
    }
    
    // Обработчик загрузки DOM
    function onDOMContentLoaded() {
        // Подписываемся на событие готовности клиента
        if (window.EventBus && typeof window.EventBus.on === 'function') {
            window.EventBus.on('dmarc_client:ready', handleClientReady);
        } else {
            // Если EventBus не доступен, пробуем интегрировать напрямую
            setTimeout(handleClientReady, 1000);
        }
        
        // Инициализируем интеграцию после небольшой задержки,
        // чтобы дать время всем компонентам загрузиться
        setTimeout(() => {
            if (checkDependencies()) {
                handleClientReady();
            } else {
                // Если не все зависимости загружены, повторяем попытку еще раз
                setTimeout(() => {
                    if (checkDependencies()) {
                        handleClientReady();
                    } else {
                        console.error('Failed to integrate DMARC client due to missing dependencies');
                    }
                }, 2000);
            }
        }, 500);
    }
    
    // Запускаем интеграцию после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
    } else {
        // DOM уже загружен
        onDOMContentLoaded();
    }
})();