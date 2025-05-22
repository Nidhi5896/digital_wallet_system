// We'll use axios in the future for real API calls
// const axios = require('axios');

class CurrencyService {
  constructor() {
    this.baseCurrency = 'INR';
    this.supportedCurrencies = {
      'INR': {
        code: 'INR',
        symbol: '₹',
        decimalPlaces: 2,
        name: 'Indian Rupee',
        isBaseCurrency: true
      },
      'USD': {
        code: 'USD',
        symbol: '$',
        decimalPlaces: 2,
        name: 'US Dollar',
        isBaseCurrency: false
      }
    };
    this.exchangeRates = new Map();
    this.lastUpdate = null;
    this.rateUpdateInterval = 3600000; // 1 hour in milliseconds
    
    // Fallback rates in case API fails
    this.fallbackRates = {
      'USD': 83.0 // 1 USD = 83 INR
    };
  }

  // Initialize exchange rates
  async initializeRates() {
    try {
      await this.updateRates();
      // Set up periodic rate updates
      setInterval(() => this.updateRates(), this.rateUpdateInterval);
    } catch (error) {
      console.warn('Using fallback exchange rates:', error.message);
      this.useFallbackRates();
    }
  }

  // Use fallback rates
  useFallbackRates() {
    Object.entries(this.fallbackRates).forEach(([currency, rate]) => {
      this.exchangeRates.set(currency, rate);
    });
    this.lastUpdate = new Date();
  }

  // Update exchange rates
  async updateRates() {
    try {
      // In a real application, you would fetch this from a reliable exchange rate API
      // For now, we'll use mock rates
      this.exchangeRates.set('USD', 83.0); // 1 USD = 83 INR
      this.lastUpdate = new Date();
    } catch (error) {
      console.warn('Failed to update exchange rates, using fallback:', error.message);
      this.useFallbackRates();
    }
  }

  // Convert amount from one currency to another
  convertAmount(amount, fromCurrency, toCurrency) {
    if (!this.isValidCurrency(fromCurrency) || !this.isValidCurrency(toCurrency)) {
      throw new Error('Invalid currency code');
    }

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (fromCurrency === toCurrency) return amount;

    if (fromCurrency === this.baseCurrency) {
      // Converting from base currency to another currency
      const rate = this.exchangeRates.get(toCurrency) || this.fallbackRates[toCurrency];
      if (!rate) throw new Error(`Exchange rate not found for ${toCurrency}`);
      return amount / rate;
    } else if (toCurrency === this.baseCurrency) {
      // Converting to base currency
      const rate = this.exchangeRates.get(fromCurrency) || this.fallbackRates[fromCurrency];
      if (!rate) throw new Error(`Exchange rate not found for ${fromCurrency}`);
      return amount * rate;
    } else {
      // Converting between two non-base currencies
      const fromRate = this.exchangeRates.get(fromCurrency) || this.fallbackRates[fromCurrency];
      const toRate = this.exchangeRates.get(toCurrency) || this.fallbackRates[toCurrency];
      if (!fromRate || !toRate) throw new Error('Exchange rates not found');
      return (amount * fromRate) / toRate;
    }
  }

  // Format amount with currency symbol
  formatAmount(amount, currency) {
    if (!this.isValidCurrency(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const currencyInfo = this.supportedCurrencies[currency];
    const formattedAmount = amount.toFixed(currencyInfo.decimalPlaces);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  // Validate currency code
  isValidCurrency(currency) {
    return Object.prototype.hasOwnProperty.call(this.supportedCurrencies, currency);
  }

  // Get all supported currencies
  getSupportedCurrencies() {
    return Object.keys(this.supportedCurrencies);
  }

  // Get currency info
  getCurrencyInfo(currency) {
    if (!this.isValidCurrency(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    return this.supportedCurrencies[currency];
  }

  // Get exchange rate
  getExchangeRate(fromCurrency, toCurrency) {
    if (!this.isValidCurrency(fromCurrency) || !this.isValidCurrency(toCurrency)) {
      throw new Error('Invalid currency code');
    }

    if (fromCurrency === toCurrency) return 1;

    if (fromCurrency === this.baseCurrency) {
      return 1 / (this.exchangeRates.get(toCurrency) || this.fallbackRates[toCurrency]);
    } else if (toCurrency === this.baseCurrency) {
      return this.exchangeRates.get(fromCurrency) || this.fallbackRates[fromCurrency];
    } else {
      const fromRate = this.exchangeRates.get(fromCurrency) || this.fallbackRates[fromCurrency];
      const toRate = this.exchangeRates.get(toCurrency) || this.fallbackRates[toCurrency];
      return fromRate / toRate;
    }
  }

  // Get last update time
  getLastUpdateTime() {
    return this.lastUpdate;
  }
}

// Create and export singleton instance
const currencyService = new CurrencyService();
module.exports = currencyService; 