// Automated Transport Fare System - JavaScript

class AutomatedTransportFareSystem {
  constructor() {
    // Base fare rates (per km)
    this.baseFareRates = {
      Bus: 5.0,
      Taxi: 15.0,
      Truck: 25.0,
      Motorcycle: 8.0,
      Tricycle: 12.0,
    };

    // Initialize properties
    this.map = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.placesService = null;
    this.mapsLoaded = false;

    // Route data
    this.routeData = {
      distance: 0,
      duration: 0,
      trafficFactor: 1.0,
      roadConditionFactor: 1.0,
      origin: null,
      destination: null,
    };

    // Fare calculation components
    this.distance = 0.0;
    this.fuelPrice = 0.0;
    this.vehicleType = "Bus";
    this.roadConditionFactor = 1.0;
    this.timeOfDay = "Afternoon";
    this.trafficFactor = 1.0;
    this.unionLevy = 10.0;
    this.passengerCount = 1;

    this.baseFare = 0.0;
    this.fuelAdjustment = 0.0;
    this.roadAdjustment = 0.0;
    this.timeAdjustment = 0.0;
    this.trafficAdjustment = 0.0;
    this.totalFare = 0.0;

    // Initialize event listeners immediately
    this.initializeEventListeners();
  }

  // Initialize without Google Maps (fallback mode)
  initializeWithoutMaps() {
    console.log("Initializing without Google Maps API");
    this.mapsLoaded = false;
    this.setupManualLocationInput();
  }

