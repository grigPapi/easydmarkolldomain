/**
 * Сервис экспорта результатов сканирования
 * Обеспечивает экспорт результатов в различные форматы (JSON, CSV, PDF)
 */
class ExportService {
    constructor() {
        Logger.debug('ExportService initialized');
    }
    
    /**
     * Экспорт результатов сканирования в JSON
     * @param {Array<Object>} results - Результаты сканирования
     * @param {string} [filename='dmarc_scan_results'] - Имя файла (без расширения)
     * @returns {Promise<boolean>} - Успешно ли выполнен экспорт
     */
    async exportToJSON(results, filename = 'dmarc_scan_results') {
        try {
            Logger.info('Exporting results to JSON');
            
            if (!Array.isArray(results) || results.length === 0) {
                Logger.warn('No results to export to JSON');
                return false;
            }
            
            // Создаем объект с результатами и метаданными
            const exportData = {
                date: new Date().toISOString(),
                count: results.length,
                results: results
            };
            
            // Формируем имя файла с датой
            const date = new Date().toISOString().slice(0, 10);
            const fullFilename = `${filename}_${date}`;
            
            // Экспортируем в JSON-файл
            FileUtils.exportJSON(exportData, fullFilename);
            
            Logger.info(`Successfully exported ${results.length} results to JSON`);
            return true;
        } catch (error) {
            Logger.error('Error exporting to JSON', error);
            throw error;
        }
    }
    
    /**
     * Экспорт результатов сканирования в CSV
     * @param {Array<Object>} results - Результаты сканирования
     * @param {string} [filename='dmarc_scan_results'] - Имя файла (без расширения)
     * @returns {Promise<boolean>} - Успешно ли выполнен экспорт
     */
    async exportToCSV(results, filename = 'dmarc_scan_results') {
        try {
            Logger.info('Exporting results to CSV');
            
            if (!Array.isArray(results) || results.length === 0) {
                Logger.warn('No results to export to CSV');
                return false;
            }
            
            // Преобразуем результаты в плоскую структуру для CSV
            const flatResults = results.map(result => {
                return {
                    domain: result.domain,
                    dmarc_status: result.dmarc ? result.dmarc.status : 'error',
                    dmarc_policy: result.dmarc ? result.dmarc.policy : '',
                    dmarc_record: result.dmarc ? result.dmarc.record : '',
                    spf_status: result.spf ? result.spf.status : 'error',
                    spf_record: result.spf ? result.spf.record : '',
                    dkim_status: result.dkim ? result.dkim.status : 'error',
                    dkim_selectors: result.dkim && result.dkim.selectors ? result.dkim.selectors.join(';') : '',
                    mx_records: result.mx ? result.mx.join(';') : '',
                    security_score: result.securityScore || 0,
                    error: result.error || ''
                };
            });
            
            // Задаем заголовки CSV
            const headers = [
                'domain',
                'dmarc_status',
                'dmarc_policy',
                'dmarc_record',
                'spf_status',
                'spf_record',
                'dkim_status',
                'dkim_selectors',
                'mx_records',
                'security_score',
                'error'
            ];
            
            // Формируем имя файла с датой
            const date = new Date().toISOString().slice(0, 10);
            const fullFilename = `${filename}_${date}`;
            
            // Экспортируем в CSV-файл
            FileUtils.exportCSV(flatResults, headers, fullFilename);
            
            Logger.info(`Successfully exported ${results.length} results to CSV`);
            return true;
        } catch (error) {
            Logger.error('Error exporting to CSV', error);
            throw error;
        }
    }
    
    /**
     * Экспорт результатов сканирования в PDF
     * @param {Array<Object>} results - Результаты сканирования
     * @param {string} [filename='dmarc_scan_results'] - Имя файла (без расширения)
     * @param {Object} [options={}] - Опции экспорта
     * @returns {Promise<boolean>} - Успешно ли выполнен экспорт
     */
    async exportToPDF(results, filename = 'dmarc_scan_results', options = {}) {
        try {
            Logger.info('Exporting results to PDF');
            
            if (!Array.isArray(results) || results.length === 0) {
                Logger.warn('No results to export to PDF');
                return false;
            }
            
            // Задаем опции по умолчанию
            const exportOptions = {
                title: 'Отчет по безопасности доменов',
                includeDetails: true,
                includeRecommendations: true,
                ...options
            };
            
            // Генерируем HTML для PDF
            const html = FileUtils.generatePdfHtml(results, exportOptions);
            
            // Имитация генерации PDF (в реальном приложении тут будет конвертация HTML в PDF)
            // В этой версии просто сохраняем HTML-файл
            const date = new Date().toISOString().slice(0, 10);
            const fullFilename = `${filename}_${date}.html`;
            
            // Сохраняем HTML-файл (в реальном приложении тут будет сохранение PDF)
            FileUtils.saveFile(html, fullFilename, 'text/html');
            
            Logger.info(`Successfully exported ${results.length} results to PDF (HTML format)`);
            return true;
        } catch (error) {
            Logger.error('Error exporting to PDF', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр сервиса экспорта
window.exportService = new ExportService();

Logger.info('ExportService global instance created');