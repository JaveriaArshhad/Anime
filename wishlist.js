document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
});

let currentIndex = null;
let currentAnime = null;
// Load categories from storage or use these cute defaults
let categories = JSON.parse(localStorage.getItem('animeCategories')) || [];
function loadWishlist() {
    const wishlistGrid = document.getElementById('wishlistGrid');
    const wishlist = JSON.parse(localStorage.getItem('myWishlist')) || [];
    if (!wishlistGrid) return; 

    wishlistGrid.innerHTML = "";

    if (wishlist.length === 0) {
        wishlistGrid.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Your watchlist is empty. Go to the Search page to find some anime!</p>`;
        return;
    }

    wishlist.forEach((anime, index) => {
        const card = document.createElement('div');
        card.classList.add('anime-card');

        card.onclick = (e) => {
            // Prevent opening modal if clicking the direct link
            if (e.target.tagName === 'A') return;
            openOptionsModal(index, anime);
        };

        card.innerHTML = `
            <img src="${anime.image || 'https://via.placeholder.com/200x300'}" alt="${anime.title}">
            <div class="overlay">
                <a href="${anime.link || '#'}" target="_blank">${anime.title}</a>
            </div>
        `;
        wishlistGrid.appendChild(card);
    });
}

// --- 1. OPTION MENU LOGIC ---
function openOptionsModal(index, anime) {
    currentIndex = index;
    currentAnime = anime;
    document.getElementById('optionsTitle').innerText = anime.title;
    document.getElementById('optionsModal').style.display = "flex";
}

function closeOptionsModal() {
    document.getElementById('optionsModal').style.display = "none";
}

// --- 2. CATEGORY SELECTION LOGIC ---
document.getElementById('moveWatchedBtn').onclick = () => {
    closeOptionsModal();
    openCategoryModal();
};

function openCategoryModal() {
    const listContainer = document.getElementById('categoryList');
    listContainer.innerHTML = ""; 

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = "btn-yes"; // Uses your purple gradient
        btn.innerText = cat;
        btn.onclick = () => finalizeMove(cat);
        listContainer.appendChild(btn);
    });

    document.getElementById('categoryModal').style.display = "flex";
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = "none";
}

function addNewCategory() {
    const input = document.getElementById('newCategoryInput');
    const newCat = input.value.trim();
    
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        localStorage.setItem('animeCategories', JSON.stringify(categories));
        input.value = "";
        openCategoryModal(); // Refresh the buttons instantly
    }
}

function finalizeMove(categoryName) {
    let watchedList = JSON.parse(localStorage.getItem('myWatchedList')) || [];
    
    // Attach the chosen category to the anime
    const animeToMove = { ...currentAnime, category: categoryName };
    
    watchedList.push(animeToMove);
    localStorage.setItem('myWatchedList', JSON.stringify(watchedList));

    removeFromWishlist(currentIndex);
    closeCategoryModal();
    alert(`✨ ${currentAnime.title} moved to ${categoryName}!`);
}

// --- 3. REMOVE LOGIC ---
document.getElementById('requestDeleteBtn').onclick = () => {
    closeOptionsModal();
    document.getElementById('removeText').innerText = `Are you sure you want to remove "${currentAnime.title}"?`;
    document.getElementById('removeModal').style.display = "flex";
};

document.getElementById('confirmRemove').onclick = () => {
    removeFromWishlist(currentIndex);
    closeRemoveModal();
};

function closeRemoveModal() {
    document.getElementById('removeModal').style.display = "none";
}

function removeFromWishlist(index) {
    let wishlist = JSON.parse(localStorage.getItem('myWishlist')) || [];
    wishlist.splice(index, 1);
    localStorage.setItem('myWishlist', JSON.stringify(wishlist));
    loadWishlist();
}

// Close modals if clicking the dark background
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeOptionsModal();
        closeRemoveModal();
        closeCategoryModal();
    }
};