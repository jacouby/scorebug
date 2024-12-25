const server = window.location.host;
const socket = new WebSocket(`ws://${server}/ws?client_type=control`);

socket.onclose = handleSocketClose;
socket.onopen = () => console.log("WebSocket is open now.");
socket.onmessage = handleSocketMessage;

let activePopup = null;
let presets = [];

async function fetchEndpoint(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updatePresetButtons();
    updateScoreButtons();
});

function handleSocketClose(event) {
    console.log('WebSocket closed:', event);
    console.log(`WebSocket closed with error code ${event.code}. Reconnecting...`);
    setTimeout(openWebSocket, 5000);
}

function handleSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.time && typeof data.time.activated === 'boolean') {
            updatePage(data);
        } else {
            handleNonStateInfo(data);
        }
    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
}

function handleNonStateInfo(data) {
    console.log('Non State Info');
    if (data.status && data.message.includes('popup')) {
        console.log('popup successfully sent');
    }
}

function updatePage(data) {
    const mappings = {
        'gameTime': 'time.gameTime',
        'homeName': 'home.name',
        'homeSubtext': 'home.subtext',
        'homeScore': 'home.score',
        'homeColor': 'home.color',
        'awayName': 'away.name',
        'awaySubtext': 'away.subtext',
        'awayScore': 'away.score',
        'awayColor': 'away.color'
    };

    for (const [id, path] of Object.entries(mappings)) {
        const value = path.split('.').reduce((obj, key) => obj && obj[key], data);
        if (value !== undefined) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        }
    }

    // Update border colors
    const homeColor = data.home.color;
    const awayColor = data.away.color;
    document.getElementById('homeBorder').style.borderColor = homeColor;
    document.getElementById('awayBorder').style.borderColor = awayColor;

    // Call additional functions
    updateTeamColors(homeColor, awayColor);

    // Update quick action headers
    const homeHeader = document.querySelector('.quick-actions-group.scoreHome h3');
    const awayHeader = document.querySelector('.quick-actions-group.scoreAway h3');
    if (homeHeader) {
        homeHeader.textContent = `Home Score (${data.home.name} ${data.home.subtext})`;
    }
    if (awayHeader) {
        awayHeader.textContent = `Away Score (${data.away.name} ${data.away.subtext})`;
    }
}

async function sendData() {
    const currentState = await fetchEndpoint('/state');
    if (!currentState) return;

    // Check for changes in game time
    const newGameTime = document.getElementById('gameTime').value;
    if (newGameTime !== currentState.time.gameTime) {
        // TODO: Add endpoint for game time updates
        currentState.time.gameTime = newGameTime;
    }

    // Check for changes in home team
    const homeChanges = await checkTeamChanges('home', currentState.home);
    const awayChanges = await checkTeamChanges('away', currentState.away);

    // Update the UI with the latest state
    updatePage(currentState);
}

async function checkTeamChanges(team, currentTeamState) {
    const nameElem = document.getElementById(`${team}Name`);
    const subtextElem = document.getElementById(`${team}Subtext`);
    const scoreElem = document.getElementById(`${team}Score`);
    const colorElem = document.getElementById(`${team}Color`);

    // Check and update name if changed
    if (nameElem.value !== currentTeamState.name) {
        await updateTeamName(team);
    }

    // Check and update subtext if changed
    if (subtextElem.value !== currentTeamState.subtext) {
        await updateTeamSubtext(team);
    }

    // Check and update score if changed
    const newScore = parseInt(scoreElem.value);
    if (newScore !== currentTeamState.score) {
        const scoreDiff = newScore - currentTeamState.score;
        await updateScore(team, scoreDiff);
    }

    // Check and update color if changed
    if (colorElem.value !== currentTeamState.color) {
        await updateTeamColor(team);
    }
}

// Add new function for subtext updates
async function updateTeamSubtext(team) {
    const newSubtext = document.getElementById(`${team}Subtext`).value;
    await fetchEndpoint(`/${team}/subtext?change=true&subtext=${encodeURIComponent(newSubtext)}`);
}

async function gatherData() {
    const state = await fetchEndpoint('/state');
    if (!state) return null;
    
    return {
        time: {
            activated: true,
            gameTime: document.getElementById('gameTime').value
        },
        home: state.home,
        away: state.away
    };
}

function resetData() {
    fetchEndpoint('/reset')
}

