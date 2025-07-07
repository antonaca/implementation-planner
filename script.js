document.addEventListener('DOMContentLoaded', function() {
    // Application state and chart instances
    const state = {
        teamMembers: [],
        coreComponents: [],
        sortState: { key: 'end', direction: 'asc' }
    };
    let chartInstances = {};
    let saveTimeout;
    let appData = {}; // This will hold all data from data.json

    // --- Core Application Logic ---

    /**
     * Fetches the data from data.json and starts the application.
     * This is the main entry point.
     */
    async function initializeApp() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            appData = await response.json();
            console.log("App data from data.json loaded successfully.");
            
            // Now that we have appData, we can load the user's plan and build the UI
            loadPlan();
        } catch (error) {
            console.error("Fatal Error: Could not load data.json.", error);
            alert("Could not load essential app data (data.json). The app cannot function. Please check the file exists and the path is correct.");
        }
    }

    // --- Data Persistence using Browser Local Storage ---

    /**
     * Gathers all user-entered data from the page.
     * @returns {object} An object containing all the plan data.
     */
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

    /**
     * Saves the current plan data to the browser's local storage.
     */
    function savePlan() {
        try {
            localStorage.setItem('implementationPlanData', JSON.stringify(getPlanData()));
            console.log("Plan saved to Local Storage.");
        } catch (error) {
            console.error("Error saving to Local Storage: ", error);
        }
    }

    /**
     * Loads the plan data from local storage and populates the entire application.
     */
    function loadPlan() {
        // Clear all dynamic containers before loading
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
        
        // Final UI updates after loading everything
        allContainerSelectors.forEach(selector => updateEmptyState(selector.replace('#', '').split(' ')[0]));
        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
    }

    /**
     * Debounces the save function to avoid saving on every single keystroke.
     */
    function triggerSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            savePlan();
            // Also refresh dashboards after saving
            const activeTab = document.querySelector('.nav-link.active')?.dataset.target;
            if (activeTab === 'summary') {
                updateReportVisuals();
            } else if (activeTab?.endsWith('-landing')) {
                updateLandingPageDashboards();
            }
        }, 1000);
    }
    
    // --- NOTE: All other functions from the original script should be placed here ---
    // (e.g., populateGlossary, handleNavigation, updateLandingPageDashboards, etc.)
    // For brevity, only the core logic is shown. Ensure all your other functions are present.

    // --- Start the Application ---
    initializeApp();
});
