/**
 * This script runs the Implementation Planner using the browser's Local Storage for data persistence.
 * It fetches initial dropdown and glossary data from data.json.
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
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            appData = await response.json();
            console.log("App data from data.json loaded successfully.");
            loadPlanFromLocalStorage();
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
        const rowSelector = isTable ? 'tbody tr:not(.no-data-row)' : '.expandable-row, .expandable-card';
        const rows = container.querySelectorAll(rowSelector);
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
            'team-members-table', 'determinants-container', 'strategies-container', 
            'mechanisms-container', 'risks-container', 'opportunities-container', 
            'timeline-container', 'implementation-outcomes-container', 'service-outcomes-container', 
            'client-outcomes-container', 'fidelity-plan-container', 'adaptations-container', 'instruments-container'
        ];
        allTableIds.forEach(id => {
            if (document.getElementById(id)) {
                data.tables[id] = getTableData(id);
            }
        });
        return data;
    }

    function savePlanToLocalStorage() {
        try {
            localStorage.setItem('implementationPlanData', JSON.stringify(getPlanData()));
            console.log("Plan saved to Local Storage.");
        } catch (error) {
            console.error("Error saving to Local Storage: ", error);
        }
    }

    function loadPlanFromLocalStorage() {
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
            console.log("No saved plan found in Local Storage. Initializing new template.");
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
            savePlanToLocalStorage();
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

    /**
     * Resets all flipped cards to their front-facing position.
     */
    function resetFlippableCards() {
        document.querySelectorAll('.card-flipper.is-flipped').forEach(flipper => {
            flipper.classList.remove('is-flipped');
        });
    }

    /**
     * Handles navigation between the main sections of the application.
     */
    function handleNavigation(e, link) {
        e.preventDefault();
        
        // Reset any flipped cards before navigating to a new page.
        resetFlippableCards();

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
        if (!glossaryContainer || glossaryContainer.children.length > 0 || !appData.ericStrategies) return;

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

        glossaryContainer.innerHTML = '';
        Object.entries(glossaryData).forEach(([mainCategory, subCategories]) => {
            const mainHeader = document.createElement('h4');
            mainHeader.textContent = mainCategory;
            glossaryContainer.appendChild(mainHeader);
            
            Object.entries(subCategories).forEach(([subCategory, terms]) => {
                const subHeader = document.createElement('h5');
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
        
        newRowElement.querySelectorAll('select[data-field]').forEach(select => {
            const field = select.dataset.field;
            const optionKey = {
                status: 'status', likelihood: 'likelihood', impact: 'impact', benefit: 'benefit', 
                feasibility: 'feasibility', itemType: 'itemType', dimension: 'fidelityDimension', 
                nature: 'adaptationNature', goal: 'adaptationGoal', planned: 'adaptationPlanned', 
                context: 'contextLevels'
            }[field];
            if (optionKey && appData.options[optionKey]) {
                populateSelect(select, appData.options[optionKey]);
            }
        });
        
        Object.entries(data).forEach(([field, value]) => {
            const input = newRowElement.querySelector(`[data-field="${field}"]`);
            if (input) input.value = value;
        });

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
        select.innerHTML = '';
        (choices || []).forEach(opt => select.add(new Option(opt, opt)));
    }
    
    function initializeFlippableCards() {
        document.querySelectorAll('.module-front-matter').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('a, button')) return;
                const flipper = card.querySelector('.card-flipper');
                if (flipper) {
                    flipper.classList.toggle('is-flipped');
                    if (flipper.classList.contains('is-flipped')) {
                        populateCardBack(card);
                    }
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

    // #region DASHBOARD AND REPORTING
    function updateLandingPageDashboards() {
        document.getElementById('determinants-count').textContent = getTableData('determinants-container').length;
        document.getElementById('strategies-count').textContent = getTableData('strategies-container').length;
        // This function now only updates the text counters, it no longer flips cards.
    }

    function updateReportVisuals() {
        console.log("Updating report visuals...");
    }
    // #endregion

    // #region EVENT LISTENERS
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            handleNavigation(e, navLink);
        }

        if (e.target.matches('.add-row-btn')) {
            addRow(e.target.dataset.table);
        }

        if (e.target.matches('.delete-btn')) {
            const row = e.target.closest('tr, .expandable-row, .expandable-card');
            if (row) {
                const container = row.parentElement;
                const containerId = container.id || (container.tagName === 'TBODY' ? container.parentElement.id : null);
                row.remove();
                if (containerId) {
                    updateEmptyState(containerId);
                    triggerSave();
                }
            }
        }
    });

    document.body.addEventListener('input', e => {
        const target = e.target;
        if (target.closest('.content-section')) {
            if (target.id === 'project-name') {
                updateSidebarTitle();
            }
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
