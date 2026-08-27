const addBtn = document.getElementById("addBtn");
const usersContainer = document.getElementById("usersContainer");

// This is the Netlify Function acting as our backend API
const API_URL = "/.netlify/functions/recommendations";

let currentId = null;
let currentAnime = null;

document.addEventListener("DOMContentLoaded", loadRecommendations);
addBtn.addEventListener("click", addRecommendation);

// Let users press Enter in either field instead of always clicking "Add"
document.getElementById("userName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addRecommendation();
});
document.getElementById("animeName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addRecommendation();
});

// --- MODAL CONTROL (admin-only: confirming a delete) ---

function closeRemoveModal() {
    document.getElementById('removeModal').style.display = "none";
}

document.getElementById('confirmRemove').onclick = () => {
    removeSingle(currentId);
    closeRemoveModal();
};

// --- CORE RECOMMENDATION LOGIC ---

const ANILIST_URL = 'https://graphql.anilist.co';
const MAX_RESULTS = 6;

const SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: ${MAX_RESULTS}) {
    media(search: $search, type: ANIME, isAdult: false) {
      title {
        romaji
        english
      }
      coverImage {
        large
      }
      siteUrl
    }
  }
}
`;

const searchResultsBox = document.getElementById("searchResults");
const searchHint = document.getElementById("searchHint");

async function addRecommendation() {
    const rawUserName = document.getElementById("userName").value.trim();
    const animeName = document.getElementById("animeName").value.trim();

    if (!rawUserName || !animeName) {
        alert("Please enter your name and anime title!");
        return;
    }

    searchResultsBox.innerHTML = "";
    searchHint.textContent = "";

    const originalBtnText = addBtn.textContent;
    addBtn.textContent = "Searching...";
    addBtn.disabled = true;

    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: SEARCH_QUERY,
                variables: { search: animeName },
            }),
        });

        if (response.status === 429) {
            alert("Slow down! The database needs a moment to breathe.");
            return;
        }

        if (response.status >= 500) {
            alert("The anime database seems to be down right now. Please try again in a bit!");
            return;
        }

        const json = await response.json();
        const results = json.data?.Page?.media || [];

        if (results.length === 0) {
            searchHint.textContent = "No matches found. Try a different spelling!";
            return;
        }

        searchHint.textContent = "Which one did you mean? Click a card to add it.";
        renderSearchResults(results, rawUserName);
    } catch (error) {
        console.error("Error details:", error);
        alert("Connection lost. Please check your internet!");
    } finally {
        addBtn.textContent = originalBtnText;
        addBtn.disabled = false;
    }
}

function renderSearchResults(results, rawUserName) {
    searchResultsBox.innerHTML = "";
    results.forEach(anime => {
        const title = anime.title.english || anime.title.romaji;
        const card = document.createElement("div");
        card.classList.add("anime-card");
        card.innerHTML = `
            <img src="${anime.coverImage.large}" alt="${title}">
            <div class="overlay"><a>${title}</a></div>
        `;
        card.onclick = () => confirmAndAddRecommendation({
            title,
            image: anime.coverImage.large,
            link: anime.siteUrl,
        }, rawUserName);
        searchResultsBox.appendChild(card);
    });
}

// Anyone can do this — no passcode needed to add
async function confirmAndAddRecommendation(animeData, rawUserName) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: rawUserName,
                animeTitle: animeData.title,
                animeImage: animeData.image,
                animeLink: animeData.link,
            }),
        });

        if (response.status === 409) {
            alert(`${animeData.title} is already on ${rawUserName}'s list!`);
            return;
        }

        if (!response.ok) {
            alert("Couldn't save that recommendation. Please try again.");
            return;
        }

        await loadRecommendations();

        searchResultsBox.innerHTML = "";
        searchHint.textContent = "";
        document.getElementById("animeName").value = "";
    } catch (error) {
        console.error("Error saving recommendation:", error);
        alert("Connection lost. Please check your internet!");
    }
}

// Pulls every recommendation from the shared database and groups it by person
async function displayRecommendations() {
    usersContainer.innerHTML = "<p style='text-align:center; color:#999;'>Loading recommendations...</p>";

    let allRows = [];
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch");
        allRows = await response.json();
    } catch (error) {
        console.error("Error loading recommendations:", error);
        usersContainer.innerHTML = "<p style='text-align:center; color:#999;'>Couldn't load recommendations right now. Try refreshing the page.</p>";
        return;
    }

    usersContainer.innerHTML = "";

    if (allRows.length === 0) {
        usersContainer.innerHTML = "<p style='text-align:center; color:#999;'>No recommendations yet — be the first!</p>";
        return;
    }

    const grouped = {};
    allRows.forEach(row => {
        const key = row.user_name.toLowerCase();
        if (!grouped[key]) {
            grouped[key] = { displayName: row.user_name, list: [] };
        }
        grouped[key].list.push({
            id: row.id,
            title: row.anime_title,
            image: row.anime_image,
            link: row.anime_link,
        });
    });

    const adminMode = isAdmin(); // from main.js

    for (const key in grouped) {
        const userData = grouped[key];

        const categoryTitle = document.createElement("div");
        categoryTitle.classList.add("user-category");
        categoryTitle.textContent = userData.displayName;
        usersContainer.appendChild(categoryTitle);

        const userDiv = document.createElement("div");
        userDiv.classList.add("scroll-container");
        usersContainer.appendChild(userDiv);

        userData.list.forEach(anime => {
            const card = document.createElement("div");
            card.classList.add("anime-card");

            // Only admins can click a card to delete it — everyone else just views
            if (adminMode) {
                card.style.cursor = "pointer";
                card.onclick = () => requestDelete(anime);
            } else {
                card.style.cursor = "default";
            }

            card.innerHTML = `
                <img src="${anime.image}" alt="${anime.title}">
                <div class="overlay">
                    <a>${anime.title}</a>
                </div>
            `;
            userDiv.appendChild(card);
        });
    }
}

function requestDelete(anime) {
    currentId = anime.id;
    currentAnime = anime;
    document.getElementById('removeText').innerText = `Are you sure you want to remove "${anime.title}"?`;
    document.getElementById('removeModal').style.display = "flex";
}

async function removeSingle(id) {
    const passcode = sessionStorage.getItem("adminPasscode");

    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, passcode }),
        });

        if (response.status === 403) {
            alert("Your admin session isn't valid. Please log in again.");
            return;
        }

        if (!response.ok) {
            alert("Couldn't remove that recommendation. Please try again.");
            return;
        }

        displayRecommendations();
    } catch (error) {
        console.error("Error removing recommendation:", error);
        alert("Connection lost. Please check your internet!");
    }
}

function loadRecommendations() {
    return displayRecommendations();
}

// Close modal if clicking the dark background
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeRemoveModal();
    }
};