/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * config-wizard.js: Setup wizard for @homebridge-plugins/homebridge-air.
 */

/**
 * Configuration Wizard
 * Provides a guided setup flow for new users
 */
class ConfigWizard {
  constructor() {
    this.currentStep = 0;
    this.maxSteps = 4;
    this.wizardData = {};
    this.validator = new ConfigValidator();
  }

  /**
   * Start the configuration wizard
   */
  start() {
    this.createWizardContainer();
    this.showStep(0);
  }

  /**
   * Create the wizard container HTML
   */
  createWizardContainer() {
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
  setupWizardEventListeners() {
    document.getElementById('wizardPrevious').addEventListener('click', () => {
      this.previousStep();
    });

    document.getElementById('wizardNext').addEventListener('click', () => {
      this.nextStep();
    });
  }

  /**
   * Show a specific wizard step
   * @param {number} stepIndex - Step index to show
   */
  showStep(stepIndex) {
    this.currentStep = stepIndex;
    const content = document.getElementById('wizardContent');
    const progressBar = document.querySelector('#configWizard .progress-bar');
    const stepIndicator = document.getElementById('wizardStepIndicator');
    const prevButton = document.getElementById('wizardPrevious');
    const nextButton = document.getElementById('wizardNext');

    // Update progress
    const progress = ((stepIndex + 1) / this.maxSteps) * 100;
    progressBar.style.width = `${progress}%`;
    stepIndicator.textContent = `Step ${stepIndex + 1} of ${this.maxSteps}`;

    // Update navigation buttons
    prevButton.disabled = stepIndex === 0;
    nextButton.textContent = stepIndex === this.maxSteps - 1 ? 'Finish' : 'Next';

    // Show the wizard
    document.getElementById('configWizard').style.display = 'block';

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
  showWelcomeStep(container) {
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
  showProviderStep(container) {
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

        <div class="form-group mt-4">
          <label for="wizardApiKey" class="form-label">API Key *</label>
          <input type="text" class="form-control" id="wizardApiKey" placeholder="Enter your API key" value="${this.wizardData.apiKey || ''}">
          <div class="form-text">
            <span id="apiKeyHelp">Select a provider to see instructions for obtaining an API key.</span>
          </div>
        </div>

        <div class="alert alert-info mt-3" id="apiKeyInstructions" style="display: none;">
          <div id="instructionContent"></div>
        </div>
      </div>
    `;

    this.setupProviderStepListeners();
  }

  /**
   * Setup listeners for provider step
   */
  setupProviderStepListeners() {
    const providerRadios = document.querySelectorAll('input[name="provider"]');
    const apiKeyField = document.getElementById('wizardApiKey');
    const instructions = document.getElementById('apiKeyInstructions');
    const instructionContent = document.getElementById('instructionContent');

    providerRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.wizardData.provider = radio.value;
        this.updateApiKeyInstructions(radio.value, instructionContent, instructions);
        
        // Update card selection visual
        document.querySelectorAll('.provider-card').forEach(card => {
          card.classList.remove('border-primary');
        });
        document.querySelector(`.provider-card[data-provider="${radio.value}"]`).classList.add('border-primary');
      });
    });

    apiKeyField.addEventListener('input', () => {
      this.wizardData.apiKey = apiKeyField.value;
    });

    // Trigger initial provider selection if one is already selected
    const selectedProvider = document.querySelector('input[name="provider"]:checked');
    if (selectedProvider) {
      selectedProvider.dispatchEvent(new Event('change'));
    }
  }

  /**
   * Update API key instructions based on provider
   */
  updateApiKeyInstructions(provider, contentElement, instructionsElement) {
    let instructions = '';

    if (provider === 'airnow') {
      instructions = `
        <h6>Getting your AirNow API Key:</h6>
        <ol>
          <li>Visit <a href="https://docs.airnowapi.org/faq" target="_blank">AirNow API Documentation</a></li>
          <li>Click "Request an API Key"</li>
          <li>Fill out the application form</li>
          <li>Wait for approval (usually 1-2 business days)</li>
          <li>Copy your API key from the email or dashboard</li>
        </ol>
      `;
    } else if (provider === 'aqicn') {
      instructions = `
        <h6>Getting your AQICN API Key:</h6>
        <ol>
          <li>Visit <a href="https://aqicn.org/api/" target="_blank">AQICN API</a></li>
          <li>Click "Request API Token"</li>
          <li>Fill out the simple form</li>
          <li>Your token will be provided immediately</li>
          <li>Copy the token to use as your API key</li>
        </ol>
      `;
    }

    contentElement.innerHTML = instructions;
    instructionsElement.style.display = instructions ? 'block' : 'none';
  }

  /**
   * Show location configuration step
   */
  showLocationStep(container) {
    container.innerHTML = `
      <div>
        <h4>Configure Your Location</h4>
        <p>Choose how you want to specify your location for air quality monitoring.</p>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h5>Use Current Location</h5>
                <p class="small">Automatically detect your location using your browser's geolocation feature.</p>
                <button type="button" class="btn btn-primary" id="wizardUseLocation">Get Current Location</button>
                <div id="locationStatus" class="mt-2"></div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h5>Manual Entry</h5>
                <p class="small">Enter your location manually using coordinates or address.</p>
                <div class="form-group">
                  <label>Method</label>
                  <select class="form-control" id="locationMethod">
                    <option value="coordinates">Latitude/Longitude</option>
                    <option value="address">City/ZIP Code</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4" id="coordinatesSection">
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="wizardLatitude">Latitude</label>
                <input type="number" class="form-control" id="wizardLatitude" step="any" placeholder="40.7128" value="${this.wizardData.latitude || ''}">
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label for="wizardLongitude">Longitude</label>
                <input type="number" class="form-control" id="wizardLongitude" step="any" placeholder="-74.0060" value="${this.wizardData.longitude || ''}">
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4" id="addressSection" style="display: none;">
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="wizardCity">City</label>
                <input type="text" class="form-control" id="wizardCity" placeholder="New York" value="${this.wizardData.city || ''}">
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label for="wizardState">State</label>
                <input type="text" class="form-control" id="wizardState" placeholder="NY" value="${this.wizardData.state || ''}">
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label for="wizardZipCode">ZIP Code</label>
                <input type="text" class="form-control" id="wizardZipCode" placeholder="10001" value="${this.wizardData.zipCode || ''}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupLocationStepListeners();
  }

  /**
   * Setup listeners for location step
   */
  setupLocationStepListeners() {
    const useLocationBtn = document.getElementById('wizardUseLocation');
    const locationMethod = document.getElementById('locationMethod');
    const coordinatesSection = document.getElementById('coordinatesSection');
    const addressSection = document.getElementById('addressSection');

    useLocationBtn.addEventListener('click', () => {
      this.getCurrentLocation();
    });

    locationMethod.addEventListener('change', () => {
      if (locationMethod.value === 'coordinates') {
        coordinatesSection.style.display = 'block';
        addressSection.style.display = 'none';
      } else {
        coordinatesSection.style.display = 'none';
        addressSection.style.display = 'block';
      }
    });

    // Add input listeners to save data
    ['wizardLatitude', 'wizardLongitude', 'wizardCity', 'wizardState', 'wizardZipCode'].forEach(id => {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener('input', () => {
          const key = id.replace('wizard', '').toLowerCase();
          this.wizardData[key] = field.value;
        });
      }
    });
  }

  /**
   * Get current location using geolocation API
   */
  getCurrentLocation() {
    const statusDiv = document.getElementById('locationStatus');
    statusDiv.innerHTML = '<span class="text-info">Getting location...</span>';

    if (!navigator.geolocation) {
      statusDiv.innerHTML = '<span class="text-danger">Geolocation not supported by this browser</span>';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.wizardData.latitude = position.coords.latitude;
        this.wizardData.longitude = position.coords.longitude;
        
        document.getElementById('wizardLatitude').value = this.wizardData.latitude;
        document.getElementById('wizardLongitude').value = this.wizardData.longitude;
        
        statusDiv.innerHTML = '<span class="text-success">Location detected successfully!</span>';
      },
      (error) => {
        let errorMessage = 'Error getting location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Position unavailable';
            break;
          case error.TIMEOUT:
            errorMessage += 'Request timeout';
            break;
          default:
            errorMessage += 'Unknown error';
            break;
        }
        statusDiv.innerHTML = `<span class="text-danger">${errorMessage}</span>`;
      }
    );
  }

