/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * config-wizard.ts: Setup wizard for @homebridge-plugins/homebridge-air.
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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

declare var homebridge: any;

interface Window {
  configValidator: ConfigValidator;
  configWizard: ConfigWizard;
  dynamicAirUI: DynamicAirUI;
}



interface WizardData {
  provider?: 'airnow' | 'aqicn';
  apiKey?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  refreshRate?: number;
}

/**
 * Configuration Wizard
 * Provides a guided setup flow for new users
 */
class ConfigWizard {
  private currentStep: number;
  private maxSteps: number;
  private wizardData: WizardData;
  private validator: ConfigValidator;

  constructor() {
    this.currentStep = 0;
    this.maxSteps = 4;
    this.wizardData = {};
    this.validator = window.configValidator || new ConfigValidator();
  }

  /**
   * Start the configuration wizard
   */
  start(): void {
    this.createWizardContainer();
    this.showStep(0);
  }

  /**
   * Create the wizard container HTML
   */
  private createWizardContainer(): void {
    const existingWizard = document.getElementById('configWizard');
    if (existingWizard) {
      existingWizard.remove();
    }

    const wizardHTML = `
      <div id="configWizard" class="card mt-4" style="display: none;">
        <div class="card-header">
          <h5 class="card-title mb-0">Air Quality Plugin Setup Wizard</h5>
          <div class="progress mt-2" style="height: 6px;">
            <div class="progress-bar" role="progressbar" style="width: 25%"></div>
          </div>
        </div>
        <div class="card-body">
          <div id="wizardContent"></div>
          <div class="d-flex justify-content-between mt-4">
            <button type="button" class="btn btn-secondary" id="wizardPrevious" disabled>Previous</button>
            <span id="wizardStepIndicator" class="align-self-center text-muted">Step 1 of 4</span>
            <button type="button" class="btn btn-primary" id="wizardNext">Next</button>
          </div>
        </div>
      </div>
    `;

    // Insert after the intro section
    const introDiv = document.getElementById('pageIntro');
    if (introDiv) {
      introDiv.insertAdjacentHTML('afterend', wizardHTML);
    }

    this.setupWizardEventListeners();
  }

  /**
   * Setup event listeners for wizard navigation
   */
  private setupWizardEventListeners(): void {
    const prevButton = document.getElementById('wizardPrevious');
    const nextButton = document.getElementById('wizardNext');

    prevButton?.addEventListener('click', () => {
      this.previousStep();
    });

    nextButton?.addEventListener('click', () => {
      this.nextStep();
    });
  }

  /**
   * Show a specific wizard step
   * @param stepIndex - Step index to show
   */
  private showStep(stepIndex: number): void {
    this.currentStep = stepIndex;
    const content = document.getElementById('wizardContent');
    const progressBar = document.querySelector('#configWizard .progress-bar') as HTMLElement;
    const stepIndicator = document.getElementById('wizardStepIndicator');
    const prevButton = document.getElementById('wizardPrevious') as HTMLButtonElement;
    const nextButton = document.getElementById('wizardNext') as HTMLButtonElement;

    if (!content || !progressBar || !stepIndicator || !prevButton || !nextButton) {
      return;
    }

    // Update progress
    const progress = ((stepIndex + 1) / this.maxSteps) * 100;
    progressBar.style.width = `${progress}%`;
    stepIndicator.textContent = `Step ${stepIndex + 1} of ${this.maxSteps}`;

    // Update navigation buttons
    prevButton.disabled = stepIndex === 0;
    nextButton.textContent = stepIndex === this.maxSteps - 1 ? 'Finish' : 'Next';

    // Show the wizard
    const wizard = document.getElementById('configWizard');
    if (wizard) {
      wizard.style.display = 'block';
    }

    // Load step content
    switch (stepIndex) {
      case 0:
        this.showWelcomeStep(content);
        break;
      case 1:
        this.showProviderStep(content);
        break;
      case 2:
        this.showLocationStep(content);
        break;
      case 3:
        this.showSummaryStep(content);
        break;
    }
  }

