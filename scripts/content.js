function getCoursesMenu() {
  const dropdown = document.querySelector(
    'li.dropdown > a.dropdown-toggle[title="My courses"]'
  );
  if (!dropdown) return null;
  const parentLi = dropdown.closest("li.dropdown");
  return parentLi.querySelector("ul.dropdown-menu");
}

function getModuleLinks(coursesMenu) {
  if (!coursesMenu) return [];
  return coursesMenu.querySelectorAll("li > a");
}

function logMenuIfExists() {
  const coursesMenu = getCoursesMenu();
  if (coursesMenu) {
    const moduleLinks = getModuleLinks(coursesMenu);
    console.log("TidyCourseweb: Found modules:", moduleLinks.length);
    moduleLinks.forEach((link, idx) => {
      console.log(`Module ${idx + 1}:`, link.textContent.trim());
    });
  } else {
    console.log(
      "TidyCourseweb: Courses menu not yet in DOM (may need to hover)."
    );
  }
}

window.addEventListener("load", () => {
  setTimeout(logMenuIfExists, 1200);
});