  /**
   * Show summary step
   */
  showSummaryStep(container) {
    container.innerHTML = `
      <div>
        <h4>Configuration Summary</h4>
        <p>Please review your configuration before saving.</p>
        
        <div class="card">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Provider</h6>
                <p>${this.wizardData.provider === 'airnow' ? 'AirNow (EPA)' : 'AQICN (WAQI)'}</p>
                
                <h6>API Key</h6>
                <p class="font-monospace">${this.maskApiKey(this.wizardData.apiKey)}</p>
              </div>
              <div class="col-md-6">
                <h6>Location</h6>
                ${this.formatLocationSummary()}
              </div>
            </div>
          </div>
        </div>

        <div class="alert alert-success mt-3">
          <h6>Ready to Save!</h6>
          <p class="mb-0">Click "Finish" to save your configuration and start monitoring air quality.</p>
        </div>
      </div>
    `;
  }

  /**
   * Format location information for summary
   */
  formatLocationSummary() {
    if (this.wizardData.latitude && this.wizardData.longitude) {
      return `
        <p>
          <strong>Coordinates:</strong><br>
          Latitude: ${this.wizardData.latitude}<br>
          Longitude: ${this.wizardData.longitude}
        </p>
      `;
    } else if (this.wizardData.city || this.wizardData.zipCode) {
      return `
        <p>
          <strong>Address:</strong><br>
          ${this.wizardData.city || ''} ${this.wizardData.state || ''} ${this.wizardData.zipCode || ''}
        </p>
      `;
    } else {
      return '<p class="text-warning">No location specified</p>';
    }
  }

