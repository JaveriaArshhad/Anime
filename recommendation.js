const addBtn = document.getElementById("addBtn");
const usersContainer = document.getElementById("usersContainer");

// This is the Netlify Function acting as our backend API
const API_URL = "/.netlify/functions/recommendations";

let currentId = null;
let currentAnime = null;

// --- Track which recommendations THIS browser submitted, so the person
// can undo their own mistake (e.g. picked the wrong anime) without
// needing the admin passcode. Stored as { [id]: ownerToken }.
function getMyRecommendations() {
    try {
        return JSON.parse(localStorage.getItem("myRecommendationTokens")) || {};
    } catch {
        return {};
    }
}

function rememberMyRecommendation(id, ownerToken) {
    const mine = getMyRecommendations();
    mine[id] = ownerToken;
    localStorage.setItem("myRecommendationTokens", JSON.stringify(mine));
}

document.addEventListener("DOMContentLoaded", loadRecommendations);
addBtn.addEventListener("click", addRecommendation);

// Let users press Enter in either field instead of always clicking "Add"
document.getElementById("userName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addRecommendation();
});
document.getElementById("animeName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addRecommendation();
});

// --- MODAL CONTROL (admin-only) ---

function openOptionsModal(anime) {
    currentAnime = anime;
    currentId = anime.id;
    document.getElementById('optionsTitle').innerText = anime.title;
    document.getElementById('wishlistStatusText').textContent = "";
    document.getElementById('optionsModal').style.display = "flex";
}

function closeOptionsModal() {
    document.getElementById('optionsModal').style.display = "none";
}

function closeRemoveModal() {
    document.getElementById('removeModal').style.display = "none";
}

document.getElementById('requestDeleteBtn').onclick = () => {
    closeOptionsModal();
    document.getElementById('removeText').innerText = `Are you sure you want to remove "${currentAnime.title}"?`;
    document.getElementById('removeModal').style.display = "flex";
};

document.getElementById('confirmRemove').onclick = () => {
    removeSingle(currentId);
    closeRemoveModal();
};

document.getElementById('addWishlistBtn').onclick = async () => {
    const passcode = sessionStorage.getItem("adminPasscode");
    const statusText = document.getElementById('wishlistStatusText');
    const btn = document.getElementById('addWishlistBtn');
    const originalText = btn.textContent;
    btn.textContent = "Adding...";
    btn.disabled = true;

    try {
        const response = await fetch("/.netlify/functions/wishlist", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                animeTitle: currentAnime.title,
                animeImage: currentAnime.image,
                animeLink: currentAnime.link,
                passcode,
            }),
        });

        if (response.status === 409) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = "Already on the wishlist!";
            return;
        }
        if (response.status === 403) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = "Your admin session isn't valid. Please log in again.";
            return;
        }
        if (!response.ok) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = "Couldn't add it. Please try again.";
            return;
        }

        statusText.style.color = "#2f6b2f";
        statusText.textContent = `✨ ${currentAnime.title} added to your wishlist!`;
        setTimeout(closeOptionsModal, 900);
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        statusText.style.color = "#e06c8a";
        statusText.textContent = "Connection lost. Please check your internet!";
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
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
    const typedName = document.getElementById("userName").value.trim();
    const rawUserName = typedName || "Anonymous";
    const animeName = document.getElementById("animeName").value.trim();

    if (!animeName) {
        alert("Please enter an anime title!");
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
                website: document.getElementById("website")?.value || "",
            }),
        });

        if (response.status === 409) {
            alert(`${animeData.title} is already on ${rawUserName}'s list!`);
            return;
        }

        if (response.status === 429) {
            alert("You're adding recommendations too fast! Please wait a few minutes.");
            return;
        }

        if (!response.ok) {
            alert("Couldn't save that recommendation. Please try again.");
            return;
        }

        const result = await response.json();
        if (result.id && result.ownerToken) {
            rememberMyRecommendation(result.id, result.ownerToken);
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
    const myRecs = getMyRecommendations();

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
            card.style.position = "relative";

            const isOwnedByMe = myRecs.hasOwnProperty(anime.id);
            const canManage = adminMode || isOwnedByMe;

            if (adminMode) {
                // Admin gets full options: add to wishlist or remove
                card.style.cursor = "pointer";
                card.onclick = () => openOptionsModal(anime);
            } else if (isOwnedByMe) {
                // The original submitter can remove just their own mistake
                card.style.cursor = "pointer";
                card.onclick = () => requestOwnerRemove(anime, myRecs[anime.id]);
            } else {
                card.style.cursor = "default";
            }

            card.innerHTML = `
                <img src="${anime.image}" alt="${anime.title}">
                <div class="overlay">
                    <a>${anime.title}</a>
                </div>
            `;

            if (canManage) {
                const deleteBadge = document.createElement("span");
                deleteBadge.textContent = "🗑";
                deleteBadge.title = adminMode ? "Manage this recommendation" : "Remove your recommendation";
                deleteBadge.style.cssText = "position:absolute; top:6px; right:8px; z-index:5; cursor:pointer; background:rgba(255,255,255,0.85); border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:0.9em;";
                deleteBadge.onclick = (e) => {
                    e.stopPropagation();
                    if (adminMode) {
                        openOptionsModal(anime);
                    } else {
                        requestOwnerRemove(anime, myRecs[anime.id]);
                    }
                };
                card.appendChild(deleteBadge);
            }

            userDiv.appendChild(card);
        });
    }
}

// A non-admin owner removing their own accidental submission
function requestOwnerRemove(anime, ownerToken) {
    currentId = anime.id;
    currentAnime = { ...anime, ownerToken };
    document.getElementById('removeText').innerText = `Remove your recommendation "${anime.title}"?`;
    document.getElementById('removeModal').style.display = "flex";
}

async function removeSingle(id) {
    const passcode = sessionStorage.getItem("adminPasscode");
    const ownerToken = currentAnime?.ownerToken || null;

    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, passcode, ownerToken }),
        });

        if (response.status === 403) {
            alert("You're not able to remove this recommendation.");
            return;
        }

        if (!response.ok) {
            alert("Couldn't remove that recommendation. Please try again.");
            return;
        }

        // If this was a self-delete, forget the token too
        const myRecs = getMyRecommendations();
        if (myRecs[id]) {
            delete myRecs[id];
            localStorage.setItem("myRecommendationTokens", JSON.stringify(myRecs));
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

// Close modals if clicking the dark background
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeOptionsModal();
        closeRemoveModal();
    }
};