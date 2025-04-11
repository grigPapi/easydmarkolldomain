/**
 * Менеджер хранилища для работы с localStorage и sessionStorage
 * Обеспечивает удобный API для работы с хранилищем, обрабатывает ошибки,
 * автоматически сериализует и десериализует данные
 */
const StorageManager = (function() {
    const PREFIX = 'dmarc_scanner_';
    const MAX_STORAGE_USAGE = 4 * 1024 * 1024; // 4 МБ - безопасный лимит для localStorage
    
    /**
     * Проверка доступности localStorage
     * @returns {boolean} Доступен ли localStorage
     */
    function isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('LocalStorage is not available', e);
            return false;
        }
    }
    
    /**
     * Получение полного ключа с префиксом
     * @param {string} key - Исходный ключ
     * @returns {string} Ключ с префиксом
     */
    function getFullKey(key) {
        return PREFIX + key;
    }
    
    /**
     * Сохранение данных в хранилище
     * @param {string} key - Ключ
     * @param {*} data - Данные для сохранения
     * @param {Object} options - Опции сохранения
     * @param {boolean} [options.session=false] - Использовать sessionStorage вместо localStorage
     * @param {number} [options.expiry] - Время истечения в миллисекундах от текущего момента
     * @returns {boolean} Успешно ли сохранение
     */
    function set(key, data, options = {}) {
        if (!isStorageAvailable()) {
            return false;
        }
        
        const fullKey = getFullKey(key);
        const storage = options.session ? sessionStorage : localStorage;
        
        try {
            // Если нужно хранить с временем истечения
            let dataToStore = data;
            if (options.expiry) {
                dataToStore = {
                    data,
                    expiry: Date.now() + options.expiry
                };
            }
            
            // Сериализуем данные
            const serialized = JSON.stringify(dataToStore);
            
            // Проверяем размер данных
            const itemSize = fullKey.length + serialized.length * 2; // 2 байта на символ в UTF-16
            if (itemSize > MAX_STORAGE_USAGE) {
                console.error(`Data too large to store (${itemSize} bytes)`, { key });
                return false;
            }
            
            // Пробуем сохранить
            storage.setItem(fullKey, serialized);
            
            console.log(`Data stored with key "${key}"`, { size: serialized.length });
            return true;
        } catch (e) {
            // Обрабатываем ошибку QuotaExceededError
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('Storage quota exceeded, clearing old items');
                removeOldest(storage);
                return set(key, data, options); // Пробуем снова
            }
            
            console.error(`Error storing data with key "${key}"`, e);
            return false;
        }
    }
    
    /**
     * Получение данных из хранилища
     * @param {string} key - Ключ
     * @param {Object} options - Опции чтения
     * @param {boolean} [options.session=false] - Использовать sessionStorage
     * @param {*} [options.defaultValue] - Значение по умолчанию
     * @returns {*} Полученные данные или defaultValue
     */
    function get(key, options = {}) {
        if (!isStorageAvailable()) {
            return options.defaultValue;
        }
        
        const fullKey = getFullKey(key);
        const storage = options.session ? sessionStorage : localStorage;
        
        try {
            const value = storage.getItem(fullKey);
            
            if (value === null) {
                return options.defaultValue;
            }
            
            // Обработка известных ключей как простых строк
            if (key === 'log_level' || key === 'api_key' || 
                key === 'request_delay' || key === 'concurrent_requests' || 
                key === 'use_api') {
                // Для известных простых ключей возвращаем значение как есть
                if (key === 'use_api') {
                    return value === 'true';
                } else if (key === 'request_delay' || key === 'concurrent_requests') {
                    return parseInt(value) || options.defaultValue;
                } else {
                    return value;
                }
            }
            
            // Попытка десериализовать JSON данные
            try {
                // Десериализуем данные
                const parsed = JSON.parse(value);
                
                // Проверяем, содержат ли данные время истечения
                if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('expiry')) {
                    if (Date.now() > parsed.expiry) {
                        console.log(`Data with key "${key}" has expired`);
                        storage.removeItem(fullKey);
                        return options.defaultValue;
                    }
                    return parsed.data;
                }
                
                return parsed;
            } catch (jsonError) {
                // Если JSON.parse не удался, возвращаем исходное значение
                console.log(`Non-JSON data for key "${key}", returning as is`);
                return value;
            }
        } catch (e) {
            console.error(`Error retrieving data with key "${key}"`, e);
            return options.defaultValue;
        }
    }
    
    /**
     * Удаление данных из хранилища
     * @param {string} key - Ключ
     * @param {Object} options - Опции
     * @param {boolean} [options.session=false] - Использовать sessionStorage
     * @returns {boolean} Успешно ли удаление
     */
    function remove(key, options = {}) {
        if (!isStorageAvailable()) {
            return false;
        }
        
        const fullKey = getFullKey(key);
        const storage = options.session ? sessionStorage : localStorage;
        
        try {
            storage.removeItem(fullKey);
            console.log(`Data with key "${key}" removed`);
            return true;
        } catch (e) {
            console.error(`Error removing data with key "${key}"`, e);
            return false;
        }
    }
    
    /**
     * Очистка всех данных приложения из хранилища
     * @param {Object} options - Опции
     * @param {boolean} [options.session=false] - Использовать sessionStorage
     * @returns {boolean} Успешно ли очистка
     */
    function clear(options = {}) {
        if (!isStorageAvailable()) {
            return false;
        }
        
        const storage = options.session ? sessionStorage : localStorage;
        
        try {
            // Удаляем только элементы с нашим префиксом
            const keysToRemove = [];
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => storage.removeItem(key));
            console.log(`Cleared ${keysToRemove.length} items from storage`);
            return true;
        } catch (e) {
            console.error('Error clearing storage', e);
            return false;
        }
    }
    
    /**
     * Получение всех ключей из хранилища, относящихся к приложению
     * @param {Object} options - Опции
     * @param {boolean} [options.session=false] - Использовать sessionStorage
     * @returns {Array<string>} Массив ключей без префикса
     */
    function keys(options = {}) {
        if (!isStorageAvailable()) {
            return [];
        }
        
        const storage = options.session ? sessionStorage : localStorage;
        const result = [];
        
        try {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(PREFIX)) {
                    result.push(key.substring(PREFIX.length));
                }
            }
            
            return result;
        } catch (e) {
            console.error('Error getting storage keys', e);
            return [];
        }
    }
    
    /**
     * Получение размера используемого хранилища в байтах
     * @param {Object} options - Опции
     * @param {boolean} [options.session=false] - Использовать sessionStorage
     * @returns {number} Размер в байтах
     */
    function getSize(options = {}) {
        if (!isStorageAvailable()) {
            return 0;
        }
        
        const storage = options.session ? sessionStorage : localStorage;
        let totalSize = 0;
        
        try {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(PREFIX)) {
                    const value = storage.getItem(key);
                    totalSize += key.length * 2 + value.length * 2; // 2 байта на символ в UTF-16
                }
            }
            
            return totalSize;
        } catch (e) {
            console.error('Error calculating storage size', e);
            return 0;
        }
    }
    
    /**
     * Удаление самых старых элементов из хранилища
     * @param {Storage} storage - Хранилище (localStorage или sessionStorage)
     * @private
     */
    function removeOldest(storage) {
        try {
            const itemsWithTimestamp = [];
            
            // Собираем все элементы с информацией о времени создания
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(PREFIX)) {
                    try {
                        const value = storage.getItem(key);
                        const parsed = JSON.parse(value);
                        
                        // Если есть поле expiry, используем его как приоритет для удаления
                        if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('expiry')) {
                            itemsWithTimestamp.push({ key, timestamp: parsed.expiry });
                        }
                    } catch (e) {
                        // Если не удалось разобрать JSON, просто добавляем ключ без временной метки
                        itemsWithTimestamp.push({ key, timestamp: 0 });
                    }
                }
            }
            
            // Сортируем по возрастанию временной метки (сначала старые)
            itemsWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);
            
            // Удаляем до 20% самых старых элементов
            const itemsToRemove = Math.max(1, Math.floor(itemsWithTimestamp.length * 0.2));
            for (let i = 0; i < itemsToRemove && i < itemsWithTimestamp.length; i++) {
                storage.removeItem(itemsWithTimestamp[i].key);
            }
            
            console.log(`Removed ${itemsToRemove} oldest items from storage`);
        } catch (e) {
            console.error('Error removing oldest items from storage', e);
        }
    }
    
    // Создаем и возвращаем публичное API
    const storageManager = {
        set: set,
        get: get,
        remove: remove,
        clear: clear,
        keys: keys,
        getSize: getSize,
        isAvailable: isStorageAvailable
    };
    
    // Делаем API доступным глобально
    window.StorageManager = storageManager;
    
    // Возвращаем API для использования в модулях
    return storageManager;
})();

// Инициализируем хелпер
console.log('StorageManager initialized', {
    set: typeof StorageManager.set === 'function',
    get: typeof StorageManager.get === 'function',
    remove: typeof StorageManager.remove === 'function',
    clear: typeof StorageManager.clear === 'function',
    keys: typeof StorageManager.keys === 'function',
    getSize: typeof StorageManager.getSize === 'function',
    isAvailable: typeof StorageManager.isAvailable === 'function'
});