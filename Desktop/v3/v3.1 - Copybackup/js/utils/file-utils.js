/**
 * Утилиты для работы с файлами
 * Содержит функции для чтения, обработки и экспорта файлов
 */
const FileUtils = (function() {
    /**
     * Чтение текстового файла
     * @param {File} file - Файл для чтения
     * @returns {Promise<string>} Содержимое файла
     */
    function readTextFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = event => {
                try {
                    const content = event.target.result;
                    if (window.Logger && typeof window.Logger.debug === 'function') {
                        window.Logger.debug(`File "${file.name}" read successfully (${content.length} bytes)`);
                    } else {
                        console.log(`File "${file.name}" read successfully (${content.length} bytes)`);
                    }
                    resolve(content);
                } catch (error) {
                    if (window.Logger && typeof window.Logger.error === 'function') {
                        window.Logger.error(`Error processing file contents for "${file.name}"`, error);
                    } else {
                        console.error(`Error processing file contents for "${file.name}"`, error);
                    }
                    reject(error);
                }
            };
            
            reader.onerror = error => {
                if (window.Logger && typeof window.Logger.error === 'function') {
                    window.Logger.error(`Error reading file "${file.name}"`, error);
                } else {
                    console.error(`Error reading file "${file.name}"`, error);
                }
                reject(new Error(`Error reading file: ${error.message}`));
            };
            
            reader.readAsText(file);
        });
    }
    
    /**
     * Парсинг содержимого файла на строки
     * @param {string} content - Содержимое файла
     * @returns {Array<string>} Массив непустых строк
     */
    function parseLines(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }
        
        const lines = content
            .split(/\r?\n/)  // Разбиваем по всем видам переносов строк
            .map(line => line.trim())  // Удаляем пробелы
            .filter(line => line.length > 0);  // Фильтруем пустые строки
        
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug(`Parsed ${lines.length} non-empty lines from content`);
        } else {
            console.log(`Parsed ${lines.length} non-empty lines from content`);
        }
        return lines;
    }
    
    /**
     * Чтение текстового файла и парсинг на строки
     * @param {File} file - Файл для чтения
     * @returns {Promise<Array<string>>} Массив непустых строк
     */
    function readLinesFromFile(file) {
        return readTextFile(file).then(parseLines);
    }
    
    /**
     * Создание и сохранение файла
     * @param {string} content - Содержимое файла
     * @param {string} filename - Имя файла
     * @param {string} [type='text/plain'] - MIME-тип файла
     */
    function saveFile(content, filename, type = 'text/plain') {
        try {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Освобождаем ссылку
            setTimeout(() => {
                URL.revokeObjectURL(url);
                if (window.Logger && typeof window.Logger.debug === 'function') {
                    window.Logger.debug(`URL for "${filename}" revoked`);
                } else {
                    console.log(`URL for "${filename}" revoked`);
                }
            }, 1000);
            
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`File "${filename}" saved successfully (${content.length} bytes)`);
            } else {
                console.log(`File "${filename}" saved successfully (${content.length} bytes)`);
            }
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error saving file "${filename}"`, error);
            } else {
                console.error(`Error saving file "${filename}"`, error);
            }
            throw error;
        }
    }
    
    /**
     * Экспорт данных в JSON-файл
     * @param {Object} data - Данные для экспорта
     * @param {string} filename - Имя файла (без расширения)
     */
    function exportJSON(data, filename) {
        try {
            const json = JSON.stringify(data, null, 2);
            const fullFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
            
            saveFile(json, fullFilename, 'application/json');
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`JSON data exported to "${fullFilename}"`);
            } else {
                console.log(`JSON data exported to "${fullFilename}"`);
            }
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error exporting JSON data to "${filename}"`, error);
            } else {
                console.error(`Error exporting JSON data to "${filename}"`, error);
            }
            throw error;
        }
    }
    
    /**
     * Экспорт данных в CSV-файл
     * @param {Array<Object>} data - Массив объектов для экспорта
     * @param {Array<string>} [headers] - Массив заголовков (ключей объектов)
     * @param {string} filename - Имя файла (без расширения)
     */
    function exportCSV(data, headers, filename) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No data provided for CSV export');
            }
            
            // Если не указаны заголовки, берем ключи из первого объекта
            const columnsToExport = headers || Object.keys(data[0]);
            
            // Формируем строку заголовков
            const headerRow = columnsToExport.join(',');
            
            // Формируем строки данных
            const rows = data.map(item => {
                return columnsToExport.map(header => {
                    // Получаем значение и экранируем его, если нужно
                    let value = item[header];
                    if (value === null || value === undefined) {
                        return '';
                    }
                    
                    // Конвертируем в строку, если не строка
                    value = String(value);
                    
                    // Экранируем кавычки и оборачиваем в кавычки, если есть запятые или кавычки
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    
                    return value;
                }).join(',');
            });
            
            // Объединяем все в один CSV
            const csv = [headerRow, ...rows].join('\n');
            const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
            
            saveFile(csv, fullFilename, 'text/csv;charset=utf-8');
            if (window.Logger && typeof window.Logger.info === 'function') {
                window.Logger.info(`CSV data exported to "${fullFilename}" (${rows.length} rows)`);
            } else {
                console.log(`CSV data exported to "${fullFilename}" (${rows.length} rows)`);
            }
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error exporting CSV data to "${filename}"`, error);
            } else {
                console.error(`Error exporting CSV data to "${filename}"`, error);
            }
            throw error;
        }
    }
    
    /**
     * Валидация файла
     * @param {File} file - Файл для проверки
     * @param {Object} options - Опции проверки
     * @param {Array<string>} [options.allowedExtensions] - Разрешенные расширения
     * @param {number} [options.maxSizeMB] - Максимальный размер в МБ
     * @returns {boolean} Результат валидации
     */
    function validateFile(file, options = {}) {
        if (!file) {
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn('No file provided for validation');
            } else {
                console.warn('No file provided for validation');
            }
            return false;
        }
        
        try {
            // Проверка размера файла
            if (options.maxSizeMB) {
                const maxSizeBytes = options.maxSizeMB * 1024 * 1024;
                if (file.size > maxSizeBytes) {
                    if (window.Logger && typeof window.Logger.warn === 'function') {
                        window.Logger.warn(`File "${file.name}" is too large: ${file.size} bytes. Max allowed: ${maxSizeBytes} bytes`);
                    } else {
                        console.warn(`File "${file.name}" is too large: ${file.size} bytes. Max allowed: ${maxSizeBytes} bytes`);
                    }
                    return false;
                }
            }
            
            // Проверка расширения файла
            if (options.allowedExtensions && options.allowedExtensions.length > 0) {
                const fileExt = file.name.split('.').pop().toLowerCase();
                if (!options.allowedExtensions.includes(fileExt)) {
                    if (window.Logger && typeof window.Logger.warn === 'function') {
                        window.Logger.warn(`File extension "${fileExt}" is not allowed for file "${file.name}". Allowed extensions: ${options.allowedExtensions.join(', ')}`);
                    } else {
                        console.warn(`File extension "${fileExt}" is not allowed for file "${file.name}". Allowed extensions: ${options.allowedExtensions.join(', ')}`);
                    }
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            if (window.Logger && typeof window.Logger.error === 'function') {
                window.Logger.error(`Error validating file "${file.name}"`, error);
            } else {
                console.error(`Error validating file "${file.name}"`, error);
            }
            return false;
        }
    }
    
    /**
     * Генерация базового HTML для PDF-экспорта
     * @param {Array<Object>} data - Данные для экспорта
     * @param {Object} options - Опции
     * @returns {string} HTML-контент
     */
    function generatePdfHtml(data, options = {}) {
        const {
            title = 'Отчет по безопасности доменов',
            includeDetails = true,
            includeRecommendations = true
        } = options;
        
        // Базовые функции для создания HTML-контента
        function getStatusText(status) {
            switch (status) {
                case 'ok': return 'Настроен';
                case 'warning': return 'Проблемы';
                case 'error': return 'Отсутствует';
                default: return 'Неизвестно';
            }
        }
        
        function countStatus(results, protocol, status) {
            if (!results || results.length === 0) return 0;
            return results.filter(result => result[protocol] && result[protocol].status === status).length;
        }
        
        function calculateAverageScore(results) {
            if (!results || results.length === 0) return 0;
            const totalScore = results.reduce((sum, result) => sum + (result.securityScore || 0), 0);
            return Math.round(totalScore / results.length);
        }
        
        // Генерируем HTML
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .report-header { margin-bottom: 20px; }
                .report-date { color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .status-ok { color: green; font-weight: bold; }
                .status-warning { color: orange; font-weight: bold; }
                .status-error { color: red; font-weight: bold; }
                .domain-summary { margin-bottom: 30px; }
                .domain-details { margin-left: 20px; padding: 10px; background-color: #f9f9f9; }
                .recommendations { background-color: #f0f8ff; padding: 10px; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>${title}</h1>
                <p class="report-date">Дата создания: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary-section">
                <h2>Сводка</h2>
                <p>Всего проверено доменов: <strong>${data.length}</strong></p>
                <p>Общая оценка безопасности: <strong>${calculateAverageScore(data)}%</strong></p>
                <table>
                    <tr>
                        <th>Протокол</th>
                        <th>Настроен</th>
                        <th>Проблемы</th>
                        <th>Отсутствует</th>
                    </tr>
                    <tr>
                        <td>DMARC</td>
                        <td>${countStatus(data, 'dmarc', 'ok')}</td>
                        <td>${countStatus(data, 'dmarc', 'warning')}</td>
                        <td>${countStatus(data, 'dmarc', 'error')}</td>
                    </tr>
                    <tr>
                        <td>SPF</td>
                        <td>${countStatus(data, 'spf', 'ok')}</td>
                        <td>${countStatus(data, 'spf', 'warning')}</td>
                        <td>${countStatus(data, 'spf', 'error')}</td>
                    </tr>
                    <tr>
                        <td>DKIM</td>
                        <td>${countStatus(data, 'dkim', 'ok')}</td>
                        <td>${countStatus(data, 'dkim', 'warning')}</td>
                        <td>${countStatus(data, 'dkim', 'error')}</td>
                    </tr>
                </table>
            </div>
            
            <h2>Детальные результаты</h2>
        `;
        
        // Добавляем информацию по каждому домену
        data.forEach(result => {
            if (result.error) {
                html += `
                    <div class="domain-summary">
                        <h3>${result.domain}</h3>
                        <p class="status-error">Ошибка: ${result.error}</p>
                    </div>
                `;
                return;
            }
            
            html += `
                <div class="domain-summary">
                    <h3>${result.domain}</h3>
                    <table>
                        <tr>
                            <td>DMARC</td>
                            <td class="status-${result.dmarc.status}">${getStatusText(result.dmarc.status)}</td>
                        </tr>
                        <tr>
                            <td>SPF</td>
                            <td class="status-${result.spf.status}">${getStatusText(result.spf.status)}</td>
                        </tr>
                        <tr>
                            <td>DKIM</td>
                            <td class="status-${result.dkim.status}">${getStatusText(result.dkim.status)}</td>
                        </tr>
                        <tr>
                            <td>Оценка безопасности</td>
                            <td>${result.securityScore}%</td>
                        </tr>
                    </table>
            `;
            
            // Добавляем детальную информацию, если нужно
            if (includeDetails) {
                html += `
                    <div class="domain-details">
                        <p><strong>DMARC запись:</strong> ${result.dmarc.record || 'Отсутствует'}</p>
                        <p><strong>DMARC политика:</strong> ${result.dmarc.policy || 'Не определена'}</p>
                        <p><strong>SPF запись:</strong> ${result.spf.record || 'Отсутствует'}</p>
                        <p><strong>DKIM селекторы:</strong> ${(result.dkim.selectors && result.dkim.selectors.length) ? result.dkim.selectors.join(', ') : 'Отсутствуют'}</p>
                        <p><strong>MX записи:</strong> ${(result.mx && result.mx.length > 0) ? result.mx.join(', ') : 'Отсутствуют'}</p>
                    </div>
                `;
            }
            
            // Добавляем рекомендации, если нужно
            if (includeRecommendations && window.RecommendationsManager) {
                const recommendations = window.RecommendationsManager.getRecommendations(result);
                
                if (recommendations.length > 0) {
                    html += `
                        <div class="recommendations">
                            <h4>Рекомендации:</h4>
                            <ul>
                                ${recommendations.map(rec => `<li><strong>${rec.title}</strong>: ${rec.description}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
            }
            
            html += `</div>`;
        });
        
        html += `
                </body>
                </html>
        `;
        
        return html;
    }
    
    // Возвращаем публичное API
    return {
        readTextFile,
        parseLines,
        readLinesFromFile,
        saveFile,
        exportJSON,
        exportCSV,
        validateFile,
        generatePdfHtml
    };
})();

// Инициализируем утилиту
if (window.Logger && typeof window.Logger.debug === 'function') {
    window.Logger.debug('FileUtils initialized');
} else {
    console.log('FileUtils initialized');
}