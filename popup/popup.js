document.addEventListener("DOMContentLoaded", () => {
  // Tab functionality
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      // Remove active class from all tabs and panels
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      // Add active class to clicked tab and corresponding panel
      button.classList.add("active");
      document.getElementById(`${targetTab}-panel`).classList.add("active");
    });
  });

  // Mode selection functionality
  const modeButtons = document.querySelectorAll("[data-mode]");
  let currentMode = "exam"; // Default to exam mode

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all mode buttons
      modeButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");

      currentMode = button.getAttribute("data-mode");

      // Store current mode
      window.chrome.storage.local.set({ currentMode: currentMode });

      // Refresh module list
      getCurrentTab((tab) => {
        if (tab?.id) {
          refreshAndRender(tab.id);
        }
      });
    });
  });

  window.chrome.storage.local.get(["currentMode"], (data) => {
    if (data.currentMode) {
      currentMode = data.currentMode;
      const modeButton = document.querySelector(`[data-mode="${currentMode}"]`);
      if (modeButton) {
        modeButtons.forEach((btn) => btn.classList.remove("active"));
        modeButton.classList.add("active");
      }
    }
  });

  // Quick Actions
  const examModeBtn = document.getElementById("exam-mode");
  const nightModeBtn = document.getElementById("night-mode");

  // Exam Mode toggle
  examModeBtn.addEventListener("click", () => {
    examModeBtn.classList.toggle("active");
    const isActive = examModeBtn.classList.contains("active");

    // Store exam mode state
    window.chrome.storage.local.set({ examMode: isActive });

    // Send message to content script
    getCurrentTab((tab) => {
      if (tab?.id) {
        window.chrome.tabs.sendMessage(tab.id, {
          type: "EXAM_MODE_TOGGLE",
          enabled: isActive,
        });
      }
    });
  });

  nightModeBtn.addEventListener("click", () => {
    nightModeBtn.classList.toggle("active");
    const isActive = nightModeBtn.classList.contains("active");

    // Store night mode state for website
    window.chrome.storage.local.set({ websiteNightMode: isActive });

    // Send message to content script to toggle website dark mode
    getCurrentTab((tab) => {
      if (tab?.id) {
        window.chrome.tabs.sendMessage(tab.id, {
          type: "WEBSITE_DARK_MODE_TOGGLE",
          enabled: isActive,
        });
      }
    });
  });

  window.chrome.storage.local.get(["examMode", "websiteNightMode"], (data) => {
    if (data.examMode) {
      examModeBtn.classList.add("active");
    }
    if (data.websiteNightMode) {
      nightModeBtn.classList.add("active");
    }
  });

  // Settings functionality
  const savePresetBtn = document.getElementById("save-preset");
  const presetList = document.getElementById("preset-list");
  const autoHideCheckbox = document.getElementById("auto-hide-completed");
  const showNotificationsCheckbox =
    document.getElementById("show-notifications");

  // Filter button event listeners
  const filterButtons = document.querySelectorAll("[data-filter]");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all filter buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");

      // Refresh module list with new filter
      getCurrentTab((tab) => {
        if (tab?.id) {
          refreshAndRender(tab.id);
        }
      });
    });
  });

  // Load semester selection
  window.chrome.storage.local.get(["currentSemester"], (data) => {
    if (data.currentSemester) {
      const semesterRadio = document.querySelector(
        `input[name="semester"][value="${data.currentSemester}"]`
      );
      if (semesterRadio) {
        semesterRadio.checked = true;
      }
    }
  });

  // Save semester selection
  const semesterRadios = document.querySelectorAll('input[name="semester"]');
  semesterRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        window.chrome.storage.local.set({ currentSemester: radio.value });
      }
    });
  });

  // Save preset functionality
  savePresetBtn.addEventListener("click", () => {
    // Get current visible modules state
    window.chrome.storage.local.get(["hiddenModules"], (data) => {
      const hiddenModules = data.hiddenModules || [];

      // Save single preset (overwrite existing)
      const preset = {
        hiddenModules: hiddenModules,
        createdAt: new Date().toISOString(),
      };

      window.chrome.storage.local.set({ preset: preset }, () => {
        loadPreset();
      });
    });
  });

  // Load presets
  function loadPreset() {
    window.chrome.storage.local.get(["preset"], (data) => {
      const preset = data.preset;
      presetList.innerHTML = "";

      if (preset) {
        const presetItem = document.createElement("div");
        presetItem.className = "preset-item";
        presetItem.innerHTML = `
          <span>Saved Preset</span>
          <div class="preset-actions">
            <button class="preset-action" onclick="applyPreset()">Load</button>
            <button class="preset-action" onclick="deletePreset()">Delete</button>
          </div>
        `;
        presetList.appendChild(presetItem);
      } else {
        presetList.innerHTML =
          '<p style="color: #94a3b8; font-size: 12px; text-align: center;">No preset saved</p>';
      }
    });
  }

  // Preset functions for single preset
  window.applyPreset = () => {
    window.chrome.storage.local.get(["preset"], (data) => {
      const preset = data.preset;
      if (preset) {
        // Apply preset
        window.chrome.storage.local.set(
          {
            hiddenModules: preset.hiddenModules,
          },
          () => {
            refreshAndRender();
          }
        );
      }
    });
  };

  window.deletePreset = () => {
    if (confirm("Delete saved preset?")) {
      window.chrome.storage.local.remove("preset", () => {
        loadPreset();
      });
    }
  };

  // Load settings
  window.chrome.storage.local.get(
    ["autoHideCompleted", "showNotifications"],
    (data) => {
      autoHideCheckbox.checked = data.autoHideCompleted || false;
      showNotificationsCheckbox.checked = data.showNotifications || false;
    }
  );

  // Save settings
  autoHideCheckbox.addEventListener("change", () => {
    window.chrome.storage.local.set({
      autoHideCompleted: autoHideCheckbox.checked,
    });
  });

  showNotificationsCheckbox.addEventListener("change", () => {
    window.chrome.storage.local.set({
      showNotifications: showNotificationsCheckbox.checked,
    });
  });

  let allModules = [];
  let selectedSemesterModules = [];

  function loadSemesterModules() {
    window.chrome.storage.local.get(["semesterModules"], (data) => {
      selectedSemesterModules = data.semesterModules || [];
      renderModuleSelection();
    });
  }

  function saveSemesterModules() {
    window.chrome.storage.local.set({
      semesterModules: selectedSemesterModules,
    });
  }

  function renderModuleSelection() {
    const availableList = document.getElementById("available-modules-list");
    const selectedList = document.getElementById("selected-modules-list");

    if (!availableList || !selectedList) return;

    // Clear lists
    availableList.innerHTML = "";
    selectedList.innerHTML = "";

    // Render available modules (not in current semester)
    allModules.forEach((module) => {
      if (!selectedSemesterModules.find((m) => m.id === module.id)) {
        const item = document.createElement("div");
        item.className = "module-selection-item";
        item.innerHTML = `
          <span>${module.name}</span>
          <button class="module-selection-button" onclick="addToSemester('${module.id}')">Add</button>
        `;
        availableList.appendChild(item);
      }
    });

    // Render selected modules
    selectedSemesterModules.forEach((module) => {
      const item = document.createElement("div");
      item.className = "module-selection-item";
      item.innerHTML = `
        <span>${module.name}</span>
        <button class="module-selection-button remove" onclick="removeFromSemester('${module.id}')">Remove</button>
      `;
      selectedList.appendChild(item);
    });
  }

  // Global functions for module selection
  window.addToSemester = (moduleId) => {
    const module = allModules.find((m) => m.id === moduleId);
    if (module && !selectedSemesterModules.find((m) => m.id === moduleId)) {
      selectedSemesterModules.push(module);
      saveSemesterModules();
      renderModuleSelection();
    }
  };

  window.removeFromSemester = (moduleId) => {
    selectedSemesterModules = selectedSemesterModules.filter(
      (m) => m.id !== moduleId
    );
    saveSemesterModules();
    renderModuleSelection();
  };

  // Original module functionality
  function getCurrentTab(callback) {
    window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) callback(tabs[0]);
    });
  }

  function fetchHiddenModules(callback) {
    window.chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      callback(data.hiddenModules || []);
    });
  }

  function saveHiddenModules(hiddenIds, callback) {
    window.chrome.storage.local.set({ hiddenModules: hiddenIds }, callback);
  }

  function renderModuleList(modules, hiddenIds, tabId) {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = "";

    const activeFilterButton = document.querySelector("[data-filter].active");
    const filterValue = activeFilterButton
      ? activeFilterButton.getAttribute("data-filter")
      : "all";

    let filtered = modules.map((m) => ({
      ...m,
      hidden: hiddenIds.includes(m.id),
    }));

    if (currentMode === "exam") {
      // Show only semester modules in exam mode
      filtered = filtered.filter((m) =>
        selectedSemesterModules.find((sm) => sm.id === m.id)
      );
    } else if (currentMode === "semester") {
      // Show semester modules in current semester mode
      filtered = filtered.filter((m) =>
        selectedSemesterModules.find((sm) => sm.id === m.id)
      );
    } else if (currentMode === "preset") {
      // Show modules based on preset (if exists)
      window.chrome.storage.local.get(["preset"], (data) => {
        if (data.preset) {
          const presetHiddenIds = data.preset.hiddenModules || [];
          // Show modules that are NOT in the preset's hidden list
          filtered = modules
            .map((m) => ({
              ...m,
              hidden: presetHiddenIds.includes(m.id),
            }))
            .filter((m) => !presetHiddenIds.includes(m.id));
        }

        // Apply visibility filter after preset filter
        if (filterValue === "visible")
          filtered = filtered.filter((m) => !m.hidden);
        if (filterValue === "hidden")
          filtered = filtered.filter((m) => m.hidden);

        renderFilteredModules(filtered, hiddenIds, tabId);
      });
      return; // Exit early for preset mode to handle async operation
    }

    // Apply visibility filter for exam and semester modes
    if (filterValue === "visible") filtered = filtered.filter((m) => !m.hidden);
    if (filterValue === "hidden") filtered = filtered.filter((m) => m.hidden);

    renderFilteredModules(filtered, hiddenIds, tabId);
  }

  function renderFilteredModules(filtered, hiddenIds, tabId) {
    const listEl = document.getElementById("module-list");

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<li style="text-align: center; color: #64748b; padding: 16px;">No modules to display</li>';
      return;
    }

    filtered.forEach((mod) => {
      const li = document.createElement("li");

      const titleSpan = document.createElement("span");
      titleSpan.className = "module-title";
      titleSpan.textContent = mod.name;
      if (mod.hidden) titleSpan.classList.add("dim");

      const btn = document.createElement("button");
      btn.className = "tidy-toggle-btn";
      btn.title = mod.hidden ? "Show this module" : "Hide this module";
      btn.textContent = mod.hidden ? "Show" : "Hide";

      btn.onclick = () => {
        let updatedHiddenIds;
        if (mod.hidden) {
          updatedHiddenIds = hiddenIds.filter((id) => id !== mod.id);
        } else {
          updatedHiddenIds = [...hiddenIds, mod.id];
        }

        saveHiddenModules(updatedHiddenIds, () => {
          getCurrentTab((tab) => {
            if (tab?.id) {
              refreshAndRender(tab.id);
              window.chrome.tabs.sendMessage(tab.id, { type: "SYNC_MODULES" });
            }
          });
        });
      };

      li.appendChild(titleSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function refreshAndRender(tabId) {
    getCurrentTab((tab) => {
      if (!tab?.id) return;

      window.chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_MODULES" },
        (response) => {
          if (!response || !response.modules) return;

          allModules = response.modules;

          fetchHiddenModules((hiddenIds) => {
            renderModuleList(response.modules, hiddenIds, tab.id);
          });
        }
      );
    });
  }

  // Initialize popup
  getCurrentTab((tab) => {
    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://courseweb.sliit.lk/")
    ) {
      const modulesPanel = document.getElementById("modules-panel");
      if (modulesPanel) {
        modulesPanel.innerHTML = `
          <div style="text-align:center; color:#64748b; padding:32px 0;">
            <p style="font-weight: 600; margin-bottom: 8px;">TidyCourseweb</p>
            <p style="font-size: 12px;">Only works on courseweb.sliit.lk</p>
          </div>
        `;
      }
      return;
    }

    refreshAndRender(tab.id);

    loadSemesterModules();

    loadPreset(); // Load single preset
  });
});
