function loadNavbar() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (!navPlaceholder) return;

    // Get the current page name, stripping .html if present (someone might
    // still land on the .html URL directly) so it matches our clean links
    let currentPage = window.location.pathname.split("/").pop() || "index";
    currentPage = currentPage.replace(/\.html$/, "");
    if (currentPage === "") currentPage = "index";

    const adminLabel = isAdmin() ? "Logout" : "Admin";
    const active = (page) => currentPage === page ? "active" : "";

    // Desktop nav: unchanged pill style, always visible on wider screens
    const desktopNavHTML = `
        <nav class="desktop-nav">
            <a href="/" class="${active('index')}">Home</a>
            <a href="/watched" class="${active('watched')}">Watched</a>
            <a href="/notcompleted" class="${active('notcompleted')}">Dropped</a>
            <a href="/wishlist" class="${active('wishlist')}">Wishlist</a>
            <a href="/recommendation" class="${active('recommendation')}">Recommendation</a>
            <a href="/search" class="${active('search')}">Search</a>
            <a href="#" id="adminNavLink">${adminLabel}</a>
        </nav>
    `;

    // Mobile nav: fixed bottom tab bar with 5 primary tabs + a More sheet
    // for the two least-used pages (Dropped, Admin)
    const mobileNavHTML = `
        <div class="tab-bar">
            <a href="/" class="tab-item ${active('index')}"><span class="icon">🏠</span>Home</a>
            <a href="/watched" class="tab-item ${active('watched')}"><span class="icon">🎬</span>Watched</a>
            <a href="/wishlist" class="tab-item ${active('wishlist')}"><span class="icon">🍿</span>Wishlist</a>
            <a href="/recommendation" class="tab-item ${active('recommendation')}"><span class="icon">💌</span>Recs</a>
            <a href="/search" class="tab-item ${active('search')}"><span class="icon">🔍</span>Search</a>
            <button class="tab-item" id="moreTabBtn"><span class="icon">⋯</span>More</button>
        </div>
        <div class="tab-overlay" id="tabOverlay"></div>
        <div class="more-sheet" id="moreSheet">
            <div class="sheet-handle"></div>
            <a href="/notcompleted" class="more-link ${active('notcompleted')}"><span class="icon">⏳</span>Dropped</a>
            <a href="#" id="adminMoreLink" class="more-link"><span class="icon">🔒</span>${adminLabel}</a>
        </div>
    `;

    navPlaceholder.innerHTML = desktopNavHTML + mobileNavHTML;
    injectAdminModal();

    const moreTabBtn = document.getElementById("moreTabBtn");
    const moreSheet = document.getElementById("moreSheet");
    const tabOverlay = document.getElementById("tabOverlay");

    function toggleMoreSheet() {
        moreSheet.classList.toggle("open");
        tabOverlay.classList.toggle("show");
    }

    moreTabBtn.addEventListener("click", toggleMoreSheet);
    tabOverlay.addEventListener("click", toggleMoreSheet);

    document.getElementById("adminNavLink").addEventListener("click", (e) => {
        e.preventDefault();
        if (isAdmin()) {
            logoutAdmin();
        } else {
            openAdminModal();
        }
    });

    document.getElementById("adminMoreLink").addEventListener("click", (e) => {
        e.preventDefault();
        if (isAdmin()) {
            logoutAdmin();
        } else {
            openAdminModal();
        }
    });
}

// --- ADMIN MODE ---
// Visitors never see admin-only controls; only someone who enters the
// correct passcode (checked against the server) gets them, for this
// browser session only.

function isAdmin() {
    return sessionStorage.getItem("adminPasscode") !== null;
}

