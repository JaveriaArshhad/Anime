const API_URL = "/.netlify/functions/wishlist";

let currentId = null;
let currentTitle = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
    if (isAdmin()) { // from main.js
        document.getElementById('adminAddBox').style.display = 'block';
    }
});

async function loadWishlist() {
    const wishlistGrid = document.getElementById('wishlistGrid');
    wishlistGrid.innerHTML = "<p style='text-align:center; color:#999; width:100%;'>Loading...</p>";

    let items = [];
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch");
        items = await response.json();
    } catch (error) {
        console.error("Error loading wishlist:", error);
        wishlistGrid.innerHTML = "<p style='text-align:center; color:#999; width:100%;'>Couldn't load the wishlist right now. Try refreshing.</p>";
        return;
    }

    wishlistGrid.innerHTML = "";

    if (items.length === 0) {
        wishlistGrid.innerHTML = `<p style="color: #888; text-align: center; width: 100%;">The watchlist is empty right now!</p>`;
        return;
    }

    const adminMode = isAdmin();

    items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('anime-card');

        if (adminMode) {
            card.style.cursor = "pointer";
            card.onclick = (e) => {
                if (e.target.tagName === 'A') return;
                requestRemove(item.id, item.anime_title);
            };
        }

        card.innerHTML = `
            <img src="${item.anime_image || ''}" alt="${item.anime_title}">
            <div class="overlay">
                <a href="${item.anime_link || '#'}" target="_blank">${item.anime_title}</a>
            </div>
        `;
        wishlistGrid.appendChild(card);
    });
}

// --- REMOVE (admin only) ---

function requestRemove(id, title) {
    currentId = id;
    currentTitle = title;
    document.getElementById('removeText').innerText = `Are you sure you want to remove "${title}"?`;
    document.getElementById('removeModal').style.display = "flex";
}

function closeRemoveModal() {
    document.getElementById('removeModal').style.display = "none";
}

document.getElementById('confirmRemove').onclick = async () => {
    const passcode = sessionStorage.getItem("adminPasscode");
    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentId, passcode }),
        });

        if (!response.ok) {
            alert("Couldn't remove that item. Please try again.");
            return;
        }
        closeRemoveModal();
        loadWishlist();
    } catch (error) {
        console.error("Error removing item:", error);
        alert("Connection lost. Please check your internet!");
    }
};

// --- ADD via search (admin only) ---

const ANILIST_URL = 'https://graphql.anilist.co';
const MAX_RESULTS = 6;
const SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: ${MAX_RESULTS}) {
    media(search: $search, type: ANIME, isAdult: false) {
      title { romaji english }
      coverImage { large }
      siteUrl
    }
  }
}
`;

const searchBtn = document.getElementById('wishlistSearchBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', searchForWishlistAdd);
    document.getElementById('wishlistSearchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchForWishlistAdd();
    });
}

async function searchForWishlistAdd() {
    const query = document.getElementById('wishlistSearchInput').value.trim();
    const resultsBox = document.getElementById('wishlistSearchResults');
    const hint = document.getElementById('wishlistSearchHint');
    if (!query) return;

    resultsBox.innerHTML = "";
    hint.textContent = "Searching...";

    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query } }),
        });

        const json = await response.json();
        const results = json.data?.Page?.media || [];

        if (results.length === 0) {
            hint.textContent = "No matches found.";
            return;
        }

        hint.textContent = "Click one to add it to the wishlist:";
        results.forEach(anime => {
            const title = anime.title.english || anime.title.romaji;
            const card = document.createElement('div');
            card.classList.add('anime-card');
            card.innerHTML = `
                <img src="${anime.coverImage.large}" alt="${title}">
                <div class="overlay"><a>${title}</a></div>
            `;
            card.onclick = () => addToWishlistFromSearch({
                title,
                image: anime.coverImage.large,
                link: anime.siteUrl,
            });
            resultsBox.appendChild(card);
        });
    } catch (error) {
        console.error("Search error:", error);
        hint.textContent = "Something went wrong. Please try again.";
    }
}

async function addToWishlistFromSearch(anime) {
    const passcode = sessionStorage.getItem("adminPasscode");
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                animeTitle: anime.title,
                animeImage: anime.image,
                animeLink: anime.link,
                passcode,
            }),
        });

        if (response.status === 409) {
            alert(`${anime.title} is already on the wishlist!`);
            return;
        }
        if (!response.ok) {
            alert("Couldn't add that. Please try again.");
            return;
        }

        document.getElementById('wishlistSearchResults').innerHTML = "";
        document.getElementById('wishlistSearchHint').textContent = "";
        document.getElementById('wishlistSearchInput').value = "";
        loadWishlist();
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        alert("Connection lost. Please check your internet!");
    }
}

// Close modal on background click
window.addEventListener('click', (e) => {
    if (e.target.id === 'removeModal') closeRemoveModal();
});