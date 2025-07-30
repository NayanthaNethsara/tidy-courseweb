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
function applyHiddenModules(modules, forceShow = false) {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;
  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    const id = link.getAttribute("href");
    const module = modules.find((m) => m.id === id);
    const li = link.parentElement;
    const checkbox = li.querySelector(".tidy-toggle-checkbox");
    
    if (module) {
      if (forceShow) {
        // When checkboxes are visible, show all modules
        li.style.display = "flex";
        if (checkbox) checkbox.checked = !module.hidden;
      } else {
        // Normal behavior - respect hidden state
        if (module.hidden) {
          li.style.display = "none";
          if (checkbox) checkbox.checked = false;
        } else {
          li.style.display = "flex";
          if (checkbox) checkbox.checked = true;
        }
      }
    }
  });
}

// Merge storage with fresh DOM, update storage, apply hidden state
function syncModulesWithStorage() {
  const modulesFromPage = getAllModules();

  chrome.storage.sync.get({ modules: [] }, (data) => {
    const oldList = data.modules;
    // Fast lookup for hidden state
    const hiddenMap = {};
    oldList.forEach((m) => (hiddenMap[m.id] = m.hidden));

    const merged = modulesFromPage.map((m) => ({
      ...m,
      hidden: hiddenMap[m.id] || false,
    }));

    chrome.storage.sync.set({ modules: merged }, () => {
      const coursesMenu = getCoursesMenu();
      const masterToggle = coursesMenu?.querySelector(".tidy-master-toggle-btn");
      applyHiddenModules(merged, masterToggle?.textContent === "ON");
    });
  });
}

function addMasterToggleButton(coursesMenu) {
  // Check if master toggle already exists
  if (coursesMenu.querySelector(".tidy-master-toggle")) return;
  
  // Create master toggle container
  const masterToggleContainer = document.createElement("div");
  masterToggleContainer.className = "tidy-master-toggle";
  masterToggleContainer.style.alignItems = "center";

  masterToggleContainer.style.borderBottom = "1px solid rgba(0,0,0,.2)";
  masterToggleContainer.style.backgroundColor = "#f5f5f5";
  
  // Create button
  const button = document.createElement("button");
  button.style.boxShadow = "none";
  button.style.border = "none";
  button.style.outline = "none";
  button.className = "tidy-master-toggle-btn"
  button.textContent = "Edit";
  button.style.fontSize = "12px";
  button.style.margin = "12px 8px";
  
  // Add to container
  masterToggleContainer.appendChild(button);
  
  // Insert at the top of the menu
  coursesMenu.insertBefore(masterToggleContainer, coursesMenu.firstChild);
  
  // Toggle functionality
  button.onclick = function() {
    const checkboxesVisible = (button.textContent === "Done");
    button.textContent = checkboxesVisible? "Edit" : "Done";
    
    chrome.storage.sync.get({ modules: [] }, (data) => {
      applyHiddenModules(data.modules, !checkboxesVisible);
    });
    
    const checkboxes = coursesMenu.querySelectorAll(".tidy-toggle-checkbox");
    checkboxes.forEach(checkbox => {
      checkbox.style.display = checkboxesVisible ? "none" : "block";
      checkbox.parentElement.style.opacity = (!checkboxesVisible && !checkbox.checked) ? "0.5" : "1";
    });
    
  };
}

function addCheckboxes() {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;
  
  // Add master toggle button first
  addMasterToggleButton(coursesMenu);
  
  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    // Avoid adding the checkbox multiple times
    if (link.parentElement.querySelector(".tidy-toggle-checkbox")) return;

    link.style.borderBottom = "none";
    link.style.borderTop = "none";
    
    const li = link.parentElement;
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.justifyContent = "space-between";
    li.style.borderBottom = "1px solid rgba(0,0,0,.2)";

    // Create the checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "tidy-toggle-checkbox";
    checkbox.style.margin = "0 12px";
    checkbox.style.cursor = "pointer";
    checkbox.style.width = "16px";
    checkbox.style.height = "16px";
    checkbox.checked = true;
    checkbox.style.display = "none";
    
    checkbox.onchange = function (e) {
      e.preventDefault();
      checkbox.parentElement.style.opacity = checkbox.checked ? "1" : "0.5"
      const id = link.getAttribute("href");
      // Toggle hidden state in storage
      chrome.storage.sync.get({ modules: [] }, (data) => {
        const modules = data.modules.map((m) =>
          m.id === id ? { ...m, hidden: !checkbox.checked } : m
        );
        chrome.storage.sync.set({ modules }, () => {
          const masterToggle = coursesMenu.querySelector(".tidy-master-toggle-btn");
          applyHiddenModules(modules, masterToggle?.textContent === "Done");
        });
      });
    };
    
    li.appendChild(checkbox);
  });

}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
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
    chrome.storage.sync.get({ modules: [] }, (data) => {
      const coursesMenu = getCoursesMenu();
      const masterToggle = coursesMenu?.querySelector(".tidy-master-toggle-btn");
      applyHiddenModules(data.modules, masterToggle?.textContent === "ON");
    });
    sendResponse({ status: "ok" });
  }
});

window.addEventListener("load", () => {
  setTimeout(() => {
    addCheckboxes();
    syncModulesWithStorage();
  }, 1200);
});