function sendBannerData() {
    const bannerData = {
        command: "banner",
        text: document.getElementById('bannerText').value,
        bgColor: document.getElementById('bannerBgColor').value,
        textColor: document.getElementById('bannerTextColor').value,
        duration: parseInt(document.getElementById('bannerDuration').value, 10) * 1000
    };
    socket.send(JSON.stringify(bannerData));
}

function setBannerBgColor(team) {
    const color = document.getElementById(`${team}Color`).value;
    document.getElementById('bannerBgColor').value = color;
}

function sendPersistentBanner() {
    const bannerData = {
        command: "persistent_banner",
        text: document.getElementById('bannerText').value,
        bgColor: document.getElementById('bannerBgColor').value,
        textColor: document.getElementById('bannerTextColor').value
    };
    socket.send(JSON.stringify(bannerData));
}

function removeBanner() {
    socket.send(JSON.stringify({ command: "remove_banner" }));
}

function updateTeamColors(homeColor, awayColor) {
    document.documentElement.style.setProperty('--home-color', homeColor);
    document.documentElement.style.setProperty('--away-color', awayColor);
}

function sendPopupData() {
    if (activePopup) {
        alert("A popup is already active. Please remove it first.");
        return;
    }

    const popupData = gatherPopupData("popup");
    activePopup = popupData;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

function sendPersistentPopup() {
    if (activePopup) {
        alert("A popup is already active. Please remove it first.");
        return;
    }

    const popupData = gatherPopupData("persistent_popup");
    activePopup = popupData;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

function gatherPopupData(command) {
    return {
        command,
        text: document.getElementById('popupText').value,
        team: document.getElementById('popupTeam').value,
        bgColor: document.getElementById('popupBgColor').value,
        textColor: document.getElementById('popupTextColor').value,
        duration: command === "popup" ? parseInt(document.getElementById('popupDuration').value, 10) * 1000 : undefined
    };
}

function removePopup() {
    socket.send(JSON.stringify({ command: "remove_popup" }));
    activePopup = null;
    updateActivePopupsList();
}

function updateActivePopupsList() {
    const listDiv = document.getElementById('activePopupsList');
    listDiv.innerHTML = activePopup ? `
        <div class="active-popup-item">
            <span>${activePopup.text}</span>
            <span>(${activePopup.team} team)</span>
        </div>
    ` : 'No active popups';
}

function quickAction(action) {
    const currentData = gatherData();
    updateScore(action, currentData);
    updatePage(currentData);
    socket.send(JSON.stringify(currentData));
}

function updateScore(action, data) {
    switch (action) {
        case 'homeScoreUp':
            data.home.score++;
            break;
        case 'homeScoreDown':
            data.home.score = Math.max(0, data.home.score - 1);
            break;
        case 'awayScoreUp':
            data.away.score++;
            break;
        case 'awayScoreDown':
            data.away.score = Math.max(0, data.away.score - 1);
            break;
    }
}

function saveNewPreset() {
    const name = prompt("Enter preset name:");
    if (!name) return;

    const preset = { name, data: gatherData() };
    presets.push(preset);
    updatePresetButtons();
}

function updatePresetButtons() {
    const container = document.getElementById('presetButtons');
    container.innerHTML = '';

    presets.forEach((preset, index) => {
        const button = document.createElement('button');
        button.className = 'quick-button';
        button.style.backgroundColor = '#4B5563';
        button.textContent = preset.name;
        button.onclick = () => loadPreset(index);
        container.appendChild(button);
    });
}

function loadPreset(index) {
    const preset = presets[index];
    updatePage(preset.data);
    socket.send(JSON.stringify(preset.data));
}

function savePresetsToFile() {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'scorebug_presets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function loadPresetsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
            try {
                presets = JSON.parse(event.target.result);
                updatePresetButtons();
            } catch (err) {
                alert('Error loading presets file');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function updateScoreButtons() {
    const sport = document.getElementById('sportType').value;
    const homeScores = document.getElementById('homeScoreButtons');
    const homeFlags = document.querySelector('.quickPopup.home');
    const awayScores = document.getElementById('awayScoreButtons');
    const awayFlags = document.querySelector('.quickPopup.away');

    const buttons = getButtonsForSport(sport);

    updateButtons(homeScores, homeFlags, buttons, 'home');
    updateButtons(awayScores, awayFlags, buttons, 'away');
}

function getButtonsForSport(sport) {
    const sportsConfig = {
        football: {
            scoreButtons: [
                { value: 1, label: '+1 (PAT)', banner: true },
                { value: 2, label: '+2 (Conv)', banner: true },
                { value: 3, label: '+3 (FG)', banner: true },
                { value: 6, label: '+6 (TD)', banner: true },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false },
                { value: -6, label: '-6', banner: false }
            ],
            flagButtons: [
                { label: 'Penalty', color: '#FFD700' },
                { label: 'Challenge', color: '#FF0000' },
                { label: 'Timeout', color: '#FFA500' }
            ]
        },
        basketball: {
            scoreButtons: [
                { value: 1, label: '+1 (FT)', banner: true },
                { value: 2, label: '+2', banner: true },
                { value: 3, label: '+3', banner: true },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false }
            ],
            flagButtons: [
                { label: 'Foul', color: '#FFD700' },
                { label: 'Timeout', color: '#FFA500' },
                { label: 'Shot Clock', color: '#FF0000' }
            ]
        },
        default: {
            scoreButtons: [
                { value: 1, label: '+1', banner: false },
                { value: 2, label: '+2', banner: false },
                { value: 3, label: '+3', banner: false },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false }
            ],
            flagButtons: [
                { label: 'Timeout', color: '#FFA500' },
                { label: 'Foul', color: '#FFD700' }
            ]
        }
    };

    return sportsConfig[sport] || sportsConfig.default;
}

function updateButtons(scoreContainer, flagContainer, buttons, team) {
    scoreContainer.innerHTML = buttons.scoreButtons.map(btn => `
        <div class="score-button-group">
            <button onclick="updateScore('${team}', ${btn.value})" class="quick-button score-button ${team}-color">
                ${btn.label}
            </button>
            ${btn.banner && btn.value > 0 ? `
                <button onclick="sendScoreBanner('${team}', ${btn.value})" class="quick-button banner-button ${team}-color">
                    🔔
                </button>
            ` : ''}
        </div>
    `).join('');

    flagContainer.innerHTML = buttons.flagButtons.map(btn => `
        <button onclick="sendQuickPopup('${team}', '${btn.label}')" 
                class="quick-button score-button"
                style="background-color: ${btn.color}">
            🚩 ${btn.label}
        </button>
    `).join('');
}

async function updateScore(team, value) {
    const response = await fetchEndpoint(`/${team}/score?value=${value}`);
    if (response) {
        document.getElementById(`${team}Score`).value = response.score;
    }
}

function sendScoreBanner(team, points) {
    const teamData = getTeamData(team);
    const bannerText = getBannerText(points);
    const displayName = getDisplayName(teamData);

    const bannerData = {
        command: "banner",
        text: `${displayName} ${bannerText}!`,
        bgColor: teamData.color,
        textColor: "#ffffff",
        duration: 5000
    };

    socket.send(JSON.stringify(bannerData));
}

function getTeamData(team) {
    return {
        name: document.getElementById(`${team}Name`).value,
        subtext: document.getElementById(`${team}Subtext`).value,
        color: document.getElementById(`${team}Color`).value
    };
}

function getBannerText(points) {
    const bannerTexts = {
        1: 'Extra Point',
        2: '2-Point Conversion',
        3: 'Field Goal',
        6: 'Touchdown'
    };
    return bannerTexts[points] || `${points} Points`;
}

function getDisplayName(teamData) {
    const nameType = document.getElementById('bannerNameType').value;
    return nameType === 'main' ? teamData.name :
        nameType === 'sub' ? teamData.subtext :
            `${teamData.name} ${teamData.subtext}`;
}

function sendQuickPopup(team, flagType) {
    const teamData = getTeamData(team);
    const displayName = getDisplayName(teamData);

    const popupData = {
        command: "persistent_popup",
        text: `${flagType}`,
        team,
        bgColor: "#00000",
        textColor: teamData.color
    };

    activePopup = popupData;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

async function updateTeamName(team) {
    const newName = document.getElementById(`${team}Name`).value;
    await fetchEndpoint(`/${team}/name?change=true&name=${encodeURIComponent(newName)}`);
}

async function updateTeamColor(team) {
    const newColor = document.getElementById(`${team}Color`).value;
    await fetchEndpoint(`/${team}/color?change=true&hex=${encodeURIComponent(newColor)}`);
}