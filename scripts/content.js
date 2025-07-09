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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    const coursesMenu = getCoursesMenu();
    const moduleLinks = getModuleLinks(coursesMenu);
    // Send back module list with name and an id (can use href as id)
    const modules = Array.from(moduleLinks).map((link) => ({
      id: link.getAttribute("href"),
      name: link.textContent.trim(),
    }));
    sendResponse({ modules });
    return true; // Indicates async response
  }
  if (request.type === "TOGGLE_MODULE") {
    // Hide/show the module with the given id (href)
    const coursesMenu = getCoursesMenu();
    const moduleLinks = getModuleLinks(coursesMenu);
    moduleLinks.forEach((link) => {
      if (link.getAttribute("href") === request.id) {
        if (request.action === "hide") {
          link.parentElement.style.display = "none";
        } else {
          link.parentElement.style.display = "";
        }
      }
    });
    sendResponse({ status: "ok" });
    return true;
  }
});

function addToggleButtons() {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;

  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    // Avoid adding the toggle multiple times
    if (link.parentElement.querySelector(".tidy-toggle-btn")) return;

    // Create a toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Hide";
    toggleBtn.className = "tidy-toggle-btn";
    toggleBtn.style.marginLeft = "8px";
    toggleBtn.style.fontSize = "12px";
    toggleBtn.style.cursor = "pointer";

    toggleBtn.onclick = function (e) {
      e.preventDefault();
      // Toggle the <li>'s display
      if (link.parentElement.style.display === "none") {
        link.parentElement.style.display = "";
        toggleBtn.textContent = "Hide";
      } else {
        link.parentElement.style.display = "none";
        // Optionally, change button to "Show" if you want it to remain visible
        // toggleBtn.textContent = "Show";
      }
    };

    link.parentElement.appendChild(toggleBtn);
  });
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
  setTimeout(() => {
    logMenuIfExists();
    addToggleButtons();
  }, 1200);
});
