const API_URL = "/.netlify/functions/watched";

let currentId = null;
let currentTitle = null;
let pendingAddAnime = null;
let knownCategories = [];

document.addEventListener("DOMContentLoaded", () => {
  loadWatched();
  if (isAdmin()) {
    // from main.js
    document.getElementById("adminAddBox").style.display = "block";
  }
});

async function loadWatched() {
  const container = document.getElementById("watchedContainer");
  container.innerHTML =
    "<p style='text-align:center; color:#999;'>Loading...</p>";

  let items = [];
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to fetch");
    items = await response.json();
  } catch (error) {
    console.error("Error loading watched list:", error);
    container.innerHTML =
      "<p style='text-align:center; color:#999;'>Couldn't load the list right now. Try refreshing.</p>";
    return;
  }

  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML =
      "<p style='text-align:center; color:#888;'>Nothing marked as watched yet!</p>";
    knownCategories = [];
    return;
  }

  // Group by category, preserving the order categories first appear in
  const grouped = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  knownCategories = Object.keys(grouped);

  const adminMode = isAdmin();

  for (const category in grouped) {
    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add("category");
    categoryTitle.textContent = category;
    container.appendChild(categoryTitle);

    const scrollDiv = document.createElement("div");
    scrollDiv.classList.add("scroll-container");
    container.appendChild(scrollDiv);

    grouped[category].forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("scroll-card");
      card.style.position = "relative";

      card.innerHTML = `
                <img src="${item.anime_image || ""}" alt="${item.anime_title}" data-name="${item.anime_title}">
                <div class="overlay"><a href="${item.anime_link || "#"}" target="_blank">${item.anime_title}</a></div>
            `;

      if (adminMode) {
        const deleteBtn = document.createElement("span");
        deleteBtn.textContent = "🗑";
        deleteBtn.title = "Remove from Watched";
        deleteBtn.style.cssText =
          "position:absolute; top:6px; right:8px; z-index:5; cursor:pointer; background:rgba(255,255,255,0.85); border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:0.9em;";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          requestRemove(item.id, item.anime_title);
        };
        card.appendChild(deleteBtn);
      }

      scrollDiv.appendChild(card);
    });
  }
}

// --- REMOVE (admin only) ---

function requestRemove(id, title) {
  currentId = id;
  currentTitle = title;
  document.getElementById("removeText").innerText =
    `Are you sure you want to remove "${title}" from Watched?`;
  document.getElementById("removeModal").style.display = "flex";
}

function closeRemoveModal() {
  document.getElementById("removeModal").style.display = "none";
}

document.getElementById("confirmRemove").onclick = async () => {
  const passcode = sessionStorage.getItem("adminPasscode");
  try {
    const response = await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, passcode }),
    });

    if (!response.ok) {
      alert("Couldn't remove that item. Please try again.");
      return;
    }
    closeRemoveModal();
    loadWatched();
  } catch (error) {
    console.error("Error removing item:", error);
    alert("Connection lost. Please check your internet!");
  }
};

// --- ADD via search (admin only) ---

const ANILIST_URL = "https://graphql.anilist.co";
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

const searchBtn = document.getElementById("watchedSearchBtn");
if (searchBtn) {
  searchBtn.addEventListener("click", searchForWatchedAdd);
  document
    .getElementById("watchedSearchInput")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchForWatchedAdd();
    });
}

async function searchForWatchedAdd() {
  const query = document.getElementById("watchedSearchInput").value.trim();
  const resultsBox = document.getElementById("watchedSearchResults");
  const hint = document.getElementById("watchedSearchHint");
  if (!query) return;

  resultsBox.innerHTML = "";
  hint.textContent = "Searching...";

  try {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: query },
      }),
    });

    const json = await response.json();
    const results = json.data?.Page?.media || [];

    if (results.length === 0) {
      hint.textContent = "No matches found.";
      return;
    }

    hint.textContent = "Click one to mark it as watched:";
    results.forEach((anime) => {
      const title = anime.title.english || anime.title.romaji;
      const card = document.createElement("div");
      card.classList.add("anime-card");
      card.innerHTML = `
                <img src="${anime.coverImage.large}" alt="${title}">
                <div class="overlay"><a>${title}</a></div>
            `;
      card.onclick = () => {
        pendingAddAnime = {
          title,
          image: anime.coverImage.large,
          link: anime.siteUrl,
        };
        openCategoryModal();
      };
      resultsBox.appendChild(card);
    });
  } catch (error) {
    console.error("Search error:", error);
    hint.textContent = "Something went wrong. Please try again.";
  }
}

// --- CATEGORY PICKER (admin only) ---

function openCategoryModal() {
  const listContainer = document.getElementById("categoryList");
  listContainer.innerHTML = "";

  knownCategories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "btn-yes";
    btn.innerText = cat;
    btn.onclick = () => finalizeAdd(cat);
    listContainer.appendChild(btn);
  });

  document.getElementById("categoryModal").style.display = "flex";
}

function closeCategoryModal() {
  document.getElementById("categoryModal").style.display = "none";
}

function addNewCategory() {
  const input = document.getElementById("newCategoryInput");
  const newCat = input.value.trim();
  if (newCat) {
    finalizeAdd(newCat);
  }
}

async function finalizeAdd(category) {
  if (!pendingAddAnime) return;
  const passcode = sessionStorage.getItem("adminPasscode");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animeTitle: pendingAddAnime.title,
        animeImage: pendingAddAnime.image,
        animeLink: pendingAddAnime.link,
        category,
        passcode,
      }),
    });

    if (response.status === 409) {
      alert(`${pendingAddAnime.title} is already marked as watched!`);
      closeCategoryModal();
      return;
    }
    if (!response.ok) {
      alert("Couldn't add that. Please try again.");
      return;
    }

    closeCategoryModal();
    document.getElementById("watchedSearchResults").innerHTML = "";
    document.getElementById("watchedSearchHint").textContent = "";
    document.getElementById("watchedSearchInput").value = "";
    document.getElementById("newCategoryInput").value = "";
    pendingAddAnime = null;
    loadWatched();
  } catch (error) {
    console.error("Error adding to watched:", error);
    alert("Connection lost. Please check your internet!");
  }
}

// Close modals on background click
window.addEventListener("click", (e) => {
  if (e.target.id === "removeModal") closeRemoveModal();
  if (e.target.id === "categoryModal") closeCategoryModal();
});
