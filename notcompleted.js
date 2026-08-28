const API_URL = "/.netlify/functions/notcompleted";

let currentId = null;
let currentTitle = null;
let pendingAdd = null;

document.addEventListener('DOMContentLoaded', () => {
    loadNotCompleted();
    if (isAdmin()) { // from main.js
        document.getElementById('adminAddBox').style.display = 'block';
    }
});

async function loadNotCompleted() {
    const grid = document.getElementById('notcompletedGrid');
    grid.innerHTML = "<p style='text-align:center; color:#999; width:100%;'>Loading...</p>";

    let items = [];
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch");
        items = await response.json();
    } catch (error) {
        console.error("Error loading list:", error);
        grid.innerHTML = "<p style='text-align:center; color:#999; width:100%;'>Couldn't load the list right now. Try refreshing.</p>";
        return;
    }

    grid.innerHTML = "";

    if (items.length === 0) {
        grid.innerHTML = "<p style='color:#888; text-align:center; width:100%;'>Nothing here yet!</p>";
        return;
    }

    const adminMode = isAdmin();

    items.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'notcompleted-item';

        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <img src="${item.anime_image || ''}" alt="${item.anime_title}">
            <div class="overlay"><a href="${item.anime_link || '#'}" target="_blank">${item.anime_title}</a></div>
        `;
        wrapper.appendChild(card);

        if (item.reason) {
            const note = document.createElement('p');
            note.className = 'drop-note';
            note.textContent = item.reason;
            wrapper.appendChild(note);
        }

        if (adminMode) {
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '🗑';
            deleteBtn.title = "Remove";
            deleteBtn.style.cssText = "position:absolute; top:6px; right:8px; z-index:6; cursor:pointer; background:rgba(255,255,255,0.85); border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:0.9em;";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                requestRemove(item.id, item.anime_title);
            };
            wrapper.appendChild(deleteBtn);
        }

        grid.appendChild(wrapper);
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
        loadNotCompleted();
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

const searchBtn = document.getElementById('ncSearchBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', runSearch);
    document.getElementById('ncSearchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runSearch();
    });
}

async function runSearch() {
    const query = document.getElementById('ncSearchInput').value.trim();
    const resultsBox = document.getElementById('ncSearchResults');
    const hint = document.getElementById('ncSearchHint');
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

        hint.textContent = "Click one to add it:";
        results.forEach(anime => {
            const title = anime.title.english || anime.title.romaji;
            const card = document.createElement('div');
            card.classList.add('anime-card');
            card.innerHTML = `
                <img src="${anime.coverImage.large}" alt="${title}">
                <div class="overlay"><a>${title}</a></div>
            `;
            card.onclick = () => {
                pendingAdd = { title, image: anime.coverImage.large, link: anime.siteUrl };
                openReasonModal(title);
            };
            resultsBox.appendChild(card);
        });
    } catch (error) {
        console.error("Search error:", error);
        hint.textContent = "Something went wrong. Please try again.";
    }
}

// --- REASON PROMPT (admin only) ---

function openReasonModal(title) {
    document.getElementById('reasonTitle').textContent = `Why didn't you finish "${title}"?`;
    document.getElementById('reasonInput').value = "";
    document.getElementById('reasonModal').style.display = "flex";
}

function closeReasonModal() {
    document.getElementById('reasonModal').style.display = "none";
}

async function confirmAdd() {
    if (!pendingAdd) return;
    const reason = document.getElementById('reasonInput').value.trim();
    const passcode = sessionStorage.getItem("adminPasscode");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                animeTitle: pendingAdd.title,
                animeImage: pendingAdd.image,
                animeLink: pendingAdd.link,
                reason,
                passcode,
            }),
        });

        if (response.status === 409) {
            alert(`${pendingAdd.title} is already on the list!`);
            closeReasonModal();
            return;
        }
        if (!response.ok) {
            alert("Couldn't add that. Please try again.");
            return;
        }

        closeReasonModal();
        document.getElementById('ncSearchResults').innerHTML = "";
        document.getElementById('ncSearchHint').textContent = "";
        document.getElementById('ncSearchInput').value = "";
        pendingAdd = null;
        loadNotCompleted();
    } catch (error) {
        console.error("Error adding item:", error);
        alert("Connection lost. Please check your internet!");
    }
}

// Close modals on background click
window.addEventListener('click', (e) => {
    if (e.target.id === 'removeModal') closeRemoveModal();
    if (e.target.id === 'reasonModal') closeReasonModal();
});