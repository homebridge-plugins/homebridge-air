/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * dynamic-ui.ts: Dynamic UI components for @homebridge-plugins/homebridge-air.
 */

interface HomebridgeConfig {
  name: string;
  platform?: string;
  provider?: 'airnow' | 'aqicn';
  apiKey?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  refreshRate?: number;
  disablePlugin?: boolean;
  devices?: DeviceConfig[];
}

interface DeviceConfig {
  name: string;
  provider: 'airnow' | 'aqicn';
  apiKey: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  refreshRate?: number;
}

declare var homebridge: any;

interface Window {
  configValidator: ConfigValidator;
  configWizard: ConfigWizard;
  dynamicAirUI: DynamicAirUI;
}



interface ValidationStates {
  [key: string]: boolean;
}

/**
 * Dynamic UI Components for Air Quality Plugin
 * Provides modular, reusable components for configuration management
 */
class DynamicAirUI {
  private currentConfig: HomebridgeConfig[] | null;
  private activeTab: string;
  private validationStates: ValidationStates;

  constructor() {
    this.currentConfig = null;
    this.activeTab = 'location';
    this.validationStates = {};
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadConfig();
      this.setupEventListeners();
      this.initializeUI();
    } catch (error) {
      this.showError('Failed to initialize UI: ' + (error as Error).message);
    }
  }

  async loadConfig(): Promise<void> {
    this.currentConfig = await homebridge.getPluginConfig();
    if (!this.currentConfig || !this.currentConfig.length) {
      this.currentConfig = [{ name: 'Air', devices: [] }];
    }
  }

  initializeUI(): void {
    if (this.currentConfig && this.currentConfig.length && this.currentConfig[0].devices?.length && this.currentConfig[0].devices.length > 0) {
      this.showMainInterface();
      this.switchTab('location');
    } else {
      this.showSetupWizard();
    }

    if (this.currentConfig && this.currentConfig[0]?.disablePlugin) {
      this.showDisabledBanner();
    }
  }

  private setupEventListeners(): void {
    // Navigation menu
    document.getElementById('menuLocation')?.addEventListener('click', () => this.switchTab('location'));
    document.getElementById('menuSettings')?.addEventListener('click', () => this.switchTab('settings'));
    document.getElementById('menuDevices')?.addEventListener('click', () => this.switchTab('devices'));
    document.getElementById('menuHome')?.addEventListener('click', () => this.switchTab('support'));
    
    // Setup wizard
    document.getElementById('introLink')?.addEventListener('click', () => this.completeSetup());
    document.getElementById('disabledEnable')?.addEventListener('click', () => this.enablePlugin());
  }

  private showSetupWizard(): void {
    this.hideAllPages();
    const pageIntro = document.getElementById('pageIntro');
    const menuWrapper = document.getElementById('menuWrapper');
    
    if (pageIntro) pageIntro.style.display = 'block';
    if (menuWrapper) menuWrapper.style.display = 'none';
  }

  private showMainInterface(): void {
    const pageIntro = document.getElementById('pageIntro');
    const menuWrapper = document.getElementById('menuWrapper');
    
    if (pageIntro) pageIntro.style.display = 'none';
    if (menuWrapper) menuWrapper.style.display = 'inline-flex';
  }

  private async completeSetup(): Promise<void> {
    homebridge.spinner.show();
    try {
      if (this.currentConfig) {
        // Save initial config
        await homebridge.updatePluginConfig(this.currentConfig);
        this.showMainInterface();
        this.switchTab('location');
      }
    } catch (error) {
      this.showError('Setup failed: ' + (error as Error).message);
    } finally {
      homebridge.spinner.hide();
    }
  }

  private switchTab(tabName: string): void {
    if (this.activeTab === tabName) return;
    
    homebridge.spinner.show();
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
    homebridge.spinner.hide();
  }

  private updateTabButtons(activeTab: string): void {
    const tabs = ['Location', 'Settings', 'Devices', 'Home'];
    tabs.forEach(tab => {
      const button = document.getElementById(`menu${tab}`);
      if (button) {
        button.classList.remove('active');
        if (tab.toLowerCase() === activeTab || (tab === 'Home' && activeTab === 'support')) {
          button.classList.add('active');
        }
      }
    });
  }

  private hideAllPages(): void {
    const pages = ['pageLocation', 'pageSettings', 'pageDevices', 'pageHome'];
    pages.forEach(pageId => {
      const page = document.getElementById(pageId);
      if (page) {
        page.style.display = 'none';
      }
    });
  }

  private showLocationTab(): void {
    const page = document.getElementById('pageLocation');
    if (!page) return;
    
    page.style.display = 'block';
    this.setupLocationControls();
  }

  private showSettingsTab(): void {
    let page = document.getElementById('pageSettings');
    if (!page) {
      this.createSettingsTab();
      page = document.getElementById('pageSettings');
    }
    if (page) {
      page.style.display = 'block';
      this.loadSettingsData();
    }
  }

  private showDevicesTab(): void {
    let page = document.getElementById('pageDevices');
    if (!page) {
      this.createDevicesTab();
      page = document.getElementById('pageDevices');
    }
    if (page) {
      page.style.display = 'block';
      this.loadDevicesData();
    }
  }

  private showSupportTab(): void {
    const page = document.getElementById('pageHome');
    if (page) {
      page.style.display = 'block';
    }
  }

  private setupLocationControls(): void {
    // Get current location button
    const getLocationBtn = document.getElementById('getLocation');
    if (getLocationBtn) {
      getLocationBtn.addEventListener('click', () => {
        this.getCurrentLocation();
      });
    }

    // Copy buttons
    const copyLatBtn = document.getElementById('copyLatitude');
    const copyLngBtn = document.getElementById('copyLongitude');
    
    if (copyLatBtn) {
      copyLatBtn.addEventListener('click', () => {
        this.copyToClipboard('latitudeField');
      });
    }
    
    if (copyLngBtn) {
      copyLngBtn.addEventListener('click', () => {
        this.copyToClipboard('longitudeField');
      });
    }

    // Load current values
    this.loadLocationValues();
  }

  private loadLocationValues(): void {
    if (!this.currentConfig || !this.currentConfig[0]?.devices?.length) return;

    const device = this.currentConfig[0].devices[0];
    const latField = document.getElementById('latitudeField') as HTMLInputElement;
    const lngField = document.getElementById('longitudeField') as HTMLInputElement;

    if (latField && device.latitude !== undefined) {
      latField.value = device.latitude.toString();
    }
    if (lngField && device.longitude !== undefined) {
      lngField.value = device.longitude.toString();
    }
  }

  private getCurrentLocation(): void {
    if (!navigator.geolocation) {
      homebridge.toast.error('Geolocation is not supported by this browser', 'Location Error');
      return;
    }

    const button = document.getElementById('getLocation') as HTMLButtonElement;
    if (!button) return;

    const originalText = button.textContent || '';
    button.textContent = 'Getting location...';
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const latField = document.getElementById('latitudeField') as HTMLInputElement;
        const lngField = document.getElementById('longitudeField') as HTMLInputElement;

        if (latField) latField.value = lat.toFixed(6);
        if (lngField) lngField.value = lng.toFixed(6);

        homebridge.toast.success('Location detected successfully!', 'Success');
        button.textContent = originalText;
        button.disabled = false;
      },
      (error) => {
        let message = 'Failed to get current location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }

        homebridge.toast.error(message, 'Location Error');
        button.textContent = originalText;
        button.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }

  private copyToClipboard(fieldId: string): void {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (!field || !field.value) {
      homebridge.toast.warning('No value to copy', 'Copy');
      return;
    }

    navigator.clipboard.writeText(field.value).then(() => {
      homebridge.toast.success('Copied to clipboard', 'Success');
    }).catch(() => {
      // Fallback for older browsers
      field.select();
      field.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        homebridge.toast.success('Copied to clipboard', 'Success');
      } catch (err) {
        homebridge.toast.error('Failed to copy to clipboard', 'Error');
      }
    });
  }

  private createSettingsTab(): void {
    const menuWrapper = document.getElementById('menuWrapper');
    if (!menuWrapper) return;

    const settingsHTML = `
      <div id="pageSettings" style="display: none;">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Plugin Settings</h5>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label for="globalRefreshRate" class="form-label">Global Refresh Rate (seconds):</label>
              <select class="form-control" id="globalRefreshRate">
                <option value="1800">30 minutes</option>
                <option value="3600">1 hour</option>
                <option value="7200">2 hours</option>
                <option value="21600">6 hours</option>
                <option value="43200">12 hours</option>
              </select>
              <small class="text-muted">How often to update air quality data for all devices</small>
            </div>
            
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" id="disablePlugin">
              <label class="form-check-label" for="disablePlugin">
                Disable Plugin
              </label>
              <small class="text-muted d-block">Temporarily disable the plugin without removing configuration</small>
            </div>
            
            <div class="mt-4">
              <button type="button" class="btn btn-primary" id="saveSettings">Save Settings</button>
              <button type="button" class="btn btn-outline-secondary ml-2" id="resetSettings">Reset to Defaults</button>
            </div>
          </div>
        </div>
      </div>
    `;

    menuWrapper.insertAdjacentHTML('afterend', settingsHTML);
    this.setupSettingsEventListeners();
  }

  private setupSettingsEventListeners(): void {
    const saveBtn = document.getElementById('saveSettings');
    const resetBtn = document.getElementById('resetSettings');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }
  }

  private loadSettingsData(): void {
    if (!this.currentConfig || !this.currentConfig[0]) return;

    const config = this.currentConfig[0];
    const refreshSelect = document.getElementById('globalRefreshRate') as HTMLSelectElement;
    const disableCheck = document.getElementById('disablePlugin') as HTMLInputElement;

    if (refreshSelect && config.refreshRate) {
      refreshSelect.value = config.refreshRate.toString();
    }

    if (disableCheck) {
      disableCheck.checked = !!config.disablePlugin;
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.currentConfig || !this.currentConfig[0]) return;

    const refreshSelect = document.getElementById('globalRefreshRate') as HTMLSelectElement;
    const disableCheck = document.getElementById('disablePlugin') as HTMLInputElement;

    try {
      homebridge.spinner.show();

      if (refreshSelect) {
        this.currentConfig[0].refreshRate = Number(refreshSelect.value);
      }

      if (disableCheck) {
        this.currentConfig[0].disablePlugin = disableCheck.checked;
      }

      await homebridge.updatePluginConfig(this.currentConfig);
      homebridge.toast.success('Settings saved successfully!', 'Success');

      // Update disabled banner visibility
      if (disableCheck?.checked) {
        this.showDisabledBanner();
      } else {
        this.hideDisabledBanner();
      }

    } catch (error) {
      homebridge.toast.error('Failed to save settings: ' + (error as Error).message, 'Error');
    } finally {
      homebridge.spinner.hide();
    }
  }

  private resetSettings(): void {
    const refreshSelect = document.getElementById('globalRefreshRate') as HTMLSelectElement;
    const disableCheck = document.getElementById('disablePlugin') as HTMLInputElement;

    if (refreshSelect) {
      refreshSelect.value = '1800';
    }

    if (disableCheck) {
      disableCheck.checked = false;
    }

    homebridge.toast.info('Settings reset to defaults. Click Save to apply.', 'Reset');
  }

  private createDevicesTab(): void {
    const menuWrapper = document.getElementById('menuWrapper');
    if (!menuWrapper) return;

    const devicesHTML = `
      <div id="pageDevices" style="display: none;">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Device Information</h5>
          </div>
          <div class="card-body">
            <div id="devicesList">
              <!-- Device information will be loaded here -->
            </div>
            <div class="mt-3">
              <button type="button" class="btn btn-primary" id="addDevice">Add Device</button>
              <button type="button" class="btn btn-outline-secondary ml-2" id="refreshDevices">Refresh</button>
            </div>
          </div>
        </div>
      </div>
    `;

    menuWrapper.insertAdjacentHTML('afterend', devicesHTML);
    this.setupDevicesEventListeners();
  }

  private setupDevicesEventListeners(): void {
    const addBtn = document.getElementById('addDevice');
    const refreshBtn = document.getElementById('refreshDevices');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addDevice();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDevicesData();
      });
    }
  }

  private loadDevicesData(): void {
    const devicesList = document.getElementById('devicesList');
    if (!devicesList || !this.currentConfig || !this.currentConfig[0]?.devices) {
      return;
    }

    const devices = this.currentConfig[0].devices;
    
    if (devices.length === 0) {
      devicesList.innerHTML = `
        <div class="alert alert-info">
          <h6>No Devices Configured</h6>
          <p class="mb-0">Click "Add Device" to set up your first air quality sensor.</p>
        </div>
      `;
      return;
    }

    const devicesHTML = devices.map((device, index) => `
      <div class="card mb-3">
        <div class="card-body">
          <h6>${device.name}</h6>
          <p class="text-muted mb-2">Provider: ${device.provider.toUpperCase()}</p>
          <small class="text-muted">
            Location: ${this.getDeviceLocationText(device)}<br>
            Refresh Rate: ${device.refreshRate ? device.refreshRate / 60 : 30} minutes
          </small>
          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.dynamicAirUI.editDevice(${index})">Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.dynamicAirUI.removeDevice(${index})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    devicesList.innerHTML = devicesHTML;
  }

  private getDeviceLocationText(device: DeviceConfig): string {
    if (device.latitude && device.longitude) {
      return `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`;
    } else if (device.zipCode) {
      return `ZIP: ${device.zipCode}`;
    } else if (device.city) {
      return `City: ${device.city}`;
    }
    return 'Not specified';
  }

  private addDevice(): void {
    // Launch the wizard for adding a new device
    if (window.configWizard) {
      window.configWizard.start();
    }
  }

  editDevice(index: number): void {
    // TODO: Implement device editing functionality
    homebridge.toast.info('Device editing will be available in a future update', 'Feature Coming Soon');
  }

  async removeDevice(index: number): Promise<void> {
    if (!this.currentConfig || !this.currentConfig[0]?.devices) return;

    const device = this.currentConfig[0].devices[index];
    if (!device) return;

    const confirmed = confirm(`Are you sure you want to remove the device "${device.name}"?`);
    if (!confirmed) return;

    try {
      homebridge.spinner.show();
      
      this.currentConfig[0].devices.splice(index, 1);
      await homebridge.updatePluginConfig(this.currentConfig);
      
      homebridge.toast.success('Device removed successfully!', 'Success');
      this.loadDevicesData();
      
    } catch (error) {
      homebridge.toast.error('Failed to remove device: ' + (error as Error).message, 'Error');
    } finally {
      homebridge.spinner.hide();
    }
  }

  private showDisabledBanner(): void {
    const banner = document.getElementById('disabledBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  private hideDisabledBanner(): void {
    const banner = document.getElementById('disabledBanner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  private async enablePlugin(): Promise<void> {
    if (!this.currentConfig || !this.currentConfig[0]) return;

    try {
      homebridge.spinner.show();
      
      this.currentConfig[0].disablePlugin = false;
      await homebridge.updatePluginConfig(this.currentConfig);
      
      this.hideDisabledBanner();
      homebridge.toast.success('Plugin enabled successfully!', 'Success');
      
    } catch (error) {
      homebridge.toast.error('Failed to enable plugin: ' + (error as Error).message, 'Error');
    } finally {
      homebridge.spinner.hide();
    }
  }

  private showError(message: string): void {
    console.error(message);
    homebridge.toast.error(message, 'Error');
  }
}

// Attach to global scope for browser compatibility
(globalThis as any).DynamicAirUI = DynamicAirUI;