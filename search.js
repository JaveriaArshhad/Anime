const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsContainer.innerHTML = "<p>Searching...</p>";

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=12`);
        const data = await response.json();
        displayResults(data.data);
    } catch (error) {
        resultsContainer.innerHTML = "<p>Error loading results.</p>";
    }
});

function displayResults(animeList) {
    resultsContainer.innerHTML = ""; 
    animeList.forEach(anime => {
        const card = document.createElement('div');
        card.classList.add('anime-card', 'show-name');

        // LOGIC CHANGE: Check if English title exists, otherwise use default
        const properTitle = anime.title_english || anime.title;

        card.onclick = () => {
            // Use properTitle here instead of anime.title
            if (confirm(`Add "${properTitle}" to wishlist?`)) {
                addToWishlist(properTitle, anime.images.jpg.image_url, anime.url);
            }
        };

        card.innerHTML = `
            <img src="${anime.images.jpg.image_url}" alt="${properTitle}">
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