  /**
   * Show welcome step
   */
  private showWelcomeStep(container: HTMLElement): void {
    container.innerHTML = `
      <div class="text-center">
        <h4>Welcome to Air Quality Plugin!</h4>
        <p class="lead">This wizard will help you set up your air quality monitoring in just a few simple steps.</p>
        <div class="row mt-4">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h5>AirNow</h5>
                <p>Official U.S. government air quality data</p>
                <small class="text-muted">Recommended for U.S. locations</small>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h5>AQICN</h5>
                <p>Global air quality data network</p>
                <small class="text-muted">Recommended for international locations</small>
              </div>
            </div>
          </div>
        </div>
        <p class="mt-4">Click "Next" to begin the setup process.</p>
      </div>
    `;
  }

  /**
   * Show provider selection step
   */
  private showProviderStep(container: HTMLElement): void {
    container.innerHTML = `
      <div>
        <h4>Choose Your Air Quality Provider</h4>
        <p>Select the data provider that best suits your location and needs.</p>
        
        <div class="form-group">
          <label class="form-label">Provider</label>
          <div class="row">
            <div class="col-md-6">
              <div class="card provider-card" data-provider="airnow">
                <div class="card-body">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="provider" id="providerAirnow" value="airnow" ${this.wizardData.provider === 'airnow' ? 'checked' : ''}>
                    <label class="form-check-label" for="providerAirnow">
                      <h5>AirNow</h5>
                    </label>
                  </div>
                  <p class="small mt-2">
                    Official U.S. government air quality data from the EPA. 
                    Best for locations within the United States.
                  </p>
                  <ul class="small">
                    <li>Real-time AQI data</li>
                    <li>Official EPA measurements</li>
                    <li>U.S. locations only</li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card provider-card" data-provider="aqicn">
                <div class="card-body">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="provider" id="providerAqicn" value="aqicn" ${this.wizardData.provider === 'aqicn' ? 'checked' : ''}>
                    <label class="form-check-label" for="providerAqicn">
                      <h5>AQICN (WAQI)</h5>
                    </label>
                  </div>
                  <p class="small mt-2">
                    Global air quality data from the World Air Quality Index project. 
                    Best for international locations.
                  </p>
                  <ul class="small">
                    <li>Worldwide coverage</li>
                    <li>Multiple data sources</li>
                    <li>Free API tier available</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4" id="apiKeySection" style="display: ${this.wizardData.provider ? 'block' : 'none'};">
          <label for="wizardApiKey" class="form-label">API Key</label>
          <input type="text" class="form-control" id="wizardApiKey" 
                 placeholder="Enter your API key" 
                 value="${this.wizardData.apiKey || ''}">
          <div id="wizardApiKey-feedback" class="feedback"></div>
          <div class="mt-2">
            <small class="text-muted" id="apiKeyHelp">
              Get your API key from the provider website.
            </small>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="testApiKey">Test API Key</button>
        </div>
      </div>
    `;

    this.setupProviderStepListeners();
  }

