/**
 * Обработчик Drag & Drop для загрузки файлов
 * Обеспечивает возможность перетаскивания файлов в зону загрузки
 */
class DragDropHandler {
    /**
     * Конструктор
     * @param {Object} options - Настройки обработчика
     * @param {string} options.dropAreaId - ID элемента зоны загрузки
     * @param {string} options.fileInputId - ID элемента input[type="file"]
     * @param {Function} [options.onFileSelected] - Колбэк при выборе файла
     * @param {Array<string>} [options.allowedExtensions] - Разрешенные расширения файлов
     * @param {number} [options.maxSizeMB] - Максимальный размер файла в МБ
     */
    constructor(options) {
        // Настройки по умолчанию
        this.options = {
            dropAreaId: 'fileDropArea',
            fileInputId: 'domainFile',
            onFileSelected: null,
            allowedExtensions: ['txt', 'csv'],
            maxSizeMB: 10,
            ...options
        };
        
        // Элементы DOM
        this.dropArea = DOMUtils.getById(this.options.dropAreaId);
        this.fileInput = DOMUtils.getById(this.options.fileInputId);
        
        // Флаг инициализации
        this.initialized = false;
        
        // Инициализация
        this._init();
        
        Logger.debug('DragDropHandler initialized', { 
            dropAreaId: this.options.dropAreaId,
            fileInputId: this.options.fileInputId,
            allowedExtensions: this.options.allowedExtensions.join(', '),
            maxSizeMB: this.options.maxSizeMB
        });
    }
    
    /**
     * Инициализация обработчика
     * @private
     */
    _init() {
        if (!this.dropArea || !this.fileInput) {
            Logger.error('Cannot initialize DragDropHandler. Element not found:', { 
                dropArea: !this.dropArea,
                fileInput: !this.fileInput
            });
            return;
        }
        
        // Добавляем обработчики событий
        this._setupEventListeners();
        
        this.initialized = true;
    }
    
