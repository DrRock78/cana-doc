// Smooth Scroll für Buttons
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute("href")).scrollIntoView({
            behavior: "smooth"
        });
    });
});

// Dummy-Funktion für Formular (später API Integration)
function submitForm() {
    alert("Vielen Dank! Deine Nachricht wurde gesendet.");
}
