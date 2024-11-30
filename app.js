const endpoint = "";

// Fetch Data from the Endpoint
async function fetchData() {
    try {
        let req = new Request(endpoint);
        req.method = "POST";
        req.headers = {
            "Content-Type": "application/json"
        };
        req.body = JSON.stringify({
            action: "getNumCardsReviewedByDay",
            version: 6
        });

        let response = await req.loadJSON();
        console.log("Raw Data from fetchData:", response);

        if (response.result) {
            return response.result;
        } else {
            throw new Error("Error: " + response.error);
        }
    } catch (error) {
        console.error("Request failed:", error);
        return null;
    }
}

// Transform the result array into a lookup object
function transformReviewsData(reviewsArray) {
    const reviewsByDay = {};
    reviewsArray.forEach(([date, reviews]) => {
        reviewsByDay[date] = reviews;
    });
    console.log("Transformed Reviews Data:", reviewsByDay);
    return reviewsByDay;
}

// Generate a date range between two dates
function getDatesInRange(startDate, endDate) {
    const date = new Date(startDate.getTime());
    const dates = [];
    while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

// Map reviews data to the 364-day date range
function mapReviewsToDateArray(reviewsByDay, dateArray) {
    console.log("Mapping Reviews to Date Array...");
    return dateArray.map((date, index) => {
        const dateString = date.toISOString().slice(0, 10); // Format as YYYY-MM-DD
        const reviews = reviewsByDay[dateString] || 0;
        console.log(`Date: ${dateString}, Reviews: ${reviews}`);
        return {
            dayIndex: index + 1,
            reviews: reviews
        };
    });
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

async function drawGrid(data) {
    const rows = 7;
    const cols = 26;
    const cellSize = 50;
    const maxReviews = Math.max(...data.map(d => d.reviews), 200);

    let canvas = new DrawContext();
    canvas.size = new Size(cols * cellSize, rows * cellSize);
    canvas.opaque = false;
    canvas.setFillColor(new Color("#242424"));
    canvas.fillRect(new Rect(0, 0, canvas.size.width, canvas.size.height));

    // Draw each cell in the grid
    for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i / rows); // Column index (weeks)
        const row = i % rows; // Row index (days of the week)
        const x = col * cellSize; // X-coordinate
        const y = row * cellSize; // Y-coordinate

        // Determine the cell color
        const numReviews = data[i].reviews || 0;
        let fillColor;

        if (numReviews === 0) {
            fillColor = new Color("#242424"); // Background color for 0 reviews
        } else {
            const intensity = 255 - numReviews;
            hexColor = rgbToHex(intensity, 255, intensity)
            fillColor = new Color(hexColor); 
        }

        canvas.setFillColor(fillColor);
        canvas.fillRect(new Rect(x, y, cellSize - 2, cellSize - 2)); // Add slight spacing for gridlines
    }

    return canvas.getImage();
}


// Fetch data and create widget
async function createWidget() {
    let reviewsArray = await fetchData();
    if (!reviewsArray) {
        console.error("No data fetched");
        return;
    }

    // Transform the reviews array into a lookup object
    const reviewsByDay = transformReviewsData(reviewsArray);

    // Generate the date array for the last 364 days
    const today = new Date(); // Current date
    const start_date = new Date(); // Start date is 364 days ago
    start_date.setDate(today.getDate() - 364);
    const dateArray = getDatesInRange(start_date, today);

    // Map the reviews data to the 364-day date range
    const mappedData = mapReviewsToDateArray(reviewsByDay, dateArray);

    // Draw the grid
    let gridImage = await drawGrid(mappedData);

    // Create the widget
    let widget = new ListWidget();
    widget.backgroundColor = new Color("#242424");
    let imageWidget = widget.addImage(gridImage);
    imageWidget.centerAlignImage();
    return widget;
}

// Generate the widget
let widget = await createWidget();
if (widget) {
    Script.setWidget(widget);
    widget.presentMedium();
}
