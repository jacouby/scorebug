const server = window.location.host;
let socket;

function openWebSocket() {
    const socket = new WebSocket(`ws://${server}/ws?client_type=overlay`);

    socket.onopen = function (event) {
        console.log("WebSocket is open now.");
    };

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            updatePage(data);
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    };

    socket.onclose = function (event) {
        console.log('WebSocket closed:', event);
        console.log(`WebSocket closed with error code ${event.code}. Reconnecting...`);
        setTimeout(openWebSocket, 5000);
    };

    socket.onerror = function (error) {
        console.error("WebSocket error observed:", error);
        socket.close();
    };
}

openWebSocket();

socket.onopen = function (event) {
    console.log("WebSocket is open now.");
};

socket.onmessage = function (event) {
    try {
        const data = JSON.parse(event.data);
        if (data.command === "banner" || data.command === "persistent_banner") {
            showBanner(data);
        } else if (data.command === "popup" || data.command === "persistent_popup") {
            showPopup(data);
        } else if (data.command === "remove_banner") {
            forceRemoveBanner();
        } else if (data.command === "remove_popup") {
            forceRemovePopup();
        } else {
            updatePage(data);
        }
    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
};

socket.onclose = function (event) {
    console.log("WebSocket is closed now.");
};

function updatePage(data) {
    document.documentElement.style.setProperty('--home-color', data.home.color);
    document.documentElement.style.setProperty('--away-color', data.away.color);
    
    document.querySelector('.gameTime').textContent = data.time.gameTime;

    updateTeamSection(data.home, 'home');
    updateTeamSection(data.away, 'away');
}

function updateTeamSection(teamData, team) {
    const teamName = document.querySelector(`.${team}Team .teamName`);
    const teamSubtext = document.querySelector(`.${team}Team .teamSubtext`);
    const teamScore = document.querySelector(`.score${team.charAt(0).toUpperCase() + team.slice(1)}`);
    const teamLogo = document.getElementById(`${team}Logo`);
    
    teamName.textContent = teamData.name;
    teamSubtext.textContent = teamData.subtext;
    teamScore.textContent = teamData.score;
    const teamElement = document.querySelector(`.${team}Team`);
    teamElement.style.backgroundColor = teamData.color;

    if (teamData.logo) {
        teamLogo.src = `data:image/png;base64,${teamData.logo}`;
        teamLogo.style.display = 'block';
    } else {
        teamLogo.style.display = 'none';
    }
}

function showBanner(data) {
    const banner = document.getElementById('banner');
    const bannerText = document.getElementById('bannerText');
    bannerText.textContent = data.text;
    banner.style.backgroundColor = data.bgColor;
    bannerText.style.color = data.textColor;
    banner.style.display = 'block';
    banner.classList.remove('slide-in', 'slide-out');
    void banner.offsetWidth;
    banner.classList.add('slide-in');

    if (data.command !== "persistent_banner") {
        setTimeout(() => {
            banner.classList.remove('slide-in');
            banner.classList.add('slide-out');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 1500)
        }, data.duration || 10000); // Use the duration from data or default to 10 seconds
    }
}

function forceRemoveBanner(data) {
    banner.classList.remove('slide-in');
    banner.classList.add('slide-out');
    setTimeout(() => {
        banner.style.display = 'none';
    }, 1500)
}

function showPopup(data) {
    const popup = document.getElementById('popup');
    const popupText = document.getElementById('popupText');
    const overlayContainer = document.querySelector(".overlay-container")

    popupText.textContent = data.text;
    popup.style.backgroundColor = data.bgColor;
    popupText.style.color = data.textColor;
    
    // Remove existing classes
    popup.classList.remove('home', 'away', 'slide-up', 'slide-down');
    
    // Add team-specific class
    popup.classList.add(data.team);
    
    popup.style.display = 'block';
    void popup.offsetWidth; // Force reflow
    popup.classList.add('slide-up');

    setTimeout(() => {
                if (data.team == 'away') {
                    overlayContainer.classList.add('leftPop')
                } else {
                    overlayContainer.classList.add('rightPop')
                }
            }, 250);

    if (data.command !== "persistent_popup") {
        
        setTimeout(() => {
            popup.classList.remove('slide-up');
            popup.classList.add('slide-down');
            overlayContainer.classList.remove("rightPop", "leftPop")
            setTimeout(() => {
                popup.style.display = 'none';
                console.log("Popup Removed")
            }, 500);
        }, data.duration || 10000);
    }
}

function forceRemovePopup() {
    const overlayContainer = document.querySelector(".overlay-container")
    const popup = document.getElementById('popup');
    
    popup.classList.remove('slide-up');
    popup.classList.add('slide-down');
    overlayContainer.classList.remove("rightPop", "leftPop")
    setTimeout(() => {
        popup.style.display = 'none';
        console.log("Popup Removed")
    }, 500);
}
