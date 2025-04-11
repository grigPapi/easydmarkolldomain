/**
 * Менеджер рекомендаций
 * Формирует и отображает рекомендации по улучшению безопасности доменов
 */
class RecommendationsManager {
    constructor() {
        if (window.Logger && typeof window.Logger.debug === 'function') {
            window.Logger.debug('RecommendationsManager initialized');
        } else {
            console.log('RecommendationsManager initialized');
        }
    }
    
    /**
     * Получение рекомендаций для домена
     * @param {Object} result - Результат сканирования домена
     * @returns {Array<Object>} Массив рекомендаций
     */
    getRecommendations(result) {
        if (!result || !result.domain) {
            if (window.Logger && typeof window.Logger.warn === 'function') {
                window.Logger.warn('Invalid domain result for recommendations', result);
            } else {
                console.warn('Invalid domain result for recommendations', result);
            }
            return [];
        }
        
        const recommendations = [];
        const domain = result.domain;
        
        // Рекомендации для DMARC
        this._addDmarcRecommendations(recommendations, result, domain);
        
        // Рекомендации для SPF
        this._addSpfRecommendations(recommendations, result, domain);
        
        // Рекомендации для DKIM
        this._addDkimRecommendations(recommendations, result, domain);
        
        // Общие рекомендации по безопасности
        this._addGeneralSecurityRecommendations(recommendations, result, domain);
        
        return recommendations;
    }
    
