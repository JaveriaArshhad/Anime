document.addEventListener("DOMContentLoaded", async () => {
    const countEl = document.getElementById("recCount");
    if (!countEl) return;

    try {
        const response = await fetch("/.netlify/functions/recommendations");
        if (!response.ok) throw new Error("Failed to fetch");
        const rows = await response.json();
        countEl.textContent = rows.length;
    } catch (error) {
        console.error("Error loading recommendation count:", error);
        countEl.textContent = "—";
    }
});