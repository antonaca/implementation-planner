document.addEventListener('DOMContentLoaded', function() {
    const state = {
        teamMembers: [],
        coreComponents: [],
        sortState: { key: 'end', direction: 'asc' }
    };
    let chartInstances = {};
    let saveTimeout;
    let projectData = {}; // To hold our loaded data

    // --- Fetch Data ---
    async function loadAppData() {
        try {
            const response = await fetch('data.json');
            projectData = await response.json();
            console.log("App data loaded successfully.");
            // Initial population after data is fetched
            loadPlan(); 
        } catch (error) {
            console.error("Error loading data.json:", error);
            alert("Could not load essential app data. Please check the console for errors.");
        }
    }

    // --- Element Selectors ---
    const projectNameInput = document.getElementById('project-name');
    const sidebarTitle = document.getElementById('sidebar-title');

    // --- Dynamic Title & UI Updates ---
    function updateSidebarTitle() {
        const shortTitle = projectNameInput.value.trim();
        sidebarTitle.textContent = shortTitle || 'New Project';
    }
    projectNameInput.addEventListener('input', updateSidebarTitle);

    // --- Navigation ---
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

    document.body.addEventListener('click', function(e) {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            handleNavigation(e, navLink);
        }
    });

    // --- Glossary ---
    function populateGlossary() {
        const glossaryContainer = document.getElementById('glossary-container');
        if (!glossaryContainer || glossaryContainer.children.length > 0 || !projectData.ericStrategies) return;

        const glossaryData = {
            "Implementation Strategies": {
                "Expert Recommendations for Implementing Change (ERIC)": projectData.ericStrategies
            },
            "Implementation Outcomes": {
                "Proctor's Outcome Taxonomy: Implementation": projectData.allOutcomesData["Implementation Outcomes"],
                "Proctor's Outcome Taxonomy: Service": projectData.allOutcomesData["Service Outcomes"],
                "Proctor's Outcome Taxonomy: Client": projectData.allOutcomesData["Client Outcomes"]
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
                    card.innerHTML = `
                        <div class="glossary-term">${term.name}</div>
                        <div class="glossary-definition">${term.definition}</div>
                    `;
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

    // --- Data Persistence using Local Storage ---
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
        allTableIds.forEach(id => data.tables[id] = getTableData(id));
        return data;
    }

    function savePlan() {
        try {
            const planData = getPlanData();
            localStorage.setItem('implementationPlanData', JSON.stringify(planData));
            console.log("Plan saved to Local Storage.");
        } catch (error) {
            console.error("Error saving to Local Storage: ", error);
        }
    }

    function loadPlan() {
        const allContainerIds = [
            'team-members-table > tbody', 'determinants-container', 'strategies-container', 'mechanisms-container',
            'risks-container', 'opportunities-container', 'timeline-container',
            'implementation-outcomes-container', 'service-outcomes-container', 'client-outcomes-container',
            'fidelity-plan-container', 'adaptations-container', 'instruments-container'
        ];
         allContainerIds.forEach(id => {
            const el = document.querySelector(`#${id}`);
            if (el) el.innerHTML = '';
        });

        const savedData = localStorage.getItem('implementationPlanData');
        
        if (savedData) {
            console.log("Loading plan from Local Storage.");
            const planData = JSON.parse(savedData);
            
            if (planData.simpleInputs) {
                Object.keys(planData.simpleInputs).forEach(id => {
                    let input = document.getElementById(id);
                    if (input) input.value = planData.simpleInputs[id];
                });
            }
            if (planData.tables) {
                Object.keys(planData.tables).forEach(tableId => {
                    const tableData = planData.tables[tableId];
                    if (tableData && Array.isArray(tableData)) {
                        tableData.forEach(rowData => addRow(tableId, rowData));
                    }
                });
            }
        } else {
            console.log("No saved plan found. Initializing new template.");
        }

        allContainerIds.forEach(id => updateEmptyState(id.split(' ')[0]));
        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
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

    // --- Event Listeners for Adding/Deleting/Expanding Rows ---
    document.body.addEventListener('click', e => {
        if (e.target.matches('.add-row-btn')) {
            addRow(e.target.dataset.table);
        }
        if (e.target.matches('.delete-btn')) {
            const row = e.target.closest('tr, .expandable-row, .expandable-card');
            if (row) {
                const container = row.parentElement;
                const containerId = container.id || container.parentElement.id; // Handles tbody case
                row.remove();
                if (containerId === 'team-members-table') updateTeamMembersState();
                if (containerId === 'fidelity-plan-container') updateCoreComponentsState();
                updateEmptyState(containerId);
                triggerSave();
            }
        }
        if (e.target.closest('.expandable-row-header, .expandable-card-header')) {
            if (!e.target.matches('input, button, select, a, .delete-btn, .autocomplete-wrapper *')) {
                 e.target.closest('.expandable-row, .expandable-card').classList.toggle('expanded');
            }
        }
    });

    document.body.addEventListener('input', e => {
        const target = e.target;
        if (target.closest('.content-section')) {
            if (target.matches('[data-field="name"]')) updateTeamMembersState();
            if (target.matches('[data-field="component"]')) updateCoreComponentsState();
            if (!target.matches('.strategy-search-input, .outcome-search-input')) {
                triggerSave();
            }
        }
    });
     document.body.addEventListener('change', e => {
        if (e.target.closest('.content-section')) triggerSave();
    });

    // --- Other Functions (Add Row, Autocomplete, Charts, etc.) ---
    
    // Most other functions can be copied from the original script, but they will
    // now rely on the Local Storage save/load cycle instead of Firebase.
    // The following are essential functions adapted from your original code.

    function getTableData(id) {
        const container = document.getElementById(id);
        if (!container) return [];
        const selector = id === 'team-members-table' ? 'tbody tr:not(.no-data-row)' : '.expandable-row, .expandable-card';
        const rows = container.querySelectorAll(selector);
        return Array.from(rows).map(row => {
            const data = {};
            row.querySelectorAll('[data-field]').forEach(input => data[input.dataset.field] = input.value);
            return data;
        });
    }

    function addRow(containerId, data = {}) {
        const isTable = containerId === 'team-members-table';
        const templateId = isTable ? `${containerId}-template` : `${containerId}-template`;
        const containerSelector = isTable ? `#${containerId} tbody` : `#${containerId}`;
        
        const template = document.getElementById(templateId);
        const container = document.querySelector(containerSelector);
        if (!template || !container) return;

        const newRowFragment = template.content.cloneNode(true);
        const newRowElement = newRowFragment.firstElementChild;
        
        // Populate fields and initialize selects/autocompletes
        Object.keys(data).forEach(field => {
            const input = newRowElement.querySelector(`[data-field="${field}"]`);
            if (input) input.value = data[field];
        });

        newRowElement.querySelectorAll('select[data-field]').forEach(select => {
            const field = select.dataset.field;
            const choiceMap = { status: 'status', likelihood: 'level', impact: 'level', benefit: 'level', feasibility: 'level', itemType: 'itemType', dimension: 'fidelityDimension', nature: 'adaptationNature', goal: 'adaptationGoal', planned: 'adaptationPlanned', context: 'contextLevels' };
            if (choiceMap[field] && projectData.options) populateSelect(select, projectData.options[choiceMap[field]]);
            if (data[field]) select.value = data[field];
        });

        // Initialize Autocompletes
        if (containerId === 'strategies-container') {
            const input = newRowElement.querySelector('.strategy-search-input');
            const results = newRowElement.querySelector('.autocomplete-results');
            const definitionDisplay = newRowElement.querySelector('.strategy-definition-display');
            const updateDef = (name) => {
                const item = projectData.ericStrategies.find(s => s.name === name);
                definitionDisplay.textContent = item ? item.definition : 'Select a strategy to see its definition.';
            };
            initializeAutocomplete(input, results, projectData.ericStrategies, updateDef);
            if (data.strategy) updateDef(data.strategy);
        } else if (containerId.includes('-outcomes-container')) {
             const key = { 
                'implementation-outcomes-container': 'Implementation Outcomes', 
                'service-outcomes-container': 'Service Outcomes', 
                'client-outcomes-container': 'Client Outcomes' 
            }[containerId];
            const outcomes = projectData.allOutcomesData[key];
            const input = newRowElement.querySelector('.outcome-search-input');
            const results = newRowElement.querySelector('.autocomplete-results');
            const definitionDisplay = newRowElement.querySelector('.outcome-definition-display');
            const updateDef = (name) => {
                 const item = outcomes.find(o => o.name === name);
                 definitionDisplay.textContent = item ? item.definition : 'Select an outcome to see its definition.';
            };
            initializeAutocomplete(input, results, outcomes, updateDef);
            if (data.outcome) updateDef(data.outcome);
        }

        container.appendChild(newRowElement);
        updateEmptyState(containerId);
        if (Object.keys(data).length === 0) triggerSave();
    }
    
    function populateSelect(select, choices) {
        (choices || []).forEach(opt => select.add(new Option(opt, opt)));
    }
    
    function updateEmptyState(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const isTable = container.tagName === 'TABLE';
        const contentRows = isTable ? container.querySelectorAll('tbody tr:not(.no-data-row)') : container.querySelectorAll('.expandable-row, .expandable-card');
        const messageElement = container.querySelector('.no-data-message, .no-data-row');
        if (messageElement) {
            messageElement.style.display = contentRows.length === 0 ? (isTable ? 'table-row' : 'block') : 'none';
        }
    }
    
    // (Include the rest of the helper functions: initializeFlippableCards, populateCardBack, updateReportVisuals, updateKpiCards, chart functions, etc. here, they should work as is)
    // NOTE: For brevity, these functions are omitted but should be copied from the original script provided in the prompt.
    
    // --- Initial Load ---
    loadAppData();
});
