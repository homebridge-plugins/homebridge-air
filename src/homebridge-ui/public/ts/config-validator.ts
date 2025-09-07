/* Copyright(C) 2021-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * config-validator.ts: Configuration validation for @homebridge-plugins/homebridge-air.
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

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

declare var homebridge: any;



/**
 * Dynamic Configuration Validator
 * Provides real-time validation and feedback for configuration forms
 */
class ConfigValidator {
  private validationRules: ValidationRules;

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
   * @param fieldName - The name of the field to validate
   * @param value - The value to validate
   * @returns ValidationResult object with isValid boolean and errors array
   */
  validateField(fieldName: string, value: string | number): ValidationResult {
    const rule = this.validationRules[fieldName];
    if (!rule) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    const stringValue = String(value);

    // Check required
    if (rule.required && (!value || stringValue.trim() === '')) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    // Skip other validations if field is empty and not required
    if (!value || stringValue.trim() === '') {
      return { isValid: true, errors: [] };
    }

    // Check minimum length
    if (rule.minLength && stringValue.length < rule.minLength) {
      errors.push(rule.message);
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      errors.push(rule.message);
    }

    // Check numeric range
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const numValue = Number(value);
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push(rule.message);
      }
      if (rule.max !== undefined && numValue > rule.max) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate an entire configuration object
   * @param config - The configuration object to validate
   * @returns ValidationResult object with overall validity and all errors
   */
  validateConfig(config: Partial<HomebridgeConfig>): ValidationResult {
    const allErrors: string[] = [];

    // Validate API key if provided
    if (config.apiKey !== undefined) {
      const apiKeyResult = this.validateField('apiKey', config.apiKey);
      allErrors.push(...apiKeyResult.errors);
    }

    // Validate coordinates if provided
    if (config.latitude !== undefined) {
      const latResult = this.validateField('latitude', config.latitude);
      allErrors.push(...latResult.errors);
    }

    if (config.longitude !== undefined) {
      const lngResult = this.validateField('longitude', config.longitude);
      allErrors.push(...lngResult.errors);
    }

    // Validate ZIP code if provided
    if (config.zipCode !== undefined) {
      const zipResult = this.validateField('zipCode', config.zipCode);
      allErrors.push(...zipResult.errors);
    }

    // Validate city if provided
    if (config.city !== undefined) {
      const cityResult = this.validateField('city', config.city);
      allErrors.push(...cityResult.errors);
    }

    // Validate refresh rate if provided
    if (config.refreshRate !== undefined) {
      const refreshResult = this.validateField('refreshRate', config.refreshRate);
      allErrors.push(...refreshResult.errors);
    }

    // Check that at least one location method is provided
    const hasZip = config.zipCode && config.zipCode.trim() !== '';
    const hasCoords = config.latitude !== undefined && config.longitude !== undefined;
    const hasCity = config.city && config.city.trim() !== '';

    if (!hasZip && !hasCoords && !hasCity) {
      allErrors.push('At least one location method (ZIP code, coordinates, or city) must be provided');
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Add visual feedback to form fields
   * @param fieldId - The ID of the form field element
   * @param result - The validation result for the field
   */
  updateFieldFeedback(fieldId: string, result: ValidationResult): void {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    const feedbackElement = document.getElementById(`${fieldId}-feedback`) as HTMLElement;

    if (!field) return;

    // Remove existing classes
    field.classList.remove('is-valid', 'is-invalid');

    if (result.isValid) {
      field.classList.add('is-valid');
      if (feedbackElement) {
        feedbackElement.classList.remove('invalid-feedback');
        feedbackElement.classList.add('valid-feedback');
        feedbackElement.textContent = '';
      }
    } else {
      field.classList.add('is-invalid');
      if (feedbackElement) {
        feedbackElement.classList.remove('valid-feedback');
        feedbackElement.classList.add('invalid-feedback');
        feedbackElement.textContent = result.errors.join('. ');
      }
    }
  }

  /**
   * Setup real-time validation for a form field
   * @param fieldId - The ID of the form field element
   * @param fieldName - The validation rule name to use
   */
  setupFieldValidation(fieldId: string, fieldName: string): void {
    const field = document.getElementById(fieldId) as HTMLInputElement;
    if (!field) return;

    const validate = (): void => {
      const value = field.type === 'number' ? Number(field.value) : field.value;
      const result = this.validateField(fieldName, value);
      this.updateFieldFeedback(fieldId, result);
    };

    // Validate on input and blur events
    field.addEventListener('input', validate);
    field.addEventListener('blur', validate);
  }

  /**
   * Validate coordinates and provide specific feedback
   * @param lat - Latitude value
   * @param lng - Longitude value
   * @returns ValidationResult for the coordinate pair
   */
  validateCoordinates(lat: number | string, lng: number | string): ValidationResult {
    const latResult = this.validateField('latitude', lat);
    const lngResult = this.validateField('longitude', lng);

    const errors = [...latResult.errors, ...lngResult.errors];

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get validation rule for a specific field
   * @param fieldName - The name of the field
   * @returns The validation rule or undefined if not found
   */
  getRule(fieldName: string): ValidationRule | undefined {
    return this.validationRules[fieldName];
  }

  /**
   * Add or update a validation rule
   * @param fieldName - The name of the field
   * @param rule - The validation rule
   */
  setRule(fieldName: string, rule: ValidationRule): void {
    this.validationRules[fieldName] = rule;
  }

  /**
   * Check if a provider requires specific fields
   * @param provider - The provider name
   * @param config - The configuration to validate
   * @returns ValidationResult with provider-specific requirements
   */
  validateProviderRequirements(provider: 'airnow' | 'aqicn', config: Partial<HomebridgeConfig>): ValidationResult {
    const errors: string[] = [];

    // Both providers require an API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push(`${provider.toUpperCase()} requires an API key`);
    }

    // AirNow specific requirements
    if (provider === 'airnow') {
      // AirNow works best with ZIP codes but can use coordinates
      const hasZip = config.zipCode && config.zipCode.trim() !== '';
      const hasCoords = config.latitude !== undefined && config.longitude !== undefined;
      
      if (!hasZip && !hasCoords) {
        errors.push('AirNow requires either a ZIP code or coordinates');
      }
    }

    // AQICN specific requirements  
    if (provider === 'aqicn') {
      // AQICN works with coordinates, city names, or some ZIP codes
      const hasZip = config.zipCode && config.zipCode.trim() !== '';
      const hasCoords = config.latitude !== undefined && config.longitude !== undefined;
      const hasCity = config.city && config.city.trim() !== '';
      
      if (!hasZip && !hasCoords && !hasCity) {
        errors.push('AQICN requires ZIP code, coordinates, or city name');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}