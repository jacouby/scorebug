const server = window.location.host;
const socket = new WebSocket(`ws://${server}/ws?client_type=control`);

socket.onclose = handleSocketClose;
socket.onopen = () => console.log("WebSocket is open now.");
socket.onmessage = handleSocketMessage;

let activePopup = null;
let presets = [];

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
    const elements = {
        gameTime: 'gameTime',
        homeName: 'homeName',
        homeSubtext: 'homeSubtext',
        homeScore: 'homeScore',
        homeColor: 'homeColor',
        awayName: 'awayName',
        awaySubtext: 'awaySubtext',
        awayScore: 'awayScore',
        awayColor: 'awayColor',
        homeBorder: 'homeBorder',
        awayBorder: 'awayBorder'
    };

    Object.keys(elements).forEach(key => {
        const element = document.getElementById(elements[key]);
        if (element) {
            element.value = data[key] || element.value;
            if (key.includes('Color')) {
                element.style.borderColor = data[key];
            }
        }
    });

    updateTeamColors(data.home.color, data.away.color);
    updateScoreHeaders(data);
}

function updateScoreHeaders(data) {
    document.querySelector('.quick-actions-group.scoreHome h3').textContent = `Home Score (${data.home.name} ${data.home.subtext})`;
    document.querySelector('.quick-actions-group.scoreAway h3').textContent = `Away Score (${data.away.name} ${data.away.subtext})`;
}

function sendData() {
    const data = gatherData();
    updateTeamColors(data.home.color, data.away.color);
    socket.send(JSON.stringify(data));
}

function gatherData() {
    return {
        time: {
            activated: true,
            gameTime: document.getElementById('gameTime').value
        },
        home: {
            name: document.getElementById('homeName').value,
            subtext: document.getElementById('homeSubtext').value,
            score: parseInt(document.getElementById('homeScore').value, 10),
            color: document.getElementById('homeColor').value
        },
        away: {
            name: document.getElementById('awayName').value,
            subtext: document.getElementById('awaySubtext').value,
            score: parseInt(document.getElementById('awayScore').value, 10),
            color: document.getElementById('awayColor').value
        }
    };
}

function resetData() {
    socket.send(JSON.stringify({ command: "reset" }));
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

function updateScore(team, value) {
    const scoreElement = document.getElementById(`${team}Score`);
    let currentScore = parseInt(scoreElement.value, 10);
    currentScore = Math.max(0, currentScore + value);
    scoreElement.value = currentScore;
    sendData();
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