/**
 * Пример интеграции MultiModeDmarcClient в существующий проект
 */

// ====== Пример добавления кнопки переключения режимов в интерфейс ======

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что клиент уже создан
    if (!window.dmarcClient) {
        console.error('DMARC client not initialized');
        return;
    }
    
    // Создаем панель выбора режима
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;
    
    // Добавляем группу настроек режима
    const modeSettingsGroup = document.createElement('div');
    modeSettingsGroup.className = 'settings-group';
    modeSettingsGroup.innerHTML = `
        <label for="clientMode">Режим проверки:</label>
        <select id="clientMode">
            <option value="api">API EasyDMARC</option>
            <option value="web">Web EasyDMARC</option>
            <option value="offline">Автономный (DNS)</option>
            <option value="simulation">Симуляция</option>
        </select>
        <button id="checkModeAvailability" class="small-btn" type="button">Проверить доступность</button>
        <p id="modeStatusMessage" style="margin-top: 5px; font-size: 12px;"></p>
    `;
    
    // Вставляем группу настроек перед кнопкой сохранения
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn && saveSettingsBtn.parentNode) {
        saveSettingsBtn.parentNode.before(modeSettingsGroup);
    } else {
        settingsPanel.appendChild(modeSettingsGroup);
    }
    
    // Получаем текущий режим и устанавливаем значение в селект
    const clientModeSelect = document.getElementById('clientMode');
    if (clientModeSelect) {
        clientModeSelect.value = window.dmarcClient.getMode();
    }
    
    // Обработчик для кнопки проверки доступности
    const checkModeBtn = document.getElementById('checkModeAvailability');
    const modeStatusMessage = document.getElementById('modeStatusMessage');
    
    if (checkModeBtn) {
        checkModeBtn.addEventListener('click', async function() {
            checkModeBtn.disabled = true;
            if (modeStatusMessage) {
                modeStatusMessage.textContent = 'Проверка доступности...';
                modeStatusMessage.style.color = '';
            }
            
            try {
                // Выбираем наилучший доступный режим
                const bestMode = await window.dmarcClient.selectBestAvailableMode();
                
                // Обновляем селект
                if (clientModeSelect) {
                    clientModeSelect.value = bestMode;
                }
                
                // Сохраняем выбранный режим
                if (window.StorageManager && typeof window.StorageManager.set === 'function') {
                    window.StorageManager.set('dmarc_client_mode', bestMode);
                }
                
                if (modeStatusMessage) {
                    modeStatusMessage.textContent = `Выбран режим: ${bestMode}`;
                    modeStatusMessage.style.color = 'var(--success-color)';
                }
                
                // Логируем
                if (window.Logger && typeof window.Logger.info === 'function') {
                    window.Logger.info(`Switched to best available mode: ${bestMode}`);
                } else {
                    console.log(`Switched to best available mode: ${bestMode}`);
                }
            } catch (error) {
                if (modeStatusMessage) {
                    modeStatusMessage.textContent = `Ошибка: ${error.message}`;
                    modeStatusMessage.style.color = 'var(--error-color)';
                }
                
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error('Error selecting best mode', error);
                } else {
                    console.error('Error selecting best mode', error);
                }
            } finally {
                checkModeBtn.disabled = false;
            }
        });
    }
    
    // Сохранение выбранного режима при сохранении настроек
    if (saveSettingsBtn) {
        // Сохраняем оригинальный обработчик
        const originalClickHandler = saveSettingsBtn.onclick;
        
        // Заменяем обработчик
        saveSettingsBtn.onclick = function(event) {
            // Сохраняем выбранный режим
            if (clientModeSelect) {
                const selectedMode = clientModeSelect.value;
                window.dmarcClient.setMode(selectedMode);
                
                // Сохраняем в хранилище
                if (window.StorageManager && typeof window.StorageManager.set === 'function') {
                    window.StorageManager.set('dmarc_client_mode', selectedMode);
                }
                
                if (window.Logger && typeof window.Logger.info === 'function') {
                    window.Logger.info(`DMARC client mode set to ${selectedMode}`);
                } else {
                    console.log(`DMARC client mode set to ${selectedMode}`);
                }
            }
            
            // Вызываем оригинальный обработчик, если он был
            if (typeof originalClickHandler === 'function') {
                return originalClickHandler.call(this, event);
            }
        };
    }
});

