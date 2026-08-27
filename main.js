function loadNavbar() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (!navPlaceholder) return;

    // Get the current file name (e.g., index.html)
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    const navHTML = `
        <nav>
            <a href="index.html" class="${currentPage === 'index.html' ? 'active' : ''}">Home</a>
            <a href="watched.html" class="${currentPage === 'watched.html' ? 'active' : ''}">Watched</a>
            <a href="notcompleted.html" class="${currentPage === 'notcompleted.html' ? 'active' : ''}">Not Completed</a>
            <a href="wishlist.html" class="${currentPage === 'wishlist.html' ? 'active' : ''}">Watchlist</a>
            <a href="recommendation.html" class="${currentPage === 'recommendation.html' ? 'active' : ''}">Recommendation</a>
            <a href="search.html" class="${currentPage === 'search.html' ? 'active' : ''}">Search</a>
        </nav>
    `;

    navPlaceholder.innerHTML = navHTML;
}

// Run the function when the page loads
loadNavbar();

const animeCharacters = {
  "Your Name": [
    { name: "Mitsuha Miyamizu", img: "characters/mitsuha.jpg" },
    { name: "Taki Tachibana", img: "characters/taki.jpg" }
  ],
  "I Want to Eat Your Pancreas": [
    { name: "Sakura Yamauchi", img: "characters/sakura.jpg" },
    { name: "Haruki Shiga", img: "characters/haruki.jpg" }
  ],
  "The Garden of Words": [
    { name: "Takao Akizuki", img: "characters/takao.jpg" },
    { name: "Yukari Yukino", img: "characters/yukari.jpg" }
  ],
  "The Tunnel to Summer": [
  { name: "Kaoru Tono", img: "characters/kaoru-tono.jpg" },
  { name: "Anzu Hanashiro", img: "characters/anzu-hanashiro.jpg" }
  ],
  "A Silent Voice": [
    { name: "Shoya Ishida", img: "characters/shoya.jpg" },
    { name: "Shoko Nishimiya", img: "characters/shoko.jpg" }
  ],
  "Weathering With You": [
    { name: "Hodaka Morishima", img: "characters/hodaka.jpg" },
    { name: "Hina Amano", img: "characters/hina.jpg" }
  ],
  "Suzume": [
    { name: "Suzume Iwato", img: "characters/suzume.jpg" },
    { name: "Sota Munakata", img: "characters/sota.jpg" }
  ],
  "My Dress-Up Darling": [
    { name: "Wakana Gojo", img: "characters/wakana.jpg" },
    { name: "Marin Kitagawa", img: "characters/marin.jpg" }
  ],
  "Spy x Family": [
    { name: "Loid Forger", img: "characters/loid.jpg" },
    { name: "Yor Forger", img: "characters/yor.jpg" },
    { name: "Anya Forger", img: "characters/anya.jpg" }
  ],
  "Nana": [
  { name: "Nana Osaki", img: "characters/nana_osaki.jpg" },
  { name: "Nana Komatsu", img: "characters/nana_komatsu.jpg" },
  { name: "Ren Honjo", img: "characters/ren.jpg" },
  { name: "Yasu", img: "characters/yasu.jpg" },
  { name: "Takumi Ichinose", img: "characters/takumi.jpg" },
  { name: "Shoji Endo", img: "characters/shoji.jpg" },
  { name: "Nobu", img: "characters/nobu.jpg" },
  { name: "Hachi (Nana Komatsu)", img: "characters/hachi.jpg" }
  ],
  "The Promised Neverland": [
    { name: "Emma", img: "characters/emma.jpg" },
    { name: "Norman", img: "characters/norman.jpg" },
    { name: "Ray", img: "characters/ray.jpg" }
  ],
  "Paradise Kiss": [
  { name: "Yukari Hayasaka (Caroline)", img: "characters/yukari.jpg" },
  { name: "George Koizumi", img: "characters/george.jpg" },
  { name: "Isabella Yamamoto (Yukari's friend)", img: "characters/isabella.jpg" },
  { name: "Miwako Sakurada", img: "characters/miwako.jpg" },
  { name: "Arashi Nagase", img: "characters/arashi.jpg" },
  { name: "Joji 'Yukari' (designer)", img: "characters/joji.jpg" }
  ],
  "Solo Leveling": [
    { name: "Sung Jin-Woo", img: "characters/jinwoo.jpg" }
  ],
  "Death Note": [
    { name: "Light Yagami", img: "characters/light.jpg" },
    { name: "L Lawliet", img: "characters/l.jpg" }
  ],
  "Tokyo Revengers": [
  { name: "Takemichi Hanagaki", img: "characters/takemichi.jpg" },
  { name: "Manjiro 'Mikey' Sano", img: "characters/mikey.jpg" },
  { name: "Ken 'Draken' Ryuguji", img: "characters/draken.jpg" },
  { name: "Keisuke Baji", img: "characters/baji.jpg" },
  { name: "Chifuyu Matsuno", img: "characters/chifuyu.jpg" },
  { name: "Takashi Mitsuya", img: "characters/mitsuya.jpg" },
  { name: "Hakkai Shiba", img: "characters/hakkai.jpg" },
  { name: "Kazutora Hanemiya", img: "characters/kazutora.jpg" },
  { name: "Kisaki Tetta", img: "characters/kisaki.jpg" },
  { name: "Emma Sano", img: "characters/emma.jpg" }
]

};

const modal = document.getElementById("animeModal");

// This whole block is only relevant on watched.html, which is the only
// page with #animeModal. Guarding it stops the script from throwing
// errors on every other page (index, search, wishlist, recommendation, notcompleted).
if (modal) {
  const title = document.getElementById("animeTitle");
  const characters = document.getElementById("animeCharacters");
  const closeBtn = modal.querySelector(".closeBtn");

  document.querySelectorAll(".scroll-card img").forEach(img => {
    img.addEventListener("click", function() {
      const animeName = this.getAttribute("data-name");
      const chars = animeCharacters[animeName];

      title.innerText = animeName;
      characters.innerHTML = "";

      if (!chars) {
        characters.innerHTML = "<p>No characters found.</p>";
      } else {
        chars.forEach(c => {
          characters.innerHTML += `
            <div class="char-card">
              <img src="${c.img}" alt="${c.name}">
              <p>${c.name}</p>
            </div>
          `;
        });
      }

      modal.style.display = "flex";
    });
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