const menuButton = document.getElementById("menuButton");
const navigationLinks = document.querySelector(".links");
const searchButton = document.getElementById("searchButton");
const searchPanel = document.getElementById("searchPanel");
const searchInput = document.getElementById("siteSearch");
const searchMessage = document.getElementById("searchMessage");

menuButton.addEventListener("click", () => {
  const isOpen = navigationLinks.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu"
  );
});

searchButton.addEventListener("click", () => {
  const isHidden = searchPanel.hasAttribute("hidden");

  if (isHidden) {
    searchPanel.removeAttribute("hidden");
    searchButton.setAttribute("aria-expanded", "true");
    searchInput.focus();
  } else {
    searchPanel.setAttribute("hidden", "");
    searchButton.setAttribute("aria-expanded", "false");
  }
});

searchPanel.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();

  if (!query) {
    searchMessage.textContent = "Please enter a search term.";
    return;
  }

  const searchableText = document.querySelector(".main").textContent.toLowerCase();

  if (searchableText.includes(query.toLowerCase())) {
    searchMessage.textContent = `Results found for "${query}".`;
  } else {
    searchMessage.textContent = `No results found for "${query}".`;
  }
});
