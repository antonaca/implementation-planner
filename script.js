document.addEventListener('DOMContentLoaded', function() {
    // #region STATE AND INITIALIZATION
    const state = {
        teamMembers: [],
        coreComponents: [],
        sortState: { key: 'end', direction: 'asc' }
    };
    let chartInstances = {};
    let saveTimeout;
    let appData = {};

    async function initializeApp() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            appData = await response.json();
            console.log("App data from data.json loaded successfully.");
            loadPlan();
        } catch (error) {
            console.error("Fatal Error: Could not load data.json.", error);
            alert("Could not load essential app data (data.json). The app cannot function.");
        }
    }
    // #endregion

    // #region DATA PERSISTENCE (LOCAL STORAGE)
    function getTableData(id) {
        const container = document.getElementById(id);
        if (!container) return [];
        const isTable = container.tagName === 'TABLE';
        const selector = isTable ? 'tbody tr:not(.no-data-row)' : '.expandable-row, .expandable-card';
        const rows = container.querySelectorAll(selector);
        return Array.from(rows).map(row => {
            const data = {};
            row.querySelectorAll('[data-field]').forEach(input => {
                data[input.dataset.field] = input.value;
            });
            return data;
        });
    }

    function getPlanData() {
        const data = { simpleInputs: {}, tables: {} };
        document.querySelectorAll('.saveable').forEach(input => {
            if (input.id) data.simpleInputs[input.id] = input.value;
        });
        const allTableIds = [
            'team-members-table', 'determinants-container', 'strategies-container', 'mechanisms-container',
            'risks-container', 'opportunities-container', 'timeline-container',
            'implementation-outcomes-container', 'service-outcomes-container', 'client-outcomes-container',
            'fidelity-plan-container', 'adaptations-container', 'instruments-container'
        ];
        allTableIds.forEach(id => {
            if (document.getElementById(id)) {
                data.tables[id] = getTableData(id);
            }
        });
        return data;
    }

    function savePlan() {
        try {
            localStorage.setItem('implementationPlanData', JSON.stringify(getPlanData()));
            console.log("Plan saved to Local Storage.");
        } catch (error) {
            console.error("Error saving to Local Storage: ", error);
        }
    }

    function loadPlan() {
        const allContainerSelectors = [
            '#team-members-table tbody', '#determinants-container', '#strategies-container', '#mechanisms-container',
            '#risks-container', '#opportunities-container', '#timeline-container',
            '#implementation-outcomes-container', '#service-outcomes-container', '#client-outcomes-container',
            '#fidelity-plan-container', '#adaptations-container', '#instruments-container'
        ];
        allContainerSelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.innerHTML = '';
        });

        const savedData = localStorage.getItem('implementationPlanData');
        if (savedData) {
            console.log("Loading plan from Local Storage.");
            const planData = JSON.parse(savedData);
            if (planData.simpleInputs) {
                Object.entries(planData.simpleInputs).forEach(([id, value]) => {
                    const input = document.getElementById(id);
                    if (input) input.value = value;
                });
            }
            if (planData.tables) {
                Object.entries(planData.tables).forEach(([tableId, tableData]) => {
                    (tableData || []).forEach(rowData => addRow(tableId, rowData));
                });
            }
        } else {
            console.log("No saved plan found. Initializing new template.");
        }

        allContainerSelectors.forEach(selector => updateEmptyState(selector.replace('#', '').split(' ')[0]));
        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
        initializeFlippableCards();
    }

    function triggerSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            savePlan();
            const activeTab = document.querySelector('.nav-link.active')?.dataset.target;
            if (activeTab === 'summary') updateReportVisuals();
            else if (activeTab?.endsWith('-landing')) updateLandingPageDashboards();
        }, 1000);
    }
    // #endregion

    // #region UI AND ROW MANAGEMENT
    function addRow(containerId, data = {}) {
        const isTable = containerId === 'team-members-table';
        const templateId = `${containerId}-template`;
        const containerSelector = isTable ? `#${containerId} tbody` : `#${containerId}`;
        const template = document.getElementById(templateId);
        const container = document.querySelector(containerSelector);
        if (!template || !container) return;

        const newRowFragment = template.content.cloneNode(true);
        const newRowElement = newRowFragment.firstElementChild;
        const options = appData.options || {};

        newRowElement.querySelectorAll('select[data-field]').forEach(select => {
            const field = select.dataset.field;
            const choiceMap = {
                status: 'status', likelihood: 'level', impact: 'level', benefit: 'level', feasibility: 'level',
                itemType: 'itemType', dimension: 'fidelityDimension', nature: 'adaptationNature',
                goal: 'adaptationGoal', planned: 'adaptationPlanned', context: 'contextLevels'
            };
            if (choiceMap[field] && options[choiceMap[field]]) {
                populateSelect(select, options[choiceMap[field]]);
            }
        });

        Object.entries(data).forEach(([field, value]) => {
            const input = newRowElement.querySelector(`[data-field="${field}"]`);
            if (input) input.value = value;
        });

        const outcomeKey = {
            'implementation-outcomes-container': 'Implementation Outcomes',
            'service-outcomes-container': 'Service Outcomes',
            'client-outcomes-container': 'Client Outcomes'
        }[containerId];

        if (containerId === 'strategies-container') {
            const updateDef = name => { newRowElement.querySelector('.strategy-definition-display').textContent = appData.ericStrategies.find(s => s.name === name)?.definition || 'Select a strategy.'; };
            initializeAutocomplete(newRowElement.querySelector('.strategy-search-input'), newRowElement.querySelector('.autocomplete-results'), appData.ericStrategies, updateDef);
            if (data.strategy) updateDef(data.strategy);
        } else if (outcomeKey && appData.allOutcomesData) {
            const updateDef = name => { newRowElement.querySelector('.outcome-definition-display').textContent = appData.allOutcomesData[outcomeKey].find(o => o.name === name)?.definition || 'Select an outcome.'; };
            initializeAutocomplete(newRowElement.querySelector('.outcome-search-input'), newRowElement.querySelector('.autocomplete-results'), appData.allOutcomesData[outcomeKey], updateDef);
            if (data.outcome) updateDef(data.outcome);
        }
        
        container.appendChild(newRowElement);
        updateEmptyState(isTable ? container.parentElement.id : containerId);
    }

    function updateEmptyState(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const isTable = container.tagName === 'TABLE';
        const contentRows = container.querySelectorAll(isTable ? 'tbody tr:not(.no-data-row)' : '.expandable-row, .expandable-card');
        const messageElement = container.querySelector('.no-data-message, .no-data-row');
        if (messageElement) {
            messageElement.style.display = contentRows.length === 0 ? (isTable ? 'table-row' : 'block') : 'none';
        }
    }

    function populateSelect(select, choices) {
        (choices || []).forEach(opt => select.add(new Option(opt, opt)));
    }

    function initializeAutocomplete(input, resultsContainer, dataSource, definitionDisplayUpdater) {
        if (!input || !resultsContainer || !dataSource) return;
        let activeIndex = -1;
        const filterAndShowResults = () => {
            const query = input.value.toLowerCase();
            resultsContainer.innerHTML = '';
            const filtered = query ? dataSource.filter(item => item.name.toLowerCase().includes(query)) : dataSource;
            if (filtered.length > 0) {
                filtered.forEach((itemData) => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.textContent = itemData.name;
                    item.addEventListener('mousedown', () => {
                        input.value = itemData.name;
                        resultsContainer.classList.remove('active', 'flipped');
                        if (definitionDisplayUpdater) definitionDisplayUpdater(itemData.name);
                        triggerSave();
                    });
                    resultsContainer.appendChild(item);
                });
                const inputRect = input.getBoundingClientRect();
                const spaceBelow = window.innerHeight - inputRect.bottom;
                const resultsHeight = Math.min(250, 28 * filtered.length);
                resultsContainer.classList.toggle('flipped', spaceBelow < resultsHeight && inputRect.top > resultsHeight);
                resultsContainer.classList.add('active');
            } else {
                resultsContainer.classList.remove('active');
            }
            activeIndex = -1;
        };
        input.addEventListener('input', filterAndShowResults);
        input.addEventListener('focus', filterAndShowResults);
        input.addEventListener('blur', () => setTimeout(() => resultsContainer.classList.remove('active'), 200));
        input.addEventListener('keydown', (e) => {
            const items = resultsContainer.querySelectorAll('.autocomplete-item');
            if (!resultsContainer.classList.contains('active') || items.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; } 
            else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; } 
            else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex > -1) items[activeIndex].dispatchEvent(new Event('mousedown')); } 
            else if (e.key === 'Escape') { resultsContainer.classList.remove('active'); }
            items.forEach((item, index) => item.classList.toggle('selected', index === activeIndex));
        });
    }

    function initializeFlippableCards() {
        document.querySelectorAll('.module-front-matter').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('a, button')) return;
                const flipper = card.querySelector('.card-flipper');
                if (flipper) {
                    flipper.classList.toggle('is-flipped');
                    if (flipper.classList.contains('is-flipped')) populateCardBack(card);
                }
            });
        });
    }

    function populateCardBack(card) {
        const module = card.dataset.module;
        const backFace = card.querySelector('.card-face-back');
        if (!module || !backFace) return;
        const moduleMap = {
            determinants: { title: 'Determinants', data: getTableData('determinants-container'), key: 'determinant', page: 'determinants' },
            strategies: { title: 'Strategies', data: getTableData('strategies-container'), key: 'strategy', page: 'strategies' },
            mechanisms: { title: 'Mechanisms', data: getTableData('mechanisms-container'), key: 'mechanism', page: 'mechanisms' },
            outcomes: { title: 'Outcomes', data: [...getTableData('implementation-outcomes-container'), ...getTableData('service-outcomes-container'), ...getTableData('client-outcomes-container')], key: 'outcome', page: 'outcomes' },
            protocol: { title: 'Protocol', data: getTableData('timeline-container'), key: 'task', page: 'protocol' },
            fidelity: { title: 'Fidelity', data: getTableData('fidelity-plan-container'), key: 'component', page: 'fidelity' },
            instruments: { title: 'Instruments', data: getTableData('instruments-container'), key: 'instrument', page: 'instruments' },
            adaptations: { title: 'Adaptations', data: getTableData('adaptations-container'), key: 'modification', page: 'adaptations' },
            risks: { title: 'Risks', data: getTableData('risks-container'), key: 'risk', page: 'risks' },
            opportunities: { title: 'Opportunities', data: getTableData('opportunities-container'), key: 'opportunity', page: 'opportunities' },
            summary: { title: 'Full Report', data: [{ summary: 'View the full report' }], key: 'summary', page: 'summary' }
        };
        const config = moduleMap[module];
        if (!config) return;
        let content = `<h4 class="card-back-title">${config.title}</h4>`;
        const validData = config.data.filter(item => item && item[config.key]);
        if (validData.length > 0) {
            content += `<ul class="card-back-list">${validData.map(item => `<li><a href="#" class="nav-link" data-target="${config.page}">${item[config.key]}</a></li>`).join('')}</ul>`;
        } else {
            content += `<div class="card-back-empty"><p>No ${config.title.toLowerCase()} defined yet.</p><a href="#" class="nav-link add-row-btn" data-target="${config.page}">Add</a></div>`;
        }
        backFace.innerHTML = content;
    }
    // #endregion

    // #region DASHBOARDS AND CHARTS
    function updateSidebarTitle() {
        const projectNameInput = document.getElementById('project-name');
        const sidebarTitle = document.getElementById('sidebar-title');
        if (projectNameInput && sidebarTitle) {
            sidebarTitle.textContent = projectNameInput.value.trim() || 'New Project';
        }
    }

    function createOrUpdateChart(chartId, config) {
        if (chartInstances[chartId]) chartInstances[chartId].destroy();
        const ctx = document.getElementById(chartId)?.getContext('2d');
        if (ctx) chartInstances[chartId] = new Chart(ctx, config);
    }

    function updateLandingPageDashboards() {
        document.getElementById('determinants-count').textContent = getTableData('determinants-container').length;
        document.getElementById('strategies-count').textContent = getTableData('strategies-container').length;
        document.getElementById('mechanisms-count').textContent = getTableData('mechanisms-container').length;
        document.getElementById('implementation-outcomes-count').textContent = getTableData('implementation-outcomes-container').length;
        document.getElementById('service-outcomes-count').textContent = getTableData('service-outcomes-container').length;
        document.getElementById('client-outcomes-count').textContent = getTableData('client-outcomes-container').length;
        const tasks = getTableData('timeline-container');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdueTasks = tasks.filter(task => task.end && new Date(task.end) < today && task.status !== 'Complete');
        document.getElementById('tasks-count').textContent = tasks.length;
        document.getElementById('tasks-overdue-count').textContent = overdueTasks.length;
        document.getElementById('tasks-complete-count').textContent = tasks.filter(t => t.status === 'Complete').length;
        document.getElementById('fidelity-components-count').textContent = getTableData('fidelity-plan-container').length;
        document.getElementById('instruments-count').textContent = getTableData('instruments-container').length;
        const risks = getTableData('risks-container');
        const opps = getTableData('opportunities-container');
        document.getElementById('adaptations-count').textContent = getTableData('adaptations-container').length;
        document.getElementById('risks-count').textContent = risks.length;
        document.getElementById('high-impact-risks-count').textContent = risks.filter(r => r.impact === 'High').length;
        document.getElementById('opportunities-count').textContent = opps.length;
        document.getElementById('high-benefit-opps-count').textContent = opps.filter(o => o.benefit === 'High').length;
        const totalProgress = tasks.reduce((sum, task) => sum + (parseInt(task.progress, 10) || 0), 0);
        const overallProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;
        document.getElementById('report-progress-kpi').textContent = `${overallProgress}%`;
        document.getElementById('report-overdue-kpi').textContent = overdueTasks.length;
        document.getElementById('report-risks-kpi').textContent = risks.filter(r => r.impact === 'High').length;
    }

    function updateReportVisuals() {
        updateProjectSummary();
        updateKpiCards();
        updateProjectProgressChart();
        updateRiskBubbleChart();
        updateOpportunitiesChart();
    }

    function updateProjectProgressChart() {
        const tasks = getTableData('timeline-container');
        const totalTasks = tasks.length;
        const statusOrder = ['not-started', 'waiting', 'in-progress', 'at-risk', 'complete'];
        const statusColors = { 'not-started': 'var(--grey)', 'waiting': 'var(--blue)', 'in-progress': 'var(--yellow)', 'at-risk': 'var(--red)', 'complete': 'var(--green)' };
        const statusLabels = { 'not-started': 'Not Started', 'waiting': 'Waiting', 'in-progress': 'In Progress', 'at-risk': 'At Risk', 'complete': 'Complete' };
        const counts = statusOrder.reduce((acc, status) => ({...acc, [status]: 0 }), {});
        tasks.forEach(task => {
            const statusKey = (task.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
            if (counts[statusKey] !== undefined) counts[statusKey]++;
        });
        const progressBarContainer = document.getElementById('progress-bar-container');
        const legendContainer = document.getElementById('progress-bar-legend');
        progressBarContainer.innerHTML = '';
        legendContainer.innerHTML = '';
        if (totalTasks === 0) {
            progressBarContainer.innerHTML = `<div class="no-data-message" style="width: 100%;">No activities to track.</div>`;
            return;
        }
        statusOrder.forEach(status => {
            const count = counts[status];
            if (count > 0) {
                const percentage = (count / totalTasks) * 100;
                const segment = document.createElement('div');
                segment.className = 'progress-bar-segment';
                segment.style.width = `${percentage}%`;
                segment.style.backgroundColor = statusColors[status];
                segment.title = `${statusLabels[status]}: ${count} task(s)`;
                progressBarContainer.appendChild(segment);
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `<div class="legend-color-box" style="background-color: ${statusColors[status]}"></div><span>${statusLabels[status]} (${count})</span>`;
                legendContainer.appendChild(legendItem);
            }
        });
    }

    function updateRiskBubbleChart() {
        const levelMap = { "low": 1, "medium": 2, "high": 3 };
        const riskData = getTableData('risks-container').map(d => ({
            x: levelMap[d.likelihood?.toLowerCase()] || 0,
            y: levelMap[d.impact?.toLowerCase()] || 0,
            r: 4 + ((parseFloat(d.cost) || 0) / 500),
            label: d.risk || 'Unnamed Risk'
        })).filter(d => d.x > 0 && d.y > 0);
        createOrUpdateChart('risk-bubble-chart', {
            type: 'bubble',
            data: { datasets: [{ label: 'Risks', data: riskData, backgroundColor: 'rgba(192, 4, 4, 0.5)' }] },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw.label } } },
                scales: {
                    x: { title: { display: true, text: 'Likelihood', font: { weight: '600' } }, min: 0, max: 4, ticks: { stepSize: 1, callback: (v) => ['','Low','Medium','High'][v] || '' } },
                    y: { title: { display: true, text: 'Impact', font: { weight: '600' } }, min: 0, max: 4, ticks: { stepSize: 1, callback: (v) => ['','Low','Medium','High'][v] || '' } }
                }
            }
        });
    }

    function updateOpportunitiesChart() {
        const levelMap = { "low": 1, "medium": 2, "high": 3 };
        const oppData = getTableData('opportunities-container').map(d => ({
            x: levelMap[d.feasibility?.toLowerCase()] || 0,
            y: levelMap[d.benefit?.toLowerCase()] || 0,
            r: 4 + ((parseInt(d.affected, 10) || 0) / 100),
            label: d.opportunity || 'Unnamed Opp'
        }));
        createOrUpdateChart('opportunities-chart', {
            type: 'bubble',
            data: { datasets: [{ label: 'Opportunities', data: oppData, backgroundColor: 'rgba(40, 167, 69, 0.7)' }] },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw.label } } },
                scales: {
                    x: { title: { display: true, text: 'Feasibility', font: { weight: '600' } }, min: 0, max: 4, ticks: { stepSize: 1, callback: (v) => ['','Low','Medium','High'][v] || '' } },
                    y: { title: { display: true, text: 'Benefit', font: { weight: '600' } }, min: 0, max: 4, ticks: { stepSize: 1, callback: (v) => ['','Low','Medium','High'][v] || '' } }
                }
            }
        });
    }

    function updateKpiCards() {
        const timelineTasks = getTableData('timeline-container');
        const totalProgress = timelineTasks.reduce((sum, task) => sum + (parseInt(task.progress, 10) || 0), 0);
        const overallProgress = timelineTasks.length > 0 ? Math.round(totalProgress / timelineTasks.length) : 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdueTasks = timelineTasks.filter(task => task.end && new Date(task.end) < today && task.status !== 'Complete');
        const highImpactRisks = getTableData('risks-container').filter(risk => risk.impact === 'High');
        const kpis = [
            { title: 'Overall Progress', value: `${overallProgress}%` },
            { title: 'Tasks Overdue', value: overdueTasks.length, color: overdueTasks.length > 0 ? 'var(--red)' : 'var(--green)' },
            { title: 'High-Impact Risks', value: highImpactRisks.length },
            { title: 'Team Members', value: state.teamMembers.length }
        ];
        const kpiGrid = document.querySelector('#report-kpi-container .kpi-grid');
        kpiGrid.innerHTML = kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-info">
                    <div class="kpi-title">${kpi.title}</div>
                    <div class="kpi-value" style="${kpi.color ? `color: ${kpi.color};` : ''}">${kpi.value}</div>
                </div>
            </div>`).join('');
    }

    function updateProjectSummary() {
        const goalText = document.getElementById('primary-goal').value.trim();
        document.getElementById('summary-goal-text').textContent = goalText || 'No goal has been defined yet.';
        const projectName = document.getElementById('project-name').value.trim();
        document.getElementById('summary-report-title').textContent = projectName ? `${projectName} - Implementation Report` : 'Implementation Report';
        initializeTaskTable();
    }

    function initializeTaskTable() {
        const searchInput = document.getElementById('task-search-input');
        const statusFilter = document.getElementById('task-status-filter');
        statusFilter.innerHTML = '<option value="">All Statuses</option>';
        if (appData.options) {
            appData.options.status.forEach(status => statusFilter.add(new Option(status, status)));
        }
        searchInput.addEventListener('input', renderInteractiveTaskTable);
        statusFilter.addEventListener('change', renderInteractiveTaskTable);
        document.querySelectorAll('#interactive-task-table .sortable-th').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                if (state.sortState.key === key) {
                    state.sortState.direction = state.sortState.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortState.key = key;
                    state.sortState.direction = 'asc';
                }
                renderInteractiveTaskTable();
            });
        });
        renderInteractiveTaskTable();
    }

    function renderInteractiveTaskTable() {
        const tableBody = document.querySelector('#interactive-task-table tbody');
        const allTasks = getTableData('timeline-container');
        const searchTerm = document.getElementById('task-search-input').value.toLowerCase();
        const statusFilter = document.getElementById('task-status-filter').value;
        const filteredTasks = allTasks.filter(task =>
            (task.task || '').toLowerCase().includes(searchTerm) && (!statusFilter || task.status === statusFilter)
        );
        const sortedTasks = [...filteredTasks].sort((a, b) => {
            const key = state.sortState.key;
            const dir = state.sortState.direction === 'asc' ? 1 : -1;
            const valA = (a[key] || '').toLowerCase();
            const valB = (b[key] || '').toLowerCase();
            if (valA > valB) return 1 * dir;
            if (valA < valB) return -1 * dir;
            return 0;
        });
        document.querySelectorAll('#interactive-task-table .sortable-th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sortKey === state.sortState.key) {
                th.classList.add(state.sortState.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
        tableBody.innerHTML = '';
        if (sortedTasks.length === 0) {
            tableBody.innerHTML = `<tr class="no-data-row"><td colspan="4" class="no-data-message">No tasks match the current filters.</td></tr>`;
        } else {
            sortedTasks.forEach(task => {
                const row = tableBody.insertRow();
                row.innerHTML = `<td>${task.task || 'N/A'}</td><td>${task.owner || 'Unassigned'}</td><td>${task.end || 'N/A'}</td><td>${task.status || 'N/A'}</td>`;
            });
        }
    }
    // #endregion

    // #region EVENT LISTENERS
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) handleNavigation(e, navLink);

        if (e.target.matches('.add-row-btn')) { addRow(e.target.dataset.table); }
        if (e.target.matches('.delete-btn')) {
            const row = e.target.closest('tr, .expandable-row, .expandable-card');
            if (row) {
                const container = row.parentElement;
                const containerId = container.id || (container.tagName === 'TBODY' ? container.parentElement.id : null);
                row.remove();
                if (containerId) {
                    if (containerId === 'team-members-table') updateTeamMembersState();
                    if (containerId === 'fidelity-plan-container') updateCoreComponentsState();
                    updateEmptyState(containerId);
                    triggerSave();
                }
            }
        }
        if (e.target.closest('.expandable-row-header, .expandable-card-header') && !e.target.closest('button, a, input, select, .autocomplete-wrapper')) {
            e.target.closest('.expandable-row, .expandable-card').classList.toggle('expanded');
        }
    });

    document.body.addEventListener('input', e => {
        const target = e.target;
        if (target.closest('.content-section')) {
            if (target.matches('[data-field="name"]')) updateTeamMembersState();
            if (target.matches('[data-field="component"]')) updateCoreComponentsState();
            if (target.id === 'project-name') updateSidebarTitle();
            triggerSave();
        }
    });

    document.body.addEventListener('change', e => {
        if (e.target.tagName === 'SELECT' && e.target.closest('.content-section')) {
            triggerSave();
        }
    });
    // #endregion

    // --- Start The Application ---
    initializeApp();
});
