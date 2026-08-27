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

        card.onclick = () => {
            if (confirm(`Add "${properTitle}" to wishlist?`)) {
                addToWishlist(properTitle, image, link);
            }
        };

        card.innerHTML = `
            <img src="${image}" alt="${properTitle}">
            <div class="overlay"><a>${properTitle}</a></div>
        `;
        resultsContainer.appendChild(card);
    });
}

function addToWishlist(title, image, link) {
    let wishlist = JSON.parse(localStorage.getItem('myWishlist')) || [];
    if (wishlist.some(item => item.title === title)) return alert("Already added!");
    wishlist.push({ title, image, link });
    localStorage.setItem('myWishlist', JSON.stringify(wishlist));
    alert("Added!");
}