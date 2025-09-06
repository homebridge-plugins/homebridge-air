/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * dynamic-ui.js: Dynamic UI components for @homebridge-plugins/homebridge-air.
 */

/**
 * Dynamic UI Components for Air Quality Plugin
 * Provides modular, reusable components for configuration management
 */
class DynamicAirUI {
  constructor() {
    this.currentConfig = null;
    this.activeTab = 'location';
    this.validationStates = {};
    this.init();
  }

  async init() {
    try {
      await this.loadConfig();
      this.setupEventListeners();
      this.initializeUI();
    } catch (error) {
      this.showError('Failed to initialize UI: ' + error.message);
    }
  }

  async loadConfig() {
    this.currentConfig = await homebridge.getPluginConfig();
    if (!this.currentConfig.length) {
      this.currentConfig.push({ name: 'Air', devices: [] });
    }
  }

  initializeUI() {
    if (this.currentConfig.length && this.currentConfig[0].devices?.length > 0) {
      this.showMainInterface();
      this.switchTab('location');
    } else {
      this.showSetupWizard();
    }

    if (this.currentConfig[0]?.disablePlugin) {
      this.showDisabledBanner();
    }
  }

  setupEventListeners() {
    // Navigation menu
    document.getElementById('menuLocation')?.addEventListener('click', () => this.switchTab('location'));
    document.getElementById('menuSettings')?.addEventListener('click', () => this.switchTab('settings'));
    document.getElementById('menuDevices')?.addEventListener('click', () => this.switchTab('devices'));
    document.getElementById('menuHome')?.addEventListener('click', () => this.switchTab('support'));
    
    // Setup wizard
    document.getElementById('introLink')?.addEventListener('click', () => this.completeSetup());
    document.getElementById('disabledEnable')?.addEventListener('click', () => this.enablePlugin());
  }

  showSetupWizard() {
    this.hideAllPages();
    document.getElementById('pageIntro').style.display = 'block';
    document.getElementById('menuWrapper').style.display = 'none';
  }

  showMainInterface() {
    document.getElementById('pageIntro').style.display = 'none';
    document.getElementById('menuWrapper').style.display = 'inline-flex';
  }

  async completeSetup() {
    homebridge.showSpinner();
    try {
      // Save initial config
      await homebridge.updatePluginConfig(this.currentConfig);
      this.showMainInterface();
      this.switchTab('location');
    } catch (error) {
      this.showError('Setup failed: ' + error.message);
    } finally {
      homebridge.hideSpinner();
    }
  }

  switchTab(tabName) {
    if (this.activeTab === tabName) return;
    
    homebridge.showSpinner();
    this.updateTabButtons(tabName);
    this.hideAllPages();
    
    switch (tabName) {
      case 'location':
        this.showLocationTab();
        break;
      case 'settings':
        this.showSettingsTab();
        break;
      case 'devices':
        this.showDevicesTab();
        break;
      case 'support':
        this.showSupportTab();
        break;
    }
    
    this.activeTab = tabName;
    homebridge.hideSpinner();
  }

  updateTabButtons(activeTab) {
    const tabs = ['menuLocation', 'menuSettings', 'menuDevices', 'menuHome'];
    tabs.forEach(tabId => {
      const tab = document.getElementById(tabId);
      if (tab) {
        tab.className = tab.className.replace(/btn-(primary|elegant)/g, '');
        tab.classList.add(tabId === `menu${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` || 
                         (activeTab === 'support' && tabId === 'menuHome') ? 'btn-elegant' : 'btn-primary');
      }
    });
  }

  hideAllPages() {
    const pages = ['pageLocation', 'pageSettings', 'pageDevices', 'pageSupport'];
    pages.forEach(pageId => {
      const page = document.getElementById(pageId);
      if (page) page.style.display = 'none';
    });
    homebridge.hideSchemaForm();
  }

  showLocationTab() {
    document.getElementById('pageLocation').style.display = 'block';
    this.initializeLocationFeatures();
  }

  showSettingsTab() {
    homebridge.showSchemaForm();
  }

  async showDevicesTab() {
    const page = document.getElementById('pageDevices');
    if (page) {
      page.style.display = 'block';
      await this.loadDeviceInfo();
    }
  }

  showSupportTab() {
    document.getElementById('pageSupport').style.display = 'block';
  }

