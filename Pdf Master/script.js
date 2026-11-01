
function scrollToTools() {
    document.getElementById("tools").scrollIntoView({
        behavior: "smooth"
    });
}

const searchInput = document.getElementById("searchInput");
const toolCards = document.querySelectorAll(".tool-card");
const noResults = document.getElementById("noResults");

searchInput.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase().trim();

    let visibleCount = 0;

    toolCards.forEach(function (card) {

        const toolName = card.dataset.name;

        if (toolName.includes(searchValue)) {

            card.style.display = "block";
            visibleCount++;

        } else {

            card.style.display = "none";

        }

    });

    noResults.hidden = visibleCount !== 0;

});