// Injects the styled login modal into the page once, reusing the
// site's existing .modal / .modal-content / button styling.
function injectAdminModal() {
    if (document.getElementById("adminModal")) return; // already injected

    const modalHTML = `
        <div id="adminModal" class="modal">
            <div class="modal-content">
                <span class="closeBtn" onclick="closeAdminModal()">&times;</span>
                <h2>🔒 Admin Login</h2>
                <p id="adminErrorText" style="color:#e06c8a; font-weight:700; min-height: 1.2em;"></p>
                <div class="add-category-box">
                    <input type="password" id="adminPasscodeInput" placeholder="Enter passcode">
                    <button id="adminSubmitBtn" class="btn-yes" style="width:100%;">Unlock</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const input = document.getElementById("adminPasscodeInput");
    document.getElementById("adminSubmitBtn").addEventListener("click", submitAdminLogin);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitAdminLogin();
    });
}

function openAdminModal() {
    document.getElementById("adminErrorText").textContent = "";
    document.getElementById("adminPasscodeInput").value = "";
    document.getElementById("adminModal").style.display = "flex";
    document.getElementById("adminPasscodeInput").focus();
}

function closeAdminModal() {
    document.getElementById("adminModal").style.display = "none";
}

async function submitAdminLogin() {
    const passcode = document.getElementById("adminPasscodeInput").value;
    const errorText = document.getElementById("adminErrorText");
    const submitBtn = document.getElementById("adminSubmitBtn");

    if (!passcode) {
        errorText.textContent = "Please enter a passcode.";
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Checking...";
    submitBtn.disabled = true;
    errorText.textContent = "";

    try {
        const response = await fetch("/.netlify/functions/admin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passcode }),
        });

        if (response.ok) {
            sessionStorage.setItem("adminPasscode", passcode);
            closeAdminModal();
            location.reload();
        } else {
            errorText.textContent = "Incorrect passcode. Try again.";
        }
    } catch (error) {
        console.error("Admin login error:", error);
        errorText.textContent = "Couldn't reach the server. Please try again.";
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function logoutAdmin() {
    sessionStorage.removeItem("adminPasscode");
    location.reload();
}

// Close the admin modal if clicking the dark background
window.addEventListener("click", (e) => {
    if (e.target.id === "adminModal") {
        closeAdminModal();
    }
});

// Run the function when the page loads
loadNavbar();

const modal = document.getElementById("animeModal");

// This whole block is only relevant on watched.html, which is the only
// page with #animeModal. Guarding it stops the script from throwing
// errors on every other page (index, search, wishlist, recommendation, notcompleted).
if (modal) {
  const title = document.getElementById("animeTitle");
  const characters = document.getElementById("animeCharacters");
  const closeBtn = modal.querySelector(".closeBtn");

  const ANILIST_URL = 'https://graphql.anilist.co';
  const CHARACTERS_QUERY = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        characters(sort: ROLE, perPage: 10) {
          edges {
            role
            node {
              name { full }
              image { large }
            }
          }
        }
      }
    }
  `;

  // Event delegation: this catches clicks on .scroll-card img even if the
  // card was added to the page later (e.g. after an async database fetch),
  // unlike attaching listeners directly to elements present at page load.
  document.addEventListener("click", async function(e) {
    const img = e.target.closest(".scroll-card img");
    if (!img) return;

    const animeName = img.getAttribute("data-name");

    title.innerText = animeName;
    characters.innerHTML = "<p>Loading characters...</p>";
    modal.style.display = "flex";

    try {
      const response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: CHARACTERS_QUERY,
          variables: { search: animeName },
        }),
      });

      const json = await response.json();
      const edges = json.data?.Media?.characters?.edges || [];
      const chars = edges
        .filter(e => e.role === "MAIN")
        .map(e => e.node);

      characters.innerHTML = "";

      if (chars.length === 0) {
        characters.innerHTML = "<p>No protagonists found.</p>";
      } else {
        chars.forEach(c => {
          characters.innerHTML += `
            <div class="char-card">
              <img src="${c.image.large}" alt="${c.name.full}">
              <p>${c.name.full}</p>
            </div>
          `;
        });
      }
    } catch (error) {
      console.error("Error loading characters:", error);
      characters.innerHTML = "<p>Couldn't load characters right now.</p>";
    }
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target == modal) {
      modal.style.display = "none";
    }
  });
}