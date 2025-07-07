/**
 * FINAL COMPLETE SCRIPT v3
 * Contains all necessary functions for the app to run.
 * Uses Local Storage for data persistence.
 */
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
            if (!response.ok) throw new Error(`Network response not ok: ${response.status}`);
            appData = await response.json();
            console.log("App data from data.json loaded successfully.");
            loadPlan();
        } catch (error) {
            console.error("Fatal Error loading app data:", error);
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
        return Array.from(container.querySelectorAll(selector)).map(row => {
            const data = {};
            row.querySelectorAll('[data-field]').forEach(input => data[input.dataset.field] = input.value);
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
            if (document.getElementById(id)) data.tables[id] = getTableData(id);
        });
        return data;
    }

    function savePlan() {
        try {
            localStorage.setItem('implementationPlanData', JSON.stringify(getPlanData()));
            console.log("Plan saved to Local Storage.");
        } catch (error) {
            console.error("Error saving to Local Storage:", error);
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

    // #region UI AND HELPER FUNCTIONS
    function updateSidebarTitle() {
        const projectNameInput = document.getElementById('project-name');
        const sidebarTitle = document.getElementById('sidebar-title');
        if (projectNameInput && sidebarTitle) {
            sidebarTitle.textContent = projectNameInput.value.trim() || 'New Project';
        }
    }

    function handleNavigation(e, link) {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
        const topLevelLi = link.closest('.sidebar-nav > li');
        if (topLevelLi) {
            topLevelLi.querySelector('a').classList.add('active');
        }
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });
        if (targetId.endsWith('-landing')) updateLandingPageDashboards();
        if (targetId === 'summary') updateReportVisuals();
        if (targetId === 'glossary') populateGlossary();
    }
    
    function populateGlossary() {
        const glossaryContainer = document.getElementById('glossary-container');
        if (!glossaryContainer || !appData.ericStrategies) return;
        glossaryContainer.innerHTML = ''; // Clear existing content to prevent duplication
        const glossaryData = {
            "Implementation Strategies": {
                "Expert Recommendations for Implementing Change (ERIC)": appData.ericStrategies
            },
            "Implementation Outcomes": {
                "Proctor's Outcome Taxonomy: Implementation": appData.allOutcomesData["Implementation Outcomes"],
                "Proctor's Outcome Taxonomy: Service": appData.allOutcomesData["Service Outcomes"],
                "Proctor's Outcome Taxonomy: Client": appData.allOutcomesData["Client Outcomes"]
            }
        };
        Object.entries(glossaryData).forEach(([mainCategory, subCategories]) => {
            const mainHeader = document.createElement('h4');
            mainHeader.className = 'glossary-main-category';
            mainHeader.textContent = mainCategory;
            glossaryContainer.appendChild(mainHeader);
            Object.entries(subCategories).forEach(([subCategory, terms]) => {
                const subHeader = document.createElement('h5');
                subHeader.className = 'glossary-sub-category';
                subHeader.textContent = subCategory;
                glossaryContainer.appendChild(subHeader);
                const grid = document.createElement('div');
                grid.className = 'glossary-grid';
                terms.sort((a, b) => a.name.localeCompare(b.name)).forEach(term => {
                    const card = document.createElement('div');
                    card.className = 'glossary-card';
                    card.innerHTML = `<div class="glossary-term">${term.name}</div><div class="glossary-definition">${term.definition}</div>`;
                    grid.appendChild(card);
                });
                glossaryContainer.appendChild(grid);
            });
        });
        const searchInput = document.getElementById('glossary-search');
        searchInput.addEventListener('input', () => {
            const filter = searchInput.value.toUpperCase();
            glossaryContainer.querySelectorAll('.glossary-card').forEach(card => {
                const termText = card.querySelector('.glossary-term').textContent.toUpperCase();
                const definitionText = card.querySelector('.glossary-definition').textContent.toUpperCase();
                card.style.display = (termText.includes(filter) || definitionText.includes(filter)) ? "" : "none";
            });
        });
    }

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

        if (containerId === 'strategies-container' && appData.ericStrategies) {
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
    
    function updateTeamMembersState() {
        state.teamMembers = Array.from(document.querySelectorAll('#team-members-table tbody tr:not(.no-data-row)'))
            .map(row => ({ name: row.querySelector('[data-field="name"]').value.trim() }))
            .filter(member => member.name);
    }

    function updateCoreComponentsState() {
        state.coreComponents = Array.from(document.querySelectorAll('#fidelity-plan-container .expandable-row'))
            .map(row => row.querySelector('[data-field="component"]').value.trim())
            .filter(Boolean);
        updateAdaptationCoreComponentDropdowns();
    }
    
    function updateAdaptationCoreComponentDropdowns() {
        document.querySelectorAll('select.core-component-dropdown').forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Component</option>';
            const strategyOption = new Option("Implementation Strategy", "Implementation Strategy");
            if ("Implementation Strategy" === currentValue) strategyOption.selected = true;
            select.appendChild(strategyOption);
            state.coreComponents.forEach(name => {
                const option = new Option(name, name);
                if (name === currentValue) option.selected = true;
                select
