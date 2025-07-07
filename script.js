document.addEventListener('DOMContentLoaded', function() {
    // State and instance management
    const state = {
        teamMembers: [],
        coreComponents: [],
        sortState: { key: 'end', direction: 'asc' }
    };
    let chartInstances = {};
    let saveTimeout;
    let appData = {}; // This will hold the data from data.json

    // --- Core Functions ---

    // Fetches the external JSON data and then initializes the application
    async function initializeApp() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            appData = await response.json();
            console.log("App data loaded successfully.");
            loadPlan(); // Load user data from Local Storage and populate the UI
        } catch (error) {
            console.error("Fatal Error: Could not load data.json.", error);
            alert("Could not load essential app data (data.json). The app cannot function. Please check the browser's console for more details.");
        }
    }

    // --- Data Persistence (Local Storage) ---

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
            const container = document.getElementById(id);
            if (container) {
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
        // Clear all dynamic containers first
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
                Object.keys(planData.simpleInputs).forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.value = planData.simpleInputs[id];
                });
            }
            if (planData.tables) {
                Object.keys(planData.tables).forEach(tableId => {
                    const tableData = planData.tables[tableId] || [];
                    tableData.forEach(rowData => addRow(tableId, rowData));
                });
            }
        } else {
            console.log("No saved plan found. Initializing new template.");
        }
        
        // Final UI updates after loading
        allContainerSelectors.forEach(selector => updateEmptyState(document.querySelector(selector)?.id || selector.replace('#', '')));
        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
    }

    function triggerSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            savePlan();
            // Refresh dashboards after saving
            const activeTab = document.querySelector('.nav-link.active')?.dataset.target;
            if (activeTab === 'summary') updateReportVisuals();
            else if (activeTab?.endsWith('-landing')) updateLandingPageDashboards();
        }, 1000);
    }
    
    // (The rest of the functions: addRow, populateSelect, navigation, chart updates, etc. should be here)
    // NOTE: All other JavaScript functions from the previous step's script go here. They don't need to change.
    // For brevity, they are not repeated. Just ensure this top section replaces the old one.


    // --- Event Listeners and Initialization ---
    
    // Global click handler for dynamic elements
    document.body.addEventListener('click', e => {
        if (e.target.matches('.add-row-btn')) {
            addRow(e.target.dataset.table);
        } else if (e.target.matches('.delete-btn')) {
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
        } else if (e.target.closest('.expandable-row-header, .expandable-card-header')) {
            if (!e.target.matches('input, button, select, a, .delete-btn, .autocomplete-wrapper *')) {
                 e.target.closest('.expandable-row, .expandable-card').classList.toggle('expanded');
            }
        }
    });

    // Global input handler to trigger auto-save
    document.body.addEventListener('input', e => {
        if (e.target.closest('.content-section')) {
            if (e.target.matches('[data-field="name"]')) updateTeamMembersState();
            if (e.target.matches('[data-field="component"]')) updateCoreComponentsState();
            triggerSave();
        }
    });
    
    // Handles selects and date pickers
    document.body.addEventListener('change', e => {
        if (e.target.closest('.content-section')) triggerSave();
    });

    // START THE APP
    initializeApp(); 
});