  // Initialize Google Maps
  initializeMap() {
    if (typeof google === "undefined") {
      console.log("Google Maps API not available, using fallback mode");
      this.initializeWithoutMaps();
      return;
    }

    try {
      const mapOptions = {
        zoom: 10,
        center: { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      };

      this.map = new google.maps.Map(
        document.getElementById("map"),
        mapOptions
      );
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        panel: null,
      });
      this.directionsRenderer.setMap(this.map);
      this.placesService = new google.maps.places.PlacesService(this.map);
      this.mapsLoaded = true;

      // Initialize autocomplete
      this.initializeAutocomplete();
      console.log("Google Maps initialized successfully");
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
      this.initializeWithoutMaps();
    }
  }

  // Setup manual location input when Maps API is not available
  setupManualLocationInput() {
    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");

    // Add placeholder suggestions for common Nigerian locations
    const nigerianLocations = [
      "Lagos Island, Lagos",
      "Victoria Island, Lagos",
      "Ikeja, Lagos",
      "Abuja, FCT",
      "Port Harcourt, Rivers",
      "Kano, Kano",
      "Ibadan, Oyo",
      "Benin City, Edo",
      "Enugu, Enugu",
      "Kaduna, Kaduna",
    ];

    this.setupLocationSuggestions("origin", nigerianLocations);
    this.setupLocationSuggestions("destination", nigerianLocations);
  }

  // Setup location suggestions for fallback mode
  setupLocationSuggestions(inputId, locations) {
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(inputId + "Suggestions");

    input.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      if (query.length > 1) {
        const filtered = locations.filter((location) =>
          location.toLowerCase().includes(query)
        );
        this.displayFallbackSuggestions(
          filtered.slice(0, 5),
          suggestionsDiv,
          input
        );
      } else {
        suggestionsDiv.style.display = "none";
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = "none";
      }
    });
  }

  // Display fallback suggestions
  displayFallbackSuggestions(locations, suggestionsDiv, input) {
    suggestionsDiv.innerHTML = "";
    if (locations.length === 0) {
      suggestionsDiv.style.display = "none";
      return;
    }

    suggestionsDiv.style.display = "block";

    locations.forEach((location) => {
      const suggestionItem = document.createElement("div");
      suggestionItem.className = "suggestion-item";
      suggestionItem.innerHTML = `<strong>${location}</strong>`;

      suggestionItem.addEventListener("click", () => {
        input.value = location;
        suggestionsDiv.style.display = "none";
      });

      suggestionsDiv.appendChild(suggestionItem);
    });
  }

  // Initialize autocomplete for origin and destination (Google Maps mode)
  initializeAutocomplete() {
    if (!this.mapsLoaded) return;

    const options = {
      componentRestrictions: { country: "ng" }, // Restrict to Nigeria
      fields: ["place_id", "geometry", "name", "formatted_address"],
      types: ["establishment", "geocode"],
    };

    this.setupLocationInput("origin", options);
    this.setupLocationInput("destination", options);
  }

  // Setup location input with Google Places suggestions
  setupLocationInput(inputId, options) {
    if (!this.mapsLoaded) return;

    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(inputId + "Suggestions");

    input.addEventListener("input", (e) => {
      const query = e.target.value;
      if (query.length > 2) {
        this.searchPlaces(query, suggestionsDiv, input);
      } else {
        suggestionsDiv.style.display = "none";
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = "none";
      }
    });
  }

  // Search places using Google Places API
  searchPlaces(query, suggestionsDiv, input) {
    if (!this.mapsLoaded || !this.placesService) return;

    const request = {
      query: query,
      fields: ["place_id", "name", "formatted_address", "geometry"],
      locationBias: this.map.getBounds(),
    };

    this.placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        this.displaySuggestions(results.slice(0, 5), suggestionsDiv, input);
      }
    });
  }

  // Display place suggestions
  displaySuggestions(results, suggestionsDiv, input) {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.style.display = "block";

    results.forEach((place) => {
      const suggestionItem = document.createElement("div");
      suggestionItem.className = "suggestion-item";
      suggestionItem.innerHTML = `
                <strong>${place.name}</strong><br>
                <small>${place.formatted_address}</small>
            `;

      suggestionItem.addEventListener("click", () => {
        input.value = place.formatted_address;
        input.dataset.placeId = place.place_id;
        if (place.geometry && place.geometry.location) {
          input.dataset.lat = place.geometry.location.lat();
          input.dataset.lng = place.geometry.location.lng();
        }
        suggestionsDiv.style.display = "none";
      });

      suggestionsDiv.appendChild(suggestionItem);
    });
  }

  // Get route and analyze conditions
  async getRouteAnalysis() {
    const originInput = document.getElementById("origin");
    const destinationInput = document.getElementById("destination");

    if (!originInput.value || !destinationInput.value) {
      alert("Please enter both origin and destination");
      return;
    }

    this.showLoading(true);

    try {
      if (this.mapsLoaded) {
        // Use Google Maps for real route analysis
        const route = await this.calculateRoute(
          originInput.value,
          destinationInput.value
        );

        if (route) {
          await this.analyzeRouteConditions(route);
          this.updateRouteDisplay(route);
          this.autoFillFormFields();
        }
      } else {
        // Simulate route analysis without Google Maps
        await this.simulateRouteAnalysis(
          originInput.value,
          destinationInput.value
        );
      }
    } catch (error) {
      console.error("Error getting route analysis:", error);
      alert("Error analyzing route. Using estimated values.");
      // Fallback to simulation
      await this.simulateRouteAnalysis(
        originInput.value,
        destinationInput.value
      );
    } finally {
      this.showLoading(false);
    }
  }

  // Simulate route analysis without Google Maps
  async simulateRouteAnalysis(origin, destination) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Estimate distance based on location names (very basic simulation)
    const estimatedDistance = Math.random() * 50 + 5; // 5-55 km
    const estimatedDuration = estimatedDistance * 2.5; // Rough estimate

    this.routeData = {
      distance: estimatedDistance,
      duration: estimatedDuration,
      trafficFactor: 1.0 + Math.random() * 0.6, // 1.0-1.6
      roadConditionFactor: 1.0 + Math.random() * 0.5, // 1.0-1.5
      origin: origin,
      destination: destination,
    };

    // Set traffic status
    if (this.routeData.trafficFactor >= 1.4) {
      this.routeData.trafficStatus = "Heavy Traffic";
      this.routeData.trafficClass = "status-bad";
    } else if (this.routeData.trafficFactor >= 1.2) {
      this.routeData.trafficStatus = "Moderate Traffic";
      this.routeData.trafficClass = "status-average";
    } else {
      this.routeData.trafficStatus = "Light Traffic";
      this.routeData.trafficClass = "status-good";
    }

    // Set road condition status
    if (this.routeData.roadConditionFactor >= 1.3) {
      this.routeData.roadStatus = "Poor Road Conditions";
      this.routeData.roadClass = "status-bad";
    } else if (this.routeData.roadConditionFactor >= 1.15) {
      this.routeData.roadStatus = "Average Road Conditions";
      this.routeData.roadClass = "status-average";
    } else {
      this.routeData.roadStatus = "Good Road Conditions";
      this.routeData.roadClass = "status-good";
    }

    this.updateRouteDisplaySimulation();
    this.autoFillFormFields();
  }

  // Calculate route using Google Directions API
  calculateRoute(origin, destination) {
    return new Promise((resolve, reject) => {
      if (!this.directionsService) {
        reject(new Error("Directions service not available"));
        return;
      }

      const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      };

      this.directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsRenderer.setDirections(result);
          resolve(result.routes[0]);
        } else {
          reject(new Error("Directions request failed: " + status));
        }
      });
    });
  }

  // Analyze route conditions (with Google Maps data)
  async analyzeRouteConditions(route) {
    const leg = route.legs[0];

    // Extract distance and duration
    this.routeData.distance = leg.distance.value / 1000; // Convert to km
    this.routeData.duration = leg.duration.value / 60; // Convert to minutes

    // Analyze traffic conditions
    const durationInTraffic = leg.duration_in_traffic
      ? leg.duration_in_traffic.value / 60
      : leg.duration.value / 60;
    const trafficRatio = durationInTraffic / this.routeData.duration;

    if (trafficRatio >= 1.6) {
      this.routeData.trafficFactor = 1.6;
      this.routeData.trafficStatus = "Heavy Traffic";
      this.routeData.trafficClass = "status-bad";
    } else if (trafficRatio >= 1.3) {
      this.routeData.trafficFactor = 1.3;
      this.routeData.trafficStatus = "Moderate Traffic";
      this.routeData.trafficClass = "status-average";
    } else {
      this.routeData.trafficFactor = 1.0;
      this.routeData.trafficStatus = "Light Traffic";
      this.routeData.trafficClass = "status-good";
    }

    // Analyze road conditions
    this.routeData.roadConditionFactor = await this.analyzeRoadQuality(route);

    // Set road condition status
    if (this.routeData.roadConditionFactor >= 1.5) {
      this.routeData.roadStatus = "Poor Road Conditions";
      this.routeData.roadClass = "status-bad";
    } else if (this.routeData.roadConditionFactor >= 1.2) {
      this.routeData.roadStatus = "Average Road Conditions";
      this.routeData.roadClass = "status-average";
    } else {
      this.routeData.roadStatus = "Good Road Conditions";
      this.routeData.roadClass = "status-good";
    }
  }

  // Analyze road quality (simulated analysis)
  async analyzeRoadQuality(route) {
    const leg = route.legs[0];
    const steps = leg.steps;

    let roadQualityScore = 1.0;

    // Analyze route characteristics
    const totalDistance = leg.distance.value;
    let highwayDistance = 0;
    let cityDistance = 0;
    let ruralDistance = 0;

    steps.forEach((step) => {
      const instruction = step.instructions.toLowerCase();
      const stepDistance = step.distance.value;

      // Categorize road types based on instructions
      if (
        instruction.includes("highway") ||
        instruction.includes("expressway")
      ) {
        highwayDistance += stepDistance;
      } else if (
        instruction.includes("street") ||
        instruction.includes("road")
      ) {
        if (instruction.includes("main") || instruction.includes("major")) {
          cityDistance += stepDistance;
        } else {
          ruralDistance += stepDistance;
        }
      } else {
        cityDistance += stepDistance;
      }
    });

    // Calculate road quality based on road types
    const highwayRatio = highwayDistance / totalDistance;
    const cityRatio = cityDistance / totalDistance;
    const ruralRatio = ruralDistance / totalDistance;

    // Highways generally have better conditions
    if (highwayRatio > 0.7) {
      roadQualityScore = 1.0; // Good conditions
    } else if (cityRatio > 0.6) {
      roadQualityScore = 1.2; // Average conditions
    } else if (ruralRatio > 0.5) {
      roadQualityScore = 1.5; // Poor conditions (rural roads)
    } else {
      roadQualityScore = 1.2; // Mixed conditions
    }

    return roadQualityScore;
  }

  // Update route display in UI (Google Maps mode)
  updateRouteDisplay(route) {
    this.updateRouteDisplaySimulation();
  }

  // Update route display (simulation mode)
  updateRouteDisplaySimulation() {
    const routeInfoDiv = document.getElementById("routeInfo");

    document.getElementById(
      "autoDistance"
    ).textContent = `${this.routeData.distance.toFixed(1)} km`;
    document.getElementById("autoDuration").textContent = `${Math.round(
      this.routeData.duration
    )} minutes`;

    document.getElementById("autoTraffic").innerHTML = `
            ${this.routeData.trafficStatus}
            <span class="status-indicator ${this.routeData.trafficClass}">
                ${this.routeData.trafficFactor.toFixed(1)}x
            </span>
        `;

    document.getElementById("autoRoadQuality").innerHTML = `
            ${this.routeData.roadStatus}
            <span class="status-indicator ${this.routeData.roadClass}">
                ${this.routeData.roadConditionFactor.toFixed(1)}x
            </span>
        `;

    routeInfoDiv.style.display = "block";
  }

  // Auto-fill form fields with analyzed data
  autoFillFormFields() {
    document.getElementById("distance").value =
      this.routeData.distance.toFixed(1);
    document.getElementById(
      "distanceDisplay"
    ).value = `${this.routeData.distance.toFixed(1)} km (Auto-detected)`;

    document.getElementById("trafficFactor").value =
      this.routeData.trafficFactor;
    document.getElementById("trafficDisplay").value = `${
      this.routeData.trafficStatus
    } (${this.routeData.trafficFactor.toFixed(1)}x)`;

    document.getElementById("roadCondition").value =
      this.routeData.roadConditionFactor;
    document.getElementById("roadDisplay").value = `${
      this.routeData.roadStatus
    } (${this.routeData.roadConditionFactor.toFixed(1)}x)`;
  }

  // Get current fuel price (simulated - in real app, use fuel price API)
  async getCurrentFuelPrice() {
    const fuelPriceInput = document.getElementById("fuelPrice");
    const button = document.getElementById("getFuelPriceBtn");

    button.textContent = "Getting Price...";
    button.disabled = true;

    try {
      // Simulate API call - in real implementation, use fuel price API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated current fuel price in Nigeria (₦ per liter)
      const currentFuelPrice = Math.random() * (180 - 150) + 150; // Random between 150-180

      fuelPriceInput.value = currentFuelPrice.toFixed(2);

      // Show success message
      this.showMessage(
        `Current fuel price updated: ₦${currentFuelPrice.toFixed(2)}/liter`,
        "success"
      );
    } catch (error) {
      console.error("Error getting fuel price:", error);
      this.showMessage(
        "Unable to get current fuel price. Please enter manually.",
        "error"
      );
    } finally {
      button.textContent = "⛽ Get Current Price";
      button.disabled = false;
    }
  }

  // Show loading state
  showLoading(show) {
    const loadingSection = document.getElementById("loadingSection");
    loadingSection.style.display = show ? "block" : "none";
  }

  // Show message to user
  showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

    if (type === "success") {
      messageDiv.style.background = "linear-gradient(135deg, #4caf50, #45a049)";
    } else {
      messageDiv.style.background = "linear-gradient(135deg, #f44336, #da190b)";
    }

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  // Get time of day display text
  getTimeOfDayDisplay(timeOfDay) {
    const timeDisplayMap = {
      Morning_Peak: "Morning Peak (7-10 AM)",
      Afternoon: "Afternoon (10 AM - 4 PM)",
      Evening_Peak: "Evening Peak (4-8 PM)",
      Night: "Night (8 PM - 7 AM)",
    };
    return timeDisplayMap[timeOfDay] || "Unknown";
  }

  // Collect input details from form
  inputDetails() {
    this.distance =
      parseFloat(document.getElementById("distance").value) ||
      this.routeData.distance;
    this.fuelPrice =
      parseFloat(document.getElementById("fuelPrice").value) || 0;
    this.vehicleType = document.getElementById("vehicleType").value || "Bus";
    this.roadConditionFactor =
      parseFloat(document.getElementById("roadCondition").value) ||
      this.routeData.roadConditionFactor;
    this.timeOfDay = document.getElementById("timeOfDay").value || "Afternoon";
    this.trafficFactor =
      parseFloat(document.getElementById("trafficFactor").value) ||
      this.routeData.trafficFactor;
    this.passengerCount =
      parseInt(document.getElementById("passengerCount").value) || 1;
  }

  // Calculate base fare
  calculateBaseFare() {
    this.baseFare = this.distance * this.baseFareRates[this.vehicleType];
  }

  // Apply fuel price adjustment
  applyFuelAdjustment() {
    if (this.fuelPrice > 100.0) {
      const fuelSurcharge = ((this.fuelPrice - 100.0) / 50.0) * 0.1;
      this.fuelAdjustment = this.baseFare * fuelSurcharge;
    } else {
      this.fuelAdjustment = 0.0;
    }
  }

  // Apply road condition adjustment
  applyRoadCondition() {
    this.roadAdjustment = this.baseFare * (this.roadConditionFactor - 1.0);
  }

  // Apply time of day factor
  applyTimeFactor() {
    let timeFactor = 1.0;

    switch (this.timeOfDay) {
      case "Morning_Peak":
        timeFactor = 1.25;
        break;
      case "Afternoon":
        timeFactor = 1.0;
        break;
      case "Evening_Peak":
        timeFactor = 1.3;
        break;
      case "Night":
        timeFactor = 1.15;
        break;
    }

    this.timeAdjustment = this.baseFare * (timeFactor - 1.0);
  }

  // Apply traffic factor
  applyTrafficFactor() {
    this.trafficAdjustment = this.baseFare * (this.trafficFactor - 1.0);
  }

  // Calculate total fare
  calculateTotalFare() {
    this.totalFare =
      this.baseFare +
      this.fuelAdjustment +
      this.roadAdjustment +
      this.timeAdjustment +
      this.trafficAdjustment +
      this.unionLevy;

    if (this.passengerCount > 1) {
      this.totalFare *= this.passengerCount;
    }
  }

  // Display fare breakdown
  displayFareBreakdown() {
    // Update trip details
    document.getElementById("displayVehicleType").textContent =
      this.vehicleType;
    document.getElementById(
      "displayDistance"
    ).textContent = `${this.distance.toFixed(1)} km`;
    document.getElementById("displayTimeOfDay").textContent =
      this.getTimeOfDayDisplay(this.timeOfDay);
    document.getElementById("displayPassengers").textContent =
      this.passengerCount;

    // Update fare components
    document.getElementById(
      "displayBaseFare"
    ).textContent = `₦${this.baseFare.toFixed(2)} (${this.distance.toFixed(
      1
    )} km × ₦${this.baseFareRates[this.vehicleType].toFixed(2)}/km)`;

    this.updateAdjustmentDisplay("displayFuelAdjustment", this.fuelAdjustment);
    this.updateAdjustmentDisplay("displayRoadAdjustment", this.roadAdjustment);
    this.updateAdjustmentDisplay("displayTimeAdjustment", this.timeAdjustment);
    this.updateAdjustmentDisplay(
      "displayTrafficAdjustment",
      this.trafficAdjustment
    );

    document.getElementById(
      "displayUnionLevy"
    ).textContent = `₦${this.unionLevy.toFixed(2)}`;

    // Handle passenger calculation display
    const passengerSection = document.getElementById("passengerCalculation");
    if (this.passengerCount > 1) {
      const farePerPassenger =
        this.baseFare +
        this.fuelAdjustment +
        this.roadAdjustment +
        this.timeAdjustment +
        this.trafficAdjustment +
        this.unionLevy;
      document.getElementById(
        "displaySubtotal"
      ).textContent = `₦${farePerPassenger.toFixed(2)}`;
      document.getElementById("displayPassengerCount").textContent =
        this.passengerCount;
      passengerSection.style.display = "block";
    } else {
      passengerSection.style.display = "none";
    }

    // Display total fare
    document.getElementById(
      "displayTotalFare"
    ).textContent = `₦${this.totalFare.toFixed(2)}`;

    // Show results section
    document.getElementById("fareBreakdown").style.display = "block";

    // Scroll to results
    document.getElementById("fareBreakdown").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Helper method to update adjustment displays
  updateAdjustmentDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (value > 0) {
      element.textContent = `₦${value.toFixed(2)}`;
    } else {
      element.textContent = "₦0.00";
    }
  }

  // Validate form inputs
  validateInputs() {
    const errors = [];

    if (this.distance <= 0) {
      errors.push("Please get route analysis first or enter a valid distance");
    }

    if (this.fuelPrice <= 0) {
      errors.push("Please enter fuel price or get current price");
    }

    if (!this.vehicleType || this.vehicleType === "") {
      errors.push("Please select a vehicle type");
    }

    if (!this.timeOfDay || this.timeOfDay === "") {
      errors.push("Please select a time of day");
    }

    if (this.passengerCount <= 0) {
      errors.push("Number of passengers must be greater than 0");
    }

    return errors;
  }

  // Show error messages
  showErrors(errors) {
    const existingErrors = document.querySelectorAll(".error-message");
    existingErrors.forEach((error) => error.remove());

    if (errors.length > 0) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";

      const errorList = document.createElement("ul");
      errors.forEach((error) => {
        const listItem = document.createElement("li");
        listItem.textContent = error;
        errorList.appendChild(listItem);
      });

      errorDiv.appendChild(
        document.createTextNode("Please fix the following errors:")
      );
      errorDiv.appendChild(errorList);

      const form = document.getElementById("fareForm");
      form.insertBefore(errorDiv, form.firstChild);

      errorDiv.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  // Main calculation process
  processCalculation() {
    this.inputDetails();

    const errors = this.validateInputs();
    if (!this.showErrors(errors)) {
      return false;
    }

    const submitButton = document.querySelector(".btn-primary");
    const originalText = submitButton.textContent;
    submitButton.textContent = "Calculating...";
    submitButton.disabled = true;

    setTimeout(() => {
      this.calculateBaseFare();
      this.applyFuelAdjustment();
      this.applyRoadCondition();
      this.applyTimeFactor();
      this.applyTrafficFactor();
      this.calculateTotalFare();
      this.displayFareBreakdown();

      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }, 1000);

    return true;
  }

  // Print fare breakdown
  printFareBreakdown() {
    const fareBreakdown = document.getElementById("fareBreakdown");

    const printWindow = window.open("", "_blank", "width=800,height=600");

    const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Automated Atotoarere Transport Fare Receipt</title>
                <style>
                    body { font-family: "Segoe UI", sans-serif; margin: 20px; color: #333; }
                    .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4caf50; padding-bottom: 15px; }
                    .print-header h1 { color: #4caf50; margin: 0; font-size: 1.8em; }
                    .print-header p { margin: 5px 0 0 0; color: #666; font-size: 0.9em; }
                    .route-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                    .info-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 3px solid #4caf50; }
                    .breakdown-item { display: flex; justify-content: space-between; padding: 10px 15px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; }
                    .total-section { text-align: center; margin: 25px 0; padding: 20px; background: #4caf50; border-radius: 10px; color: white; }
                    .print-footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>AUTOMATED ATOTOARERE TRANSPORT FARE RECEIPT</h1>
                    <p>🤖 Smart Fare Calculation with Real-time Data</p>
                    <p>Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
                </div>
                ${fareBreakdown.innerHTML.replace(
                  /<button[^>]*>.*?<\/button>/gi,
                  ""
                )}
                <div class="print-footer">
                    <p>Thank you for using Automated Atotoarere Transport Fare System</p>
                    <p>🛣️ Safe travels! 🚗</p>
                </div>
            </body>
            </html>
        `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = function () {
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
    };
  }

  // Setup export buttons
  setupExportButtons() {
    document.getElementById("printBtn").addEventListener("click", () => {
      const section = document.getElementById("fareBreakdown");
      if (
        section.style.display !== "none" &&
        !section.innerHTML.includes('id="displayTotalFare">-<')
      ) {
        this.printFareBreakdown();
      } else {
        alert("Nothing to print. Please calculate fare first.");
      }
    });

    document.getElementById("pdfBtn").addEventListener("click", () => {
      const section = document.getElementById("fareBreakdown");
      if (
        section.style.display !== "none" &&
        !section.innerHTML.includes('id="displayTotalFare">-<')
      ) {
        const opt = {
          margin: 0.5,
          filename: "automated-atotoarere-fare-receipt.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        };

        const clonedSection = section.cloneNode(true);
        const buttons = clonedSection.querySelector(".print-buttons");
        if (buttons) buttons.remove();

        html2pdf().from(clonedSection).set(opt).save();
      } else {
        alert("No fare summary to export. Please calculate fare first.");
      }
    });
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupEventListeners()
      );
    } else {
      this.setupEventListeners();
    }
  }

  // Setup all event listeners
  setupEventListeners() {
    // Route analysis button
    const getRouteBtn = document.getElementById("getRouteBtn");
    if (getRouteBtn) {
      getRouteBtn.addEventListener("click", () => {
        this.getRouteAnalysis();
      });
    }

    // Get fuel price button
    const getFuelPriceBtn = document.getElementById("getFuelPriceBtn");
    if (getFuelPriceBtn) {
      getFuelPriceBtn.addEventListener("click", () => {
        this.getCurrentFuelPrice();
      });
    }

    // Form submission
    const fareForm = document.getElementById("fareForm");
    if (fareForm) {
      fareForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.processCalculation();
      });
    }

    // Form reset
    if (fareForm) {
      fareForm.addEventListener("reset", (e) => {
        setTimeout(() => {
          // Reset all display values and hide results
          document.getElementById("fareBreakdown").style.display = "none";
          document.getElementById("routeInfo").style.display = "none";

          // Clear route from map
          if (this.directionsRenderer) {
            this.directionsRenderer.setDirections({ routes: [] });
          }

          // Reset route data
          this.routeData = {
            distance: 0,
            duration: 0,
            trafficFactor: 1.0,
            roadConditionFactor: 1.0,
            origin: null,
            destination: null,
          };

          // Clear input datasets
          const originInput = document.getElementById("origin");
          const destinationInput = document.getElementById("destination");
          if (originInput) originInput.dataset.placeId = "";
          if (destinationInput) destinationInput.dataset.placeId = "";

          // Remove error messages
          const errorMessages = document.querySelectorAll(".error-message");
          errorMessages.forEach((error) => error.remove());
        }, 10);
      });
    }

    // Setup export buttons
    this.setupExportButtons();

    // Real-time validation feedback
    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("blur", function () {
        this.style.borderColor = "";
        if (this.value && this.checkValidity()) {
          this.style.borderColor = "#4CAF50";
        } else if (this.value) {
          this.style.borderColor = "#f44336";
        }
      });
    });

    // Input formatting for number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach((input) => {
      input.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9.]/g, "");
        const parts = this.value.split(".");
        if (parts.length > 2) {
          this.value = parts[0] + "." + parts.slice(1).join("");
        }
      });
    });

    console.log("Automated Transport Fare System initialized successfully!");
  }
}

// Global initialization
window.initMap = function () {
  console.log("Google Maps API loaded");
  if (window.fareSystem) {
    window.fareSystem.initializeMap();
  }
};

// Initialize the system when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing system...");

  // Initialize the fare system
  window.fareSystem = new AutomatedTransportFareSystem();

  // Add CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .form-section {
        animation: fadeIn 0.5s ease-out;
    }
    
    .results-section {
        animation: fadeIn 0.6s ease-out;
    }
    
    .suggestion-item:hover {
        background: #e8f5e8 !important;
        transform: translateX(5px);
    }
    
    .info-card {
        transition: all 0.3s ease;
    }
    
    .info-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
    }
    
    .breakdown-item {
        transition: all 0.3s ease;
    }
    
    .breakdown-item:hover {
        transform: translateX(8px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
`;
  document.head.appendChild(style);
});