    /**
     * Установка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Предотвращаем поведение браузера по умолчанию для Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this._preventDefault.bind(this), false);
            document.body.addEventListener(eventName, this._preventDefault.bind(this), false);
        });
        
        // Подсветка при перетаскивании файла над областью
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this._highlight.bind(this), false);
        });
        
        // Удаление подсветки при уходе файла из области
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, this._unhighlight.bind(this), false);
        });
        
        // Обработка события сброса файла
        this.dropArea.addEventListener('drop', this._handleDrop.bind(this), false);
        
        // Обработка выбора файла через диалог
        this.fileInput.addEventListener('change', this._handleFileSelect.bind(this), false);
        
        // Клик по зоне загрузки
        this.dropArea.addEventListener('click', this._handleDropAreaClick.bind(this), false);
    }
    
    /**
     * Предотвращение действий браузера по умолчанию
     * @param {Event} event - Событие
     * @private
     */
    _preventDefault(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    /**
     * Подсветка зоны загрузки при перетаскивании
     * @private
     */
    _highlight() {
        this.dropArea.classList.add('file-upload-active');
    }
    
    /**
     * Удаление подсветки зоны загрузки
     * @private
     */
    _unhighlight() {
        this.dropArea.classList.remove('file-upload-active');
    }
    
    /**
     * Обработка события сброса файла
     * @param {DragEvent} event - Событие drag & drop
     * @private
     */
    _handleDrop(event) {
        const dt = event.dataTransfer;
        const files = dt.files;
        
        // Если есть файлы
        if (files.length > 0) {
            const file = files[0];
            
            // Проверяем файл
            if (this._validateFile(file)) {
                // Устанавливаем файл в input
                this._setFileInput(file);
                
                // Отображаем имя файла
                this._displayFileName(file.name);
                
                // Вызываем колбэк если есть
                if (typeof this.options.onFileSelected === 'function') {
                    this.options.onFileSelected(file);
                }
                
                Logger.info(`File dropped: ${file.name} (${this._formatFileSize(file.size)})`);
                
                // Генерируем событие
                EventBus.emit('file:selected', file);
            }
        }
    }
    
    /**
     * Обработка выбора файла через диалог
     * @private
     */
    _handleFileSelect() {
        if (this.fileInput.files.length > 0) {
            const file = this.fileInput.files[0];
            
            // Проверяем файл
            if (this._validateFile(file)) {
                // Отображаем имя файла
                this._displayFileName(file.name);
                
                // Вызываем колбэк если есть
                if (typeof this.options.onFileSelected === 'function') {
                    this.options.onFileSelected(file);
                }
                
                Logger.info(`File selected: ${file.name} (${this._formatFileSize(file.size)})`);
                
                // Генерируем событие
                EventBus.emit('file:selected', file);
            }
        }
    }
    
    /**
     * Обработка клика по зоне загрузки
     * @private
     */
    _handleDropAreaClick() {
        // Клик по области загрузки файлов вызывает диалог выбора файла
        this.fileInput.click();
    }
    
    /**
     * Валидация файла
     * @param {File} file - Файл для проверки
     * @returns {boolean} Результат валидации
     * @private
     */
    _validateFile(file) {
        // Проверка расширения
        if (this.options.allowedExtensions && this.options.allowedExtensions.length > 0) {
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (!this.options.allowedExtensions.includes(fileExt)) {
                Logger.warn(`File extension not allowed: ${fileExt}`, {
                    fileName: file.name,
                    allowedExtensions: this.options.allowedExtensions
                });
                
                // Показываем сообщение об ошибке
                this._showError(`Недопустимый тип файла. Допустимые расширения: ${this.options.allowedExtensions.join(', ')}`);
                return false;
            }
        }
        
        // Проверка размера
        if (this.options.maxSizeMB) {
            const maxSizeBytes = this.options.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
                Logger.warn(`File too large: ${this._formatFileSize(file.size)}`, {
                    fileName: file.name,
                    fileSize: file.size,
                    maxSize: maxSizeBytes
                });
                
                // Показываем сообщение об ошибке
                this._showError(`Файл слишком большой. Максимальный размер: ${this.options.maxSizeMB} МБ`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Отображение имени файла в зоне загрузки
     * @param {string} fileName - Имя файла
     * @private
     */
    _displayFileName(fileName) {
        // Используем requestAnimationFrame для оптимизации DOM-операций
        DOMUtils.animationFrame(() => {
            // Удаляем предыдущее имя файла, если оно было
            const existingFileName = this.dropArea.querySelector('.selected-file-name');
            if (existingFileName) {
                existingFileName.remove();
            }
            
            // Создаем элемент с именем файла
            const fileNameElement = DOMUtils.createElement('p', {
                class: 'selected-file-name'
            }, `Выбран файл: ${fileName}`);
            
            // Добавляем элемент в зону загрузки
            this.dropArea.appendChild(fileNameElement);
        });
    }
    
    /**
     * Установка файла в input
     * @param {File} file - Файл
     * @private
     */
    _setFileInput(file) {
        // Создаем новый FileList
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Устанавливаем FileList в input
        this.fileInput.files = dataTransfer.files;
    }
    
    /**
     * Показ сообщения об ошибке
     * @param {string} message - Текст сообщения
     * @private
     */
    _showError(message) {
        // Генерируем событие с ошибкой
        EventBus.emit('notification:error', message);
        
        // Добавляем сообщение об ошибке в зону загрузки
        DOMUtils.animationFrame(() => {
            // Удаляем предыдущее сообщение об ошибке, если оно было
            const existingError = this.dropArea.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
            
            // Создаем элемент с сообщением об ошибке
            const errorElement = DOMUtils.createElement('p', {
                class: 'error-message status-error'
            }, message);
            
            // Добавляем элемент в зону загрузки
            this.dropArea.appendChild(errorElement);
            
            // Удаляем сообщение через 5 секунд
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.remove();
                }
            }, 5000);
        });
    }
    
    /**
     * Форматирование размера файла
     * @param {number} size - Размер в байтах
     * @returns {string} Отформатированный размер
     * @private
     */
    _formatFileSize(size) {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`;
        } else {
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        }
    }
    
    /**
     * Очистка выбранного файла
     */
    clearFile() {
        // Очищаем input
        this.fileInput.value = '';
        
        // Удаляем отображение имени файла
        const existingFileName = this.dropArea.querySelector('.selected-file-name');
        if (existingFileName) {
            existingFileName.remove();
        }
        
        // Удаляем сообщение об ошибке, если оно есть
        const existingError = this.dropArea.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        Logger.debug('File selection cleared');
    }
    
    /**
     * Получение выбранного файла
     * @returns {File|null} Выбранный файл или null
     */
    getSelectedFile() {
        return this.fileInput.files.length > 0 ? this.fileInput.files[0] : null;
    }
    
    /**
     * Установка новых опций
     * @param {Object} options - Новые опции
     */
    setOptions(options) {
        this.options = {
            ...this.options,
            ...options
        };
        
        Logger.debug('DragDropHandler options updated', this.options);
    }
}

// Создаем глобальный обработчик drag & drop после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.dragDropHandler = new DragDropHandler();
    
    // Обработка выбора файла
    EventBus.on('file:selected', (file) => {
        // Активируем кнопку сканирования
        const scanBtn = DOMUtils.getById('scanBtn');
        if (scanBtn) {
            scanBtn.disabled = false;
        }
    });
});