  /**
   * Setup event listeners for provider step
   */
  private setupProviderStepListeners(): void {
    // Provider selection
    const providerRadios = document.querySelectorAll('input[name="provider"]');
    providerRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.provider = target.value as 'airnow' | 'aqicn';
        this.updateApiKeySection();
        this.updateProviderCards();
      });
    });

    // Provider cards clickable
    const providerCards = document.querySelectorAll('.provider-card');
    providerCards.forEach(card => {
      card.addEventListener('click', () => {
        const provider = (card as HTMLElement).dataset.provider as 'airnow' | 'aqicn';
        const radio = document.getElementById(`provider${provider.charAt(0).toUpperCase() + provider.slice(1)}`) as HTMLInputElement;
        if (radio) {
          radio.checked = true;
          this.wizardData.provider = provider;
          this.updateApiKeySection();
          this.updateProviderCards();
        }
      });
    });

    // API key input
    const apiKeyInput = document.getElementById('wizardApiKey') as HTMLInputElement;
    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.apiKey = target.value;
        this.validateApiKey();
      });

      apiKeyInput.addEventListener('blur', () => {
        this.validateApiKey();
      });
    }

    // Test API key button
    const testButton = document.getElementById('testApiKey');
    if (testButton) {
      testButton.addEventListener('click', () => {
        this.testApiKey();
      });
    }

    // Initial setup
    this.updateProviderCards();
    this.updateApiKeySection();
  }

  /**
   * Update API key section visibility and help text
   */
  private updateApiKeySection(): void {
    const section = document.getElementById('apiKeySection');
    const helpText = document.getElementById('apiKeyHelp');

    if (!section || !helpText || !this.wizardData.provider) return;

    section.style.display = 'block';

    if (this.wizardData.provider === 'airnow') {
      helpText.innerHTML = `
        Get your free API key from <a href="https://www.airnowapi.org/account/request/" target="_blank">AirNow API</a>.
        The API key should be at least 10 characters long.
      `;
    } else {
      helpText.innerHTML = `
        Get your free API key from <a href="https://aqicn.org/data-platform/token/" target="_blank">AQICN</a>.
        The API key should be at least 10 characters long.
      `;
    }
  }

  /**
   * Update provider card visual state
   */
  private updateProviderCards(): void {
    const cards = document.querySelectorAll('.provider-card');
    cards.forEach(card => {
      const cardElement = card as HTMLElement;
      const provider = cardElement.dataset.provider;
      if (provider === this.wizardData.provider) {
        cardElement.classList.add('border-primary');
        cardElement.style.backgroundColor = '#f8f9fa';
      } else {
        cardElement.classList.remove('border-primary');
        cardElement.style.backgroundColor = '';
      }
    });
  }

  /**
   * Validate API key input
   */
  private validateApiKey(): void {
    if (!this.wizardData.apiKey) return;

    const result = this.validator.validateField('apiKey', this.wizardData.apiKey);
    this.validator.updateFieldFeedback('wizardApiKey', result);
  }

  /**
   * Test API key with the selected provider
   */
  private async testApiKey(): Promise<void> {
    if (!this.wizardData.provider || !this.wizardData.apiKey) {
      homebridge.toast.error('Please select a provider and enter an API key first', 'Missing Information');
      return;
    }

    const testButton = document.getElementById('testApiKey') as HTMLButtonElement;
    if (!testButton) return;

    const originalText = testButton.textContent;
    testButton.textContent = 'Testing...';
    testButton.disabled = true;

    try {
      const response = await homebridge.request('POST', '/testApiKey', {
        provider: this.wizardData.provider,
        apiKey: this.wizardData.apiKey
      });

      if (response.success) {
        homebridge.toast.success('API key is valid and working!', 'Test Successful');
        const field = document.getElementById('wizardApiKey');
        if (field) {
          field.classList.remove('is-invalid');
          field.classList.add('is-valid');
        }
      } else {
        homebridge.toast.error(response.message || 'API key test failed', 'Test Failed');
        const field = document.getElementById('wizardApiKey');
        if (field) {
          field.classList.remove('is-valid');
          field.classList.add('is-invalid');
        }
      }
    } catch (error) {
      console.error('API key test error:', error);
      homebridge.toast.error('Failed to test API key. Please check your connection.', 'Test Error');
    } finally {
      testButton.textContent = originalText;
      testButton.disabled = false;
    }
  }

  /**
   * Show location configuration step
   */
  private showLocationStep(container: HTMLElement): void {
    container.innerHTML = `
      <div>
        <h4>Configure Your Location</h4>
        <p>Choose how you want to specify your location for air quality monitoring.</p>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5>GPS Coordinates</h5>
                <p class="small">Most accurate method for precise location tracking.</p>
                <button type="button" class="btn btn-primary btn-sm mb-2" id="getCurrentLocation">
                  <i class="fas fa-location-arrow me-1"></i>Use Current Location
                </button>
                <div class="mb-2">
                  <label for="wizardLatitude" class="form-label">Latitude:</label>
                  <input type="number" class="form-control" id="wizardLatitude" 
                         placeholder="40.7128" step="any" 
                         value="${this.wizardData.latitude || ''}">
                  <div id="wizardLatitude-feedback" class="feedback"></div>
                </div>
                <div class="mb-2">
                  <label for="wizardLongitude" class="form-label">Longitude:</label>
                  <input type="number" class="form-control" id="wizardLongitude" 
                         placeholder="-74.0060" step="any"
                         value="${this.wizardData.longitude || ''}">
                  <div id="wizardLongitude-feedback" class="feedback"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5>Address Information</h5>
                <p class="small">Alternative methods for location specification.</p>
                
                <div class="mb-3">
                  <label for="wizardZipCode" class="form-label">ZIP Code:</label>
                  <input type="text" class="form-control" id="wizardZipCode" 
                         placeholder="12345" 
                         value="${this.wizardData.zipCode || ''}">
                  <div id="wizardZipCode-feedback" class="feedback"></div>
                  <small class="text-muted">Recommended for AirNow (U.S. only)</small>
                </div>
                
                <div class="mb-3">
                  <label for="wizardCity" class="form-label">City:</label>
                  <input type="text" class="form-control" id="wizardCity" 
                         placeholder="New York" 
                         value="${this.wizardData.city || ''}">
                  <div id="wizardCity-feedback" class="feedback"></div>
                  <small class="text-muted">Supported by AQICN</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-3">
          <div class="alert alert-info">
            <small>
              <strong>Tip:</strong> You only need to provide one location method. 
              GPS coordinates are most accurate, while ZIP codes work well for AirNow in the U.S.
            </small>
          </div>
        </div>
        
        <div class="mt-3">
          <label for="wizardRefreshRate" class="form-label">Refresh Rate (seconds):</label>
          <select class="form-control" id="wizardRefreshRate">
            <option value="1800" ${this.wizardData.refreshRate === 1800 ? 'selected' : ''}>30 minutes (recommended)</option>
            <option value="3600" ${this.wizardData.refreshRate === 3600 ? 'selected' : ''}>1 hour</option>
            <option value="7200" ${this.wizardData.refreshRate === 7200 ? 'selected' : ''}>2 hours</option>
            <option value="21600" ${this.wizardData.refreshRate === 21600 ? 'selected' : ''}>6 hours</option>
            <option value="43200" ${this.wizardData.refreshRate === 43200 ? 'selected' : ''}>12 hours</option>
          </select>
          <small class="text-muted">How often to update air quality data</small>
        </div>
      </div>
    `;

    this.setupLocationStepListeners();
  }

  /**
   * Setup event listeners for location step
   */
  private setupLocationStepListeners(): void {
    // Current location button
    const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
    if (getCurrentLocationBtn) {
      getCurrentLocationBtn.addEventListener('click', () => {
        this.getCurrentLocation();
      });
    }

    // Coordinate inputs
    const latInput = document.getElementById('wizardLatitude') as HTMLInputElement;
    const lngInput = document.getElementById('wizardLongitude') as HTMLInputElement;

    if (latInput) {
      latInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.latitude = target.value ? Number(target.value) : undefined;
        this.validateCoordinates();
      });
    }

    if (lngInput) {
      lngInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.longitude = target.value ? Number(target.value) : undefined;
        this.validateCoordinates();
      });
    }

    // ZIP code input
    const zipInput = document.getElementById('wizardZipCode') as HTMLInputElement;
    if (zipInput) {
      zipInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.zipCode = target.value;
        this.validateZipCode();
      });
    }

    // City input
    const cityInput = document.getElementById('wizardCity') as HTMLInputElement;
    if (cityInput) {
      cityInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.wizardData.city = target.value;
        this.validateCity();
      });
    }

    // Refresh rate select
    const refreshSelect = document.getElementById('wizardRefreshRate') as HTMLSelectElement;
    if (refreshSelect) {
      refreshSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.wizardData.refreshRate = Number(target.value);
      });
    }

    // Set default refresh rate if not set
    if (!this.wizardData.refreshRate) {
      this.wizardData.refreshRate = 1800;
    }
  }

  /**
   * Get current GPS location
   */
  private getCurrentLocation(): void {
    if (!navigator.geolocation) {
      homebridge.toast.error('Geolocation is not supported by this browser', 'Location Error');
      return;
    }

    const button = document.getElementById('getCurrentLocation') as HTMLButtonElement;
    if (!button) return;

    const originalText = button.textContent;
    button.textContent = 'Getting location...';
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.wizardData.latitude = lat;
        this.wizardData.longitude = lng;

        const latInput = document.getElementById('wizardLatitude') as HTMLInputElement;
        const lngInput = document.getElementById('wizardLongitude') as HTMLInputElement;

        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);

        this.validateCoordinates();
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

  /**
   * Validate coordinate inputs
   */
  private validateCoordinates(): void {
    if (this.wizardData.latitude !== undefined) {
      const latResult = this.validator.validateField('latitude', this.wizardData.latitude);
      this.validator.updateFieldFeedback('wizardLatitude', latResult);
    }

    if (this.wizardData.longitude !== undefined) {
      const lngResult = this.validator.validateField('longitude', this.wizardData.longitude);
      this.validator.updateFieldFeedback('wizardLongitude', lngResult);
    }
  }

  /**
   * Validate ZIP code input
   */
  private validateZipCode(): void {
    if (this.wizardData.zipCode) {
      const result = this.validator.validateField('zipCode', this.wizardData.zipCode);
      this.validator.updateFieldFeedback('wizardZipCode', result);
    }
  }

  /**
   * Validate city input
   */
  private validateCity(): void {
    if (this.wizardData.city) {
      const result = this.validator.validateField('city', this.wizardData.city);
      this.validator.updateFieldFeedback('wizardCity', result);
    }
  }

  /**
   * Show configuration summary step
   */
  private showSummaryStep(container: HTMLElement): void {
    const providerName = this.wizardData.provider === 'airnow' ? 'AirNow' : 'AQICN (WAQI)';
    
    let locationText = 'Not specified';
    if (this.wizardData.latitude && this.wizardData.longitude) {
      locationText = `GPS: ${this.wizardData.latitude.toFixed(4)}, ${this.wizardData.longitude.toFixed(4)}`;
    } else if (this.wizardData.zipCode) {
      locationText = `ZIP Code: ${this.wizardData.zipCode}`;
    } else if (this.wizardData.city) {
      locationText = `City: ${this.wizardData.city}`;
    }

    const refreshText = this.wizardData.refreshRate ? 
      `${this.wizardData.refreshRate / 60} minutes` : '30 minutes';

    container.innerHTML = `
      <div>
        <h4>Configuration Summary</h4>
        <p>Please review your configuration before finishing the setup.</p>
        
        <div class="card">
          <div class="card-body">
            <h5>Configuration Details</h5>
            <table class="table table-borderless">
              <tr>
                <td><strong>Provider:</strong></td>
                <td>${providerName}</td>
              </tr>
              <tr>
                <td><strong>API Key:</strong></td>
                <td>${this.wizardData.apiKey ? '●●●●●●●●' + this.wizardData.apiKey.slice(-4) : 'Not provided'}</td>
              </tr>
              <tr>
                <td><strong>Location:</strong></td>
                <td>${locationText}</td>
              </tr>
              <tr>
                <td><strong>Refresh Rate:</strong></td>
                <td>${refreshText}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="mt-3">
          <div class="alert alert-success">
            <h6>Ready to Save!</h6>
            <p class="mb-0">
              Your configuration looks good. Click "Finish" to save the settings and start monitoring air quality.
            </p>
          </div>
        </div>
        
        <div id="configValidation" class="mt-3" style="display: none;">
          <div class="alert alert-danger">
            <h6>Configuration Issues</h6>
            <ul id="validationErrors" class="mb-0"></ul>
          </div>
        </div>
      </div>
    `;

    this.validateFinalConfiguration();
  }

  /**
   * Validate the final configuration
   */
  private validateFinalConfiguration(): void {
    const configToValidate: Partial<HomebridgeConfig> = {
      provider: this.wizardData.provider,
      apiKey: this.wizardData.apiKey,
      latitude: this.wizardData.latitude,
      longitude: this.wizardData.longitude,
      zipCode: this.wizardData.zipCode,
      city: this.wizardData.city,
      refreshRate: this.wizardData.refreshRate
    };

    const generalValidation = this.validator.validateConfig(configToValidate);
    const providerValidation = this.wizardData.provider ? 
      this.validator.validateProviderRequirements(this.wizardData.provider, configToValidate) : 
      { isValid: false, errors: ['No provider selected'] };

    const allErrors = [...generalValidation.errors, ...providerValidation.errors];
    const isValid = allErrors.length === 0;

    const validationDiv = document.getElementById('configValidation');
    const errorsList = document.getElementById('validationErrors');
    const nextButton = document.getElementById('wizardNext') as HTMLButtonElement;

    if (validationDiv && errorsList && nextButton) {
      if (!isValid) {
        validationDiv.style.display = 'block';
        errorsList.innerHTML = allErrors.map(error => `<li>${error}</li>`).join('');
        nextButton.disabled = true;
      } else {
        validationDiv.style.display = 'none';
        nextButton.disabled = false;
      }
    }
  }

  /**
   * Move to the next step
   */
  private nextStep(): void {
    if (this.currentStep < this.maxSteps - 1) {
      // Validate current step before proceeding
      if (this.validateCurrentStep()) {
        this.showStep(this.currentStep + 1);
      }
    } else {
      // Final step - save configuration
      this.finishWizard();
    }
  }

  /**
   * Move to the previous step
   */
  private previousStep(): void {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Validate the current step
   */
  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0:
        return true; // Welcome step always valid
      case 1:
        // Provider step validation
        if (!this.wizardData.provider) {
          homebridge.toast.error('Please select a provider', 'Missing Information');
          return false;
        }
        if (!this.wizardData.apiKey || this.wizardData.apiKey.trim() === '') {
          homebridge.toast.error('Please enter an API key', 'Missing Information');
          return false;
        }
        const apiKeyValidation = this.validator.validateField('apiKey', this.wizardData.apiKey);
        if (!apiKeyValidation.isValid) {
          homebridge.toast.error(apiKeyValidation.errors.join('. '), 'Invalid API Key');
          return false;
        }
        return true;
      case 2:
        // Location step validation
        const hasCoords = this.wizardData.latitude !== undefined && this.wizardData.longitude !== undefined;
        const hasZip = this.wizardData.zipCode && this.wizardData.zipCode.trim() !== '';
        const hasCity = this.wizardData.city && this.wizardData.city.trim() !== '';
        
        if (!hasCoords && !hasZip && !hasCity) {
          homebridge.toast.error('Please provide at least one location method', 'Missing Location');
          return false;
        }
        return true;
      case 3:
        return true; // Summary step - validation already done
      default:
        return true;
    }
  }

  /**
   * Finish the wizard and save configuration
   */
  private async finishWizard(): Promise<void> {
    try {
      homebridge.spinner.show();

      // Get current config
      const currentConfig = await homebridge.getPluginConfig();
      
      // Create device configuration
      const deviceConfig: DeviceConfig = {
        name: 'Air Quality Sensor',
        provider: this.wizardData.provider!,
        apiKey: this.wizardData.apiKey!,
        refreshRate: this.wizardData.refreshRate || 1800
      };

      // Add location information
      if (this.wizardData.latitude && this.wizardData.longitude) {
        deviceConfig.latitude = this.wizardData.latitude;
        deviceConfig.longitude = this.wizardData.longitude;
      }
      if (this.wizardData.zipCode) {
        deviceConfig.zipCode = this.wizardData.zipCode;
      }
      if (this.wizardData.city) {
        deviceConfig.city = this.wizardData.city;
      }

      // Create or update platform configuration
      let platformConfig: HomebridgeConfig;
      if (currentConfig.length > 0) {
        platformConfig = currentConfig[0];
        platformConfig.devices = platformConfig.devices || [];
        platformConfig.devices.push(deviceConfig);
      } else {
        platformConfig = {
          name: 'Air',
          platform: '@homebridge-plugins/homebridge-air.Air',
          devices: [deviceConfig]
        };
      }

      // Save configuration
      await homebridge.updatePluginConfig([platformConfig]);
      
      homebridge.spinner.hide();
      homebridge.toast.success('Configuration saved successfully!', 'Setup Complete');

      // Hide wizard and show main interface
      const wizard = document.getElementById('configWizard');
      if (wizard) {
        wizard.style.display = 'none';
      }

      // Refresh the main UI
      if (window.dynamicAirUI) {
        await window.dynamicAirUI.loadConfig();
        window.dynamicAirUI.initializeUI();
      }

    } catch (error) {
      homebridge.spinner.hide();
      console.error('Failed to save configuration:', error);
      homebridge.toast.error('Failed to save configuration. Please try again.', 'Save Error');
    }
  }

  /**
   * Cancel the wizard
   */
  cancel(): void {
    const wizard = document.getElementById('configWizard');
    if (wizard) {
      wizard.style.display = 'none';
    }

    // Show intro if no configuration exists
    const intro = document.getElementById('pageIntro');
    if (intro) {
      intro.style.display = 'block';
    }
  }
}

// Attach to global scope for browser compatibility
(globalThis as any).ConfigWizard = ConfigWizard;