// ====== Пример интеграции с существующими обработчиками событий ======

document.addEventListener('DOMContentLoaded', function() {
    // Подписываемся на события изменения режима
    if (window.EventBus && typeof window.EventBus.on === 'function') {
        window.EventBus.on('dmarc_client:mode_changed', function(mode) {
            // Обновляем UI при смене режима
            const progressText = document.getElementById('progressText');
            if (progressText) {
                const modeNames = {
                    'api': 'API EasyDMARC',
                    'web': 'Web EasyDMARC',
                    'offline': 'Автономный (DNS)',
                    'simulation': 'Симуляция'
                };
                progressText.textContent = `Режим проверки: ${modeNames[mode] || mode}`;
            }
            
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`DMARC client mode changed to ${mode}`);
            } else {
                console.log(`DMARC client mode changed to ${mode}`);
            }
        });
    }
});

// ====== Пример более детальной проверки одного домена ======

/**
 * Функция для проверки одного домена с возможностью выбора режима
 * @param {string} domain - Домен для проверки
 * @param {string} [mode] - Режим проверки (опционально)
 * @returns {Promise<Object>} Результат проверки
 */
async function checkSingleDomain(domain, mode) {
    if (!window.dmarcClient) {
        throw new Error('DMARC client not initialized');
    }
    
    // Сохраняем текущий режим
    const currentMode = window.dmarcClient.getMode();
    
    try {
        // Устанавливаем режим, если указан
        if (mode) {
            window.dmarcClient.setMode(mode);
        }
        
        // Проверяем домен
        return await window.dmarcClient.checkDomain(domain);
    } finally {
        // Восстанавливаем исходный режим
        if (mode) {
            window.dmarcClient.setMode(currentMode);
        }
    }
}

// Пример вызова:
// checkSingleDomain('example.com', 'offline')
//     .then(result => console.log('Результат проверки:', result))
//     .catch(error => console.error('Ошибка проверки:', error));

// ====== Пример добавления индикатора текущего режима в интерфейс ======

document.addEventListener('DOMContentLoaded', function() {
    // Находим заголовок приложения
    const headerTitle = document.querySelector('h1');
    if (!headerTitle) return;
    
    // Создаем индикатор режима
    const modeIndicator = document.createElement('div');
    modeIndicator.className = 'mode-indicator';
    modeIndicator.innerHTML = `
        <span class="mode-label">Режим:</span>
        <span class="mode-value" id="currentModeDisplay">загрузка...</span>
    `;
    
    // Добавляем стили
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .mode-indicator {
            display: inline-block;
            margin-left: 15px;
            font-size: 14px;
            padding: 3px 8px;
            background-color: var(--filter-panel-bg);
            border-radius: 4px;
            vertical-align: middle;
        }
        .mode-label {
            color: var(--text-secondary);
            margin-right: 5px;
        }
        .mode-value {
            font-weight: bold;
        }
        .mode-api {
            color: var(--success-color);
        }
        .mode-web {
            color: var(--info-color);
        }
        .mode-offline {
            color: var(--warning-color);
        }
        .mode-simulation {
            color: var(--debug-color);
        }
    `;
    document.head.appendChild(styleElement);
    
    // Вставляем после заголовка
    headerTitle.appendChild(modeIndicator);
    
    // Функция обновления отображения режима
    function updateModeDisplay() {
        if (!window.dmarcClient) return;
        
        const modeDisplay = document.getElementById('currentModeDisplay');
        if (!modeDisplay) return;
        
        const currentMode = window.dmarcClient.getMode();
        const modeNames = {
            'api': 'API EasyDMARC',
            'web': 'Web EasyDMARC',
            'offline': 'Автономный (DNS)',
            'simulation': 'Симуляция'
        };
        
        modeDisplay.textContent = modeNames[currentMode] || currentMode;
        
        // Удаляем все классы режимов
        modeDisplay.classList.remove('mode-api', 'mode-web', 'mode-offline', 'mode-simulation');
        
        // Добавляем класс для текущего режима
        modeDisplay.classList.add(`mode-${currentMode}`);
    }
    
    // Обновляем при загрузке
    updateModeDisplay();
    
    // Обновляем при изменении режима
    if (window.EventBus && typeof window.EventBus.on === 'function') {
        window.EventBus.on('dmarc_client:mode_changed', function() {
            updateModeDisplay();
        });
    }
});