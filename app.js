/**
 * Repository URL. Safari opens this link when About in main menu is pressed.
 */
 const REPOSITORY_URL = "https://github.com/mharry97/anki-scriptables-widget";

 /**
  * Keychain key for AnkiConnect URL.
  */
 const ANKICONNECT_URL_KEY = "anki.widget.ankiconnect.url";
 
 /**
  * Colour scheme for the graph.
  */
 const COLOUR_SCHEME = args.widgetParameter;
  
 /**
  * A dictionary containing error messages.
  */
  const errors = {
    largeFamily:
      "This widget only supports small and medium families. Please select one of those variations.",
    missingURL:
      "No URL for ankiconnect provided",
  };
  
 /**
  * Colour palette used by the widget.
  */
 const palette = {
     background: Color.dynamic(Color.white(), new Color("#242424")),
     gray: Color.dynamic(new Color("#eaedf6", 0.85), new Color("#525062", 0.1)),
     green: {
         veryLight: new Color("#e5ffcc"), 
         light: new Color("#ccff99"),   
         medium: new Color("#99ff66"), 
         dark: new Color("#66cc33"), 
         veryDark: new Color("#339900"), 
     },
     blue: {
         veryLight: new Color("#abd4f2"), 
         light: new Color("#84bded"),   
         medium: new Color("#5ea5e8"), 
         dark: new Color("#1f6dc7"), 
         veryDark: new Color("#18477c"), 
     },
     red: {
         veryLight: new Color("#ff9496"), 
         light: new Color("#ff7776"),   
         medium: new Color("#ff5754"), 
         dark: new Color("#ff2e2e"), 
         veryDark: new Color("#a31f1f"), 
     },
     purple: {
         veryLight: new Color("#dfabf2"), 
         light: new Color("#d389ee"),   
         medium: new Color("#c565e9"), 
         dark: new Color("#b73ae4"), 
         veryDark: new Color("#72248f"), 
     },
     text: {
         primary: Color.dynamic(new Color("#000000"), new Color("#ffffff")),
     },
 };
  
 /**
  * An instance of DateFormatter to convert dates.
  */
 const formatter = new DateFormatter();
 formatter.dateFormat = "yyyy-MM-dd";
  
 /**
  * Whether or not the widget is configured.
  */
 const urlExists = Keychain.contains(ANKICONNECT_URL_KEY);
  
  /**
  * Runs the script.
  */
 try {
     if (config.runsInWidget) {
         if (urlExists) {
             const family = config.widgetFamily;
             const widget = await createWidget(family);
 
             Script.setWidget(widget);
             Script.complete();
         } else {
             throw new Error(errors.missingURL);
         }
     } else if (urlExists) {
         await showMainMenu();
 
         Script.complete();
     } else {
         await showCredentialsDialog();
 
         Script.complete();
     }
 } catch (error) {
     const errorMessage = error.message || error;
     const widget = await createErrorWidget(errorMessage);
 
     Script.setWidget(widget);
     Script.complete();
 }
  
 /**
  * Adds the specified number of days to a date.
  * @param {Date} date - The date to modify.
  * @param {number} amount - The number of days to add.
  * @returns {Date} - The new date.
  */
 function addDays(date, amount) {
     const newDate = new Date(date);
     newDate.setDate(date.getDate() + amount);
     return newDate;
 }
  
  /**
  * Subtracts the specified number of days from a date.
  * @param {Date} date - The date to modify.
  * @param {number} amount - The number of days to subtract.
  * @returns {Date} - The new date.
  */
  function subDays(date, amount) {
    return addDays(date, -amount);
  }
  
 /**
  * Determines if a date is after another.
  * @param {Date} date - The first date.
  * @param {Date} dateToCompare - The second date to compare with.
  * @returns {boolean} - True if the first date is after the second, otherwise false.
  */
  function isAfter(date, dateToCompare) {
    return date.getTime() > dateToCompare.getTime();
  }
  
 /**
  * Gets a color based on the number of reviews and the selected color scheme.
  * @param {number} reviews - Number of reviews for the day.
  * @returns {Color} - The color representing the intensity of reviews.
  */
  function getContributionColour(reviews) {
     const validSchemes = ["green", "purple", "red", "blue"]; // Supported color schemes
     const defaultScheme = "blue"; // Fallback scheme
   
     // Ensure COLOUR_SCHEME is defined and a valid color scheme
     const scheme = (COLOUR_SCHEME && validSchemes.includes(COLOUR_SCHEME.toLowerCase()))
       ? COLOUR_SCHEME.toLowerCase()
       : defaultScheme;
   
     const colorTheme = palette[scheme];
   
     // Determine the color based on review thresholds
     if (reviews === 0) return palette.gray;
     if (reviews > 0 && reviews <= 20) return colorTheme.veryLight;
     if (reviews > 20 && reviews <= 50) return colorTheme.light;
     if (reviews > 50 && reviews <= 100) return colorTheme.medium;
     if (reviews > 100 && reviews <= 200) return colorTheme.dark;
     if (reviews > 200) return colorTheme.veryDark;
   
     return palette.gray; // Fallback for unexpected values
   }
  
 /**
  * Creates an object with all dates between two dates as keys.
  * @param {Date} startDate - The start date.
  * @param {Date} endDate - The end date.
  * @returns {Object} - A dictionary with dates as keys and 0 as default values.
  */
  function getDates(startDate, endDate) {
    const dates = {};
    let currentDate = new Date(startDate);
  
    while (!isAfter(currentDate, endDate)) {
      const formattedDate = formatter.string(currentDate);
      dates[formattedDate] = 0;
      currentDate = addDays(currentDate, 1);
    }
  
    return dates;
  }
  
 /**
  * Updates the calendar with reviews data.
  * @param {Object} calendar - The calendar object to update.
  * @param {Array<Object>} events - An array of event objects with date and reviews.
  */
  function updateCalendarWithEvents(calendar, events) {
    events.forEach(({ date, reviews }) => {
      if (calendar[date] !== undefined) {
        calendar[date] += reviews;
      }
    });
  }
  
 /**
  * Makes a request to fetch Anki review data.
  * @returns {Request} - The configured request object.
  */
  function makeEventsRequest() {
    const ankiconnectURL = Keychain.get(ANKICONNECT_URL_KEY);
  
    const request = new Request(ankiconnectURL);
    request.method = "POST";
    request.headers = { "Content-Type": "application/json" };
    request.body = JSON.stringify({
      action: "getNumCardsReviewedByDay",
      version: 6,
    });
  
    return request;
  }
  
 /**
  * Fetches review data from AnkiConnect.
  * @returns {Array<Object>} - An array of review events with dates and counts.
  */
  async function fetchEvents() {
     try {
       const request = makeEventsRequest();
       const response = await request.loadJSON();
   
       if (!response.result) {
         throw new Error(response.error || "No data available.");
       }
   
       // Transform response.result into an array of objects with scalar reviews
       return response.result.map(([date, reviews]) => ({
         date,
         reviews: reviews || 0, // Default to 0 if reviews is undefined
       }));
     } catch (error) {
       console.error("Failed to fetch data from AnkiConnect:", error);
       return [];
     }
   }
   
 
