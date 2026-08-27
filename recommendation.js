const addBtn = document.getElementById("addBtn");
const usersContainer = document.getElementById("usersContainer");

// Variables to keep track of what we are currently clicking on
let currentKey = null;
let currentIndex = null;
let currentAnime = null;

document.addEventListener("DOMContentLoaded", loadRecommendations);
addBtn.addEventListener("click", addRecommendation);

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

async function addRecommendation() {
    const rawUserName = document.getElementById("userName").value.trim();
    const animeName = document.getElementById("animeName").value.trim();

    if (!rawUserName || !animeName) {
        alert("Please enter your name and anime title!");
        return;
    }

    const userKey = rawUserName.toLowerCase();

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(animeName)}&limit=1`);

        if (response.status === 429) {
            alert("Slow down! The database needs a 1-second break.");
            return;
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            alert("Anime not found!");
            return;
        }

        const anime = data.data[0];
        const animeData = {
            title: anime.title,
            image: anime.images.jpg.image_url,
            link: anime.url,
        };

        let allRecs = JSON.parse(localStorage.getItem("userRecommendations")) || {};

        if (!allRecs[userKey] || Array.isArray(allRecs[userKey])) {
            allRecs[userKey] = {
                displayName: rawUserName,
                list: [],
            };
        }

        allRecs[userKey].list.push(animeData);
        localStorage.setItem("userRecommendations", JSON.stringify(allRecs));

        displayRecommendations();

        document.getElementById("userName").value = "";
        document.getElementById("animeName").value = "";
    } catch (error) {
        console.error("Error details:", error);
        alert("Connection lost. Please check your internet!");
    }
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