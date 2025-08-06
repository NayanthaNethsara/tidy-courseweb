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

// Get all module objects {id, name}
function getAllModules() {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return [];
  const moduleLinks = getModuleLinks(coursesMenu);
  return Array.from(moduleLinks).map((link) => ({
    id: link.getAttribute("href"),
    name: link.textContent.trim(),
  }));
}

// Apply hidden state from modules array
function applyHiddenModules(modules) {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;
  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    const id = link.getAttribute("href");
    const module = modules.find((m) => m.id === id);
    if (module && module.hidden) {
      link.parentElement.style.display = "none";
    } else {
      link.parentElement.style.display = "";
    }
  });
}

// Merge storage with fresh DOM, update storage, apply hidden state
function syncModulesWithStorage() {
  const modulesFromPage = getAllModules();

  chrome.storage.local.get({ modules: [] }, (data) => {
    const oldList = data.modules;
    // Fast lookup for hidden state
    const hiddenMap = {};
    oldList.forEach((m) => (hiddenMap[m.id] = m.hidden));

    const merged = modulesFromPage.map((m) => ({
      ...m,
      hidden: hiddenMap[m.id] || false,
    }));

    chrome.storage.local.set({ modules: merged }, () => {
      applyHiddenModules(merged);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    // Not used for UI, but keeps API available
    const coursesMenu = getCoursesMenu();
    const moduleLinks = getModuleLinks(coursesMenu);
    const modules = Array.from(moduleLinks).map((link) => ({
      id: link.getAttribute("href"),
      name: link.textContent.trim(),
    }));
    sendResponse({ modules });
    return true;
  }
  if (request.type === "TOGGLE_MODULE") {
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
  if (request.type === "SYNC_MODULES") {
    chrome.storage.local.get({ modules: [] }, (data) => {
      applyHiddenModules(data.modules);
    });
    sendResponse({ status: "ok" });
  }
});

window.addEventListener("load", () => {
  setTimeout(() => {
    syncModulesWithStorage();
  }, 1200);
});
