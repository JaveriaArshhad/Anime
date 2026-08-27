const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');

const ANILIST_URL = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 12) {
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

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsContainer.innerHTML = "<p>Searching...</p>";

    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: SEARCH_QUERY,
                variables: { search: query },
            }),
        });

        if (response.status === 429) {
            resultsContainer.innerHTML = "<p>Slow down! The database needs a moment to breathe.</p>";
            return;
        }

        if (response.status >= 500) {
            resultsContainer.innerHTML = "<p>The anime database seems to be down right now. Please try again in a bit!</p>";
            return;
        }

        const json = await response.json();
        const results = json.data?.Page?.media || [];

        if (results.length === 0) {
            resultsContainer.innerHTML = "<p>No anime found. Try a different search.</p>";
            return;
        }

        displayResults(results);
    } catch (error) {
        resultsContainer.innerHTML = "<p>Error loading results. Check your internet connection.</p>";
    }
});

function displayResults(animeList) {
    resultsContainer.innerHTML = "";
    animeList.forEach(anime => {
        const card = document.createElement('div');
        card.classList.add('anime-card', 'show-name');

        const properTitle = anime.title.english || anime.title.romaji;
        const image = anime.coverImage.large;
        const link = anime.siteUrl;

        card.onclick = () => openRecommendModal({ title: properTitle, image, link });

        card.innerHTML = `
            <img src="${image}" alt="${properTitle}">
            <div class="overlay"><a>${properTitle}</a></div>
        `;
        resultsContainer.appendChild(card);
    });
}

// --- RECOMMEND FROM SEARCH ---
// Clicking a search result offers to add it straight to the shared
// Recommendations board, same backend the Recommendation page uses.

const RECOMMENDATIONS_API_URL = "/.netlify/functions/recommendations";
let pendingRecommendAnime = null;

function openRecommendModal(anime) {
    pendingRecommendAnime = anime;
    document.getElementById("recommendTitle").textContent = `Recommend "${anime.title}"?`;
    document.getElementById("recommendStatusText").textContent = "";
    document.getElementById("recommenderName").value = "";
    document.getElementById("recommendModal").style.display = "flex";
}

function closeRecommendModal() {
    document.getElementById("recommendModal").style.display = "none";
}

document.getElementById("confirmRecommendBtn").addEventListener("click", async () => {
    if (!pendingRecommendAnime) return;

    const typedName = document.getElementById("recommenderName").value.trim();
    const userName = typedName || "Anonymous";
    const statusText = document.getElementById("recommendStatusText");
    const submitBtn = document.getElementById("confirmRecommendBtn");

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Adding...";
    submitBtn.disabled = true;
    statusText.textContent = "";

    try {
        const response = await fetch(RECOMMENDATIONS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName,
                animeTitle: pendingRecommendAnime.title,
                animeImage: pendingRecommendAnime.image,
                animeLink: pendingRecommendAnime.link,
                website: document.getElementById("website")?.value || "",
            }),
        });

        if (response.status === 409) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = `Already on ${userName}'s list!`;
            return;
        }

        if (response.status === 429) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = "Too many recommendations too fast. Please wait a bit.";
            return;
        }

        if (!response.ok) {
            statusText.style.color = "#e06c8a";
            statusText.textContent = "Couldn't save that. Please try again.";
            return;
        }

        statusText.style.color = "#2f6b2f";
        statusText.textContent = "✨ Added to Recommendations!";
        setTimeout(closeRecommendModal, 900);
    } catch (error) {
        console.error("Error saving recommendation:", error);
        statusText.style.color = "#e06c8a";
        statusText.textContent = "Connection lost. Please check your internet!";
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

document.getElementById("recommenderName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("confirmRecommendBtn").click();
});

// Close modal on background click
window.addEventListener("click", (e) => {
    if (e.target.id === "recommendModal") closeRecommendModal();
});