    /**
     * Добавление рекомендаций для DMARC
     * @param {Array<Object>} recommendations - Массив рекомендаций
     * @param {Object} result - Результат сканирования
     * @param {string} domain - Доменное имя
     * @private
     */
    _addDmarcRecommendations(recommendations, result, domain) {
        // Проверяем статус DMARC
        if (!result.dmarc || result.dmarc.status === 'error') {
            // DMARC запись отсутствует
            recommendations.push({
                id: 'dmarc-missing',
                title: 'Добавьте DMARC запись',
                description: 'DMARC (Domain-based Message Authentication, Reporting, and Conformance) защищает ваш домен от несанкционированного использования для спам-рассылок и фишинга.',
                example: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@${domain}; pct=100`,
                steps: [
                    'Войдите в панель управления DNS вашего домена',
                    `Создайте новую TXT запись с именем _dmarc.${domain}`,
                    'Установите значение записи как показано в примере выше',
                    'Сохраните изменения и дождитесь обновления DNS (обычно от нескольких минут до 48 часов)'
                ],
                severity: 'high'
            });
        } else if (result.dmarc.status === 'warning') {
            // Проверяем политику DMARC
            if (result.dmarc.policy === 'none') {
                recommendations.push({
                    id: 'dmarc-policy-none',
                    title: 'Усильте политику DMARC',
                    description: 'Политика "none" не защищает ваш домен. Рекомендуется использовать "quarantine" или "reject" для реальной защиты.',
                    example: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}; pct=100`,
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        `Найдите существующую TXT запись с именем _dmarc.${domain}`,
                        'Измените параметр p=none на p=quarantine или p=reject',
                        'Сохраните изменения'
                    ],
                    severity: 'medium'
                });
            } else if (!result.dmarc.record.includes('pct=')) {
                recommendations.push({
                    id: 'dmarc-missing-pct',
                    title: 'Добавьте процент применения DMARC (pct)',
                    description: 'Параметр pct указывает, к какому проценту писем применяется политика. Рекомендуется начать с 10% и постепенно увеличивать до 100%.',
                    example: `${result.dmarc.record}; pct=100`,
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        `Найдите существующую TXT запись с именем _dmarc.${domain}`,
                        'Добавьте параметр pct=100 в конец записи',
                        'Сохраните изменения'
                    ],
                    severity: 'low'
                });
            }
            
            // Проверяем наличие адреса для отчетов
            if (!result.dmarc.record.includes('rua=')) {
                recommendations.push({
                    id: 'dmarc-missing-rua',
                    title: 'Добавьте адрес для отчетов DMARC',
                    description: 'Параметр rua указывает адрес электронной почты для получения агрегированных отчетов DMARC. Это поможет отслеживать эффективность настроек.',
                    example: `${result.dmarc.record}; rua=mailto:dmarc-reports@${domain}`,
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        `Найдите существующую TXT запись с именем _dmarc.${domain}`,
                        `Добавьте параметр rua=mailto:dmarc-reports@${domain}`,
                        'Сохраните изменения'
                    ],
                    severity: 'low'
                });
            }
        }
    }
    
    /**
     * Добавление рекомендаций для SPF
     * @param {Array<Object>} recommendations - Массив рекомендаций
     * @param {Object} result - Результат сканирования
     * @param {string} domain - Доменное имя
     * @private
     */
    _addSpfRecommendations(recommendations, result, domain) {
        // Проверяем статус SPF
        if (!result.spf || result.spf.status === 'error') {
            // SPF запись отсутствует
            recommendations.push({
                id: 'spf-missing',
                title: 'Добавьте SPF запись',
                description: 'SPF (Sender Policy Framework) определяет, какие серверы имеют право отправлять почту от имени вашего домена.',
                example: `v=spf1 include:_spf.google.com include:_spf.${domain} ~all`,
                steps: [
                    'Войдите в панель управления DNS вашего домена',
                    'Создайте новую TXT запись для домена (имя @)',
                    'Установите значение записи, включив все ваши почтовые серверы',
                    'Завершите запись директивой ~all (мягкое ограничение) или -all (строгое ограничение)'
                ],
                severity: 'high'
            });
        } else if (result.spf.status === 'warning') {
            // Проверяем содержимое SPF записи
            if (result.spf.record.includes('?all')) {
                recommendations.push({
                    id: 'spf-neutral',
                    title: 'Усильте директиву SPF',
                    description: 'Директива ?all (нейтральная) не обеспечивает никакой защиты. Рекомендуется использовать ~all (мягкое ограничение) или -all (строгое ограничение).',
                    example: result.spf.record.replace('?all', '-all'),
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        'Найдите существующую TXT запись с SPF',
                        'Замените директиву ?all на ~all или -all',
                        'Сохраните изменения'
                    ],
                    severity: 'medium'
                });
            } else if (result.spf.record.includes('+all')) {
                recommendations.push({
                    id: 'spf-allow-all',
                    title: 'Исправьте опасную директиву SPF',
                    description: 'Директива +all разрешает отправку почты любым сервером. Это представляет серьезную угрозу безопасности!',
                    example: result.spf.record.replace('+all', '-all'),
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        'Найдите существующую TXT запись с SPF',
                        'Замените директиву +all на -all',
                        'Сохраните изменения'
                    ],
                    severity: 'high'
                });
            } else if (result.spf.record.includes('~all') && result.dmarc && result.dmarc.status === 'ok' && result.dmarc.policy === 'reject') {
                recommendations.push({
                    id: 'spf-soft-fail',
                    title: 'Усильте директиву SPF для соответствия DMARC',
                    description: 'У вас установлена строгая политика DMARC (reject), но мягкая директива SPF (~all). Для максимальной защиты рекомендуется использовать -all.',
                    example: result.spf.record.replace('~all', '-all'),
                    steps: [
                        'Войдите в панель управления DNS вашего домена',
                        'Найдите существующую TXT запись с SPF',
                        'Замените директиву ~all на -all',
                        'Сохраните изменения'
                    ],
                    severity: 'low'
                });
            }
        }
    }
    
    /**
     * Добавление рекомендаций для DKIM
     * @param {Array<Object>} recommendations - Массив рекомендаций
     * @param {Object} result - Результат сканирования
     * @param {string} domain - Доменное имя
     * @private
     */
    _addDkimRecommendations(recommendations, result, domain) {
        // Проверяем статус DKIM
        if (!result.dkim || result.dkim.status === 'error') {
            // DKIM не настроен
            recommendations.push({
                id: 'dkim-missing',
                title: 'Настройте DKIM подпись',
                description: 'DKIM (DomainKeys Identified Mail) позволяет получателям проверить, что письмо действительно было отправлено с вашего домена и не было изменено в пути.',
                example: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9... (публичный ключ)',
                steps: [
                    'Создайте пару DKIM ключей в вашей почтовой системе или у почтового провайдера',
                    `Создайте TXT запись с именем, соответствующим селектору (например, default._domainkey.${domain})`,
                    'Установите значение TXT записи, вставив публичный ключ, предоставленный вашей почтовой системой',
                    'Настройте почтовый сервер для подписи исходящих писем с использованием приватного ключа'
                ],
                severity: 'high'
            });
        } else if (result.dkim.status === 'warning') {
            // DKIM настроен частично
            if (result.dkim.selectors && result.dkim.selectors.length === 1) {
                recommendations.push({
                    id: 'dkim-single-selector',
                    title: 'Добавьте дополнительные DKIM селекторы',
                    description: 'У вас настроен только один DKIM селектор. Рекомендуется настроить дополнительные селекторы для разных сервисов рассылки.',
                    example: `Текущий селектор: ${result.dkim.selectors[0]}`,
                    steps: [
                        'Создайте дополнительные пары DKIM ключей для разных сервисов',
                        `Создайте TXT записи для новых селекторов (например, google._domainkey.${domain})`,
                        'Настройте каждый сервис рассылки на использование своего селектора'
                    ],
                    severity: 'low'
                });
            }
        }
    }
    
    /**
     * Добавление общих рекомендаций по безопасности
     * @param {Array<Object>} recommendations - Массив рекомендаций
     * @param {Object} result - Результат сканирования
     * @param {string} domain - Доменное имя
     * @private
     */
    _addGeneralSecurityRecommendations(recommendations, result, domain) {
        // Проверяем общий уровень безопасности
        const securityScore = result.securityScore || 0;
        
        if (securityScore < 30) {
            // Очень низкий уровень безопасности
            recommendations.push({
                id: 'general-security-low',
                title: 'Повысьте общий уровень защиты почты',
                description: `У вашего домена очень низкий уровень защиты почты (${securityScore}%). Рекомендуется настроить все основные механизмы защиты: DMARC, SPF и DKIM.`,
                steps: [
                    'Начните с настройки SPF для определения разрешенных серверов отправки',
                    'Затем настройте DKIM для подписи исходящих писем',
                    'В завершение настройте DMARC с политикой none для начала и мониторинга',
                    'После получения и анализа отчетов DMARC, ужесточите политику до quarantine или reject'
                ],
                severity: 'high'
            });
        } else if (result.dmarc && result.dmarc.status === 'ok' && result.dmarc.policy === 'none' && 
                  result.spf && result.spf.status === 'ok' && 
                  result.dkim && result.dkim.status === 'ok') {
            // Все настроено, но DMARC в мониторинговом режиме
            recommendations.push({
                id: 'dmarc-monitor-mode',
                title: 'Переход от мониторинга к активной защите',
                description: 'У вас настроены все механизмы защиты, но DMARC находится в режиме мониторинга (policy=none). После анализа отчетов рекомендуется перейти к активной защите.',
                steps: [
                    'Собирайте и анализируйте отчеты DMARC не менее 2-4 недель',
                    'Убедитесь, что легитимные письма проходят проверки SPF и DKIM',
                    'Измените политику DMARC на p=quarantine с pct=10 для начала',
                    'Постепенно увеличивайте pct до 100% и затем перейдите на p=reject'
                ],
                severity: 'medium'
            });
        }
        
        // Рекомендация по мониторингу
        if (result.dmarc && result.dmarc.status === 'ok' && !result.dmarc.record.includes('ruf=')) {
            recommendations.push({
                id: 'dmarc-forensic-reports',
                title: 'Включите сбор подробных отчетов DMARC',
                description: 'Подробные отчеты (forensic reports) помогают выявить конкретные случаи подделки адресов отправителей.',
                example: `${result.dmarc.record}; ruf=mailto:dmarc-forensic@${domain}`,
                steps: [
                    'Добавьте параметр ruf в вашу запись DMARC',
                    'Настройте обработку входящих отчетов для анализа',
                    'Рассмотрите использование специализированных сервисов для анализа отчетов DMARC'
                ],
                severity: 'low'
            });
        }
    }
    
    /**
     * Рендеринг рекомендаций в HTML
     * @param {Array<Object>} recommendations - Массив рекомендаций
     * @returns {string} HTML-разметка рекомендаций
     */
    renderRecommendationsHTML(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<p>Для этого домена нет рекомендаций.</p>';
        }
        
        let html = '';
        
        recommendations.forEach((rec, index) => {
            const severityClass = rec.severity === 'high' ? 'status-error' : 
                               rec.severity === 'medium' ? 'status-warning' : 'status-ok';
            
            html += `
                <div class="recommendation-item">
                    <h5><span class="rec-number">${index + 1}</span> ${rec.title} <span class="${severityClass}" style="margin-left: 10px;">(${this._getSeverityText(rec.severity)})</span></h5>
                    <p class="rec-description">${rec.description}</p>
            `;
            
            if (rec.example) {
                html += `
                    <div class="rec-example">
                        <strong>Пример:</strong>
                        <pre>${rec.example}</pre>
                    </div>
                `;
            }
            
            if (rec.steps && rec.steps.length > 0) {
                html += `
                    <div class="rec-instructions">
                        <strong>Как реализовать:</strong>
                        <ol>
                            ${rec.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                `;
            }
            
            html += `</div>`;
        });
        
        return html;
    }
    
    /**
     * Получение текстового представления уровня важности рекомендации
     * @param {string} severity - Уровень важности ('high', 'medium', 'low')
     * @returns {string} Текстовое представление
     * @private
     */
    _getSeverityText(severity) {
        switch (severity) {
            case 'high': return 'Высокий приоритет';
            case 'medium': return 'Средний приоритет';
            case 'low': return 'Низкий приоритет';
            default: return 'Неизвестный приоритет';
        }
    }
}

// Создаем глобальный экземпляр менеджера рекомендаций
window.RecommendationsManager = new RecommendationsManager();

if (window.Logger && typeof window.Logger.info === 'function') {
    window.Logger.info('RecommendationsManager global instance created');
} else {
    console.log('RecommendationsManager global instance created');
}