/**
 * Fetches and formats Anki review data into a calendar object and stores the recent data in Keychain.
 * Filters the data to include only the last 17 weeks.
 * 
 * @returns {Object} - A dictionary with dates as keys and review counts as values.
 */
 async function fetchAndFormatReviews() {
  const STORAGE_KEY = "anki.widget.lastSuccess"; // Key for storing data in Keychain
  const today = new Date();
  const startDate = subDays(today, 7 * 17); // Start date 17 weeks ago

  try {
    const events = await fetchEvents();

    // Filter events to include only those in the last 17 weeks
    const filteredEvents = events.filter(({ date }) => {
      const eventDate = new Date(date);
      return eventDate >= startDate && eventDate <= today;
    });

    const calendar = filteredEvents.reduce((acc, { date, reviews }) => {
      acc[date] = reviews;
      return acc;
    }, {});

    Keychain.set(STORAGE_KEY, JSON.stringify(calendar));
    console.log("Data stored in Keychain:", calendar);

    return calendar;
  } catch (error) {
    console.error("Failed to fetch and format reviews:", error);

    // Fallback to the last successfully stored data in Keychain
    if (Keychain.contains(STORAGE_KEY)) {
      console.warn("Using fallback data from Keychain.");
      return JSON.parse(Keychain.get(STORAGE_KEY));
    }

    // Return an empty calendar object if no fallback is available
    return {};
  }
}

  
   
 /**
  * Renders graph.
  * @returns {Object} - A dictionary with dates as keys and review counts as values.
  */
  function renderContributionGraph(widget, calendar, weeks, dayOfWeek) {
    const stack = widget.addStack();
    stack.spacing = 4;
  
    const entries = Object.entries(calendar);
  
    for (let column = 0; column < weeks; column++) {
      const weekStack = stack.addStack();
      weekStack.layoutVertically();
      weekStack.spacing = 4;
  
      for (let row = 0; row < 7; row++) {
        const index = column * 7 + row;
        const contribution = entries[index]?.[1] || 0;
  
        const dayStack = weekStack.addStack();
        dayStack.setPadding(7.1, 7.1, 7.1, 7.1);
        dayStack.backgroundColor = getContributionColour(contribution);
  
        if (column === weeks - 1 && row === dayOfWeek) break;
      }
    }
  }
  
  /**
   * Creates the widget.
   */
  async function createWidget(family) {
    if (family === "large") throw new Error(errors.largeFamily);
  
    const widget = new ListWidget();
    widget.backgroundColor = palette.background;
    widget.setPadding(21, 21, 21, 21);
  
    const weeks = family === "small" ? 7 : 17;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysCount = weeks * 7 - (7 - dayOfWeek);
    const startDate = subDays(new Date(now.setHours(12)), daysCount);
  
    const calendar = await fetchAndFormatReviews();
    const completeCalendar = getDates(startDate, now);
    updateCalendarWithEvents(completeCalendar, Object.entries(calendar).map(([date, reviews]) => ({ date, reviews })));
  
    renderContributionGraph(widget, completeCalendar, weeks, dayOfWeek);
  
    return widget;
  }
  
  /**
   * Creates a widget for errors.
   */
  async function createErrorWidget(message) {
    const widget = new ListWidget();
    widget.backgroundColor = palette.background;
    widget.setPadding(21, 21, 21, 21);
  
    const title = widget.addText("Anki Review Graph");
    title.font = Font.boldSystemFont(14);
    title.textColor = palette.text.primary;
  
    widget.addSpacer(4);
  
    const errorText = widget.addText(`Error: ${message}`);
    errorText.font = Font.systemFont(14);
    errorText.textColor = palette.text.primary;
  
    return widget;
  }
  
  /**
   * Displays a dialog for entering AnkiConnect URL.
   */
  async function showCredentialsDialog() {
    const alert = new Alert();
    let ankiconnectURL = Keychain.contains(ANKICONNECT_URL_KEY)
      ? Keychain.get(ANKICONNECT_URL_KEY)
      : "";
  
    alert.title = "AnkiConnect URL";
    alert.message = "Enter the URL below. It will be stored in Keychain.";
    alert.addTextField("URL", ankiconnectURL);
    alert.addAction("Submit");
    alert.addCancelAction("Cancel");
  
    const index = await alert.present();
  
    if (index === 0) {
      ankiconnectURL = alert.textFieldValue(0);
      if (ankiconnectURL.startsWith("http")) {
        Keychain.set(ANKICONNECT_URL_KEY, ankiconnectURL);
        console.log("URL stored successfully.");
      } else {
        console.error("Invalid URL.");
        await showCredentialsDialog();
      }
    } else {
      console.log("Dialog canceled.");
    }
  }
  
  /**
   * Main menu.
   */
  async function showMainMenu() {
    const alert = new Alert();
    alert.addAction("Preview Small Widget");
    alert.addAction("Preview Medium Widget");
    alert.addDestructiveAction("Remove Credentials");
    alert.addAction("About");
    alert.addCancelAction("Cancel");
  
    const index = await alert.present();
  
    if (index === 0) {
      const widget = await createWidget("small");
      await widget.presentSmall();
    } else if (index === 1) {
      const widget = await createWidget("medium");
      await widget.presentMedium();
    } else if (index === 2) {
      Keychain.remove(ANKICONNECT_URL_KEY);
      console.log("Credentials removed.");
    } else if (index === 3) {
      Safari.open(REPOSITORY_URL);
    }
  }

 
 
   