  /**
   * Mask API key for display
   */
  maskApiKey(apiKey) {
    if (!apiKey) return 'Not provided';
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Move to next step
   */
  async nextStep() {
    // Validate current step
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep === this.maxSteps - 1) {
      // Finish wizard
      await this.finishWizard();
    } else {
      this.showStep(this.currentStep + 1);
    }
  }

  /**
   * Move to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Validate current step before proceeding
   */
  validateCurrentStep() {
    switch (this.currentStep) {
      case 1: // Provider step
        if (!this.wizardData.provider) {
          homebridge.toast.error('Please select a provider', 'Validation Error');
          return false;
        }
        if (!this.wizardData.apiKey) {
          homebridge.toast.error('Please enter an API key', 'Validation Error');
          return false;
        }
        break;
      case 2: // Location step
        const hasCoords = this.wizardData.latitude && this.wizardData.longitude;
        const hasAddress = this.wizardData.city || this.wizardData.zipCode;
        if (!hasCoords && !hasAddress) {
          homebridge.toast.error('Please specify a location', 'Validation Error');
          return false;
        }
        break;
    }
    return true;
  }

  /**
   * Finish wizard and save configuration
   */
  async finishWizard() {
    homebridge.showSpinner();
    try {
      // Create device configuration
      const deviceConfig = {
        provider: this.wizardData.provider,
        apiKey: this.wizardData.apiKey
      };

      // Add location data
      if (this.wizardData.latitude && this.wizardData.longitude) {
        deviceConfig.latitude = parseFloat(this.wizardData.latitude);
        deviceConfig.longitude = parseFloat(this.wizardData.longitude);
      }

      if (this.wizardData.city) deviceConfig.city = this.wizardData.city;
      if (this.wizardData.state) deviceConfig.state = this.wizardData.state;
      if (this.wizardData.zipCode) deviceConfig.zipCode = this.wizardData.zipCode;

      // Update configuration
      const config = await homebridge.getPluginConfig();
      if (!config.length) {
        config.push({ name: 'Air', devices: [] });
      }

      if (!config[0].devices) {
        config[0].devices = [];
      }

      config[0].devices.push(deviceConfig);

      await homebridge.updatePluginConfig(config);
      await homebridge.savePluginConfig();

      // Hide wizard and show success
      document.getElementById('configWizard').style.display = 'none';
      homebridge.toast.success('Configuration saved successfully!', 'Setup Complete');

      // Refresh the UI
      if (window.dynamicAirUI) {
        window.dynamicAirUI.loadConfig();
        window.dynamicAirUI.showMainInterface();
      }

    } catch (error) {
      homebridge.toast.error('Failed to save configuration: ' + error.message, 'Error');
    } finally {
      homebridge.hideSpinner();
    }
  }

  /**
   * Close the wizard
   */
  close() {
    const wizard = document.getElementById('configWizard');
    if (wizard) {
      wizard.style.display = 'none';
    }
  }
}

// Export for use in other modules
window.ConfigWizard = ConfigWizard;