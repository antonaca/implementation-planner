import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAt05cBYUIjXTWjcqRIpNtJ6SLicRg-ueQ",
    authDomain: "implementation-planner.firebaseapp.com",
    projectId: "implementation-planner",
    storageBucket: "implementation-planner.firebasestorage.app",
    messagingSenderId: "596830800731",
    appId: "1:596830800731:web:335fc7cfd48916c4f8a87e",
    measurementId: "G-6D3D3MM5D9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
let userId;

setLogLevel('debug');

document.addEventListener('DOMContentLoaded', function() {
    const state = {
        teamMembers: [],
        coreComponents: [],
        sortState: { key: 'end', direction: 'asc' }
    };
    let chartInstances = {};
    let saveTimeout;
    
    // --- Global Constants & Options ---
    const allOutcomesData = {
        "Implementation Outcomes": [
            { name: "Acceptability", definition: "The perception among implementation stakeholders that a given treatment, service, practice, or innovation is agreeable, palatable, or satisfactory." },
            { name: "Adoption", definition: "The intention, initial decision, or action to try or employ an innovation or evidence-based practice." },
            { name: "Appropriateness", definition: "The perceived fit, relevance, or compatibility of the innovation or evidence based practice for a given practice setting, provider, or consumer; and/or perceived fit of the innovation to address a particular issue or problem." },
            { name: "Feasibility", definition: "The extent to which a new treatment, or an innovation, can be successfully used or carried out within a given agency or setting." },
            { name: "Fidelity", definition: "The degree to which an intervention was implemented as it was prescribed in the original protocol or as it was intended by the program developers." },
            { name: "Implementation Cost", definition: "The cost impact of an implementation effort." },
            { name: "Penetration", definition: "The integration of a practice within a service setting and its subsystems." },
            { name: "Sustainability", definition: "The extent to which a newly implemented treatment is maintained or institutionalized within a service setting’s ongoing, stable operations." }
        ],
        "Service Outcomes": [
            { name: "Efficiency", definition: "The extent to which a service achieves its outcomes with the minimal expenditure of resources." },
            { name: "Safety", definition: "The extent to which a service minimizes the risk of harm to consumers." },
            { name: "Effectiveness", definition: "The extent to which a service achieves its intended outcomes when delivered in real-world settings." },
            { name: "Equity", definition: "The extent to which a service is delivered in a way that is fair and just, without disparities based on patient characteristics." },
            { name: "Patient-centeredness", definition: "The extent to which a service is respectful of and responsive to individual patient preferences, needs, and values." },
            { name: "Timeliness", definition: "The extent to which a service is provided to consumers in a timely manner, reducing waits and harmful delays." }
        ],
        "Client Outcomes": [
            { name: "Satisfaction", definition: "The client's level of contentment with the services received." },
            { name: "Function", definition: "The impact of a service on a client's ability to perform daily activities and roles." },
            { name: "Symptomatology", definition: "The effect of a service on a client's symptoms and signs of illness." }
        ]
    };

    const ericStrategies = [
        { name: "Access new funding", definition: "Access new or existing money to facilitate the implementation." },
        { name: "Alter incentive/allowance structures", definition: "Work to incentivize the adoption and implementation of the clinical innovation." },
        { name: "Alter patient/consumer fees", definition: "Create fee structures where patients/consumers pay less for preferred treatments (the clinical innovation) and more for less-preferred treatments." },
        { name: "Assess for readiness and identify barriers and facilitators", definition: "Assess various aspects of an organization to determine its degree of readiness to implement, barriers that may impede implementation, and strengths that can be used in the implementation effort." },
        { name: "Audit and provide feedback", definition: "Collect and summarize clinical performance data over a specified time period and give it to clinicians and administrators to monitor, evaluate, and modify provider behavior." },
        { name: "Build a coalition", definition: "Recruit and cultivate relationships with partners in the implementation effort." },
        { name: "Capture and share local knowledge", definition: "Capture local knowledge from implementation sites on how implementers and clinicians made something work in their setting and then share it with other sites." },
        { name: "Centralize technical assistance", definition: "Develop and use a centralized system to deliver technical assistance focused on implementation issues." },
        { name: "Change accreditation or membership requirements", definition: "Strive to alter accreditation standards so that they require or encourage use of the clinical innovation. Work to alter membership organization requirements so that those who want to affiliate with the organization are encouraged or required to use the clinical innovation." },
        { name: "Change liability laws", definition: "Participate in liability reform efforts that make clinicians more willing to deliver the clinical innovation." },
        { name: "Change physical structure and equipment", definition: "Evaluate current configurations and adapt, as needed, the physical structure and/or equipment (e.g., changing the layout of a room, adding equipment) to best accommodate the targeted innovation." },
        { name: "Change record systems", definition: "Change records systems to allow better assessment of implementation or clinical outcomes." },
        { name: "Change service sites", definition: "Change the location of clinical service sites to increase access." },
        { name: "Conduct cyclical small tests of change", definition: "Implement changes in a cyclical fashion using small tests of change before taking changes system-wide. Tests of change benefit from systematic measurement, and results of the tests of change are studied for insights on how to do better. This process continues serially over time, and refinement is added with each cycle." },
        { name: "Conduct educational meetings", definition: "Hold meetings targeted toward different stakeholder groups (e.g., providers, administrators, other organizational stakeholders, and community, patient/consumer, and family stakeholders) to teach them about the clinical innovation." },
        { name: "Conduct educational outreach visits", definition: "Have a trained person meet with providers in their practice settings to educate providers about the clinical innovation with the intent of changing the provider's practice." },
        { name: "Conduct local consensus discussions", definition: "Include local providers and other stakeholders in discussions that address whether the chosen problem is important and whether the clinical innovation to address it is appropriate." },
        { name: "Conduct local needs assessment", definition: "Collect and analyze data related to the need for the innovation." },
        { name: "Conduct ongoing training", definition: "Plan for and conduct training in the clinical innovation in an ongoing way." },
        { name: "Create a learning collaborative", definition: "Facilitate the formation of groups of providers or provider organizations and foster a collaborative learning environment to improve implementation of the clinical innovation." },
        { name: "Create new clinical teams", definition: "Change who serves on the clinical team, adding different disciplines and different skills to make it more likely that the clinical innovation is delivered (or is more successfully delivered)." },
        { name: "Create or change credentialing and/or licensure standards", definition: "Create an organization that certifies clinicians in the innovation or encourage an existing organization to do so. Change governmental professional certification or licensure requirements to include delivering the innovation. Work to alter continuing education requirements to shape professional practice toward the innovation." },
        { name: "Develop a formal implementation blueprint", definition: "Develop a formal implementation blueprint that includes all goals and strategies. The blueprint should include the following: 1) aim/purpose of the implementation; 2) scope of the change (e.g., what organizational units are affected); 3) timeframe and milestones; and 4) appropriate performance/progress measures. Use and update this plan to guide the implementation effort over time." },
        { name: "Develop academic partnerships", definition: "Partner with a university or academic unit for the purposes of shared training and bringing research skills to an implementation project." },
        { name: "Develop an implementation glossary", definition: "Develop and distribute a list of terms describing the innovation, implementation, and stakeholders in the organizational change." },
        { name: "Develop and implement tools for quality monitoring", definition: "Develop, test, and introduce into quality-monitoring systems the right input-the appropriate language, protocols, algorithms, standards, and measures (of processes patient/consumer outcomes, and implementation outcomes) that are often specific to the innovation being implemented." },
        { name: "Develop and organize quality monitoring systems", definition: "Develop and organize systems and procedures that monitor clinical processes and/or outcomes for the purpose of quality assurance and improvement." },
        { name: "Develop disincentives", definition: "Provide financial disincentives for failure to implement or use the clinical innovations." },
        { name: "Develop educational materials", definition: "Develop and format manuals, toolkits, and other supporting materials in ways that make it easier for stakeholders to learn about the innovation and for clinicians to learn how to deliver the clinical innovation." },
        { name: "Develop resource sharing agreements", definition: "Develop partnerships with organizations that have resources needed to implement the innovation." },
        { name: "Distribute educational materials", definition: "Distribute educational materials (including guidelines, manuals, and toolkits) in person, by mail, and/or electronically." },
        { name: "Facilitate relay of clinical data to providers", definition: "Provide as close to real-time data as possible about key measures of process/outcomes using integrated modes/channels of communication in a way that promotes use of the targeted innovation." },
        { name: "Facilitation", definition: "A process of interactive problem solving and support that occurs in a context of a recognized need for improvement and a supportive interpersonal relationship." },
        { name: "Fund and contract for the clinical innovation", definition: "Governments and other payers of services issue requests for proposals to deliver the innovation, use contracting processes to motivate providers to deliver the clinical innovation, and develop new funding formulas that make it more likely that providers will deliver the innovation." },
        { name: "Identify and prepare champions", definition: "Identify and prepare individuals who dedicate themselves to supporting, marketing and driving through an implementation, overcoming indifference or resistance that the intervention may provoke in an organization." },
        { name: "Identify early adopters", definition: "Identify early adopters at the local site to learn from their experiences with the practice innovation." },
        { name: "Increase demand", definition: "Attempt to influence the market for the clinical innovation to increase competition intensity and to increase the maturity of the market for the clinical innovation." },
        { name: "Inform local opinion leaders", definition: "Inform providers identified by colleagues as opinion leaders or 'educationally influential' about the clinical innovation in the hopes that they will influence colleagues to adopt it." },
        { name: "Intervene with patients/consumers to enhance uptake and adherence", definition: "Develop strategies with patients to encourage and problem solve around adherence." },
        { name: "Involve executive boards", definition: "Involve existing governing structures (e.g., boards of directors, medical staff boards of governance) in the implementation effort, including the review of data on implementation processes." },
        { name: "Involve patients/consumers and family members", definition: "Engage or include patients/consumers and families in the implementation effort." },
        { name: "Make billing easier", definition: "Make it easier to bill for the clinical innovation." },
        { name: "Make training dynamic", definition: "Vary the information delivery methods to cater to different learning styles and work contexts, and shape the training in the innovation to be interactive." },
        { name: "Mandate change", definition: "Have leadership declare the priority of the innovation and their determination to have it implemented." },
        { name: "Model and simulate change", definition: "Model or simulate the change that will be implemented prior to implementation." },
        { name: "Obtain and use patients/consumers and family feedback", definition: "Develop strategies to increase patient/consumer and family feedback on the implementation effort." },
        { name: "Obtain formal commitments", definition: "Obtain written commitments from key partners that state what they will do to implement the innovation." },
        { name: "Organize clinician implementation team meetings", definition: "Develop and support teams of clinicians who are implementing the innovation and give them protected time to reflect on the implementation effort, share lessons learned, and support one another's learning." },
        { name: "Place innovation on fee for service lists/formularies", definition: "Work to place the clinical innovation on lists of actions for which providers can be reimbursed (e.g., a drug is placed on a formulary, a procedure is now reimbursable)." },
        { name: "Prepare patients/consumers to be active participants", definition: "Prepare patients/consumers to be active in their care, to ask questions, and specifically to inquire about care guidelines, the evidence behind clinical decisions, or about available evidence-supported treatments." },
        { name: "Promote adaptability", definition: "Identify the ways a clinical innovation can be tailored to meet local needs and clarify which elements of the innovation must be maintained to preserve fidelity." },
        { name: "Promote network weaving", definition: "Identify and build on existing high-quality working relationships and networks within and outside the organization, organizational units, teams, etc. to promote information sharing, collaborative problem-solving, and a shared vision/goal related to implementing the innovation." },
        { name: "Provide clinical supervision", definition: "Provide clinicians with ongoing supervision focusing on the innovation. Provide training for clinical supervisors who will supervise clinicians who provide the innovation." },
        { name: "Provide local technical assistance", definition: "Develop and use a system to deliver technical assistance focused on implementation issues using local personnel." },
        { name: "Provide ongoing consultation", definition: "Provide ongoing consultation with one or more experts in the strategies used to support implementing the innovation." },
        { name: "Purposely reexamine the implementation", definition: "Monitor progress and adjust clinical practices and implementation strategies to continuously improve the quality of care." },
        { name: "Recruit, designate, and train for leadership", definition: "Recruit, designate, and train leaders for the change effort." },
        { name: "Remind clinicians", definition: "Develop reminder systems designed to help clinicians to recall information and/or prompt them to use the clinical innovation." },
        { name: "Revise professional roles", definition: "Shift and revise roles among professionals who provide care, and redesign job characteristics." },
        { name: "Shadow other experts", definition: "Provide ways for key individuals to directly observe experienced people engage with or use the targeted practice change/innovation." },
        { name: "Stage implementation scale up", definition: "Phase implementation efforts by starting with small pilots or demonstration projects and gradually move to a system wide rollout." },
        { name: "Start a dissemination organization", definition: "Identify or start a separate organization that is responsible for disseminating the clinical innovation. It could be a for-profit or non-profit organization." },
        { name: "Tailor strategies", definition: "Tailor the implementation strategies to address barriers and leverage facilitators that were identified through earlier data collection." },
        { name: "Use advisory boards and workgroups", definition: "Create and engage a formal group of multiple kinds of stakeholders to provide input and advice on implementation efforts and to elicit recommendations for improvements." },
        { name: "Use an implementation advisor", definition: "Seek guidance from experts in implementation." },
        { name: "Use capitated payments", definition: "Pay providers or care systems a set amount per patient/consumer for delivering clinical care." },
        { name: "Use data experts", definition: "Involve, hire, and/or consult experts to inform management on the use of data generated by implementation efforts." },
        { name: "Use data warehousing techniques", definition: "Integrate clinical records across facilities and organizations to facilitate implementation across systems." },
        { name: "Use mass media", definition: "Use media to reach large numbers of people to spread the word about the clinical innovation." },
        { name: "Use other payment schemes", definition: "Introduce payment approaches (in a catch-all category)." },
        { name: "Use train-the-trainer strategies", definition: "Train designated clinicians or organizations to train others in the clinical innovation." },
        { name: "Visit other sites", definition: "Visit sites where a similar implementation effort has been considered successful." },
        { name: "Work with educational institutions", definition: "Encourage educational institutions to train clinicians in the innovation." }
    ];

    const options = {
        status: ['Not Started', 'Waiting', 'In Progress', 'At Risk', 'Complete'],
        level: ['Low', 'Medium', 'High'],
        itemType: ['Task / Activity', 'Event', 'Phase', 'Milestone'],
        fidelityDimension: ['Adherence', 'Dose', 'Quality', 'Participant Responsiveness'],
        adaptationNature: ['Tailoring', 'Adding', 'Removing', 'Shortening', 'Lengthening', 'Substituting', 'Reordering'],
        adaptationGoal: ['Increase Reach', 'Improve Fit', 'Decrease Costs', 'Improve Effectiveness'],
        adaptationPlanned: ['Planned/Proactive', 'Planned/Reactive', 'Unplanned/Reactive'],
        contextLevels: ['Inner Setting', 'Outer Setting', 'Innovation Characteristics', 'Characteristics of Individuals']
    };

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
        if (!glossaryContainer || glossaryContainer.children.length > 0) return;

        const glossaryData = {
            "Implementation Strategies": {
                "Expert Recommendations for Implementing Change (ERIC)": ericStrategies
            },
            "Implementation Outcomes": {
                "Proctor's Outcome Taxonomy: Implementation": allOutcomesData["Implementation Outcomes"],
                "Proctor's Outcome Taxonomy: Service": allOutcomesData["Service Outcomes"],
                "Proctor's Outcome Taxonomy: Client": allOutcomesData["Client Outcomes"]
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
    
    // --- State Management & UI Updates ---
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
                select.appendChild(option);
            });
        });
    }

    // --- Chart & Dashboard Updates ---
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
        const today = new Date(); today.setHours(0,0,0,0);
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

        const counts = statusOrder.reduce((acc, status) => ({...acc, [status]: 0}), {});
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
            data: { datasets: [{ label: 'Opportunities', data: oppData, backgroundColor: 'rgba(40, 167, 69, 0.7)'}] },
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
            </div>
        `).join('');
    }

    // --- Summary Page ---
    function renderInteractiveTaskTable() {
        const table = document.getElementById('interactive-task-table');
        const tableBody = table.querySelector('tbody');
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

        table.querySelectorAll('.sortable-th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sortKey === state.sortState.key) {
                th.classList.add(state.sortState.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
        
        tableBody.innerHTML = ''; // Clear previous content
        const noDataRow = tableBody.querySelector('.no-data-row') || document.createElement('tr');
        if (!noDataRow.parentElement) {
            noDataRow.className = 'no-data-row';
            noDataRow.innerHTML = `<td colspan="4" class="no-data-message">No tasks match the current filters.</td>`;
            tableBody.appendChild(noDataRow);
        }

        if (sortedTasks.length === 0) {
            noDataRow.style.display = 'table-row';
        } else {
            noDataRow.style.display = 'none';
            sortedTasks.forEach(task => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${task.task || 'N/A'}</td>
                    <td>${task.owner || 'Unassigned'}</td>
                    <td>${task.end || 'N/A'}</td>
                    <td>${task.status || 'N/A'}</td>
                `;
            });
        }
    }

    function initializeTaskTable() {
        const searchInput = document.getElementById('task-search-input');
        const statusFilter = document.getElementById('task-status-filter');

        statusFilter.innerHTML = '<option value="">All Statuses</option>';
        options.status.forEach(status => statusFilter.add(new Option(status, status)));

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
    
    function updateProjectSummary() {
        const goalText = document.getElementById('primary-goal').value.trim();
        document.getElementById('summary-goal-text').textContent = goalText || 'No goal has been defined yet.';
        
        const projectName = projectNameInput.value.trim();
        document.getElementById('summary-report-title').textContent = projectName ? `${projectName} - Implementation Report` : 'Implementation Report';
        
        initializeTaskTable();
    }

    // --- Row Management & Autocomplete ---
    function populateSelect(select, choices) {
        (choices || []).forEach(opt => {
            const optionValue = (typeof opt === 'object') ? opt.value : opt;
            const optionLabel = (typeof opt === 'object') ? opt.label : opt;
            select.add(new Option(optionLabel, optionValue));
        });
    }

    function initializeAutocomplete(input, resultsContainer, dataSource, definitionDisplayUpdater) {
        if (!input || !resultsContainer) return;
        let activeIndex = -1;

        const filterAndShowResults = () => {
            const query = input.value.toLowerCase();
            resultsContainer.innerHTML = '';
            
            const filtered = query ? dataSource.filter(item => item.name.toLowerCase().includes(query)) : dataSource;
            
            if (filtered.length > 0) {
                filtered.forEach((itemData, index) => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.textContent = itemData.name;
                    item.dataset.index = index;
                    item.addEventListener('mousedown', () => {
                        input.value = itemData.name;
                        resultsContainer.classList.remove('active');
                        if (definitionDisplayUpdater) definitionDisplayUpdater(itemData.name);
                        triggerSave();
                    });
                    resultsContainer.appendChild(item);
                });
                
                // Check position and flip if needed
                const inputRect = input.getBoundingClientRect();
                const spaceBelow = window.innerHeight - inputRect.bottom;
                // Use a fixed height for check, or scrollHeight if visible
                const resultsHeight = Math.min(250, resultsContainer.scrollHeight); 

                if (spaceBelow < resultsHeight && inputRect.top > resultsHeight) {
                    resultsContainer.classList.add('flipped');
                } else {
                    resultsContainer.classList.remove('flipped');
                }

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

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex > -1) items[activeIndex].dispatchEvent(new Event('mousedown'));
            } else if (e.key === 'Escape') {
                 resultsContainer.classList.remove('active');
            }
            items.forEach((item, index) => item.classList.toggle('selected', index === activeIndex));
        });
    }
    
    function updateEmptyState(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const isTableBody = container.tagName === 'TBODY';
        const contentRows = isTableBody ? container.querySelectorAll('tr:not(.no-data-row)') : container.querySelectorAll('.expandable-row, .expandable-card');
        const messageElement = isTableBody ? container.querySelector('.no-data-row') : container.querySelector('.no-data-message');

        if (messageElement) {
            messageElement.style.display = contentRows.length === 0 ? (isTableBody ? 'table-row' : 'block') : 'none';
        }
    }

    function addRow(containerId, data = {}) {
        const templateId = `${containerId}-template`;
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;

        const newRowFragment = template.content.cloneNode(true);
        const newRowElement = newRowFragment.firstElementChild;
        
        // Initialize Autocompletes
        if (containerId === 'strategies-container') {
            const input = newRowElement.querySelector('.strategy-search-input');
            const results = newRowElement.querySelector('.autocomplete-results');
            const definitionDisplay = newRowElement.querySelector('.strategy-definition-display');
            const updateDef = (name) => {
                const item = ericStrategies.find(s => s.name === name);
                definitionDisplay.textContent = item ? item.definition : 'Select a strategy to see its definition.';
            };
            initializeAutocomplete(input, results, ericStrategies, updateDef);
            if (data.strategy) updateDef(data.strategy);
        } else if (containerId.includes('-outcomes-container')) {
            const key = { 'implementation': 'Implementation Outcomes', 'service': 'Service Outcomes', 'client': 'Client Outcomes' }[containerId.split('-')[0]];
            const outcomes = allOutcomesData[key];
            const input = newRowElement.querySelector('.outcome-search-input');
            const results = newRowElement.querySelector('.autocomplete-results');
            const definitionDisplay = newRowElement.querySelector('.outcome-definition-display');
            const updateDef = (name) => {
                 const item = outcomes.find(o => o.name === name);
                 definitionDisplay.textContent = item ? item.definition : 'Select an outcome to see its definition.';
            };
            initializeAutocomplete(input, results, outcomes, updateDef);
            if (data.outcome) updateDef(data.outcome);
        } else if (containerId === 'timeline-container' || containerId.includes('-outcomes-container')) {
            const ownerInput = newRowElement.querySelector('.owner-search-input');
            const ownerResults = newRowElement.querySelector('.autocomplete-results');
            initializeAutocomplete(ownerInput, ownerResults, state.teamMembers, null);
        }

        // Populate fields
        Object.keys(data).forEach(field => {
            const input = newRowElement.querySelector(`[data-field="${field}"]`);
            if (input) input.value = data[field];
        });

        newRowElement.querySelectorAll('select[data-field]').forEach(select => {
            const field = select.dataset.field;
            const choiceMap = { status: 'status', likelihood: 'level', impact: 'level', benefit: 'level', feasibility: 'level', itemType: 'itemType', dimension: 'fidelityDimension', nature: 'adaptationNature', goal: 'adaptationGoal', planned: 'adaptationPlanned', context: 'contextLevels' };
            if (choiceMap[field]) populateSelect(select, options[choiceMap[field]]);
            if (data[field]) select.value = data[field];
        });

        container.appendChild(newRowElement);

        // Update state and UI
        if (containerId === 'team-members-table') updateTeamMembersState();
        if (containerId === 'fidelity-plan-container') updateCoreComponentsState();
        updateAdaptationCoreComponentDropdowns();
        updateEmptyState(containerId);
        if (Object.keys(data).length === 0) triggerSave();
    }

    // --- Card Flip Logic ---
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
        const validData = config.data.filter(item => item[config.key]);

        if (validData.length > 0) {
            content += `<ul class="card-back-list">${validData.map(item => `<li><a href="#" class="nav-link" data-target="${config.page}">${item[config.key]}</a></li>`).join('')}</ul>`;
        } else {
            content += `<div class="card-back-empty"><p>No ${config.title.toLowerCase()} defined yet.</p><a href="#" class="nav-link add-row-btn" data-target="${config.page}">Add</a></div>`;
        }
        backFace.innerHTML = content;
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

    // --- Event Listeners ---
    document.body.addEventListener('click', e => {
        if (e.target.matches('.add-row-btn')) {
            addRow(e.target.dataset.table);
        }
        if (e.target.matches('.delete-btn')) {
            const row = e.target.closest('tr, .expandable-row, .expandable-card');
            if (row) {
                const container = row.parentElement;
                const containerId = container.id;
                row.remove();
                if (containerId === 'team-members-table-body') updateTeamMembersState();
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

    // --- Data Persistence ---
    function getTableData(id) {
        const container = document.getElementById(id);
        if (!container) return [];
        const rows = container.querySelectorAll('.expandable-row, .expandable-card, tbody tr:not(.no-data-row)');
        return Array.from(rows).map(row => {
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
        allTableIds.forEach(id => data.tables[id] = getTableData(id));
        return data;
    }

    async function savePlan() {
        if (!userId) return;
        const planRef = doc(db, "artifacts", appId, "users", userId, "evaluationPlan", "mainPlan");
        try {
            await setDoc(planRef, { data: JSON.stringify(getPlanData()) });
            console.log("Document successfully saved.");
        } catch (error) {
            console.error("Error saving document: ", error);
        }
    }

    async function loadPlan() {
        const allContainerIds = [
            'team-members-table > tbody', 'determinants-container', 'strategies-container', 'mechanisms-container',
            'risks-container', 'opportunities-container', 'timeline-container',
            'implementation-outcomes-container', 'service-outcomes-container', 'client-outcomes-container',
            'fidelity-plan-container', 'adaptations-container', 'instruments-container', 'glossary-container'
        ];
        allContainerIds.forEach(id => {
            const el = document.querySelector(`#${id}`);
            if (el) el.innerHTML = '';
        });

        if (!userId) {
            console.log("No user ID, initializing empty template.");
            initializeAsTemplate();
            return;
        }

        const planRef = doc(db, "artifacts", appId, "users", userId, "evaluationPlan", "mainPlan");
        const docSnap = await getDoc(planRef);
        let planData;

        if (docSnap.exists() && docSnap.data().data) {
            console.log("Loading data from Firestore...");
            planData = JSON.parse(docSnap.data().data);
        } else {
            console.log("No data in Firestore. Initializing empty template.");
            initializeAsTemplate();
            return;
        }

        if (planData) {
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
        }
        
        Object.keys(planData.tables).forEach(updateEmptyState);
        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
    }
    
    function initializeAsTemplate() {
        document.getElementById('project-name').value = '';
        document.getElementById('primary-goal').value = '';
        document.getElementById('ebp').value = '';

        const allTableIds = [
            'team-members-table', 'determinants-container', 'strategies-container', 'mechanisms-container',
            'risks-container', 'opportunities-container', 'timeline-container',
            'implementation-outcomes-container', 'service-outcomes-container', 'client-outcomes-container',
            'fidelity-plan-container', 'adaptations-container', 'instruments-container'
        ];
        allTableIds.forEach(updateEmptyState);

        updateSidebarTitle();
        updateLandingPageDashboards();
        updateReportVisuals();
        populateGlossary();
        triggerSave();
    }

    function triggerSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            savePlan().then(() => {
                const activeTab = document.querySelector('.nav-link.active')?.dataset.target;
                if (activeTab === 'summary') updateReportVisuals();
                else if (activeTab?.endsWith('-landing')) updateLandingPageDashboards();
            });
        }, 1500);
    }
    
    // --- Authentication and Initial Load ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("User authenticated with UID:", userId);
            await loadPlan();
        } else {
            console.log("No user signed in. Attempting authentication...");
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
                await loadPlan(); 
            }
        }
    });

    initializeFlippableCards();
});