  initializeLocationFeatures() {
    // Geolocation functionality
    const getLocationBtn = document.getElementById('getLocation');
    const latitudeField = document.getElementById('latitudeField');
    const longitudeField = document.getElementById('longitudeField');
    const copyLatBtn = document.getElementById('copyLatitude');
    const copyLonBtn = document.getElementById('copyLongitude');

    if (getLocationBtn && !getLocationBtn.dataset.initialized) {
      getLocationBtn.addEventListener('click', this.getCurrentLocation.bind(this));
      getLocationBtn.dataset.initialized = 'true';
    }

    if (copyLatBtn && !copyLatBtn.dataset.initialized) {
      copyLatBtn.addEventListener('click', () => this.copyToClipboard('latitudeField', 'Latitude'));
      copyLatBtn.dataset.initialized = 'true';
    }

    if (copyLonBtn && !copyLonBtn.dataset.initialized) {
      copyLonBtn.addEventListener('click', () => this.copyToClipboard('longitudeField', 'Longitude'));
      copyLonBtn.dataset.initialized = 'true';
    }

    // Load current location if available
    const device = this.currentConfig[0]?.devices?.[0];
    if (device) {
      if (latitudeField && device.latitude) latitudeField.value = device.latitude;
      if (longitudeField && device.longitude) longitudeField.value = device.longitude;
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError('Geolocation is not supported by this browser.');
      return;
    }

    homebridge.showSpinner();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        document.getElementById('latitudeField').value = latitude;
        document.getElementById('longitudeField').value = longitude;

        homebridge.hideSpinner();
        homebridge.toast.success('Location fetched successfully.', 'Success');
      },
      (error) => {
        homebridge.hideSpinner();
        let errorMessage = 'Error getting location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'User denied the request for Geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'The request to get user location timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        this.showError(errorMessage);
      }
    );
  }

  async copyToClipboard(fieldId, fieldName) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value) {
      this.showError(`No ${fieldName.toLowerCase()} to copy.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(field.value);
      homebridge.toast.success(`${fieldName} copied to clipboard.`, 'Success');
    } catch (error) {
      this.showError(`Error copying ${fieldName.toLowerCase()}: ${error.message}`);
    }
  }

  async loadDeviceInfo() {
    try {
      const cachedAccessories = typeof homebridge.getCachedAccessories === 'function'
        ? await homebridge.getCachedAccessories()
        : await homebridge.request('/getCachedAccessories');

      this.populateDeviceSelector(cachedAccessories);
    } catch (error) {
      this.showError('Failed to load device information: ' + error.message);
    }
  }

  populateDeviceSelector(cachedAccessories) {
    const deviceSelect = document.getElementById('deviceSelect');
    if (!deviceSelect) return;

    deviceSelect.innerHTML = '';

    if (cachedAccessories.length === 0) {
      const option = document.createElement('option');
      option.text = 'No Devices';
      deviceSelect.add(option);
      deviceSelect.disabled = true;
      return;
    }

    // Sort devices alphabetically
    cachedAccessories.sort((a, b) => 
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );

    cachedAccessories.forEach(accessory => {
      const option = document.createElement('option');
      option.text = accessory.displayName;
      option.value = accessory.UUID;
      deviceSelect.add(option);
    });

    deviceSelect.disabled = false;

    // Setup device selection handler
    if (!deviceSelect.dataset.initialized) {
      deviceSelect.addEventListener('change', (event) => {
        this.showDeviceInfo(event.target.value, cachedAccessories);
      });
      deviceSelect.dataset.initialized = 'true';
    }

    // Show first device by default
    if (cachedAccessories.length > 0) {
      this.showDeviceInfo(cachedAccessories[0].UUID, cachedAccessories);
    }
  }

  showDeviceInfo(uuid, cachedAccessories) {
    const accessory = cachedAccessories.find(x => x.UUID === uuid);
    if (!accessory) return;

    const context = accessory.context;
    
    document.getElementById('displayName').textContent = accessory.displayName;
    document.getElementById('serialNumber').textContent = context.serialNumber || 'N/A';
    document.getElementById('model').textContent = context.model || 'N/A';
    document.getElementById('firmwareRevision').textContent = context.firmwareRevision || 'N/A';
    
    document.getElementById('deviceTable').style.display = 'inline-table';
  }

  showDisabledBanner() {
    document.getElementById('disabledBanner').style.display = 'block';
  }

  async enablePlugin() {
    homebridge.showSpinner();
    try {
      document.getElementById('disabledBanner').style.display = 'none';
      this.currentConfig[0].disablePlugin = false;
      await homebridge.updatePluginConfig(this.currentConfig);
      await homebridge.savePluginConfig();
      homebridge.toast.success('Plugin enabled successfully.', 'Success');
    } catch (error) {
      this.showError('Failed to enable plugin: ' + error.message);
    } finally {
      homebridge.hideSpinner();
    }
  }

  showError(message) {
    console.error(message);
    homebridge.toast.error(message, 'Error');
  }
}

// Initialize the dynamic UI when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DynamicAirUI();
});