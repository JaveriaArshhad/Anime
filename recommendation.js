const addBtn = document.getElementById("addBtn");
const usersContainer = document.getElementById("usersContainer");

// Variables to keep track of what we are currently clicking on
let currentKey = null;
let currentIndex = null;
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

// --- MODAL CONTROL FUNCTIONS ---

function openOptionsModal(key, index, anime) {
    currentKey = key;
    currentIndex = index;
    currentAnime = anime;
    document.getElementById('optionsTitle').innerText = anime.title;
    document.getElementById('optionsModal').style.display = "flex";
}

function closeOptionsModal() {
    document.getElementById('optionsModal').style.display = "none";
}

function closeRemoveModal() {
    document.getElementById('removeModal').style.display = "none";
}

// When "Remove" is clicked in the FIRST (stacked) modal
document.getElementById('requestDeleteBtn').onclick = () => {
    closeOptionsModal();
    document.getElementById('removeText').innerText = `Are you sure you want to remove "${currentAnime.title}"?`;
    document.getElementById('removeModal').style.display = "flex";
};

// When "Yes, Remove" is clicked in the SECOND (horizontal) modal
document.getElementById('confirmRemove').onclick = () => {
    removeSingle(currentKey, currentIndex);
    closeRemoveModal();
};

// Bonus: Add to Wishlist logic for the first modal
document.getElementById('addWishlistBtn').onclick = () => {
    let wishlist = JSON.parse(localStorage.getItem("myWishlist")) || [];
    wishlist.push(currentAnime);
    localStorage.setItem("myWishlist", JSON.stringify(wishlist));
    
    alert(`✨ ${currentAnime.title} added to your wishlist!`);
    closeOptionsModal();
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

    // Show a loading state so users know something is happening during the API call
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

function confirmAndAddRecommendation(animeData, rawUserName) {
    const userKey = rawUserName.toLowerCase();
    let allRecs = JSON.parse(localStorage.getItem("userRecommendations")) || {};

    if (!allRecs[userKey] || Array.isArray(allRecs[userKey])) {
        allRecs[userKey] = {
            displayName: rawUserName,
            list: [],
        };
    }

    // Don't add the same anime twice to the same user's list
    const alreadyAdded = allRecs[userKey].list.some(
        item => item.title.toLowerCase() === animeData.title.toLowerCase()
    );
    if (alreadyAdded) {
        alert(`${animeData.title} is already on ${rawUserName}'s list!`);
        return;
    }

    allRecs[userKey].list.push(animeData);
    localStorage.setItem("userRecommendations", JSON.stringify(allRecs));

    displayRecommendations();

    // Clear the search UI and the anime field, but keep the name filled in
    // in case they want to add another anime for the same person right after
    searchResultsBox.innerHTML = "";
    searchHint.textContent = "";
    document.getElementById("animeName").value = "";
}

function displayRecommendations() {
    usersContainer.innerHTML = "";
    const allRecs = JSON.parse(localStorage.getItem("userRecommendations")) || {};

    for (const key in allRecs) {
        const userData = allRecs[key];
        if (!userData.list || userData.list.length === 0) continue;

        const categoryTitle = document.createElement("div");
        categoryTitle.classList.add("user-category");
        categoryTitle.textContent = userData.displayName;
        categoryTitle.addEventListener("dblclick", () => deleteUser(key));
        usersContainer.appendChild(categoryTitle);

        const userDiv = document.createElement("div");
        userDiv.classList.add("scroll-container");
        usersContainer.appendChild(userDiv);

        userData.list.forEach((anime, index) => {
            const card = document.createElement("div");
            card.classList.add("anime-card"); // Now matches your other pages

            // Clicking the card opens the options stack
            card.onclick = () => openOptionsModal(key, index, anime);

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

function removeSingle(key, index) {
    let allRecs = JSON.parse(localStorage.getItem("userRecommendations"));
    allRecs[key].list.splice(index, 1);
    if (allRecs[key].list.length === 0) delete allRecs[key];
    localStorage.setItem("userRecommendations", JSON.stringify(allRecs));
    displayRecommendations();
}

function deleteUser(key) {
    if (confirm(`Delete this user's entire list?`)) {
        let allRecs = JSON.parse(localStorage.getItem("userRecommendations"));
        delete allRecs[key];
        localStorage.setItem("userRecommendations", JSON.stringify(allRecs));
        displayRecommendations();
    }
}

function loadRecommendations() {
    displayRecommendations();
}

// Close modals if clicking the dark background
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeOptionsModal();
        closeRemoveModal();
    }
};