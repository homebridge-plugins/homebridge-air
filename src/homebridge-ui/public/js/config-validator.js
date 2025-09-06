/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * config-validator.js: Configuration validation for @homebridge-plugins/homebridge-air.
 */

/**
 * Dynamic Configuration Validator
 * Provides real-time validation and feedback for configuration forms
 */
class ConfigValidator {
  constructor() {
    this.validationRules = {
      apiKey: {
        required: true,
        minLength: 10,
        pattern: /^[a-zA-Z0-9-_]+$/,
        message: 'API Key must be at least 10 characters and contain only letters, numbers, hyphens, and underscores'
      },
      latitude: {
        required: false,
        pattern: /^-?([0-8]?[0-9](\.[0-9]+)?|90(\.0+)?)$/,
        message: 'Latitude must be a valid coordinate between -90 and 90'
      },
      longitude: {
        required: false,
        pattern: /^-?((1[0-7][0-9]|[0-9]?[0-9])(\.[0-9]+)?|180(\.0+)?)$/,
        message: 'Longitude must be a valid coordinate between -180 and 180'
      },
      zipCode: {
        required: false,
        pattern: /^\d{5}(-\d{4})?$/,
        message: 'ZIP Code must be in format 12345 or 12345-6789'
      },
      city: {
        required: false,
        minLength: 2,
        pattern: /^[a-zA-Z\s\-']+$/,
        message: 'City name must contain only letters, spaces, hyphens, and apostrophes'
      },
      refreshRate: {
        required: false,
        min: 1800,
        max: 86400,
        message: 'Refresh rate must be between 1800 (30 minutes) and 86400 (24 hours) seconds'
      }
    };
  }

  /**
   * Validate a single field
   * @param {string} fieldName - Name of the field to validate
   * @param {any} value - Value to validate
   * @returns {Object} Validation result with isValid and message
   */
  validateField(fieldName, value) {
    const rules = this.validationRules[fieldName];
    if (!rules) {
      return { isValid: true, message: '' };
    }

    // Check if required
    if (rules.required && (!value || value.toString().trim() === '')) {
      return { isValid: false, message: `${fieldName} is required` };
    }

    // If not required and empty, it's valid
    if (!rules.required && (!value || value.toString().trim() === '')) {
      return { isValid: true, message: '' };
    }

    const stringValue = value.toString().trim();

    // Check minimum length
    if (rules.minLength && stringValue.length < rules.minLength) {
      return { isValid: false, message: rules.message || `Minimum length is ${rules.minLength}` };
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return { isValid: false, message: rules.message || 'Invalid format' };
    }

    // Check numeric range
    if (rules.min !== undefined || rules.max !== undefined) {
      const numValue = parseFloat(stringValue);
      if (isNaN(numValue)) {
        return { isValid: false, message: 'Must be a valid number' };
      }
      if (rules.min !== undefined && numValue < rules.min) {
        return { isValid: false, message: rules.message || `Minimum value is ${rules.min}` };
      }
      if (rules.max !== undefined && numValue > rules.max) {
        return { isValid: false, message: rules.message || `Maximum value is ${rules.max}` };
      }
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validate an entire configuration object
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result with overall validity and field-specific messages
   */
  validateConfig(config) {
    const results = {};
    let isValid = true;

    if (config.devices && Array.isArray(config.devices)) {
      config.devices.forEach((device, index) => {
        results[`device_${index}`] = this.validateDevice(device);
        if (!results[`device_${index}`].isValid) {
          isValid = false;
        }
      });
    }

    // Validate global settings
    if (config.refreshRate !== undefined) {
      results.refreshRate = this.validateField('refreshRate', config.refreshRate);
      if (!results.refreshRate.isValid) isValid = false;
    }

    return { isValid, results };
  }

  /**
   * Validate a device configuration
   * @param {Object} device - Device configuration to validate
   * @returns {Object} Validation result
   */
  validateDevice(device) {
    const fields = ['apiKey', 'latitude', 'longitude', 'zipCode', 'city', 'refreshRate'];
    const results = {};
    let isValid = true;

    fields.forEach(field => {
      if (device[field] !== undefined) {
        results[field] = this.validateField(field, device[field]);
        if (!results[field].isValid) {
          isValid = false;
        }
      }
    });

    // Special validation: require either lat/lng OR city/zip
    const hasCoords = device.latitude && device.longitude;
    const hasLocation = device.city || device.zipCode;

    if (!hasCoords && !hasLocation) {
      results.location = {
        isValid: false,
        message: 'Either latitude/longitude or city/ZIP code is required'
      };
      isValid = false;
    }

    return { isValid, results };
  }

  /**
   * Add real-time validation to form fields
   * @param {string} formSelector - CSS selector for the form
   */
  addRealTimeValidation(formSelector = 'form') {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      field.addEventListener('blur', () => this.validateAndDisplayField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
  }

  /**
   * Validate a form field and display results
   * @param {HTMLElement} field - Form field element
   */
  validateAndDisplayField(field) {
    const fieldName = this.getFieldName(field);
    const value = field.value;
    const result = this.validateField(fieldName, value);

    this.displayFieldValidation(field, result);
  }

  /**
   * Get the validation field name from a form element
   * @param {HTMLElement} field - Form field element
   * @returns {string} Field name for validation
   */
  getFieldName(field) {
    // Map form field names to validation field names
    const nameMap = {
      'api-key': 'apiKey',
      'zip-code': 'zipCode',
      'refresh-rate': 'refreshRate'
    };

    const name = field.name || field.id;
    return nameMap[name] || name;
  }

  /**
   * Display validation result for a field
   * @param {HTMLElement} field - Form field element
   * @param {Object} result - Validation result
   */
  displayFieldValidation(field, result) {
    this.clearFieldError(field);

    if (!result.isValid) {
      field.classList.add('is-invalid');
      
      // Create or update error message
      let errorElement = field.parentElement.querySelector('.invalid-feedback');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        field.parentElement.appendChild(errorElement);
      }
      errorElement.textContent = result.message;
    } else {
      field.classList.add('is-valid');
    }
  }

  /**
   * Clear validation display for a field
   * @param {HTMLElement} field - Form field element
   */
  clearFieldError(field) {
    field.classList.remove('is-invalid', 'is-valid');
    const errorElement = field.parentElement.querySelector('.invalid-feedback');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Test API key connectivity
   * @param {string} provider - Provider name (airnow or aqicn)
   * @param {string} apiKey - API key to test
   * @param {Object} location - Location data for testing
   * @returns {Promise<Object>} Test result
   */
  async testApiConnection(provider, apiKey, location = {}) {
    try {
      // This would typically make a request to the plugin's test endpoint
      const response = await homebridge.request('/testApiKey', {
        provider,
        apiKey,
        ...location
      });

      return {
        success: true,
        message: 'API key is valid and working',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to test API key',
        error
      };
    }
  }
}

// Export for use in other modules
window.ConfigValidator = ConfigValidator;